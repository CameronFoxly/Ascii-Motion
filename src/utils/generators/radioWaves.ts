/**
 * radioWaves.ts - Radio Waves generator implementation
 * 
 * Generates concentric waves emanating from a configurable origin point.
 * Supports multiple wave shapes (circle, square, polygon, star), profile shapes,
 * amplitude decay, gradient colors, and smooth looping.
 */

import type { RadioWavesSettings, GeneratorFrame, WaveShape, ProfileShape } from '../../types/generators';
import { CELL_ASPECT_RATIO } from '../fontMetrics';

/**
 * Calculate distance based on wave shape
 */
function calculateShapeDistance(
  dx: number,
  dy: number,
  shape: WaveShape,
  rotationRadians: number
): number {
  // Apply rotation if needed (not for circles)
  let rotatedDx = dx;
  let rotatedDy = dy;
  
  if (shape !== 'circle' && rotationRadians !== 0) {
    // Rotate the point around origin
    const cos = Math.cos(rotationRadians);
    const sin = Math.sin(rotationRadians);
    rotatedDx = dx * cos - dy * sin;
    rotatedDy = dx * sin + dy * cos;
  }
  
  switch (shape) {
    case 'circle':
      return Math.sqrt(dx * dx + dy * dy);
      
    case 'square':
      return Math.max(Math.abs(rotatedDx), Math.abs(rotatedDy));
      
    case 'triangle': {
      // Equilateral triangle with point facing up
      const angle = Math.atan2(rotatedDy, rotatedDx) + Math.PI / 2;
      const r = Math.sqrt(rotatedDx * rotatedDx + rotatedDy * rotatedDy);
      const sides = 3;
      const segmentAngle = (Math.PI * 2) / sides;
      const normalizedAngle = ((angle + Math.PI) % segmentAngle) - segmentAngle / 2;
      return r * Math.cos(normalizedAngle);
    }
      
    case 'pentagon': {
      // Pentagon with point facing up
      const angle = Math.atan2(rotatedDy, rotatedDx) + Math.PI / 2;
      const r = Math.sqrt(rotatedDx * rotatedDx + rotatedDy * rotatedDy);
      const sides = 5;
      const segmentAngle = (Math.PI * 2) / sides;
      const normalizedAngle = ((angle + Math.PI) % segmentAngle) - segmentAngle / 2;
      return r * Math.cos(normalizedAngle);
    }
      
    case 'hexagon': {
      // Hexagon distance (6 sides)
      const angle = Math.atan2(rotatedDy, rotatedDx);
      const segmentAngle = (Math.PI * 2) / 6;
      const normalizedAngle = ((angle + Math.PI) % segmentAngle) - segmentAngle / 2;
      const r = Math.sqrt(rotatedDx * rotatedDx + rotatedDy * rotatedDy);
      return r * Math.cos(normalizedAngle);
    }
      
    case 'octagon': {
      // Octagon distance (8 sides)
      const angle = Math.atan2(rotatedDy, rotatedDx);
      const segmentAngle = (Math.PI * 2) / 8;
      const normalizedAngle = ((angle + Math.PI) % segmentAngle) - segmentAngle / 2;
      const r = Math.sqrt(rotatedDx * rotatedDx + rotatedDy * rotatedDy);
      return r * Math.cos(normalizedAngle);
    }
      
    case 'star': {
      // Classic 5-pointed star with point facing up
      const angle = Math.atan2(rotatedDy, rotatedDx) + Math.PI / 2;
      const r = Math.sqrt(rotatedDx * rotatedDx + rotatedDy * rotatedDy);
      const points = 5;
      const outerAngle = (Math.PI * 2) / points;
      
      const normalizedAngle = ((angle + Math.PI) % (Math.PI * 2));
      const segmentIndex = Math.floor(normalizedAngle / outerAngle);
      const angleInSegment = normalizedAngle - segmentIndex * outerAngle;
      
      const innerRadiusRatio = 0.382;
      const halfSegment = outerAngle / 2;
      
      let radiusAtAngle: number;
      if (angleInSegment < halfSegment) {
        const t = angleInSegment / halfSegment;
        radiusAtAngle = 1.0 - (1.0 - innerRadiusRatio) * t;
      } else {
        const t = (angleInSegment - halfSegment) / halfSegment;
        radiusAtAngle = innerRadiusRatio + (1.0 - innerRadiusRatio) * t;
      }
      
      return r * radiusAtAngle;
    }
      
    default:
      return Math.sqrt(dx * dx + dy * dy);
  }
}

/**
 * Calculate intensity profile based on profile shape
 */
