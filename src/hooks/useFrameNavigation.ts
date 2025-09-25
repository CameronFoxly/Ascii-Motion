import { useCallback } from 'react';
import { useAnimationStore } from '../stores/animationStore';
import { useToolStore } from '../stores/toolStore';
import type { NavigateFrameHistoryAction } from '../types';

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
  
  const { textToolState, isPlaybackMode, pushToHistory } = useToolStore();

  // Helper function to record frame navigation in history
  const recordFrameNavigation = useCallback((newFrameIndex: number, description: string) => {
    if (newFrameIndex === currentFrameIndex) return; // No change, no history record needed
    
    const historyAction: NavigateFrameHistoryAction = {
      type: 'navigate_frame',
      timestamp: Date.now(),
      description,
      data: {
        previousFrameIndex: currentFrameIndex,
        newFrameIndex
      }
    };
    
    pushToHistory(historyAction);
  }, [currentFrameIndex, pushToHistory]);

  // Navigate to specific frame
  const navigateToFrame = useCallback((frameIndex: number) => {
    if (frameIndex >= 0 && frameIndex < frames.length && !isPlaying) {
      goToFrame(frameIndex);
      recordFrameNavigation(frameIndex, `Navigate to frame ${frameIndex + 1}`);
    }
  }, [frames.length, isPlaying, goToFrame, recordFrameNavigation]);

  // Navigate to next frame
  const navigateNext = useCallback(() => {
    if (!isPlaying && !isPlaybackMode) {
      const nextIndex = currentFrameIndex + 1;
      if (nextIndex < frames.length) {
        nextFrame();
        recordFrameNavigation(nextIndex, `Navigate to next frame (${nextIndex + 1})`);
      }
    }
  }, [isPlaying, isPlaybackMode, nextFrame, currentFrameIndex, frames.length, recordFrameNavigation]);

  // Navigate to previous frame
  const navigatePrevious = useCallback(() => {
    if (!isPlaying && !isPlaybackMode) {
      const prevIndex = currentFrameIndex - 1;
      if (prevIndex >= 0) {
        previousFrame();
        recordFrameNavigation(prevIndex, `Navigate to previous frame (${prevIndex + 1})`);
      }
    }
  }, [isPlaying, isPlaybackMode, previousFrame, currentFrameIndex, recordFrameNavigation]);

  return {
    navigateToFrame,
    navigateNext,
    navigatePrevious,
    canNavigate: !isPlaying && !isPlaybackMode && !textToolState.isTyping,
    currentFrameIndex,
    totalFrames: frames.length
  };
};
