/**
 * Keyframe handlers (layer/group transforms) plus a shared track adapter used
 * by effect, shader and generator keyframe operations.
 */
import type { EasingCurve, KeyframeId, PropertyPath, PropertyTrackId } from '../../../types/timeline';
import { normalizeEasing } from '../../generatorCommands';
import { invalid, notFound } from '../errors';
import type { OperationHandler } from '../runtime';
import { asLayerId, requireGroup, requireLayer, tl } from './common';

export interface KeyframeInputValue {
  frame: number;
  value: unknown;
  easing?: unknown;
}

interface TrackLike {
  id: string;
  propertyPath: string;
  keyframes: Array<{ id: string; frame: number }>;
}

export interface KeyframeTrackAdapter {
  tracks(): TrackLike[];
  addTrack(path: string): string | null;
  removeTrack?(trackId: string): void;
  addKeyframe(trackId: string, frame: number, value: unknown): void;
  updateKeyframe(trackId: string, keyframeId: string, updates: { frame?: number; value?: unknown; easing?: EasingCurve }): void;
  removeKeyframe(trackId: string, keyframeId: string): void;
  setLoop?(trackId: string, loop: boolean): void;
}

const findTrack = (adapter: KeyframeTrackAdapter, path: string) => adapter.tracks().find((t) => t.propertyPath === path);

export function applyKeyframes(
  adapter: KeyframeTrackAdapter,
  propertyPath: string,
  keyframes: KeyframeInputValue[],
  options: { replace?: boolean; loop?: boolean } = {},
): { trackId: string; keyframeIds: string[] } {
  const frames = new Set<number>();
  for (const kf of keyframes) {
    if (frames.has(kf.frame)) throw invalid(`Duplicate keyframe frame ${kf.frame}`);
    frames.add(kf.frame);
  }
  const easings = keyframes.map((kf) => (kf.easing === undefined ? undefined : normalizeEasing(kf.easing)));
  let track = findTrack(adapter, propertyPath);
  if (!track) {
    const id = adapter.addTrack(propertyPath);
    if (!id) throw invalid(`Property ${propertyPath} cannot be keyframed here`);
    track = findTrack(adapter, propertyPath);
    if (!track) throw invalid(`Property ${propertyPath} cannot be keyframed here`);
  } else if (options.replace) {
    for (const kf of [...track.keyframes]) adapter.removeKeyframe(track.id, kf.id);
  }
  const trackId = track.id;
  const keyframeIds: string[] = [];
  keyframes.forEach((kf, index) => {
    adapter.addKeyframe(trackId, kf.frame, kf.value);
    const stored = findTrack(adapter, propertyPath)?.keyframes.find((k) => k.frame === kf.frame);
    if (!stored) throw invalid(`Keyframe at frame ${kf.frame} was rejected`);
    // addKeyframe only replaces the value of an existing keyframe; set easing explicitly.
    adapter.updateKeyframe(trackId, stored.id, { value: kf.value, ...(easings[index] ? { easing: easings[index] } : {}) });
    keyframeIds.push(stored.id);
  });
  if (options.loop !== undefined) {
    if (!adapter.setLoop) throw invalid('Keyframe looping is not supported for this property');
    adapter.setLoop(trackId, options.loop);
  }
  return { trackId, keyframeIds };
}

