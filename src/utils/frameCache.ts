import type { Cell } from '../types';

/**
 * Frame Hash Generation Utility - Phase 2 Performance Optimization
 * 
 * Generates fast, collision-resistant hashes of frame data for cache validation.
 * Uses sampling strategy to balance speed with accuracy.
 */

/**
 * Generate a hash string from frame cell data
 * 
 * Strategy:
 * - Count total cells
 * - Sample first 10 and last 10 cells for content
 * - Include checksum of all cell positions
 * 
 * This provides good uniqueness detection without iterating all cells.
 * 
 * @param data - Frame cell data map
 * @returns Hash string for cache validation
 */
export const generateFrameHash = (data: Map<string, Cell>): string => {
  const cellCount = data.size;
  
  // Empty frame has special hash
  if (cellCount === 0) {
    return 'empty';
  }
  
  // Convert to array for sampling
  const entries = Array.from(data.entries());
  
  // Sample first 10 and last 10 cells
  const firstSamples = entries.slice(0, Math.min(10, entries.length));
  const lastSamples = entries.slice(Math.max(0, entries.length - 10));
  
  // Combine samples
  const samples = [...firstSamples, ...lastSamples];
  
  // Create hash from samples
  const sampleHash = samples
    .map(([key, cell]) => {
      // Include position, character, and colors
      return `${key}:${cell.char}:${cell.color}:${cell.bgColor}`;
    })
    .join('|');
  
  // Create position checksum (simple sum of coordinates)
  let positionChecksum = 0;
  entries.forEach(([key]) => {
    const [x, y] = key.split(',').map(Number);
    positionChecksum += x * 1000 + y;
  });
  
  // Combine into final hash
  return `${cellCount}-${positionChecksum}-${hashString(sampleHash)}`;
};

/**
 * Simple string hash function (djb2 algorithm)
 * Fast and good distribution for short strings
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i); // hash * 33 + c
  }
  return hash >>> 0; // Convert to unsigned 32-bit integer
}

/**
 * Compare two frame data maps for equality
 * Used for validation when hash collision is suspected
 * 
 * @param data1 - First frame data
 * @param data2 - Second frame data  
 * @returns true if frames are identical
 */
export const areFramesEqual = (
  data1: Map<string, Cell>,
  data2: Map<string, Cell>
): boolean => {
  // Quick size check
  if (data1.size !== data2.size) {
    return false;
  }
  
  // Check all cells match
  for (const [key, cell1] of data1.entries()) {
    const cell2 = data2.get(key);
    
    if (!cell2) {
      return false;
    }
    
    if (
      cell1.char !== cell2.char ||
      cell1.color !== cell2.color ||
      cell1.bgColor !== cell2.bgColor
    ) {
      return false;
    }
  }
  
  return true;
};

/**
 * Generate hash from current canvas state
 * Used when frame data might not be in Map format
 * 
 * @param width - Canvas width
 * @param height - Canvas height
 * @param getCell - Function to get cell at position
 * @returns Hash string
 */
export const generateCanvasHash = (
  width: number,
  height: number,
  getCell: (x: number, y: number) => Cell | undefined
): string => {
  const samples: string[] = [];
  let cellCount = 0;
  let positionChecksum = 0;
  
  // Sample strategy: corners and center
  const samplePositions = [
    // Corners
    { x: 0, y: 0 },
    { x: width - 1, y: 0 },
    { x: 0, y: height - 1 },
    { x: width - 1, y: height - 1 },
    // Center
    { x: Math.floor(width / 2), y: Math.floor(height / 2) },
    // Quarter points
    { x: Math.floor(width / 4), y: Math.floor(height / 4) },
    { x: Math.floor(3 * width / 4), y: Math.floor(height / 4) },
    { x: Math.floor(width / 4), y: Math.floor(3 * height / 4) },
    { x: Math.floor(3 * width / 4), y: Math.floor(3 * height / 4) }
  ];
  
  // Sample cells
  for (const pos of samplePositions) {
    if (pos.x >= 0 && pos.x < width && pos.y >= 0 && pos.y < height) {
      const cell = getCell(pos.x, pos.y);
      if (cell && cell.char !== ' ') {
        samples.push(`${pos.x},${pos.y}:${cell.char}:${cell.color}:${cell.bgColor}`);
        cellCount++;
        positionChecksum += pos.x * 1000 + pos.y;
      }
    }
  }
  
  const sampleHash = samples.join('|');
  
  return `${cellCount}-${positionChecksum}-${hashString(sampleHash)}`;
};
