/** Procedural effect (CPU) and shader (post-effect) operations. Not entitlement-gated. */
import { getEffect } from '../../../registry/effectRegistry';
import { getPostEffect } from '../../../registry/postEffectRegistry';
import type { EffectBlockId, EffectPropertyTrackId, EffectTrack } from '../../../types/effectBlock';
import type { PostEffectBlockId, PostEffectPropertyTrackId } from '../../../types/postEffect';
import type { KeyframeId, LayerId } from '../../../types/timeline';
import { BridgeError, invalid, notFound } from '../errors';
import type { OperationHandler } from '../runtime';
import { applyKeyframes, removeKeyframes, type KeyframeInputValue, type KeyframeTrackAdapter } from './keyframes';
import { must, resolveOwner, tl } from './common';

interface PropertyDefLike { path: string; valueType?: string; min?: number; max?: number; options?: Array<{ value: string }> }

function validateSettings(kind: string, type: string, defs: PropertyDefLike[], defaults: Record<string, unknown>, settings: Record<string, unknown> | undefined): void {
  if (!settings) return;
  const known = new Set([...defs.map((d) => d.path), ...Object.keys(defaults)]);
  for (const [key, value] of Object.entries(settings)) {
    if (!known.has(key)) throw invalid(`Unknown ${kind} setting "${key}" for ${type}. Known: ${[...known].join(', ')}`);
    const def = defs.find((d) => d.path === key);
    if (def?.valueType === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) throw invalid(`${key} must be a number`);
    if (def?.valueType === 'boolean' && typeof value !== 'boolean') throw invalid(`${key} must be a boolean`);
    if (def?.valueType === 'select' && def.options && !def.options.some((o) => o.value === value)) {
      throw invalid(`${key} must be one of ${def.options.map((o) => o.value).join(', ')}`);
    }
  }
}

function validateKeyframePath(kind: string, type: string, defs: PropertyDefLike[], path: string): void {
  if (!defs.some((d) => d.path === path)) {
    throw invalid(`${type} has no animatable ${kind} property "${path}". Animatable: ${defs.map((d) => d.path).join(', ')}`);
  }
}

// ── Effects ────────────────────────────────────────────────────────────────

interface FoundEffect { track: EffectTrack; ownerId: string | null; ownerKind: 'layer' | 'group' | 'global' }

export function findEffect(blockId: string): FoundEffect {
  const state = tl();
  for (const layer of state.layers) {
    const track = (layer.effectTracks ?? []).find((t) => t.effectBlock.id === blockId);
    if (track) return { track, ownerId: layer.id, ownerKind: 'layer' };
  }
  for (const group of state.layerGroups) {
    const track = (group.effectTracks ?? []).find((t) => t.effectBlock.id === blockId);
    if (track) return { track, ownerId: group.id, ownerKind: 'group' };
  }
  const track = state.globalEffects.find((t) => t.effectBlock.id === blockId);
  if (track) return { track, ownerId: null, ownerKind: 'global' };
  throw notFound('Effect block', blockId);
}

function ownerTracks(ownerId: string | null): EffectTrack[] {
  const state = tl();
  if (ownerId === null) return state.globalEffects;
  return state.layers.find((l) => l.id === ownerId)?.effectTracks ?? state.layerGroups.find((g) => g.id === ownerId)?.effectTracks ?? [];
}

function effectEntry(type: string) {
  const entry = getEffect(type);
  if (!entry) throw notFound('Effect type', type);
  return entry;
}

function defaultSpan(start: number | undefined, duration: number | undefined): { start: number; duration: number } {
  const s = start ?? 0;
  return { start: s, duration: duration ?? Math.max(1, tl().config.durationFrames - s) };
}

function effectInfo(blockId: string) {
  const { track, ownerId, ownerKind } = findEffect(blockId);
  const b = track.effectBlock;
  return {
    blockId: b.id,
    effectType: b.effectType,
    owner: ownerKind === 'global' ? { global: true } : ownerKind === 'layer' ? { layerId: ownerId } : { groupId: ownerId },
    startFrame: b.startFrame,
    durationFrames: b.durationFrames,
    enabled: b.enabled,
    index: ownerTracks(ownerId).findIndex((t) => t.effectBlock.id === b.id),
  };
}

