/**
 * Store actions specific to the Animated Text generator. Callers wrap these
 * in generator history.
 */

import { useTimelineStore } from '../../stores/timelineStore';
import { generateKeyframeId, type LayerId } from '../../types/timeline';
import { defaultEasing } from '../../types/easing';
import type { EffectKeyframe } from '../../types/effectBlock';
import { getAnimatedTextCharacterCount } from '../../registry/generators/animatedText';
import { resolveGeneratorSettings } from './generatorRuntime';

/** Units describe the entire range animation, so convert its keys as well as its static values. */
export function convertTypewriterUnits(layerId: LayerId, units: 'percent' | 'index', frame: number): void {
  const timeline = useTimelineStore.getState();
  const source = timeline.getLayer(layerId)?.generator;
  if (!source) return;
  const resolved = resolveGeneratorSettings(source, frame);
  if (resolved['typewriter.units'] === units) return;
  const convert = (numeric: number, oldUnits: unknown, count: number): number => {
    const max = units === 'percent' ? 100 : count;
    const converted = oldUnits === units ? numeric
      : units === 'index' ? numeric * count / 100
        : count === 0 ? 0 : numeric * 100 / count;
    return Math.min(max, Math.max(0, converted));
  };
  const valuesAtFrame = (atFrame: number) => {
    const settings = resolveGeneratorSettings(source, atFrame);
    const count = getAnimatedTextCharacterCount(String(settings.text ?? ''));
    const oldUnits = settings['typewriter.units'];
    return {
      start: convert(Number(settings['typewriter.start'] ?? 0), oldUnits, count),
      end: convert(Number(settings['typewriter.end'] ?? 100), oldUnits, count),
    };
  };
  const staticValues = valuesAtFrame(frame);
  const settings = {
    ...source.settings,
    'typewriter.units': units,
    'typewriter.start': staticValues.start,
    'typewriter.end': staticValues.end,
  };
  const propertyTracks = source.propertyTracks.map((track) => {
    if (track.propertyPath === 'typewriter.units') {
      return { ...track, keyframes: track.keyframes.map((key) => ({ ...key, value: units })) };
    }
    return track;
  });
  useTimelineStore.setState((state) => ({
    layers: state.layers.map((layer) => layer.id === layerId
      ? { ...layer, generator: { ...source, settings, propertyTracks } } : layer),
  }));

  const first = Math.max(0, source.startFrame);
  const end = source.startFrame + source.durationFrames;
  const last = end - 1;
  const sampleFrames = new Set<number>([first, last]);
  for (const track of source.propertyTracks) {
    if (track.propertyPath === 'typewriter.start' || track.propertyPath === 'typewriter.end'
      || track.propertyPath === 'typewriter.units' || track.propertyPath === 'text') {
      for (const key of track.keyframes) {
        if (key.frame >= first && key.frame < end) {
          sampleFrames.add(key.frame);
          if (track.propertyPath === 'text' && key.frame > first) sampleFrames.add(key.frame - 1);
        }
      }
    }
  }

  const sampledValues = new Map<number, { start: number; end: number }>();
  for (const atFrame of sampleFrames) sampledValues.set(atFrame, valuesAtFrame(atFrame));

  for (const propertyPath of ['typewriter.start', 'typewriter.end'] as const) {
    const existing = source.propertyTracks.find((track) => track.propertyPath === propertyPath);
    const values = [...sampledValues.values()].map((value) => value[propertyPath === 'typewriter.start' ? 'start' : 'end']);
    const needsTrack = !!existing || values.some((value) => value !== values[0]);
    if (needsTrack && !existing) timeline.addGeneratorPropertyTrack(layerId, propertyPath);
  }

  const updatedSource = timeline.getLayer(layerId)?.generator;
  if (!updatedSource) return;
  const convertedTracks = updatedSource.propertyTracks.map((track) => {
    if (track.propertyPath !== 'typewriter.start' && track.propertyPath !== 'typewriter.end') return track;
    const existingAtFrame = new Map(track.keyframes.map((key) => [key.frame, key]));
    const keyframes: EffectKeyframe[] = track.keyframes.filter((key) => key.frame < first || key.frame >= end);
    for (const [atFrame, values] of sampledValues) {
      const old = existingAtFrame.get(atFrame);
      const value = values[track.propertyPath === 'typewriter.start' ? 'start' : 'end'];
      keyframes.push(old
        ? { ...old, value }
        : { id: generateKeyframeId(), frame: atFrame, value, easing: defaultEasing() });
    }
    keyframes.sort((a, b) => a.frame - b.frame);
    return { ...track, keyframes };
  });
  useTimelineStore.setState((state) => ({
    layers: state.layers.map((layer) => layer.id === layerId && layer.generator
      ? { ...layer, generator: { ...layer.generator, propertyTracks: convertedTracks } }
      : layer),
  }));
}

/**
 * When Typewriter is chosen, reveal the text over the generator span by
 * keyframing End 0 → 100. Existing End keyframes are left alone.
 */
export function applyTypewriterDefaultKeyframes(layerId: LayerId): void {
  const tl = useTimelineStore.getState();
  const source = tl.layers.find((l) => l.id === layerId)?.generator;
  if (!source) return;
  const existing = source.propertyTracks.find((pt) => pt.propertyPath === 'typewriter.end');
  if (existing && existing.keyframes.length > 0) return;

  const first = source.startFrame;
  const last = source.startFrame + Math.max(1, source.durationFrames) - 1;
  // A single-frame span can't animate; show the full text instead of hiding it
  if (last <= first) {
    tl.updateGeneratorSettings(layerId, { 'typewriter.units': 'percent', 'typewriter.start': 0, 'typewriter.end': 100 });
    return;
  }
  tl.updateGeneratorSettings(layerId, { 'typewriter.units': 'percent', 'typewriter.start': 0 });
  const trackId = tl.addGeneratorPropertyTrack(layerId, 'typewriter.end');
  if (!trackId) return;
  tl.addGeneratorKeyframe(layerId, trackId, first, 0);
  tl.addGeneratorKeyframe(layerId, trackId, last, 100);
}
