/**
 * Generator Runtime
 *
 * Evaluates procedural generator layers at any frame, fast enough for
 * real-time scrubbing and playback:
 * - Settings are resolved from static values + keyframe tracks (effect interpolation)
 * - Speed-like properties are integrated over time ("phases") so keyframed speed
 *   changes never cause jumps
 * - Simulations keep periodic state checkpoints plus a forward cursor, so
 *   sequential playback costs one step per frame and seeking is bounded
 * - Mapped output cells are LRU-cached per frame
 *
 * Caches are keyed by the (immutable) GeneratorSource object identity, so any
 * store edit naturally invalidates them.
 */

import type { Cell } from '../../types';
import type { Layer } from '../../types/timeline';
import type { GeneratorSource } from '../../types/generatorLayer';
import type { EffectPropertyDefinition } from '../../types/effectBlock';
import {
  getGenerator,
  type GeneratorFrameContext,
  type GeneratorRegistryEntry,
  type SimulationGeneratorEntry,
} from '../../registry/generatorRegistry';
import { interpolateEffectProperty } from '../effectKeyframeInterpolation';
import {
  createIntensityBuffer,
  mapIntensityToCells,
  type CharacterDitherMode,
  type ColorMappingMode,
  type IntensityBuffer,
  type ResolvedMappingSettings,
} from './intensityMapping';
import { usePaletteStore } from '../../stores/paletteStore';

// ============================================
// FRAME RATE (synced from the timeline store)
// ============================================

let currentFrameRate = 30;

/** Reference frame rate the generator defaults were tuned for */
export const GENERATOR_REFERENCE_FPS = 30;

export function setGeneratorFrameRate(fps: number): void {
  if (Number.isFinite(fps) && fps > 0) currentFrameRate = fps;
}

export function getGeneratorFrameRate(): number {
  return currentFrameRate;
}

export { hash3, mulberry32, frameRng } from './random';

// ============================================
// SETTINGS RESOLUTION
// ============================================

function getDefinitionMap(entry: GeneratorRegistryEntry): Map<string, EffectPropertyDefinition> {
  let map = defCache.get(entry);
  if (!map) {
    map = new Map(entry.propertyDefinitions.map((d) => [d.path, d]));
    defCache.set(entry, map);
  }
  return map;
}
const defCache = new WeakMap<GeneratorRegistryEntry, Map<string, EffectPropertyDefinition>>();

/**
 * Resolve a generator's settings at an absolute timeline frame:
 * defaults ← static settings ← keyframe tracks (tracks without keyframes are ignored).
 */
export function resolveGeneratorSettings(
  source: GeneratorSource,
  frame: number,
): Record<string, unknown> {
  const entry = getGenerator(source.generatorType);
  const resolved: Record<string, unknown> = entry
    ? { ...entry.defaultSettings, ...source.settings }
    : { ...source.settings };
  if (!entry) return resolved;
  const defs = getDefinitionMap(entry);
  for (const track of source.propertyTracks) {
    if (track.keyframes.length === 0) continue;
    const def = defs.get(track.propertyPath);
    if (!def) continue;
    resolved[track.propertyPath] = interpolateEffectProperty(track, frame, def);
  }
  return resolved;
}

/** True when `frame` lies inside the generator's timeline span */
export function isFrameInGeneratorRange(source: GeneratorSource, frame: number): boolean {
  return frame >= source.startFrame && frame < source.startFrame + source.durationFrames;
}

// ============================================
// MAPPING RESOLUTION
// ============================================

function findPaletteColors(paletteId: unknown): string[] {
  if (typeof paletteId !== 'string' || !paletteId) return [];
  const { palettes, customPalettes } = usePaletteStore.getState();
  const palette = palettes.find((p) => p.id === paletteId) ?? customPalettes.find((p) => p.id === paletteId);
  return palette ? palette.colors.map((c) => c.value) : [];
}