export function removeKeyframes(
  adapter: KeyframeTrackAdapter,
  propertyPath: string,
  input: { frames?: number[]; keyframeIds?: string[]; clearTrack?: boolean },
): { removedKeyframeIds: string[]; trackRemoved: boolean } {
  const track = findTrack(adapter, propertyPath);
  if (!track) throw notFound('Property track', propertyPath);
  if (!input.clearTrack && !input.frames?.length && !input.keyframeIds?.length) {
    throw invalid('Specify frames, keyframeIds, or clearTrack');
  }
  if (input.clearTrack) {
    const ids = track.keyframes.map((k) => k.id);
    if (adapter.removeTrack) adapter.removeTrack(track.id);
    else for (const id of ids) adapter.removeKeyframe(track.id, id);
    return { removedKeyframeIds: ids, trackRemoved: Boolean(adapter.removeTrack) };
  }
  const frameSet = new Set(input.frames ?? []);
  const idSet = new Set(input.keyframeIds ?? []);
  const victims = track.keyframes.filter((k) => frameSet.has(k.frame) || idSet.has(k.id));
  const missing = [
    ...[...frameSet].filter((f) => !track.keyframes.some((k) => k.frame === f)).map((f) => `frame ${f}`),
    ...[...idSet].filter((id) => !track.keyframes.some((k) => k.id === id)),
  ];
  if (missing.length > 0) throw notFound('Keyframes', missing.join(', '));
  for (const kf of victims) adapter.removeKeyframe(track.id, kf.id);
  return { removedKeyframeIds: victims.map((k) => k.id), trackRemoved: false };
}

const TRANSFORM_PATHS = new Set([
  'transform.position.x', 'transform.position.y', 'transform.scale.x', 'transform.scale.y',
  'transform.rotation', 'transform.anchorPoint.x', 'transform.anchorPoint.y',
]);

function transformAdapter(input: { layerId?: string; groupId?: string }): { adapter: KeyframeTrackAdapter; owner: Record<string, string> } {
  if (!input.layerId === !input.groupId) throw invalid('Specify exactly one of layerId or groupId');
  const ownerId = input.layerId ?? input.groupId!;
  const owner: Record<string, string> = input.layerId ? { layerId: input.layerId } : { groupId: input.groupId! };
  const getTracks = () => (input.layerId ? requireLayer(input.layerId).propertyTracks : requireGroup(input.groupId!).propertyTracks ?? []);
  getTracks();
  const id = asLayerId(ownerId);
  return {
    owner,
    adapter: {
      tracks: () => getTracks() as unknown as TrackLike[],
      addTrack: (path) => tl().addPropertyTrack(id, path as PropertyPath),
      removeTrack: (trackId) => tl().removePropertyTrack(id, trackId as PropertyTrackId),
      addKeyframe: (trackId, frame, value) => { tl().addKeyframe(id, trackId as PropertyTrackId, frame, value as number); },
      updateKeyframe: (trackId, kfId, updates) => tl().updateKeyframe(id, trackId as PropertyTrackId, kfId as KeyframeId, updates as never),
      removeKeyframe: (trackId, kfId) => tl().removeKeyframe(id, trackId as PropertyTrackId, kfId as KeyframeId),
      setLoop: (trackId, loop) => tl().setKeyframeLooping(id, trackId as PropertyTrackId, loop),
    },
  };
}

function assertTransformPath(path: string): void {
  if (!TRANSFORM_PATHS.has(path)) {
    throw invalid(`Unknown transform property "${path}". Valid: ${[...TRANSFORM_PATHS].join(', ')}`);
  }
}

export const keyframeHandlers: Record<string, OperationHandler> = {
  set_keyframes: (input) => {
    const path = input.propertyPath as string;
    assertTransformPath(path);
    const keyframes = input.keyframes as KeyframeInputValue[];
    for (const kf of keyframes) {
      if (typeof kf.value !== 'number' || !Number.isFinite(kf.value)) throw invalid(`Transform keyframe values must be numbers (frame ${kf.frame})`);
    }
    const { adapter, owner } = transformAdapter(input as { layerId?: string; groupId?: string });
    const result = applyKeyframes(adapter, path, keyframes, { replace: input.replace as boolean, loop: input.loop as boolean | undefined });
    return { ...owner, propertyPath: path, ...result };
  },
  remove_keyframes: (input) => {
    const path = input.propertyPath as string;
    assertTransformPath(path);
    const { adapter, owner } = transformAdapter(input as { layerId?: string; groupId?: string });
    return { ...owner, propertyPath: path, ...removeKeyframes(adapter, path, input as never) };
  },
};
