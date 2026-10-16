/** Content frame, timeline, playhead and playback/onion-skin operations. */
import { useAnimationStore } from '../../../stores/animationStore';
import type { Cell } from '../../../types';
import { BridgeError, invalid } from '../errors';
import type { OperationHandler } from '../runtime';
import {

  cellKey,
  must,
  putCell,
  requireContentFrame,
  requireEditableLayer,
  requireLayer,
  tl,
} from './common';

export interface CellAtInput { x: number; y: number; char?: string; color?: string; bgColor?: string; clear?: boolean }

export function cellsToMap(cells: CellAtInput[], base = new Map<string, Cell>()): Map<string, Cell> {
  const data = new Map(base);
  for (const c of cells) {
    if (c.clear) {
      data.delete(cellKey(c.x, c.y));
      continue;
    }
    const existing = data.get(cellKey(c.x, c.y));
    putCell(data, c.x, c.y, {
      char: c.char ?? existing?.char ?? ' ',
      color: c.color ?? existing?.color ?? '#FFFFFF',
      bgColor: c.bgColor ?? existing?.bgColor ?? 'transparent',
    });
  }
  return data;
}

function contentLayer(layerId: string) {
  const layer = requireLayer(layerId);
  if (layer.kind === 'generator') throw invalid(`Layer ${layer.id} is a generator layer and has no content frames`);
  return layer;
}

function frameInfo(layerId: string, contentFrameId: string) {
  const cf = requireContentFrame(requireLayer(layerId), contentFrameId);
  return { layerId, contentFrameId: cf.id, startFrame: cf.startFrame, durationFrames: cf.durationFrames };
}