/** Split a character-set value (string or legacy string[]) into characters */
export function toCharacterArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return Array.from(value);
  return [];
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function resolveMappingSettings(settings: Record<string, unknown>): ResolvedMappingSettings {
  return {
    enableCharacterMapping: settings['mapping.enableCharacterMapping'] !== false,
    characterSet: toCharacterArray(settings['mapping.characterSet']),
    characterDitherMode: (settings['mapping.characterDitherMode'] as CharacterDitherMode) ?? 'by-index',
    ditherStrength: num(settings['mapping.ditherStrength'], 0.5),
    enableTextColorMapping: settings['mapping.enableTextColorMapping'] !== false,
    textColors: findPaletteColors(settings['mapping.textColorPaletteId']),
    textColorMappingMode: (settings['mapping.textColorMappingMode'] as ColorMappingMode) ?? 'by-index',
    textColorDitherStrength: num(settings['mapping.textColorDitherStrength'], 0.5),
    enableBackgroundColorMapping: settings['mapping.enableBackgroundColorMapping'] === true,
    backgroundColors: findPaletteColors(settings['mapping.backgroundColorPaletteId']),
    backgroundColorMappingMode: (settings['mapping.backgroundColorMappingMode'] as ColorMappingMode) ?? 'by-index',
    backgroundColorDitherStrength: num(settings['mapping.backgroundColorDitherStrength'], 0.5),
  };
}

// ============================================
// RUNTIME CACHE
// ============================================

const CHECKPOINT_INTERVAL = 8;
const OUTPUT_CACHE_LIMIT = 48;
const SETTINGS_CACHE_LIMIT = 4096;

interface RuntimeEntry {
  width: number;
  height: number;
  fps: number;
  palettes: unknown;
  customPalettes: unknown;
  generator: GeneratorRegistryEntry;
  settingsCache: Map<number, Record<string, unknown>>;
  phasePrefix: Map<string, number[]>;
  checkpoints: Map<number, unknown>;
  cursor: { frame: number; state: unknown } | null;
  output: Map<number, Map<string, Cell>>;
  buffer: IntensityBuffer;
}

const runtimeCache = new WeakMap<GeneratorSource, RuntimeEntry>();

function getEntry(source: GeneratorSource, width: number, height: number): RuntimeEntry | null {
  const generator = getGenerator(source.generatorType);
  if (!generator) return null;
  const { palettes, customPalettes } = usePaletteStore.getState();
  const fps = currentFrameRate;
  let entry = runtimeCache.get(source);
  if (
    entry
    && entry.width === width
    && entry.height === height
    && entry.fps === fps
    && entry.generator === generator
  ) {
    if (entry.palettes !== palettes || entry.customPalettes !== customPalettes) {
      // Palette edits only affect mapping — drop mapped output, keep simulation state
      entry.output.clear();
      entry.palettes = palettes;
      entry.customPalettes = customPalettes;
    }
    return entry;
  }
  entry = {
    width,
    height,
    fps,
    palettes,
    customPalettes,
    generator,
    settingsCache: new Map(),
    phasePrefix: new Map(),
    checkpoints: new Map(),
    cursor: null,
    output: new Map(),
    buffer: createIntensityBuffer(width, height),
  };
  runtimeCache.set(source, entry);
  return entry;
}

function settingsAt(source: GeneratorSource, entry: RuntimeEntry, localFrame: number): Record<string, unknown> {
  let s = entry.settingsCache.get(localFrame);
  if (!s) {
    s = resolveGeneratorSettings(source, source.startFrame + localFrame);
    if (entry.settingsCache.size >= SETTINGS_CACHE_LIMIT) entry.settingsCache.clear();
    entry.settingsCache.set(localFrame, s);
  }
  return s;
}

function makeContext(entry: RuntimeEntry, localFrame: number): GeneratorFrameContext {
  return {
    width: entry.width,
    height: entry.height,
    fps: entry.fps,
    localFrame,
    time: localFrame / entry.fps,
    dt: GENERATOR_REFERENCE_FPS / entry.fps,
  };
}

/** Accumulated phase: Σ value(k) / fps for k in [0, localFrame) */
function phaseAt(source: GeneratorSource, entry: RuntimeEntry, path: string, localFrame: number): number {
  let prefix = entry.phasePrefix.get(path);
  if (!prefix) {
    prefix = [0];
    entry.phasePrefix.set(path, prefix);
  }
  for (let k = prefix.length - 1; k < localFrame; k++) {
    const v = num(settingsAt(source, entry, k)[path], 0);
    prefix.push(prefix[k] + v / entry.fps);
  }
  return prefix[localFrame];
}

