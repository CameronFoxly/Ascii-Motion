/**
 * useGeneratorPreview - Hook for managing generator preview generation and playback
 * 
 * Features:
 * - Debounced preview regeneration when settings change
 * - Playback controls (play/pause, scrub frames)
 * - Automatic frame advancement during playback
 * - Cleanup on unmount
 */

import { useEffect, useRef, useCallback } from 'react';
import { useGeneratorsStore } from '../stores/generatorsStore';
import { PREVIEW_DEBOUNCE_MS } from '../constants/generators';

export function useGeneratorPreview() {
  const {
    activeGenerator,
    isOpen,
    uiState,
    setPlaying,
    setPreviewFrame,
    totalPreviewFrames,
    regeneratePreview,
    isPreviewDirty
  } = useGeneratorsStore();

  // Debounce timer for preview regeneration
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Playback animation frame ID
  const playbackRafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  /**
   * Trigger debounced preview regeneration
   */
  const triggerRegeneration = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      regeneratePreview();
    }, PREVIEW_DEBOUNCE_MS);
  }, [regeneratePreview]);

  /**
   * Playback loop - advances frame based on frame duration
   */
  const playbackLoop = useCallback((timestamp: number) => {
    const state = useGeneratorsStore.getState();
    
    if (!state.uiState.isPlaying || state.totalPreviewFrames === 0) {
      playbackRafRef.current = null;
      return;
    }

    // Initialize on first frame
    if (lastFrameTimeRef.current === 0) {
      lastFrameTimeRef.current = timestamp;
    }

    const elapsed = timestamp - lastFrameTimeRef.current;
    
    // Get frame duration from the current preview frame
    const currentPreviewFrame = state.previewFrames[state.uiState.currentPreviewFrame];
    const frameDuration = currentPreviewFrame?.frameDuration || 100; // Default to 100ms if not available
    
    if (elapsed >= frameDuration) {
      const nextFrame = (state.uiState.currentPreviewFrame + 1) % state.totalPreviewFrames;
      state.setPreviewFrame(nextFrame);
      lastFrameTimeRef.current = timestamp;
    }

    playbackRafRef.current = requestAnimationFrame(playbackLoop);
  }, []); // Empty deps - we get fresh state each time via getState()

  /**
   * Start playback loop
   */
  const startPlayback = useCallback(() => {
    if (playbackRafRef.current === null && totalPreviewFrames > 0) {
      lastFrameTimeRef.current = 0;
      playbackRafRef.current = requestAnimationFrame(playbackLoop);
    }
  }, [totalPreviewFrames, playbackLoop]);

  /**
   * Stop playback loop
   */
  const stopPlayback = useCallback(() => {
    if (playbackRafRef.current !== null) {
      cancelAnimationFrame(playbackRafRef.current);
      playbackRafRef.current = null;
      lastFrameTimeRef.current = 0;
    }
  }, []);

  /**
   * Toggle playback state
   */
  const togglePlayback = useCallback(() => {
    setPlaying(!uiState.isPlaying);
  }, [uiState.isPlaying, setPlaying]);

  /**
   * Scrub to specific frame
   */
  const scrubToFrame = useCallback((frameIndex: number) => {
    // Pause playback when scrubbing
    setPlaying(false);
    setPreviewFrame(frameIndex);
  }, [setPlaying, setPreviewFrame]);

  // Handle playback state changes
  useEffect(() => {
    if (uiState.isPlaying) {
      startPlayback();
    } else {
      stopPlayback();
    }
  }, [uiState.isPlaying, startPlayback, stopPlayback]);

  // Trigger regeneration when settings change and preview is dirty
  useEffect(() => {
    if (isOpen && activeGenerator && isPreviewDirty) {
      triggerRegeneration();
    }
  }, [isOpen, activeGenerator, isPreviewDirty, triggerRegeneration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [stopPlayback]);

  return {
    isPlaying: uiState.isPlaying,
    currentFrame: uiState.currentPreviewFrame,
    totalFrames: totalPreviewFrames,
    togglePlayback,
    scrubToFrame,
    canPlay: totalPreviewFrames > 0
  };
}
