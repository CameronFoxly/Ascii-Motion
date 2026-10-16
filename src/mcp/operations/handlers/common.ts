/**
 * Shared helpers for bridge operation handlers: stable object/time targets,
 * cell parsing and content-frame writes through canonical timeline actions.
 */
import { useTimelineStore } from '../../../stores/timelineStore';
import { useCanvasStore } from '../../../stores/canvasStore';
import { useToolStore } from '../../../stores/toolStore';
import type { Cell } from '../../../types';
import type { ContentFrame, ContentFrameId, Layer, LayerGroup, LayerGroupId, LayerId } from '../../../types/timeline';
import { BridgeError, invalid, notFound } from '../errors';

export const tl = () => useTimelineStore.getState();
export const canvas = () => useCanvasStore.getState();

export const cellKey = (x: number, y: number) => `${x},${y}`;
export function parseKey(key: string): { x: number; y: number } {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

export const asLayerId = (id: string) => id as unknown as LayerId;
export const asGroupId = (id: string) => id as unknown as LayerGroupId;
export const asContentFrameId = (id: string) => id as unknown as ContentFrameId;

export interface TargetInput {
  layerId?: string;
  contentFrameId?: string;
  frame?: number;
  createIfMissing?: boolean;
}

export interface ResolvedTarget {
  layer: Layer;
  contentFrame: ContentFrame;
  frame: number;
  created: boolean;
}

export function requireLayer(layerId: string | undefined | null): Layer {
  const state = tl();
  const id = layerId ?? (state.view.activeLayerId as string | null) ?? (state.layers[0]?.id as string | undefined);
  if (!id) throw new BridgeError('NOT_FOUND', 'Document has no layers');
  const layer = state.layers.find((l) => l.id === id);
  if (!layer) throw notFound('Layer', id);
  return layer;
}

export function requireGroup(groupId: string): LayerGroup {
  const group = tl().layerGroups.find((g) => g.id === groupId);
  if (!group) throw notFound('Group', groupId);
  return group;
}

export function isLayerLocked(layer: Layer): boolean {
  if (layer.locked) return true;
  if (layer.parentGroupId) {
    const group = tl().layerGroups.find((g) => g.id === layer.parentGroupId);
    if (group?.locked) return true;
  }
  return false;
}

/** Layer that accepts cell edits: exists, unlocked, and not procedural. */
export function requireEditableLayer(layerId: string | undefined | null): Layer {
  const layer = requireLayer(layerId);
  if (layer.kind === 'generator') {
    throw invalid(`Layer ${layer.id} is a generator layer; use generator operations or bake it first`);
  }
  if (isLayerLocked(layer)) throw new BridgeError('LOCKED', `Layer ${layer.id} is locked`);
  return layer;
}

export function requireContentFrame(layer: Layer, contentFrameId: string): ContentFrame {
  const cf = layer.contentFrames.find((c) => c.id === contentFrameId);
  if (!cf) throw notFound(`Content frame on layer ${layer.id}`, contentFrameId);
  return cf;
}

export const currentFrame = () => tl().view.currentFrame;

/**
 * Resolve an explicit edit target. Defaults: active layer, playhead frame.
 * A missing content frame is created (1 frame long) only with createIfMissing.
 */
export function resolveTarget(target: TargetInput | undefined, options: { editable?: boolean } = {}): ResolvedTarget {
  const t = target ?? {};
  const layer = options.editable === false ? requireLayer(t.layerId) : requireEditableLayer(t.layerId);
  if (t.contentFrameId) {
    const contentFrame = requireContentFrame(layer, t.contentFrameId);
    return { layer, contentFrame, frame: contentFrame.startFrame, created: false };
  }
  const frame = t.frame ?? currentFrame();
  const existing = tl().getContentFrameAt(layer.id, frame);
  if (existing) return { layer, contentFrame: existing, frame, created: false };
  if (!t.createIfMissing || options.editable === false) {
    throw new BridgeError('NOT_FOUND', `Layer ${layer.id} has no content frame at frame ${frame} (pass createIfMissing to create one)`, { layerId: layer.id, frame });
  }
  const id = tl().addContentFrame(layer.id, frame, 1);
  if (!id) throw invalid(`Could not create a content frame on layer ${layer.id} at frame ${frame}`);
  const fresh = requireLayer(layer.id);
  return { layer: fresh, contentFrame: requireContentFrame(fresh, id), frame, created: true };
}

export function writeContentFrame(target: ResolvedTarget, data: Map<string, Cell>): void {
  tl().updateContentFrameData(target.layer.id, target.contentFrame.id, data);
}

export function targetResult(target: ResolvedTarget, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    layerId: target.layer.id,
    contentFrameId: target.contentFrame.id,
    ...(target.created ? { createdContentFrame: true } : {}),
    ...extra,
  };
}

export interface StyleInput { char?: string; color?: string; bgColor?: string }

/** Style defaults to the user's current tool selection (same as drawing in the UI). */
export function resolveStyle(style: StyleInput | undefined): Cell {
  const tool = useToolStore.getState();
  return {
    char: style?.char ?? tool.selectedChar,
    color: style?.color ?? tool.selectedColor,
    bgColor: style?.bgColor ?? tool.selectedBgColor,
  };
}

export function isEmptyCell(cell: Cell | undefined | null): boolean {
  return !cell || ((cell.char === ' ' || cell.char === '') && (!cell.bgColor || cell.bgColor === 'transparent'));
}

/** Store a cell, deleting it when it is empty (matches app eraser semantics). */
export function putCell(data: Map<string, Cell>, x: number, y: number, cell: Cell | null): void {
  const key = cellKey(x, y);
  if (!cell || isEmptyCell(cell)) data.delete(key);
  else data.set(key, { char: cell.char, color: cell.color, bgColor: cell.bgColor ?? 'transparent' });
}

export function inCanvas(x: number, y: number): boolean {
  const { width, height } = canvas();
  return x >= 0 && y >= 0 && x < width && y < height;
}

export function regionCells(region: { x: number; y: number; width: number; height: number }): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  for (let y = region.y; y < region.y + region.height; y += 1) {
    for (let x = region.x; x < region.x + region.width; x += 1) out.push({ x, y });
  }
  return out;
}

export type OwnerRef = { kind: 'layer'; id: string } | { kind: 'group'; id: string } | { kind: 'global'; id: null };

/** Owner resolution for effects/keyframes: layer, group, or global. */
export function resolveOwner(input: { layerId?: string; groupId?: string; global?: boolean }): OwnerRef {
  if (input.layerId) {
    requireLayer(input.layerId);
    return { kind: 'layer', id: input.layerId };
  }
  if (input.groupId) {
    requireGroup(input.groupId);
    return { kind: 'group', id: input.groupId };
  }
  if (input.global) return { kind: 'global', id: null };
  throw invalid('Specify layerId, groupId, or global: true');
}

/** Return a value after asserting it exists (store actions return null on rejection). */
export function must<T>(value: T | null | undefined | false, message: string, code: 'INVALID_INPUT' | 'LIMIT_REACHED' | 'NOT_FOUND' = 'INVALID_INPUT'): T {
  if (value === null || value === undefined || value === false) throw new BridgeError(code, message);
  return value;
}
