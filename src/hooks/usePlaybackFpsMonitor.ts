import { useState, useRef, useCallback } from 'react';

/**
 * Hook for monitoring real-time playback FPS during animation
 * 
 * Uses a circular buffer to track the last N frame timestamps and calculates
 * the average FPS from the deltas between consecutive frames.
 * 
 * @returns currentFps - The current measured FPS (0 when not playing)
 * @returns recordFrameChange - Function to call when a frame transition occurs
 * @returns reset - Function to reset FPS tracking
 */
export const usePlaybackFpsMonitor = () => {
  const [currentFps, setCurrentFps] = useState<number>(0);
  
  // Circular buffer for tracking frame timestamps
  const frameTimestamps = useRef<number[]>([]);
  const maxSamples = 20; // Track last 20 frames for smooth average
  
  /**
   * Record a frame change timestamp and calculate FPS
   * @param timestamp - Current timestamp from requestAnimationFrame
   */
  const recordFrameChange = useCallback((timestamp: number) => {
    const timestamps = frameTimestamps.current;
    
    // Add new timestamp
    timestamps.push(timestamp);
    
    // Keep only the last N samples (circular buffer behavior)
    if (timestamps.length > maxSamples) {
      timestamps.shift();
    }
    
    // Need at least 2 timestamps to calculate FPS
    if (timestamps.length < 2) {
      setCurrentFps(0);
      return;
    }
    
    // Calculate average time delta between frames
    let totalDelta = 0;
    for (let i = 1; i < timestamps.length; i++) {
      totalDelta += timestamps[i] - timestamps[i - 1];
    }
    
    const avgDelta = totalDelta / (timestamps.length - 1);
    
    // Convert to FPS (delta is in milliseconds)
    const fps = avgDelta > 0 ? 1000 / avgDelta : 0;
    
    setCurrentFps(fps);
  }, []);
  
  /**
   * Reset FPS tracking (call when playback stops)
   */
  const reset = useCallback(() => {
    frameTimestamps.current = [];
    setCurrentFps(0);
  }, []);
  
  return {
    currentFps,
    recordFrameChange,
    reset
  };
};
