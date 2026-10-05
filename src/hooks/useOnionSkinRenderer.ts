import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAnimationStore } from '../stores/animationStore';
import { useTimelineStore } from '../stores/timelineStore';
import { useCanvasStore } from '../stores/canvasStore';
import { useCanvasContext } from '../contexts/CanvasContext';
import { useCanvasState } from './useCanvasState';
import { compositeLayersAtFrame } from '../utils/layerCompositing';
import { 
  calculateOnionSkinOpacity, 
  getOnionSkinColor 
} from '../constants/onionSkin';
import type { Cell } from '../types';
import { buildCanvasFont } from '../utils/fontStack';

/**
 * Hook for rendering onion skin layers with caching.
 * Supports both legacy frame mode and layer-compositing mode.
 *
 * In layer mode, can show:
 *  - Current layer only (default)
 *  - All layers composited
 */
export const useOnionSkinRenderer = () => {
  const onionSkin = useAnimationStore((s) => s.onionSkin);
  const currentFrameIndex = useAnimationStore((s) => s.currentFrameIndex);
  const frames = useAnimationStore((s) => s.frames);
  const isPlaying = useAnimationStore((s) => s.isPlaying);
  // PERF FIX: layers and durationFrames are read via getState()/ref instead of
  // reactive subscriptions. These values change on EVERY content frame handle drag,
  // which creates new function references for getOnionFrameData → renderOnionSkins →
  // renderCanvas → useEffect fires → full canvas repaint on every mouse move.
  //
  // Since onion skins only need the layers at paint time (not subscription time),
  // using refs is safe and eliminates the cascade entirely.
  const tlCurrentFrame = useTimelineStore((s) => s.view.currentFrame);
  const canvasWidth = useCanvasStore((s) => s.width);
  const canvasHeight = useCanvasStore((s) => s.height);
  const isLayerMode = useTimelineStore.getState().layers.length > 0;
  const layersRef = useRef(useTimelineStore.getState().layers);
  const layerGroupsRef = useRef(useTimelineStore.getState().layerGroups);
  // Keep layersRef current via non-reactive subscription
  useEffect(() => {
    const unsub = useTimelineStore.subscribe(
      (state) => state.layers,
      (newLayers) => { layersRef.current = newLayers; }
    );
    const unsubGroups = useTimelineStore.subscribe(
      (state) => state.layerGroups,
      (newGroups) => { layerGroupsRef.current = newGroups; }
    );
    return () => { unsub(); unsubGroups(); };
  }, []);
  const effectiveFrame = isLayerMode ? tlCurrentFrame : currentFrameIndex;
  // Use a ref for effectiveTotal so it doesn't trigger renderOnionSkins recreation
  const effectiveTotalRef = useRef(0);
  effectiveTotalRef.current = isLayerMode
    ? useTimelineStore.getState().config.durationFrames
    : frames.length;

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
    const scaledFontString = buildCanvasFont(scaledFontSize, fontMetrics.fontFamily);
    
    return {
      font: scaledFontString,
      textAlign: 'center' as CanvasTextAlign,
      textBaseline: 'middle' as CanvasTextBaseline
    };
  }, [fontMetrics, zoom]);

  // Generate cache key for onion skin frame
  const getCacheKey = useCallback((frameIndex: number, distance: number, isPrevious: boolean): string => {
    if (isLayerMode) {
      // In layer mode, cache by frame index + layer count + allLayers mode + active layer ID
      const activeLayerId = onionSkin.allLayers ? 'all' : (useTimelineStore.getState().view.activeLayerId ?? 'none');
      return `layer-${frameIndex}-${distance}-${isPrevious ? 'prev' : 'next'}-${zoom}-${layersRef.current.length}-${activeLayerId}`;
    }
    const frame = frames[frameIndex];
    const thumbKey = frame?.thumbnail || `frame-${frameIndex}`;
    return `${thumbKey}-${distance}-${isPrevious ? 'prev' : 'next'}-${zoom}-${effectiveCellWidth}-${effectiveCellHeight}`;
  }, [isLayerMode, onionSkin.allLayers, frames, zoom, effectiveCellWidth, effectiveCellHeight]);

  /** Get cell data for onion skin at a given frame index */
  const getOnionFrameData = useCallback((frameIndex: number): Map<string, Cell> | undefined => {
    if (isLayerMode) {
      if (onionSkin.allLayers) {
        // Composite all visible layers at this frame
        return compositeLayersAtFrame(layersRef.current, frameIndex, canvasWidth, canvasHeight, undefined, false, layerGroupsRef.current);
      } else {
        // Active layer only: composite just this layer so transforms (position,
        // scale, rotation) and group transforms are applied correctly.
        const tl = useTimelineStore.getState();
        const activeLayer = layersRef.current.find((l) => l.id === tl.view.activeLayerId);
        if (!activeLayer) return undefined;
        return compositeLayersAtFrame([activeLayer], frameIndex, canvasWidth, canvasHeight, undefined, false, layerGroupsRef.current);
      }
    } else {
      // Legacy mode: get frame data from the animation store
      const { getFrameData } = useAnimationStore.getState();
      return getFrameData(frameIndex);
    }
  }, [isLayerMode, canvasWidth, canvasHeight, onionSkin.allLayers]);

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
      const frameIndex = effectiveFrame - i;
      if (frameIndex >= 0) {
        const frameData = getOnionFrameData(frameIndex);
        if (frameData && frameData.size > 0) {
          const onionLayer = getOrCreateOnionSkinLayer(frameData, i, true, frameIndex);
          if (onionLayer) {
            ctx.drawImage(onionLayer, 0, 0);
          }
        }
      }
    }

    // Render next frames (red tinted)
    for (let i = 1; i <= onionSkin.nextFrames; i++) {
      const frameIndex = effectiveFrame + i;
      if (frameIndex < effectiveTotalRef.current) {
        const frameData = getOnionFrameData(frameIndex);
        if (frameData && frameData.size > 0) {
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
    effectiveFrame,
    getOnionFrameData,
    getOrCreateOnionSkinLayer
  ]);

  return {
    renderOnionSkins,
    clearCache,
    isOnionSkinEnabled: onionSkin.enabled && !isPlaying
  };
};
