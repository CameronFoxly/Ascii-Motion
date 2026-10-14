/**
 * AnchorPointOverlay — visual overlay showing the anchor point crosshair
 * and motion path for the active layer when editing transform keyframes.
 *
 * Renders:
 *  - Crosshair at the current anchor point position
 *  - Small dots along the motion path (position at each frame)
 *  - Dot density reflects easing (clustered = slow, spread = fast)
 *
 * Only visible when a transform-related keyframe is being edited.
 *
 * Part of the Layer Timeline Refactor (Phase 4)
 * See: docs/LAYER_TIMELINE_REFACTOR_PLAN.md §4.4
 */

import React, { useMemo, useState, useEffect } from 'react';
import { useTimelineStore } from '../../stores/timelineStore';
import { useToolStore } from '../../stores/toolStore';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { usePlaybackOnlySnapshot } from '../../hooks/usePlaybackOnlySnapshot';
import { getPropertyValueAtFrame, getTransformAtFrame, getContentFrameAtTime, applyRotation } from '../../utils/layerCompositing';
import { MotionPathDots } from './MotionPathDots';
import type { Layer } from '../../types/timeline';

const EMPTY_LAYERS: Layer[] = [];

export const AnchorPointOverlay: React.FC = () => {
  const editingKeyframeId = useTimelineStore((s) => s.view.editingKeyframeId);
  const activeTool = useToolStore((s) => s.activeTool);

  // Track whether a property panel input is focused
  const [panelInputFocused, setPanelInputFocused] = useState(false);
  useEffect(() => {
    const handleFocusIn = () => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement && el.closest('[data-property-panel]')) {
        setPanelInputFocused(true);
      }
    };
    const handleFocusOut = () => {
      // Small delay to handle focus moving between inputs within the panel
      setTimeout(() => {
        const el = document.activeElement;
        if (!(el instanceof HTMLInputElement && el.closest('[data-property-panel]'))) {
          setPanelInputFocused(false);
        }
      }, 50);
    };
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Early bail — don't subscribe to expensive state when we won't render.
  // Show when: editing transform keyframes, OR a property panel input is focused.
  // Hide when: layer transform tool is active (it has its own overlay).
  const mightShow = (editingKeyframeId !== null || panelInputFocused) && activeTool !== 'layertransform';

  // Only subscribe to layers/frame data when we're actually going to show
  const activeLayerId = useTimelineStore((s) => mightShow ? s.view.activeLayerId : null);
  const layers = useTimelineStore((s) => mightShow ? s.layers : EMPTY_LAYERS);
  const currentFrame = useTimelineStore((s) => mightShow ? s.view.currentFrame : 0);
  const durationFrames = useTimelineStore((s) => mightShow ? s.config.durationFrames : 0);

  const { cellWidth, cellHeight, zoom, panOffset } = useCanvasContext();
  const playbackSnapshot = usePlaybackOnlySnapshot();

  const activeLayer = useMemo(
    () => layers.find((l) => l.id === activeLayerId) ?? null,
    [layers, activeLayerId],
  );

  // Check if we're editing a transform property keyframe
  const isEditingTransform = useMemo(() => {
    if (!editingKeyframeId || !activeLayer) return false;
    for (const track of activeLayer.propertyTracks) {
      if (track.keyframes.some((k) => k.id === editingKeyframeId)) {
        return track.propertyPath.startsWith('transform.');
      }
    }
    return false;
  }, [editingKeyframeId, activeLayer]);

  // Final show decision: editing a transform keyframe OR a property panel input is focused
  const shouldShow = isEditingTransform || panelInputFocused;

  // Calculate motion path points
  const motionPath = useMemo(() => {
    if (!activeLayer || !shouldShow) return [];

    const points: { x: number; y: number; frame: number }[] = [];
    for (let f = 0; f < durationFrames; f++) {
      const posX = getPropertyValueAtFrame(activeLayer, 'transform.position.x', f);
      const posY = getPropertyValueAtFrame(activeLayer, 'transform.position.y', f);
      const anchorX = getPropertyValueAtFrame(activeLayer, 'transform.anchorPoint.x', f);
      const anchorY = getPropertyValueAtFrame(activeLayer, 'transform.anchorPoint.y', f);
      points.push({ x: posX + anchorX, y: posY + anchorY, frame: f });
    }
    return points;
  }, [activeLayer, shouldShow, durationFrames]);

  // Current values
  const currentAnchor = useMemo(() => {
    if (!activeLayer) return { x: 0, y: 0 };
    return {
      x: getPropertyValueAtFrame(activeLayer, 'transform.anchorPoint.x', currentFrame),
      y: getPropertyValueAtFrame(activeLayer, 'transform.anchorPoint.y', currentFrame),
    };
  }, [activeLayer, currentFrame]);

  const currentPos = useMemo(() => {
    if (!activeLayer) return { x: 0, y: 0 };
    return {
      x: getPropertyValueAtFrame(activeLayer, 'transform.position.x', currentFrame),
      y: getPropertyValueAtFrame(activeLayer, 'transform.position.y', currentFrame),
    };
  }, [activeLayer, currentFrame]);

  if (!shouldShow || !activeLayer) return null;
  if (playbackSnapshot.isActive) return null;

  const effectiveCellWidth = cellWidth * zoom;
  const effectiveCellHeight = cellHeight * zoom;

  // Convert cell coordinates to pixel positions
  const toPixelX = (cellX: number) => cellX * effectiveCellWidth + panOffset.x;
  const toPixelY = (cellY: number) => cellY * effectiveCellHeight + panOffset.y;

  const anchorPixelX = toPixelX(currentAnchor.x + currentPos.x);
  const anchorPixelY = toPixelY(currentAnchor.y + currentPos.y);

  // Bounding box outline (same as transform tool, but 30% opacity, no handles)
  const cellAspectRatio = cellWidth && cellHeight ? cellWidth / cellHeight : 0.6;

  const boxPath = (() => {
    const contentFrame = getContentFrameAtTime(activeLayer, currentFrame);
    if (!contentFrame || contentFrame.data.size === 0) return null;

    const transform = getTransformAtFrame(activeLayer, currentFrame);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const key of contentFrame.data.keys()) {
      const [x, y] = key.split(',').map(Number);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    maxX += 1; maxY += 1;

    const forwardPt = (lx: number, ly: number) => {
      const relX = lx - transform.anchorPointX;
      const relY = ly - transform.anchorPointY;
      const scaledX = relX * transform.scaleX;
      const scaledY = relY * transform.scaleY;
      const { rotatedX, rotatedY } = applyRotation(scaledX, scaledY, transform.rotation, cellAspectRatio);
      return {
        x: rotatedX + transform.anchorPointX + transform.positionX,
        y: rotatedY + transform.anchorPointY + transform.positionY,
      };
    };

    const corners = [
      forwardPt(minX, minY), forwardPt(maxX, minY),
      forwardPt(maxX, maxY), forwardPt(minX, maxY),
    ];

    return corners
      .map((c, i) => `${i === 0 ? 'M' : 'L'} ${toPixelX(c.x)} ${toPixelY(c.y)}`)
      .join(' ') + ' Z';
  })();

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 15 }}>
      {/* Content bounding box outline (30% opacity, no handles) */}
      {boxPath && (
        <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
          <path
            d={boxPath}
            fill="none"
            stroke="rgba(147, 130, 255, 0.3)"
            strokeWidth={1.5}
            strokeDasharray="6 3"
          />
        </svg>
      )}
      {/* Motion path dots */}
      <MotionPathDots points={motionPath} currentFrame={currentFrame} toPixelX={toPixelX} toPixelY={toPixelY} />

      {/* Crosshair at current anchor point */}
      <div
        className="absolute"
        style={{
          left: anchorPixelX,
          top: anchorPixelY,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Vertical line */}
        <div className="absolute w-[1px] h-5 bg-yellow-400/80 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        {/* Horizontal line */}
        <div className="absolute w-5 h-[1px] bg-yellow-400/80 top-1/2 -translate-y-1/2 -translate-x-1/2" />
        {/* Center dot */}
        <div className="absolute w-2 h-2 rounded-full bg-yellow-400 border border-yellow-600 -translate-x-1/2 -translate-y-1/2" />
      </div>
    </div>
  );
};
