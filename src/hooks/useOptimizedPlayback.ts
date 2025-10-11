import { useCallback, useRef, useEffect } from 'react';
import { useAnimationStore } from '../stores/animationStore';
import { useToolStore } from '../stores/toolStore';
import { useCanvasContext } from '../contexts/CanvasContext';
import { useCanvasState } from '../hooks/useCanvasState';
import { useTheme } from '../contexts/ThemeContext';
import { playbackOnlyStore } from '../stores/playbackOnlyStore';
import { renderFrameDirectly, type DirectRenderSettings } from '../utils/directCanvasRenderer';

/**
 * Optimized playback hook that bypasses React component re-renders
 * Uses direct canvas rendering and isolated playback state for maximum performance
 */
export const useOptimizedPlayback = () => {
  const animationRef = useRef<number | undefined>(undefined);
  const renderSettingsRef = useRef<DirectRenderSettings | null>(null);
  
  // Get all required React context data at hook level
  const { frames } = useAnimationStore();
  const canvasContext = useCanvasContext();
  const { canvasRef } = canvasContext;
  const canvasState = useCanvasState();
  const { theme } = useTheme();
  
  /**
   * Initialize render settings from current React context
   * This captures the current visual state before starting optimized playback
   */
  const initializeRenderSettings = useCallback((): DirectRenderSettings => {
    try {
      // Use React contexts data that's already available
      
      const settings: DirectRenderSettings = {
        effectiveCellWidth: canvasState.effectiveCellWidth,
        effectiveCellHeight: canvasState.effectiveCellHeight,
        panOffset: canvasContext.panOffset,
        fontMetrics: canvasContext.fontMetrics,
        zoom: canvasContext.zoom || 1,
        theme: theme as 'light' | 'dark',
        showGrid: true, // Can be made configurable
      };
      
      return settings;
      
    } catch {
      // Fallback to safe defaults if context is unavailable
      return {
        effectiveCellWidth: 18,
        effectiveCellHeight: 18,
        panOffset: { x: 0, y: 0 },
        fontMetrics: { fontSize: 16, fontFamily: 'SF Mono, Monaco, Consolas, monospace' },
        zoom: 1,
        theme: 'dark',
        showGrid: true,
      };
    }
  }, [canvasState, canvasContext, theme]);

  /**
   * Start optimized playback mode
   * Bypasses all React component subscriptions and uses direct canvas rendering
   */
  const startOptimizedPlayback = useCallback(() => {
    if (frames.length === 0 || !canvasRef?.current) {
      return;
    }

    // Initialize render settings from current context
    const renderSettings = initializeRenderSettings();
    renderSettingsRef.current = renderSettings;
    
    // Initialize playback-only store with snapshot of current frames
    playbackOnlyStore.start(frames, canvasRef as React.RefObject<HTMLCanvasElement>);
    
    // Need to set the tool playback mode so UI shows as playing
    const { setPlaybackMode } = useToolStore.getState();
    const { play } = useAnimationStore.getState();
    setPlaybackMode(true);
    play();
    
    // Render the initial frame immediately
    renderFrameDirectly(
      frames[0],
      canvasRef as React.RefObject<HTMLCanvasElement>,
      renderSettingsRef.current!
    );
    
    // Direct playback loop - no React component updates!
    let currentIndex = 0;
    let lastFrameTime = performance.now();
    
  const playbackLoop = (timestamp: number) => {
      // Check if playback is still active
      if (!playbackOnlyStore.isActive()) {
        return;
      }
      
      const currentFrame = frames[currentIndex];
      if (!currentFrame) {
        stopOptimizedPlayback();
        return;
      }

      const elapsed = timestamp - lastFrameTime;
      
      // Check if current frame duration has elapsed
      if (elapsed >= currentFrame.duration) {
        const atLastFrame = currentIndex === frames.length - 1;
        if (atLastFrame) {
          const { looping, fpsMonitorCallback } = useAnimationStore.getState();
          if (looping) {
            currentIndex = 0; // wrap to first frame
            playbackOnlyStore.goToFrame(currentIndex);
            renderFrameDirectly(
              frames[currentIndex],
              canvasRef as React.RefObject<HTMLCanvasElement>,
              renderSettingsRef.current!
            );
            lastFrameTime = timestamp;
            if (fpsMonitorCallback) fpsMonitorCallback(timestamp);
          } else {
            // Non-looping: stop playback after last frame duration elapses, preserving last frame
            if (fpsMonitorCallback) fpsMonitorCallback(timestamp);
            stopOptimizedPlayback({ preserveFrameIndex: true, frameIndex: currentIndex });
            return; // Exit without scheduling next frame
          }
        } else {
          currentIndex += 1;
          playbackOnlyStore.goToFrame(currentIndex);
          renderFrameDirectly(
            frames[currentIndex],
            canvasRef as React.RefObject<HTMLCanvasElement>,
            renderSettingsRef.current!
          );
          lastFrameTime = timestamp;
          const { fpsMonitorCallback } = useAnimationStore.getState();
          if (fpsMonitorCallback) fpsMonitorCallback(timestamp);
        }
      }
      
      // Continue animation loop
      animationRef.current = requestAnimationFrame(playbackLoop);
    };
    
    // Start the loop
    animationRef.current = requestAnimationFrame(playbackLoop);
    
  }, [frames, canvasRef, initializeRenderSettings]);

  /**
   * Stop optimized playback and return to normal React rendering
   * Syncs the final frame state back to the main animation store
   */
  const stopOptimizedPlayback = useCallback((options?: { preserveFrameIndex?: boolean; frameIndex?: number }) => {
    const preserve = options?.preserveFrameIndex;
    const overrideIndex = options?.frameIndex;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }

    const finalState = playbackOnlyStore.getState();
    const finalIndex = overrideIndex !== undefined ? overrideIndex : finalState.currentFrameIndex;

    playbackOnlyStore.stop();

    const { setPlaybackMode } = useToolStore.getState();
    setPlaybackMode(false);

    if (preserve) {
      // Use pause semantics to avoid resetting to frame 0
      const { pause } = useAnimationStore.getState();
      pause();
      useAnimationStore.getState().goToFrame(finalIndex);
    } else {
      const { stop } = useAnimationStore.getState();
      stop();
    }

    renderSettingsRef.current = null;
  }, []);

  /**
   * Toggle between optimized playback and normal React-based playback
   */
  const toggleOptimizedPlayback = useCallback(() => {
    if (playbackOnlyStore.isActive()) {
      stopOptimizedPlayback();
    } else {
      startOptimizedPlayback();
    }
  }, [startOptimizedPlayback, stopOptimizedPlayback]);

  /**
   * Check if optimized playback is currently active
   */
  const isOptimizedPlaybackActive = useCallback(() => {
    return playbackOnlyStore.isActive();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopOptimizedPlayback();
    };
  }, [stopOptimizedPlayback]);

  return {
    startOptimizedPlayback,
    stopOptimizedPlayback,
    toggleOptimizedPlayback,
    isOptimizedPlaybackActive,
    canPlay: frames.length > 0,
  };
};