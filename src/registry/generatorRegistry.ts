/**
 * Generator Registry
 *
 * Plugin-like registry for procedural generator types (mirrors effectRegistry).
 * Generators produce a normalized intensity buffer per frame, which the
 * runtime maps to ASCII cells using the shared `mapping.*` settings.
 *
 * Two evaluation modes:
 * - 'stateless': output is a pure function of (settings at frame, accumulated phases, time)
 * - 'simulation': output depends on a state advanced one frame at a time
 *   (the runtime caches checkpoints so seeking stays fast)
 */

import type { LucideIcon } from 'lucide-react';
import type { EffectPropertyDefinition } from '../types/effectBlock';
import type { IntensityBuffer } from '../utils/generators/intensityMapping';

/** Per-frame evaluation context passed to generator functions */
export interface GeneratorFrameContext {
  width: number;
  height: number;
  fps: number;
  /** Frame index relative to the generator start (0-based) */
  localFrame: number;
  /** Seconds since generator start (localFrame / fps) */
  time: number;
  /** Simulation time step relative to the 30fps reference (30 / fps) */
  dt: number;
}

interface GeneratorRegistryEntryBase {
  /** Unique generator type id (e.g. 'radio-waves') */
  type: string;
  name: string;
  icon: LucideIcon;
  description: string;
  /** Default generator settings (mapping defaults are merged in at registration) */
  defaultSettings: Record<string, unknown>;
  /** Animatable property definitions (mapping definitions are appended at registration) */
  propertyDefinitions: EffectPropertyDefinition[];
  /** Canvas-aware default overrides (e.g. centered origin) */
  getCanvasDefaults?: (canvasWidth: number, canvasHeight: number) => Record<string, unknown>;
  /** Default mapping overrides for this generator */
  defaultMappingSettings?: Record<string, unknown>;
}

export interface StatelessGeneratorEntry extends GeneratorRegistryEntryBase {
  mode: 'stateless';
  /**
   * Property paths whose (per-second) values are integrated over time.
   * The accumulated value is passed to `render` in `phases[path]`, so
   * keyframed speeds change smoothly without jumps.
   */
  phaseProperties?: string[];
  render: (
    ctx: GeneratorFrameContext,
    settings: Record<string, unknown>,
    phases: Record<string, number>,
    out: IntensityBuffer,
  ) => void;
}

export interface SimulationGeneratorEntry<S = unknown> extends GeneratorRegistryEntryBase {
  mode: 'simulation';
  /** Create the initial state (before frame 0 is stepped) */
  createState: (ctx: GeneratorFrameContext, settings: Record<string, unknown>) => S;
  /** Advance the state to `ctx.localFrame` (called for every frame, starting at 0) */
  step: (state: S, settings: Record<string, unknown>, ctx: GeneratorFrameContext) => void;
  /** Render the current state */
  render: (
    state: S,
    settings: Record<string, unknown>,
    ctx: GeneratorFrameContext,
    out: IntensityBuffer,
  ) => void;
  /** Deep copy the state (for checkpoints) */
  cloneState: (state: S) => S;
}

export type GeneratorRegistryEntry = StatelessGeneratorEntry | SimulationGeneratorEntry<any>; // eslint-disable-line @typescript-eslint/no-explicit-any

// ============================================
// SHARED MAPPING PROPERTIES
// ============================================

export const MAPPING_CATEGORY = 'Mapping';

const CHARACTER_DITHER_OPTIONS = [
  { label: 'By Index', value: 'by-index' },
  { label: 'Noise Dither', value: 'noise-dither' },
  { label: 'Bayer 2×2', value: 'bayer2x2' },
  { label: 'Bayer 4×4', value: 'bayer4x4' },
];

const COLOR_MAPPING_OPTIONS = [
  { label: 'By Index', value: 'by-index' },
  { label: 'Closest', value: 'closest' },
  { label: 'Noise Dither', value: 'noise-dither' },
  { label: 'Bayer 2×2', value: 'bayer2x2' },
  { label: 'Bayer 4×4', value: 'bayer4x4' },
];

export const DEFAULT_GENERATOR_CHARACTER_SET = ' .:-=+*#%@';
export const DEFAULT_GENERATOR_TEXT_PALETTE_ID = 'ansi-16';

export const DEFAULT_MAPPING_SETTINGS: Record<string, unknown> = {
  'mapping.enableCharacterMapping': true,
  'mapping.characterSet': DEFAULT_GENERATOR_CHARACTER_SET,
  'mapping.characterDitherMode': 'by-index',
  'mapping.ditherStrength': 0.5,
  'mapping.enableTextColorMapping': true,
  'mapping.textColorPaletteId': DEFAULT_GENERATOR_TEXT_PALETTE_ID,
  'mapping.textColorMappingMode': 'by-index',
  'mapping.textColorDitherStrength': 0.5,
  'mapping.enableBackgroundColorMapping': false,
  'mapping.backgroundColorPaletteId': DEFAULT_GENERATOR_TEXT_PALETTE_ID,
  'mapping.backgroundColorMappingMode': 'by-index',
  'mapping.backgroundColorDitherStrength': 0.5,
};

