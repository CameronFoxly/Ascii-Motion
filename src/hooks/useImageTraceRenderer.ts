/**
 * useImageTraceRenderer
 *
 * Hook for rendering the image trace overlay on the canvas.
 * Follows the same pattern as useOnionSkinRenderer — renders directly
 * onto the display canvas and is therefore excluded from exports.
 *
 * Provides two render functions:
 * - renderImageTraceBehind(): renders behind ASCII content
 * - renderImageTraceInFront(): renders in front of ASCII content
 *
 * The caller (useCanvasRenderer) invokes whichever one matches the
 * user's renderOrder setting at the appropriate point in the pipeline.
 */

import { useCallback } from 'react';
import { useImageTraceStore } from '../stores/imageTraceStore';
import { useTimelineStore } from '../stores/timelineStore';
import { useAnimationStore } from '../stores/animationStore';
import { useCanvasContext } from '../contexts/CanvasContext';
import { useCanvasState } from './useCanvasState';
import { getFrameForTimelinePosition } from '../utils/imageTraceProcessor';

export const useImageTraceRenderer = () => {
  const enabled = useImageTraceStore((s) => s.enabled);
  const source = useImageTraceStore((s) => s.source);
  const opacity = useImageTraceStore((s) => s.opacity);
  const renderOrder = useImageTraceStore((s) => s.renderOrder);
  const frameOffset = useImageTraceStore((s) => s.frameOffset);
  const position = useImageTraceStore((s) => s.position);
  const scale = useImageTraceStore((s) => s.scale);

  const { canvasRef, panOffset } = useCanvasContext();
  const { zoom } = useCanvasState();

  const isLayerMode = useTimelineStore.getState().layers.length > 0;

  /**
   * Core render function — draws the image/video frame onto the canvas
   * at the configured position, scale, and opacity.
   * Respects the canvas zoom level and pan offset.
   */
  const renderOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled || !source) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Determine the current timeline frame
    const currentFrame = isLayerMode
      ? useTimelineStore.getState().view.currentFrame
      : useAnimationStore.getState().currentFrameIndex;

    // Get the source frame for this timeline position
    const sourceCanvas = getFrameForTimelinePosition(source, currentFrame, frameOffset);
    if (!sourceCanvas) return;

    // Save context state
    ctx.save();

    // Apply opacity
    ctx.globalAlpha = opacity;

    // Apply zoom and pan offset to match the canvas coordinate system.
    // The user's position/scale values are in unzoomed pixels; we need to
    // transform them into the zoomed canvas space.
    const drawWidth = sourceCanvas.width * scale * zoom;
    const drawHeight = sourceCanvas.height * scale * zoom;
    const drawX = position.x * zoom + panOffset.x;
    const drawY = position.y * zoom + panOffset.y;

    ctx.drawImage(sourceCanvas, drawX, drawY, drawWidth, drawHeight);

    // Restore context state
    ctx.restore();
  }, [canvasRef, enabled, source, opacity, frameOffset, position, scale, isLayerMode, zoom, panOffset]);

  /**
   * Render the overlay behind ASCII content.
   * Called after grid background, before cell rendering.
   */
  const renderImageTraceBehind = useCallback(() => {
    if (renderOrder !== 'behind') return;
    renderOverlay();
  }, [renderOrder, renderOverlay]);

  /**
   * Render the overlay in front of ASCII content.
   * Called after cell rendering, before tool overlays.
   */
  const renderImageTraceInFront = useCallback(() => {
    if (renderOrder !== 'inFront') return;
    renderOverlay();
  }, [renderOrder, renderOverlay]);

  return {
    renderImageTraceBehind,
    renderImageTraceInFront,
    isImageTraceEnabled: enabled && source !== null,
  };
};
