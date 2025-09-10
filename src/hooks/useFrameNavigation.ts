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
      nextFrame();
    }
  }, [isPlaying, isPlaybackMode, nextFrame]);

  // Navigate to previous frame
  const navigatePrevious = useCallback(() => {
    if (!isPlaying && !isPlaybackMode) {
      previousFrame();
    }
  }, [isPlaying, isPlaybackMode, previousFrame]);

  return {
    navigateToFrame,
    navigateNext,
    navigatePrevious,
    canNavigate: !isPlaying && !isPlaybackMode && !textToolState.isTyping,
    currentFrameIndex,
    totalFrames: frames.length
  };
};
