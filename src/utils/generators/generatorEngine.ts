/**
 * generatorEngine.ts - Core generator processing engine for procedural animation
 * 
 * Provides a unified interface for all generator types, dispatching to specific
 * generator implementations and returning RGBA frames ready for ASCII conversion.
 */

import type { GeneratorId, GeneratorSettings, GeneratorFrame } from '../../types/generators';

/**
 * Result from generator processing
 */
export interface GeneratorResult {
  success: boolean;
  frames: GeneratorFrame[];
  frameCount: number;
  processingTime: number;
  error?: string;
}

/**
 * Main generator processing function - generates RGBA frames based on generator type
 * 
 * @param generatorId - Type of generator to use
 * @param settings - Generator-specific settings (Phase 4: currently unused, placeholder frames only)
 * @param width - Canvas width in characters
 * @param height - Canvas height in characters
 * @param frameCount - Number of frames to generate
 * @param frameDuration - Duration of each frame in milliseconds
 * @param seed - Random seed for deterministic generation (Phase 4: currently unused)
 * @param loopSmoothing - Whether to apply loop smoothing (Phase 4: currently unused)
 * @returns Promise<GeneratorResult> with generated RGBA frames
 */
export async function generateFrames(
  generatorId: GeneratorId,
  _settings: GeneratorSettings, // TODO: Phase 4 - Use generator settings
  width: number,
  height: number,
  frameCount: number,
  frameDuration: number,
  _seed: number, // TODO: Phase 4 - Use for deterministic generation
  // TODO: Phase 4 - Use for loop smoothing
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _loopSmoothing: boolean = false
): Promise<GeneratorResult> {
  const startTime = performance.now();
  
  try {
    let frames: GeneratorFrame[] = [];

    switch (generatorId) {
      case 'radio-waves': {
        // TODO: Phase 4 - Implement radio waves generator
        // Will use: settings, seed, loopSmoothing
        frames = await generatePlaceholderFrames(width, height, frameCount, frameDuration);
        break;
      }
        
      case 'turbulent-noise': {
        // TODO: Phase 4 - Implement turbulent noise generator
        // Will use: settings, seed, loopSmoothing
        frames = await generatePlaceholderFrames(width, height, frameCount, frameDuration);
        break;
      }
        
      case 'particle-physics': {
        // TODO: Phase 4 - Implement particle physics generator
        // Will use: settings, seed (no loop smoothing for particles)
        frames = await generatePlaceholderFrames(width, height, frameCount, frameDuration);
        break;
      }
      
      case 'rain-drops': {
        // TODO: Phase 4 - Implement rain drops generator
        // Will use: settings, seed, loopSmoothing
        frames = await generatePlaceholderFrames(width, height, frameCount, frameDuration);
        break;
      }
        
      default:
        throw new Error(`Unknown generator type: ${generatorId}`);
    }

    const processingTime = performance.now() - startTime;

    return {
      success: true,
      frames,
      frameCount: frames.length,
      processingTime,
    };

  } catch (error) {
    const processingTime = performance.now() - startTime;
    console.error(`Generator processing failed for ${generatorId}:`, error);
    
    return {
      success: false,
      frames: [],
      frameCount: 0,
      processingTime,
      error: error instanceof Error ? error.message : 'Unknown generation error'
    };
  }
}

/**
 * Placeholder frame generation for Phase 2
 * Returns empty RGBA frames until actual generators are implemented in Phase 4
 */
async function generatePlaceholderFrames(
  width: number,
  height: number,
  frameCount: number,
  frameDuration: number
): Promise<GeneratorFrame[]> {
  const frames: GeneratorFrame[] = [];
  
  for (let i = 0; i < frameCount; i++) {
    // Create empty RGBA buffer (all transparent black)
    const data = new Uint8ClampedArray(width * height * 4);
    
    // Optional: Add a simple gradient or pattern for visual feedback during development
    // Uncomment below to add a simple brightness gradient
    /*
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const brightness = Math.floor((x / width) * 255);
        data[index] = brightness;     // R
        data[index + 1] = brightness; // G
        data[index + 2] = brightness; // B
        data[index + 3] = 255;        // A (fully opaque)
      }
    }
    */
    
    frames.push({
      width,
      height,
      data,
      frameDuration
    });
  }
  
  return frames;
}

/**
 * Validates generator settings and parameters before processing
 */
export function validateGeneratorParams(
  width: number,
  height: number,
  frameCount: number,
  frameDuration: number
): { valid: boolean; error?: string } {
  if (width <= 0 || width > 200) {
    return { valid: false, error: 'Width must be between 1 and 200' };
  }
  
  if (height <= 0 || height > 100) {
    return { valid: false, error: 'Height must be between 1 and 100' };
  }
  
  if (frameCount <= 0 || frameCount > 500) {
    return { valid: false, error: 'Frame count must be between 1 and 500' };
  }
  
  if (frameDuration < 16) {
    return { valid: false, error: 'Frame duration must be at least 16ms (60 FPS max)' };
  }
  
  return { valid: true };
}