export const timelineHandlers: Record<string, OperationHandler> = {
  add_content_frame: (input) => {
    const layer = requireEditableLayer(input.layerId as string);
    let data: Map<string, Cell> | undefined;
    if (input.copyFromContentFrameId) data = new Map(requireContentFrame(layer, input.copyFromContentFrameId as string).data);
    if (input.cells) data = cellsToMap(input.cells as CellAtInput[], data);
    const id = tl().addContentFrame(layer.id, input.startFrame as number, input.durationFrames as number, data);
    if (!id) {
      throw new BridgeError('CONFLICT', `Content frame ${input.startFrame}+${input.durationFrames} overlaps an existing content frame on layer ${layer.id}`);
    }
    if (typeof input.name === 'string') tl().renameContentFrame(layer.id, id, input.name);
    return frameInfo(layer.id, id);
  },
  remove_content_frame: (input) => {
    const layer = requireEditableLayer(input.layerId as string);
    const cf = requireContentFrame(layer, input.contentFrameId as string);
    tl().removeContentFrame(layer.id, cf.id);
    return { layerId: layer.id, removedContentFrameId: cf.id };
  },
  update_content_frame: (input) => {
    const layer = contentLayer(input.layerId as string);
    const cf = requireContentFrame(layer, input.contentFrameId as string);
    if (input.startFrame !== undefined || input.durationFrames !== undefined) {
      if (layer.locked) throw new BridgeError('LOCKED', `Layer ${layer.id} is locked`);
      const ok = tl().updateContentFrameTiming(
        layer.id,
        cf.id,
        (input.startFrame as number | undefined) ?? cf.startFrame,
        (input.durationFrames as number | undefined) ?? cf.durationFrames,
      );
      if (!ok) throw new BridgeError('CONFLICT', 'New timing overlaps another content frame');
    }
    if (typeof input.name === 'string') tl().renameContentFrame(layer.id, cf.id, input.name);
    if (typeof input.hidden === 'boolean') tl().toggleContentFrameHidden(layer.id, [cf.id], input.hidden);
    if (input.labelColor !== undefined) tl().setContentFrameLabel(layer.id, [cf.id], (input.labelColor as string | null) ?? undefined);
    return frameInfo(layer.id, cf.id);
  },
  duplicate_content_frame: (input) => {
    const layer = requireEditableLayer(input.layerId as string);
    const cf = requireContentFrame(layer, input.contentFrameId as string);
    const id = tl().duplicateContentFrame(layer.id, cf.id);
    if (!id) throw new BridgeError('CONFLICT', 'No room after the content frame for a duplicate');
    return { ...frameInfo(layer.id, id), sourceContentFrameId: cf.id };
  },
  split_content_frame: (input) => {
    const layer = requireEditableLayer(input.layerId as string);
    const cf = requireContentFrame(layer, input.contentFrameId as string);
    const at = input.atFrame as number;
    if (at <= cf.startFrame || at >= cf.startFrame + cf.durationFrames) {
      throw new BridgeError('OUT_OF_RANGE', `atFrame must be inside the content frame (${cf.startFrame + 1}..${cf.startFrame + cf.durationFrames - 1})`);
    }
    const id = must(tl().splitContentFrame(layer.id, cf.id, at), 'Could not split content frame');
    return { layerId: layer.id, contentFrameId: cf.id, newContentFrameId: id };
  },
  set_timeline: (input) => {
    if (typeof input.frameRate === 'number') tl().setFrameRate(input.frameRate, (input.maintainDuration as boolean | undefined) ?? true);
    if (typeof input.durationFrames === 'number') tl().setDuration(input.durationFrames);
    if (typeof input.looping === 'boolean') tl().setLooping(input.looping);
    if (input.workArea === null) {
      tl().clearWorkArea();
    } else if (input.workArea) {
      const wa = input.workArea as { start: number; end: number; enabled?: boolean };
      const duration = tl().config.durationFrames;
      if (wa.start < 0 || wa.end > duration || wa.start >= wa.end) {
        throw new BridgeError('OUT_OF_RANGE', `workArea must satisfy 0 <= start < end <= ${duration} (end is exclusive)`);
      }
      tl().clearWorkArea();
      tl().setWorkAreaEnd(wa.end);
      tl().setWorkAreaStart(wa.start);
      tl().setWorkAreaEnabled(wa.enabled ?? true);
    }
    if (tl().view.currentFrame >= tl().config.durationFrames) tl().goToFrame(tl().config.durationFrames - 1);
    const { config, view } = tl();
    return {
      frameRate: config.frameRate,
      durationFrames: config.durationFrames,
      looping: view.looping,
      workArea: { start: view.workAreaStart, end: view.workAreaEnd, enabled: view.workAreaEnabled },
    };
  },
  trim_to_work_area: () => {
    const { view } = tl();
    if (!view.workAreaEnabled || view.workAreaStart >= view.workAreaEnd) throw invalid('Enable a work area first (set_timeline.workArea)');
    tl().trimToWorkArea();
    return { durationFrames: tl().config.durationFrames };
  },
  remove_blank_space: (input, ctx) => {
    const layer = requireEditableLayer(input.layerId as string);
    const snapshot = (l: typeof layer) => JSON.stringify([tl().config.durationFrames, l.contentFrames.map((cf) => [cf.id, cf.startFrame])]);
    const before = snapshot(layer);
    tl().removeBlankSpace(layer.id, input.frame as number);
    const after = requireLayer(layer.id);
    if (snapshot(after) === before) {
      ctx.noChange();
      return { layerId: layer.id, changed: false };
    }
    return { layerId: layer.id };
  },

  // ── View-only (no history, no revision) ─────────────────────────────────
  set_active_layer: (input) => {
    const layer = requireLayer(input.layerId as string);
    tl().setActiveLayer(layer.id);
    return { activeLayerId: layer.id };
  },
  seek: (input) => {
    const frame = input.frame as number;
    const duration = tl().config.durationFrames;
    if (frame < 0 || frame >= duration) throw new BridgeError('OUT_OF_RANGE', `frame must be between 0 and ${duration - 1}`);
    tl().goToFrame(frame);
    return { currentFrame: tl().view.currentFrame };
  },
  set_playback: (input) => {
    tl().setPlaying(input.playing as boolean);
    return { playing: tl().view.isPlaying };
  },
  set_onion_skin: (input) => {
    const anim = useAnimationStore.getState();
    if (typeof input.enabled === 'boolean') anim.setOnionSkinEnabled(input.enabled);
    if (typeof input.previousFrames === 'number') anim.setPreviousFrames(input.previousFrames);
    if (typeof input.nextFrames === 'number') anim.setNextFrames(input.nextFrames);
    if (typeof input.allLayers === 'boolean' && useAnimationStore.getState().onionSkin.allLayers !== input.allLayers) {
      anim.toggleOnionSkinAllLayers();
    }
    return { ...useAnimationStore.getState().onionSkin };
  },
};

