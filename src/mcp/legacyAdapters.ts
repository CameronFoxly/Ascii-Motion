/**
 * Legacy (pre-v3) MCP server messages → canonical bridge operations.
 *
 * Older servers mutate their own copy and then notify the browser, or send
 * frame-index based commands. These adapters translate them into the same
 * validated operations the v3 protocol uses, so a legacy message either really
 * changes the editor or fails loudly, instead of being logged as success.
 */
import type { Cell } from '../types';
import { useTimelineStore } from '../stores/timelineStore';
import { getContentFrameAtTime } from '../utils/layerCompositing';
import { runOperation, type OperationOutcome } from './operations/runtime';

export interface CanonicalCall {
  op: string;
  input: Record<string, unknown>;
}

const DEFAULT_LEGACY_FG = '#FFFFFF';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function activeLayer() {
  const tl = useTimelineStore.getState();
  return tl.layers.find((l) => l.id === tl.view.activeLayerId) ?? tl.layers[0] ?? null;
}

function msToFrames(ms: unknown): number {
  const fps = useTimelineStore.getState().config.frameRate;
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return 1;
  return Math.max(1, Math.round(ms / (1000 / fps)));
}

/** Legacy frame index = ordinal content frame of the active layer. */
export function contentFrameIdAtOrdinal(index: unknown): string {
  const layer = activeLayer();
  if (!layer) throw new Error('No active layer');
  if (typeof index !== 'number' || !Number.isInteger(index)) throw new Error('Frame index must be an integer');
  const cf = layer.contentFrames[index];
  if (!cf) throw new Error(`Frame index ${index} is out of range (0..${layer.contentFrames.length - 1})`);
  return cf.id;
}

function cellAt(x: number, y: number, cell: Partial<Cell> | undefined): Record<string, unknown> {
  if (!cell) return { x, y, clear: true };
  const isLegacyEmpty = cell.char === ' ' && (cell.color ?? DEFAULT_LEGACY_FG) === DEFAULT_LEGACY_FG && (cell.bgColor ?? 'transparent') === 'transparent';
  if (isLegacyEmpty) return { x, y, clear: true };
  const out: Record<string, unknown> = { x, y, char: cell.char ?? ' ' };
  if (cell.color !== undefined) out.color = cell.color;
  if (cell.bgColor !== undefined) out.bgColor = cell.bgColor;
  return out;
}

function keyedCells(cells: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(cells)) {
    return cells.map((entry) => {
      if (!isRecord(entry)) throw new Error('Invalid cell entry');
      if (typeof entry.key === 'string') {
        const [x, y] = entry.key.split(',').map(Number);
        return cellAt(x, y, entry.cell as Cell);
      }
      return cellAt(entry.x as number, entry.y as number, entry.cell as Cell);
    });
  }
  if (isRecord(cells)) {
    return Object.entries(cells).map(([key, cell]) => {
      const [x, y] = key.split(',').map(Number);
      return cellAt(x, y, cell as Cell);
    });
  }
  return [];
}

function replaceFrameCalls(target: Record<string, unknown>, cells: Array<Record<string, unknown>>): CanonicalCall {
  const writes = cells.filter((c) => !c.clear);
  const operations: CanonicalCall[] = [{ op: 'clear_cells', input: { target } }];
  if (writes.length) operations.push({ op: 'set_cells', input: { target, cells: writes } });
  return { op: 'apply_operations', input: { operations } };
}

/**
 * Insert a content frame at a legacy ordinal on the active layer, shifting
 * later frames and growing the timeline like the flat-frame model did.
 */
