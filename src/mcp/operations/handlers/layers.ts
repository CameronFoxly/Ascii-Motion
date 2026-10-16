/** Layer and group operations via canonical timeline store actions. */
import { useTimelineStore } from '../../../stores/timelineStore';
import { canAddLayer, getSubscriptionLayerLimit } from '../../../utils/layerLimits';
import { BridgeError, invalid } from '../errors';
import type { OperationHandler } from '../runtime';
import { asGroupId, asLayerId, must, requireGroup, requireLayer, tl } from './common';

function limitError(): BridgeError {
  return new BridgeError('LIMIT_REACHED', 'Layer limit reached for this account', { limit: getSubscriptionLayerLimit() });
}

function applyStaticProperties(ownerId: string, props: Record<string, unknown> | undefined): void {
  if (!props) return;
  for (const [path, value] of Object.entries(props)) {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw invalid(`staticProperties.${path} must be a finite number`);
    if (!path.startsWith('transform.')) throw invalid(`Unknown static property ${path}`);
    tl().setStaticProperty(asLayerId(ownerId), path, value);
  }
}

export const layerHandlers: Record<string, OperationHandler> = {
  add_layer: (input) => {
    if (!canAddLayer()) throw limitError();
    if (input.aboveLayerId) tl().setActiveLayer(requireLayer(input.aboveLayerId as string).id);
    const layerId = tl().addLayer(input.name as string | undefined);
    if (!layerId) throw limitError();
    if (input.empty) {
      for (const cf of requireLayer(layerId).contentFrames) tl().removeContentFrame(layerId, cf.id);
    }
    tl().setActiveLayer(layerId);
    const layer = requireLayer(layerId);
    return { layerId, contentFrameIds: layer.contentFrames.map((cf) => cf.id), index: tl().layers.findIndex((l) => l.id === layerId) };
  },
  remove_layer: (input) => {
    const layer = requireLayer(input.layerId as string);
    const wasLast = tl().layers.length === 1;
    tl().removeLayer(layer.id);
    return { removedLayerId: layer.id, activeLayerId: tl().view.activeLayerId, ...(wasLast ? { replacementLayerId: tl().layers[0]?.id } : {}) };
  },
  duplicate_layer: (input) => {
    const layer = requireLayer(input.layerId as string);
    if (!canAddLayer()) throw limitError();
    const layerId = must(tl().duplicateLayer(layer.id), 'Could not duplicate layer', 'LIMIT_REACHED');
    return { layerId, sourceLayerId: layer.id };
  },
  reorder_layer: (input) => {
    const layer = requireLayer(input.layerId as string);
    const layers = tl().layers;
    const toIndex = input.toIndex as number;
    if (toIndex < 0 || toIndex >= layers.length) {
      throw new BridgeError('OUT_OF_RANGE', `toIndex must be between 0 and ${layers.length - 1} (0 = bottom)`);
    }
    const fromIndex = layers.findIndex((l) => l.id === layer.id);
    tl().reorderLayers(fromIndex, toIndex);
    return { layerId: layer.id, fromIndex, index: tl().layers.findIndex((l) => l.id === layer.id) };
  },
  update_layer: (input) => {
    const layer = requireLayer(input.layerId as string);
    const id = layer.id;
    if (typeof input.name === 'string') {
      if (!input.name.trim()) throw invalid('Layer name cannot be empty');
      tl().renameLayer(id, input.name);
    }
    if (typeof input.visible === 'boolean') tl().setLayerVisible(id, input.visible);
    if (typeof input.solo === 'boolean') tl().setLayerSolo(id, input.solo);
    if (typeof input.locked === 'boolean') tl().setLayerLocked(id, input.locked);
    if (typeof input.opacity === 'number') tl().setLayerOpacity(id, input.opacity);
    if (typeof input.syncKeyframesToFrames === 'boolean') tl().setLayerSyncKeyframes(id, input.syncKeyframesToFrames);
    applyStaticProperties(id, input.staticProperties as Record<string, unknown> | undefined);
    return { layerId: id };
  },
  merge_layers: (input) => {
    if (input.mode === 'visible') {
      const layerId = must(tl().mergeVisible(), 'Need at least two visible content layers to merge');
      return { layerId };
    }
    const layer = requireLayer(input.layerId as string | undefined);
    const index = tl().layers.findIndex((l) => l.id === layer.id);
    if (index <= 0) throw invalid('Cannot merge down the bottom layer');
    const layerId = must(tl().mergeDown(layer.id), `Could not merge layer ${layer.id} down`);
    return { layerId, mergedLayerId: layer.id };
  },
  flatten_layer: (input) => {
    const layer = requireLayer(input.layerId as string);
    if (layer.kind === 'generator') throw invalid('Generator layers must be baked before flattening');
    tl().flattenLayer(layer.id);
    return { layerId: layer.id, contentFrameIds: requireLayer(layer.id).contentFrames.map((cf) => cf.id) };
  },
  create_group: (input) => {
    const ids = input.layerIds as string[];
    for (const id of ids) {
      const layer = requireLayer(id);
      if (layer.parentGroupId) throw invalid(`Layer ${id} is already in group ${layer.parentGroupId}`);
    }
    if (new Set(ids).size < 2) throw invalid('A group needs at least two distinct layers');
    const groupId = must(tl().createGroup((input.name as string | undefined) ?? 'Group', ids.map(asLayerId)), 'Could not create group');
    return { groupId, layerIds: requireGroup(groupId).childLayerIds };
  },
  ungroup: (input) => {
    const group = requireGroup(input.groupId as string);
    tl().ungroupLayers(group.id);
    return { removedGroupId: group.id, layerIds: group.childLayerIds };
  },
  update_group: (input) => {
    const group = requireGroup(input.groupId as string);
    if (typeof input.name === 'string') {
      const name = input.name.trim();
      if (!name) throw invalid('Group name cannot be empty');
      // Same store update as the GroupHeader rename.
      setGroupName(group.id, name);
    }
    // Visibility/solo/lock cascade to child layers, matching the GroupHeader toggles.
    for (const childId of group.childLayerIds) {
      if (typeof input.visible === 'boolean') tl().setLayerVisible(childId, input.visible);
      if (typeof input.solo === 'boolean') tl().setLayerSolo(childId, input.solo);
      if (typeof input.locked === 'boolean') tl().setLayerLocked(childId, input.locked);
    }
    if (typeof input.collapsed === 'boolean' && requireGroup(group.id).collapsed !== input.collapsed) {
      tl().toggleGroupCollapsed(asGroupId(group.id));
    }
    applyStaticProperties(group.id, input.staticProperties as Record<string, unknown> | undefined);
    return { groupId: group.id };
  },
};

function setGroupName(groupId: string, name: string): void {
  useTimelineStore.setState((state) => ({
    layerGroups: state.layerGroups.map((g) => (g.id === groupId ? { ...g, name } : g)),
  }));
}
