/**
 * Brush utilities for calculating brush patterns with proper aspect ratio handling
 * 
 * Handles different brush shapes (circle, square, horizontal line, vertical line)
 * and accounts for cell aspect ratio to create visually accurate shapes.
 */

import type { BrushShape } from '../types';

/**
 * Calculate the cells that should be affected by a brush stroke
 * @param centerX - The x coordinate of the brush center
 * @param centerY - The y coordinate of the brush center  
 * @param size - The brush size (1-50)
 * @param shape - The brush shape
 * @param cellAspectRatio - The width/height ratio of canvas cells (typically ~0.6 for monospace)
 * @returns Array of {x, y} coordinates representing cells to affect
 */
export const calculateBrushCells = (
  centerX: number,
  centerY: number,
  size: number,
  shape: BrushShape,
  cellAspectRatio: number = 0.6
): { x: number; y: number }[] => {
  switch (shape) {
    case 'circle':
      return calculateCircleCells(centerX, centerY, size, cellAspectRatio);
    
    case 'square':
      return calculateSquareCells(centerX, centerY, size, cellAspectRatio);
    
    case 'horizontal':
      return calculateHorizontalLineCells(centerX, centerY, size);
    
    case 'vertical':
      return calculateVerticalLineCells(centerX, centerY, size);
    
    default:
      // Fallback to single cell
      return [{ x: centerX, y: centerY }];
  }
};

/**
 * Calculate cells for a circular brush, accounting for aspect ratio
 * Creates a visually circular pattern by scaling the ellipse equation
 */
const calculateCircleCells = (
  centerX: number,
  centerY: number,
  size: number,
  cellAspectRatio: number
): { x: number; y: number }[] => {
  const cells: { x: number; y: number }[] = [];
  
  // For size 1, just return the center cell
  if (size === 1) {
    return [{ x: centerX, y: centerY }];
  }
  
  const radius = Math.floor(size / 2);
  
  // Scale factors to create visually circular shape
  // Since cells are wider than they are tall, we need to compress horizontally
  const xScale = cellAspectRatio; // Compress x-axis by aspect ratio
  const yScale = 1.0; // Keep y-axis normal
  
  // Calculate the scaled radii for the ellipse equation
  const radiusX = radius / xScale;
  const radiusY = radius / yScale;
  
  // Use ellipse equation: (x/a)^2 + (y/b)^2 <= 1
  // where a = radiusX and b = radiusY
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const normalizedX = x / radiusX;
      const normalizedY = y / radiusY;
      
      if (normalizedX * normalizedX + normalizedY * normalizedY <= 1) {
        cells.push({
          x: centerX + x,
          y: centerY + y
        });
      }
    }
  }
  
  return cells;
};

/**
 * Calculate cells for a square brush, accounting for aspect ratio
 * Creates a visually square pattern by scaling the dimensions
 */
const calculateSquareCells = (
  centerX: number,
  centerY: number,
  size: number,
  cellAspectRatio: number
): { x: number; y: number }[] => {
  const cells: { x: number; y: number }[] = [];
  
  // For size 1, just return the center cell
  if (size === 1) {
    return [{ x: centerX, y: centerY }];
  }
  
  // Calculate dimensions to create visually square appearance
  // Since cells are wider than tall, we need fewer horizontal cells
  const halfSizeY = Math.floor(size / 2);
  const halfSizeX = Math.floor((size * cellAspectRatio) / 2);
  
  for (let y = -halfSizeY; y <= halfSizeY; y++) {
    for (let x = -halfSizeX; x <= halfSizeX; x++) {
      cells.push({
        x: centerX + x,
        y: centerY + y
      });
    }
  }
  
  return cells;
};

/**
 * Calculate cells for a horizontal line brush
 * Creates a horizontal line of specified length, centered on the click position
 */
const calculateHorizontalLineCells = (
  centerX: number,
  centerY: number,
  size: number
): { x: number; y: number }[] => {
  const cells: { x: number; y: number }[] = [];
  
  // For size 1, just return the center cell
  if (size === 1) {
    return [{ x: centerX, y: centerY }];
  }
  
  const halfLength = Math.floor(size / 2);
  
  for (let x = -halfLength; x <= halfLength; x++) {
    cells.push({
      x: centerX + x,
      y: centerY
    });
  }
  
  return cells;
};

/**
 * Calculate cells for a vertical line brush
 * Creates a vertical line of specified length, centered on the click position
 */
const calculateVerticalLineCells = (
  centerX: number,
  centerY: number,
  size: number
): { x: number; y: number }[] => {
  const cells: { x: number; y: number }[] = [];
  
  // For size 1, just return the center cell
  if (size === 1) {
    return [{ x: centerX, y: centerY }];
  }
  
  const halfLength = Math.floor(size / 2);
  
  for (let y = -halfLength; y <= halfLength; y++) {
    cells.push({
      x: centerX,
      y: centerY + y
    });
  }
  
  return cells;
};

/**
 * Get the display name for a brush shape
 */
export const getBrushShapeDisplayName = (shape: BrushShape): string => {
  switch (shape) {
    case 'circle':
      return 'Circle';
    case 'square':
      return 'Square';
    case 'horizontal':
      return 'Horizontal Line';
    case 'vertical':
      return 'Vertical Line';
    default:
      return 'Unknown';
  }
};

/**
 * Get the icon component name for a brush shape (for use with Lucide icons)
 */
export const getBrushShapeIcon = (shape: BrushShape): string => {
  switch (shape) {
    case 'circle':
      return 'Circle';
    case 'square':
      return 'Square';
    case 'horizontal':
      return 'Minus';
    case 'vertical':
      return 'Pipe'; // Note: may need to use a different icon if Pipe doesn't exist
    default:
      return 'Circle';
  }
};