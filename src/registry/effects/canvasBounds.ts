/**
 * ASCII Motion - Open Source ASCII Art Editor
 *
 * @license MIT
 * @copyright 2025 ASCII Motion
 * @see LICENSE-MIT for full license text
 */

import type { Cell } from '../../types';

/** Derive canvas width/height from cell positions in the map. */
export function deriveCanvasBounds(cells: Map<string, Cell>): { width: number; height: number } {
  let maxX = 0;
  let maxY = 0;
  cells.forEach((_, key) => {
    const [x, y] = key.split(',').map(Number);
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  });
  // +1 because coordinates are 0-based
  return { width: maxX + 1, height: maxY + 1 };
}
