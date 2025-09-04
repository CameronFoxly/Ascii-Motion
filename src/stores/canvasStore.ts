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
  fillArea: (x: number, y: number, cell: Cell) => void;
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
      
      // If setting an empty cell, remove it to save memory
      if (cell.char === ' ' && cell.color === '#FFFFFF' && cell.bgColor === state.canvasBackgroundColor) {
        newCells.delete(key);
      } else {
        newCells.set(key, { ...cell });
      }
      
      return { cells: newCells };
    });
  },

  getCell: (x: number, y: number) => {
    const { cells, canvasBackgroundColor } = get();
    const cell = cells.get(createCellKey(x, y));
    if (cell) {
      return cell;
    }
    // Return empty cell with current canvas background color
    return {
      char: ' ',
      color: '#FFFFFF',
      bgColor: canvasBackgroundColor
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

  fillArea: (startX: number, startY: number, newCell: Cell) => {
    const { width, height, getCell } = get();
    if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

    const targetCell = getCell(startX, startY);
    if (!targetCell) return;
    
    if (
      targetCell.char === newCell.char &&
      targetCell.color === newCell.color &&
      targetCell.bgColor === newCell.bgColor
    ) {
      return; // Same cell, no need to fill
    }

    const toFill: { x: number; y: number }[] = [{ x: startX, y: startY }];
    const visited = new Set<string>();
    const newCells = new Map(get().cells);

    while (toFill.length > 0) {
      const { x, y } = toFill.pop()!;
      const key = createCellKey(x, y);
      
      if (visited.has(key)) continue;
      visited.add(key);

      const currentCell = getCell(x, y);
      if (!currentCell || !targetCell) continue;
      
      if (
        currentCell.char !== targetCell.char ||
        currentCell.color !== targetCell.color ||
        currentCell.bgColor !== targetCell.bgColor
      ) {
        continue;
      }

        // Set the new cell
        if (newCell.char === ' ' && newCell.color === '#FFFFFF' && newCell.bgColor === get().canvasBackgroundColor) {
          newCells.delete(key);
        } else {
          newCells.set(key, { ...newCell });
        }      // Add adjacent cells
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

    set({ cells: newCells });
  },

  setCanvasData: (cells: Map<string, Cell>) => {
    set({ cells: new Map(cells) });
  },

  // Computed values
  getCellCount: () => get().cells.size,
  
  isEmpty: () => get().cells.size === 0
}));
