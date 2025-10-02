/**
 * Flip utility functions for horizontal and vertical content flipping
 * Supports all selection types and handles coordinate transformations
 */

import type { Cell } from '../types';

export interface FlipBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Calculate bounding box from a set of selected cells
 */
export const calculateBoundsFromCells = (selectedCells: Set<string>): FlipBounds => {
  if (selectedCells.size === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  const coords = Array.from(selectedCells).map(key => {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
  });

  return {
    minX: Math.min(...coords.map(c => c.x)),
    maxX: Math.max(...coords.map(c => c.x)),
    minY: Math.min(...coords.map(c => c.y)),
    maxY: Math.max(...coords.map(c => c.y))
  };
};

/**
 * Calculate bounding box from rectangular selection
 */
export const calculateBoundsFromSelection = (selection: { start: { x: number; y: number }; end: { x: number; y: number } }): FlipBounds => {
  return {
    minX: Math.min(selection.start.x, selection.end.x),
    maxX: Math.max(selection.start.x, selection.end.x),
    minY: Math.min(selection.start.y, selection.end.y),
    maxY: Math.max(selection.start.y, selection.end.y)
  };
};

/**
 * Calculate bounding box for full canvas
 */
export const calculateCanvasBounds = (width: number, height: number): FlipBounds => {
  return {
    minX: 0,
    maxX: width - 1,
    minY: 0,
    maxY: height - 1
  };
};

/**
 * Flip coordinates horizontally around the center of a bounding box
 */
export const flipHorizontal = (x: number, y: number, bounds: FlipBounds): { x: number; y: number } => {
  const flippedX = bounds.minX + bounds.maxX - x;
  return { x: flippedX, y };
};

/**
 * Flip coordinates vertically around the center of a bounding box
 */
export const flipVertical = (x: number, y: number, bounds: FlipBounds): { x: number; y: number } => {
  const flippedY = bounds.minY + bounds.maxY - y;
  return { x, y: flippedY };
};

/**
 * Apply horizontal flip to canvas data within specified bounds
 * Only flips cells that exist in the original data
 */
export const applyHorizontalFlip = (
  canvasData: Map<string, Cell>,
  bounds: FlipBounds,
  selectedCells?: Set<string>
): Map<string, Cell> => {
  const newCanvasData = new Map(canvasData);
  const cellsToFlip = new Map<string, Cell>();
  
  // Determine which cells to process
  const cellsInBounds = selectedCells ? 
    Array.from(selectedCells) : 
    Array.from(canvasData.keys()).filter(key => {
      const [x, y] = key.split(',').map(Number);
      return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
    });

  // Collect cells to flip (only existing cells)
  cellsInBounds.forEach(cellKey => {
    const cell = canvasData.get(cellKey);
    if (cell) {
      const [x, y] = cellKey.split(',').map(Number);
      const flipped = flipHorizontal(x, y, bounds);
      cellsToFlip.set(`${flipped.x},${flipped.y}`, { ...cell });
    }
  });

  // Clear the original positions within bounds (only for cells that existed)
  cellsInBounds.forEach(cellKey => {
    if (canvasData.has(cellKey)) {
      newCanvasData.delete(cellKey);
    }
  });

  // Place cells in their new flipped positions
  cellsToFlip.forEach((cell, newKey) => {
    newCanvasData.set(newKey, cell);
  });

  return newCanvasData;
};

/**
 * Apply vertical flip to canvas data within specified bounds
 * Only flips cells that exist in the original data
 */
export const applyVerticalFlip = (
  canvasData: Map<string, Cell>,
  bounds: FlipBounds,
  selectedCells?: Set<string>
): Map<string, Cell> => {
  const newCanvasData = new Map(canvasData);
  const cellsToFlip = new Map<string, Cell>();
  
  // Determine which cells to process
  const cellsInBounds = selectedCells ? 
    Array.from(selectedCells) : 
    Array.from(canvasData.keys()).filter(key => {
      const [x, y] = key.split(',').map(Number);
      return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
    });

  // Collect cells to flip (only existing cells)
  cellsInBounds.forEach(cellKey => {
    const cell = canvasData.get(cellKey);
    if (cell) {
      const [x, y] = cellKey.split(',').map(Number);
      const flipped = flipVertical(x, y, bounds);
      cellsToFlip.set(`${flipped.x},${flipped.y}`, { ...cell });
    }
  });

  // Clear the original positions within bounds (only for cells that existed)
  cellsInBounds.forEach(cellKey => {
    if (canvasData.has(cellKey)) {
      newCanvasData.delete(cellKey);
    }
  });

  // Place cells in their new flipped positions
  cellsToFlip.forEach((cell, newKey) => {
    newCanvasData.set(newKey, cell);
  });

  return newCanvasData;
};

/**
 * Get the active selection bounds from tool store state
 * Returns appropriate bounds based on which selection type is active
 */
export const getActiveSelectionBounds = (
  toolState: {
    selection: { active: boolean; start: { x: number; y: number }; end: { x: number; y: number } };
    lassoSelection: { active: boolean; selectedCells: Set<string> };
    magicWandSelection: { active: boolean; selectedCells: Set<string> };
  },
  canvasWidth: number,
  canvasHeight: number
): { bounds: FlipBounds; selectedCells: Set<string> | null } => {
  // Priority: Magic Wand > Lasso > Rectangular > Full Canvas
  if (toolState.magicWandSelection.active && toolState.magicWandSelection.selectedCells.size > 0) {
    return {
      bounds: calculateBoundsFromCells(toolState.magicWandSelection.selectedCells),
      selectedCells: toolState.magicWandSelection.selectedCells
    };
  }
  
  if (toolState.lassoSelection.active && toolState.lassoSelection.selectedCells.size > 0) {
    return {
      bounds: calculateBoundsFromCells(toolState.lassoSelection.selectedCells),
      selectedCells: toolState.lassoSelection.selectedCells
    };
  }
  
  if (toolState.selection.active) {
    return {
      bounds: calculateBoundsFromSelection(toolState.selection),
      selectedCells: null // Rectangular selection doesn't use selectedCells set
    };
  }
  
  // No selection - flip entire canvas
  return {
    bounds: calculateCanvasBounds(canvasWidth, canvasHeight),
    selectedCells: null
  };
};

/**
 * Transform a set of selected cell coordinates based on flip orientation.
 * Returns a new set with coordinates mapped to their flipped positions.
 */
export const transformSelectedCellsForFlip = (
  selectedCells: Set<string>,
  bounds: FlipBounds,
  orientation: 'horizontal' | 'vertical'
): Set<string> => {
  const transformed = new Set<string>();

  selectedCells.forEach((key) => {
    const [x, y] = key.split(',').map(Number);
    const flippedCoord = orientation === 'horizontal'
      ? flipHorizontal(x, y, bounds)
      : flipVertical(x, y, bounds);
    transformed.add(`${flippedCoord.x},${flippedCoord.y}`);
  });

  return transformed;
};

/**
 * Transform a lasso path based on flip orientation, returning a new path array.
 */
export const transformLassoPathForFlip = (
  path: { x: number; y: number }[],
  bounds: FlipBounds,
  orientation: 'horizontal' | 'vertical'
): { x: number; y: number }[] => {
  return path.map(point => {
    const flippedPoint = orientation === 'horizontal'
      ? flipHorizontal(point.x, point.y, bounds)
      : flipVertical(point.x, point.y, bounds);
    return { x: flippedPoint.x, y: flippedPoint.y };
  });
};