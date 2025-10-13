/**
 * Time Effects System Types
 * 
 * Type definitions for time-based animation effects including wave warp,
 * wiggle, and related timeline control operations.
 */

import type { Cell } from './index';

// Time effect types
export type TimeEffectType = 'wave-warp' | 'wiggle';

// Axis enums for wave direction
export type WaveAxis = 'horizontal' | 'vertical';

// Wiggle effect modes
export type WiggleMode = 'horizontal-wave' | 'vertical-wave' | 'noise';

/**
 * Wave Warp Effect Settings
 * 
 * Applies sine wave distortion to cells based on position.
 * Cells physically move content between positions creating wave patterns.
 */
export interface WaveWarpSettings {
  axis: WaveAxis;           // Direction of wave propagation
  frequency: number;        // Wave frequency (0.1 - 5.0)
  amplitude: number;        // Displacement amplitude in cells (1 - 20)
  speed: number;            // Wave speed in pixels/second (10 - 500)
  phase: number;            // Initial phase offset (0 - 360 degrees)
}

/**
 * Wiggle Effect Settings
 * 
 * Applies global transformation to all cells together.
 * Three modes: horizontal wave, vertical wave, or Perlin noise.
 */
export interface WiggleSettings {
  mode: WiggleMode;
  
  // Wave mode settings (horizontal-wave, vertical-wave)
  waveFrequency: number;    // 0.1 - 5.0
  waveAmplitude: number;    // 1 - 20 cells
  waveSpeed: number;        // 10 - 500 pixels/second
  
  // Noise mode settings (Perlin noise)
  noiseOctaves: number;     // 1 - 8 layers
  noiseFrequency: number;   // 0.001 - 0.1
  noiseAmplitude: number;   // 1 - 50 cells
  noiseSeed: number;        // Random seed (0 - 9999)
}

/**
 * Frame Range Control Settings
 * 
 * Controls which frames are affected by time effects.
 * Can apply to all frames or a specific range.
 */
export interface FrameRangeSettings {
  applyToAll: boolean;      // If true, ignores start/end and applies to all frames
  startFrame: number;       // 0-based index (inclusive)
  endFrame: number;         // 0-based index (inclusive)
}

/**
 * Time Effect History Action
 * 
 * Records a time effect application for undo/redo system.
 * Stores previous frame states for restoration.
 */
export interface TimeEffectHistoryAction {
  type: 'apply_time_effect';
  timestamp: number;
  description: string;
  data: {
    effectType: TimeEffectType;
    effectSettings: WaveWarpSettings | WiggleSettings;
    frameRange: FrameRangeSettings;
    affectedFrameIndices: number[];
    previousFramesData: Array<{
      frameIndex: number;
      data: Map<string, Cell>;
    }>;
  };
}

/**
 * Set Frame Duration History Action
 * 
 * Records bulk frame duration changes for undo/redo system.
 */
export interface SetFrameDurationHistoryAction {
  type: 'set_frame_durations';
  timestamp: number;
  description: string;
  data: {
    affectedFrameIndices: number[];
    newDuration: number;
    previousDurations: Array<{
      frameIndex: number;
      duration: number;
    }>;
  };
}

/**
 * Frame Duration Mode
 * 
 * Edit mode for frame duration dialog (milliseconds or FPS)
 */
export type FrameDurationMode = 'ms' | 'fps';
