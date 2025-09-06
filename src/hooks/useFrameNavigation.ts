import { useEffect, useCallback } from 'react';
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

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle shortcuts if text tool is active and typing
      if (textToolState.isTyping) return;
      
      // Don't handle shortcuts during playback
      if (isPlaying || isPlaybackMode) return;

      // Don't handle if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }

      switch (event.key) {
        case ',':
          event.preventDefault();
          navigatePrevious();
          break;
        case '.':
          event.preventDefault();
          navigateNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [textToolState.isTyping, isPlaying, isPlaybackMode, navigateNext, navigatePrevious]);

  return {
    navigateToFrame,
    navigateNext,
    navigatePrevious,
    canNavigate: !isPlaying && !isPlaybackMode && !textToolState.isTyping,
    currentFrameIndex,
    totalFrames: frames.length
  };
};
