/**
 * Utility functions for converting canvas selections to OS clipboard text format
 */

import type { Cell } from '../types';
import { getBoundsFromMask } from './selectionUtils';

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
export const maskToText = (
  canvasData: Map<string, Cell>,
  mask: Set<string>
): string => {
  if (mask.size === 0) {
    return '';
  }

  const bounds = getBoundsFromMask(mask);
  if (!bounds) {
    return '';
  }

  const rowMap = new Map<number, { selected: Set<number>; minX: number; maxX: number }>();

  mask.forEach((key) => {
    const [x, y] = key.split(',').map(Number);
    const row = rowMap.get(y);
    if (row) {
      row.selected.add(x);
      row.minX = Math.min(row.minX, x);
      row.maxX = Math.max(row.maxX, x);
    } else {
      rowMap.set(y, {
        selected: new Set([x]),
        minX: x,
        maxX: x,
      });
    }
  });

  const lines: string[] = [];

  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    const row = rowMap.get(y);
    if (!row) {
      // Preserve vertical gaps with empty line (will be cropped at end if trailing)
      lines.push('');
      continue;
    }

    let line = '';
    for (let x = row.minX; x <= row.maxX; x++) {
      if (row.selected.has(x)) {
        const cell = canvasData.get(`${x},${y}`);
        line += cell?.char ?? ' ';
      } else {
        // Internal hole within selection row
        line += ' ';
      }
    }

    // Trim trailing blanks so exported text has no trailing whitespace
    line = line.replace(/\s+$/, '');
    lines.push(line);
  }

  // Remove trailing empty lines to avoid extra newlines
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
  selectedCells: Set<string>
): string => {
  return maskToText(canvasData, selectedCells);
};

/**
 * Convert lasso selection to text format using bounding box
 */
export const lassoSelectionToText = (
  canvasData: Map<string, Cell>,
  selectedCells: Set<string>
): string => {
  return maskToText(canvasData, selectedCells);
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
