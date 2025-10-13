/**
 * Effects System Types - TypeScript definitions for ASCII Motion effects
 * 
 * Defines interfaces for all effects, settings, and state management
 */

// Core effect types
export type EffectType = 'levels' | 'hue-saturation' | 'remap-colors' | 'remap-characters' | 'scatter';

// Color range targeting for effects
export interface ColorRange {
  type: 'all' | 'text' | 'background' | 'custom';
  customColors?: string[];
}

// Individual effect settings interfaces
export interface LevelsEffectSettings {
  // Input levels
  shadowsInput: number;      // 0-255: Black point
  midtonesInput: number;     // 0.1-3.0: Gamma correction (1.0 = no change)
  highlightsInput: number;   // 0-255: White point
  
  // Output levels (0-255)
  outputMin: number;
  outputMax: number;
  
  // Color targeting
  colorRange: ColorRange;
  
  // Advanced settings
  gamma: number;
}

export interface HueSaturationEffectSettings {
  // Main adjustments (-180 to +180 for hue, -100 to +100 for others)
  hue: number;
  saturation: number;
  lightness: number;
  
  // Color range targeting
  colorRange: ColorRange;
  
  // Advanced settings
  preserveLuminance: boolean;
}

export interface RemapColorsEffectSettings {
  // Map of original color -> new color
  colorMappings: Record<string, string>;
  
  // Processing options
  matchExact: boolean;
  includeTransparent: boolean;
}

export interface RemapCharactersEffectSettings {
  // Map of original character -> new character
  characterMappings: Record<string, string>;
  
  // Processing options
  preserveSpacing: boolean;
}

export interface ScatterEffectSettings {
  // Scatter strength (0-100, maps to max displacement distance of 0-10 cells)
  strength: number;
  
  // Scatter pattern type
  scatterType: 'noise' | 'bayer-2x2' | 'bayer-4x4' | 'gaussian';
  
  // Random seed for deterministic scattering
  seed: number;
  
  // Blend colors based on displacement distance
  blendColors: boolean;
}

// Effect definition for UI
export interface EffectDefinition {
  id: EffectType;
  name: string;
  icon: string; // Lucide icon name
  description: string;
  category: 'adjustment' | 'mapping' | 'filter';
}

// Canvas analysis results - extended with detailed statistics
export interface ColorFrequency {
  color: string;
  count: number;
}

export interface CharacterFrequency {
  char: string;
  count: number;
}

export interface ColorDistribution {
  color: string;
  count: number;
  percentage: number;
}

export interface CharacterDistribution {
  char: string;
  count: number;
  percentage: number;
}

export interface ColorBrightnessStats {
  brightest: string;
  darkest: string;
  averageBrightness: number;
  brightColors: string[];
  darkColors: string[];
}

export interface CanvasAnalysis {
  // Basic unique values
  uniqueColors: string[];
  uniqueCharacters: string[];
  
  // Frequency data (original simple format)
  colorFrequency: Record<string, number>;
  characterFrequency: Record<string, number>;
  
  // Extended frequency data (sorted arrays)
  colorsByFrequency: ColorFrequency[];
  charactersByFrequency: CharacterFrequency[];
  
  // Distribution data with percentages
  colorDistribution: ColorDistribution[];
  characterDistribution: CharacterDistribution[];
  
  // Cross-reference mappings
  colorToCharMap: Record<string, string[]>;
  charToColorMap: Record<string, string[]>;
  
  // Canvas statistics
  totalCells: number;
  filledCells: number;
  fillPercentage: number;
  
  // Color analysis
  colorBrightnessStats: ColorBrightnessStats;
  
  // Metadata (updated names)
  analysisTimestamp: number; // was analysisDate
  canvasHash?: string;        // optional
  frameCount?: number;        // optional
}

// Effect processing result
export interface EffectProcessingResult {
  success: boolean;
  processedCells: Map<string, import('../types').Cell> | null;
  affectedCells: number;
  processingTime: number;
  error?: string;
}

// Effect history for undo/redo system
export interface EffectHistoryAction {
  type: 'EFFECT_APPLIED';
  effectType: EffectType;
  settings: LevelsEffectSettings | HueSaturationEffectSettings | RemapColorsEffectSettings | RemapCharactersEffectSettings | ScatterEffectSettings;
  targetScope: 'canvas' | 'timeline';
  affectedFrames?: number[];
  timestamp: number;
}

// Export all settings as union type
export type EffectSettings = 
  | LevelsEffectSettings 
  | HueSaturationEffectSettings 
  | RemapColorsEffectSettings 
  | RemapCharactersEffectSettings
  | ScatterEffectSettings;

// Last applied effect info for re-apply functionality
export interface LastAppliedEffect {
  effectType: EffectType;
  effectSettings: EffectSettings;
  applyToTimeline: boolean;
  timestamp: number;
}