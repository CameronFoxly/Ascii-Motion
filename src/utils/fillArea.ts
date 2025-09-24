import type { Cell } from '../types';
import { createCellKey } from '../types';

export interface FillAreaOptions {
  startX: number;
  startY: number;
  canvasWidth: number;
  canvasHeight: number;
  getCell: (x: number, y: number) => Cell | undefined;
  contiguous: boolean;
  matchCriteria: {
    char: boolean;
    color: boolean;
    bgColor: boolean;
  };
}

/**
 * Find all cells that should be affected by a fill operation
 * Returns a Set of cell keys that match the criteria
 * 
 * This function reuses the same logic as the paint bucket tool but returns
 * the affected area instead of directly modifying cells
 */
export const findFillArea = (options: FillAreaOptions): Set<string> => {
  const { 
    startX, 
    startY, 
    canvasWidth, 
    canvasHeight, 
    getCell, 
    contiguous, 
    matchCriteria 
  } = options;

  const { char: fillMatchChar, color: fillMatchColor, bgColor: fillMatchBgColor } = matchCriteria;
  
  // Validation
  if (!fillMatchChar && !fillMatchColor && !fillMatchBgColor) {
    return new Set(); // nothing to match
  }
  
  if (startX < 0 || startX >= canvasWidth || startY < 0 || startY >= canvasHeight) {
    return new Set(); // out of bounds
  }

  const targetCell = getCell(startX, startY);
  if (!targetCell) return new Set();

  // Function to check if a cell matches the target based on criteria
  const matchesTarget = (cell: Cell): boolean => {
    if (fillMatchChar && cell.char !== targetCell.char) return false;
    if (fillMatchColor && cell.color !== targetCell.color) return false;
    if (fillMatchBgColor && cell.bgColor !== targetCell.bgColor) return false;
    return true; // AND semantics across selected criteria
  };

  const fillArea = new Set<string>();

  if (contiguous) {
    // Contiguous fill - flood fill algorithm
    const toFill: { x: number; y: number }[] = [{ x: startX, y: startY }];
    const visited = new Set<string>();

    while (toFill.length > 0) {
      const { x, y } = toFill.pop()!;
      const key = createCellKey(x, y);
      
      if (visited.has(key)) continue;
      visited.add(key);

      const currentCell = getCell(x, y);
      if (!currentCell) continue;
      
      if (!matchesTarget(currentCell)) continue;

      // Add this cell to fill area
      fillArea.add(key);
      
      // Add adjacent cells to check
      const adjacent = [
        { x: x - 1, y },
        { x: x + 1, y },
        { x, y: y - 1 },
        { x, y: y + 1 }
      ];

      for (const adj of adjacent) {
        if (adj.x >= 0 && adj.x < canvasWidth && adj.y >= 0 && adj.y < canvasHeight) {
          const adjKey = createCellKey(adj.x, adj.y);
          if (!visited.has(adjKey)) {
            toFill.push(adj);
          }
        }
      }
    }
  } else {
    // Non-contiguous fill - find ALL matching cells on canvas
    for (let y = 0; y < canvasHeight; y++) {
      for (let x = 0; x < canvasWidth; x++) {
        const currentCell = getCell(x, y);
        if (currentCell && matchesTarget(currentCell)) {
          const key = createCellKey(x, y);
          fillArea.add(key);
        }
      }
    }
  }

  return fillArea;
};

/**
 * Helper function to get fill area for gradient operations
 * Integrates with canvas store and gradient store
 */
export const getGradientFillArea = (
  startX: number,
  startY: number,
  canvasStore: {
    width: number;
    height: number;
    getCell: (x: number, y: number) => Cell | undefined;
  },
  gradientStore: {
    contiguous: boolean;
    matchChar: boolean;
    matchColor: boolean;
    matchBgColor: boolean;
  }
): Set<string> => {
  return findFillArea({
    startX,
    startY,
    canvasWidth: canvasStore.width,
    canvasHeight: canvasStore.height,
    getCell: canvasStore.getCell,
    contiguous: gradientStore.contiguous,
    matchCriteria: {
      char: gradientStore.matchChar,
      color: gradientStore.matchColor,
      bgColor: gradientStore.matchBgColor,
    },
  });
};