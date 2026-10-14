/**
 * Generator Layer Types
 *
 * Procedural generator layers render their content every frame from a
 * generator algorithm + keyframeable settings (mirrors the effects system).
 * Property tracks reuse the effect keyframe primitives so the same
 * interpolation, easing, and keyframe editing UI apply.
 */

import type {
  EffectPropertyTrack,
  SessionEffectPropertyTrackV2,
} from './effectBlock';

declare const __brand: unique symbol;
type Brand<T, B> = T & { [__brand]: B };

export type GeneratorSourceId = Brand<string, 'GeneratorSourceId'>;

let generatorSourceCounter = 0;

export function generateGeneratorSourceId(): GeneratorSourceId {
  return `gen-${++generatorSourceCounter}-${Date.now().toString(36)}` as GeneratorSourceId;
}

/**
 * The procedural source attached to a generator layer.
 * Treated as immutable — every edit produces a new object, which lets the
 * runtime cache by object identity.
 */
export interface GeneratorSource {
  id: GeneratorSourceId;
  /** Registry id, e.g. 'radio-waves' */
  generatorType: string;
  /** Timeline span of the generator */
  startFrame: number;
  durationFrames: number;
  enabled: boolean;
  /** Static values (used when a property has no keyframe track) */
  settings: Record<string, unknown>;
  /** Keyframe tracks (absolute frames, like effect blocks) */
  propertyTracks: EffectPropertyTrack[];
}

export interface SessionGeneratorSourceV2 {
  id: string;
  generatorType: string;
  startFrame: number;
  durationFrames: number;
  enabled: boolean;
  settings: Record<string, unknown>;
  propertyTracks: SessionEffectPropertyTrackV2[];
}

/** Layer kind discriminator. Absent = 'content' for backwards compatibility. */
export type LayerKind = 'content' | 'generator';
