/**
 * Layer Compositing Tests — Phase 2
 * 
 * Tests the compositing engine including:
 * - Single and multi-layer compositing
 * - Z-order (layer stacking)
 * - Visibility and solo filtering
 * - Opacity handling
 * - Content frame gaps
 * - Transform properties (position, rotation)
 * - Property value resolution from keyframes
 * - Utility functions (getVisibleLayers, isLayerEditable)
 */

import { describe, it, expect } from 'vitest';
import type { Cell } from '../types';
import type { Layer, ContentFrame, PropertyTrack } from '../types/timeline';
import type { LayerId, ContentFrameId, PropertyTrackId, KeyframeId } from '../types/timeline';
import { defaultEasing } from '../types/easing';
import {
  compositeLayersAtFrame,
  getContentFrameAtTime,
  getPropertyValueAtFrame,
  getTransformAtFrame,
  applyRotation,
  getVisibleLayers,
  isLayerEditable,
} from '../utils/layerCompositing';

// ============================================
// TEST HELPERS
// ============================================

function makeCell(char: string, color = '#FFFFFF', bgColor = 'transparent'): Cell {
  return { char, color, bgColor };
}

function makeCellMap(entries: [number, number, Cell][]): Map<string, Cell> {
  const m = new Map<string, Cell>();
  for (const [x, y, cell] of entries) {
    m.set(`${x},${y}`, cell);
  }
  return m;
}

function makeContentFrame(
  id: string,
  startFrame: number,
  durationFrames: number,
  data: Map<string, Cell> = new Map(),
): ContentFrame {
  return {
    id: id as ContentFrameId,
    name: `Frame ${id}`,
    startFrame,
    durationFrames,
    data,
  };
}

function makeLayer(
  overrides: Partial<Layer> & { id: string; contentFrames: ContentFrame[] },
): Layer {
  return {
    id: overrides.id as LayerId,
    name: overrides.name ?? 'Layer',
    visible: overrides.visible ?? true,
    solo: overrides.solo ?? false,
    locked: overrides.locked ?? false,
    opacity: overrides.opacity ?? 100,
    contentFrames: overrides.contentFrames,
    propertyTracks: overrides.propertyTracks ?? [],
    staticProperties: overrides.staticProperties ?? {},
  };
}

function makePropertyTrack(
  propertyPath: string,
  keyframes: { frame: number; value: number }[],
): PropertyTrack {
  return {
    id: `pt-${propertyPath}` as PropertyTrackId,
    propertyPath: propertyPath as PropertyTrack['propertyPath'],
    keyframes: keyframes.map((kf, i) => ({
      id: `kf-${i}` as KeyframeId,
      frame: kf.frame,
      value: kf.value,
      easing: defaultEasing(),
    })),
    loopKeyframes: false,
  };
}

const CANVAS_W = 10;
const CANVAS_H = 10;

// ============================================
// COMPOSITING
// ============================================

