import { useCallback, useRef, useEffect } from 'react';
import { useAnimationStore } from '../stores/animationStore';
import { useCanvasStore } from '../stores/canvasStore';
import { useCanvasContext } from '../contexts/CanvasContext';
import { useCanvasState } from './useCanvasState';
import { setupTextRendering } from '../utils/canvasTextRendering';


/**
 * Hook for managing playback frame cache using ImageBitmap
 * Provides high-performance playback by pre-rendering frames to GPU-optimized bitmaps
 */
export const usePlaybackCache = () => {
  const frameCacheRef = useRef<ImageBitmap[]>([]);
  const cacheVersionRef = useRef<number>(0);
  const { frames } = useAnimationStore();
  const { 
    width, 
    height, 
    canvasBackgroundColor
  } = useCanvasStore();
  const { fontMetrics } = useCanvasContext();
  const { canvasWidth, canvasHeight, zoom, effectiveCellWidth, effectiveCellHeight } = useCanvasState();

  /**
   * Render a single frame to an ImageBitmap
   * Must match the exact rendering of the main canvas including high-DPI scaling
   */
  const renderFrameToBitmap = useCallback(async (frameIndex: number): Promise<ImageBitmap> => {
    const frame = frames[frameIndex];
    if (!frame) {
      throw new Error(`Frame ${frameIndex} not found`);
    }

    // DEBUG: Log frame data to understand content bleeding
    console.log(`🎬 Rendering frame ${frameIndex}:`, {
      frameId: frame.id,
      frameName: frame.name,
      dataSize: frame.data.size,
      hasData: frame.data.size > 0,
      firstFewCells: Array.from(frame.data.entries()).slice(0, 3)
    });

    // Ensure fonts are loaded before rendering
    try {
      await document.fonts.ready;
      
      // Test if SF Mono is actually available
      const testCanvas = document.createElement('canvas');
      const testCtx = testCanvas.getContext('2d');
      if (testCtx) {
        // Font availability test (silent)
        testCtx.font = '12px SF Mono';
        testCtx.measureText('M');
        testCtx.font = '12px Courier New';
        testCtx.measureText('M');
      }
    } catch (e) {
      // Font loading check failed silently
    }

    // CRITICAL FIX: Create DOM-attached canvas for proper font rendering
    const tempCanvas = document.createElement('canvas');
    
    // Get device pixel ratio for high-DPI rendering (same as main canvas)
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Set canvas internal resolution with device pixel ratio (matching setupHighDPICanvas)
    tempCanvas.width = canvasWidth * devicePixelRatio;
    tempCanvas.height = canvasHeight * devicePixelRatio;
    
    // IMPORTANT: Temporarily attach to DOM for proper font rendering
    tempCanvas.style.position = 'absolute';
    tempCanvas.style.left = '-9999px'; // Hide offscreen
    tempCanvas.style.top = '-9999px';
    document.body.appendChild(tempCanvas);
    
    // CRITICAL: Set CSS size same as main canvas to match font resolution
    tempCanvas.style.width = `${canvasWidth}px`;
    tempCanvas.style.height = `${canvasHeight}px`;
    
    const ctx = tempCanvas.getContext('2d', { 
      alpha: true,
      willReadFrequently: false // Optimized for write operations
    });
    
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }

    // Scale context by device pixel ratio (same as main canvas)
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // Apply text rendering optimizations (same as main canvas)
    setupTextRendering(ctx);

    // Clear and fill background
    ctx.fillStyle = canvasBackgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Setup text rendering - use scaled font size with zoom (same as main canvas)
    // CRITICAL FIX: Create DOM canvas with EXACT same setup sequence as main canvas
    const scaledFontSize = fontMetrics.fontSize * zoom;
    const fontString = `${scaledFontSize}px '${fontMetrics.fontFamily}', monospace`;
    
    // Font setup verified - DOM canvas approach working correctly
    
    // Set font and alignment using DOM-attached canvas for consistent rendering
    ctx.font = fontString;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Render each cell from the frame
    const frameData = frame.data;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const key = `${x},${y}`;
        const cell = frameData.get(key); // Only use frame-specific data, no fallback
        
        if (!cell) continue;

        // Use effective cell dimensions (with zoom applied)
        const pixelX = Math.round(x * effectiveCellWidth);
        const pixelY = Math.round(y * effectiveCellHeight);
        const cellWidth = Math.round(effectiveCellWidth);
        const cellHeight = Math.round(effectiveCellHeight);

        // Draw background if present
        if (cell.bgColor && cell.bgColor !== 'transparent' && cell.bgColor !== canvasBackgroundColor) {
          ctx.fillStyle = cell.bgColor;
          ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
        }

        // Draw character if present and not empty (match main canvas exactly)
        if (cell.char && cell.char !== ' ') {
          ctx.fillStyle = cell.color || '#ffffff';
          // Set font properties for each character (same as main canvas)
          ctx.font = fontString;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Font verification complete
          
          // Center text within cell (same as main canvas)
          const centerX = Math.round(pixelX + cellWidth / 2);
          const centerY = Math.round(pixelY + cellHeight / 2);
          ctx.fillText(cell.char, centerX, centerY);
        }
      }
    }

    // Convert to ImageBitmap for GPU-optimized rendering
    const bitmap = await createImageBitmap(tempCanvas);
    
    // CLEANUP: Remove DOM canvas after creating bitmap
    document.body.removeChild(tempCanvas);
    
    return bitmap;
  }, [frames, width, height, canvasBackgroundColor, canvasWidth, canvasHeight, zoom, effectiveCellWidth, effectiveCellHeight, fontMetrics]);

  /**
   * Cache all frames
   */
  const cacheAllFrames = useCallback(async (
    onProgress?: (current: number, total: number) => void
  ): Promise<void> => {
    const newCache: ImageBitmap[] = [];
    
    for (let i = 0; i < frames.length; i++) {
      const bitmap = await renderFrameToBitmap(i);
      newCache.push(bitmap);
      
      if (onProgress) {
        onProgress(i + 1, frames.length);
      }
    }

    // Clean up old cache
    frameCacheRef.current.forEach(bitmap => bitmap.close());
    
    // Update cache
    frameCacheRef.current = newCache;
    cacheVersionRef.current++;
  }, [frames.length, renderFrameToBitmap]);

  /**
   * Cache a single frame (for progressive caching)
   */
  const cacheSingleFrame = useCallback(async (frameIndex: number): Promise<void> => {
    if (frameIndex < 0 || frameIndex >= frames.length) return;

    // Close old bitmap if exists
    if (frameCacheRef.current[frameIndex]) {
      frameCacheRef.current[frameIndex].close();
    }

    // Render and cache new bitmap
    const bitmap = await renderFrameToBitmap(frameIndex);
    frameCacheRef.current[frameIndex] = bitmap;
    cacheVersionRef.current++;
  }, [frames.length, renderFrameToBitmap]);

  /**
   * Clear the entire cache
   */
  const clearCache = useCallback(() => {
    frameCacheRef.current.forEach(bitmap => bitmap.close());
    frameCacheRef.current = [];
    cacheVersionRef.current++;
  }, []);

  /**
   * Check if cache is valid and complete
   */
  const isCacheValid = useCallback((): boolean => {
    return frameCacheRef.current.length === frames.length && frames.length > 0;
  }, [frames.length]);

  /**
   * Get cache status
   */
  const getCacheStatus = useCallback((): { 
    isCached: boolean; 
    cachedFrames: number; 
    totalFrames: number;
    percentage: number;
  } => {
    const cachedFrames = frameCacheRef.current.length;
    const totalFrames = frames.length;
    const percentage = totalFrames > 0 ? (cachedFrames / totalFrames) * 100 : 0;
    
    return {
      isCached: isCacheValid(),
      cachedFrames,
      totalFrames,
      percentage
    };
  }, [frames.length, isCacheValid]);

  // Invalidate cache when frame count OR frame content changes
  useEffect(() => {
    if (frameCacheRef.current.length !== frames.length) {
      clearCache();
    }
  }, [frames.length, clearCache]);

  // CRITICAL FIX: Invalidate cache when frame data changes
  // This detects when individual frame content is modified (not just count changes)
  useEffect(() => {
    // Clear cache whenever frames array reference changes
    // This happens when setFrameData is called in animationStore
    clearCache();
  }, [frames, clearCache]);

  // Invalidate cache when rendering dependencies change (typography, zoom, canvas size)
  useEffect(() => {
    clearCache(); // Force cache clear on any rendering dependency change
  }, [zoom, effectiveCellWidth, effectiveCellHeight, fontMetrics, canvasWidth, canvasHeight, clearCache]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      frameCacheRef.current.forEach(bitmap => bitmap.close());
    };
  }, []);

  return {
    frameCache: frameCacheRef.current,
    cacheVersion: cacheVersionRef.current,
    cacheAllFrames,
    cacheSingleFrame,
    clearCache,
    isCacheValid,
    getCacheStatus
  };
};
