/**
 * rainDrops.ts - Rain Drops generator implementation
 * 
 * Generates expanding ripple effects from random drop points with interference patterns.
 * Supports configurable spawn rate, expansion speed, amplitude decay, and max radius.
 */

import type { RainDropsSettings, GeneratorFrame } from '../../types/generators';
import { CELL_ASPECT_RATIO } from '../fontMetrics';

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  amplitude: number;
  active: boolean;
}

/**
 * Generate rain drops animation frames
 */
export async function generateRainDrops(
  settings: RainDropsSettings,
  width: number,
  height: number,
  frameCount: number,
  frameDuration: number,
  seed: number,
  loopSmoothing: boolean
): Promise<GeneratorFrame[]> {
  const frames: GeneratorFrame[] = [];
  
  // Calculate frame timing based on mode
  const actualFrameCount = settings.timingMode === 'frameCount' 
    ? settings.frameCount 
    : frameCount;
  
  const actualFrameDuration = settings.timingMode === 'duration'
    ? Math.floor(settings.duration / actualFrameCount)
    : frameDuration;
  
  // Initialize seeded random
  let randomState = seed;
  const seededRandom = (): number => {
    randomState = (randomState * 1103515245 + 12345) & 0x7fffffff;
    return randomState / 0x7fffffff;
  };
  
  // Initialize ripple pool
  const maxRipples = 50; // Maximum concurrent ripples
  const ripples: Ripple[] = [];
  
  // Generate each frame
  for (let frameIdx = 0; frameIdx < actualFrameCount; frameIdx++) {
    const t = frameIdx / actualFrameCount;
    
    // Calculate spawn probability per frame
    // dropFrequency is drops per second, convert to probability per frame
    const baseSpawnProbability = settings.dropFrequency / (1000 / actualFrameDuration);
    
    // Apply randomness to spawn rate
    const randomnessFactor = 1.0 + (seededRandom() - 0.5) * 2 * settings.dropFrequencyRandomness;
    let spawnChance = baseSpawnProbability * randomnessFactor;
    
    // Apply loop smoothing if enabled
    if (loopSmoothing && settings.loopSmoothingEnabled) {
      spawnChance *= Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
    }
    
    // Spawn new ripples randomly
    if (seededRandom() < spawnChance && ripples.length < maxRipples) {
      ripples.push({
        x: seededRandom() * width,
        y: seededRandom() * height,
        radius: 0,
        maxRadius: settings.rippleRadiusMax,
        amplitude: settings.rippleAmplitude,
        active: true
      });
    }
    
    // Update existing ripples
    for (const ripple of ripples) {
      if (!ripple.active) continue;
      
      // Expand ripple
      ripple.radius += settings.rippleSpeed;
      
      // Apply amplitude decay
      ripple.amplitude *= (1.0 - settings.rippleDecay);
      
      // Deactivate if reached max radius or faded out
      if (ripple.radius >= ripple.maxRadius || ripple.amplitude < 0.01) {
        ripple.active = false;
      }
    }
    
    // Remove inactive ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      if (!ripples[i].active) {
        ripples.splice(i, 1);
      }
    }
    
    // Create RGBA buffer
    const pixelCount = width * height;
    const data = new Uint8ClampedArray(pixelCount * 4);
    
    // Render ripples with interference
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let totalIntensity = 0;
        
        // Sum contributions from all ripples
        for (const ripple of ripples) {
          if (!ripple.active) continue;
          
          // Calculate distance from ripple center with aspect ratio correction
          const dx = (x - ripple.x) * CELL_ASPECT_RATIO;
          const dy = y - ripple.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Calculate ripple intensity at this distance
          // Use sine wave that propagates outward
          const wavelength = 5; // Distance between wave peaks
          const distanceFromPeak = Math.abs(distance - ripple.radius);
          
          if (distanceFromPeak < wavelength * 2) {
            const waveValue = Math.cos((distance - ripple.radius) * (2 * Math.PI / wavelength));
            const falloff = Math.max(0, 1 - distanceFromPeak / (wavelength * 2));
            const intensity = waveValue * ripple.amplitude * falloff;
            
            totalIntensity += intensity;
          }
        }
        
        // Clamp and normalize intensity
        totalIntensity = Math.max(-1, Math.min(1, totalIntensity));
        const normalizedIntensity = (totalIntensity + 1) * 0.5; // Map -1..1 to 0..1
        
        // Convert to grayscale
        const value = Math.round(normalizedIntensity * 255);
        
        // Set pixel
        const pixelIdx = (y * width + x) * 4;
        data[pixelIdx] = value;     // R
        data[pixelIdx + 1] = value; // G
        data[pixelIdx + 2] = value; // B
        data[pixelIdx + 3] = 255;   // A (fully opaque)
      }
    }
    
    frames.push({
      width,
      height,
      data,
      frameDuration: actualFrameDuration
    });
  }
  
  return frames;
}