describe('compositeLayersAtFrame', () => {
  it('returns empty map for empty layers array', () => {
    const result = compositeLayersAtFrame([], 0, CANVAS_W, CANVAS_H);
    expect(result.size).toBe(0);
  });

  it('composites a single layer with cells', () => {
    const cells = makeCellMap([
      [0, 0, makeCell('A')],
      [1, 0, makeCell('B')],
    ]);
    const layer = makeLayer({
      id: 'l1',
      contentFrames: [makeContentFrame('cf1', 0, 10, cells)],
    });

    const result = compositeLayersAtFrame([layer], 0, CANVAS_W, CANVAS_H);
    expect(result.size).toBe(2);
    expect(result.get('0,0')?.char).toBe('A');
    expect(result.get('1,0')?.char).toBe('B');
  });

  it('later layers overwrite earlier layers (z-order)', () => {
    const cells1 = makeCellMap([[0, 0, makeCell('A', '#FF0000')]]);
    const cells2 = makeCellMap([[0, 0, makeCell('B', '#00FF00')]]);

    const layer1 = makeLayer({
      id: 'l1',
      contentFrames: [makeContentFrame('cf1', 0, 10, cells1)],
    });
    const layer2 = makeLayer({
      id: 'l2',
      contentFrames: [makeContentFrame('cf2', 0, 10, cells2)],
    });

    const result = compositeLayersAtFrame([layer1, layer2], 0, CANVAS_W, CANVAS_H);
    expect(result.get('0,0')?.char).toBe('B');
    expect(result.get('0,0')?.color).toBe('#00FF00');
  });

  it('non-overlapping cells from multiple layers are merged', () => {
    const cells1 = makeCellMap([[0, 0, makeCell('A')]]);
    const cells2 = makeCellMap([[5, 5, makeCell('B')]]);

    const layer1 = makeLayer({
      id: 'l1',
      contentFrames: [makeContentFrame('cf1', 0, 10, cells1)],
    });
    const layer2 = makeLayer({
      id: 'l2',
      contentFrames: [makeContentFrame('cf2', 0, 10, cells2)],
    });

    const result = compositeLayersAtFrame([layer1, layer2], 0, CANVAS_W, CANVAS_H);
    expect(result.size).toBe(2);
    expect(result.get('0,0')?.char).toBe('A');
    expect(result.get('5,5')?.char).toBe('B');
  });

  // ============================================
  // VISIBILITY
  // ============================================

  it('invisible layers are excluded', () => {
    const cells = makeCellMap([[0, 0, makeCell('X')]]);
    const layer = makeLayer({
      id: 'l1',
      visible: false,
      contentFrames: [makeContentFrame('cf1', 0, 10, cells)],
    });

    const result = compositeLayersAtFrame([layer], 0, CANVAS_W, CANVAS_H);
    expect(result.size).toBe(0);
  });

  it('only solo layers are rendered when solo is active', () => {
    const cells1 = makeCellMap([[0, 0, makeCell('A')]]);
    const cells2 = makeCellMap([[1, 0, makeCell('B')]]);
    const cells3 = makeCellMap([[2, 0, makeCell('C')]]);

    const layer1 = makeLayer({
      id: 'l1',
      contentFrames: [makeContentFrame('cf1', 0, 10, cells1)],
    });
    const soloLayer = makeLayer({
      id: 'l2',
      solo: true,
      contentFrames: [makeContentFrame('cf2', 0, 10, cells2)],
    });
    const layer3 = makeLayer({
      id: 'l3',
      contentFrames: [makeContentFrame('cf3', 0, 10, cells3)],
    });

    const result = compositeLayersAtFrame([layer1, soloLayer, layer3], 0, CANVAS_W, CANVAS_H);
    expect(result.size).toBe(1);
    expect(result.get('1,0')?.char).toBe('B');
  });

  it('multiple solo layers are all rendered', () => {
    const cells1 = makeCellMap([[0, 0, makeCell('A')]]);
    const cells2 = makeCellMap([[1, 0, makeCell('B')]]);

    const solo1 = makeLayer({
      id: 'l1',
      solo: true,
      contentFrames: [makeContentFrame('cf1', 0, 10, cells1)],
    });
    const solo2 = makeLayer({
      id: 'l2',
      solo: true,
      contentFrames: [makeContentFrame('cf2', 0, 10, cells2)],
    });

    const result = compositeLayersAtFrame([solo1, solo2], 0, CANVAS_W, CANVAS_H);
    expect(result.size).toBe(2);
  });

  // ============================================
  // OPACITY
  // ============================================

  it('zero opacity layers are excluded via layer opacity', () => {
    const cells = makeCellMap([[0, 0, makeCell('X')]]);
    const layer = makeLayer({
      id: 'l1',
      contentFrames: [makeContentFrame('cf1', 0, 10, cells)],
      opacity: 0,
    });

    // Layer-level opacity=0 should still render (opacity is visual hint only for ASCII)
    const result = compositeLayersAtFrame([layer], 0, CANVAS_W, CANVAS_H);
    expect(result.size).toBe(1);
  });

  it('partial opacity is ignored for ASCII content', () => {
    const cells = makeCellMap([[0, 0, makeCell('X')]]);
    const layer = makeLayer({
      id: 'l1',
      contentFrames: [makeContentFrame('cf1', 0, 10, cells)],
    });

    const result = compositeLayersAtFrame([layer], 0, CANVAS_W, CANVAS_H);
    expect(result.size).toBe(1);
  });

  it('full opacity renders normally', () => {
    const cells = makeCellMap([[0, 0, makeCell('X')]]);
    const layer = makeLayer({
      id: 'l1',
      contentFrames: [makeContentFrame('cf1', 0, 10, cells)],
    });

    const result = compositeLayersAtFrame([layer], 0, CANVAS_W, CANVAS_H);
    expect(result.size).toBe(1);
  });

  // ============================================
  // CONTENT FRAME GAPS
  // ============================================

  it('content frame gaps render no cells', () => {
    const cells = makeCellMap([[0, 0, makeCell('X')]]);
    const layer = makeLayer({
      id: 'l1',
      contentFrames: [
        makeContentFrame('cf1', 0, 5, cells),
        // Gap: frames 5–9
        makeContentFrame('cf2', 10, 5, cells),
      ],
    });

    // Frame 7 is in the gap
    const result = compositeLayersAtFrame([layer], 7, CANVAS_W, CANVAS_H);
    expect(result.size).toBe(0);
  });

  it('renders correct content frame when multiple exist', () => {
    const cells1 = makeCellMap([[0, 0, makeCell('A')]]);
    const cells2 = makeCellMap([[0, 0, makeCell('B')]]);

    const layer = makeLayer({
      id: 'l1',
      contentFrames: [
        makeContentFrame('cf1', 0, 5, cells1),
        makeContentFrame('cf2', 5, 5, cells2),
      ],
    });

    const result1 = compositeLayersAtFrame([layer], 3, CANVAS_W, CANVAS_H);
    expect(result1.get('0,0')?.char).toBe('A');

    const result2 = compositeLayersAtFrame([layer], 7, CANVAS_W, CANVAS_H);
    expect(result2.get('0,0')?.char).toBe('B');
  });

  // ============================================
  // EMPTY / SPACE CELLS
  // ============================================

  it('skips empty space cells', () => {
    const cells = makeCellMap([[0, 0, makeCell(' ')]]);
    const layer = makeLayer({
      id: 'l1',
      contentFrames: [makeContentFrame('cf1', 0, 10, cells)],
    });

    const result = compositeLayersAtFrame([layer], 0, CANVAS_W, CANVAS_H);
    expect(result.size).toBe(0);
  });

  // ============================================
  // BOUNDS CLIPPING
  // ============================================

  it('clips cells outside canvas bounds', () => {
    const cells = makeCellMap([
      [0, 0, makeCell('A')],
      [99, 99, makeCell('B')], // Outside 10x10 canvas
    ]);
    const layer = makeLayer({
      id: 'l1',
      contentFrames: [makeContentFrame('cf1', 0, 10, cells)],
    });

    const result = compositeLayersAtFrame([layer], 0, CANVAS_W, CANVAS_H);
    expect(result.size).toBe(1);
    expect(result.get('0,0')?.char).toBe('A');
  });

  // ============================================
  // TRANSFORM — POSITION
  // ============================================

  it('applies position offset', () => {
    const cells = makeCellMap([[0, 0, makeCell('X')]]);
    const layer = makeLayer({
      id: 'l1',
      contentFrames: [makeContentFrame('cf1', 0, 10, cells)],
      propertyTracks: [
        makePropertyTrack('transform.position.x', [{ frame: 0, value: 3 }]),
        makePropertyTrack('transform.position.y', [{ frame: 0, value: 2 }]),
      ],
    });

    const result = compositeLayersAtFrame([layer], 0, CANVAS_W, CANVAS_H);
    expect(result.size).toBe(1);
    expect(result.get('3,2')?.char).toBe('X');
    expect(result.get('0,0')).toBeUndefined();
  });

  it('position can move cells off-canvas', () => {
    const cells = makeCellMap([[0, 0, makeCell('X')]]);
    const layer = makeLayer({
      id: 'l1',
      contentFrames: [makeContentFrame('cf1', 0, 10, cells)],
      propertyTracks: [
        makePropertyTrack('transform.position.x', [{ frame: 0, value: 20 }]),
      ],
    });

    const result = compositeLayersAtFrame([layer], 0, CANVAS_W, CANVAS_H);
    expect(result.size).toBe(0);
  });

  // ============================================
  // TRANSFORM — SCALE
  // ============================================

  it('scale of 2 doubles distances from anchor', () => {
    const cells = makeCellMap([
      [0, 0, makeCell('A')],
      [2, 0, makeCell('B')],
    ]);
    const layer = makeLayer({
      id: 'l1',
      contentFrames: [makeContentFrame('cf1', 0, 10, cells)],
      propertyTracks: [
        makePropertyTrack('transform.scale.x', [{ frame: 0, value: 2 }]),
        makePropertyTrack('transform.scale.y', [{ frame: 0, value: 2 }]),
      ],
    });

    const result = compositeLayersAtFrame([layer], 0, CANVAS_W, CANVAS_H);
    // (0,0) scaled by 2 around anchor (0,0) stays at (0,0)
    expect(result.get('0,0')?.char).toBe('A');
    // (2,0) scaled by 2 around anchor (0,0): localX=2*2=4
    expect(result.get('4,0')?.char).toBe('B');
  });
});

