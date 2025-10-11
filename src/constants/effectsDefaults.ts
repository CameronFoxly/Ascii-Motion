/**
 * Effects System Constants - Default settings and effect definitions
 * 
 * Provides default configurations for all effects and UI definitions
 */

import type { 
  EffectDefinition, 
  LevelsEffectSettings, 
  HueSaturationEffectSettings, 
  RemapColorsEffectSettings, 
  RemapCharactersEffectSettings,
  ScatterEffectSettings
} from '../types/effects';

// Effect definitions for UI rendering
export const EFFECT_DEFINITIONS: EffectDefinition[] = [
  {
    id: 'levels',
    name: 'Levels',
    icon: 'BarChart3',
    description: 'Adjust brightness, contrast, and color ranges',
    category: 'adjustment'
  },
  {
    id: 'hue-saturation',
    name: 'Hue & Saturation',
    icon: 'Palette',
    description: 'Modify hue, saturation, and lightness',
    category: 'adjustment'
  },
  {
    id: 'remap-colors',
    name: 'Remap Colors',
    icon: 'RefreshCcw',
    description: 'Replace colors with visual color picker',
    category: 'mapping'
  },
  {
    id: 'remap-characters',
    name: 'Remap Characters',
    icon: 'Type',
    description: 'Replace characters with visual character selector',
    category: 'mapping'
  },
  {
    id: 'scatter',
    name: 'Scatter',
    icon: 'ScatterChart',
    description: 'Randomly scatter characters with customizable patterns',
    category: 'filter'
  }
];

// Default effect settings
export const DEFAULT_LEVELS_SETTINGS: LevelsEffectSettings = {
  // Input levels (standard range)
  shadowsInput: 0,
  midtonesInput: 1.0,  // Gamma value: 1.0 = no change
  highlightsInput: 255,
  
  // Output levels (no change)
  outputMin: 0,
  outputMax: 255,
  
  // Color targeting
  colorRange: {
    type: 'all'
  },
  
  // Advanced settings
  gamma: 1.0
};

export const DEFAULT_HUE_SATURATION_SETTINGS: HueSaturationEffectSettings = {
  // No adjustments by default
  hue: 0,
  saturation: 0,
  lightness: 0,
  
  // Color targeting
  colorRange: {
    type: 'all'
  },
  
  // Advanced settings
  preserveLuminance: false
};

export const DEFAULT_REMAP_COLORS_SETTINGS: RemapColorsEffectSettings = {
  // Empty mappings by default
  colorMappings: {},
  
  // Processing options
  matchExact: true,
  includeTransparent: false
};

export const DEFAULT_REMAP_CHARACTERS_SETTINGS: RemapCharactersEffectSettings = {
  // Empty mappings by default
  characterMappings: {},
  
  // Processing options
  preserveSpacing: true
};

export const DEFAULT_SCATTER_SETTINGS: ScatterEffectSettings = {
  // Scatter strength (0 = no scatter, 100 = max 10 cells displacement)
  strength: 50,
  
  // Pattern type
  scatterType: 'noise',
  
  // Random seed for deterministic results (0-9999)
  seed: Math.floor(Math.random() * 10000),
  
  // Blend colors based on displacement distance
  blendColors: false
};

// Canvas analysis settings
export const CANVAS_ANALYSIS = {
  // Cache invalidation time (5 minutes)
  CACHE_EXPIRY_MS: 5 * 60 * 1000,
  
  // Maximum colors/characters to analyze for performance
  MAX_UNIQUE_ITEMS: 256,
  
  // Minimum frequency to include in analysis
  MIN_FREQUENCY: 1
} as const;

// Effect processing limits
export const EFFECT_LIMITS = {
  // Maximum canvas size for real-time preview
  MAX_PREVIEW_CELLS: 10000,
  
  // Maximum frames for timeline effects
  MAX_TIMELINE_FRAMES: 1000,
  
  // Processing timeout (30 seconds)
  PROCESSING_TIMEOUT_MS: 30 * 1000
} as const;