function effectAdapter(blockId: string): KeyframeTrackAdapter {
  const id = blockId as EffectBlockId;
  return {
    tracks: () => findEffect(blockId).track.effectBlock.propertyTracks as never,
    addTrack: (path) => tl().addEffectPropertyTrack(id, path),
    addKeyframe: (trackId, frame, value) => { tl().addEffectKeyframe(id, trackId as EffectPropertyTrackId, frame, value as never); },
    updateKeyframe: (trackId, kfId, updates) => tl().updateEffectKeyframe(id, trackId as EffectPropertyTrackId, kfId as KeyframeId, updates as never),
    removeKeyframe: (trackId, kfId) => tl().removeEffectKeyframe(id, trackId as EffectPropertyTrackId, kfId as KeyframeId),
  };
}

function setEnabled(current: boolean, next: unknown, toggle: () => void): void {
  if (typeof next === 'boolean' && next !== current) toggle();
}

// ── Shaders ────────────────────────────────────────────────────────────────

function findShader(blockId: string) {
  const tracks = tl().postEffectTracks;
  const index = tracks.findIndex((t) => t.effectBlock.id === blockId);
  if (index < 0) throw notFound('Shader block', blockId);
  return { track: tracks[index], index };
}

function shaderEntry(type: string) {
  const entry = getPostEffect(type);
  if (!entry) throw notFound('Shader type', type);
  return entry;
}

function shaderInfo(blockId: string) {
  const { track, index } = findShader(blockId);
  const b = track.effectBlock;
  return { blockId: b.id, shaderType: b.postEffectType, startFrame: b.startFrame, durationFrames: b.durationFrames, enabled: b.enabled, index };
}

function shaderAdapter(blockId: string): KeyframeTrackAdapter {
  const id = blockId as PostEffectBlockId;
  return {
    tracks: () => findShader(blockId).track.effectBlock.propertyTracks as never,
    addTrack: (path) => tl().addPostEffectPropertyTrack(id, path),
    addKeyframe: (trackId, frame, value) => { tl().addPostEffectKeyframe(id, trackId as PostEffectPropertyTrackId, frame, value as never); },
    updateKeyframe: (trackId, kfId, updates) => tl().updatePostEffectKeyframe(id, trackId as PostEffectPropertyTrackId, kfId as KeyframeId, updates as never),
    removeKeyframe: (trackId, kfId) => tl().removePostEffectKeyframe(id, trackId as PostEffectPropertyTrackId, kfId as KeyframeId),
  };
}

function moveShader(blockId: string, toIndex: number): void {
  const total = tl().postEffectTracks.length;
  if (toIndex < 0 || toIndex >= total) throw new BridgeError('OUT_OF_RANGE', `index must be between 0 and ${total - 1}`);
  const { index } = findShader(blockId);
  if (index !== toIndex) tl().reorderPostEffectTracks(index, toIndex);
}