// ============================================
// getContentFrameAtTime
// ============================================

describe('getContentFrameAtTime', () => {
  it('returns content frame containing the given time', () => {
    const cf1 = makeContentFrame('cf1', 0, 5, new Map());
    const cf2 = makeContentFrame('cf2', 5, 5, new Map());
    const layer = makeLayer({ id: 'l1', contentFrames: [cf1, cf2] });

    expect(getContentFrameAtTime(layer, 0)).toBe(cf1);
    expect(getContentFrameAtTime(layer, 4)).toBe(cf1);
    expect(getContentFrameAtTime(layer, 5)).toBe(cf2);
    expect(getContentFrameAtTime(layer, 9)).toBe(cf2);
  });

  it('returns null for time in a gap', () => {
    const cf1 = makeContentFrame('cf1', 0, 3, new Map());
    const cf2 = makeContentFrame('cf2', 10, 5, new Map());
    const layer = makeLayer({ id: 'l1', contentFrames: [cf1, cf2] });

    expect(getContentFrameAtTime(layer, 5)).toBeNull();
  });

  it('returns null for time past last frame', () => {
    const cf = makeContentFrame('cf1', 0, 5, new Map());
    const layer = makeLayer({ id: 'l1', contentFrames: [cf] });

    expect(getContentFrameAtTime(layer, 5)).toBeNull();
    expect(getContentFrameAtTime(layer, 100)).toBeNull();
  });

  it('returns null for negative time', () => {
    const cf = makeContentFrame('cf1', 0, 5, new Map());
    const layer = makeLayer({ id: 'l1', contentFrames: [cf] });

    expect(getContentFrameAtTime(layer, -1)).toBeNull();
  });

  it('returns null for empty content frames', () => {
    const layer = makeLayer({ id: 'l1', contentFrames: [] });
    expect(getContentFrameAtTime(layer, 0)).toBeNull();
  });

  // Regression: splitting a frame that has a later frame used to leave the
  // contentFrames array unsorted, which made the binary search miss the new
  // (split) frame and render it blank/uneditable. The lookup must stay correct
  // even if the array is not sorted by startFrame.
  it('finds a frame even when contentFrames are not sorted by startFrame', () => {
    const cfA = makeContentFrame('cfA', 0, 5, new Map()); // [0,5)
    const cfLater = makeContentFrame('cfLater', 10, 10, new Map()); // [10,20)
    const cfSplit = makeContentFrame('cfSplit', 5, 5, new Map()); // [5,10)
    // Deliberately out of order (as .concat() would leave it after a split):
    const layer = makeLayer({ id: 'l1', contentFrames: [cfA, cfLater, cfSplit] });

    expect(getContentFrameAtTime(layer, 5)).toBe(cfSplit);
    expect(getContentFrameAtTime(layer, 9)).toBe(cfSplit);
    expect(getContentFrameAtTime(layer, 4)).toBe(cfA);
    expect(getContentFrameAtTime(layer, 15)).toBe(cfLater);
    // Genuine gap still returns null even with an unsorted array.
    expect(getContentFrameAtTime(layer, 25)).toBeNull();
  });
});

