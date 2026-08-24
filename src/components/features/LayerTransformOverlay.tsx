/**
 * LayerTransformOverlay — visual overlay for the Layer Transform tool.
 *
 * Renders:
 *  - Bounding box quad (dashed lines around the forward-transformed content)
 *  - Corner handles (filled squares at each corner)
 *  - Anchor point crosshair (yellow, matching AnchorPointOverlay style)
 *  - Motion path dots (position at each frame)
 *
 * The overlay is pointer-events-auto and captures all mouse interactions
 * for the transform tool, including areas outside the canvas element bounds.
 * This is necessary because the canvas element is sized to the grid dimensions,
 * but bounding boxes/corners/anchors can extend beyond those bounds.
 *
 * Part of the Layer Timeline Refactor (Phase 4)
 * See: docs/LAYER_TIMELINE_REFACTOR_PLAN.md §4.10
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { useTimelineStore } from '../../stores/timelineStore';
import { useToolStore } from '../../stores/toolStore';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { getPropertyValueAtFrame, getGroupPropertyValue } from '../../utils/layerCompositing';
import { useLayerTransformTool, layerTransformHandlersRef } from '../../hooks/useLayerTransformTool';
import { usePlaybackOnlySnapshot } from '../../hooks/usePlaybackOnlySnapshot';
import { cn } from '@/lib/utils';
import { TransformBoundingBoxVisual } from './TransformBoundingBoxVisual';

export const LayerTransformOverlay: React.FC = () => {
  const activeTool = useToolStore((s) => s.activeTool);
  const durationFrames = useTimelineStore((s) => s.config.durationFrames);
  const currentFrame = useTimelineStore((s) => s.view.currentFrame);

  const { canvasRef, cellWidth, cellHeight, zoom, panOffset } = useCanvasContext();
  const playbackSnapshot = usePlaybackOnlySnapshot();
  const {
    boundingBox,
    dragState,
    anchorScreenPos,
    isLocked,
    activeLayer,
    activeGroup,
    hasActiveEntity,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    cursorZone,
  } = useLayerTransformTool();

  // PERF FIX: Expose handlers to useCanvasMouseHandlers via shared ref
  // so it doesn't need to call useLayerTransformTool() itself.
  // This eliminates ~49 React hooks from the CanvasGrid render path.
  useEffect(() => {
    layerTransformHandlersRef.current = { handleMouseDown, handleMouseMove, handleMouseUp };
    return () => {
      layerTransformHandlersRef.current = { handleMouseDown: () => {}, handleMouseMove: () => {}, handleMouseUp: () => {} };
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp]);

  const isDraggingRef = useRef(false);

  const effectiveCellWidth = cellWidth * zoom;
  const effectiveCellHeight = cellHeight * zoom;

  // Convert pixel coordinates (relative to the canvas element's position)
  // to cell coordinates. Uses the canvas element's bounding rect so this
  // works even for events originating on the overlay (outside canvas bounds).
  const pixelToCell = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const adjustedX = clientX - rect.left - panOffset.x;
      const adjustedY = clientY - rect.top - panOffset.y;
      return {
        x: Math.floor(adjustedX / effectiveCellWidth),
        y: Math.floor(adjustedY / effectiveCellHeight),
      };
    },
    [canvasRef, panOffset, effectiveCellWidth, effectiveCellHeight],
  );

  // Global mousemove/mouseup during drag — allows dragging beyond overlay bounds
  useEffect(() => {
    if (!isDraggingRef.current) return;

    const onGlobalMouseMove = (e: MouseEvent) => {
      const cell = pixelToCell(e.clientX, e.clientY);
      handleMouseMove(cell.x, cell.y);
    };
    const onGlobalMouseUp = () => {
      handleMouseUp();
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', onGlobalMouseMove);
      window.removeEventListener('mouseup', onGlobalMouseUp);
    };

    window.addEventListener('mousemove', onGlobalMouseMove);
    window.addEventListener('mouseup', onGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', onGlobalMouseMove);
      window.removeEventListener('mouseup', onGlobalMouseUp);
    };
  }, [dragState, pixelToCell, handleMouseMove, handleMouseUp]);

  const onOverlayMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only handle left mouse button
      if (e.button !== 0) return;
      const cell = pixelToCell(e.clientX, e.clientY);
      handleMouseDown(cell.x, cell.y);
      isDraggingRef.current = true;
      // Prevent default to avoid text selection during drag
      e.preventDefault();
    },
    [pixelToCell, handleMouseDown],
  );

  const onOverlayMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // When not dragging, just update cursor zone via the hook
      if (!isDraggingRef.current) {
        const cell = pixelToCell(e.clientX, e.clientY);
        handleMouseMove(cell.x, cell.y);
      }
      // During drag, global listeners handle this
    },
    [pixelToCell, handleMouseMove],
  );

  // Hide during playback
  if (activeTool !== 'layertransform') return null;
  if (!hasActiveEntity) return null;
  if (playbackSnapshot.isActive) return null;

  const toPixelX = (cellX: number) => cellX * effectiveCellWidth + panOffset.x;
  const toPixelY = (cellY: number) => cellY * effectiveCellHeight + panOffset.y;

  const anchorPixelX = toPixelX(anchorScreenPos.x);
  const anchorPixelY = toPixelY(anchorScreenPos.y);

  // Motion path dots (same as AnchorPointOverlay)
  const motionPath = (() => {
    const entity = activeLayer ?? activeGroup;
    if (!entity) return [];
    const hasTransformData =
      entity.propertyTracks.some(
        (t) => t.propertyPath.startsWith('transform.') && t.keyframes.length > 0,
      ) ||
      (entity.staticProperties &&
        Object.keys(entity.staticProperties).some((k) => k.startsWith('transform.')));
    if (!hasTransformData) return [];

    const isGroupEntity = !activeLayer && !!activeGroup;
    const points: { x: number; y: number; frame: number }[] = [];
    for (let f = 0; f < durationFrames; f++) {
      const px = isGroupEntity
        ? getGroupPropertyValue(activeGroup!, 'transform.position.x', f)
        : getPropertyValueAtFrame(activeLayer!, 'transform.position.x', f);
      const py = isGroupEntity
        ? getGroupPropertyValue(activeGroup!, 'transform.position.y', f)
        : getPropertyValueAtFrame(activeLayer!, 'transform.position.y', f);
      const ax = isGroupEntity
        ? getGroupPropertyValue(activeGroup!, 'transform.anchorPoint.x', f)
        : getPropertyValueAtFrame(activeLayer!, 'transform.anchorPoint.x', f);
      const ay = isGroupEntity
        ? getGroupPropertyValue(activeGroup!, 'transform.anchorPoint.y', f)
        : getPropertyValueAtFrame(activeLayer!, 'transform.anchorPoint.y', f);
      points.push({ x: px + ax, y: py + ay, frame: f });
    }
    return points;
  })();

  // Cursor based on current zone (CSS cursor values, not Tailwind classes)
  // Rotate uses a custom SVG cursor showing a rotation arrow
  const rotateCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8' stroke='%23ffffff' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M21 3v5h-5' stroke='%23ffffff' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8' stroke='%23000000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M21 3v5h-5' stroke='%23000000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 8 8, crosshair`;
  const cursorMap: Record<string, string> = {
    move: 'move',
    scale: 'nwse-resize',
    rotate: rotateCursor,
    anchor: 'crosshair',
    none: 'default',
  };
  const cursorStyle = isLocked ? 'not-allowed' : (cursorMap[cursorZone] || 'default');

  return (
    <div
      className="absolute inset-0 pointer-events-auto"
      style={{ zIndex: 15, cursor: cursorStyle, overflow: 'visible' }}
      onMouseDown={onOverlayMouseDown}
      onMouseMove={onOverlayMouseMove}
    >
      {/* Motion path dots */}
      {motionPath.length > 1 &&
        motionPath.map((point, idx) => {
          const px = toPixelX(point.x);
          const py = toPixelY(point.y);
          const isCurrent = point.frame === currentFrame;

          return (
            <div
              key={idx}
              className={cn(
                'absolute rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none',
                isCurrent
                  ? 'w-2.5 h-2.5 bg-yellow-400 border border-yellow-600'
                  : 'w-1 h-1 bg-yellow-500/50',
              )}
              style={{ left: px, top: py }}
            />
          );
        })}

      {boundingBox && (
        <TransformBoundingBoxVisual
          corners={boundingBox.corners.map((corner) => ({
            x: toPixelX(corner.x),
            y: toPixelY(corner.y),
          }))}
          isLocked={isLocked}
        />
      )}

      {/* Anchor point crosshair */}
      <div
        className="absolute pointer-events-none"
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
