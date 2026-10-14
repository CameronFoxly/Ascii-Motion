/**
 * Session (de)serialization for procedural generator sources.
 */

import type { GeneratorSource, GeneratorSourceId, SessionGeneratorSourceV2 } from '../../types/generatorLayer';
import type { EffectPropertyTrackId } from '../../types/effectBlock';
import type { KeyframeId } from '../../types/timeline';

export function serializeGeneratorSource(source: GeneratorSource): SessionGeneratorSourceV2 {
  return {
    id: source.id as string,
    generatorType: source.generatorType,
    startFrame: source.startFrame,
    durationFrames: source.durationFrames,
    enabled: source.enabled,
    settings: { ...source.settings },
    propertyTracks: source.propertyTracks.map((pt) => ({
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
  };
}

export function deserializeGeneratorSource(data: SessionGeneratorSourceV2): GeneratorSource {
  return {
    id: data.id as GeneratorSourceId,
    generatorType: data.generatorType,
    startFrame: Math.max(0, Math.floor(data.startFrame)),
    durationFrames: Math.max(1, Math.floor(data.durationFrames)),
    enabled: data.enabled !== false,
    settings: { ...(data.settings ?? {}) },
    propertyTracks: (data.propertyTracks ?? []).map((pt) => ({
      id: pt.id as EffectPropertyTrackId,
      propertyPath: pt.propertyPath,
      keyframes: (pt.keyframes ?? []).map((kf) => ({
        id: kf.id as KeyframeId,
        frame: kf.frame,
        value: kf.value,
        easing: kf.easing,
      })),
      loopKeyframes: pt.loopKeyframes,
    })),
  };
}
