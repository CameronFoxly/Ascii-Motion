/**
 * Timeline Store
 * 
 * Central state management for the layer-based timeline system.
 * Replaces animationStore as the source of truth for animation data.
 * 
 * Part of the Layer Timeline Refactor (v2.0.0)
 * See: docs/LAYER_TIMELINE_REFACTOR_PLAN.md §1.3
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Cell } from '../types';
import { useCanvasStore } from './canvasStore';
import type {
  Layer,
  LayerId,
  LayerGroup,
  LayerGroupId,
  ContentFrame,
  ContentFrameId,
  PropertyTrack,
  PropertyTrackId,
  Keyframe,
  KeyframeId,
  PropertyPath,
  TimelineConfig,
  TimelineViewState,
  SessionDataV2,
} from '../types/timeline';
import {
  generateLayerId,
  generateLayerGroupId,
  generateContentFrameId,
  generateKeyframeId,
  generatePropertyTrackId,
  createDefaultLayer,
  contentFramesOverlap,
} from '../types/timeline';
import { defaultEasing } from '../types/easing';
import { canAddLayer } from '../utils/layerLimits';
import { compositeLayersAtFrame } from '../utils/layerCompositing';
import type { EffectTrack, EffectKeyframe } from '../types/effectBlock';
import {
  generateEffectBlockId,
  generateEffectTrackId,
  generateEffectPropertyTrackId,
} from '../types/effectBlock';
import { getEffect } from '../registry/effectRegistry';
import { bakeEffectIntoFrames } from '../utils/effectsPipeline';
import type { PostEffectTrack, PostEffectBlock, PostEffectKeyframe, PostEffectBlockId, PostEffectPropertyTrackId } from '../types/postEffect';
import {
  generatePostEffectBlockId,
  generatePostEffectTrackId,
  generatePostEffectPropertyTrackId,
} from '../types/postEffect';
import { getPostEffect } from '../registry/postEffectRegistry';

/** Helper: find a track and a keyframe at a specific frame across layers, groups, and effect blocks */
function findTrackKeyframeByFrame(
  state: { layers: Layer[]; layerGroups: LayerGroup[] },
  trackId: PropertyTrackId,
  frame: number,
) {
  for (const layer of state.layers) {
    const track = layer.propertyTracks.find((t) => t.id === trackId);
    if (track) {
      const kf = track.keyframes.find((k) => k.frame === frame);
      return { track, kf: kf ?? null };
    }
    // Search effect property tracks
    for (const et of (layer.effectTracks ?? [])) {
      const ept = et.effectBlock.propertyTracks.find((t) => (t.id as string) === (trackId as string));
      if (ept) {
        const kf = ept.keyframes.find((k) => k.frame === frame);
        return { track: ept as unknown as typeof layer.propertyTracks[0], kf: (kf ?? null) as typeof layer.propertyTracks[0]['keyframes'][0] | null };
      }
    }
  }
  for (const group of state.layerGroups) {
    const track = group.propertyTracks.find((t) => t.id === trackId);
    if (track) {
      const kf = track.keyframes.find((k) => k.frame === frame);
      return { track, kf: kf ?? null };
    }
    // Search group effect property tracks
    for (const et of (group.effectTracks ?? [])) {
      const ept = et.effectBlock.propertyTracks.find((t) => (t.id as string) === (trackId as string));
      if (ept) {
        const kf = ept.keyframes.find((k) => k.frame === frame);
        return { track: ept as unknown as typeof group.propertyTracks[0], kf: (kf ?? null) as typeof group.propertyTracks[0]['keyframes'][0] | null };
      }
    }
  }
  return { track: null, kf: null };
}

/**
 * Helper: find the post effect block that owns a given property track.
 * Returns { blockId, track } or null if not found.
 */
function findPostEffectTrackOwner(
  postEffectTracks: PostEffectTrack[],
  trackId: string,
): { blockId: PostEffectBlockId; track: PostEffectTrack['effectBlock']['propertyTracks'][0] } | null {
  for (const pet of postEffectTracks) {
    const pt = pet.effectBlock.propertyTracks.find((t) => (t.id as string) === trackId);
    if (pt) return { blockId: pet.effectBlock.id, track: pt };
  }
  return null;
}

/**
 * Helper: apply a keyframe updater to an effect property track by trackId.
 * Searches all layers' effectTracks, groups' effectTracks, and globalEffects.
 * Returns updated state slices if found, or null if the trackId was not found.
 */
function updateEffectPropertyTrackKeyframes(
  state: { layers: Layer[]; layerGroups: LayerGroup[]; globalEffects: EffectTrack[]; postEffectTracks: PostEffectTrack[] },
  trackId: string,
  updater: (keyframes: EffectKeyframe[]) => EffectKeyframe[],
): { layers?: Layer[]; layerGroups?: LayerGroup[]; globalEffects?: EffectTrack[]; postEffectTracks?: PostEffectTrack[] } | null {
  // Search layers
  for (const layer of state.layers) {
    for (const et of (layer.effectTracks ?? [])) {
      if (et.effectBlock.propertyTracks.some((pt) => (pt.id as string) === trackId)) {
        return {
          layers: state.layers.map((l) => l.id !== layer.id ? l : {
            ...l,
            effectTracks: l.effectTracks.map((t) => t.id !== et.id ? t : {
              ...t,
              effectBlock: {
                ...t.effectBlock,
                propertyTracks: t.effectBlock.propertyTracks.map((pt) =>
                  (pt.id as string) !== trackId ? pt : { ...pt, keyframes: updater(pt.keyframes) },
                ),
              },
            }),
          }),
        };
      }
    }
  }
  // Search groups
  for (const group of state.layerGroups) {
    for (const et of (group.effectTracks ?? [])) {
      if (et.effectBlock.propertyTracks.some((pt) => (pt.id as string) === trackId)) {
        return {
          layerGroups: state.layerGroups.map((g) => g.id !== group.id ? g : {
            ...g,
            effectTracks: g.effectTracks.map((t) => t.id !== et.id ? t : {
              ...t,
              effectBlock: {
                ...t.effectBlock,
                propertyTracks: t.effectBlock.propertyTracks.map((pt) =>
                  (pt.id as string) !== trackId ? pt : { ...pt, keyframes: updater(pt.keyframes) },
                ),
              },
            }),
          }),
        };
      }
    }
  }
  // Search global
  for (const et of state.globalEffects) {
    if (et.effectBlock.propertyTracks.some((pt) => (pt.id as string) === trackId)) {
      return {
        globalEffects: state.globalEffects.map((t) => t.id !== et.id ? t : {
          ...t,
          effectBlock: {
            ...t.effectBlock,
            propertyTracks: t.effectBlock.propertyTracks.map((pt) =>
              (pt.id as string) !== trackId ? pt : { ...pt, keyframes: updater(pt.keyframes) },
            ),
          },
        }),
      };
    }
  }
  // Search post effects
  for (const pet of state.postEffectTracks) {
    if (pet.effectBlock.propertyTracks.some((pt) => (pt.id as string) === trackId)) {
      return {
        postEffectTracks: state.postEffectTracks.map((t) => t.id !== pet.id ? t : {
          ...t,
          effectBlock: {
            ...t.effectBlock,
            propertyTracks: t.effectBlock.propertyTracks.map((pt) =>
              (pt.id as string) !== trackId ? pt : { ...pt, keyframes: updater(pt.keyframes as unknown as EffectKeyframe[]) as unknown as typeof pt.keyframes },
            ),
          },
        }),
      };
    }
  }
  return null;
}

/**
 * Merge multiple layers into a set of content frames by compositing at
 * every unique segment boundary. This ensures that when content frames
 * overlap differently across layers, each unique visual combination gets
 * its own content frame in the result.
 *
 * Algorithm:
 * 1. Collect all boundary points (start and end of every content frame)
 * 2. Sort and deduplicate to get segment boundaries
 * 3. For each segment, composite all layers at the segment's start frame
 * 4. If there's content, create a content frame for that segment
 * 5. Gaps (no content) produce no content frame
 */
function computeMergedContentFrames(
  sourceLayers: Layer[],
  canvasWidth: number,
  canvasHeight: number,
  groups?: LayerGroup[],
): ContentFrame[] {
  // Collect all boundary points from all source layers' content frames
  const boundaries = new Set<number>();
  for (const layer of sourceLayers) {
    for (const cf of layer.contentFrames) {
      boundaries.add(cf.startFrame);
      boundaries.add(cf.startFrame + cf.durationFrames);
    }
  }

  // Sort boundaries to get ordered segment edges
  const sortedBoundaries = [...boundaries].sort((a, b) => a - b);
  if (sortedBoundaries.length < 2) {
    // No content or single point — nothing to merge
    return [];
  }

  const mergedContentFrames: ContentFrame[] = [];

  // Process each segment between consecutive boundaries
  for (let i = 0; i < sortedBoundaries.length - 1; i++) {
    const segStart = sortedBoundaries[i];
    const segEnd = sortedBoundaries[i + 1];
    const segDuration = segEnd - segStart;
    if (segDuration <= 0) continue;

    // Composite all layers at this segment's frame
    const compositedCells = compositeLayersAtFrame(
      sourceLayers,
      segStart,
      canvasWidth,
      canvasHeight,
      undefined,
      false,
      groups,
    );

    // Only create a content frame if there's actual content
    if (compositedCells.size > 0) {
      mergedContentFrames.push({
        id: generateContentFrameId(),
        name: `Frame ${mergedContentFrames.length + 1}`,
        startFrame: segStart,
        durationFrames: segDuration,
        data: compositedCells,
      });
    }
  }

  return mergedContentFrames;
}

// ============================================
// STORE INTERFACE
// ============================================

export interface TimelineState {
  // Configuration
  config: TimelineConfig;

  // Layers (ordered by z-index, first = bottom)
  layers: Layer[];

  // Layer groups
  layerGroups: LayerGroup[];

  // Global effects
  globalEffects: EffectTrack[];

  // Post effects (WebGL shader-based, applied as final render pass)
  postEffectTracks: PostEffectTrack[];

  // View state
  view: TimelineViewState;

  // ============================================
  // LAYER ACTIONS
  // ============================================

  addLayer: (name?: string) => LayerId | null;
  removeLayer: (layerId: LayerId) => void;
  duplicateLayer: (layerId: LayerId) => LayerId | null;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  renameLayer: (layerId: LayerId, name: string) => void;

  setLayerVisible: (layerId: LayerId, visible: boolean) => void;
  setLayerSolo: (layerId: LayerId, solo: boolean) => void;
  setLayerLocked: (layerId: LayerId, locked: boolean) => void;
  setLayerSyncKeyframes: (layerId: LayerId, sync: boolean) => void;
  setLayerOpacity: (layerId: LayerId, opacity: number) => void;
  setStaticProperty: (layerId: LayerId, propertyPath: string, value: number) => void;
  replaceStaticProperties: (layerId: LayerId, properties: Record<string, number>) => void;

  getActiveLayer: () => Layer | null;
  setActiveLayer: (layerId: LayerId | null) => void;

  /** Get a layer by ID */
  getLayer: (layerId: LayerId) => Layer | undefined;

  /** Multi-layer selection */
  selectLayers: (layerIds: LayerId[]) => void;
  toggleLayerSelected: (layerId: LayerId) => void;
  clearLayerSelection: () => void;

  /** Toggle group collapsed state */
  toggleGroupCollapsed: (groupId: LayerGroupId) => void;

  /** Set/clear the active group (for properties panel) */
  setActiveGroup: (groupId: LayerGroupId | null) => void;

  /** Get a group by ID */
  getGroup: (groupId: LayerGroupId) => LayerGroup | undefined;

  // ============================================
  // CONTENT FRAME ACTIONS
  // ============================================

  addContentFrame: (
    layerId: LayerId,
    startFrame: number,
    durationFrames: number,
    data?: Map<string, Cell>
  ) => ContentFrameId | null;
  removeContentFrame: (layerId: LayerId, frameId: ContentFrameId) => void;
  updateContentFrameTiming: (
    layerId: LayerId,
    frameId: ContentFrameId,
    startFrame: number,
    durationFrames: number,
  ) => boolean;
  updateContentFrameData: (
    layerId: LayerId,
    frameId: ContentFrameId,
    data: Map<string, Cell>
  ) => void;

  /** Split a content frame at the given frame position into two frames */
  splitContentFrame: (
    layerId: LayerId,
    frameId: ContentFrameId,
    atFrame: number,
  ) => ContentFrameId | null;

  /** Duplicate a content frame, placing the copy immediately after the original */
  duplicateContentFrame: (
    layerId: LayerId,
    frameId: ContentFrameId,
  ) => ContentFrameId | null;

  getContentFrameAt: (layerId: LayerId, frame: number) => ContentFrame | null;

  // ============================================
  // KEYFRAME ACTIONS
  // ============================================

  addPropertyTrack: (layerId: LayerId, propertyPath: PropertyPath) => PropertyTrackId;
  removePropertyTrack: (layerId: LayerId, trackId: PropertyTrackId) => void;

  addKeyframe: (
    layerId: LayerId,
    trackId: PropertyTrackId,
    frame: number,
    value: number,
  ) => KeyframeId;
  removeKeyframe: (
    layerId: LayerId,
    trackId: PropertyTrackId,
    keyframeId: KeyframeId,
  ) => void;
  updateKeyframe: (
    layerId: LayerId,
    trackId: PropertyTrackId,
    keyframeId: KeyframeId,
    updates: Partial<Pick<Keyframe, 'frame' | 'value' | 'easing'>>,
  ) => void;
  moveKeyframe: (
    layerId: LayerId,
    trackId: PropertyTrackId,
    keyframeId: KeyframeId,
    newFrame: number,
  ) => void;
  setKeyframeLooping: (
    layerId: LayerId,
    trackId: PropertyTrackId,
    looping: boolean,
  ) => void;

  // ============================================
  // PLAYBACK ACTIONS
  // ============================================

  goToFrame: (frame: number) => void;
  nextFrame: () => void;
  previousFrame: () => void;

  setPlaying: (playing: boolean) => void;
  setLooping: (looping: boolean) => void;
  setFrameRate: (fps: number, maintainDuration?: boolean) => void;
  setDuration: (frames: number) => void;

  // ============================================
  // TIMELINE AUTO-EXPAND
  // ============================================

  ensureTimelineContains: (frame: number) => void;

  // ============================================
  // VIEW ACTIONS
  // ============================================

  setActiveView: (view: 'frames' | 'layers') => void;
  setZoom: (zoom: number) => void;
  setScrollX: (scrollX: number) => void;
  setPanelHeight: (height: number) => void;

