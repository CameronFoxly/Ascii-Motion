/**
 * Time Effects Constants
 * 
 * Default settings, parameter ranges, and configuration for time-based effects.
 */

import type { WaveWarpSettings, WiggleSettings } from '../types/timeEffects';

// ==========================================
// Wave Warp Effect Constants
// ==========================================

/**
 * Default Wave Warp Settings
 */
export const DEFAULT_WAVE_WARP_SETTINGS: WaveWarpSettings = {
  axis: 'horizontal',
  frequency: 0.6,
  amplitude: 2,
  speed: 10,
  phase: 0
};

/**
 * Wave Warp Parameter Ranges
 * 
 * Defines min/max/step values for all wave warp controls
 */
export const WAVE_WARP_RANGES = {
  FREQUENCY: { min: 0.1, max: 2.5, step: 0.1 },
  AMPLITUDE: { min: 0, max: 10, step: 1 },
  SPEED: { min: -200, max: 200, step: 10 },
  PHASE: { min: 0, max: 360, step: 1 }
} as const;

// ==========================================
// Wiggle Effect Constants
// ==========================================

/**
 * Default Wiggle Settings
 */
export const DEFAULT_WIGGLE_SETTINGS: WiggleSettings = {
  mode: 'horizontal-wave',
  // Wave settings
  waveFrequency: 1.0,
  waveAmplitude: 3,
  waveSpeed: 100,
  // Noise settings
  noiseOctaves: 4,
  noiseFrequency: 0.01,
  noiseAmplitude: 10,
  noiseSeed: 1234
};

/**
 * Wiggle Parameter Ranges
 * 
 * Defines min/max/step values for all wiggle controls
 */
export const WIGGLE_RANGES = {
  // Wave mode ranges
  WAVE_FREQUENCY: { min: 0.1, max: 5.0, step: 0.1 },
  WAVE_AMPLITUDE: { min: 1, max: 20, step: 1 },
  WAVE_SPEED: { min: 10, max: 500, step: 10 },
  
  // Noise mode ranges
  NOISE_OCTAVES: { min: 1, max: 8, step: 1 },
  NOISE_FREQUENCY: { min: 0.001, max: 0.1, step: 0.001 },
  NOISE_AMPLITUDE: { min: 1, max: 50, step: 1 },
  NOISE_SEED: { min: 0, max: 9999, step: 1 }
} as const;

// ==========================================
// Frame Duration Constants
// ==========================================

/**
 * Frame Duration Limits
 * 
 * Defines acceptable ranges for frame durations in milliseconds and FPS
 */
export const FRAME_DURATION_LIMITS = {
  MIN_MS: 50,
  MAX_MS: 10000,
  MIN_FPS: 1,
  MAX_FPS: 60,
  DEFAULT_MS: 100,
  DEFAULT_FPS: 10
} as const;

// ==========================================
// Add Frames Constants
// ==========================================

/**
 * Add Frames Limits
 * 
 * Defines acceptable range for bulk frame creation
 */
export const ADD_FRAMES_LIMITS = {
  MIN_COUNT: 1,
  MAX_COUNT: 100,
  DEFAULT_COUNT: 5
} as const;

// ==========================================
// General Time Effects Constants
// ==========================================

/**
 * Preview opacity for time effects (matches effects system)
 */
export const TIME_EFFECT_PREVIEW_OPACITY = 0.8;

/**
 * Dialog positioning constants
 */
export const TIME_EFFECT_DIALOG_POSITION = {
  INITIAL_X: 20,   // 20px from left edge
  INITIAL_Y: -100, // 100px from bottom (calculated from viewport height)
  Z_INDEX: 99999   // Above all other content (matches picker z-index)
} as const;
