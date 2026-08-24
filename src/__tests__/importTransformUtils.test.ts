import { describe, expect, it } from 'vitest';
import type { Cell } from '../types';
import {
  getImportHeightForWidth,
  getImportNudgeForOrigin,
  getImportRect,
  getImportWidthForHeight,
  positionImportCells,
  resizeImportRect,
  shouldLockImportAspectRatio,
} from '../utils/importTransformUtils';

describe('import transform placement', () => {
  it('derives a centered origin and applies nudge values', () => {
    expect(
      getImportRect({
        canvasWidth: 100,
        canvasHeight: 60,
        imageWidth: 20,
        imageHeight: 10,
        cropMode: 'center',
        nudgeX: 5,
        nudgeY: -3,
      }),
    ).toEqual({ x: 45, y: 22, width: 20, height: 10 });
  });

  it('keeps half of smaller media visible at the placement limits', () => {
    expect(
      getImportRect({
        canvasWidth: 100,
        canvasHeight: 60,
        imageWidth: 20,
        imageHeight: 10,
        cropMode: 'center',
        nudgeX: -100,
        nudgeY: -100,
      }),
    ).toEqual({ x: -10, y: -5, width: 20, height: 10 });
  });

  it('does not clamp oversized media', () => {
    expect(
      getImportRect({
        canvasWidth: 20,
        canvasHeight: 10,
        imageWidth: 30,
        imageHeight: 12,
        cropMode: 'center',
        nudgeX: 100,
        nudgeY: 100,
      }),
    ).toEqual({ x: 95, y: 99, width: 30, height: 12 });
  });

  it('converts an absolute origin back to alignment-relative nudge values', () => {
    expect(
      getImportNudgeForOrigin({
        desiredOrigin: { x: 12, y: 8 },
        canvasWidth: 100,
        canvasHeight: 60,
        imageWidth: 20,
        imageHeight: 10,
        cropMode: 'center',
      }),
    ).toEqual({ nudgeX: -28, nudgeY: -17 });
  });

  it('positions cells with the same origin and clips them to the canvas', () => {
    const cell: Cell = { char: '#', color: '#ffffff', bgColor: 'transparent' };
    const cells = new Map<string, Cell>([
      ['0,0', cell],
      ['1,0', cell],
    ]);

    expect(
      Array.from(
        positionImportCells(cells, {
          canvasWidth: 4,
          canvasHeight: 4,
          imageWidth: 2,
          imageHeight: 1,
          cropMode: 'top-left',
          nudgeX: -1,
          nudgeY: 0,
        }).keys(),
      ),
    ).toEqual(['0,0']);
  });
});

describe('import transform resizing', () => {
  const startRect = { x: 10, y: 10, width: 20, height: 10 };

  it.each([
    ['top-left', { x: 5, y: 7 }, { x: 5, y: 7, width: 25, height: 13 }],
    ['top-right', { x: 35, y: 7 }, { x: 10, y: 7, width: 25, height: 13 }],
    [
      'bottom-right',
      { x: 35, y: 23 },
      { x: 10, y: 10, width: 25, height: 13 },
    ],
    [
      'bottom-left',
      { x: 5, y: 23 },
      { x: 5, y: 10, width: 25, height: 13 },
    ],
  ] as const)('keeps the opposite corner fixed for %s', (corner, pointer, expected) => {
    expect(resizeImportRect(startRect, corner, pointer)).toEqual(expected);
  });

  it('enforces a one-character minimum when a handle crosses its opposite corner', () => {
    expect(
      resizeImportRect(startRect, 'bottom-right', { x: 5, y: 5 }),
    ).toEqual({ x: 10, y: 10, width: 1, height: 1 });
  });

  it('uses the closest aspect-constrained dimensions', () => {
    expect(
      resizeImportRect(
        startRect,
        'bottom-right',
        { x: 40, y: 22 },
        2,
      ),
    ).toEqual({ x: 10, y: 10, width: 30, height: 15 });
  });

  it('temporarily inverts the aspect-ratio toggle while Shift is held', () => {
    expect(shouldLockImportAspectRatio(true, false)).toBe(true);
    expect(shouldLockImportAspectRatio(true, true)).toBe(false);
    expect(shouldLockImportAspectRatio(false, false)).toBe(false);
    expect(shouldLockImportAspectRatio(false, true)).toBe(true);
  });

  it('matches the panel character-cell aspect-ratio calculations', () => {
    expect(getImportHeightForWidth(120, 16 / 9)).toBe(41);
    expect(getImportWidthForHeight(41, 16 / 9)).toBe(122);
  });
});
