import React, { useEffect } from 'react';
import { useAnimationStore } from '../../stores/animationStore';
import { usePlaybackFpsMonitor } from '../../hooks/usePlaybackFpsMonitor';

/**
 * Playback Status Bar Component
 * 
 * Displays real-time playback FPS during animation playback.
 * Only visible when animation is playing.
 * 
 * Uses the FPS monitor hook to track actual frame transition rates
 * and displays a rolling average FPS calculation.
 */
export const PlaybackStatusBar: React.FC = () => {
  const { isPlaying, setFpsMonitorCallback } = useAnimationStore();
  const { currentFps, recordFrameChange, reset } = usePlaybackFpsMonitor();
  
  // Register FPS callback with animation store when component mounts
  useEffect(() => {
    if (isPlaying) {
      setFpsMonitorCallback(recordFrameChange);
    } else {
      setFpsMonitorCallback(undefined);
      reset();
    }
    
    return () => {
      setFpsMonitorCallback(undefined);
    };
  }, [isPlaying, recordFrameChange, reset, setFpsMonitorCallback]);
  
  // Don't render if not playing
  if (!isPlaying) {
    return null;
  }
  
  return (
    <div className="text-xs text-muted-foreground flex items-center gap-2">
      <span>Playback Speed:</span>
      <span className="text-foreground font-mono tabular-nums">
        {currentFps > 0 ? currentFps.toFixed(1) : '0.0'}
      </span>
      <span>fps</span>
    </div>
  );
};
