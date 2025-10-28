/**
 * radioWaves.ts - Radio Waves generator implementation
 * 
 * Generates concentric circular waves emanating from a configurable origin point.
 * Supports amplitude decay, gradient colors, and smooth looping.
 */

import type { RadioWavesSettings, GeneratorFrame } from '../../types/generators';

/**
 * Generate radio wave animation frames
 */
export async function generateRadioWaves(
  settings: RadioWavesSettings,
  width: number,
  height: number,
  frameCount: number,
  frameDuration: number,
  _seed: number, // Reserved for future deterministic randomness
  loopSmoothing: boolean
): Promise<GeneratorFrame[]> {
  const frames: GeneratorFrame[] = [];
  
  // Calculate frame timing based on mode
  const actualFrameCount = settings.timingMode === 'frameCount' 
    ? settings.frameCount 
    : frameCount;
  
  const actualFrameDuration = settings.timingMode === 'duration'
    ? settings.duration / actualFrameCount
    : frameDuration;
  
  // Parse gradient colors
  const startColor = hexToRgb(settings.gradientStartColor);
  const endColor = hexToRgb(settings.gradientEndColor);
  
  // Calculate origin in pixel space (each character is conceptually 1x1 pixel for this calculation)
  const originX = settings.originX;
  const originY = settings.originY;
  
  // Generate each frame
  for (let frameIdx = 0; frameIdx < actualFrameCount; frameIdx++) {
    const t = frameIdx / actualFrameCount; // 0 to 1
    
    // Apply loop smoothing if enabled
    const phase = loopSmoothing && settings.loopSmoothingEnabled
      ? Math.sin(t * Math.PI * 2) * 0.5 + 0.5 // Smooth loop using sine wave
      : t;
    
    // Calculate wave phase offset for this frame
    const waveOffset = phase * 100 * settings.propagationSpeed; // Offset in "pixels"
    
    // Create RGBA buffer (4 bytes per pixel)
    const pixelCount = width * height;
    const data = new Uint8ClampedArray(pixelCount * 4);
    
    // Render each pixel
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Calculate distance from origin
        const dx = x - originX;
        const dy = y - originY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate wave intensity based on distance and phase
        // Use sine wave with frequency and propagation
        const waveValue = Math.sin((distance - waveOffset) * settings.frequency);
        
        // Apply line thickness - wave is visible within thickness radius
        const thicknessRadius = settings.lineThickness;
        const distanceFromWavePeak = Math.abs((distance - waveOffset) % (Math.PI * 2 / settings.frequency));
        const isInWave = distanceFromWavePeak < thicknessRadius;
        
        // Calculate amplitude with decay if enabled
        let amplitude = 1.0;
        if (settings.amplitudeDecay) {
          amplitude = Math.max(0, 1.0 - (distance / Math.max(width, height)) * settings.decayRate);
        }
        
        // Calculate intensity (0 to 1)
        const intensity = isInWave ? Math.abs(waveValue) * amplitude : 0;
        
        // Apply gradient or solid color
        let r = 255, g = 255, b = 255;
        if (settings.useGradient) {
          // Interpolate between start and end colors based on distance
          const gradientT = distance / Math.max(width, height);
          r = Math.round(startColor.r + (endColor.r - startColor.r) * gradientT);
          g = Math.round(startColor.g + (endColor.g - startColor.g) * gradientT);
          b = Math.round(startColor.b + (endColor.b - startColor.b) * gradientT);
        }
        
        // Set pixel color with intensity-based alpha
        const pixelIdx = (y * width + x) * 4;
        data[pixelIdx] = r;
        data[pixelIdx + 1] = g;
        data[pixelIdx + 2] = b;
        data[pixelIdx + 3] = Math.round(intensity * 255); // Alpha channel
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

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 }; // Default to white
}
