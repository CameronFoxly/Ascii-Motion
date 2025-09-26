import type { Cell, GradientDefinition, GradientProperty, GradientStop } from '../types';

export interface GradientPoint {
  x: number;
  y: number;
}

export interface GradientOptions {
  startPoint: GradientPoint;
  endPoint: GradientPoint;
  ellipsePoint?: GradientPoint; // For elliptical radial gradients
  definition: GradientDefinition;
  fillArea: Set<string>; // Cell keys to apply gradient to
  cellAspectRatio?: number; // cellWidth / cellHeight for proper circular gradients
}

/**
 * Core gradient calculation function
 * Applies gradient to a set of cell positions based on gradient definition
 */
export const calculateGradientCells = (options: GradientOptions): Map<string, Cell> => {
  const { startPoint, endPoint, ellipsePoint, definition, fillArea, cellAspectRatio = 1.0 } = options;
  const result = new Map<string, Cell>();
  
  fillArea.forEach(cellKey => {
    const [x, y] = cellKey.split(',').map(Number);
    const position = calculatePositionOnGradient(x, y, startPoint, endPoint, ellipsePoint, definition.type, cellAspectRatio);
    
    const gradientCell: Cell = {
      char: definition.character.enabled ? 
        sampleGradientProperty(position, definition.character, x, y) : ' ',
      color: definition.textColor.enabled ? 
        sampleGradientProperty(position, definition.textColor, x, y) : '#FFFFFF',
      bgColor: definition.backgroundColor.enabled ? 
        sampleGradientProperty(position, definition.backgroundColor, x, y) : 'transparent'
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
  ellipse: GradientPoint | undefined,
  type: 'linear' | 'radial',
  cellAspectRatio: number = 1.0
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
    if (ellipse) {
      // Elliptical radial gradient using both end and ellipse points as radii
      const dx = x - start.x;
      const dy = y - start.y;
      
      // Get the two radius vectors
      const r1x = end.x - start.x;
      const r1y = end.y - start.y;
      const r2x = ellipse.x - start.x;
      const r2y = ellipse.y - start.y;
      
      const r1Length = Math.sqrt(r1x * r1x + r1y * r1y);
      const r2Length = Math.sqrt(r2x * r2x + r2y * r2y);
      
      if (r1Length === 0 || r2Length === 0) return 0;
      
      // Normalize radius vectors
      const r1xNorm = r1x / r1Length;
      const r1yNorm = r1y / r1Length;
      const r2xNorm = r2x / r2Length;
      const r2yNorm = r2y / r2Length;
      
      // Project point onto both radius vectors
      const proj1 = dx * r1xNorm + dy * r1yNorm;
      const proj2 = dx * r2xNorm + dy * r2yNorm;
      
      // Calculate elliptical distance using the standard ellipse formula
      const ellipseDistance = Math.sqrt((proj1 * proj1) / (r1Length * r1Length) + (proj2 * proj2) / (r2Length * r2Length));
      
      return Math.min(1, ellipseDistance);
    } else {
      // Apply aspect ratio correction for true circular gradients
      const dx = (x - start.x) * cellAspectRatio; // Scale X by aspect ratio
      const dy = y - start.y; // Y remains unscaled
      const distToStart = Math.sqrt(dx * dx + dy * dy);
      
      const maxDx = (end.x - start.x) * cellAspectRatio;
      const maxDy = end.y - start.y;
      const maxRadius = Math.sqrt(maxDx * maxDx + maxDy * maxDy);
      
      return maxRadius === 0 ? 0 : Math.min(1, distToStart / maxRadius);
    }
  }
};

/**
 * Interpolate property value at given position based on stops and interpolation method
 */
export const sampleGradientProperty = (position: number, property: GradientProperty, x: number, y: number): string => {
  const { stops, interpolation, ditherStrength } = property;
  
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

  // Calculate normalized position within the current stop pair (0-1)
  const normalizedPosition = leftStop.position === rightStop.position ? 0 : 
    (position - leftStop.position) / (rightStop.position - leftStop.position);
  
  switch (interpolation) {
    case 'constant':
      return leftStop.value;
    case 'linear':
      return interpolateLinear(position, leftStop, rightStop);
    case 'bayer2x2':
    case 'bayer4x4':
      return applyBayerDither(normalizedPosition, leftStop, rightStop, interpolation, ditherStrength, x, y);
    case 'noise':
      return applyNoiseDither(normalizedPosition, leftStop, rightStop, ditherStrength, x, y);
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
 * @param normalizedPosition Position within stop pair (0-1), not global gradient position
 * @param left Left gradient stop
 * @param right Right gradient stop  
 * @param method Bayer matrix size (2x2 or 4x4)
 * @param ditherStrength Strength of dithering effect (0-100)
 * @param x Cell X coordinate for 2D dithering pattern
 * @param y Cell Y coordinate for 2D dithering pattern
 */
const applyBayerDither = (
  normalizedPosition: number, 
  left: GradientStop, 
  right: GradientStop, 
  method: 'bayer2x2' | 'bayer4x4',
  ditherStrength: number,
  x: number,
  y: number
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
  
  // Convert ditherStrength (0-100) to influence factor (0-1)
  const strengthFactor = ditherStrength / 100;
  
  // Use 2D cell coordinates for matrix indexing to create proper 2D dithering pattern
  // This prevents straight lines in horizontal/vertical gradients
  const matrixX = Math.abs(x) % matrixSize;
  const matrixY = Math.abs(y) % matrixSize;
  
  // Get threshold from Bayer matrix (0-1)
  const threshold = matrix[matrixY][matrixX] / maxValue;
  
  // Interpolate between step function (strength=0) and dithered function (strength=100)
  // At strength 0: pure position comparison (0.5 threshold)
  // At strength 100: full Bayer threshold influence
  const effectiveThreshold = 0.5 + (threshold - 0.5) * strengthFactor;
  
  return normalizedPosition < effectiveThreshold ? left.value : right.value;
};

/**
 * Noise-based dithering implementation
 * Uses position-based pseudo-random for consistent results
 * @param normalizedPosition Position within stop pair (0-1), not global gradient position
 * @param left Left gradient stop
 * @param right Right gradient stop
 * @param ditherStrength Strength of dithering effect (0-100)
 * @param x Cell X coordinate for 2D noise pattern
 * @param y Cell Y coordinate for 2D noise pattern
 */
const applyNoiseDither = (normalizedPosition: number, left: GradientStop, right: GradientStop, ditherStrength: number, x: number, y: number): string => {
  // Convert ditherStrength (0-100) to influence factor (0-1)
  const strengthFactor = ditherStrength / 100;
  
  // Create pseudo-random noise based on 2D coordinates for proper 2D patterns
  // Use both coordinates to break up straight line patterns
  const noise1 = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  const noise2 = Math.sin(x * 93.9898 + y * 47.233) * 25643.2831;
  const noise = ((noise1 - Math.floor(noise1)) + (noise2 - Math.floor(noise2))) / 2;
  
  // Interpolate between step function (strength=0) and noisy function (strength=100)
  // At strength 0: pure position comparison (0.5 threshold)
  // At strength 100: full noise influence on threshold
  const effectiveThreshold = 0.5 + (noise - 0.5) * strengthFactor;
  
  return normalizedPosition < effectiveThreshold ? left.value : right.value;
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