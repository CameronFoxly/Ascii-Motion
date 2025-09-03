import { create } from 'zustand';
import type { Canvas, Cell } from '../types';
import { createCellKey } from '../types';
import { DEFAULT_CANVAS_SIZES } from '../constants';

interface CanvasState extends Canvas {
  // Actions
  setCanvasSize: (width: number, height: number) => void;
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

const createEmptyCell = (): Cell => ({
  char: ' ',
  color: '#000000',
  bgColor: '#FFFFFF'
});

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // Initial state
  width: DEFAULT_CANVAS_SIZES[0].width,
  height: DEFAULT_CANVAS_SIZES[0].height,
  cells: new Map<string, Cell>(),

  // Actions
  setCanvasSize: (width: number, height: number) => {
    set((state) => {
      // Clear cells that are outside new bounds
      const newCells = new Map<string, Cell>();
      state.cells.forEach((cell, key) => {
        const [x, y] = key.split(',').map(Number);
        if (x < width && y < height) {
          newCells.set(key, cell);
        }
      });
      
      return {
        width,
        height,
        cells: newCells
      };
    });
  },

  setCell: (x: number, y: number, cell: Cell) => {
    const { width, height } = get();
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    
    set((state) => {
      const newCells = new Map(state.cells);
      const key = createCellKey(x, y);
      
      // If setting an empty cell, remove it to save memory
      if (cell.char === ' ' && cell.color === '#000000' && cell.bgColor === '#FFFFFF') {
        newCells.delete(key);
      } else {
        newCells.set(key, { ...cell });
      }
      
      return { cells: newCells };
    });
  },

  getCell: (x: number, y: number) => {
    const { cells } = get();
    return cells.get(createCellKey(x, y)) || createEmptyCell();
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
      if (newCell.char === ' ' && newCell.color === '#000000' && newCell.bgColor === '#FFFFFF') {
        newCells.delete(key);
      } else {
        newCells.set(key, { ...newCell });
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

    set({ cells: newCells });
  },

  setCanvasData: (cells: Map<string, Cell>) => {
    set({ cells: new Map(cells) });
  },

  // Computed values
  getCellCount: () => get().cells.size,
  
  isEmpty: () => get().cells.size === 0
}));
