import React, { useCallback, useEffect } from 'react';
import { useCanvasContext } from '../../contexts/CanvasContext';
import {
  useImportTransformTool,
  type ImportTransformCursorZone,
} from '../../hooks/useImportTransformTool';
import { TransformBoundingBoxVisual } from './TransformBoundingBoxVisual';

const cursorMap: Record<ImportTransformCursorZone, string> = {
  none: 'default',
  move: 'move',
  'top-left': 'nwse-resize',
  'top-right': 'nesw-resize',
  'bottom-right': 'nwse-resize',
  'bottom-left': 'nesw-resize',
};

export const ImportTransformOverlay: React.FC = () => {
  const { canvasRef, cellWidth, cellHeight, zoom, panOffset } =
    useCanvasContext();
  const effectiveCellWidth = cellWidth * zoom;
  const effectiveCellHeight = cellHeight * zoom;
  const {
    isActive,
    corners,
    dragState,
    cursorZone,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useImportTransformTool(effectiveCellWidth, effectiveCellHeight);

  const pixelToCell = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left - panOffset.x) / effectiveCellWidth,
        y: (clientY - rect.top - panOffset.y) / effectiveCellHeight,
      };
    },
    [
      canvasRef,
      effectiveCellHeight,
      effectiveCellWidth,
      panOffset.x,
      panOffset.y,
    ],
  );

  useEffect(() => {
    if (!dragState) return;

    const onMouseMove = (event: MouseEvent) => {
      handlePointerMove(
        pixelToCell(event.clientX, event.clientY),
        event.shiftKey,
      );
    };
    const onMouseUp = () => {
      handlePointerUp();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragState, handlePointerMove, handlePointerUp, pixelToCell]);

  const onMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;

      const started = handlePointerDown(
        pixelToCell(event.clientX, event.clientY),
      );
      if (started) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [handlePointerDown, pixelToCell],
  );

  const onMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!dragState) {
        handlePointerMove(
          pixelToCell(event.clientX, event.clientY),
          event.shiftKey,
        );
      }
    },
    [dragState, handlePointerMove, pixelToCell],
  );

  if (!isActive) return null;

  const pixelCorners = corners.map((corner) => ({
    x: corner.x * effectiveCellWidth + panOffset.x,
    y: corner.y * effectiveCellHeight + panOffset.y,
  }));

  return (
    <div
      className="absolute inset-0 pointer-events-auto"
      style={{
        zIndex: 16,
        cursor: cursorMap[cursorZone],
        overflow: 'visible',
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={handlePointerUp}
    >
      <TransformBoundingBoxVisual corners={pixelCorners} />
    </div>
  );
};