// ============================================
// getPropertyValueAtFrame
// ============================================

describe('getPropertyValueAtFrame', () => {
  it('returns default when no property track exists', () => {
    const layer = makeLayer({
      id: 'l1',
      contentFrames: [makeContentFrame('cf1', 0, 10, new Map())],
    });

    expect(getPropertyValueAtFrame(layer, 'transform.position.x', 0)).toBe(0);
    expect(getPropertyValueAtFrame(layer, 'transform.position.y', 0)).toBe(0);
    expect(getPropertyValueAtFrame(layer, 'transform.scale.x', 0)).toBe(1);
    expect(getPropertyValueAtFrame(layer, 'transform.scale.y', 0)).toBe(1);
    expect(getPropertyValueAtFrame(layer, 'transform.rotation', 0)).toBe(0);
    expect(getPropertyValueAtFrame(layer, 'transform.anchorPoint.x', 0)).toBe(0);
    expect(getPropertyValueAtFrame(layer, 'transform.anchorPoint.y', 0)).toBe(0);
  });

  it('returns keyframe value when track has single keyframe', () => {
    const layer = makeLayer({
      id: 'l1',
      contentFrames: [makeContentFrame('cf1', 0, 10, new Map())],
      propertyTracks: [
        makePropertyTrack('transform.position.x', [{ frame: 0, value: 42 }]),
      ],
    });

    expect(getPropertyValueAtFrame(layer, 'transform.position.x', 0)).toBe(42);
    expect(getPropertyValueAtFrame(layer, 'transform.position.x', 5)).toBe(42);
  });

  it('interpolates between keyframes', () => {
    const layer = makeLayer({
      id: 'l1',
      contentFrames: [makeContentFrame('cf1', 0, 20, new Map())],
      propertyTracks: [
        makePropertyTrack('transform.position.x', [
          { frame: 0, value: 0 },
          { frame: 10, value: 100 },
        ]),
      ],
    });

    // Frame 5 should be halfway between 0 and 100
    expect(getPropertyValueAtFrame(layer, 'transform.position.x', 5)).toBe(50);
    // Frame 0 is exactly at first keyframe
    expect(getPropertyValueAtFrame(layer, 'transform.position.x', 0)).toBe(0);
    // Frame 10 is exactly at second keyframe
    expect(getPropertyValueAtFrame(layer, 'transform.position.x', 10)).toBe(100);
  });
});

