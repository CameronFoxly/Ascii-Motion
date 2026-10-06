import { describe, expect, it } from 'vitest';
import type { KeyframeId, PropertyTrackId } from '../types/timeline';
import {
  getKeyframeNavigationTarget,
  type NavigableKeyframe,
} from '../utils/keyframeNavigation';

const keyframe = (id: string, trackId: string, frame: number): NavigableKeyframe => ({
  id: id as KeyframeId,
  trackId: trackId as PropertyTrackId,
  frame,
});

describe('getKeyframeNavigationTarget', () => {
  const keyframes = [
    keyframe('position-2', 'position', 2),
    keyframe('opacity-5', 'opacity', 5),
    keyframe('position-5', 'position', 5),
    keyframe('position-9', 'position', 9),
  ];

  it('selects the next keyframe on the most recently selected track', () => {
    expect(getKeyframeNavigationTarget(keyframes, 2, 1, 'position-2' as KeyframeId))
      .toEqual(keyframe('position-5', 'position', 5));
  });

  it('selects the previous keyframe on the most recently selected track', () => {
    expect(getKeyframeNavigationTarget(keyframes, 9, -1, 'position-9' as KeyframeId))
      .toEqual(keyframe('position-5', 'position', 5));
  });

  it('falls back to the first keyframe at the destination frame', () => {
    expect(getKeyframeNavigationTarget(keyframes, 2, 1, 'missing' as KeyframeId))
      .toEqual(keyframe('opacity-5', 'opacity', 5));
  });

  it('returns null when there is no keyframe in the requested direction', () => {
    expect(getKeyframeNavigationTarget(keyframes, 9, 1, 'position-9' as KeyframeId)).toBeNull();
    expect(getKeyframeNavigationTarget(keyframes, 2, -1, 'position-2' as KeyframeId)).toBeNull();
  });
});