export const MAPPING_PROPERTY_DEFINITIONS: EffectPropertyDefinition[] = [
  { path: 'mapping.enableCharacterMapping', displayName: 'Map Characters', category: MAPPING_CATEGORY, valueType: 'boolean', defaultValue: true, interpolation: 'hold' },
  { path: 'mapping.characterSet', displayName: 'Character Set', category: MAPPING_CATEGORY, valueType: 'characterSet', defaultValue: DEFAULT_GENERATOR_CHARACTER_SET, interpolation: 'hold', visibleWhen: { path: 'mapping.enableCharacterMapping', values: ['true'] } },
  { path: 'mapping.characterDitherMode', displayName: 'Character Dither', category: MAPPING_CATEGORY, valueType: 'select', defaultValue: 'by-index', interpolation: 'hold', options: CHARACTER_DITHER_OPTIONS, visibleWhen: { path: 'mapping.enableCharacterMapping', values: ['true'] } },
  { path: 'mapping.ditherStrength', displayName: 'Character Dither Strength', category: MAPPING_CATEGORY, valueType: 'number', defaultValue: 0.5, interpolation: 'numeric', min: 0, max: 1, step: 0.05, visibleWhen: { path: 'mapping.characterDitherMode', values: ['noise-dither', 'bayer2x2', 'bayer4x4'] } },
  { path: 'mapping.enableTextColorMapping', displayName: 'Map Text Color', category: MAPPING_CATEGORY, valueType: 'boolean', defaultValue: true, interpolation: 'hold' },
  { path: 'mapping.textColorPaletteId', displayName: 'Text Palette', category: MAPPING_CATEGORY, valueType: 'palette', defaultValue: DEFAULT_GENERATOR_TEXT_PALETTE_ID, interpolation: 'hold', visibleWhen: { path: 'mapping.enableTextColorMapping', values: ['true'] } },
  { path: 'mapping.textColorMappingMode', displayName: 'Text Color Mode', category: MAPPING_CATEGORY, valueType: 'select', defaultValue: 'by-index', interpolation: 'hold', options: COLOR_MAPPING_OPTIONS, visibleWhen: { path: 'mapping.enableTextColorMapping', values: ['true'] } },
  { path: 'mapping.textColorDitherStrength', displayName: 'Text Dither Strength', category: MAPPING_CATEGORY, valueType: 'number', defaultValue: 0.5, interpolation: 'numeric', min: 0, max: 1, step: 0.05, visibleWhen: { path: 'mapping.textColorMappingMode', values: ['noise-dither', 'bayer2x2', 'bayer4x4'] } },
  { path: 'mapping.enableBackgroundColorMapping', displayName: 'Map Background Color', category: MAPPING_CATEGORY, valueType: 'boolean', defaultValue: false, interpolation: 'hold' },
  { path: 'mapping.backgroundColorPaletteId', displayName: 'Background Palette', category: MAPPING_CATEGORY, valueType: 'palette', defaultValue: DEFAULT_GENERATOR_TEXT_PALETTE_ID, interpolation: 'hold', visibleWhen: { path: 'mapping.enableBackgroundColorMapping', values: ['true'] } },
  { path: 'mapping.backgroundColorMappingMode', displayName: 'Background Color Mode', category: MAPPING_CATEGORY, valueType: 'select', defaultValue: 'by-index', interpolation: 'hold', options: COLOR_MAPPING_OPTIONS, visibleWhen: { path: 'mapping.enableBackgroundColorMapping', values: ['true'] } },
  { path: 'mapping.backgroundColorDitherStrength', displayName: 'Background Dither Strength', category: MAPPING_CATEGORY, valueType: 'number', defaultValue: 0.5, interpolation: 'numeric', min: 0, max: 1, step: 0.05, visibleWhen: { path: 'mapping.backgroundColorMappingMode', values: ['noise-dither', 'bayer2x2', 'bayer4x4'] } },
];

// ============================================
// REGISTRY
// ============================================

const registry = new Map<string, GeneratorRegistryEntry>();

/**
 * Register a generator type. Shared mapping properties and defaults are appended.
 * Throws if a generator with the same type is already registered.
 */
export function registerGenerator(entry: GeneratorRegistryEntry): void {
  if (registry.has(entry.type)) {
    throw new Error(`Generator type "${entry.type}" is already registered.`);
  }
  const ownPaths = new Set(entry.propertyDefinitions.map((d) => d.path));
  const mappingDefaults = { ...DEFAULT_MAPPING_SETTINGS, ...(entry.defaultMappingSettings ?? {}) };
  const mappingDefs = MAPPING_PROPERTY_DEFINITIONS
    .filter((d) => !ownPaths.has(d.path))
    .map((d) => (d.path in mappingDefaults
      ? { ...d, defaultValue: mappingDefaults[d.path] as EffectPropertyDefinition['defaultValue'] }
      : d));
  registry.set(entry.type, {
    ...entry,
    defaultSettings: { ...mappingDefaults, ...entry.defaultSettings },
    propertyDefinitions: [...entry.propertyDefinitions, ...mappingDefs],
  });
}

export function getGenerator(type: string): GeneratorRegistryEntry | undefined {
  return registry.get(type);
}

export function getAllGenerators(): GeneratorRegistryEntry[] {
  return Array.from(registry.values());
}

/** Clear the registry (tests only) */
export function clearGeneratorRegistry(): void {
  registry.clear();
}

/** Default settings for a new generator instance, including canvas-aware overrides */
export function getGeneratorInitialSettings(
  type: string,
  canvasWidth: number,
  canvasHeight: number,
): Record<string, unknown> | null {
  const entry = registry.get(type);
  if (!entry) return null;
  return {
    ...entry.defaultSettings,
    ...(entry.getCanvasDefaults?.(canvasWidth, canvasHeight) ?? {}),
  };
}
