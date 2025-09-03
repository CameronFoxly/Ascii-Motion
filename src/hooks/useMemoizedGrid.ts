import { useMemo, useCallback } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useToolStore } from '../stores/toolStore';
import type { Cell } from '../types';

interface GridCell {
  x: number;
  y: number;
  cell: Cell | undefined;
  key: string;
  isMoving: boolean;
  moveOffset?: { x: number; y: number };
}

interface MemoizedGridData {
  visibleCells: GridCell[];
  movingCells: GridCell[];
  totalCells: number;
  hasChanges: boolean;
}

interface MoveState {
  originalData: Map<string, Cell>;
  startPos: { x: number; y: number };
  baseOffset: { x: number; y: number };
  currentOffset: { x: number; y: number };
}

/**
 * Hook for memoized grid data and change detection
 * Optimizes rendering by tracking which cells actually changed
 */
export const useMemoizedGrid = (
  moveState?: MoveState | null,
  getTotalOffset?: (moveState: MoveState) => { x: number; y: number }
) => {
  const { width, height, cells, getCell } = useCanvasStore();
  const { selection } = useToolStore();

  // Memoize the set of moving cell coordinates
  const movingCellKeys = useMemo(() => {
    if (!moveState || moveState.originalData.size === 0) {
      return new Set<string>();
    }
    return new Set(moveState.originalData.keys());
  }, [moveState]);

  // Calculate move offset once
  const totalOffset = useMemo(() => {
    if (!moveState || !getTotalOffset) {
      return { x: 0, y: 0 };
    }
    return getTotalOffset(moveState);
  }, [moveState, getTotalOffset]);

  // Memoize grid data to prevent unnecessary recalculations
  const gridData = useMemo((): MemoizedGridData => {
    const visibleCells: GridCell[] = [];
    const movingCells: GridCell[] = [];

    // Process static cells (not being moved)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const key = `${x},${y}`;
        
        if (movingCellKeys.has(key)) {
          // Cell is being moved - render empty cell in original position
          visibleCells.push({
            x,
            y,
            cell: { char: ' ', color: '#000000', bgColor: '#FFFFFF' },
            key: `static_${key}`,
            isMoving: false
          });
        } else {
          // Normal cell rendering
          const cell = getCell(x, y);
          visibleCells.push({
            x,
            y,
            cell,
            key,
            isMoving: false
          });
        }
      }
    }

    // Process moving cells at their new positions
    if (moveState && moveState.originalData.size > 0) {
      moveState.originalData.forEach((cell: Cell, key: string) => {
        const [origX, origY] = key.split(',').map(Number);
        const newX = origX + totalOffset.x;
        const newY = origY + totalOffset.y;
        
        // Only include if within bounds
        if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
          movingCells.push({
            x: origX, // Original position for React key
            y: origY,
            cell,
            key: `moving_${key}`,
            isMoving: true,
            moveOffset: totalOffset
          });
        }
      });
    }

    return {
      visibleCells,
      movingCells,
      totalCells: visibleCells.length + movingCells.length,
      hasChanges: cells.size > 0 || movingCells.length > 0
    };
  }, [width, height, cells, getCell, movingCellKeys, moveState, totalOffset]);

  // Memoize selection data
  const selectionData = useMemo(() => {
    if (!selection.active) return null;

    let startX = Math.min(selection.start.x, selection.end.x);
    let startY = Math.min(selection.start.y, selection.end.y);
    let endX = Math.max(selection.start.x, selection.end.x);
    let endY = Math.max(selection.start.y, selection.end.y);

    // Adjust selection position if moving
    if (moveState) {
      startX += totalOffset.x;
      startY += totalOffset.y;
      endX += totalOffset.x;
      endY += totalOffset.y;
    }

    return {
      startX,
      startY,
      endX,
      endY,
      width: endX - startX + 1,
      height: endY - startY + 1
    };
  }, [selection, moveState, totalOffset]);

  // Performance metrics callback
  const getPerformanceMetrics = useCallback(() => {
    return {
      totalCells: width * height,
      renderedCells: gridData.totalCells,
      staticCells: gridData.visibleCells.length,
      movingCells: gridData.movingCells.length,
      memoryUsage: cells.size,
      renderEfficiency: Math.round((gridData.totalCells / (width * height)) * 100)
    };
  }, [width, height, gridData, cells.size]);

  return {
    gridData,
    selectionData,
    getPerformanceMetrics,
    totalOffset
  };
};
