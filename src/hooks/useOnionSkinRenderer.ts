import { useCallback, useMemo, useRef } from 'react';
import { useAnimationStore } from '../stores/animationStore';
import { useCanvasContext } from '../contexts/CanvasContext';
import { useCanvasState } from './useCanvasState';
import { 
  calculateOnionSkinOpacity, 
  getOnionSkinColor 
} from '../constants/onionSkin';
import type { Cell } from '../types';

/**
 * Hook for rendering onion skin layers with caching
 * Renders previous and next frames with tinted transparency
 */
export const useOnionSkinRenderer = () => {
  const { onionSkin, getFrameData, currentFrameIndex, frames, isPlaying } = useAnimationStore();
  const { canvasRef, panOffset, fontMetrics } = useCanvasContext();
  const {
    effectiveCellWidth,
    effectiveCellHeight,
    zoom,
  } = useCanvasState();

  // Cache for rendered onion skin layers
  const onionSkinCache = useRef<Map<string, HTMLCanvasElement>>(new Map());

  // Memoize drawing styles for onion skins
  const drawingStyles = useMemo(() => {
    const scaledFontSize = fontMetrics.fontSize * zoom;
    const scaledFontString = `${scaledFontSize}px '${fontMetrics.fontFamily}', monospace`;
    
    return {
      font: scaledFontString,
      textAlign: 'center' as CanvasTextAlign,
      textBaseline: 'middle' as CanvasTextBaseline
    };
  }, [fontMetrics, zoom]);

  // Generate cache key for onion skin frame
  const getCacheKey = useCallback((frameIndex: number, distance: number, isPrevious: boolean): string => {
    const frame = frames[frameIndex];
    const thumbKey = frame?.thumbnail || `frame-${frameIndex}`;
    return `${thumbKey}-${distance}-${isPrevious ? 'prev' : 'next'}-${zoom}-${effectiveCellWidth}-${effectiveCellHeight}`;
  }, [frames, zoom, effectiveCellWidth, effectiveCellHeight]);

  // Create or get cached onion skin layer
  const getOrCreateOnionSkinLayer = useCallback((
    frameData: Map<string, Cell>,
    distance: number,
    isPrevious: boolean,
    frameIndex: number
  ): HTMLCanvasElement | null => {
    const cacheKey = getCacheKey(frameIndex, distance, isPrevious);
    
    // Check cache first
    if (onionSkinCache.current.has(cacheKey)) {
      return onionSkinCache.current.get(cacheKey)!;
    }

    const canvas = canvasRef.current;
    if (!canvas || !frameData || frameData.size === 0) return null;

    // Create new canvas for this onion skin layer
    const onionCanvas = document.createElement('canvas');
    onionCanvas.width = canvas.width;
    onionCanvas.height = canvas.height;
    const ctx = onionCanvas.getContext('2d');
    if (!ctx) return null;

    // Calculate opacity for this distance
    const maxDistance = Math.max(onionSkin.previousFrames, onionSkin.nextFrames);
    const opacity = calculateOnionSkinOpacity(distance, maxDistance);
    const tintColor = getOnionSkinColor(isPrevious, opacity);

    // Set drawing styles
    ctx.font = drawingStyles.font;
    ctx.textAlign = drawingStyles.textAlign;
    ctx.textBaseline = drawingStyles.textBaseline;

    // Render all cells in this frame with tint
    frameData.forEach((cell, cellKey) => {
      const [xStr, yStr] = cellKey.split(',');
      const x = parseInt(xStr, 10);
      const y = parseInt(yStr, 10);

      if (cell.char && cell.char !== ' ') {
        const pixelX = x * effectiveCellWidth + panOffset.x;
        const pixelY = y * effectiveCellHeight + panOffset.y;

        // Draw character with tint color
        ctx.fillStyle = tintColor;
        ctx.fillText(
          cell.char,
          pixelX + effectiveCellWidth / 2,
          pixelY + effectiveCellHeight / 2
        );
      }
    });

    // Cache the rendered layer
    onionSkinCache.current.set(cacheKey, onionCanvas);
    
    // Limit cache size to prevent memory issues
    if (onionSkinCache.current.size > 50) {
      const firstKey = onionSkinCache.current.keys().next().value;
      if (firstKey) {
        onionSkinCache.current.delete(firstKey);
      }
    }

    return onionCanvas;
  }, [
    getCacheKey,
    canvasRef,
    onionSkin.previousFrames,
    onionSkin.nextFrames,
    effectiveCellWidth,
    effectiveCellHeight,
    panOffset,
    drawingStyles
  ]);

  // Clear cache when zoom or cell dimensions change
  const clearCache = useCallback(() => {
    onionSkinCache.current.clear();
  }, []);

  // Render all onion skin layers
  const renderOnionSkins = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !onionSkin.enabled || isPlaying) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Render previous frames (blue tinted)
    for (let i = 1; i <= onionSkin.previousFrames; i++) {
      const frameIndex = currentFrameIndex - i;
      if (frameIndex >= 0) {
        const frameData = getFrameData(frameIndex);
        if (frameData) {
          const onionLayer = getOrCreateOnionSkinLayer(frameData, i, true, frameIndex);
          if (onionLayer) {
            ctx.drawImage(onionLayer, 0, 0);
          }
        }
      }
    }

    // Render next frames (red tinted)
    for (let i = 1; i <= onionSkin.nextFrames; i++) {
      const frameIndex = currentFrameIndex + i;
      if (frameIndex < frames.length) {
        const frameData = getFrameData(frameIndex);
        if (frameData) {
          const onionLayer = getOrCreateOnionSkinLayer(frameData, i, false, frameIndex);
          if (onionLayer) {
            ctx.drawImage(onionLayer, 0, 0);
          }
        }
      }
    }
  }, [
    canvasRef,
    onionSkin.enabled,
    onionSkin.previousFrames,
    onionSkin.nextFrames,
    isPlaying,
    currentFrameIndex,
    frames.length,
    getFrameData,
    getOrCreateOnionSkinLayer
  ]);

  return {
    renderOnionSkins,
    clearCache,
    isOnionSkinEnabled: onionSkin.enabled && !isPlaying
  };
};