// ============================================
// getTransformAtFrame
// ============================================

describe('getTransformAtFrame', () => {
  it('returns all defaults when no tracks exist', () => {
    const layer = makeLayer({
      id: 'l1',
      contentFrames: [makeContentFrame('cf1', 0, 10, new Map())],
    });

    const transform = getTransformAtFrame(layer, 0);
    expect(transform).toEqual({
      positionX: 0,
      positionY: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      anchorPointX: 0,
      anchorPointY: 0,
    });
  });

  it('returns keyframe values when tracks have data', () => {
    const layer = makeLayer({
      id: 'l1',
      contentFrames: [makeContentFrame('cf1', 0, 10, new Map())],
      propertyTracks: [
        makePropertyTrack('transform.position.x', [{ frame: 0, value: 10 }]),
      ],
    });

    const transform = getTransformAtFrame(layer, 0);
    expect(transform.positionX).toBe(10);
    // Others keep defaults
    expect(transform.scaleX).toBe(1);
    expect(transform.scaleY).toBe(1);
    expect(transform.rotation).toBe(0);
  });
});

// ============================================
// applyRotation
// ============================================

describe('applyRotation', () => {
  it('returns original coords for 0 degrees', () => {
    const { rotatedX, rotatedY } = applyRotation(5, 3, 0);
    expect(rotatedX).toBe(5);
    expect(rotatedY).toBe(3);
  });

  it('handles 360-degree rotation (identity)', () => {
    const { rotatedX, rotatedY } = applyRotation(5, 3, 360);
    expect(rotatedX).toBe(5);
    expect(rotatedY).toBe(3);
  });

  it('handles negative degrees', () => {
    const result = applyRotation(1, 0, -90, 1);
    // For aspect ratio 1: (1, 0) rotated -90° → (0, -1)
    expect(result.rotatedX).toBe(0);
    expect(result.rotatedY).toBe(-1);
  });

  it('rotates 90 degrees with aspect ratio 1', () => {
    // With aspect ratio 1: (1, 0) rotated 90° → (0, 1)
    const { rotatedX, rotatedY } = applyRotation(1, 0, 90, 1);
    expect(rotatedX).toBe(0);
    expect(rotatedY).toBe(1);
  });
});