export function insertFrameCall(atIndex: unknown, durationFrames: number, cells: Array<Record<string, unknown>>, name?: string): CanonicalCall {
  const tl = useTimelineStore.getState();
  const layer = activeLayer();
  if (!layer) throw new Error('No active layer');
  const frames = [...layer.contentFrames].sort((a, b) => a.startFrame - b.startFrame);
  const index = typeof atIndex === 'number' && Number.isInteger(atIndex) ? Math.max(0, Math.min(atIndex, frames.length)) : frames.length;
  const layerEnd = frames.reduce((end, f) => Math.max(end, f.startFrame + f.durationFrames), 0);
  const start = index < frames.length ? frames[index].startFrame : layerEnd;
  const operations: CanonicalCall[] = [];
  const neededEnd = layerEnd + durationFrames;
  if (neededEnd > tl.config.durationFrames) operations.push({ op: 'set_timeline', input: { durationFrames: neededEnd } });
  for (let i = frames.length - 1; i >= index; i -= 1) {
    operations.push({ op: 'update_content_frame', input: { layerId: layer.id, contentFrameId: frames[i].id, startFrame: frames[i].startFrame + durationFrames } });
  }
  const writes = cells.filter((c) => !c.clear);
  operations.push({
    op: 'add_content_frame',
    input: { layerId: layer.id, startFrame: start, durationFrames, ...(name ? { name } : {}), ...(writes.length ? { cells: writes } : {}) },
  });
  return { op: 'apply_operations', input: { operations } };
}

export function deleteFrameCall(index: unknown): CanonicalCall {
  const layer = activeLayer();
  if (!layer) throw new Error('No active layer');
  const contentFrameId = contentFrameIdAtOrdinal(index);
  const frames = [...layer.contentFrames].sort((a, b) => a.startFrame - b.startFrame);
  const removed = frames.find((f) => f.id === contentFrameId)!;
  const operations: CanonicalCall[] = [{ op: 'remove_content_frame', input: { layerId: layer.id, contentFrameId } }];
  for (const f of frames) {
    if (f.startFrame > removed.startFrame) {
      operations.push({ op: 'update_content_frame', input: { layerId: layer.id, contentFrameId: f.id, startFrame: f.startFrame - removed.durationFrames } });
    }
  }
  return { op: 'apply_operations', input: { operations } };
}

function shaderCall(type: string, cmd: Record<string, unknown>): CanonicalCall | null {
  switch (type) {
    case 'add_post_effect':
      return { op: 'add_shader', input: pick({ shaderType: cmd.postEffectType, startFrame: cmd.startFrame, durationFrames: cmd.durationFrames, settings: cmd.settings, enabled: cmd.enabled }) };
    case 'remove_post_effect':
      return { op: 'remove_shader', input: { blockId: cmd.blockId } };
    case 'update_post_effect':
      return { op: 'update_shader', input: pick({ blockId: cmd.blockId, settings: cmd.settings, startFrame: cmd.startFrame, durationFrames: cmd.durationFrames, enabled: cmd.enabled }) };
    case 'set_post_effect_keyframe':
      return { op: 'set_shader_keyframes', input: { blockId: cmd.blockId, propertyPath: cmd.propertyPath, keyframes: [{ frame: cmd.frame, value: cmd.value }] } };
    case 'remove_post_effect_keyframe':
      return { op: 'remove_shader_keyframes', input: { blockId: cmd.blockId, propertyPath: cmd.propertyPath, frames: [cmd.frame] } };
    default:
      return null;
  }
}

function pick(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
}