function calculateProfileIntensity(
  crossSectionPosition: number,
  profileShape: ProfileShape
): number {
  // crossSectionPosition: 0 = outer edge, 0.5 = peak/center, 1 = inner edge
  const t = Math.max(0, Math.min(1, crossSectionPosition));
  
  switch (profileShape) {
    case 'solid':
      return 1.0;
      
    case 'fade-out':
      // Full white (1.0) at outer edge (t=0), fade to black (0.0) at inner edge (t=1)
      return 1.0 - t;
      
    case 'fade-in':
      // Full black (0.0) at outer edge (t=0), fade to white (1.0) at inner edge (t=1)
      return t;
      
    case 'fade-in-out':
      // Black (0.0) at both edges (t=0 and t=1), white (1.0) at center (t=0.5)
      return 1.0 - Math.abs(t - 0.5) * 2.0;
      
    default:
      return 1.0;
  }
}

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
    ? Math.floor(settings.duration / actualFrameCount)
    : frameDuration;
  
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
    
    // Calculate wavelength from frequency
    const wavelength = (2 * Math.PI) / settings.frequency;
    
    // Create RGBA buffer (4 bytes per pixel)
    const pixelCount = width * height;
    const data = new Uint8ClampedArray(pixelCount * 4);
    
    // Render each pixel
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Calculate distance from origin with aspect ratio correction
        // Multiply x-distance by aspectRatio to compensate for narrow cells
        const dx = (x - originX) * CELL_ASPECT_RATIO;
        const dy = y - originY;
        
        // Calculate rotation based on distance for non-circle shapes
        // Interpolate between startRotation and endRotation based on distance
        const maxDistance = Math.sqrt((width * CELL_ASPECT_RATIO) ** 2 + height ** 2);
        const actualDistance = Math.sqrt(dx * dx + dy * dy);
        const distanceRatio = actualDistance / maxDistance;
        const rotationDegrees = settings.startRotation + (settings.endRotation - settings.startRotation) * distanceRatio;
        const rotationRadians = (rotationDegrees * Math.PI) / 180;
        
        // Calculate distance using shape function with rotation
        const distance = calculateShapeDistance(dx, dy, settings.waveShape, rotationRadians);
        
        // Check if wave has exceeded its lifetime
        const lifetimeDistance = maxDistance * settings.lifetime;
        if (distance > lifetimeDistance) {
          continue; // Skip this pixel - wave has faded out
        }
        
        // Interpolate line thickness based on distance ratio (within lifetime range)
        const lifetimeRatio = distance / lifetimeDistance;
        const lineThickness = settings.startThickness + (settings.endThickness - settings.startThickness) * lifetimeRatio;
        
        // Calculate the wave pattern at this distance
        // The wave oscillates with the wavelength, offset by time
        const wavePhase = (distance - waveOffset) / wavelength;
        
        // Find distance to nearest wave peak
        // wavePhase % 1.0 gives us position within one wavelength (0 to 1)
        const fractionalPhase = wavePhase - Math.floor(wavePhase); // 0 to 1
        const distanceFromPeak = Math.abs(fractionalPhase - 0.5) * 2.0; // 0 at peak (0.5), 1 at edges (0 or 1)
        
        // Check if we're within the line thickness (interpolated)
        const thicknessRadius = lineThickness / wavelength;
        
        if (distanceFromPeak <= thicknessRadius) {
          // Calculate position across the entire wave thickness (0 to 1)
          // We want: 0 = outer edge, 0.5 = peak, 1 = inner edge
          // fractionalPhase < 0.5 means we're on the outer/leading side of the peak
          // fractionalPhase > 0.5 means we're on the inner/trailing side of the peak
          
          let crossSectionPosition: number;
          if (fractionalPhase < 0.5) {
            // Outer edge side: map from outer edge (fractionalPhase = 0.5 - thicknessRadius) to peak (0.5)
            // Result should be 0 at outer edge, 0.5 at peak
            crossSectionPosition = 0.5 - (distanceFromPeak / thicknessRadius) * 0.5;
          } else {
            // Inner edge side: map from peak (0.5) to inner edge (fractionalPhase = 0.5 + thicknessRadius)
            // Result should be 0.5 at peak, 1.0 at inner edge
            crossSectionPosition = 0.5 + (distanceFromPeak / thicknessRadius) * 0.5;
          }
          
          // Calculate base intensity using profile shape
          const profileIntensity = calculateProfileIntensity(
            crossSectionPosition,
            settings.profileShape
          );
          
          // Calculate amplitude with decay (based on lifetime distance, not max distance)
          const lifetimeDistance = maxDistance * settings.lifetime;
          const amplitude = settings.decayRate > 0 
            ? Math.max(0, 1.0 - (distance / lifetimeDistance) * settings.decayRate)
            : 1.0;
          
          // Final intensity
          const intensity = profileIntensity * amplitude;
          
          // Use grayscale based on intensity for character mapping
          const grayValue = Math.round(intensity * 255);
          const r = grayValue;
          const g = grayValue;
          const b = grayValue;
          
          // Set pixel color with full opacity (intensity is in RGB, not alpha)
          const pixelIdx = (y * width + x) * 4;
          data[pixelIdx] = r;
          data[pixelIdx + 1] = g;
          data[pixelIdx + 2] = b;
          data[pixelIdx + 3] = 255; // Full opacity - intensity is in the RGB values
        }
        // else: pixel is outside wave, leave black and transparent (default is 0)
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
