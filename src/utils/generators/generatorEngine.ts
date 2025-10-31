/**
 * generatorEngine.ts - Core generator processing engine for procedural animation
 * 
 * Provides a unified interface for all generator types, dispatching to specific
 * generator implementations and returning RGBA frames ready for ASCII conversion.
 */

import type { GeneratorId, GeneratorSettings, GeneratorFrame } from '../../types/generators';
import { generateRadioWaves } from './radioWaves';
import { generateTurbulentNoise } from './turbulentNoise';
import { generateParticlePhysics } from './particlePhysics';
import { generateRainDrops } from './rainDrops';
import { generateDigitalRain } from './digitalRain';

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
 * @returns Promise<GeneratorResult> with generated RGBA frames
 */
export async function generateFrames(
  generatorId: GeneratorId,
  _settings: GeneratorSettings, // TODO: Phase 4 - Use generator settings
  width: number,
  height: number,
  frameCount: number,
  frameDuration: number,
  _seed: number // TODO: Phase 4 - Use for deterministic generation
): Promise<GeneratorResult> {
  const startTime = performance.now();
  
  try {
    let frames: GeneratorFrame[] = [];

    switch (generatorId) {
      case 'radio-waves': {
        frames = await generateRadioWaves(
          _settings as import('../../types/generators').RadioWavesSettings,
          width,
          height,
          frameCount,
          frameDuration,
          _seed
        );
        break;
      }
        
      case 'turbulent-noise': {
        frames = await generateTurbulentNoise(
          _settings as import('../../types/generators').TurbulentNoiseSettings,
          width,
          height,
          frameCount,
          frameDuration,
          _seed
        );
        break;
      }
        
      case 'particle-physics': {
        frames = await generateParticlePhysics(
          _settings as import('../../types/generators').ParticlePhysicsSettings,
          width,
          height,
          frameCount,
          frameDuration,
          _seed
        );
        break;
      }
      
      case 'rain-drops': {
        frames = await generateRainDrops(
          _settings as import('../../types/generators').RainDropsSettings,
          width,
          height,
          frameCount,
          frameDuration,
          _seed
        );
        break;
      }
      
      case 'digital-rain': {
        frames = await generateDigitalRain(
          _settings as import('../../types/generators').DigitalRainSettings,
          width,
          height,
          frameCount,
          frameDuration,
          _seed
        );
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
 * Parameter validation to ensure safe generator operation
 */

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
