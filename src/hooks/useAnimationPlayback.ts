import { useEffect, useCallback, useRef } from 'react';
import { useAnimationStore } from '../stores/animationStore';
import { useToolStore } from '../stores/toolStore';

/**
 * Hook that manages animation playback using requestAnimationFrame
 * - Handles frame timing based on individual frame durations
 * - Controls canvas read-only mode during playback
 * - Manages playback loop and stopping conditions
 */
export const useAnimationPlayback = () => {
  const { 
    frames,
    currentFrameIndex,
    isPlaying,
    play,
    pause,
    stop
  } = useAnimationStore();
  
  const { setPlaybackMode } = useToolStore();
  
  const animationRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);
  const frameStartTimeRef = useRef<number | undefined>(undefined);

  // Calculate current playback time position
  const getCurrentPlaybackTime = useCallback(() => {
    let elapsed = 0;
    for (let i = 0; i < currentFrameIndex; i++) {
      elapsed += frames[i]?.duration || 100;
    }
    return elapsed;
  }, [frames, currentFrameIndex]);

  // Get frame at specific time
  const getFrameAtTime = useCallback((time: number) => {
    let elapsed = 0;
    for (let i = 0; i < frames.length; i++) {
      const frameDuration = frames[i]?.duration || 100;
      if (time < elapsed + frameDuration) {
        return i;
      }
      elapsed += frameDuration;
    }
    return frames.length - 1; // Return last frame if time exceeds total
  }, [frames]);

  // Animation loop function
  const animateFrame = useCallback((timestamp: number) => {
    const state = useAnimationStore.getState();
    const { frames, currentFrameIndex, isPlaying, looping, fpsMonitorCallback } = state;
    
    if (!isPlaying || frames.length === 0) {
      return;
    }

    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
      frameStartTimeRef.current = timestamp;
    }

    const currentFrame = frames[currentFrameIndex];
    if (!currentFrame) return;

    const frameElapsed = timestamp - (frameStartTimeRef.current || timestamp);
    
    // Check if current frame duration has elapsed
    if (frameElapsed >= currentFrame.duration) {
      const nextIndex = currentFrameIndex + 1;
      
      // Call FPS monitor callback when frame changes
      if (fpsMonitorCallback) {
        fpsMonitorCallback(timestamp);
      }
      
      if (nextIndex >= frames.length) {
        // End of animation
        if (looping) {
          // Loop back to first frame
          state.goToFrame(0);
          frameStartTimeRef.current = timestamp;
        } else {
          // Stop playback
          state.stop();
          return;
        }
      } else {
        // Move to next frame
        state.goToFrame(nextIndex);
        frameStartTimeRef.current = timestamp;
      }
    }

    // Continue animation if still playing
    const newState = useAnimationStore.getState();
    if (newState.isPlaying) {
      animationRef.current = requestAnimationFrame(animateFrame);
    }
  }, []); // Remove dependencies to avoid stale closures

  // Start animation playback
  const startPlayback = useCallback(() => {
    if (frames.length === 0) return;
    
    setPlaybackMode(true);
    play();
    startTimeRef.current = undefined;
    frameStartTimeRef.current = undefined;
    animationRef.current = requestAnimationFrame(animateFrame);
  }, [frames.length, setPlaybackMode, play, animateFrame]);

  // Pause animation playback
  const pausePlayback = useCallback(() => {
    pause();
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, [pause]);

  // Stop animation playback
  const stopPlayback = useCallback(() => {
    stop();
    setPlaybackMode(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    startTimeRef.current = undefined;
    frameStartTimeRef.current = undefined;
  }, [stop, setPlaybackMode]);

  // Toggle playback
  const toggleAnimationPlayback = useCallback(() => {
    if (isPlaying) {
      pausePlayback();
    } else {
      startPlayback();
    }
  }, [isPlaying, startPlayback, pausePlayback]);

  // Handle keyboard shortcuts for playback
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }

      switch (event.key) {
        case ' ': // Spacebar for play/pause
          event.preventDefault();
          toggleAnimationPlayback();
          break;
        case 'Escape': // Escape to stop
          event.preventDefault();
          if (isPlaying) {
            stopPlayback();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleAnimationPlayback, isPlaying, stopPlayback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setPlaybackMode(false);
    };
  }, [setPlaybackMode]);

  // Update playback mode when playing state changes
  useEffect(() => {
    if (!isPlaying) {
      setPlaybackMode(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [isPlaying, setPlaybackMode]);

  return {
    startPlayback,
    pausePlayback,
    stopPlayback,
    togglePlayback: toggleAnimationPlayback,
    isPlaying,
    canPlay: frames.length > 0,
    getCurrentPlaybackTime,
    getFrameAtTime
  };
};
