/**
 * Store actions specific to the Animated Text generator. Callers wrap these
 * in generator history.
 */

import { useTimelineStore } from '../../stores/timelineStore';
import type { LayerId } from '../../types/timeline';

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
