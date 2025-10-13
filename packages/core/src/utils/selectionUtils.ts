import type { Selection, SelectionShape } from '../types';

export interface SelectionBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const getOrderedRange = (a: number, b: number): [number, number] => {
  return a <= b ? [a, b] : [b, a];
};

export const createRectSelectionMask = (
  start: { x: number; y: number },
  end: { x: number; y: number }
): Set<string> => {
  const mask = new Set<string>();
  const [minX, maxX] = getOrderedRange(start.x, end.x);
  const [minY, maxY] = getOrderedRange(start.y, end.y);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      mask.add(`${x},${y}`);
    }
  }

  return mask;
};

export const cloneSelectionMask = (mask: Set<string>): Set<string> => {
  return new Set(mask);
};

export const unionSelectionMasks = (
  baseMask: Set<string>,
  additionMask: Set<string>
): Set<string> => {
  const result = cloneSelectionMask(baseMask);
  additionMask.forEach((key) => result.add(key));
  return result;
};

export const subtractSelectionMask = (
  baseMask: Set<string>,
  removalMask: Set<string>
): Set<string> => {
  const result = cloneSelectionMask(baseMask);
  removalMask.forEach((key) => result.delete(key));
  return result;
};

export const getBoundsFromMask = (mask: Set<string>): SelectionBounds | null => {
  if (mask.size === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  mask.forEach((key) => {
    const [x, y] = key.split(',').map(Number);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });

  return { minX, maxX, minY, maxY };
};

export const maskMatchesSolidRectangle = (
  mask: Set<string>,
  bounds: SelectionBounds | null
): boolean => {
  if (!bounds) {
    return false;
  }

  const expectedSize = (bounds.maxX - bounds.minX + 1) * (bounds.maxY - bounds.minY + 1);
  return mask.size === expectedSize;
};

export const deriveSelectionShape = (
  mask: Set<string>,
  bounds: SelectionBounds | null
): SelectionShape => {
  return maskMatchesSolidRectangle(mask, bounds) ? 'rectangle' : 'custom';
};

export const updateSelectionFromMask = (
  mask: Set<string>
): Pick<Selection, 'start' | 'end' | 'selectedCells' | 'shape'> => {
  const bounds = getBoundsFromMask(mask);

  if (!bounds) {
    return {
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
      selectedCells: new Set(),
      shape: 'rectangle',
    };
  }

  return {
    start: { x: bounds.minX, y: bounds.minY },
    end: { x: bounds.maxX, y: bounds.maxY },
    selectedCells: cloneSelectionMask(mask),
    shape: deriveSelectionShape(mask, bounds),
  };
};