/** Legacy `command`/`command_request` types that now run as canonical operations. */
export function legacyCommandCall(cmd: Record<string, unknown>): CanonicalCall | null {
  const type = cmd.type as string;
  switch (type) {
    case 'set_cell':
      return { op: 'set_cells', input: { cells: [cellAt(cmd.x as number, cmd.y as number, cmd.cell as Cell)] } };
    case 'clear_cell':
      return { op: 'set_cells', input: { cells: [{ x: cmd.x, y: cmd.y, clear: true }] } };
    case 'set_cells_batch': {
      const target = cmd.frameIndex !== undefined ? { contentFrameId: contentFrameIdAtOrdinal(cmd.frameIndex) } : undefined;
      return { op: 'set_cells', input: pick({ target, cells: keyedCells(cmd.cells) }) };
    }
    case 'resize_canvas':
      return { op: 'resize_canvas', input: pick({ width: cmd.width, height: cmd.height, anchor: cmd.anchor }) };
    case 'set_canvas_data':
      return replaceFrameCalls({}, keyedCells(cmd.cells));
    case 'set_frame_data':
      return replaceFrameCalls({ contentFrameId: contentFrameIdAtOrdinal(cmd.index) }, keyedCells(cmd.cells));
    case 'add_frame':
      return insertFrameCall(cmd.atIndex, msToFrames(cmd.duration), keyedCells(cmd.cells));
    case 'delete_frame':
      return deleteFrameCall(cmd.index);
    case 'undo':
    case 'redo':
      return { op: type, input: {} };
    case 'new_project':
      return { op: 'new_project', input: pick({ width: cmd.width, height: cmd.height, backgroundColor: cmd.backgroundColor, name: cmd.name }) };
    case 'load_project':
      return { op: 'load_project', input: { session: cmd.sessionData } };
    case 'set_foreground_color':
      return { op: 'set_tool_state', input: { foregroundColor: cmd.color } };
    case 'set_background_color':
      return { op: 'set_tool_state', input: { backgroundColor: cmd.color } };
    case 'select_rectangle':
      return { op: 'set_selection', input: { mode: 'rectangle', region: { x: cmd.x, y: cmd.y, width: cmd.width, height: cmd.height } } };
    case 'clear_selection':
      return { op: 'clear_selection', input: {} };
    default:
      return shaderCall(type, cmd);
  }
}

/**
 * Translates legacy `notifications/stateChanged` events. IDs created by the
 * server are mapped to the browser's IDs so later notifications still resolve.
 */
export class LegacyNotificationAdapter {
  private ids = new Map<string, string>();
  private keyframes = new Map<string, { kind: 'layer' | 'effect'; ownerId: string; propertyPath: string; frame: number }>();

  reset(): void {
    this.ids.clear();
    this.keyframes.clear();
  }

  private id(serverId: unknown): string {
    const key = String(serverId);
    return this.ids.get(key) ?? key;
  }

  private remember(serverId: unknown, browserId: unknown): void {
    if (typeof serverId === 'string' && typeof browserId === 'string') this.ids.set(serverId, browserId);
  }

  private owner(ownerId: unknown): Record<string, unknown> {
    if (ownerId === null || ownerId === undefined) return { global: true };
    const id = this.id(ownerId);
    return useTimelineStore.getState().layerGroups.some((g) => g.id === id) ? { groupId: id } : { layerId: id };
  }

