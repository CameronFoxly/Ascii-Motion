/**
 * Procedural generator layer tests: registry, mapping, runtime determinism,
 * keyframes, serialization, bake and timeline store integration.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { registerAllGenerators } from '../registry/generators';
import { getAllGenerators, getGenerator, getGeneratorInitialSettings } from '../registry/generatorRegistry';
import {
  renderGeneratorFrame,
  resolveGeneratorSettings,
  invalidateGeneratorSource,
} from '../utils/generators/generatorRuntime';
import {
  createIntensityBuffer,
  mapIntensityToCells,
  intensityToGray,
  type ResolvedMappingSettings,
} from '../utils/generators/intensityMapping';
import { serializeGeneratorSource, deserializeGeneratorSource } from '../utils/generators/generatorSerialization';
import type { GeneratorSource, GeneratorSourceId } from '../types/generatorLayer';
import type { EffectPropertyTrackId } from '../types/effectBlock';
import type { KeyframeId } from '../types/timeline';
import type { Cell } from '../types';
import { useTimelineStore } from '../stores/timelineStore';
import { useCanvasStore } from '../stores/canvasStore';

const W = 40;
const H = 20;
const GENERATOR_TYPES = ['radio-waves', 'turbulent-noise', 'particle-physics', 'rain-drops', 'digital-rain'];

beforeAll(() => {
  registerAllGenerators();
});

function makeSource(type: string, overrides: Partial<GeneratorSource> = {}): GeneratorSource {
  return {
    id: `gen-${type}` as GeneratorSourceId,
    generatorType: type,
    startFrame: 0,
    durationFrames: 60,
    enabled: true,
    settings: { ...getGeneratorInitialSettings(type, W, H) },
    propertyTracks: [],
    ...overrides,
  };
}

function snapshot(cells: Map<string, Cell>): string {
  return [...cells.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, c]) => `${k}:${c.char}:${c.color}:${c.bgColor}`)
    .join('|');
}

// ============================================
// Registry
// ============================================

describe('generator registry', () => {
  it('registers all generators', () => {
    const types = getAllGenerators().map((g) => g.type).sort();
    expect(types).toEqual([...GENERATOR_TYPES, 'animated-text'].sort());
  });

  it.each([...GENERATOR_TYPES, 'animated-text'])('%s has unique property definitions with defaults', (type) => {
    const entry = getGenerator(type)!;
    const paths = entry.propertyDefinitions.map((d) => d.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) {
      expect(entry.defaultSettings).toHaveProperty(path);
    }
  });
});

// ============================================
// Intensity mapping
// ============================================

describe('intensityMapping', () => {
  const base: ResolvedMappingSettings = {
    enableCharacterMapping: true,
    characterSet: [' ', '.', '#'],
    characterDitherMode: 'by-index',
    ditherStrength: 0,
    enableTextColorMapping: false,
    textColors: [],
    textColorMappingMode: 'closest',
    textColorDitherStrength: 0,
    enableBackgroundColorMapping: false,
    backgroundColors: [],
    backgroundColorMappingMode: 'closest',
    backgroundColorDitherStrength: 0,
  };

  it('quantizes intensity to gray', () => {
    expect(intensityToGray(-1)).toBe(0);
    expect(intensityToGray(Number.NaN)).toBe(0);
    expect(intensityToGray(0.5)).toBe(128);
    expect(intensityToGray(2)).toBe(255);
  });

  it('maps intensity to characters by index and skips uncovered cells', () => {
    const buffer = createIntensityBuffer(3, 1);
    buffer.intensity.set([0.2, 0.5, 1]);
    buffer.coverage.set([1, 1, 0]);
    const cells = mapIntensityToCells(buffer, base);
    expect(cells.has('2,0')).toBe(false);
    expect(cells.get('1,0')?.char).toBe('.');
  });

  it('omits blank characters with a transparent background', () => {
    const buffer = createIntensityBuffer(1, 1);
    buffer.intensity[0] = 0;
    buffer.coverage[0] = 1;
    expect(mapIntensityToCells(buffer, base).size).toBe(0);
  });

  it('applies text color palettes', () => {
    const buffer = createIntensityBuffer(2, 1);
    buffer.intensity.set([0.9, 0.9]);
    buffer.coverage.set([1, 1]);
    const cells = mapIntensityToCells(buffer, {
      ...base,
      enableTextColorMapping: true,
      textColors: ['#ff0000'],
    });
    expect(cells.get('0,0')?.color).toBe('#ff0000');
  });
});

// ============================================
// Runtime
// ============================================

describe('generator runtime', () => {
  it.each(GENERATOR_TYPES)('%s is deterministic for identical sources', (type) => {
    const a = makeSource(type);
    const b = makeSource(type);
    expect(snapshot(renderGeneratorFrame(a, 25, W, H))).toBe(snapshot(renderGeneratorFrame(b, 25, W, H)));
  });

  it.each(GENERATOR_TYPES)('%s random access matches sequential playback', (type) => {
    const seq = makeSource(type);
    const sequential: string[] = [];
    for (let f = 0; f < 40; f++) sequential.push(snapshot(renderGeneratorFrame(seq, f, W, H)));

    const rand = makeSource(type);
    for (const f of [37, 3, 20, 39, 0, 11]) {
      expect(snapshot(renderGeneratorFrame(rand, f, W, H))).toBe(sequential[f]);
    }
  });

  it.each(GENERATOR_TYPES)('%s produces animated output', (type) => {
    const src = makeSource(type);
    const frames = new Set<string>();
    for (let f = 0; f < 30; f++) frames.add(snapshot(renderGeneratorFrame(src, f, W, H)));
    expect(frames.size).toBeGreaterThan(1);
  });

  it('renders nothing outside the span or when disabled', () => {
    const src = makeSource('turbulent-noise', { startFrame: 10, durationFrames: 5 });
    expect(renderGeneratorFrame(src, 9, W, H).size).toBe(0);
    expect(renderGeneratorFrame(src, 15, W, H).size).toBe(0);
    expect(renderGeneratorFrame(src, 12, W, H).size).toBeGreaterThan(0);
    expect(renderGeneratorFrame({ ...src, enabled: false }, 12, W, H).size).toBe(0);
  });

  it('cache invalidation does not change output', () => {
    const src = makeSource('rain-drops');
    const before = snapshot(renderGeneratorFrame(src, 30, W, H));
    invalidateGeneratorSource(src);
    expect(snapshot(renderGeneratorFrame(src, 30, W, H))).toBe(before);
  });

  it('resolves keyframed settings with interpolation', () => {
    const entry = getGenerator('turbulent-noise')!;
    const def = entry.propertyDefinitions.find((d) => d.valueType === 'number' && d.interpolation === 'numeric' && (d.max ?? 100) >= 10)!;
    const src = makeSource('turbulent-noise', {
      propertyTracks: [
        {
          id: 'pt-1' as EffectPropertyTrackId,
          propertyPath: def.path,
          keyframes: [
            { id: 'k1' as KeyframeId, frame: 0, value: 0, easing: { type: 'linear' } },
            { id: 'k2' as KeyframeId, frame: 10, value: 10, easing: { type: 'linear' } },
          ],
        },
      ],
    });
    expect(resolveGeneratorSettings(src, 5)[def.path]).toBeCloseTo(5);
    expect(resolveGeneratorSettings(src, 20)[def.path]).toBeCloseTo(10);
  });
});

// ============================================
// Serialization
// ============================================

describe('generator serialization', () => {
  it('round-trips a source with keyframes', () => {
    const src = makeSource('radio-waves', {
      startFrame: 4,
      durationFrames: 12,
      enabled: false,
      propertyTracks: [
        {
          id: 'pt-1' as EffectPropertyTrackId,
          propertyPath: 'seed',
          keyframes: [{ id: 'k1' as KeyframeId, frame: 4, value: 7, easing: { type: 'linear' } }],
        },
      ],
    });
    const restored = deserializeGeneratorSource(JSON.parse(JSON.stringify(serializeGeneratorSource(src))));
    expect(restored).toEqual(src);
  });
});

// ============================================
// Timeline store integration
// ============================================

describe('timeline store generator layers', () => {
  beforeEach(() => {
    useTimelineStore.getState().createNewProject();
    useCanvasStore.getState().setCanvasSize(W, H);
  });

  function addLayer(type = 'turbulent-noise') {
    const id = useTimelineStore.getState().addGeneratorLayer(type, { startFrame: 0, durationFrames: 10 });
    expect(id).not.toBeNull();
    return id!;
  }

  it('creates a generator layer without content frames', () => {
    const id = addLayer();
    const layer = useTimelineStore.getState().layers.find((l) => l.id === id)!;
    expect(layer.kind).toBe('generator');
    expect(layer.generator?.generatorType).toBe('turbulent-noise');
    expect(layer.contentFrames).toHaveLength(0);
  });

  it('refuses to add content frames to generator layers', () => {
    const id = addLayer();
    expect(useTimelineStore.getState().addContentFrame(id, 0, 1, new Map())).toBeNull();
  });

  it('serializes generator layers in session data', () => {
    const id = addLayer('digital-rain');
    const data = useTimelineStore.getState().getSessionData();
    const layer = data.layers.find((l) => l.id === id)!;
    expect(layer.kind).toBe('generator');
    expect(layer.generator?.generatorType).toBe('digital-rain');
    expect(layer.contentFrames).toHaveLength(0);
  });

  it('bakes to content frames matching the live output', () => {
    const id = addLayer('rain-drops');
    const source = useTimelineStore.getState().layers.find((l) => l.id === id)!.generator!;
    const live = Array.from({ length: source.durationFrames }, (_, i) =>
      snapshot(renderGeneratorFrame(source, source.startFrame + i, W, H)),
    );

    useTimelineStore.getState().bakeGeneratorLayer(id);
    const baked = useTimelineStore.getState().layers.find((l) => l.id === id)!;
    expect(baked.kind).toBeUndefined();
    expect(baked.generator).toBeUndefined();
    const total = baked.contentFrames.reduce((n, cf) => n + cf.durationFrames, 0);
    expect(total).toBe(source.durationFrames);
    for (const cf of baked.contentFrames) {
      for (let f = cf.startFrame; f < cf.startFrame + cf.durationFrames; f++) {
        expect(snapshot(cf.data)).toBe(live[f - source.startFrame]);
      }
    }
  });

  it('merges visible layers including generator output', () => {
    const id = addLayer('turbulent-noise');
    const source = useTimelineStore.getState().layers.find((l) => l.id === id)!.generator!;
    const expected = renderGeneratorFrame(source, 3, W, H);

    const mergedId = useTimelineStore.getState().mergeVisible();
    expect(mergedId).not.toBeNull();
    const merged = useTimelineStore.getState().layers.find((l) => l.id === mergedId)!;
    expect(merged.kind).toBeUndefined();
    const cf = merged.contentFrames.find((c) => 3 >= c.startFrame && 3 < c.startFrame + c.durationFrames)!;
    expect(cf).toBeDefined();
    for (const [key, cell] of expected) {
      expect(cf.data.get(key)?.char).toBe(cell.char);
    }
  });
});
