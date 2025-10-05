/**
 * Box Drawing Engine - Smart character selection for ASCII Box Drawing Tool
 * 
 * This module provides the core algorithms for:
 * - Detecting connections between box drawing cells
 * - Selecting the appropriate character based on connection patterns
 * - Generating rectangles with proper corner/junction characters
 * - Adding/removing cells with automatic neighbor updates
 */

import type { Cell } from '../types';
import type { BoxDrawingStyle } from '../constants/boxDrawingStyles';
import { BOX_DRAWING_STYLES } from '../constants/boxDrawingStyles';

interface ConnectionState {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

/**
 * Get the appropriate box drawing character based on connection state
 */
export function getBoxDrawingCharacter(
  connections: ConnectionState,
  style: BoxDrawingStyle
): string {
  const { top, right, bottom, left } = connections;
  const count = [top, right, bottom, left].filter(Boolean).length;
  
  // No connections - shouldn't happen in normal usage, default to cross
  if (count === 0) {
    return style.characters.cross;
  }
  
  // Single connection - use appropriate line
  if (count === 1) {
    if (top || bottom) return style.characters.vertical;
    return style.characters.horizontal;
  }
  
  // Two connections
  if (count === 2) {
    // Straight lines
    if (top && bottom) return style.characters.vertical;
    if (left && right) return style.characters.horizontal;
    
    // Corners
    if (right && bottom) return style.characters.topLeft;
    if (left && bottom) return style.characters.topRight;
    if (right && top) return style.characters.bottomLeft;
    if (left && top) return style.characters.bottomRight;
  }
  
  // Three connections - T-junctions
  if (count === 3) {
    if (!top) return style.characters.teeTop;
    if (!right) return style.characters.teeRight;
    if (!bottom) return style.characters.teeBottom;
    if (!left) return style.characters.teeLeft;
  }
  
  // Four connections - cross
  return style.characters.cross;
}

/**
 * Check if a character is a box drawing character from any style
 */
function isBoxCharacter(char: string): boolean {
  for (const style of BOX_DRAWING_STYLES) {
    const chars = Object.values(style.characters);
    if (chars.includes(char)) return true;
  }
  return false;
}

/**
 * Detect connections for a cell at the given position
 * Checks both drawn cells and existing canvas content
 */
export function detectConnections(
  x: number,
  y: number,
  drawnCells: Set<string>,
  currentStyle: BoxDrawingStyle,
  canvasData: Map<string, Cell>
): ConnectionState {
  const hasConnection = (nx: number, ny: number): boolean => {
    const key = `${nx},${ny}`;
    
    // Check if it's a cell we've drawn in this session
    if (drawnCells.has(key)) return true;
    
    // Check if it's an existing box character on canvas
    const cell = canvasData.get(key);
    if (cell && isBoxCharacter(cell.char)) return true;
    
    return false;
  };
  
  return {
    top: hasConnection(x, y - 1),
    right: hasConnection(x + 1, y),
    bottom: hasConnection(x, y + 1),
    left: hasConnection(x - 1, y)
  };
}

/**
 * Generate a complete rectangle with proper corner and junction characters
 */
export function generateBoxRectangle(
  start: { x: number; y: number },
  end: { x: number; y: number },
  style: BoxDrawingStyle,
  canvasData: Map<string, Cell>,
  selectedColor: string,
  selectedBgColor: string
): { previewData: Map<string, Cell>; drawnCells: Set<string> } {
  const previewData = new Map<string, Cell>();
  const drawnCells = new Set<string>();
  
  const x1 = Math.min(start.x, end.x);
  const x2 = Math.max(start.x, end.x);
  const y1 = Math.min(start.y, end.y);
  const y2 = Math.max(start.y, end.y);
  
  // Draw rectangle outline
  for (let x = x1; x <= x2; x++) {
    for (let y = y1; y <= y2; y++) {
      // Only draw border cells
      const isBorder = x === x1 || x === x2 || y === y1 || y === y2;
      if (!isBorder) continue;
      
      const key = `${x},${y}`;
      drawnCells.add(key);
    }
  }
  
  // Second pass - calculate characters based on all drawn cells
  drawnCells.forEach(key => {
    const [x, y] = key.split(',').map(Number);
    const connections = detectConnections(x, y, drawnCells, style, canvasData);
    const char = getBoxDrawingCharacter(connections, style);
    
    previewData.set(key, {
      char,
      color: selectedColor,
      bgColor: selectedBgColor
    });
  });
  
  return { previewData, drawnCells };
}

/**
 * Add a box cell at the given position
 * Returns the character to use and set of affected cells (this cell + neighbors)
 */
export function addBoxCell(
  x: number,
  y: number,
  drawnCells: Set<string>,
  style: BoxDrawingStyle,
  canvasData: Map<string, Cell>,
  selectedColor: string,
  selectedBgColor: string
): { char: string; affectedCells: Set<string> } {
  const key = `${x},${y}`;
  drawnCells.add(key);
  
  // Cells that need to be recalculated (this cell + its neighbors)
  const affectedCells = new Set<string>([key]);
  
  // Add neighboring cells to affected set if they're box characters
  const neighbors = [
    { x: x, y: y - 1 }, // top
    { x: x + 1, y }, // right
    { x: x, y: y + 1 }, // bottom
    { x: x - 1, y } // left
  ];
  
  neighbors.forEach(({ x: nx, y: ny }) => {
    const nKey = `${nx},${ny}`;
    if (drawnCells.has(nKey)) {
      affectedCells.add(nKey);
    }
  });
  
  // Calculate character for this cell
  const connections = detectConnections(x, y, drawnCells, style, canvasData);
  const char = getBoxDrawingCharacter(connections, style);
  
  return { char, affectedCells };
}

/**
 * Erase a box cell at the given position
 * Returns set of affected neighbor cells that need recalculation
 */
export function eraseBoxCell(
  x: number,
  y: number,
  drawnCells: Set<string>,
  style: BoxDrawingStyle,
  canvasData: Map<string, Cell>
): Set<string> {
  const key = `${x},${y}`;
  drawnCells.delete(key);
  
  // Neighboring cells that need recalculation
  const affectedCells = new Set<string>();
  
  const neighbors = [
    { x: x, y: y - 1 },
    { x: x + 1, y },
    { x: x, y: y + 1 },
    { x: x - 1, y }
  ];
  
  neighbors.forEach(({ x: nx, y: ny }) => {
    const nKey = `${nx},${ny}`;
    if (drawnCells.has(nKey)) {
      affectedCells.add(nKey);
    }
  });
  
  return affectedCells;
}

/**
 * Get cells along a line from start to end (Bresenham's line algorithm)
 * Used for shift+click line drawing in free draw mode
 */
export function getLineCells(
  start: { x: number; y: number },
  end: { x: number; y: number }
): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = [];
  
  let x0 = start.x;
  let y0 = start.y;
  const x1 = end.x;
  const y1 = end.y;
  
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  
  while (true) {
    cells.push({ x: x0, y: y0 });
    
    if (x0 === x1 && y0 === y1) break;
    
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
  
  return cells;
}
