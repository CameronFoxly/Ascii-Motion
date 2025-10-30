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
  amplitude: number;
  decayRate: number;  // Per-ripple decay rate
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
  seed: number
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
    // Calculate spawn probability per frame
    // dropFrequency is drops per second, convert to probability per frame
    const baseSpawnProbability = settings.dropFrequency / (1000 / actualFrameDuration);
    
    // Apply randomness to spawn rate
    const randomnessFactor = 1.0 + (seededRandom() - 0.5) * 2 * settings.dropFrequencyRandomness;
    const spawnChance = baseSpawnProbability * randomnessFactor;
    
    // Spawn new ripples randomly
    if (seededRandom() < spawnChance && ripples.length < maxRipples) {
      // Randomize initial amplitude
      const amplitudeVariation = 1.0 + (seededRandom() - 0.5) * 2 * settings.rippleAmplitudeRandomness;
      const initialAmplitude = settings.rippleAmplitude * amplitudeVariation;
      
      // Randomize decay rate
      const decayVariation = 1.0 + (seededRandom() - 0.5) * 2 * settings.rippleDecayRandomness;
      const decayRate = settings.rippleDecay * decayVariation;
      
      ripples.push({
        x: seededRandom() * width,
        y: seededRandom() * height,
        radius: settings.rippleBirthSize,
        amplitude: initialAmplitude,
        decayRate: decayRate,
        active: true
      });
    }
    
    // Create RGBA buffer
    const pixelCount = width * height;
    const data = new Uint8ClampedArray(pixelCount * 4);
    
    // Render ripples with interference
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let totalIntensity = 0;
        let maxIntensity = 0;
        
        // Sum contributions from all ripples (or find max)
        for (const ripple of ripples) {
          if (!ripple.active) continue;
          
          // Calculate distance from ripple center with aspect ratio correction
          const dx = (x - ripple.x) * CELL_ASPECT_RATIO;
          const dy = y - ripple.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Calculate ripple intensity at this distance
          // Show one wavelength ahead of radius (leading edge) and falloff behind (trailing)
          const distanceFromRadius = distance - ripple.radius;
          
          // Render from -falloffWidth (trailing) to +wavelength (leading edge)
          if (distanceFromRadius >= -settings.rippleFalloffWidth && distanceFromRadius <= settings.rippleWavelength) {
            // Wave pattern is based on distance FROM the ripple radius, not from center
            // This makes the wave move outward with the ripple
            const waveValue = Math.cos(distanceFromRadius * (2 * Math.PI / settings.rippleWavelength));
            
            // Apply falloff only to trailing edge (negative distanceFromRadius)
            let falloff = 1.0;
            if (distanceFromRadius < 0) {
              falloff = Math.max(0, 1 + distanceFromRadius / settings.rippleFalloffWidth);
            }
            
            const intensity = waveValue * ripple.amplitude * falloff;
            
            if (settings.interferenceEnabled) {
              // Add intensities (constructive/destructive interference)
              totalIntensity += intensity;
            } else {
              // Only keep the strongest ripple
              if (Math.abs(intensity) > Math.abs(maxIntensity)) {
                maxIntensity = intensity;
              }
            }
          }
        }
        
        // Use interference sum or max intensity
        const finalIntensity = settings.interferenceEnabled ? totalIntensity : maxIntensity;
        
        // Clamp and normalize intensity
        const clampedIntensity = Math.max(-1, Math.min(1, finalIntensity));
        const normalizedIntensity = (clampedIntensity + 1) * 0.5; // Map -1..1 to 0..1
        
        // Apply contrast and brightness adjustments
        // Contrast: Scale around midpoint (0.5)
        let adjustedIntensity = (normalizedIntensity - 0.5) * settings.contrast + 0.5;
        
        // Brightness: Simple addition
        adjustedIntensity += settings.brightness;
        
        // Clamp to valid range
        adjustedIntensity = Math.max(0, Math.min(1, adjustedIntensity));
        
        // Convert to grayscale
        const value = Math.round(adjustedIntensity * 255);
        
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
    
    // Update existing ripples (after rendering)
    for (const ripple of ripples) {
      if (!ripple.active) continue;
      
      // Expand ripple
      ripple.radius += settings.rippleSpeed;
      
      // Apply per-ripple amplitude decay
      ripple.amplitude *= (1.0 - ripple.decayRate);
      
      // Deactivate if faded out
      if (ripple.amplitude < 0.01) {
        ripple.active = false;
      }
    }
    
    // Remove inactive ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      if (!ripples[i].active) {
        ripples.splice(i, 1);
      }
    }
  }
  
  return frames;
}