function getSimulationState(
  source: GeneratorSource,
  entry: RuntimeEntry,
  generator: SimulationGeneratorEntry<unknown>,
  localFrame: number,
): unknown {
  // Choose the starting point: cursor (if usable) or the nearest checkpoint
  let startFrame = -1;
  let state: unknown = null;
  if (entry.cursor && entry.cursor.frame <= localFrame) {
    startFrame = entry.cursor.frame;
    state = entry.cursor.state;
  }
  const cpFrame = Math.floor(localFrame / CHECKPOINT_INTERVAL) * CHECKPOINT_INTERVAL;
  for (let f = cpFrame; f > startFrame; f -= CHECKPOINT_INTERVAL) {
    const cp = entry.checkpoints.get(f);
    if (cp !== undefined) {
      startFrame = f;
      state = generator.cloneState(cp);
      break;
    }
  }
  if (startFrame < 0) {
    state = generator.createState(makeContext(entry, 0), settingsAt(source, entry, 0));
  }
  for (let f = startFrame + 1; f <= localFrame; f++) {
    const ctx = makeContext(entry, f);
    generator.step(state, settingsAt(source, entry, f), ctx);
    if (f % CHECKPOINT_INTERVAL === 0 && !entry.checkpoints.has(f)) {
      entry.checkpoints.set(f, generator.cloneState(state));
    }
  }
  entry.cursor = { frame: localFrame, state };
  return state;
}

/**
 * Render a generator source at an absolute frame to sparse ASCII cells.
 * Returns an empty map outside the span, when disabled, or for unknown types.
 */
export function renderGeneratorFrame(
  source: GeneratorSource,
  frame: number,
  width: number,
  height: number,
): Map<string, Cell> {
  if (!source.enabled || !isFrameInGeneratorRange(source, frame) || width <= 0 || height <= 0) {
    return new Map();
  }
  const entry = getEntry(source, width, height);
  if (!entry) return new Map();

  const localFrame = frame - source.startFrame;
  const cached = entry.output.get(localFrame);
  if (cached) {
    // Refresh LRU position
    entry.output.delete(localFrame);
    entry.output.set(localFrame, cached);
    return cached;
  }

  const generator = entry.generator;
  const settings = settingsAt(source, entry, localFrame);
  const ctx = makeContext(entry, localFrame);
  const buffer = entry.buffer;
  buffer.intensity.fill(0);
  buffer.coverage.fill(0);

  if (generator.mode === 'stateless') {
    const phases: Record<string, number> = {};
    for (const path of generator.phaseProperties ?? []) {
      phases[path] = phaseAt(source, entry, path, localFrame);
    }
    generator.render(ctx, settings, phases, buffer);
  } else {
    const sim = generator as SimulationGeneratorEntry<unknown>;
    const state = getSimulationState(source, entry, sim, localFrame);
    sim.render(state, settings, ctx, buffer);
  }

  const cells = mapIntensityToCells(buffer, resolveMappingSettings(settings));
  if (entry.output.size >= OUTPUT_CACHE_LIMIT) {
    const oldest = entry.output.keys().next().value;
    if (oldest !== undefined) entry.output.delete(oldest);
  }
  entry.output.set(localFrame, cells);
  return cells;
}

/** True when the layer is a procedural generator layer */
export function isGeneratorLayer(layer: Pick<Layer, 'kind' | 'generator'>): boolean {
  return layer.kind === 'generator' && !!layer.generator;
}

/**
 * Cells for a generator layer at an absolute frame (empty for non-generator layers).
 */
export function getGeneratorLayerCells(
  layer: Pick<Layer, 'kind' | 'generator'>,
  frame: number,
  width: number,
  height: number,
): Map<string, Cell> {
  if (!isGeneratorLayer(layer)) return new Map();
  return renderGeneratorFrame(layer.generator!, frame, width, height);
}

/** Drop cached runtime state for a source (e.g. after external mutation) */
export function invalidateGeneratorSource(source: GeneratorSource): void {
  runtimeCache.delete(source);
}
