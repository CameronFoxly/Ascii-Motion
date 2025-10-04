import { useCallback } from 'react';
import { useAnimationStore } from '../stores/animationStore';
import { useToolStore } from '../stores/toolStore';

/**
 * Hook that manages frame navigation and keyboard shortcuts
 * - Comma (,) key for previous frame
 * - Period (.) key for next frame  
 * - Click-to-jump frame switching
 * - Respects playback mode and text tool state
 */
export const useFrameNavigation = () => {
  const { 
    currentFrameIndex, 
    frames,
    isPlaying,
    nextFrame, 
    previousFrame, 
    goToFrame 
  } = useAnimationStore();
  
  const { textToolState, isPlaybackMode } = useToolStore();

  // Navigate to specific frame
  const navigateToFrame = useCallback((frameIndex: number) => {
    if (frameIndex >= 0 && frameIndex < frames.length && !isPlaying) {
      goToFrame(frameIndex);
    }
  }, [frames.length, isPlaying, goToFrame]);

  // Navigate to next frame
  const navigateNext = useCallback(() => {
    if (!isPlaying && !isPlaybackMode) {
      const nextIndex = currentFrameIndex + 1;
      if (nextIndex < frames.length) {
        nextFrame();
      }
    }
  }, [isPlaying, isPlaybackMode, nextFrame, currentFrameIndex, frames.length]);

  // Navigate to previous frame
  const navigatePrevious = useCallback(() => {
    if (!isPlaying && !isPlaybackMode) {
      const prevIndex = currentFrameIndex - 1;
      if (prevIndex >= 0) {
        previousFrame();
      }
    }
  }, [isPlaying, isPlaybackMode, previousFrame, currentFrameIndex]);

  const navigateFirst = useCallback(() => {
    if (!isPlaying && !isPlaybackMode && frames.length > 0 && currentFrameIndex !== 0) {
      goToFrame(0);
    }
  }, [isPlaying, isPlaybackMode, frames.length, currentFrameIndex, goToFrame]);

  const navigateLast = useCallback(() => {
    const lastIndex = frames.length - 1;
    if (!isPlaying && !isPlaybackMode && lastIndex >= 0 && currentFrameIndex !== lastIndex) {
      goToFrame(lastIndex);
    }
  }, [isPlaying, isPlaybackMode, frames.length, currentFrameIndex, goToFrame]);

  return {
    navigateToFrame,
    navigateNext,
    navigatePrevious,
    navigateFirst,
    navigateLast,
    canNavigate: !isPlaying && !isPlaybackMode && !textToolState.isTyping,
    currentFrameIndex,
    totalFrames: frames.length
  };
};