  /** Returns the call, or a reason the event cannot be reproduced in the browser. */
  toCall(type: string, raw: unknown): CanonicalCall | { unsupported: string } | null {
    const d = isRecord(raw) ? raw : {};
    switch (type) {
      case 'new_project':
      case 'set_cell':
      case 'clear_cell':
      case 'resize_canvas':
      case 'undo':
      case 'redo':
      case 'select_rectangle':
      case 'clear_selection':
      case 'set_foreground_color':
      case 'set_background_color':
        return legacyCommandCall({ ...d, type });
      case 'set_cells_batch':
        return { op: 'set_cells', input: { cells: keyedCells(d.cells) } };
      case 'clear_canvas':
        return { op: 'clear_cells', input: {} };
      case 'set_selected_character':
        return { op: 'set_tool_state', input: { character: d.character } };
      case 'set_project_name':
        return { op: 'set_project_metadata', input: { name: d.name } };
      case 'add_frame': {
        const frame = isRecord(d.frame) ? d.frame : {};
        return insertFrameCall(frame.index, msToFrames(frame.duration), keyedCells(frame.data));
      }
      case 'duplicate_frame':
      case 'copy_frame_and_modify': {
        const frame = isRecord(d.newFrame) ? d.newFrame : {};
        return insertFrameCall(frame.index, msToFrames(frame.duration), keyedCells(frame.data), frame.name as string | undefined);
      }
      case 'delete_frame':
        return deleteFrameCall(d.index);
      case 'set_frame_data':
        return replaceFrameCalls({ contentFrameId: contentFrameIdAtOrdinal(d.frameIndex) }, keyedCells(d.data));
      case 'set_frame_name': {
        const layer = activeLayer();
        if (!layer || typeof d.name !== 'string') return { unsupported: 'set_frame_name without a name' };
        return { op: 'update_content_frame', input: { layerId: layer.id, contentFrameId: contentFrameIdAtOrdinal(d.index ?? d.frameIndex), name: d.name } };
      }
      case 'go_to_frame': {
        const layer = activeLayer();
        const cf = layer?.contentFrames[d.index as number];
        if (!cf) return { unsupported: `go_to_frame index ${String(d.index)} out of range` };
        return { op: 'seek', input: { frame: cf.startFrame } };
      }
      case 'set_frame_duration': {
        const layer = activeLayer();
        if (!layer) return { unsupported: 'no active layer' };
        return { op: 'update_content_frame', input: { layerId: layer.id, contentFrameId: contentFrameIdAtOrdinal(d.index), durationFrames: msToFrames(d.duration) } };
      }
      case 'set_frame_rate':
        return { op: 'set_timeline', input: { frameRate: Math.max(1, Math.min(60, Math.round(Number(d.fps)))) } };
      case 'set_timeline_duration':
        return { op: 'set_timeline', input: { durationFrames: d.durationFrames } };
      case 'add_layer': {
        const layer = isRecord(d.layer) ? d.layer : {};
        return { op: 'add_layer', input: pick({ name: layer.name }) };
      }
      case 'remove_layer':
        return { op: 'remove_layer', input: { layerId: this.id(d.layerId) } };
      case 'duplicate_layer':
        return { op: 'duplicate_layer', input: { layerId: this.id(d.sourceLayerId) } };
      case 'set_active_layer':
        return { op: 'set_active_layer', input: { layerId: this.id(d.layerId) } };
      case 'rename_layer':
        return { op: 'update_layer', input: { layerId: this.id(d.layerId), name: d.name } };
      case 'set_layer_visibility':
        return { op: 'update_layer', input: pick({ layerId: this.id(d.layerId), visible: d.visible, solo: d.solo, locked: d.locked, opacity: d.opacity }) };
      case 'reorder_layers': {
        const layers = useTimelineStore.getState().layers;
        const layer = layers[d.fromIndex as number];
        if (!layer) return { unsupported: `reorder_layers fromIndex ${String(d.fromIndex)} out of range` };
        return { op: 'reorder_layer', input: { layerId: layer.id, toIndex: d.toIndex } };
      }
      case 'add_content_frame': {
        const cf = isRecord(d.contentFrame) ? d.contentFrame : {};
        return { op: 'add_content_frame', input: pick({ layerId: this.id(d.layerId), startFrame: cf.startFrame, durationFrames: cf.durationFrames, name: cf.name }) };
      }
      case 'remove_content_frame':
        return { op: 'remove_content_frame', input: { layerId: this.id(d.layerId), contentFrameId: this.id(d.contentFrameId) } };
      case 'add_keyframe': {
        const kf = isRecord(d.keyframe) ? d.keyframe : {};
        return { op: 'set_keyframes', input: { layerId: this.id(d.layerId), propertyPath: d.propertyPath, keyframes: [pick({ frame: kf.frame, value: kf.value, easing: kf.easing })] } };
      }
      case 'remove_keyframe': {
        const known = this.keyframes.get(String(d.keyframeId));
        if (known?.kind === 'layer') return { op: 'remove_keyframes', input: { layerId: known.ownerId, propertyPath: known.propertyPath, frames: [known.frame] } };
        return { unsupported: 'remove_keyframe for a keyframe the browser did not see created (no property path)' };
      }
      case 'add_effect_block':
        return { op: 'add_effect', input: pick({ owner: this.owner(d.ownerId), effectType: d.effectType, startFrame: d.startFrame, durationFrames: d.durationFrames, settings: d.settings }) };
      case 'remove_effect_block':
        return { op: 'remove_effect', input: { blockId: this.id(d.blockId) } };
      case 'update_effect_block': {
        const input = pick({ blockId: this.id(d.blockId), settings: d.settings, enabled: d.enabled, startFrame: d.startFrame, durationFrames: d.durationFrames });
        if (Object.keys(input).length < 2) return { unsupported: 'update_effect_block carried no changed fields (legacy server sends only blockId)' };
        return { op: 'update_effect', input };
      }
      case 'add_effect_keyframe':
        return { op: 'set_effect_keyframes', input: { blockId: this.id(d.blockId), propertyPath: d.propertyPath, keyframes: [{ frame: d.frame, value: d.value }] } };
      case 'remove_effect_keyframe': {
        const known = this.keyframes.get(String(d.keyframeId));
        if (known?.kind === 'effect') return { op: 'remove_effect_keyframes', input: { blockId: known.ownerId, propertyPath: known.propertyPath, frames: [known.frame] } };
        return { op: 'remove_effect_keyframes', input: { blockId: this.id(d.blockId), propertyPath: String(d.propertyPath ?? ''), keyframeIds: [String(d.keyframeId)] } };
      }
      case 'create_group': {
        const group = isRecord(d.group) ? d.group : {};
        const layerIds = Array.isArray(group.childLayerIds) ? group.childLayerIds.map((id) => this.id(id)) : [];
        return { op: 'create_group', input: pick({ name: group.name, layerIds }) };
      }
      case 'ungroup_layers':
        return { op: 'ungroup', input: { groupId: this.id(d.groupId) } };
      case 'fill_region':
      case 'shift_frame_content':
      case 'flip_region':
      case 'interpolate_frames':
      case 'apply_effect':
      case 'batch_recolor':
      case 'batch_replace_char':
      case 'run_generator':
        return { unsupported: `${type} notifications from this MCP server do not include the resulting cells; upgrade ascii-motion-mcp to a v3 bridge version` };
      default:
        return null;
    }
  }

