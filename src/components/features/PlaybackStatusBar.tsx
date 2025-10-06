import React, { useEffect } from 'react';
import { useAnimationStore } from '../../stores/animationStore';
import { usePlaybackFpsMonitor } from '../../hooks/usePlaybackFpsMonitor';
import { useFrameCacheStore } from '../../stores/frameCacheStore';

/**
 * Playback Status Bar Component
 * 
 * Displays real-time playback FPS during animation playback.
 * PHASE 2: Also shows frame cache statistics (hit rate, cache size, memory usage)
 * Only visible when animation is playing.
 * 
 * Uses the FPS monitor hook to track actual frame transition rates
 * and displays a rolling average FPS calculation.
 */
export const PlaybackStatusBar: React.FC = () => {
  const { isPlaying, setFpsMonitorCallback } = useAnimationStore();
  const { currentFps, recordFrameChange, reset } = usePlaybackFpsMonitor();
  
  // PHASE 2: Frame cache statistics
  const { getCacheHitRate, getCacheSize, estimateMemoryUsage } = useFrameCacheStore();
  const cacheHitRate = getCacheHitRate();
  const cacheSize = getCacheSize();
  const memoryUsage = estimateMemoryUsage();
  
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
    <div className="text-xs text-muted-foreground flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span>Playback Speed:</span>
        <span className="text-foreground font-mono tabular-nums">
          {currentFps > 0 ? currentFps.toFixed(1) : '0.0'}
        </span>
        <span>fps</span>
      </div>
      
      {/* PHASE 2: Cache statistics */}
      {cacheSize > 0 && (
        <>
          <div className="flex items-center gap-2">
            <span>Cache:</span>
            <span className="text-foreground font-mono tabular-nums">
              {cacheHitRate.toFixed(0)}%
            </span>
            <span className="text-muted-foreground">hit rate</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-foreground font-mono tabular-nums">
              {cacheSize}
            </span>
            <span>frames cached</span>
          </div>
          
          {memoryUsage > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-foreground font-mono tabular-nums">
                {memoryUsage.toFixed(1)}
              </span>
              <span>MB</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

