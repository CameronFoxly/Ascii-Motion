import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useAnimationStore } from '../../stores/animationStore';
import { useToolStore } from '../../stores/toolStore';
import { useCanvasState } from '../../hooks/useCanvasState';
import { usePlaybackCache } from '../../hooks/usePlaybackCache';
import { Progress } from '../ui/progress';

/**
 * Lightweight playback-only canvas component
 * Displays pre-cached frame bitmaps without any editing features or overlays
 * Provides massive performance improvement during animation playback
 */
export const PlaybackCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCaching, setIsCaching] = useState(false);
  const [cacheProgress, setCacheProgress] = useState(0);
  
  const { currentFrameIndex, isPlaying, frames } = useAnimationStore();
  const { isPlaybackMode } = useToolStore();
  const { canvasWidth, canvasHeight } = useCanvasState();
  const { frameCache, cacheAllFrames, getCacheStatus } = usePlaybackCache();

  /**
   * Cache frames with progress indicator
   */
  const initializeCache = useCallback(async () => {
    if (frames.length === 0) return;

    const status = getCacheStatus();
    if (status.isCached) return; // Already cached

    setIsCaching(true);
    setCacheProgress(0);

    try {
      await cacheAllFrames((current, total) => {
        setCacheProgress((current / total) * 100);
      });
    } catch (error) {
      console.error('Failed to cache frames:', error);
    } finally {
      setIsCaching(false);
      setCacheProgress(0);
    }
  }, [frames.length, getCacheStatus, cacheAllFrames]);

  /**
   * Initialize cache when entering playback mode
   */
  useEffect(() => {
    if (isPlaybackMode && !isCaching) {
      const status = getCacheStatus();
      if (!status.isCached) {
        initializeCache();
      }
    }
  }, [isPlaybackMode, isCaching, getCacheStatus, initializeCache]);

  /**
   * Render current frame from cache
   */
  useEffect(() => {
    if (!isPlaybackMode || !canvasRef.current || isCaching) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const bitmap = frameCache[currentFrameIndex];
    if (!bitmap) return;

    // Clear and draw the pre-rendered bitmap
    // The bitmap is already at the correct resolution with devicePixelRatio applied
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
  }, [isPlaybackMode, currentFrameIndex, frameCache, isCaching]);

  // Don't render if not in playback mode
  if (!isPlaybackMode && !isPlaying) return null;

  return (
    <>
      {/* Caching progress indicator */}
      {isCaching && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center">
          <div className="bg-card p-6 rounded-lg border">
            <p className="text-sm mb-2">Preparing Animation...</p>
            <Progress value={cacheProgress} className="w-64" />
            <p className="text-xs text-muted-foreground mt-2">
              Frame {Math.floor(cacheProgress * frames.length / 100)}/{frames.length}
            </p>
          </div>
        </div>
      )}

      {/* Playback canvas - only visible during playback */}
      {isPlaybackMode && !isCaching && (
        <canvas
          ref={canvasRef}
          width={canvasWidth * (window.devicePixelRatio || 1)}
          height={canvasHeight * (window.devicePixelRatio || 1)}
          className="absolute inset-0 z-50 pointer-events-none"
          style={{
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`
          }}
        />
      )}
    </>
  );
};
