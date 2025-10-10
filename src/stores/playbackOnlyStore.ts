import type { Frame } from '../types';

/**
 * Playback-only state interface - isolated from React subscriptions
 * This state is used during optimized playback to bypass component re-renders
 */
interface PlaybackOnlyStateInterface {
  isActive: boolean;
  currentFrameIndex: number;
  frames: Frame[];
  canvasRef: React.RefObject<HTMLCanvasElement> | null;
  startTime: number;
  lastFrameTime: number;
}

// Private playback state - no React subscriptions or Zustand overhead
let playbackState: PlaybackOnlyStateInterface = {
  isActive: false,
  currentFrameIndex: 0,
  frames: [],
  canvasRef: null,
  startTime: 0,
  lastFrameTime: 0,
};

/**
 * Playback-only store for direct canvas rendering during animation
 * Bypasses all React component re-renders and Zustand state subscriptions
 */
export const playbackOnlyStore = {
  /**
   * Initialize playback-only mode with current frames and canvas reference
   */
  start: (frames: Frame[], canvasRef: React.RefObject<HTMLCanvasElement>) => {
    playbackState = {
      isActive: true,
      currentFrameIndex: 0,
      frames: [...frames], // Snapshot current frames to avoid stale references
      canvasRef,
      startTime: performance.now(),
      lastFrameTime: performance.now(),
    };
  },

  /**
   * Direct frame navigation without React re-renders
   * Updates internal state and triggers direct canvas rendering
   */
  goToFrame: (index: number) => {
    if (!playbackState.isActive || index < 0 || index >= playbackState.frames.length) {
      return;
    }
    
    playbackState.currentFrameIndex = index;
    playbackState.lastFrameTime = performance.now();
    
    // Direct canvas rendering happens in directCanvasRenderer.ts
    // This is called from the optimized playback loop
  },

  /**
   * Stop playback-only mode and return to normal React rendering
   */
  stop: () => {
    playbackState.isActive = false;
  },

  /**
   * Get current playback state (read-only)
   */
  getState: (): Readonly<PlaybackOnlyStateInterface> => {
    return { ...playbackState };
  },

  /**
   * Check if playback-only mode is active
   */
  isActive: (): boolean => {
    return playbackState.isActive;
  },

  /**
   * Get current frame data for direct rendering
   */
  getCurrentFrame: (): Frame | null => {
    if (!playbackState.isActive || playbackState.currentFrameIndex >= playbackState.frames.length) {
      return null;
    }
    return playbackState.frames[playbackState.currentFrameIndex];
  },

  /**
   * Get frames array (read-only)
   */
  getFrames: (): readonly Frame[] => {
    return playbackState.frames;
  },

  /**
   * Update timing information for performance tracking
   */
  updateTiming: (timestamp: number) => {
    playbackState.lastFrameTime = timestamp;
  },
};

// Export type for external use
export type PlaybackOnlyState = PlaybackOnlyStateInterface;