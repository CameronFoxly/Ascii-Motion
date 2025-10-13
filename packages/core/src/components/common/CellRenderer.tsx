import React from 'react';
import type { Cell } from '../../types';

interface CellRendererProps {
  x: number;
  y: number;
  cell: Cell | undefined;
  cellSize: number;
  isMoving?: boolean;
  moveOffset?: { x: number; y: number };
  gridLineColor?: string;
}

/**
 * Memoized cell renderer component for optimized canvas performance
 * Only re-renders when cell content, position, or size actually changes
 */
const CellRenderer = React.memo(({ 
  x, 
  y, 
  cell, 
  cellSize, 
  isMoving = false, 
  moveOffset = { x: 0, y: 0 },
  gridLineColor = '#E5E7EB'
}: CellRendererProps) => {
  // Calculate actual render position
  const renderX = isMoving ? x + moveOffset.x : x;
  const renderY = isMoving ? y + moveOffset.y : y;
  const pixelX = renderX * cellSize;
  const pixelY = renderY * cellSize;

  // Create canvas element for this cell
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Memoized drawing function
  const drawCell = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the cell canvas
    ctx.clearRect(0, 0, cellSize, cellSize);

    // Draw background
    ctx.fillStyle = cell?.bgColor || '#FFFFFF';
    ctx.fillRect(0, 0, cellSize, cellSize);

    // Draw character if present
    if (cell?.char && cell.char !== ' ') {
      ctx.fillStyle = cell?.color || '#000000';
      ctx.font = `${cellSize - 2}px 'Courier New', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        cell.char, 
        cellSize / 2, 
        cellSize / 2
      );
    }

    // Draw grid lines
    ctx.strokeStyle = gridLineColor;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(0, 0, cellSize, cellSize);
  }, [cell, cellSize, gridLineColor]);

  // Draw when cell changes
  React.useEffect(() => {
    drawCell();
  }, [drawCell]);

  // Set canvas size when cellSize changes
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = cellSize;
    canvas.height = cellSize;
    drawCell();
  }, [cellSize, drawCell]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        left: `${pixelX}px`,
        top: `${pixelY}px`,
        width: `${cellSize}px`,
        height: `${cellSize}px`,
        pointerEvents: 'none'
      }}
      width={cellSize}
      height={cellSize}
    />
  );
});

CellRenderer.displayName = 'CellRenderer';

export default CellRenderer;