export const effectHandlers: Record<string, OperationHandler> = {
  add_effect: (input) => {
    const owner = resolveOwner(input.owner as never);
    const type = input.effectType as string;
    const entry = effectEntry(type);
    const settings = input.settings as Record<string, unknown> | undefined;
    validateSettings('effect', type, entry.propertyDefinitions, entry.defaultSettings, settings);
    const span = defaultSpan(input.startFrame as number | undefined, input.durationFrames as number | undefined);
    const blockId = must(
      tl().addEffectBlock(owner.id as LayerId | null, type, span.start, span.duration),
      `Could not add effect ${type}`,
    );
    if (settings) tl().updateEffectBlockSettings(blockId, settings);
    if (input.enabled === false) tl().toggleEffectBlockEnabled(blockId);
    return effectInfo(blockId);
  },
  update_effect: (input) => {
    const blockId = input.blockId as string;
    const { track } = findEffect(blockId);
    const b = track.effectBlock;
    const id = b.id as EffectBlockId;
    const settings = input.settings as Record<string, unknown> | undefined;
    const entry = effectEntry(b.effectType);
    validateSettings('effect', b.effectType, entry.propertyDefinitions, entry.defaultSettings, settings);
    if (input.startFrame !== undefined || input.durationFrames !== undefined) {
      tl().updateEffectBlockTiming(id, (input.startFrame as number | undefined) ?? b.startFrame, (input.durationFrames as number | undefined) ?? b.durationFrames);
    }
    if (settings) tl().updateEffectBlockSettings(id, settings);
    setEnabled(b.enabled, input.enabled, () => tl().toggleEffectBlockEnabled(id));
    if (input.owner) {
      const owner = resolveOwner(input.owner as never);
      tl().moveEffectTrack(id, owner.id as LayerId | null, input.index as number | undefined);
    } else if (typeof input.index === 'number') {
      const { ownerId } = findEffect(blockId);
      const tracks = ownerTracks(ownerId);
      if (input.index < 0 || input.index >= tracks.length) throw new BridgeError('OUT_OF_RANGE', `index must be between 0 and ${tracks.length - 1}`);
      const from = tracks.findIndex((t) => t.effectBlock.id === blockId);
      if (from !== input.index) tl().reorderEffectTracks(ownerId as LayerId | null, from, input.index);
    }
    return effectInfo(blockId);
  },
  remove_effect: (input) => {
    const { track, ownerId } = findEffect(input.blockId as string);
    tl().removeEffectBlock(ownerId as LayerId | null, track.effectBlock.id);
    return { removedBlockId: track.effectBlock.id };
  },
  set_effect_keyframes: (input) => {
    const { track } = findEffect(input.blockId as string);
    const entry = effectEntry(track.effectBlock.effectType);
    validateKeyframePath('effect', track.effectBlock.effectType, entry.propertyDefinitions, input.propertyPath as string);
    const result = applyKeyframes(effectAdapter(track.effectBlock.id), input.propertyPath as string, input.keyframes as KeyframeInputValue[], { replace: input.replace as boolean });
    return { blockId: track.effectBlock.id, propertyPath: input.propertyPath, ...result };
  },
  remove_effect_keyframes: (input) => {
    const { track } = findEffect(input.blockId as string);
    const result = removeKeyframes(effectAdapter(track.effectBlock.id), input.propertyPath as string, input as never);
    return { blockId: track.effectBlock.id, propertyPath: input.propertyPath, ...result };
  },
  bake_effect: (input) => {
    const { track, ownerKind, ownerId } = findEffect(input.blockId as string);
    tl().bakeEffect(track.effectBlock.id);
    const affected = ownerKind === 'layer' ? [ownerId] : ownerKind === 'group'
      ? tl().layerGroups.find((g) => g.id === ownerId)?.childLayerIds ?? []
      : tl().layers.map((l) => l.id);
    return { removedBlockId: track.effectBlock.id, layerIds: affected };
  },

  add_shader: (input) => {
    const type = input.shaderType as string;
    const entry = shaderEntry(type);
    const settings = input.settings as Record<string, unknown> | undefined;
    validateSettings('shader', type, entry.propertyDefinitions, entry.defaultSettings, settings);
    const span = defaultSpan(input.startFrame as number | undefined, input.durationFrames as number | undefined);
    const blockId = must(tl().addPostEffectBlock(type, span.start, span.duration), `Could not add shader ${type}`);
    if (settings) tl().updatePostEffectBlockSettings(blockId, settings);
    if (input.enabled === false) tl().togglePostEffectBlockEnabled(blockId);
    if (typeof input.index === 'number') moveShader(blockId, input.index);
    return shaderInfo(blockId);
  },
  update_shader: (input) => {
    const { track } = findShader(input.blockId as string);
    const b = track.effectBlock;
    const settings = input.settings as Record<string, unknown> | undefined;
    const entry = shaderEntry(b.postEffectType);
    validateSettings('shader', b.postEffectType, entry.propertyDefinitions, entry.defaultSettings, settings);
    if (input.startFrame !== undefined || input.durationFrames !== undefined) {
      tl().updatePostEffectBlockTiming(b.id, (input.startFrame as number | undefined) ?? b.startFrame, (input.durationFrames as number | undefined) ?? b.durationFrames);
    }
    if (settings) tl().updatePostEffectBlockSettings(b.id, settings);
    setEnabled(b.enabled, input.enabled, () => tl().togglePostEffectBlockEnabled(b.id));
    if (typeof input.index === 'number') moveShader(b.id, input.index);
    return shaderInfo(b.id);
  },
  remove_shader: (input) => {
    const { track } = findShader(input.blockId as string);
    tl().removePostEffectBlock(track.effectBlock.id);
    return { removedBlockId: track.effectBlock.id };
  },
  set_shader_keyframes: (input) => {
    const { track } = findShader(input.blockId as string);
    const entry = shaderEntry(track.effectBlock.postEffectType);
    validateKeyframePath('shader', track.effectBlock.postEffectType, entry.propertyDefinitions, input.propertyPath as string);
    const result = applyKeyframes(shaderAdapter(track.effectBlock.id), input.propertyPath as string, input.keyframes as KeyframeInputValue[], { replace: input.replace as boolean });
    return { blockId: track.effectBlock.id, propertyPath: input.propertyPath, ...result };
  },
  remove_shader_keyframes: (input) => {
    const { track } = findShader(input.blockId as string);
    const result = removeKeyframes(shaderAdapter(track.effectBlock.id), input.propertyPath as string, input as never);
    return { blockId: track.effectBlock.id, propertyPath: input.propertyPath, ...result };
  },
};
