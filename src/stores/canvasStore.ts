import { create } from 'zustand';
import type { Canvas, Cell } from '../types';
import { createCellKey } from '../types';
import { DEFAULT_CANVAS_SIZES } from '../constants';

interface CanvasState extends Canvas {
  // Canvas display settings
  canvasBackgroundColor: string;
  showGrid: boolean;
  
  // Actions
  setCanvasSize: (width: number, height: number) => void;
  setCanvasBackgroundColor: (color: string) => void;
  toggleGrid: () => void;
  setCell: (x: number, y: number, cell: Cell) => void;
  getCell: (x: number, y: number) => Cell | undefined;
  clearCell: (x: number, y: number) => void;
  clearCanvas: () => void;
  fillArea: (x: number, y: number, cell: Cell, contiguous?: boolean, matchCriteria?: { char: boolean; color: boolean; bgColor: boolean }, affectsCriteria?: { char: boolean; color: boolean; bgColor: boolean }) => void;
  setCanvasData: (cells: Map<string, Cell>) => void;
  
  // Computed values
  getCellCount: () => number;
  isEmpty: () => boolean;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // Initial state
  width: DEFAULT_CANVAS_SIZES[0].width,
  height: DEFAULT_CANVAS_SIZES[0].height,
  cells: new Map<string, Cell>(),
  canvasBackgroundColor: '#000000',
  showGrid: true,

  // Actions
  setCanvasSize: (width: number, height: number) => {
    // Enforce hard limits: 4-200 width, 4-100 height
    const constrainedWidth = Math.max(4, Math.min(200, width));
    const constrainedHeight = Math.max(4, Math.min(100, height));
    
    set((state) => {
      // Clear cells that are outside new bounds
      const newCells = new Map<string, Cell>();
      state.cells.forEach((cell, key) => {
        const [x, y] = key.split(',').map(Number);
        if (x < constrainedWidth && y < constrainedHeight) {
          newCells.set(key, cell);
        }
      });
      
      return {
        width: constrainedWidth,
        height: constrainedHeight,
        cells: newCells
      };
    });
  },

  setCanvasBackgroundColor: (color: string) => {
    set({ canvasBackgroundColor: color });
  },

  toggleGrid: () => {
    set((state) => ({ showGrid: !state.showGrid }));
  },

  setCell: (x: number, y: number, cell: Cell) => {
    const { width, height } = get();
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    
    set((state) => {
      const newCells = new Map(state.cells);
      const key = createCellKey(x, y);
      
      // If setting an empty cell with transparent background, remove it to save memory
      if (cell.char === ' ' && cell.color === '#FFFFFF' && cell.bgColor === 'transparent') {
        newCells.delete(key);
      } else {
        newCells.set(key, { ...cell });
      }
      
      return { cells: newCells };
    });
  },

  getCell: (x: number, y: number) => {
    const { cells } = get();
    const cell = cells.get(createCellKey(x, y));
    if (cell) {
      return cell;
    }
    // Return empty cell with transparent background
    return {
      char: ' ',
      color: '#FFFFFF',
      bgColor: 'transparent'
    };
  },

  clearCell: (x: number, y: number) => {
    set((state) => {
      const newCells = new Map(state.cells);
      newCells.delete(createCellKey(x, y));
      return { cells: newCells };
    });
  },

  clearCanvas: () => {
    set({ cells: new Map() });
  },

  fillArea: (startX: number, startY: number, newCell: Cell, contiguous: boolean = true, matchCriteria?: { char: boolean; color: boolean; bgColor: boolean }, affectsCriteria?: { char: boolean; color: boolean; bgColor: boolean }) => {
    const { width, height, getCell } = get();
    const fillMatchChar = matchCriteria?.char ?? true;
    const fillMatchColor = matchCriteria?.color ?? true;
    const fillMatchBgColor = matchCriteria?.bgColor ?? true;
    const affectsChar = affectsCriteria?.char ?? true;
    const affectsColor = affectsCriteria?.color ?? true;
    const affectsBgColor = affectsCriteria?.bgColor ?? true;
    
    if (!fillMatchChar && !fillMatchColor && !fillMatchBgColor) return; // nothing to match
    if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

    const targetCell = getCell(startX, startY);
    if (!targetCell) return;
    
    // Helper function to create cell respecting affects criteria
    const createAffectedCell = (existingCell: Cell): Cell => {
      return {
        char: affectsChar ? newCell.char : existingCell.char,
        color: affectsColor ? newCell.color : existingCell.color,
        bgColor: affectsBgColor ? newCell.bgColor : existingCell.bgColor
      };
    };
    
    // If applying all three properties and they match target, skip (optimization)
    if (affectsChar && affectsColor && affectsBgColor && fillMatchChar && fillMatchColor && fillMatchBgColor) {
      const affectedTarget = createAffectedCell(targetCell);
      if (
        affectedTarget.char === targetCell.char &&
        affectedTarget.color === targetCell.color &&
        affectedTarget.bgColor === targetCell.bgColor
      ) {
        return; // Same cell, no need to fill
      }
    }

    const matchesTarget = (cell: Cell) => {
      if (fillMatchChar && cell.char !== targetCell.char) return false;
      if (fillMatchColor && cell.color !== targetCell.color) return false;
      if (fillMatchBgColor && cell.bgColor !== targetCell.bgColor) return false;
      return true; // AND semantics across selected criteria
    };

    const newCells = new Map(get().cells);

    if (contiguous) {
      // Contiguous fill (original flood fill algorithm)
      const toFill: { x: number; y: number }[] = [{ x: startX, y: startY }];
      const visited = new Set<string>();

      while (toFill.length > 0) {
        const { x, y } = toFill.pop()!;
        const key = createCellKey(x, y);
        
        if (visited.has(key)) continue;
        visited.add(key);

        const currentCell = getCell(x, y);
        if (!currentCell || !targetCell) continue;
        
        if (!matchesTarget(currentCell)) continue;

        // Create cell respecting affects criteria
        const affectedCell = createAffectedCell(currentCell);

        // Set the new cell
        if (affectedCell.char === ' ' && affectedCell.color === '#FFFFFF' && affectedCell.bgColor === get().canvasBackgroundColor) {
          newCells.delete(key);
        } else {
          newCells.set(key, affectedCell);
        }
        
        // Add adjacent cells
        const adjacent = [
          { x: x - 1, y },
          { x: x + 1, y },
          { x, y: y - 1 },
          { x, y: y + 1 }
        ];

        for (const adj of adjacent) {
          if (adj.x >= 0 && adj.x < width && adj.y >= 0 && adj.y < height) {
            const adjKey = createCellKey(adj.x, adj.y);
            if (!visited.has(adjKey)) {
              toFill.push(adj);
            }
          }
        }
      }
    } else {
      // Non-contiguous fill - replace ALL matching cells on canvas
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const currentCell = getCell(x, y);
          if (currentCell && matchesTarget(currentCell)) {
            
            const key = createCellKey(x, y);
            
            // Create cell respecting affects criteria
            const affectedCell = createAffectedCell(currentCell);
            
            // Set the new cell
            if (affectedCell.char === ' ' && affectedCell.color === '#FFFFFF' && affectedCell.bgColor === get().canvasBackgroundColor) {
              newCells.delete(key);
            } else {
              newCells.set(key, affectedCell);
            }
          }
        }
      }
    }

    set({ cells: newCells });
  },

  setCanvasData: (cells: Map<string, Cell>) => {
    set({ cells: new Map(cells) });
  },

  // Computed values
  getCellCount: () => get().cells.size,
  
  isEmpty: () => get().cells.size === 0
}));