  /** Record server→browser ID mappings from a successful call. */
  learn(type: string, raw: unknown, outcome: OperationOutcome): void {
    if (!outcome.ok) return;
    const d = isRecord(raw) ? raw : {};
    const r = isRecord(outcome.result) ? outcome.result : {};
    switch (type) {
      case 'add_layer':
        if (isRecord(d.layer)) this.remember(d.layer.id, r.layerId);
        break;
      case 'duplicate_layer':
        if (isRecord(d.newLayer)) this.remember(d.newLayer.id, r.layerId);
        break;
      case 'add_content_frame':
        if (isRecord(d.contentFrame)) this.remember(d.contentFrame.id, r.contentFrameId);
        break;
      case 'add_effect_block':
        this.remember(d.blockId, r.blockId);
        break;
      case 'create_group':
        if (isRecord(d.group)) this.remember(d.group.id, r.groupId);
        break;
      case 'add_keyframe': {
        const kf = isRecord(d.keyframe) ? d.keyframe : {};
        if (typeof kf.id === 'string') this.keyframes.set(kf.id, { kind: 'layer', ownerId: this.id(d.layerId), propertyPath: String(d.propertyPath), frame: Number(kf.frame) });
        break;
      }
      case 'add_effect_keyframe':
        if (typeof d.keyframeId === 'string') this.keyframes.set(d.keyframeId, { kind: 'effect', ownerId: this.id(d.blockId), propertyPath: String(d.propertyPath), frame: Number(d.frame) });
        break;
    }
  }
}

/** Run a canonical call and surface failures as thrown errors (legacy result channel). */
export async function runLegacyCall(call: CanonicalCall): Promise<Record<string, unknown>> {
  const outcome = await runOperation(call.op, call.input);
  if (!outcome.ok) {
    const error = new Error(outcome.error?.message ?? `${call.op} failed`);
    (error as Error & { code?: string }).code = outcome.error?.code ?? 'INTERNAL';
    throw error;
  }
  return isRecord(outcome.result) ? outcome.result : {};
}

export function legacyFrameState(): { currentFrameIndex: number; frameRate: number; durationMs: number } {
  const tl = useTimelineStore.getState();
  const layer = activeLayer();
  const cf = layer ? getContentFrameAtTime(layer, tl.view.currentFrame) : null;
  const ordinal = layer && cf ? layer.contentFrames.findIndex((f) => f.id === cf.id) : -1;
  return { currentFrameIndex: ordinal >= 0 ? ordinal : tl.view.currentFrame, frameRate: tl.config.frameRate, durationMs: tl.config.durationMs };
}
