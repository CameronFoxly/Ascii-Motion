/**
 * Store actions specific to the Animated Text generator. Callers wrap these
 * in generator history.
 */

import { useTimelineStore } from '../../stores/timelineStore';
import type { LayerId } from '../../types/timeline';
import { getAnimatedTextCharacterCount } from '../../registry/generators/animatedText';
import { resolveGeneratorSettings } from './generatorRuntime';

/** Units describe the entire range animation, so convert its keys as well as its static values. */
export function convertTypewriterUnits(layerId: LayerId, units: 'percent' | 'index', frame: number): void {
  const source = useTimelineStore.getState().getLayer(layerId)?.generator;
  if (!source) return;
  const resolved = resolveGeneratorSettings(source, frame);
  if (resolved['typewriter.units'] === units) return;
  const convert = (value: unknown, atFrame: number): number => {
    const settings = resolveGeneratorSettings(source, atFrame);
    const count = getAnimatedTextCharacterCount(String(settings.text ?? ''));
    const oldUnits = settings['typewriter.units'];
    const numeric = typeof value === 'number' ? value : 0;
    const max = units === 'percent' ? 100 : count;
    const converted = oldUnits === units ? numeric
      : units === 'index' ? numeric * count / 100
        : count === 0 ? 0 : numeric * 100 / count;
    return Math.min(max, Math.max(0, converted));
  };
  const settings = {
    ...source.settings,
    'typewriter.units': units,
    'typewriter.start': convert(source.settings['typewriter.start'] ?? 0, frame),
    'typewriter.end': convert(source.settings['typewriter.end'] ?? 100, frame),
  };
  const propertyTracks = source.propertyTracks.map((track) => {
    if (track.propertyPath === 'typewriter.units') {
      return { ...track, keyframes: track.keyframes.map((key) => ({ ...key, value: units })) };
    }
    if (track.propertyPath !== 'typewriter.start' && track.propertyPath !== 'typewriter.end') return track;
    return { ...track, keyframes: track.keyframes.map((key) => ({
      ...key, value: convert(key.value, key.frame),
    })) };
  });
  useTimelineStore.setState((state) => ({
    layers: state.layers.map((layer) => layer.id === layerId
      ? { ...layer, generator: { ...source, settings, propertyTracks } } : layer),
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
