import type { Cell, GradientDefinition, GradientProperty, GradientStop } from '../types';

export interface GradientPoint {
  x: number;
  y: number;
}

export interface GradientOptions {
  startPoint: GradientPoint;
  endPoint: GradientPoint;
  definition: GradientDefinition;
  fillArea: Set<string>; // Cell keys to apply gradient to
}

/**
 * Core gradient calculation function
 * Applies gradient to a set of cell positions based on gradient definition
 */
export const calculateGradientCells = (options: GradientOptions): Map<string, Cell> => {
  const { startPoint, endPoint, definition, fillArea } = options;
  const result = new Map<string, Cell>();
  
  fillArea.forEach(cellKey => {
    const [x, y] = cellKey.split(',').map(Number);
    const position = calculatePositionOnGradient(x, y, startPoint, endPoint, definition.type);
    
    const gradientCell: Cell = {
      char: definition.character.enabled ? 
        sampleGradientProperty(position, definition.character) : ' ',
      color: definition.textColor.enabled ? 
        sampleGradientProperty(position, definition.textColor) : '#FFFFFF',
      bgColor: definition.backgroundColor.enabled ? 
        sampleGradientProperty(position, definition.backgroundColor) : 'transparent'
    };
    
    result.set(cellKey, gradientCell);
  });
  
  return result;
};

/**
 * Calculate position along gradient (0-1) for a given point
 */
const calculatePositionOnGradient = (
  x: number, 
  y: number, 
  start: GradientPoint, 
  end: GradientPoint, 
  type: 'linear' | 'radial'
): number => {
  if (type === 'linear') {
    // Project point onto line and calculate 0-1 position
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return 0;
    
    const dot = (x - start.x) * dx + (y - start.y) * dy;
    return Math.max(0, Math.min(1, dot / (length * length)));
  } else {
    // Radial: distance from start point, normalized by end point distance
    const distToStart = Math.sqrt((x - start.x) ** 2 + (y - start.y) ** 2);
    const maxRadius = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
    
    return maxRadius === 0 ? 0 : Math.min(1, distToStart / maxRadius);
  }
};

/**
 * Interpolate property value at given position based on stops and interpolation method
 */
export const sampleGradientProperty = (position: number, property: GradientProperty): string => {
  const { stops, interpolation } = property;
  
  if (stops.length === 0) return '';
  if (stops.length === 1) return stops[0].value;
  
  // Sort stops by position
  const sortedStops = [...stops].sort((a, b) => a.position - b.position);
  
  // Find surrounding stops
  let leftStop = sortedStops[0];
  let rightStop = sortedStops[sortedStops.length - 1];
  
  // Find the stops that bracket our position
  for (let i = 0; i < sortedStops.length - 1; i++) {
    if (position >= sortedStops[i].position && position <= sortedStops[i + 1].position) {
      leftStop = sortedStops[i];
      rightStop = sortedStops[i + 1];
      break;
    }
  }
  
  // If position is before first stop, use first stop
  if (position <= sortedStops[0].position) {
    return sortedStops[0].value;
  }
  
  // If position is after last stop, use last stop
  if (position >= sortedStops[sortedStops.length - 1].position) {
    return sortedStops[sortedStops.length - 1].value;
  }
  
  switch (interpolation) {
    case 'constant':
      return leftStop.value;
    case 'linear':
      return interpolateLinear(position, leftStop, rightStop);
    case 'bayer2x2':
    case 'bayer4x4':
      return applyBayerDither(position, leftStop, rightStop, interpolation);
    case 'noise':
      return applyNoiseDither(position, leftStop, rightStop);
    default:
      return leftStop.value;
  }
};

/**
 * Linear interpolation between two stops
 */
const interpolateLinear = (position: number, left: GradientStop, right: GradientStop): string => {
  if (left.position === right.position) return left.value;
  
  const t = (position - left.position) / (right.position - left.position);
  
  // Character interpolation (Unicode code point blending)
  if (left.value.length === 1 && right.value.length === 1) {
    const leftCode = left.value.charCodeAt(0);
    const rightCode = right.value.charCodeAt(0);
    const interpolatedCode = Math.round(leftCode + t * (rightCode - leftCode));
    return String.fromCharCode(interpolatedCode);
  }
  
  // Color interpolation (hex colors)
  if (left.value.startsWith('#') && right.value.startsWith('#')) {
    return interpolateColor(left.value, right.value, t);
  }
  
  // Fallback: step interpolation
  return t < 0.5 ? left.value : right.value;
};

/**
 * Color interpolation helper
 */
const interpolateColor = (color1: string, color2: string, t: number): string => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return color1;
  
  const r = Math.round(rgb1.r + t * (rgb2.r - rgb1.r));
  const g = Math.round(rgb1.g + t * (rgb2.g - rgb1.g));
  const b = Math.round(rgb1.b + t * (rgb2.b - rgb1.b));
  
  return rgbToHex(r, g, b);
};

/**
 * Bayer dithering implementation
 * Creates ordered dithering patterns using only the stop values
 */
const applyBayerDither = (
  position: number, 
  left: GradientStop, 
  right: GradientStop, 
  method: 'bayer2x2' | 'bayer4x4'
): string => {
  // Bayer matrices for ordered dithering
  const bayer2x2 = [
    [0, 2],
    [3, 1]
  ];
  
  const bayer4x4 = [
    [0,  8,  2,  10],
    [12, 4,  14, 6],
    [3,  11, 1,  9],
    [15, 7,  13, 5]
  ];
  
  const matrix = method === 'bayer2x2' ? bayer2x2 : bayer4x4;
  const matrixSize = matrix.length;
  const maxValue = matrixSize * matrixSize;
  
  // Use position to determine matrix coordinates
  // This creates a consistent pattern across the gradient
  const positionScaled = Math.floor(position * 1000); // Scale for better distribution
  const matrixX = positionScaled % matrixSize;
  const matrixY = Math.floor(positionScaled / matrixSize) % matrixSize;
  
  const threshold = matrix[matrixY][matrixX] / maxValue;
  
  // Compare position against threshold to choose between left and right values
  return (position + threshold * 0.5) < 0.5 ? left.value : right.value;
};

/**
 * Noise-based dithering implementation
 * Uses position-based pseudo-random for consistent results
 */
const applyNoiseDither = (position: number, left: GradientStop, right: GradientStop): string => {
  // Create pseudo-random noise based on position for consistency
  const noise1 = Math.sin(position * 12.9898) * 43758.5453;
  const noise2 = Math.sin(position * 78.233) * 25643.2831;
  const noise = ((noise1 - Math.floor(noise1)) + (noise2 - Math.floor(noise2))) / 2;
  
  // Add noise to position for threshold comparison
  const noisyPosition = position + (noise - 0.5) * 0.3; // 30% noise influence
  
  return noisyPosition < 0.5 ? left.value : right.value;
};

/**
 * Utility functions for color conversion
 */
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};