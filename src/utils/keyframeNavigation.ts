import type { KeyframeId, PropertyTrackId } from '../types/timeline';

export interface NavigableKeyframe {
  id: KeyframeId;
  trackId: PropertyTrackId;
  frame: number;
}

export function getKeyframeNavigationTarget(
  keyframes: NavigableKeyframe[],
  currentFrame: number,
  direction: 1 | -1,
  preferredKeyframeId: KeyframeId | null,
): NavigableKeyframe | null {
  const targetFrame = direction === 1
    ? keyframes.reduce<number | null>(
        (target, keyframe) =>
          keyframe.frame > currentFrame && (target === null || keyframe.frame < target)
            ? keyframe.frame
            : target,
        null,
      )
    : keyframes.reduce<number | null>(
        (target, keyframe) =>
          keyframe.frame < currentFrame && (target === null || keyframe.frame > target)
            ? keyframe.frame
            : target,
        null,
      );

  if (targetFrame === null) return null;

  const candidates = keyframes.filter((keyframe) => keyframe.frame === targetFrame);
  const preferredTrackId = preferredKeyframeId
    ? keyframes.find((keyframe) => keyframe.id === preferredKeyframeId)?.trackId
    : undefined;

  return candidates.find((keyframe) => keyframe.trackId === preferredTrackId) ?? candidates[0] ?? null;
}
