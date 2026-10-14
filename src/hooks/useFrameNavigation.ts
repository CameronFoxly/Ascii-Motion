import { useCallback } from 'react';
import { useAnimationStore } from '../stores/animationStore';
import { useTimelineStore } from '../stores/timelineStore';
import { useToolStore } from '../stores/toolStore';

/**
 * Hook that manages frame navigation and keyboard shortcuts
 * - Comma (,) key for previous frame
 * - Period (.) key for next frame  
 * - Click-to-jump frame switching
 * - Respects playback mode and text tool state
 *
 * Dual-mode:
 *  - Timeline / layer mode (layers.length > 0): delegates to timelineStore
 *    which uses durationFrames as bounds.
 *  - Legacy frame mode: delegates to the original animationStore whose
 *    nextFrame/previousFrame/goToFrame are bounded by frames.length.
 */
export const useFrameNavigation = () => {
  // Detect which mode we're in
  const layers = useTimelineStore((s) => s.layers);
  const isLayerMode = layers.length > 0;

  // Legacy store values (used in frame mode)
  const legacyFrameIndex = useAnimationStore((s) => s.currentFrameIndex);
  const legacyFrames = useAnimationStore((s) => s.frames);
  const isPlaying = useAnimationStore((s) => s.isPlaying);

  // Timeline store values (used in timeline/layer mode)
  const tlCurrentFrame = useTimelineStore((s) => s.view.currentFrame);
  const durationFrames = useTimelineStore((s) => s.config.durationFrames);

  // Effective values based on mode
  const currentFrameIndex = isLayerMode ? tlCurrentFrame : legacyFrameIndex;
  const totalFrames = isLayerMode ? durationFrames : legacyFrames.length;

  const { textToolState, isPlaybackMode } = useToolStore();

  // Navigate to specific frame
  const navigateToFrame = useCallback((frameIndex: number) => {
    if (frameIndex >= 0 && frameIndex < totalFrames && !isPlaying) {
      if (isLayerMode) {
        useTimelineStore.getState().goToFrame(frameIndex);
      } else {
        useAnimationStore.getState().goToFrame(frameIndex);
      }
    }
  }, [totalFrames, isPlaying, isLayerMode]);

  // Navigate to next frame — respective store handles bounds + looping
  const navigateNext = useCallback(() => {
    if (!isPlaying && !isPlaybackMode) {
      if (isLayerMode) {
        useTimelineStore.getState().nextFrame();
      } else {
        useAnimationStore.getState().nextFrame();
      }
    }
  }, [isPlaying, isPlaybackMode, isLayerMode]);

  // Navigate to previous frame
  const navigatePrevious = useCallback(() => {
    if (!isPlaying && !isPlaybackMode) {
      if (isLayerMode) {
        useTimelineStore.getState().previousFrame();
      } else {
        useAnimationStore.getState().previousFrame();
      }
    }
  }, [isPlaying, isPlaybackMode, isLayerMode]);

  const navigateFirst = useCallback(() => {
    if (!isPlaying && !isPlaybackMode && totalFrames > 0 && currentFrameIndex !== 0) {
      if (isLayerMode) {
        useTimelineStore.getState().goToFrame(0);
      } else {
        useAnimationStore.getState().goToFrame(0);
      }
    }
  }, [isPlaying, isPlaybackMode, totalFrames, currentFrameIndex, isLayerMode]);

  const navigateLast = useCallback(() => {
    const lastIndex = totalFrames - 1;
    if (!isPlaying && !isPlaybackMode && lastIndex >= 0 && currentFrameIndex !== lastIndex) {
      if (isLayerMode) {
        useTimelineStore.getState().goToFrame(lastIndex);
      } else {
        useAnimationStore.getState().goToFrame(lastIndex);
      }
    }
  }, [isPlaying, isPlaybackMode, totalFrames, currentFrameIndex, isLayerMode]);

  return {
    navigateToFrame,
    navigateNext,
    navigatePrevious,
    navigateFirst,
    navigateLast,
    canNavigate: !isPlaying && !isPlaybackMode && (!textToolState.isTyping || !!textToolState.boxEdit),
    currentFrameIndex,
    totalFrames
  };
};
