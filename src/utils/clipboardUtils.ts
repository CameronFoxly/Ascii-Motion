/**
 * Utility functions for converting canvas selections to OS clipboard text format
 */

import type { Cell } from '../types';

/**
 * Convert a selection of canvas cells to text format for OS clipboard
 * Handles rectangular, lasso, and magic wand selections by using their bounding box
 * 
 * @param cellsData - Map of cell data with "x,y" keys
 * @param minX - Left boundary of selection
 * @param maxX - Right boundary of selection  
 * @param minY - Top boundary of selection
 * @param maxY - Bottom boundary of selection
 * @returns Text representation suitable for pasting into text editors
 */
export const selectionToText = (
  cellsData: Map<string, Cell>,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): string => {
  const lines: string[] = [];
  
  for (let y = minY; y <= maxY; y++) {
    let line = '';
    let lastCharIndex = -1;
    
    // First pass: build the full line with spaces for empty cells
    for (let x = minX; x <= maxX; x++) {
      const cellKey = `${x},${y}`;
      const cell = cellsData.get(cellKey);
      
      if (cell && cell.char && cell.char.trim() !== '') {
        // Pad with spaces up to this position if needed
        while (line.length < (x - minX)) {
          line += ' ';
        }
        line += cell.char;
        lastCharIndex = line.length - 1;
      }
    }
    
    // Second pass: crop trailing spaces (but keep spaces before characters)
    if (lastCharIndex >= 0) {
      line = line.substring(0, lastCharIndex + 1);
    } else {
      line = ''; // Empty line if no characters found
    }
    
    lines.push(line);
  }
  
  // Remove trailing empty lines
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  
  return lines.join('\n');
};

/**
 * Convert rectangular selection to text format
 */
export const rectangularSelectionToText = (
  canvasData: Map<string, Cell>,
  selection: { start: { x: number; y: number }; end: { x: number; y: number } }
): string => {
  const minX = Math.min(selection.start.x, selection.end.x);
  const maxX = Math.max(selection.start.x, selection.end.x);
  const minY = Math.min(selection.start.y, selection.end.y);
  const maxY = Math.max(selection.start.y, selection.end.y);
  
  return selectionToText(canvasData, minX, maxX, minY, maxY);
};

/**
 * Convert lasso selection to text format using bounding box
 */
export const lassoSelectionToText = (
  canvasData: Map<string, Cell>,
  selectedCells: Set<string>
): string => {
  if (selectedCells.size === 0) return '';
  
  // Find bounding box of selected cells
  const cellCoords = Array.from(selectedCells).map(key => {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
  });
  
  const minX = Math.min(...cellCoords.map(c => c.x));
  const maxX = Math.max(...cellCoords.map(c => c.x));
  const minY = Math.min(...cellCoords.map(c => c.y));
  const maxY = Math.max(...cellCoords.map(c => c.y));
  
  // Create a filtered map with only selected cells
  const selectedCellsData = new Map<string, Cell>();
  selectedCells.forEach(cellKey => {
    const cell = canvasData.get(cellKey);
    if (cell) {
      selectedCellsData.set(cellKey, cell);
    }
  });
  
  return selectionToText(selectedCellsData, minX, maxX, minY, maxY);
};

/**
 * Convert magic wand selection to text format using bounding box
 */
export const magicWandSelectionToText = (
  canvasData: Map<string, Cell>,
  selectedCells: Set<string>
): string => {
  // Magic wand selection uses the same logic as lasso selection
  return lassoSelectionToText(canvasData, selectedCells);
};

/**
 * Write text to the OS clipboard using the Clipboard API
 * Falls back gracefully if clipboard API is not available
 */
export const writeToOSClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers - this won't work in all cases
      // but provides a graceful degradation
      console.warn('Clipboard API not available');
      return false;
    }
  } catch (error) {
    console.warn('Failed to write to OS clipboard:', error);
    return false;
  }
};
