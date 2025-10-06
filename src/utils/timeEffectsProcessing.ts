/**
 * Time Effects Processing Utilities
 * 
 * Core transformation algorithms for time-based effects including wave warp,
 * wiggle, and accumulated time calculations.
 */

import { createNoise2D } from 'simplex-noise';
import type { Cell } from '../types';
import type { WaveWarpSettings, WiggleSettings } from '../types/timeEffects';

/**
 * Calculate accumulated time from frame 0 to target frame index
 * 
 * This respects real-world time progression rather than treating each frame
 * as an equal time step. Used to determine wave phase based on actual duration.
 * 
 * @param frames - Array of frames with duration property
 * @param targetFrameIndex - Index of frame to calculate accumulated time for
 * @returns Total milliseconds from start to target frame
 */
export function calculateAccumulatedTime(
  frames: Array<{ duration: number }>,
  targetFrameIndex: number
): number {
  let accumulatedTime = 0;
  
  // Sum durations up to and including target frame
  for (let i = 0; i <= targetFrameIndex && i < frames.length; i++) {
    accumulatedTime += frames[i].duration;
  }
  
  return accumulatedTime;
}

/**
 * Apply wave warp effect to a single frame
 * 
 * Moves cell content based on sine wave displacement. The wave progresses
 * based on accumulated real-world time, creating smooth motion across frames
 * regardless of individual frame durations.
 * 
 * @param frameData - Original frame cell data
 * @param canvasWidth - Canvas width for bounds checking
 * @param canvasHeight - Canvas height for bounds checking
 * @param settings - Wave warp configuration
 * @param accumulatedTime - Total milliseconds from frame 0 to current frame
 * @returns New frame data with transformed cell positions
 */
export function applyWaveWarpToFrame(
  frameData: Map<string, Cell>,
  canvasWidth: number,
  canvasHeight: number,
  settings: WaveWarpSettings,
  accumulatedTime: number
): Map<string, Cell> {
  const newFrameData = new Map<string, Cell>();
  const { axis, frequency, amplitude, speed, phase } = settings;
  
  // Calculate wave phase based on accumulated time and speed
  // speed is in pixels/second, so divide by 1000 to get pixels/ms
  // Add phase offset converted from degrees to radians
  const wavePhase = (accumulatedTime * speed / 1000) + (phase * Math.PI / 180);
  
  // Process each cell and calculate its new position
  frameData.forEach((cell, key) => {
    const [x, y] = key.split(',').map(Number);
    
    let newX = x;
    let newY = y;
    
    if (axis === 'horizontal') {
      // Horizontal wave: vertical displacement based on x position
      // Each x position gets a different phase based on its coordinate
      const displacement = Math.round(
        amplitude * Math.sin((x * frequency * Math.PI / 10) + wavePhase)
      );
      newY = y + displacement;
    } else {
      // Vertical wave: horizontal displacement based on y position
      const displacement = Math.round(
        amplitude * Math.sin((y * frequency * Math.PI / 10) + wavePhase)
      );
      newX = x + displacement;
    }
    
    // Only place cell if it's within canvas bounds
    if (newX >= 0 && newX < canvasWidth && newY >= 0 && newY < canvasHeight) {
      newFrameData.set(`${newX},${newY}`, cell);
    }
    // Cells that go out of bounds are effectively erased
  });
  
  return newFrameData;
}

/**
 * Apply wiggle effect to a single frame
 * 
 * Moves all cells together (global transform) based on wave or Perlin noise function.
 * Unlike wave warp, this doesn't create wave patterns but shifts the entire canvas content.
 * 
 * @param frameData - Original frame cell data
 * @param canvasWidth - Canvas width for bounds checking
 * @param canvasHeight - Canvas height for bounds checking
 * @param settings - Wiggle configuration
 * @param accumulatedTime - Total milliseconds from frame 0 to current frame
 * @returns New frame data with globally transformed cell positions
 */
export function applyWiggleToFrame(
  frameData: Map<string, Cell>,
  canvasWidth: number,
  canvasHeight: number,
  settings: WiggleSettings,
  accumulatedTime: number
): Map<string, Cell> {
  const newFrameData = new Map<string, Cell>();
  
  let offsetX = 0;
  let offsetY = 0;
  
  if (settings.mode === 'horizontal-wave') {
    // Horizontal wave motion: X displacement only
    const phase = (accumulatedTime * settings.waveSpeed / 1000);
    offsetX = Math.round(
      settings.waveAmplitude * Math.sin(settings.waveFrequency * phase)
    );
  } else if (settings.mode === 'vertical-wave') {
    // Vertical wave motion: Y displacement only
    const phase = (accumulatedTime * settings.waveSpeed / 1000);
    offsetY = Math.round(
      settings.waveAmplitude * Math.sin(settings.waveFrequency * phase)
    );
  } else if (settings.mode === 'noise') {
    // Perlin noise motion: 2D displacement
    // Create noise function with deterministic seed
    const noise2D = createNoise2D(() => settings.noiseSeed / 9999);
    const timeScale = accumulatedTime / 1000; // Convert to seconds for better range
    
    // Apply octaves for layered noise (more complex motion)
    for (let octave = 0; octave < settings.noiseOctaves; octave++) {
      const octaveScale = Math.pow(2, octave);
      const octaveAmplitude = settings.noiseAmplitude / octaveScale;
      
      offsetX += octaveAmplitude * noise2D(
        timeScale * settings.noiseFrequency * octaveScale,
        0
      );
      offsetY += octaveAmplitude * noise2D(
        0,
        timeScale * settings.noiseFrequency * octaveScale
      );
    }
    
    offsetX = Math.round(offsetX);
    offsetY = Math.round(offsetY);
  }
  
  // Apply calculated offset to all cells
  frameData.forEach((cell, key) => {
    const [x, y] = key.split(',').map(Number);
    const newX = x + offsetX;
    const newY = y + offsetY;
    
    // Only place cell if it's within canvas bounds
    if (newX >= 0 && newX < canvasWidth && newY >= 0 && newY < canvasHeight) {
      newFrameData.set(`${newX},${newY}`, cell);
    }
  });
  
  return newFrameData;
}

/**
 * Convert FPS (frames per second) to milliseconds per frame
 * 
 * @param fps - Frames per second (1-60)
 * @returns Milliseconds per frame
 */
export function fpsToMs(fps: number): number {
  if (fps <= 0) return 1000; // Prevent division by zero
  return Math.round(1000 / fps);
}

/**
 * Convert milliseconds per frame to FPS (frames per second)
 * 
 * @param ms - Milliseconds per frame (50-10000)
 * @returns Frames per second
 */
export function msToFps(ms: number): number {
  if (ms <= 0) return 1; // Prevent division by zero
  return Math.round(1000 / ms);
}

/**
 * Validate frame duration value
 * 
 * @param ms - Milliseconds to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Clamped value within bounds
 */
export function clampFrameDuration(ms: number, min: number = 17, max: number = 10000): number {
  return Math.max(min, Math.min(max, ms));
}

/**
 * Validate FPS value
 * 
 * @param fps - FPS to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Clamped value within bounds
 */
export function clampFps(fps: number, min: number = 1, max: number = 60): number {
  return Math.max(min, Math.min(max, fps));
}