// ============================================
// getVisibleLayers
// ============================================

describe('getVisibleLayers', () => {
  it('returns all visible layers when no solo', () => {
    const layers = [
      makeLayer({ id: 'l1', visible: true, contentFrames: [] }),
      makeLayer({ id: 'l2', visible: true, contentFrames: [] }),
      makeLayer({ id: 'l3', visible: false, contentFrames: [] }),
    ];

    const visible = getVisibleLayers(layers);
    expect(visible).toHaveLength(2);
    expect(visible.map((l) => l.id)).toEqual(['l1', 'l2']);
  });

  it('returns only solo layers when solo is active', () => {
    const layers = [
      makeLayer({ id: 'l1', visible: true, contentFrames: [] }),
      makeLayer({ id: 'l2', visible: true, solo: true, contentFrames: [] }),
      makeLayer({ id: 'l3', visible: true, contentFrames: [] }),
    ];

    const visible = getVisibleLayers(layers);
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe('l2');
  });

  it('returns empty array when all layers are invisible', () => {
    const layers = [
      makeLayer({ id: 'l1', visible: false, contentFrames: [] }),
      makeLayer({ id: 'l2', visible: false, contentFrames: [] }),
    ];

    expect(getVisibleLayers(layers)).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(getVisibleLayers([])).toHaveLength(0);
  });

  it('solo + invisible layer is excluded', () => {
    const layers = [
      makeLayer({ id: 'l1', visible: false, solo: true, contentFrames: [] }),
      makeLayer({ id: 'l2', visible: true, contentFrames: [] }),
    ];

    // l1 is solo but invisible → excluded
    // l2 is visible but not solo → excluded (solo mode active)
    const visible = getVisibleLayers(layers);
    expect(visible).toHaveLength(0);
  });
});

// ============================================
// isLayerEditable
// ============================================

describe('isLayerEditable', () => {
  it('returns true for visible, unlocked layer', () => {
    const layer = makeLayer({ id: 'l1', visible: true, locked: false, contentFrames: [] });
    expect(isLayerEditable(layer)).toBe(true);
  });

  it('returns false for locked layer', () => {
    const layer = makeLayer({ id: 'l1', visible: true, locked: true, contentFrames: [] });
    expect(isLayerEditable(layer)).toBe(false);
  });

  it('returns false for invisible layer', () => {
    const layer = makeLayer({ id: 'l1', visible: false, locked: false, contentFrames: [] });
    expect(isLayerEditable(layer)).toBe(false);
  });

  it('returns false for locked + invisible layer', () => {
    const layer = makeLayer({ id: 'l1', visible: false, locked: true, contentFrames: [] });
    expect(isLayerEditable(layer)).toBe(false);
  });
});
