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
 * @param size - The brush size (1-20)
 * @param shape - The brush shape
 * @param cellAspectRatio - The width/height ratio of canvas cells (typically ~0.6 for monospace)
 *                          This means cells are narrower than they are tall, so we need to compensate:
 *                          - For circles: Use radiusX = radius / aspectRatio (more horizontal cells)
 *                          - For squares: Use more X cells than Y cells to appear visually square
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
  
  const radius = size / 2;
  
  // To create a visually circular shape, we need to account for cell aspect ratio
  // cellAspectRatio = cellWidth / cellHeight ≈ 0.6
  // Since cells are narrower than they are tall, we need to stretch horizontally
  // to compensate and make the circle appear round
  
  // Calculate the effective radii in each direction
  const radiusY = radius; // Vertical radius in cell units
  const radiusX = radius / cellAspectRatio; // Horizontal radius compensated for aspect ratio
  
  // Calculate bounds for the search area
  const maxX = Math.ceil(radiusX);
  const maxY = Math.ceil(radiusY);
  
  // Use ellipse equation: (x/radiusX)^2 + (y/radiusY)^2 <= 1
  for (let y = -maxY; y <= maxY; y++) {
    for (let x = -maxX; x <= maxX; x++) {
      const normalizedX = x / radiusX;
      const normalizedY = y / radiusY;
      
      // Check if this point is within the circle
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
  // Since cells are narrower than tall (aspect ratio ~0.6), we need more horizontal cells
  const halfSizeY = Math.floor((size * cellAspectRatio) / 2);
  const halfSizeX = Math.floor(size / 2);
  
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