  selectKeyframes: (keyframeIds: KeyframeId[]) => void;
  addKeyframesToSelection: (keyframeIds: KeyframeId[]) => void;
  removeKeyframesFromSelection: (keyframeIds: KeyframeId[]) => void;
  toggleKeyframeSelected: (keyframeId: KeyframeId) => void;
  clearKeyframeSelection: () => void;
  selectContentFrames: (frameIds: ContentFrameId[]) => void;
  addContentFramesToSelection: (frameIds: ContentFrameId[]) => void;
  toggleContentFrameSelected: (frameId: ContentFrameId) => void;
  clearContentFrameSelection: () => void;
  toggleContentFrameHidden: (layerId: LayerId, frameIds: ContentFrameId[], hidden: boolean) => void;
  renameContentFrame: (layerId: LayerId, frameId: ContentFrameId, name: string) => void;
  setContentFrameLabel: (layerId: LayerId, frameIds: ContentFrameId[], labelColor: string | undefined) => void;
  setContentFrameDragPreview: (preview: TimelineViewState['contentFrameDragPreview']) => void;
  setEditingKeyframe: (keyframeId: KeyframeId | null) => void;
  setKeyframeDuplicateGhosts: (ghosts: Map<KeyframeId, number>) => void;
  clearKeyframeDuplicateGhosts: () => void;
  setShowLayerProperties: (show: boolean) => void;
  toggleLayerExpanded: (layerId: LayerId) => void;
  setExpandedLayerIds: (ids: Set<LayerId>) => void;

  // Work area
  setWorkAreaStart: (frame: number) => void;
  setWorkAreaEnd: (frame: number) => void;
  setWorkAreaEnabled: (enabled: boolean) => void;
  clearWorkArea: () => void;
  trimToWorkArea: () => void;
  setTimecodeFormat: (format: import('../types/timeline').TimecodeFormat) => void;

  /** Remove blank space at clickFrame on a layer, shifting subsequent content left */
  removeBlankSpace: (layerId: LayerId, clickFrame: number) => void;

  // Clipboard (for right-click copy/paste of frames and keyframes)
  copiedFrames: Array<{ durationFrames: number; data: Map<string, import('../types').Cell>; hidden?: boolean }> | null;
  copiedKeyframes: Array<{ value: number; easing: import('../types/timeline').Keyframe['easing']; frameOffset: number; propertyPath?: string; trackIndex?: number; layerIndex?: number; sourceLayerId?: string }> | null;
  copyContentFrames: (layerId: LayerId, frameIds: ContentFrameId[]) => void;
  pasteContentFrames: (layerId: LayerId, atFrame: number) => void;
  copyKeyframes: (keyframeIds: KeyframeId[]) => void;
  pasteKeyframes: (layerId: LayerId, trackId: PropertyTrackId, atFrame: number) => void;

  // ============================================
  // MERGE / FLATTEN ACTIONS
  // ============================================

  /** Merge the given layer with the layer directly below it */
  mergeDown: (layerId: LayerId) => LayerId | null;

  /** Merge all visible layers into a single new layer */
  mergeVisible: () => LayerId | null;

  /** Flatten a layer — bake transforms into content frame data, reset transforms */
  flattenLayer: (layerId: LayerId) => void;

  // ============================================
  // LAYER GROUP ACTIONS
  // ============================================

  /** Create a group from the given layer IDs */
  createGroup: (name: string, layerIds: LayerId[]) => LayerGroupId | null;

  /** Ungroup — remove group, children remain as independent layers */
  ungroupLayers: (groupId: LayerGroupId) => void;

  // ============================================
  // EFFECT TRACK ACTIONS (Procedural Effects)
  // ============================================

  /** Add an effect block to a layer, group, or global track */
  addEffectBlock: (
    ownerId: LayerId | LayerGroupId | null,
    effectType: string,
    startFrame: number,
    durationFrames: number,
  ) => import('../types/effectBlock').EffectBlockId | null;

  /** Remove an effect block */
  removeEffectBlock: (
    ownerId: LayerId | LayerGroupId | null,
    blockId: import('../types/effectBlock').EffectBlockId,
  ) => void;

  /** Update an effect block's timing (in/out points) */
  updateEffectBlockTiming: (
    blockId: import('../types/effectBlock').EffectBlockId,
    startFrame: number,
    durationFrames: number,
  ) => void;

  /** Update an effect block's settings */
  updateEffectBlockSettings: (
    blockId: import('../types/effectBlock').EffectBlockId,
    settings: Partial<Record<string, unknown>>,
  ) => void;

  /** Reorder effect tracks (z-order) within a layer or group */
  reorderEffectTracks: (
    ownerId: LayerId | LayerGroupId | null,
    fromIndex: number,
    toIndex: number,
  ) => void;

  /** Toggle an effect block's enabled state (bypass) */
  toggleEffectBlockEnabled: (
    blockId: import('../types/effectBlock').EffectBlockId,
  ) => void;

  /** Add a property track to an effect block (if not already present) and return its ID */
  addEffectPropertyTrack: (
    blockId: import('../types/effectBlock').EffectBlockId,
    propertyPath: string,
  ) => import('../types/effectBlock').EffectPropertyTrackId | null;

  /** Add a keyframe to an effect property track */
  addEffectKeyframe: (
    blockId: import('../types/effectBlock').EffectBlockId,
    trackId: import('../types/effectBlock').EffectPropertyTrackId,
    frame: number,
    value: import('../types/effectBlock').EffectKeyframe['value'],
  ) => import('../types/timeline').KeyframeId;

  /** Remove a keyframe from an effect property track */
  removeEffectKeyframe: (
    blockId: import('../types/effectBlock').EffectBlockId,
    trackId: import('../types/effectBlock').EffectPropertyTrackId,
    keyframeId: KeyframeId,
  ) => void;

  /** Update a keyframe on an effect property track */
  updateEffectKeyframe: (
    blockId: import('../types/effectBlock').EffectBlockId,
    trackId: import('../types/effectBlock').EffectPropertyTrackId,
    keyframeId: KeyframeId,
    updates: Partial<Pick<import('../types/effectBlock').EffectKeyframe, 'frame' | 'value' | 'easing'>>,
  ) => void;

  /** Select an effect block (shows properties in sidebar) */
  selectEffectBlock: (blockId: import('../types/effectBlock').EffectBlockId | null) => void;

  /** Toggle effect track expanded (show property keyframe sub-rows) */
  toggleEffectTrackExpanded: (blockId: import('../types/effectBlock').EffectBlockId) => void;

  /** Set which effect keyframe is being edited */
  setEditingEffectKeyframe: (keyframeId: KeyframeId | null) => void;

  /** Toggle global effects section expanded/collapsed */
  toggleGlobalEffectsExpanded: () => void;

  /** Move an effect track from one owner to another (for cross-layer drag) */
  moveEffectTrack: (
    blockId: import('../types/effectBlock').EffectBlockId,
    targetOwnerId: LayerId | LayerGroupId | null,
    targetIndex?: number,
  ) => void;

  /** Bake (apply) an effect destructively to layer canvas data, then remove the effect block */
  bakeEffect: (
    blockId: import('../types/effectBlock').EffectBlockId,
  ) => void;

  // ============================================
  // POST EFFECT ACTIONS (WebGL Shader Effects)
  // ============================================

  /** Add a post effect block to the post-processing chain */
  addPostEffectBlock: (
    postEffectType: string,
    startFrame: number,
    durationFrames: number,
  ) => PostEffectBlockId | null;

  /** Remove a post effect block */
  removePostEffectBlock: (blockId: PostEffectBlockId) => void;

  /** Update a post effect block's timing */
  updatePostEffectBlockTiming: (
    blockId: PostEffectBlockId,
    startFrame: number,
    durationFrames: number,
  ) => void;

  /** Update a post effect block's settings */
  updatePostEffectBlockSettings: (
    blockId: PostEffectBlockId,
    settings: Partial<Record<string, unknown>>,
  ) => void;

  /** Reorder post effect tracks (changes render order) */
  reorderPostEffectTracks: (fromIndex: number, toIndex: number) => void;

  /** Toggle a post effect block's enabled state */
  togglePostEffectBlockEnabled: (blockId: PostEffectBlockId) => void;

  /** Add a property track to a post effect block */
  addPostEffectPropertyTrack: (
    blockId: PostEffectBlockId,
    propertyPath: string,
  ) => PostEffectPropertyTrackId | null;

  /** Add a keyframe to a post effect property track */
  addPostEffectKeyframe: (
    blockId: PostEffectBlockId,
    trackId: PostEffectPropertyTrackId,
    frame: number,
    value: PostEffectKeyframe['value'],
  ) => KeyframeId;

  /** Remove a keyframe from a post effect property track */
  removePostEffectKeyframe: (
    blockId: PostEffectBlockId,
    trackId: PostEffectPropertyTrackId,
    keyframeId: KeyframeId,
  ) => void;

  /** Update a keyframe on a post effect property track */
  updatePostEffectKeyframe: (
    blockId: PostEffectBlockId,
    trackId: PostEffectPropertyTrackId,
    keyframeId: KeyframeId,
    updates: Partial<Pick<PostEffectKeyframe, 'frame' | 'value' | 'easing'>>,
  ) => void;

  /** Select a post effect block */
  selectPostEffectBlock: (blockId: PostEffectBlockId | null) => void;

  /** Toggle post effect track expanded (show property keyframe sub-rows) */
  togglePostEffectTrackExpanded: (blockId: PostEffectBlockId) => void;

  /** Set which post effect keyframe is being edited */
  setEditingPostEffectKeyframe: (keyframeId: KeyframeId | null) => void;

  /** Toggle post effects section expanded/collapsed */
  togglePostEffectsExpanded: () => void;

  // ============================================
  // PROJECT LIFECYCLE
  // ============================================

  /** Reset to default new-project state */
  createNewProject: () => void;

  /** Load state from session data (used by session importer) */
  loadFromSessionData: (layers: Layer[], config: Partial<TimelineConfig>, viewState?: Partial<TimelineViewState>, layerGroups?: LayerGroup[], globalEffects?: EffectTrack[], postEffectTracks?: PostEffectTrack[]) => void;

  /** Serialize current state to SessionDataV2 format (used by session exporter) */
  getSessionData: () => SessionDataV2;
}

// ============================================
// INITIAL STATE
// ============================================

const INITIAL_CONFIG: TimelineConfig = {
  frameRate: 12,
  durationFrames: 1,
  durationMs: 1000 / 12,
};

const INITIAL_VIEW: TimelineViewState = {
  activeView: 'layers',
  currentFrame: 0,
  isPlaying: false,
  looping: true,
  activeLayerId: null,
  activeGroupId: null,
  selectedLayerIds: new Set(),
  selectedKeyframeIds: new Set(),
  selectedContentFrameIds: new Set(),
  zoom: 8,
  scrollX: 0,
  panelHeight: 328,
  editingKeyframeId: null,
  expandedLayerIds: new Set(),
  showLayerProperties: true,
  keyframeDuplicateGhosts: new Map(),
  contentFrameDragPreview: null,
  workAreaStart: 0,
  workAreaEnd: 1,
  workAreaEnabled: false,
  timecodeFormat: 'timecode' as const,
  selectedEffectBlockId: null,
  expandedEffectTrackIds: new Set(),
  editingEffectKeyframeId: null,
  globalEffectsExpanded: true,
  selectedPostEffectBlockId: null,
  expandedPostEffectTrackIds: new Set(),
  editingPostEffectKeyframeId: null,
  postEffectsExpanded: true,
};

// ============================================
// HELPER: update a single layer in the layers array
// ============================================

function updateLayer(
  layers: Layer[],
  layerId: LayerId,
  updater: (layer: Layer) => Layer,
): Layer[] {
  return layers.map((l) => (l.id === layerId ? updater(l) : l));
}

// ============================================
// STORE IMPLEMENTATION
// ============================================

// Create default layer so the app always starts with one layer + one frame
const DEFAULT_LAYER = createDefaultLayer();

