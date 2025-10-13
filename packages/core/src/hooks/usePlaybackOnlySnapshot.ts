import { useSyncExternalStore } from 'react';
import { playbackOnlyStore, type PlaybackOnlyState } from '../stores/playbackOnlyStore';

interface PlaybackSnapshot {
  isActive: boolean;
  currentFrameIndex: number;
  frames: ReadonlyArray<PlaybackOnlyState['frames'][number]>;
}

const subscribe = (listener: () => void) => playbackOnlyStore.subscribe(listener);

const getSnapshot = () => playbackOnlyStore.getSnapshot();

/**
 * Lightweight hook for observing the optimized playback store without re-rendering the full UI tree.
 * Returns only the fields required for synchronizing UI state during playback.
 */
export const usePlaybackOnlySnapshot = (): PlaybackSnapshot => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    isActive: snapshot.isActive,
    currentFrameIndex: snapshot.currentFrameIndex,
    frames: snapshot.frames,
  };
};