export const useTimelineStore = create<TimelineState>()(
  subscribeWithSelector((set, get) => ({
    // ----- Initial State -----
    config: { ...INITIAL_CONFIG },
    layers: [DEFAULT_LAYER],
    layerGroups: [],
    globalEffects: [],
    postEffectTracks: [],
    view: { ...INITIAL_VIEW, activeLayerId: DEFAULT_LAYER.id },

    // ============================================
    // LAYER ACTIONS
    // ============================================

    addLayer: (name?) => {
      // Check subscription tier layer limit
      if (!canAddLayer()) {
        console.warn('Layer limit reached. Cannot add more layers.');
        return null;
      }

      const { layers, view } = get();
      const id = generateLayerId();
      const layerName = name ?? `Layer ${layers.length + 1}`;

      // Default anchor point to canvas center
      const { width, height } = useCanvasStore.getState();
      const anchorX = Math.floor(width / 2);
      const anchorY = Math.floor(height / 2);

      const newLayer: Layer = {
        id,
        name: layerName,
        visible: true,
        solo: false,
        locked: false,
        opacity: 100,
        contentFrames: [{
          id: generateContentFrameId(),
          name: 'Frame 1',
          startFrame: 0,
          durationFrames: 1,
          data: new Map(),
        }],
        propertyTracks: [],
        staticProperties: {
          'transform.anchorPoint.x': anchorX,
          'transform.anchorPoint.y': anchorY,
        },
        effectTracks: [],
      };

      // Insert above active layer (or at top if none active)
      const activeIndex = view.activeLayerId
        ? layers.findIndex((l) => l.id === view.activeLayerId)
        : -1;
      const insertIndex = activeIndex !== -1 ? activeIndex + 1 : layers.length;

      const newLayers = [
        ...layers.slice(0, insertIndex),
        newLayer,
        ...layers.slice(insertIndex),
      ];

      set({
        layers: newLayers,
        view: { ...view, activeLayerId: id },
      });

      return id;
    },

    removeLayer: (layerId) => {
      const { layers, view } = get();
      const index = layers.findIndex((l) => l.id === layerId);
      if (index === -1) return;

      const newLayers = layers.filter((l) => l.id !== layerId);

      // Enforce minimum 1 layer
      if (newLayers.length === 0) {
        const defaultLayer = createDefaultLayer();
        set({
          layers: [defaultLayer],
          view: { ...view, activeLayerId: defaultLayer.id },
        });
        return;
      }

      // Update active layer if we deleted the active one
      let newActiveId = view.activeLayerId;
      if (view.activeLayerId === layerId) {
        // Select adjacent layer
        const newIndex = Math.min(index, newLayers.length - 1);
        newActiveId = newLayers[newIndex].id;
      }

      set({
        layers: newLayers,
        view: { ...view, activeLayerId: newActiveId },
      });
    },

    duplicateLayer: (layerId) => {
      // Check subscription tier layer limit
      if (!canAddLayer()) {
        console.warn('Layer limit reached. Cannot duplicate layer.');
        return null;
      }

      const { layers, view } = get();
      const source = layers.find((l) => l.id === layerId);
      if (!source) return null; // Return null if not found

      const newId = generateLayerId();
      const duplicate: Layer = {
        ...source,
        id: newId,
        name: `${source.name} Copy`,
        contentFrames: source.contentFrames.map((cf) => ({
          ...cf,
          id: generateContentFrameId(),
          data: new Map(cf.data),
        })),
        propertyTracks: source.propertyTracks.map((pt) => ({
          ...pt,
          id: generatePropertyTrackId(),
          keyframes: pt.keyframes.map((kf) => ({
            ...kf,
            id: generateKeyframeId(),
          })),
        })),
      };

      const sourceIndex = layers.findIndex((l) => l.id === layerId);
      const insertIndex = sourceIndex + 1;

      const newLayers = [
        ...layers.slice(0, insertIndex),
        duplicate,
        ...layers.slice(insertIndex),
      ];

      set({
        layers: newLayers,
        view: { ...view, activeLayerId: newId },
      });

      return newId;
    },

    reorderLayers: (fromIndex, toIndex) => {
      const { layers } = get();
      if (fromIndex < 0 || fromIndex >= layers.length) return;
      if (toIndex < 0 || toIndex >= layers.length) return;
      if (fromIndex === toIndex) return;

      const newLayers = [...layers];
      const [moved] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, moved);

      set({ layers: newLayers });
    },

    renameLayer: (layerId, name) => {
      set((state) => ({
        layers: updateLayer(state.layers, layerId, (l) => ({ ...l, name })),
      }));
    },

    setLayerVisible: (layerId, visible) => {
      set((state) => ({
        layers: updateLayer(state.layers, layerId, (l) => ({ ...l, visible })),
      }));
    },

    setLayerSolo: (layerId, solo) => {
      set((state) => ({
        layers: updateLayer(state.layers, layerId, (l) => ({ ...l, solo })),
      }));
    },

    setLayerLocked: (layerId, locked) => {
      set((state) => ({
        layers: updateLayer(state.layers, layerId, (l) => ({ ...l, locked })),
      }));
    },

    setLayerSyncKeyframes: (layerId, sync) => {
      set((state) => ({
        layers: updateLayer(state.layers, layerId, (l) => ({ ...l, syncKeyframesToFrames: sync })),
      }));
    },

    setLayerOpacity: (layerId, opacity) => {
      set((state) => ({
        layers: updateLayer(state.layers, layerId, (l) => ({
          ...l,
          opacity: Math.max(0, Math.min(100, opacity)),
        })),
      }));
    },

    setStaticProperty: (layerId, propertyPath, value) => {
      // Try layers first
      const layer = get().layers.find((l) => l.id === layerId);
      if (layer) {
        set((state) => ({
          layers: updateLayer(state.layers, layerId, (l) => ({
            ...l,
            staticProperties: { ...l.staticProperties, [propertyPath]: value },
          })),
        }));
      } else {
        // Fall back to groups
        set((state) => ({
          layerGroups: state.layerGroups.map((g) =>
            (g.id as unknown) === layerId
              ? { ...g, staticProperties: { ...g.staticProperties, [propertyPath]: value } }
              : g,
          ),
        }));
      }
    },

    replaceStaticProperties: (layerId, properties) => {
      // Try layers first
      const layer = get().layers.find((l) => l.id === layerId);
      if (layer) {
        set((state) => ({
          layers: updateLayer(state.layers, layerId, (l) => ({
            ...l,
            staticProperties: { ...properties },
          })),
        }));
      } else {
        // Fall back to groups
        set((state) => ({
          layerGroups: state.layerGroups.map((g) =>
            (g.id as unknown) === layerId
              ? { ...g, staticProperties: { ...properties } }
              : g,
          ),
        }));
      }
    },

    getActiveLayer: () => {
      const { layers, view } = get();
      if (!view.activeLayerId) return null;
      return layers.find((l) => l.id === view.activeLayerId) ?? null;
    },

    setActiveLayer: (layerId) => {
      set((state) => ({
        view: { ...state.view, activeLayerId: layerId, activeGroupId: null, selectedEffectBlockId: null },
      }));
    },

    getLayer: (layerId) => {
      return get().layers.find((l) => l.id === layerId);
    },

    selectLayers: (layerIds) => {
      set((state) => ({
        view: { ...state.view, selectedLayerIds: new Set(layerIds) },
      }));
    },

    toggleLayerSelected: (layerId) => {
      set((state) => {
        const selected = new Set(state.view.selectedLayerIds);
        if (selected.has(layerId)) {
          selected.delete(layerId);
        } else {
          selected.add(layerId);
        }
        return { view: { ...state.view, selectedLayerIds: selected } };
      });
    },

    clearLayerSelection: () => {
      set((state) => ({
        view: { ...state.view, selectedLayerIds: new Set() },
      }));
    },

    toggleGroupCollapsed: (groupId) => {
      set((state) => ({
        layerGroups: state.layerGroups.map((g) =>
          g.id === groupId ? { ...g, collapsed: !g.collapsed } : g
        ),
      }));
    },

    setActiveGroup: (groupId) => {
      set((state) => ({
        view: {
          ...state.view,
          activeGroupId: groupId,
          selectedEffectBlockId: null,
          // Clear active layer and showLayerProperties when selecting a group
          ...(groupId ? { activeLayerId: null, showLayerProperties: false } : {}),
        },
      }));
    },

    getGroup: (groupId) => {
      return get().layerGroups.find((g) => g.id === groupId);
    },

    // ============================================
    // CONTENT FRAME ACTIONS
    // ============================================

    addContentFrame: (layerId, startFrame, durationFrames, data) => {
      const { layers } = get();
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return null;

      const newFrame: ContentFrame = {
        id: generateContentFrameId(),
        name: `Frame ${layer.contentFrames.length + 1}`,
        startFrame,
        durationFrames: Math.max(1, durationFrames),
        data: data ?? new Map(),
      };

      // Validate no overlap
      for (const existing of layer.contentFrames) {
        if (contentFramesOverlap(newFrame, existing)) {
          console.warn(`Content frame overlap detected on layer "${layer.name}". Rejecting.`);
          return null;
        }
      }

      // Auto-expand timeline if the new content frame extends past the current duration.
      // Only extends — never shrinks.
      const frameEnd = startFrame + durationFrames;
      if (frameEnd > get().config.durationFrames) {
        get().ensureTimelineContains(frameEnd - 1);
      }

      set((state) => ({
        layers: updateLayer(state.layers, layerId, (l) => ({
          ...l,
          contentFrames: [...l.contentFrames, newFrame],
        })),
      }));

      return newFrame.id;
    },

    removeContentFrame: (layerId, frameId) => {
      set((state) => ({
        layers: updateLayer(state.layers, layerId, (l) => ({
          ...l,
          contentFrames: l.contentFrames.filter((cf) => cf.id !== frameId),
        })),
      }));
    },

    updateContentFrameTiming: (layerId, frameId, startFrame, durationFrames) => {
      const { layers } = get();
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return false;

      const clampedDuration = Math.max(1, durationFrames);
      const clampedStart = Math.max(0, startFrame);

      // Check for overlaps with other frames
      const otherFrames = layer.contentFrames.filter((cf) => cf.id !== frameId);
      const proposed: ContentFrame = {
        id: frameId,
        name: '',
        startFrame: clampedStart,
        durationFrames: clampedDuration,
        data: new Map(),
      };

      for (const existing of otherFrames) {
        if (contentFramesOverlap(proposed, existing)) {
          console.warn(`Content frame timing update would cause overlap. Rejecting.`);
          return false;
        }
      }

      // Note: we do NOT auto-expand the timeline here. This method is called
      // during drag reorder with intermediate "parking" positions that would
      // incorrectly extend the timeline. Callers that need auto-expand (like
      // resize handlers) should call ensureTimelineContains() explicitly.

      set((state) => ({
        layers: updateLayer(state.layers, layerId, (l) => ({
          ...l,
          contentFrames: l.contentFrames.map((cf) =>
            cf.id === frameId
              ? { ...cf, startFrame: clampedStart, durationFrames: clampedDuration }
              : cf,
          ),
        })),
      }));

      return true;
    },

    updateContentFrameData: (layerId, frameId, data) => {
      // PERF FIX: Mutate the content frame's data in-place instead of creating
      // new layers/contentFrames arrays. This avoids triggering re-renders in
      // ALL timelineStore subscribers on every auto-save (which fires every 150ms
      // during drawing). Components that need to react to cell data changes
      // already subscribe to canvasStore.cells directly.
      //
      // This is safe because:
      // 1. Cell data maps are large objects — cloning them on every save is expensive
      // 2. No component renders content frame cell data directly from timelineStore
      //    (they all use canvasStore or useCompositedCanvas)
      // 3. Structural selectors (layer count, frame count, etc.) don't change
      //
      // If you need to trigger re-renders after updating cell data (e.g., for export
      // or thumbnails), call `set({ layers: [...get().layers] })` explicitly.
      const { layers } = get();
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return;
      const cf = layer.contentFrames.find((c) => c.id === frameId);
      if (!cf) return;
      cf.data = data;
    },

    splitContentFrame: (layerId, frameId, atFrame) => {
      const { layers } = get();
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return null;

      const cf = layer.contentFrames.find((c) => c.id === frameId);
      if (!cf) return null;

      // atFrame must be strictly inside the frame (not at start or end)
      if (atFrame <= cf.startFrame || atFrame >= cf.startFrame + cf.durationFrames) {
        return null;
      }

      const leftDuration = atFrame - cf.startFrame;
      const rightDuration = cf.durationFrames - leftDuration;

      const newFrameId = generateContentFrameId();
      const newFrame: ContentFrame = {
        id: newFrameId,
        name: `${cf.name} (split)`,
        startFrame: atFrame,
        durationFrames: rightDuration,
        data: new Map(cf.data), // Clone data
      };

      // Shrink original + insert new frame
      set((state) => ({
        layers: updateLayer(state.layers, layerId, (l) => ({
          ...l,
          contentFrames: l.contentFrames.map((c) =>
            c.id === frameId
              ? { ...c, durationFrames: leftDuration }
              : c,
          ).concat(newFrame),
        })),
      }));

      return newFrameId;
    },

    duplicateContentFrame: (layerId, frameId) => {
      const { layers } = get();
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return null;

      const cf = layer.contentFrames.find((c) => c.id === frameId);
      if (!cf) return null;

      // Place the duplicate immediately after the original
      const afterEnd = cf.startFrame + cf.durationFrames;

      // Check no overlap at that position
      const newFrameId = generateContentFrameId();
      const newFrame: ContentFrame = {
        id: newFrameId,
        name: `${cf.name} (copy)`,
        startFrame: afterEnd,
        durationFrames: cf.durationFrames,
        data: new Map(cf.data),
      };

      for (const existing of layer.contentFrames) {
        if (contentFramesOverlap(newFrame, existing)) {
          console.warn('Cannot duplicate: would overlap with another content frame.');
          return null;
        }
      }

      // Auto-expand timeline if needed
      get().ensureTimelineContains(afterEnd + cf.durationFrames - 1);

      set((state) => ({
        layers: updateLayer(state.layers, layerId, (l) => ({
          ...l,
          contentFrames: [...l.contentFrames, newFrame],
        })),
      }));

      return newFrameId;
    },

    getContentFrameAt: (layerId, frame) => {
      const layer = get().layers.find((l) => l.id === layerId);
      if (!layer) return null;

      return (
        layer.contentFrames.find(
          (cf) => frame >= cf.startFrame && frame < cf.startFrame + cf.durationFrames,
        ) ?? null
      );
    },

    // ============================================
    // KEYFRAME ACTIONS
    // ============================================

    addPropertyTrack: (layerId, propertyPath) => {
      const id = generatePropertyTrackId();

      const newTrack: PropertyTrack = {
        id,
        propertyPath,
        keyframes: [],
        loopKeyframes: false,
      };

      // Try layers first
      const layer = get().layers.find((l) => l.id === layerId);
      if (layer) {
        set((state) => ({
          layers: updateLayer(state.layers, layerId, (l) => ({
            ...l,
            propertyTracks: [...l.propertyTracks, newTrack],
          })),
        }));
      } else {
        // Fall back to groups
        set((state) => ({
          layerGroups: state.layerGroups.map((g) =>
            (g.id as unknown) === layerId
              ? { ...g, propertyTracks: [...g.propertyTracks, newTrack] }
              : g,
          ),
        }));
      }

      return id;
    },

    removePropertyTrack: (layerId, trackId) => {
      const layer = get().layers.find((l) => l.id === layerId);
      if (layer && layer.propertyTracks.some((pt) => pt.id === trackId)) {
        set((state) => ({
          layers: updateLayer(state.layers, layerId, (l) => ({
            ...l,
            propertyTracks: l.propertyTracks.filter((pt) => pt.id !== trackId),
          })),
        }));
      } else {
        set((state) => ({
          layerGroups: state.layerGroups.map((g) => {
            const hasTrack = g.propertyTracks.some((pt) => pt.id === trackId);
            if (!hasTrack) return g;
            return { ...g, propertyTracks: g.propertyTracks.filter((pt) => pt.id !== trackId) };
          }),
        }));
      }
    },

    addKeyframe: (layerId, trackId, frame, value) => {
      const id = generateKeyframeId();

      const newKeyframe: Keyframe = {
        id,
        frame,
        value,
        easing: defaultEasing(),
      };

      // Auto-expand timeline
      get().ensureTimelineContains(frame);

      // Try layers first
      const layer = get().layers.find((l) => l.id === layerId);
      if (layer && layer.propertyTracks.some((pt) => pt.id === trackId)) {
        set((state) => ({
          layers: updateLayer(state.layers, layerId, (l) => ({
            ...l,
            propertyTracks: l.propertyTracks.map((pt) => {
              if (pt.id !== trackId) return pt;
              const existingIndex = pt.keyframes.findIndex((kf) => kf.frame === frame);
              if (existingIndex !== -1) {
                const updated = [...pt.keyframes];
                updated[existingIndex] = { ...updated[existingIndex], value };
                return { ...pt, keyframes: updated };
              }
              const keyframes = [...pt.keyframes, newKeyframe].sort((a, b) => a.frame - b.frame);
              return { ...pt, keyframes };
            }),
          })),
        }));
        return id;
      }

      // Try layerGroups
      const group = get().layerGroups.find((g) => g.propertyTracks.some((pt) => pt.id === trackId));
      if (group) {
        set((state) => ({
          layerGroups: state.layerGroups.map((g) => {
            const hasTrack = g.propertyTracks.some((pt) => pt.id === trackId);
            if (!hasTrack) return g;
            return {
              ...g,
              propertyTracks: g.propertyTracks.map((pt) => {
                if (pt.id !== trackId) return pt;
                const existingIndex = pt.keyframes.findIndex((kf) => kf.frame === frame);
                if (existingIndex !== -1) {
                  const updated = [...pt.keyframes];
                  updated[existingIndex] = { ...updated[existingIndex], value };
                  return { ...pt, keyframes: updated };
                }
                const keyframes = [...pt.keyframes, newKeyframe].sort((a, b) => a.frame - b.frame);
                return { ...pt, keyframes };
              }),
            };
          }),
        }));
        return id;
      }

      // Fallback: effect property tracks
      const effectUpdate = updateEffectPropertyTrackKeyframes(
        get(),
        trackId as string,
        (kfs) => {
          const existingIndex = kfs.findIndex((kf) => kf.frame === frame);
          if (existingIndex !== -1) {
            const updated = [...kfs];
            updated[existingIndex] = { ...updated[existingIndex], value };
            return updated;
          }
          return [...kfs, { id, frame, value, easing: defaultEasing() } as EffectKeyframe].sort((a, b) => a.frame - b.frame);
        },
      );
      if (effectUpdate) set(effectUpdate);

      return id;
    },

    removeKeyframe: (layerId, trackId, keyframeId) => {
      // Try layers first — check if the layer actually has this track
      const layer = get().layers.find((l) => l.id === layerId);
      if (layer && layer.propertyTracks.some((pt) => pt.id === trackId)) {
        set((state) => ({
          layers: updateLayer(state.layers, layerId, (l) => ({
            ...l,
            propertyTracks: l.propertyTracks.map((pt) =>
              pt.id === trackId
                ? { ...pt, keyframes: pt.keyframes.filter((kf) => kf.id !== keyframeId) }
                : pt,
            ),
          })),
        }));
        return;
      }
      // Try layerGroups
      const group = get().layerGroups.find((g) => g.propertyTracks.some((pt) => pt.id === trackId));
      if (group) {
        set((state) => ({
          layerGroups: state.layerGroups.map((g) => {
            if (!g.propertyTracks.some((pt) => pt.id === trackId)) return g;
            return {
              ...g,
              propertyTracks: g.propertyTracks.map((pt) =>
                pt.id === trackId
                  ? { ...pt, keyframes: pt.keyframes.filter((kf) => kf.id !== keyframeId) }
                  : pt,
              ),
            };
          }),
        }));
        return;
      }
      // Fallback: effect property tracks (search all layers, groups, global)
      const effectUpdate = updateEffectPropertyTrackKeyframes(
        get(),
        trackId as string,
        (kfs) => kfs.filter((kf) => kf.id !== keyframeId),
      );
      if (effectUpdate) set(effectUpdate);
    },

    updateKeyframe: (layerId, trackId, keyframeId, updates) => {
      // Try layers first — check if the layer actually has this track
      const layer = get().layers.find((l) => l.id === layerId);
      if (layer && layer.propertyTracks.some((pt) => pt.id === trackId)) {
        set((state) => ({
          layers: updateLayer(state.layers, layerId, (l) => ({
            ...l,
            propertyTracks: l.propertyTracks.map((pt) => {
              if (pt.id !== trackId) return pt;
              const keyframes = pt.keyframes.map((kf) =>
                kf.id === keyframeId ? { ...kf, ...updates } : kf,
              );
              if (updates.frame !== undefined) {
                keyframes.sort((a, b) => a.frame - b.frame);
              }
              return { ...pt, keyframes };
            }),
          })),
        }));
        return;
      }
      // Try layerGroups
      const group = get().layerGroups.find((g) => g.propertyTracks.some((pt) => pt.id === trackId));
      if (group) {
        set((state) => ({
          layerGroups: state.layerGroups.map((g) => {
            if (!g.propertyTracks.some((pt) => pt.id === trackId)) return g;
            return {
              ...g,
              propertyTracks: g.propertyTracks.map((pt) => {
                if (pt.id !== trackId) return pt;
                const keyframes = pt.keyframes.map((kf) =>
                  kf.id === keyframeId ? { ...kf, ...updates } : kf,
                );
                if (updates.frame !== undefined) {
                  keyframes.sort((a, b) => a.frame - b.frame);
                }
                return { ...pt, keyframes };
              }),
            };
          }),
        }));
        return;
      }
      // Fallback: effect property tracks
      const effectUpdate = updateEffectPropertyTrackKeyframes(
        get(),
        trackId as string,
        (kfs) => {
          const updated = kfs.map((kf) =>
            kf.id === keyframeId ? { ...kf, ...updates } : kf,
          );
          if (updates.frame !== undefined) {
            updated.sort((a, b) => a.frame - b.frame);
          }
          return updated;
        },
      );
      if (effectUpdate) set(effectUpdate);
    },

    moveKeyframe: (layerId, trackId, keyframeId, newFrame) => {
      get().ensureTimelineContains(newFrame);
      get().updateKeyframe(layerId, trackId, keyframeId, { frame: newFrame });
    },

    setKeyframeLooping: (layerId, trackId, looping) => {
      // Try layers first
      const layer = get().layers.find((l) => l.id === layerId);
      if (layer && layer.propertyTracks.some((pt) => pt.id === trackId)) {
        set((state) => ({
          layers: updateLayer(state.layers, layerId, (l) => ({
            ...l,
            propertyTracks: l.propertyTracks.map((pt) =>
              pt.id === trackId ? { ...pt, loopKeyframes: looping } : pt,
            ),
          })),
        }));
        return;
      }
      // Fallback: check layer groups
      set((state) => ({
        layerGroups: state.layerGroups.map((g) => {
          if (!g.propertyTracks.some((pt) => pt.id === trackId)) return g;
          return {
            ...g,
            propertyTracks: g.propertyTracks.map((pt) =>
              pt.id === trackId ? { ...pt, loopKeyframes: looping } : pt,
            ),
          };
        }),
      }));
    },

    // ============================================
    // PLAYBACK ACTIONS
    // ============================================

    goToFrame: (frame) => {
      const { config } = get();
      const clamped = Math.max(0, Math.min(frame, config.durationFrames - 1));
      set((state) => ({
        view: { ...state.view, currentFrame: clamped },
      }));
    },

    nextFrame: () => {
      const { view, config } = get();
      const next = view.currentFrame + 1;
      if (next >= config.durationFrames) {
        if (view.looping) {
          set((state) => ({ view: { ...state.view, currentFrame: 0 } }));
        }
        // else: stay at last frame
      } else {
        set((state) => ({ view: { ...state.view, currentFrame: next } }));
      }
    },

    previousFrame: () => {
      const { view, config } = get();
      const prev = view.currentFrame - 1;
      if (prev < 0) {
        if (view.looping) {
          set((state) => ({
            view: { ...state.view, currentFrame: config.durationFrames - 1 },
          }));
        }
        // else: stay at frame 0
      } else {
        set((state) => ({ view: { ...state.view, currentFrame: prev } }));
      }
    },

    setPlaying: (playing) => {
      set((state) => ({ view: { ...state.view, isPlaying: playing } }));
    },

    setLooping: (looping) => {
      set((state) => ({ view: { ...state.view, looping } }));
    },

    setFrameRate: (newFps, maintainDuration = true) => {
      const { config, layers } = get();
      const oldFps = config.frameRate;
      if (newFps === oldFps || newFps <= 0) return;

      if (maintainDuration) {
        const ratio = newFps / oldFps;

        // Convert all content frame timings
        const convertedLayers = layers.map((layer) => ({
          ...layer,
          contentFrames: layer.contentFrames.map((cf) => ({
            ...cf,
            startFrame: Math.round(cf.startFrame * ratio),
            durationFrames: Math.max(1, Math.round(cf.durationFrames * ratio)),
          })),
          propertyTracks: layer.propertyTracks.map((track) => ({
            ...track,
            keyframes: track.keyframes.map((kf) => ({
              ...kf,
              frame: Math.round(kf.frame * ratio),
            })),
          })),
        }));

        const newDurationFrames = Math.max(1, Math.round(config.durationFrames * ratio));

        set({
          config: {
            frameRate: newFps,
            durationFrames: newDurationFrames,
            durationMs: (newDurationFrames / newFps) * 1000,
          },
          layers: convertedLayers,
        });
      } else {
        set({
          config: {
            ...config,
            frameRate: newFps,
            durationMs: (config.durationFrames / newFps) * 1000,
          },
        });
      }
    },

    setDuration: (frames) => {
      const clamped = Math.max(1, frames);
      set((state) => ({
        config: {
          ...state.config,
          durationFrames: clamped,
          durationMs: (clamped / state.config.frameRate) * 1000,
        },
      }));
    },

    // ============================================
    // TIMELINE AUTO-EXPAND
    // ============================================

    ensureTimelineContains: (frame) => {
      const { config } = get();
      if (frame >= config.durationFrames) {
        const newDuration = frame + 1;
        set({
          config: {
            ...config,
            durationFrames: newDuration,
            durationMs: (newDuration / config.frameRate) * 1000,
          },
        });
      }
    },

    // ============================================
    // VIEW ACTIONS
    // ============================================

    setActiveView: (activeView) => {
      set((state) => ({ view: { ...state.view, activeView } }));
    },

    setZoom: (zoom) => {
      set((state) => ({
        view: { ...state.view, zoom: Math.max(0.1, Math.min(10, zoom)) },
      }));
    },

    setScrollX: (scrollX) => {
      set((state) => ({ view: { ...state.view, scrollX } }));
    },

    setPanelHeight: (height) => {
      set((state) => ({
        view: { ...state.view, panelHeight: Math.max(100, Math.min(600, height)) },
      }));
    },

    selectKeyframes: (keyframeIds) => {
      set((state) => ({
        view: { ...state.view, selectedKeyframeIds: new Set(keyframeIds) },
      }));
    },

    addKeyframesToSelection: (keyframeIds) => {
      set((state) => {
        const next = new Set(state.view.selectedKeyframeIds);
        for (const id of keyframeIds) next.add(id);
        return { view: { ...state.view, selectedKeyframeIds: next } };
      });
    },

    removeKeyframesFromSelection: (keyframeIds) => {
      set((state) => {
        const next = new Set(state.view.selectedKeyframeIds);
        for (const id of keyframeIds) next.delete(id);
        return { view: { ...state.view, selectedKeyframeIds: next } };
      });
    },

    toggleKeyframeSelected: (keyframeId) => {
      set((state) => {
        const next = new Set(state.view.selectedKeyframeIds);
        if (next.has(keyframeId)) {
          next.delete(keyframeId);
        } else {
          next.add(keyframeId);
        }
        return { view: { ...state.view, selectedKeyframeIds: next } };
      });
    },

    clearKeyframeSelection: () => {
      set((state) => ({
        view: {
          ...state.view,
          selectedKeyframeIds: new Set(),
          editingKeyframeId: null,
        },
      }));
    },

    selectContentFrames: (frameIds) => {
      set((state) => ({
        view: { ...state.view, selectedContentFrameIds: new Set(frameIds) },
      }));
    },

    addContentFramesToSelection: (frameIds) => {
      set((state) => {
        const next = new Set(state.view.selectedContentFrameIds);
        for (const id of frameIds) next.add(id);
        return { view: { ...state.view, selectedContentFrameIds: next } };
      });
    },

    toggleContentFrameSelected: (frameId) => {
      set((state) => {
        const next = new Set(state.view.selectedContentFrameIds);
        if (next.has(frameId)) {
          next.delete(frameId);
        } else {
          next.add(frameId);
        }
        return { view: { ...state.view, selectedContentFrameIds: next } };
      });
    },

    clearContentFrameSelection: () => {
      set((state) => ({
        view: { ...state.view, selectedContentFrameIds: new Set() },
      }));
    },

    toggleContentFrameHidden: (layerId, frameIds, hidden) => {
      set((state) => ({
        layers: updateLayer(state.layers, layerId, (l) => ({
          ...l,
          contentFrames: l.contentFrames.map((cf) =>
            frameIds.includes(cf.id) ? { ...cf, hidden } : cf,
          ),
        })),
      }));
    },

    renameContentFrame: (layerId, frameId, name) => {
      set((state) => ({
        layers: updateLayer(state.layers, layerId, (l) => ({
          ...l,
          contentFrames: l.contentFrames.map((cf) =>
            cf.id === frameId ? { ...cf, name } : cf,
          ),
        })),
      }));
    },

    setContentFrameLabel: (layerId, frameIds, labelColor) => {
      set((state) => ({
        layers: updateLayer(state.layers, layerId, (l) => ({
          ...l,
          contentFrames: l.contentFrames.map((cf) =>
            frameIds.includes(cf.id) ? { ...cf, labelColor } : cf,
          ),
        })),
      }));
    },

    setContentFrameDragPreview: (preview) => {
      set((state) => ({
        view: { ...state.view, contentFrameDragPreview: preview },
      }));
    },

    setEditingKeyframe: (keyframeId) => {
      set((state) => ({
        view: { ...state.view, editingKeyframeId: keyframeId },
      }));
    },

    setKeyframeDuplicateGhosts: (ghosts) => {
      set((state) => ({
        view: { ...state.view, keyframeDuplicateGhosts: ghosts },
      }));
    },

    clearKeyframeDuplicateGhosts: () => {
      set((state) => ({
        view: { ...state.view, keyframeDuplicateGhosts: new Map() },
      }));
    },

    setShowLayerProperties: (show) => {
      set((state) => ({
        view: { ...state.view, showLayerProperties: show },
      }));
    },

    toggleLayerExpanded: (layerId) => {
      set((state) => {
        const next = new Set(state.view.expandedLayerIds);
        if (next.has(layerId)) {
          next.delete(layerId);
        } else {
          next.add(layerId);
        }
        return { view: { ...state.view, expandedLayerIds: next } };
      });
    },

    setExpandedLayerIds: (ids) => {
      set((state) => ({
        view: { ...state.view, expandedLayerIds: ids },
      }));
    },

    // ============================================
    // WORK AREA
    // ============================================

    setWorkAreaStart: (frame) => {
      set((state) => ({
        view: {
          ...state.view,
          workAreaStart: Math.max(0, Math.min(frame, state.view.workAreaEnd - 1)),
          workAreaEnabled: true,
        },
      }));
    },

    setWorkAreaEnd: (frame) => {
      set((state) => ({
        view: {
          ...state.view,
          workAreaEnd: Math.max(state.view.workAreaStart + 1, Math.min(frame, state.config.durationFrames)),
          workAreaEnabled: true,
        },
      }));
    },

    setWorkAreaEnabled: (enabled) => {
      set((state) => ({ view: { ...state.view, workAreaEnabled: enabled } }));
    },

    setTimecodeFormat: (format) => {
      set((state) => ({ view: { ...state.view, timecodeFormat: format } }));
    },

    // ============================================
    // REMOVE BLANK SPACE
    // ============================================

    removeBlankSpace: (layerId, clickFrame) => {
      const { layers } = get();
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return;

      const sorted = [...layer.contentFrames].sort((a, b) => a.startFrame - b.startFrame);

      // Determine if click is after all content frames (trailing space)
      const lastFrame = sorted.length > 0
        ? sorted[sorted.length - 1].startFrame + sorted[sorted.length - 1].durationFrames
        : 0;

      if (clickFrame >= lastFrame) {
        // Trailing space — shrink timeline to end of last content frame
        const newDuration = Math.max(1, lastFrame);
        set((state) => ({
          config: {
            ...state.config,
            durationFrames: newDuration,
            durationMs: (newDuration / state.config.frameRate) * 1000,
          },
        }));
        return;
      }

      // Find the gap that contains clickFrame
      let gapStart = 0;
      let gapEnd = 0;
      let foundGap = false;

      for (let i = 0; i < sorted.length; i++) {
        const cf = sorted[i];
        if (clickFrame < cf.startFrame && clickFrame >= gapStart) {
          // Click is in the gap BEFORE this content frame
          gapEnd = cf.startFrame;
          foundGap = true;
          break;
        }
        // Move gapStart past this content frame
        gapStart = cf.startFrame + cf.durationFrames;
      }

      if (!foundGap) return; // Click was inside a content frame, not a gap

      const gapSize = gapEnd - gapStart;
      if (gapSize <= 0) return;

      // Shift all content frames that start at or after gapEnd left by gapSize
      const syncKeyframes = layer.syncKeyframesToFrames ?? false;

      set((state) => ({
        layers: updateLayer(state.layers, layerId, (l) => {
          const newContentFrames = l.contentFrames.map((cf) => {
            if (cf.startFrame >= gapEnd) {
              return { ...cf, startFrame: cf.startFrame - gapSize };
            }
            return cf;
          });

          // If sync keyframes is on, shift keyframes in the same range
          let newPropertyTracks = l.propertyTracks;
          if (syncKeyframes && l.propertyTracks.length > 0) {
            newPropertyTracks = l.propertyTracks.map((track) => ({
              ...track,
              keyframes: track.keyframes.map((kf) => {
                if (kf.frame >= gapEnd) {
                  return { ...kf, frame: kf.frame - gapSize };
                }
                return kf;
              }),
            }));
          }

          return { ...l, contentFrames: newContentFrames, propertyTracks: newPropertyTracks };
        }),
      }));
    },

    // ── Clipboard ──
    copiedFrames: null,
    copiedKeyframes: null,

    copyContentFrames: (layerId, frameIds) => {
      const layer = get().layers.find((l) => l.id === layerId);
      if (!layer) return;
      const frames = layer.contentFrames
        .filter((cf) => frameIds.includes(cf.id))
        .sort((a, b) => a.startFrame - b.startFrame)
        .map((cf) => ({ durationFrames: cf.durationFrames, data: new Map(cf.data), hidden: cf.hidden }));
      set({ copiedFrames: frames, copiedKeyframes: null });
    },

    pasteContentFrames: (layerId, atFrame) => {
      const { copiedFrames } = get();
      if (!copiedFrames || copiedFrames.length === 0) return;
      let cursor = atFrame;
      for (const cf of copiedFrames) {
        get().addContentFrame(layerId, cursor, cf.durationFrames, new Map(cf.data));
        // Set hidden state if applicable
        if (cf.hidden) {
          const layer = get().layers.find((l) => l.id === layerId);
          const added = layer?.contentFrames.find((c) => c.startFrame === cursor && c.durationFrames === cf.durationFrames);
          if (added) {
            get().toggleContentFrameHidden(layerId, [added.id], true);
          }
        }
        cursor += cf.durationFrames;
      }
    },

    copyKeyframes: (keyframeIds) => {
      // Collect all selected keyframes across all layers/tracks AND groups
      type Entry = { layerId: string; trackId: string; propertyPath: string; frame: number; value: number; easing: import('../types/timeline').Keyframe['easing'] };
      const entries: Entry[] = [];
      for (const layer of get().layers) {
        for (const track of layer.propertyTracks) {
          for (const kf of track.keyframes) {
            if (keyframeIds.includes(kf.id)) {
              entries.push({
                layerId: layer.id as string,
                trackId: track.id as string,
                propertyPath: track.propertyPath,
                frame: kf.frame,
                value: kf.value as number,
                easing: kf.easing,
              });
            }
          }
        }
      }
      // Also search layerGroups
      for (const group of get().layerGroups) {
        for (const track of group.propertyTracks) {
          for (const kf of track.keyframes) {
            if (keyframeIds.includes(kf.id)) {
              entries.push({
                layerId: (group.childLayerIds[0] ?? group.id) as string,
                trackId: track.id as string,
                propertyPath: track.propertyPath,
                frame: kf.frame,
                value: kf.value as number,
                easing: kf.easing,
              });
            }
          }
        }
      }
      // Search effect property tracks across layers, groups, and global
      for (const layer of get().layers) {
        for (const et of (layer.effectTracks ?? [])) {
          for (const pt of et.effectBlock.propertyTracks) {
            for (const kf of pt.keyframes) {
              if (keyframeIds.includes(kf.id as KeyframeId)) {
                entries.push({
                  layerId: layer.id as string,
                  trackId: pt.id as string,
                  propertyPath: pt.propertyPath,
                  frame: kf.frame,
                  value: kf.value as number,
                  easing: kf.easing as import('../types/timeline').Keyframe['easing'],
                });
              }
            }
          }
        }
      }
      for (const group of get().layerGroups) {
        for (const et of (group.effectTracks ?? [])) {
          for (const pt of et.effectBlock.propertyTracks) {
            for (const kf of pt.keyframes) {
              if (keyframeIds.includes(kf.id as KeyframeId)) {
                entries.push({
                  layerId: (group.childLayerIds[0] ?? group.id) as string,
                  trackId: pt.id as string,
                  propertyPath: pt.propertyPath,
                  frame: kf.frame,
                  value: kf.value as number,
                  easing: kf.easing as import('../types/timeline').Keyframe['easing'],
                });
              }
            }
          }
        }
      }
      for (const et of (get().globalEffects ?? [])) {
        for (const pt of et.effectBlock.propertyTracks) {
          for (const kf of pt.keyframes) {
            if (keyframeIds.includes(kf.id as KeyframeId)) {
              entries.push({
                layerId: (get().layers[0]?.id ?? '') as string,
                trackId: pt.id as string,
                propertyPath: pt.propertyPath,
                frame: kf.frame,
                value: kf.value as number,
                easing: kf.easing as import('../types/timeline').Keyframe['easing'],
              });
            }
          }
        }
      }
      // Search post effect tracks
      for (const pet of (get().postEffectTracks ?? [])) {
        for (const pt of pet.effectBlock.propertyTracks) {
          for (const kf of pt.keyframes) {
            if (keyframeIds.includes(kf.id as KeyframeId)) {
              entries.push({
                layerId: (get().layers[0]?.id ?? '') as string,
                trackId: pt.id as string,
                propertyPath: pt.propertyPath,
                frame: kf.frame,
                value: kf.value as number,
                easing: kf.easing as import('../types/timeline').Keyframe['easing'],
              });
            }
          }
        }
      }
      if (entries.length === 0) return;

      // Sort all entries by frame to find the global first frame
      entries.sort((a, b) => a.frame - b.frame);
      const firstFrame = entries[0].frame;

      // Assign layer indices by unique layerId (in order of first appearance)
      const layerOrder: string[] = [];
      for (const e of entries) {
        if (!layerOrder.includes(e.layerId)) layerOrder.push(e.layerId);
      }

      // Assign track indices by unique trackId (in order of first appearance)
      const trackOrder: string[] = [];
      for (const e of entries) {
        if (!trackOrder.includes(e.trackId)) trackOrder.push(e.trackId);
      }

      const kfs = entries.map((e) => ({
        sourceLayerId: e.layerId,
        layerIndex: layerOrder.indexOf(e.layerId),
        trackIndex: trackOrder.indexOf(e.trackId),
        propertyPath: e.propertyPath,
        value: e.value,
        easing: e.easing,
        frameOffset: e.frame - firstFrame,
      }));
      set({ copiedKeyframes: kfs, copiedFrames: null });
    },

    pasteKeyframes: (layerId, trackId, atFrame) => {
      const { copiedKeyframes, layers, layerGroups } = get();
      if (!copiedKeyframes || copiedKeyframes.length === 0) return;

      // Find target track — check layers first, then groups
      let targetPath: string | undefined;
      const targetLayer = layers.find((l) => l.id === layerId);
      if (targetLayer) {
        const track = targetLayer.propertyTracks.find((t) => t.id === trackId);
        if (track) targetPath = track.propertyPath;
      }
      if (!targetPath) {
        // Search groups
        for (const group of layerGroups) {
          const track = group.propertyTracks.find((t) => t.id === trackId);
          if (track) {
            targetPath = track.propertyPath;
            break;
          }
        }
      }
      // Search effect property tracks
      if (!targetPath) {
        for (const layer of layers) {
          for (const et of (layer.effectTracks ?? [])) {
            const pt = et.effectBlock.propertyTracks.find((t) => (t.id as string) === (trackId as string));
            if (pt) { targetPath = pt.propertyPath; break; }
          }
          if (targetPath) break;
        }
      }
      if (!targetPath) {
        for (const group of layerGroups) {
          for (const et of (group.effectTracks ?? [])) {
            const pt = et.effectBlock.propertyTracks.find((t) => (t.id as string) === (trackId as string));
            if (pt) { targetPath = pt.propertyPath; break; }
          }
          if (targetPath) break;
        }
      }
      // Search global effects
      if (!targetPath) {
        for (const et of (get().globalEffects ?? [])) {
          const pt = et.effectBlock.propertyTracks.find((t) => (t.id as string) === (trackId as string));
          if (pt) { targetPath = pt.propertyPath; break; }
        }
      }
      // Search post effects
      if (!targetPath) {
        for (const pet of (get().postEffectTracks ?? [])) {
          const pt = pet.effectBlock.propertyTracks.find((t) => (t.id as string) === (trackId as string));
          if (pt) { targetPath = pt.propertyPath; break; }
        }
      }
      if (!targetPath) return;

      // Determine how many source layers are in the clipboard
      const maxLayerIndex = Math.max(...copiedKeyframes.map((kf) => kf.layerIndex ?? 0));
      const isMultiLayer = maxLayerIndex > 0;

      // Check if target track matches any copied property path
      const copiedPaths = [...new Set(copiedKeyframes.map((kf) => kf.propertyPath ?? ''))];
      const targetMatchesCopied = copiedPaths.includes(targetPath);

      if (isMultiLayer && targetMatchesCopied) {
        // Multi-layer paste: try to match original layer IDs first.
        // If original layers still exist, paste back to them.
        // Otherwise fall back to index offset from target layer.
        const sourceLayerIds = [...new Set(copiedKeyframes.map((kf) => kf.sourceLayerId ?? ''))];
        const allSourceLayersExist = sourceLayerIds.every((id) => layers.some((l) => (l.id as string) === id));

        for (const entry of copiedKeyframes) {
          let destLayer: typeof layers[0] | undefined;

          if (allSourceLayersExist) {
            // Original layers exist — paste back to them
            destLayer = layers.find((l) => (l.id as string) === entry.sourceLayerId);
          } else {
            // Fallback: use index offset from target layer
            const targetLayerIdx = layers.findIndex((l) => l.id === layerId);
            const destLayerIdx = targetLayerIdx + (entry.layerIndex ?? 0);
            if (destLayerIdx >= 0 && destLayerIdx < layers.length) {
              destLayer = layers[destLayerIdx];
            }
          }

          if (!destLayer) continue;

          const destTrack = destLayer.propertyTracks.find((t) => t.propertyPath === entry.propertyPath);
          if (!destTrack) continue;

          const targetFrame = atFrame + entry.frameOffset;
          get().addKeyframe(destLayer.id, destTrack.id, targetFrame, entry.value);
          const updatedLayer = get().layers.find((l) => l.id === destLayer!.id);
          const updatedTrack = updatedLayer?.propertyTracks.find((t) => t.id === destTrack.id);
          const addedKf = updatedTrack?.keyframes.find((kf) => kf.frame === targetFrame);
          if (addedKf) {
            get().updateKeyframe(destLayer.id, destTrack.id, addedKf.id, { easing: entry.easing });
          }
        }
      } else if (targetMatchesCopied) {
        // Single-layer multi-track paste: paste to matching property tracks
        for (const entry of copiedKeyframes) {
          // Find dest track on layer, group, or post effect
          let destTrackId: typeof trackId | undefined;
          let destPostEffect: ReturnType<typeof findPostEffectTrackOwner> = null;
          if (targetLayer) {
            const dt = targetLayer.propertyTracks.find((t) => t.propertyPath === entry.propertyPath);
            if (dt) destTrackId = dt.id;
          }
          if (!destTrackId) {
            for (const g of get().layerGroups) {
              const dt = g.propertyTracks.find((t) => t.propertyPath === entry.propertyPath);
              if (dt) { destTrackId = dt.id; break; }
            }
          }
          // Search post effects for matching property path
          if (!destTrackId) {
            for (const pet of (get().postEffectTracks ?? [])) {
              const pt = pet.effectBlock.propertyTracks.find((t) => t.propertyPath === entry.propertyPath);
              if (pt) {
                destPostEffect = { blockId: pet.effectBlock.id, track: pt };
                break;
              }
            }
          }
          if (!destTrackId && !destPostEffect) continue;

          const targetFrame = atFrame + entry.frameOffset;
          if (destPostEffect) {
            const kfId = get().addPostEffectKeyframe(destPostEffect.blockId, destPostEffect.track.id, targetFrame, entry.value);
            if (kfId) {
              get().updatePostEffectKeyframe(destPostEffect.blockId, destPostEffect.track.id, kfId, { easing: entry.easing });
            }
          } else {
            get().addKeyframe(layerId, destTrackId!, targetFrame, entry.value);
            const { kf: addedKf } = findTrackKeyframeByFrame(get(), destTrackId!, targetFrame);
            if (addedKf) {
              get().updateKeyframe(layerId, destTrackId!, addedKf.id, { easing: entry.easing });
            }
          }
        }
      } else {
        // Unmatched track: paste only trackIndex 0 keyframes from layerIndex 0
        // Check if the target is a post effect track
        const postEffectOwner = findPostEffectTrackOwner(get().postEffectTracks ?? [], trackId as string);
        for (const entry of copiedKeyframes) {
          if (entry.trackIndex !== 0 || entry.layerIndex !== 0) continue;
          const targetFrame = atFrame + entry.frameOffset;
          if (postEffectOwner) {
            const kfId = get().addPostEffectKeyframe(postEffectOwner.blockId, postEffectOwner.track.id, targetFrame, entry.value);
            if (kfId) {
              get().updatePostEffectKeyframe(postEffectOwner.blockId, postEffectOwner.track.id, kfId, { easing: entry.easing });
            }
          } else {
            get().addKeyframe(layerId, trackId, targetFrame, entry.value);
            const { kf: addedKf } = findTrackKeyframeByFrame(get(), trackId, targetFrame);
            if (addedKf) {
              get().updateKeyframe(layerId, trackId, addedKf.id, { easing: entry.easing });
            }
          }
        }
      }
    },

    clearWorkArea: () => {
      set((state) => ({
        view: {
          ...state.view,
          workAreaStart: 0,
          workAreaEnd: state.config.durationFrames,
          workAreaEnabled: false,
        },
      }));
    },

    trimToWorkArea: () => {
      const { view, layers, config } = get();
      const { workAreaStart, workAreaEnd } = view;
      if (!view.workAreaEnabled || workAreaStart >= workAreaEnd) return;

      const trimDuration = workAreaEnd - workAreaStart;

      // Trim all layers' content frames and keyframes to the work area range
      const trimmedLayers = layers.map((layer) => ({
        ...layer,
        contentFrames: layer.contentFrames
          .map((cf) => {
            const cfEnd = cf.startFrame + cf.durationFrames;
            // Fully outside — remove
            if (cfEnd <= workAreaStart || cf.startFrame >= workAreaEnd) return null;
            // Clip to work area bounds
            const newStart = Math.max(cf.startFrame, workAreaStart) - workAreaStart;
            const newEnd = Math.min(cfEnd, workAreaEnd) - workAreaStart;
            return {
              ...cf,
              startFrame: newStart,
              durationFrames: newEnd - newStart,
              data: new Map(cf.data),
            };
          })
          .filter((cf): cf is NonNullable<typeof cf> => cf !== null),
        propertyTracks: layer.propertyTracks.map((track) => ({
          ...track,
          keyframes: track.keyframes
            .filter((kf) => kf.frame >= workAreaStart && kf.frame < workAreaEnd)
            .map((kf) => ({ ...kf, frame: kf.frame - workAreaStart })),
        })),
      }));

      set({
        config: {
          ...config,
          durationFrames: trimDuration,
          durationMs: (trimDuration / config.frameRate) * 1000,
        },
        layers: trimmedLayers,
        view: {
          ...view,
          currentFrame: Math.min(view.currentFrame - workAreaStart, trimDuration - 1),
          workAreaStart: 0,
          workAreaEnd: trimDuration,
          workAreaEnabled: false,
        },
      });
    },

    // ============================================
    // MERGE / FLATTEN ACTIONS
    // ============================================

    mergeDown: (layerId) => {
      const { layers, view, layerGroups } = get();
      const index = layers.findIndex((l) => l.id === layerId);
      if (index <= 0) return null;

      const upperLayer = layers[index];
      const lowerLayer = layers[index - 1];

      const canvasWidth = useCanvasStore.getState().width;
      const canvasHeight = useCanvasStore.getState().height;

      // Use boundary-based merge to correctly handle overlapping frame blocks
      const mergedContentFrames = computeMergedContentFrames(
        [lowerLayer, upperLayer],
        canvasWidth,
        canvasHeight,
        layerGroups,
      );

      if (mergedContentFrames.length === 0) {
        mergedContentFrames.push({
          id: generateContentFrameId(),
          name: 'Frame 1',
          startFrame: 0,
          durationFrames: 1,
          data: new Map(),
        });
      }

      const mergedLayer: Layer = {
        id: generateLayerId(),
        name: lowerLayer.name,
        visible: true,
        solo: false,
        locked: false,
        opacity: 100,
        contentFrames: mergedContentFrames,
        propertyTracks: [],
        staticProperties: {
          'transform.anchorPoint.x': Math.floor(canvasWidth / 2),
          'transform.anchorPoint.y': Math.floor(canvasHeight / 2),
        },
        effectTracks: [],
      };

      const newLayers = [
        ...layers.slice(0, index - 1),
        mergedLayer,
        ...layers.slice(index + 1),
      ];

      set({
        layers: newLayers,
        view: { ...view, activeLayerId: mergedLayer.id },
      });

      return mergedLayer.id;
    },

    mergeVisible: () => {
      const { layers, view, layerGroups } = get();
      const visibleLayers = layers.filter((l) => l.visible);
      if (visibleLayers.length < 2) return null;

      const canvasWidth = useCanvasStore.getState().width;
      const canvasHeight = useCanvasStore.getState().height;

      const allFrames = visibleLayers.flatMap(l => l.contentFrames);
      if (allFrames.length === 0) return null;

      // Use boundary-based merge to correctly handle overlapping frame blocks
      const mergedContentFrames = computeMergedContentFrames(
        visibleLayers,
        canvasWidth,
        canvasHeight,
        layerGroups,
      );

      if (mergedContentFrames.length === 0) {
        mergedContentFrames.push({
          id: generateContentFrameId(),
          name: 'Frame 1',
          startFrame: 0,
          durationFrames: 1,
          data: new Map(),
        });
      }

      const mergedLayer: Layer = {
        id: generateLayerId(),
        name: 'Merged',
        visible: true,
        solo: false,
        locked: false,
        opacity: 100,
        contentFrames: mergedContentFrames,
        propertyTracks: [],
        staticProperties: {
          'transform.anchorPoint.x': Math.floor(canvasWidth / 2),
          'transform.anchorPoint.y': Math.floor(canvasHeight / 2),
        },
        effectTracks: [],
      };

      // Remove all visible layers; keep invisible ones; insert merged at top visible position
      const invisibleLayers = layers.filter((l) => !l.visible);
      const topVisibleIndex = layers.findIndex((l) => l.visible);
      const insertIndex = topVisibleIndex !== -1 ? topVisibleIndex : 0;

      const newLayers = [
        ...invisibleLayers.slice(0, insertIndex),
        mergedLayer,
        ...invisibleLayers.slice(insertIndex),
      ];

      set({
        layers: newLayers,
        view: { ...view, activeLayerId: mergedLayer.id },
      });

      return mergedLayer.id;
    },

    flattenLayer: (layerId) => {
      const { layers } = get();
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return;

      // Only flatten if there are transforms to bake
      const hasTransforms = layer.propertyTracks.length > 0 ||
        Object.keys(layer.staticProperties).some((k) => {
          if (k === 'transform.anchorPoint.x' || k === 'transform.anchorPoint.y') return false;
          const v = layer.staticProperties[k];
          if (k === 'transform.scale.x' || k === 'transform.scale.y') return v !== 1;
          return v !== 0;
        });

      if (!hasTransforms) return; // Nothing to flatten

      const canvasWidth = useCanvasStore.getState().width;
      const canvasHeight = useCanvasStore.getState().height;

      // Composite the single layer (applies its transforms) and write the result back
      const flattenedFrames = layer.contentFrames.map((cf) => {
        const compositedCells = compositeLayersAtFrame(
          [layer],
          cf.startFrame,
          canvasWidth,
          canvasHeight,
          undefined,
          false,
        );

        return {
          ...cf,
          data: compositedCells,
        };
      });

      // Reset transforms
      set((state) => ({
        layers: updateLayer(state.layers, layerId, (l) => ({
          ...l,
          contentFrames: flattenedFrames,
          propertyTracks: [],
          staticProperties: {
            'transform.anchorPoint.x': Math.floor(canvasWidth / 2),
            'transform.anchorPoint.y': Math.floor(canvasHeight / 2),
          },
        })),
      }));
    },

    // ============================================
    // LAYER GROUP ACTIONS
    // ============================================

    createGroup: (name, layerIds) => {
      const { layers, layerGroups } = get();
      if (layerIds.length < 2) return null; // Need at least 2 layers

      // Verify all layers exist
      const validIds = layerIds.filter((id) => layers.some((l) => l.id === id));
      if (validIds.length < 2) return null;

      const groupId = generateLayerGroupId();

      // Default anchor point to canvas center (same as layers)
      const { width, height } = useCanvasStore.getState();
      const anchorX = Math.floor(width / 2);
      const anchorY = Math.floor(height / 2);

      const newGroup: LayerGroup = {
        id: groupId,
        name,
        childLayerIds: validIds,
        visible: true,
        solo: false,
        locked: false,
        collapsed: false,
        propertyTracks: [],
        staticProperties: {
          'transform.anchorPoint.x': anchorX,
          'transform.anchorPoint.y': anchorY,
        },
        effectTracks: [],
      };

      // Update layers to reference the group
      const updatedLayers = layers.map((l) =>
        validIds.includes(l.id) ? { ...l, parentGroupId: groupId } : l,
      );

      set({
        layers: updatedLayers,
        layerGroups: [...layerGroups, newGroup],
      });

      return groupId;
    },

    ungroupLayers: (groupId) => {
      const { layers, layerGroups } = get();
      const group = layerGroups.find((g) => g.id === groupId);
      if (!group) return;

      // Remove group reference from child layers
      const updatedLayers = layers.map((l) =>
        l.parentGroupId === groupId
          ? { ...l, parentGroupId: undefined }
          : l,
      );

      set({
        layers: updatedLayers,
        layerGroups: layerGroups.filter((g) => g.id !== groupId),
      });
    },

    // ============================================
    // EFFECT TRACK ACTIONS (Procedural Effects)
    // ============================================

    addEffectBlock: (ownerId, effectType, startFrame, durationFrames) => {
      const { layers, layerGroups, globalEffects } = get();

      const blockId = generateEffectBlockId();
      const trackId = generateEffectTrackId();

      const newTrack: EffectTrack = {
        id: trackId,
        ownerId,
        effectBlock: {
          id: blockId,
          effectType,
          startFrame,
          durationFrames,
          enabled: true,
          settings: {},
          propertyTracks: [],
        },
        collapsed: true,
      };

      // Try to load default settings from registry
      const entry = getEffect(effectType);
      if (entry) {
        newTrack.effectBlock.settings = { ...entry.defaultSettings };
      }

      if (ownerId === null) {
        // Global
        set({ globalEffects: [...globalEffects, newTrack] });
      } else {
        // Try layer first
        const layer = layers.find((l) => l.id === ownerId);
        if (layer) {
          set({
            layers: updateLayer(layers, ownerId as LayerId, (l) => ({
              ...l,
              effectTracks: [...l.effectTracks, newTrack],
            })),
          });
          return blockId;
        }

        // Try group
        const group = layerGroups.find((g) => g.id === ownerId);
        if (group) {
          set({
            layerGroups: layerGroups.map((g) =>
              g.id === ownerId
                ? { ...g, effectTracks: [...g.effectTracks, newTrack] }
                : g,
            ),
          });
          return blockId;
        }

        return null;
      }

      return blockId;
    },

    removeEffectBlock: (ownerId, blockId) => {
      const { layers, layerGroups, globalEffects } = get();

      if (ownerId === null) {
        set({
          globalEffects: (globalEffects).filter(
            (t) => t.effectBlock.id !== blockId,
          ),
        });
      } else {
        const layer = layers.find((l) => l.id === ownerId);
        if (layer) {
          set({
            layers: updateLayer(layers, ownerId as LayerId, (l) => ({
              ...l,
              effectTracks: l.effectTracks.filter((t) => t.effectBlock.id !== blockId),
            })),
          });
          return;
        }

        const group = layerGroups.find((g) => g.id === ownerId);
        if (group) {
          set({
            layerGroups: layerGroups.map((g) =>
              g.id === ownerId
                ? { ...g, effectTracks: g.effectTracks.filter((t) => t.effectBlock.id !== blockId) }
                : g,
            ),
          });
        }
      }
    },

    updateEffectBlockTiming: (blockId, startFrame, durationFrames) => {
      const updateBlock = (tracks: EffectTrack[]): EffectTrack[] =>
        tracks.map((t) =>
          t.effectBlock.id === blockId
            ? { ...t, effectBlock: { ...t.effectBlock, startFrame, durationFrames } }
            : t,
        );

      const { layers, layerGroups, globalEffects } = get();

      // Search layers
      for (const layer of layers) {
        if (layer.effectTracks.some((t) => t.effectBlock.id === blockId)) {
          set({
            layers: updateLayer(layers, layer.id, (l) => ({
              ...l,
              effectTracks: updateBlock(l.effectTracks),
            })),
          });
          return;
        }
      }

      // Search groups
      for (const group of layerGroups) {
        if (group.effectTracks.some((t) => t.effectBlock.id === blockId)) {
          set({
            layerGroups: layerGroups.map((g) =>
              g.id === group.id
                ? { ...g, effectTracks: updateBlock(g.effectTracks) }
                : g,
            ),
          });
          return;
        }
      }

      // Global
      set({
        globalEffects: updateBlock(
          globalEffects,
        ),
      });
    },

    updateEffectBlockSettings: (blockId, settings) => {
      const updateBlock = (tracks: EffectTrack[]): EffectTrack[] =>
        tracks.map((t) =>
          t.effectBlock.id === blockId
            ? {
                ...t,
                effectBlock: {
                  ...t.effectBlock,
                  settings: { ...t.effectBlock.settings, ...settings },
                },
              }
            : t,
        );

      const { layers, layerGroups, globalEffects } = get();

      for (const layer of layers) {
        if (layer.effectTracks.some((t) => t.effectBlock.id === blockId)) {
          set({
            layers: updateLayer(layers, layer.id, (l) => ({
              ...l,
              effectTracks: updateBlock(l.effectTracks),
            })),
          });
          return;
        }
      }

      for (const group of layerGroups) {
        if (group.effectTracks.some((t) => t.effectBlock.id === blockId)) {
          set({
            layerGroups: layerGroups.map((g) =>
              g.id === group.id
                ? { ...g, effectTracks: updateBlock(g.effectTracks) }
                : g,
            ),
          });
          return;
        }
      }

      set({
        globalEffects: updateBlock(
          globalEffects,
        ),
      });
    },

    reorderEffectTracks: (ownerId, fromIndex, toIndex) => {
      const reorder = (tracks: EffectTrack[]): EffectTrack[] => {
        const result = [...tracks];
        const [moved] = result.splice(fromIndex, 1);
        result.splice(toIndex, 0, moved);
        return result;
      };

      const { layers, layerGroups, globalEffects } = get();

      if (ownerId === null) {
        set({
          globalEffects: reorder(
            globalEffects,
          ),
        });
        return;
      }

      const layer = layers.find((l) => l.id === ownerId);
      if (layer) {
        set({
          layers: updateLayer(layers, ownerId as LayerId, (l) => ({
            ...l,
            effectTracks: reorder(l.effectTracks),
          })),
        });
        return;
      }

      const group = layerGroups.find((g) => g.id === ownerId);
      if (group) {
        set({
          layerGroups: layerGroups.map((g) =>
            g.id === ownerId
              ? { ...g, effectTracks: reorder(g.effectTracks) }
              : g,
          ),
        });
      }
    },

    toggleEffectBlockEnabled: (blockId) => {
      const toggleBlock = (tracks: EffectTrack[]): EffectTrack[] =>
        tracks.map((t) =>
          t.effectBlock.id === blockId
            ? { ...t, effectBlock: { ...t.effectBlock, enabled: !t.effectBlock.enabled } }
            : t,
        );

      const { layers, layerGroups, globalEffects } = get();

      for (const layer of layers) {
        if (layer.effectTracks.some((t) => t.effectBlock.id === blockId)) {
          set({
            layers: updateLayer(layers, layer.id, (l) => ({
              ...l,
              effectTracks: toggleBlock(l.effectTracks),
            })),
          });
          return;
        }
      }

      for (const group of layerGroups) {
        if (group.effectTracks.some((t) => t.effectBlock.id === blockId)) {
          set({
            layerGroups: layerGroups.map((g) =>
              g.id === group.id
                ? { ...g, effectTracks: toggleBlock(g.effectTracks) }
                : g,
            ),
          });
          return;
        }
      }

      set({
        globalEffects: toggleBlock(
          globalEffects,
        ),
      });
    },

    addEffectPropertyTrack: (blockId, propertyPath) => {
      const ptId = generateEffectPropertyTrackId();

      const addTrackToBlock = (tracks: EffectTrack[]): EffectTrack[] =>
        tracks.map((t) => {
          if (t.effectBlock.id !== blockId) return t;
          // Don't add if already exists
          if (t.effectBlock.propertyTracks.some((pt) => pt.propertyPath === propertyPath)) return t;
          return {
            ...t,
            effectBlock: {
              ...t.effectBlock,
              propertyTracks: [
                ...t.effectBlock.propertyTracks,
                { id: ptId, propertyPath, keyframes: [], loopKeyframes: false },
              ],
            },
          };
        });

      const { layers, layerGroups, globalEffects } = get();

      for (const layer of layers) {
        if (layer.effectTracks.some((t) => t.effectBlock.id === blockId)) {
          set({ layers: updateLayer(layers, layer.id, (l) => ({ ...l, effectTracks: addTrackToBlock(l.effectTracks) })) });
          return ptId;
        }
      }

      for (const group of layerGroups) {
        if (group.effectTracks.some((t) => t.effectBlock.id === blockId)) {
          set({ layerGroups: layerGroups.map((g) => g.id === group.id ? { ...g, effectTracks: addTrackToBlock(g.effectTracks) } : g) });
          return ptId;
        }
      }

      set({ globalEffects: addTrackToBlock(globalEffects) });
      return ptId;
    },

    addEffectKeyframe: (blockId, trackId, frame, value) => {
      const keyframeId = generateKeyframeId();
      const newKeyframe: EffectKeyframe = {
        id: keyframeId,
        frame,
        value,
        easing: defaultEasing(),
      };

      const updateBlock = (tracks: EffectTrack[]): EffectTrack[] =>
        tracks.map((t) => {
          if (t.effectBlock.id !== blockId) return t;
          return {
            ...t,
            effectBlock: {
              ...t.effectBlock,
              propertyTracks: t.effectBlock.propertyTracks.map((pt) => {
                if (pt.id !== trackId) return pt;
                // Remove any existing keyframe at this frame, then add
                const filtered = pt.keyframes.filter((kf) => kf.frame !== frame);
                return {
                  ...pt,
                  keyframes: [...filtered, newKeyframe].sort((a, b) => a.frame - b.frame),
                };
              }),
            },
          };
        });

      const { layers, layerGroups, globalEffects } = get();

      for (const layer of layers) {
        if (layer.effectTracks.some((t) => t.effectBlock.id === blockId)) {
          set({
            layers: updateLayer(layers, layer.id, (l) => ({
              ...l,
              effectTracks: updateBlock(l.effectTracks),
            })),
          });
          return keyframeId;
        }
      }

      for (const group of layerGroups) {
        if (group.effectTracks.some((t) => t.effectBlock.id === blockId)) {
          set({
            layerGroups: layerGroups.map((g) =>
              g.id === group.id
                ? { ...g, effectTracks: updateBlock(g.effectTracks) }
                : g,
            ),
          });
          return keyframeId;
        }
      }

      set({
        globalEffects: updateBlock(
          globalEffects,
        ),
      });
      return keyframeId;
    },

    removeEffectKeyframe: (blockId, trackId, keyframeId) => {
      const updateBlock = (tracks: EffectTrack[]): EffectTrack[] =>
        tracks.map((t) => {
          if (t.effectBlock.id !== blockId) return t;
          return {
            ...t,
            effectBlock: {
              ...t.effectBlock,
              propertyTracks: t.effectBlock.propertyTracks.map((pt) => {
                if (pt.id !== trackId) return pt;
                return {
                  ...pt,
                  keyframes: pt.keyframes.filter((kf) => kf.id !== keyframeId),
                };
              }),
            },
          };
        });

      const { layers, layerGroups, globalEffects } = get();

      for (const layer of layers) {
        if (layer.effectTracks.some((t) => t.effectBlock.id === blockId)) {
          set({
            layers: updateLayer(layers, layer.id, (l) => ({
              ...l,
              effectTracks: updateBlock(l.effectTracks),
            })),
          });
          return;
        }
      }

      for (const group of layerGroups) {
        if (group.effectTracks.some((t) => t.effectBlock.id === blockId)) {
          set({
            layerGroups: layerGroups.map((g) =>
              g.id === group.id
                ? { ...g, effectTracks: updateBlock(g.effectTracks) }
                : g,
            ),
          });
          return;
        }
      }

      set({
        globalEffects: updateBlock(
          globalEffects,
        ),
      });
    },

    updateEffectKeyframe: (blockId, trackId, keyframeId, updates) => {
      const updateBlock = (tracks: EffectTrack[]): EffectTrack[] =>
        tracks.map((t) => {
          if (t.effectBlock.id !== blockId) return t;
          return {
            ...t,
            effectBlock: {
              ...t.effectBlock,
              propertyTracks: t.effectBlock.propertyTracks.map((pt) => {
                if (pt.id !== trackId) return pt;
                return {
                  ...pt,
                  keyframes: pt.keyframes
                    .map((kf) => (kf.id === keyframeId ? { ...kf, ...updates } : kf))
                    .sort((a, b) => a.frame - b.frame),
                };
              }),
            },
          };
        });

      const { layers, layerGroups, globalEffects } = get();

      for (const layer of layers) {
        if (layer.effectTracks.some((t) => t.effectBlock.id === blockId)) {
          set({
            layers: updateLayer(layers, layer.id, (l) => ({
              ...l,
              effectTracks: updateBlock(l.effectTracks),
            })),
          });
          return;
        }
      }

      for (const group of layerGroups) {
        if (group.effectTracks.some((t) => t.effectBlock.id === blockId)) {
          set({
            layerGroups: layerGroups.map((g) =>
              g.id === group.id
                ? { ...g, effectTracks: updateBlock(g.effectTracks) }
                : g,
            ),
          });
          return;
        }
      }

      set({
        globalEffects: updateBlock(
          globalEffects,
        ),
      });
    },

    selectEffectBlock: (blockId) => {
      set((state) => ({
        view: {
          ...state.view,
          selectedEffectBlockId: blockId,
          editingKeyframeId: blockId ? null : state.view.editingKeyframeId,
          selectedPostEffectBlockId: blockId ? null : state.view.selectedPostEffectBlockId,
        },
      }));
    },

    toggleEffectTrackExpanded: (blockId) => {
      set((state) => {
        const expanded = new Set(state.view.expandedEffectTrackIds);
        if (expanded.has(blockId)) {
          expanded.delete(blockId);
        } else {
          expanded.add(blockId);
        }
        return { view: { ...state.view, expandedEffectTrackIds: expanded } };
      });
    },

    setEditingEffectKeyframe: (keyframeId) => {
      set((state) => ({
        view: { ...state.view, editingEffectKeyframeId: keyframeId },
      }));
    },

    toggleGlobalEffectsExpanded: () => {
      set((state) => ({
        view: { ...state.view, globalEffectsExpanded: !state.view.globalEffectsExpanded },
      }));
    },

    moveEffectTrack: (blockId, targetOwnerId, targetIndex) => {
      set((state) => {
        let movedTrack: EffectTrack | null = null;
        let newLayers = state.layers;
        let newLayerGroups = state.layerGroups;
        let newGlobalEffects = state.globalEffects;

        // Remove from source — search layers, groups, global
        for (const layer of state.layers) {
          const idx = (layer.effectTracks ?? []).findIndex((t) => t.effectBlock.id === blockId);
          if (idx !== -1) {
            movedTrack = (layer.effectTracks ?? [])[idx];
            newLayers = updateLayer(state.layers, layer.id, (l) => ({
              ...l,
              effectTracks: l.effectTracks.filter((t) => t.effectBlock.id !== blockId),
            }));
            break;
          }
        }
        if (!movedTrack) {
          for (const group of state.layerGroups) {
            const idx = (group.effectTracks ?? []).findIndex((t) => t.effectBlock.id === blockId);
            if (idx !== -1) {
              movedTrack = (group.effectTracks ?? [])[idx];
              newLayerGroups = state.layerGroups.map((g) =>
                g.id === group.id ? { ...g, effectTracks: g.effectTracks.filter((t) => t.effectBlock.id !== blockId) } : g,
              );
              break;
            }
          }
        }
        if (!movedTrack) {
          const idx = state.globalEffects.findIndex((t) => t.effectBlock.id === blockId);
          if (idx !== -1) {
            movedTrack = state.globalEffects[idx];
            newGlobalEffects = state.globalEffects.filter((t) => t.effectBlock.id !== blockId);
          }
        }

        if (!movedTrack) return {};

        const updatedTrack: EffectTrack = { ...movedTrack, ownerId: targetOwnerId };

        // Insert into target
        if (targetOwnerId === null) {
          const arr = [...newGlobalEffects];
          arr.splice(targetIndex ?? arr.length, 0, updatedTrack);
          newGlobalEffects = arr;
        } else {
          const targetLayerIdx = newLayers.findIndex((l) => l.id === targetOwnerId);
          if (targetLayerIdx !== -1) {
            newLayers = newLayers.map((l, i) => {
              if (i !== targetLayerIdx) return l;
              const newTracks = [...l.effectTracks];
              newTracks.splice(targetIndex ?? newTracks.length, 0, updatedTrack);
              return { ...l, effectTracks: newTracks };
            });
          } else {
            newLayerGroups = newLayerGroups.map((g) => {
              if (g.id !== targetOwnerId) return g;
              const newTracks = [...(g.effectTracks ?? [])];
              newTracks.splice(targetIndex ?? newTracks.length, 0, updatedTrack);
              return { ...g, effectTracks: newTracks };
            });
          }
        }

        return { layers: newLayers, layerGroups: newLayerGroups, globalEffects: newGlobalEffects };
      });
    },

    bakeEffect: (blockId) => {
      const { layers, layerGroups, globalEffects } = get();

      // Find the effect track and its owner
      let effectTrack: EffectTrack | null = null;
      let ownerId: LayerId | LayerGroupId | null = null;
      let ownerType: 'layer' | 'group' | 'global' = 'layer';

      for (const layer of layers) {
        const et = (layer.effectTracks ?? []).find((t) => t.effectBlock.id === blockId);
        if (et) { effectTrack = et; ownerId = layer.id; ownerType = 'layer'; break; }
      }
      if (!effectTrack) {
        for (const group of layerGroups) {
          const et = (group.effectTracks ?? []).find((t) => t.effectBlock.id === blockId);
          if (et) { effectTrack = et; ownerId = group.id; ownerType = 'group'; break; }
        }
      }
      if (!effectTrack) {
        const et = globalEffects.find((t) => t.effectBlock.id === blockId);
        if (et) { effectTrack = et; ownerId = null; ownerType = 'global'; }
      }

      if (!effectTrack) return;

      const block = effectTrack.effectBlock;

      // Determine which layers to bake into
      let targetLayerIds: LayerId[] = [];
      if (ownerType === 'layer') {
        targetLayerIds = [ownerId as LayerId];
      } else if (ownerType === 'group') {
        const group = layerGroups.find((g) => g.id === ownerId);
        if (group) targetLayerIds = [...group.childLayerIds];
      } else {
        // Global — all layers
        targetLayerIds = layers.map((l) => l.id);
      }

      // Flush canvas store to the active layer's content frame before baking
      // to ensure we process the latest drawing state
      const flushActiveLayerId = get().view.activeLayerId;
      const flushCurrentFrame = get().view.currentFrame;
      if (flushActiveLayerId && targetLayerIds.includes(flushActiveLayerId)) {
        const activeLayer = layers.find((l) => l.id === flushActiveLayerId);
        if (activeLayer) {
          const activeCf = activeLayer.contentFrames.find(
            (c) => flushCurrentFrame >= c.startFrame && flushCurrentFrame < c.startFrame + c.durationFrames,
          );
          if (activeCf) {
            activeCf.data = new Map(useCanvasStore.getState().cells);
          }
        }
      }

      // Bake into each target layer's content frames
      const newLayers = layers.map((layer) => {
        if (!targetLayerIds.includes(layer.id)) return layer;

        // Clone content frames deeply before baking
        const clonedFrames = layer.contentFrames.map((cf) => ({
          ...cf,
          data: new Map(cf.data),
        }));

        const bakedFrames = bakeEffectIntoFrames(block, clonedFrames, {
          canvasBackgroundColor: '#000000',
          frame: block.startFrame,
          canvasWidth: useCanvasStore.getState().width,
          canvasHeight: useCanvasStore.getState().height,
        });

        return { ...layer, contentFrames: bakedFrames };
      });

      // Remove the effect track
      let newLayersAfterRemove = newLayers;
      let newLayerGroups = layerGroups;
      let newGlobalEffects = globalEffects;

      if (ownerType === 'layer') {
        newLayersAfterRemove = newLayers.map((l) =>
          l.id === ownerId ? { ...l, effectTracks: l.effectTracks.filter((t) => t.effectBlock.id !== blockId) } : l,
        );
      } else if (ownerType === 'group') {
        newLayerGroups = layerGroups.map((g) =>
          g.id === ownerId ? { ...g, effectTracks: g.effectTracks.filter((t) => t.effectBlock.id !== blockId) } : g,
        );
      } else {
        newGlobalEffects = globalEffects.filter((t) => t.effectBlock.id !== blockId);
      }

      set({
        layers: newLayersAfterRemove,
        layerGroups: newLayerGroups,
        globalEffects: newGlobalEffects,
        view: { ...get().view, selectedEffectBlockId: null },
      });

      // Sync canvas store with the baked data for the active layer
      const activeLayerId = get().view.activeLayerId;
      const currentFrame = get().view.currentFrame;
      if (activeLayerId && targetLayerIds.includes(activeLayerId)) {
        const updatedLayer = get().layers.find((l) => l.id === activeLayerId);
        if (updatedLayer) {
          const cf = updatedLayer.contentFrames.find(
            (c) => currentFrame >= c.startFrame && currentFrame < c.startFrame + c.durationFrames,
          );
          if (cf) {
            useCanvasStore.getState().setCanvasData(cf.data);
          }
        }
      }
    },

    // ============================================
    // POST EFFECT ACTIONS
    // ============================================

    addPostEffectBlock: (postEffectType, startFrame, durationFrames) => {
      const entry = getPostEffect(postEffectType);
      if (!entry) {
        console.warn(`[Timeline] Unknown post effect type: ${postEffectType}`);
        return null;
      }

      const blockId = generatePostEffectBlockId();
      const trackId = generatePostEffectTrackId();

      const block: PostEffectBlock = {
        id: blockId,
        postEffectType,
        startFrame,
        durationFrames,
        enabled: true,
        settings: { ...entry.defaultSettings },
        propertyTracks: [],
      };

      const track: PostEffectTrack = {
        id: trackId,
        effectBlock: block,
        collapsed: true,
      };

      set((state) => ({
        postEffectTracks: [...state.postEffectTracks, track],
      }));

      return blockId;
    },

    removePostEffectBlock: (blockId) => {
      set((state) => ({
        postEffectTracks: state.postEffectTracks.filter(
          (t) => t.effectBlock.id !== blockId,
        ),
        view: {
          ...state.view,
          selectedPostEffectBlockId:
            state.view.selectedPostEffectBlockId === blockId
              ? null
              : state.view.selectedPostEffectBlockId,
        },
      }));
    },

    updatePostEffectBlockTiming: (blockId, startFrame, durationFrames) => {
      set((state) => ({
        postEffectTracks: state.postEffectTracks.map((t) =>
          t.effectBlock.id === blockId
            ? {
                ...t,
                effectBlock: {
                  ...t.effectBlock,
                  startFrame: Math.max(0, startFrame),
                  durationFrames: Math.max(1, durationFrames),
                },
              }
            : t,
        ),
      }));
    },

    updatePostEffectBlockSettings: (blockId, settings) => {
      set((state) => ({
        postEffectTracks: state.postEffectTracks.map((t) =>
          t.effectBlock.id === blockId
            ? {
                ...t,
                effectBlock: {
                  ...t.effectBlock,
                  settings: { ...t.effectBlock.settings, ...settings },
                },
              }
            : t,
        ),
      }));
    },

    reorderPostEffectTracks: (fromIndex, toIndex) => {
      set((state) => {
        const tracks = [...state.postEffectTracks];
        if (fromIndex < 0 || fromIndex >= tracks.length) return state;
        if (toIndex < 0 || toIndex >= tracks.length) return state;
        const [removed] = tracks.splice(fromIndex, 1);
        tracks.splice(toIndex, 0, removed);
        return { postEffectTracks: tracks };
      });
    },

    togglePostEffectBlockEnabled: (blockId) => {
      set((state) => ({
        postEffectTracks: state.postEffectTracks.map((t) =>
          t.effectBlock.id === blockId
            ? {
                ...t,
                effectBlock: {
                  ...t.effectBlock,
                  enabled: !t.effectBlock.enabled,
                },
              }
            : t,
        ),
      }));
    },

    addPostEffectPropertyTrack: (blockId, propertyPath) => {
      const state = get();
      const track = state.postEffectTracks.find((t) => t.effectBlock.id === blockId);
      if (!track) return null;

      // Check if property track already exists
      const existing = track.effectBlock.propertyTracks.find(
        (pt) => pt.propertyPath === propertyPath,
      );
      if (existing) return existing.id;

      const ptId = generatePostEffectPropertyTrackId();

      set((s) => ({
        postEffectTracks: s.postEffectTracks.map((t) =>
          t.effectBlock.id === blockId
            ? {
                ...t,
                effectBlock: {
                  ...t.effectBlock,
                  propertyTracks: [
                    ...t.effectBlock.propertyTracks,
                    {
                      id: ptId,
                      propertyPath,
                      keyframes: [],
                      loopKeyframes: false,
                    },
                  ],
                },
              }
            : t,
        ),
      }));

      return ptId;
    },

    addPostEffectKeyframe: (blockId, trackId, frame, value) => {
      const kfId = generateKeyframeId();

      set((state) => ({
        postEffectTracks: state.postEffectTracks.map((t) =>
          t.effectBlock.id === blockId
            ? {
                ...t,
                effectBlock: {
                  ...t.effectBlock,
                  propertyTracks: t.effectBlock.propertyTracks.map((pt) =>
                    pt.id === trackId
                      ? {
                          ...pt,
                          keyframes: [
                            ...pt.keyframes.filter((kf) => kf.frame !== frame),
                            { id: kfId, frame, value, easing: defaultEasing() },
                          ].sort((a, b) => a.frame - b.frame),
                        }
                      : pt,
                  ),
                },
              }
            : t,
        ),
      }));

      return kfId;
    },

    removePostEffectKeyframe: (blockId, trackId, keyframeId) => {
      set((state) => ({
        postEffectTracks: state.postEffectTracks.map((t) =>
          t.effectBlock.id === blockId
            ? {
                ...t,
                effectBlock: {
                  ...t.effectBlock,
                  propertyTracks: t.effectBlock.propertyTracks.map((pt) =>
                    pt.id === trackId
                      ? {
                          ...pt,
                          keyframes: pt.keyframes.filter((kf) => kf.id !== keyframeId),
                        }
                      : pt,
                  ),
                },
              }
            : t,
        ),
      }));
    },

    updatePostEffectKeyframe: (blockId, trackId, keyframeId, updates) => {
      set((state) => ({
        postEffectTracks: state.postEffectTracks.map((t) =>
          t.effectBlock.id === blockId
            ? {
                ...t,
                effectBlock: {
                  ...t.effectBlock,
                  propertyTracks: t.effectBlock.propertyTracks.map((pt) =>
                    pt.id === trackId
                      ? {
                          ...pt,
                          keyframes: pt.keyframes
                            .map((kf) =>
                              kf.id === keyframeId ? { ...kf, ...updates } : kf,
                            )
                            .sort((a, b) => a.frame - b.frame),
                        }
                      : pt,
                  ),
                },
              }
            : t,
        ),
      }));
    },

    selectPostEffectBlock: (blockId) => {
      set((state) => ({
        view: {
          ...state.view,
          selectedPostEffectBlockId: blockId,
          editingPostEffectKeyframeId: null,
          // Deselect standard effect block when selecting post effect
          selectedEffectBlockId: blockId ? null : state.view.selectedEffectBlockId,
        },
      }));
    },

    togglePostEffectTrackExpanded: (blockId) => {
      set((state) => {
        const expanded = new Set(state.view.expandedPostEffectTrackIds);
        if (expanded.has(blockId)) {
          expanded.delete(blockId);
        } else {
          expanded.add(blockId);
        }
        return {
          view: { ...state.view, expandedPostEffectTrackIds: expanded },
        };
      });
    },

    setEditingPostEffectKeyframe: (keyframeId) => {
      set((state) => ({
        view: { ...state.view, editingPostEffectKeyframeId: keyframeId },
      }));
    },

    togglePostEffectsExpanded: () => {
      set((state) => ({
        view: { ...state.view, postEffectsExpanded: !state.view.postEffectsExpanded },
      }));
    },

    // ============================================
    // PROJECT LIFECYCLE
    // ============================================

    createNewProject: () => {
      const defaultLayer = createDefaultLayer();
      set({
        config: { ...INITIAL_CONFIG },
        layers: [defaultLayer],
        layerGroups: [],
        globalEffects: [],
        postEffectTracks: [],
        view: {
          ...INITIAL_VIEW,
          activeLayerId: defaultLayer.id,
        },
      });
    },

    loadFromSessionData: (layers, config, viewState, layerGroups, globalEffects, postEffectTracks) => {
      const mergedConfig: TimelineConfig = {
        frameRate: config.frameRate ?? INITIAL_CONFIG.frameRate,
        durationFrames: config.durationFrames ?? INITIAL_CONFIG.durationFrames,
        durationMs: 0, // Computed below
      };
      mergedConfig.durationMs = (mergedConfig.durationFrames / mergedConfig.frameRate) * 1000;

      const activeLayerId = layers.length > 0 ? layers[0].id : null;

      set({
        config: mergedConfig,
        layers,
        layerGroups: layerGroups ?? [],
        globalEffects: globalEffects ?? [],
        postEffectTracks: postEffectTracks ?? [],
        view: {
          ...INITIAL_VIEW,
          activeLayerId,
          ...viewState,
        },
      });
    },

    getSessionData: () => {
      const { config, layers, layerGroups, globalEffects, view } = get();
      const canvasState = useCanvasStore.getState();

      return {
        version: '2.1.0' as const,
        canvas: {
          width: canvasState.width,
          height: canvasState.height,
          canvasBackgroundColor: canvasState.canvasBackgroundColor,
          showGrid: canvasState.showGrid,
        },
        timeline: {
          frameRate: config.frameRate,
          durationFrames: config.durationFrames,
          looping: view.looping,
        },
        layers: layers.map((layer) => ({
          id: layer.id as string,
          name: layer.name,
          visible: layer.visible,
          solo: layer.solo,
          locked: layer.locked,
          opacity: layer.opacity,
          parentGroupId: layer.parentGroupId as string | undefined,
          contentFrames: layer.contentFrames.map((cf) => ({
            id: cf.id as string,
            name: cf.name,
            startFrame: cf.startFrame,
            durationFrames: cf.durationFrames,
            data: Object.fromEntries(cf.data),
            hidden: cf.hidden || undefined,
            labelColor: cf.labelColor || undefined,
          })),
          propertyTracks: layer.propertyTracks.map((track) => ({
            id: track.id as string,
            propertyPath: track.propertyPath,
            loopKeyframes: track.loopKeyframes,
            keyframes: track.keyframes.map((kf) => ({
              id: kf.id as string,
              frame: kf.frame,
              value: kf.value,
              easing: kf.easing,
            })),
          })),
          staticProperties: Object.keys(layer.staticProperties).length > 0
            ? { ...layer.staticProperties }
            : undefined,
          syncKeyframesToFrames: layer.syncKeyframesToFrames || undefined,
          effectTracks: (layer.effectTracks ?? []).length > 0
            ? (layer.effectTracks ?? []).map((et) => ({
                id: et.id as string,
                ownerId: et.ownerId as string | null,
                effectBlock: {
                  id: et.effectBlock.id as string,
                  effectType: et.effectBlock.effectType,
                  startFrame: et.effectBlock.startFrame,
                  durationFrames: et.effectBlock.durationFrames,
                  enabled: et.effectBlock.enabled,
                  settings: { ...et.effectBlock.settings },
                  propertyTracks: et.effectBlock.propertyTracks.map((pt) => ({
                    id: pt.id as string,
                    propertyPath: pt.propertyPath,
                    keyframes: pt.keyframes.map((kf) => ({
                      id: kf.id as string,
                      frame: kf.frame,
                      value: kf.value,
                      easing: kf.easing,
                    })),
                    loopKeyframes: pt.loopKeyframes,
                  })),
                },
                collapsed: et.collapsed,
              }))
            : undefined,
        })),
        layerGroups: layerGroups.length > 0
          ? layerGroups.map((group) => ({
              id: group.id as string,
              name: group.name,
              childLayerIds: group.childLayerIds.map((id) => id as string),
              visible: group.visible,
              solo: group.solo,
              locked: group.locked,
              collapsed: group.collapsed,
              propertyTracks: group.propertyTracks.map((track) => ({
                id: track.id as string,
                propertyPath: track.propertyPath,
                loopKeyframes: track.loopKeyframes,
                keyframes: track.keyframes.map((kf) => ({
                  id: kf.id as string,
                  frame: kf.frame,
                  value: kf.value,
                  easing: kf.easing,
                })),
              })),
              staticProperties: Object.keys(group.staticProperties).length > 0
                ? { ...group.staticProperties }
                : undefined,
              effectTracks: (group.effectTracks ?? []).length > 0
                ? (group.effectTracks ?? []).map((et) => ({
                    id: et.id as string,
                    ownerId: et.ownerId as string | null,
                    effectBlock: {
                      id: et.effectBlock.id as string,
                      effectType: et.effectBlock.effectType,
                      startFrame: et.effectBlock.startFrame,
                      durationFrames: et.effectBlock.durationFrames,
                      enabled: et.effectBlock.enabled,
                      settings: { ...et.effectBlock.settings },
                      propertyTracks: et.effectBlock.propertyTracks.map((pt) => ({
                        id: pt.id as string,
                        propertyPath: pt.propertyPath,
                        keyframes: pt.keyframes.map((kf) => ({
                          id: kf.id as string,
                          frame: kf.frame,
                          value: kf.value,
                          easing: kf.easing,
                        })),
                        loopKeyframes: pt.loopKeyframes,
                      })),
                    },
                    collapsed: et.collapsed,
                  }))
                : undefined,
            }))
          : undefined,

        // Global effects
        globalEffects: globalEffects.length > 0
          ? globalEffects.map((et) => ({
              id: et.id as string,
              ownerId: et.ownerId as string | null,
              effectBlock: {
                id: et.effectBlock.id as string,
                effectType: et.effectBlock.effectType,
                startFrame: et.effectBlock.startFrame,
                durationFrames: et.effectBlock.durationFrames,
                enabled: et.effectBlock.enabled,
                settings: { ...et.effectBlock.settings },
                propertyTracks: et.effectBlock.propertyTracks.map((pt) => ({
                  id: pt.id as string,
                  propertyPath: pt.propertyPath,
                  keyframes: pt.keyframes.map((kf) => ({
                    id: kf.id as string,
                    frame: kf.frame,
                    value: kf.value,
                    easing: kf.easing,
                  })),
                  loopKeyframes: pt.loopKeyframes,
                })),
              },
              collapsed: et.collapsed,
            }))
          : undefined,

        // Post effects (WebGL shader-based)
        postEffectTracks: get().postEffectTracks.length > 0
          ? get().postEffectTracks.map((t) => ({
              id: t.id as string,
              effectBlock: {
                id: t.effectBlock.id as string,
                postEffectType: t.effectBlock.postEffectType,
                startFrame: t.effectBlock.startFrame,
                durationFrames: t.effectBlock.durationFrames,
                enabled: t.effectBlock.enabled,
                settings: { ...t.effectBlock.settings },
                propertyTracks: t.effectBlock.propertyTracks.map((pt) => ({
                  id: pt.id as string,
                  propertyPath: pt.propertyPath,
                  keyframes: pt.keyframes.map((kf) => ({
                    id: kf.id as string,
                    frame: kf.frame,
                    value: kf.value,
                    easing: kf.easing,
                  })),
                  loopKeyframes: pt.loopKeyframes,
                })),
              },
              collapsed: t.collapsed,
            }))
          : undefined,
      };
    },
  })),
);
