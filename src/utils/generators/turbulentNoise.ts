/**
 * turbulentNoise.ts - Turbulent Noise generator implementation
 * 
 * Generates Perlin/Simplex noise with fractal octaves and temporal evolution.
 * Supports configurable noise type, octaves, persistence, lacunarity, and evolution speed.
 */

import type { TurbulentNoiseSettings, GeneratorFrame } from '../../types/generators';

/**
 * Generate turbulent noise animation frames
 */
export async function generateTurbulentNoise(
  settings: TurbulentNoiseSettings,
  width: number,
  height: number,
  frameCount: number,
  frameDuration: number,
  _seed: number // Reserved for deterministic seeding
): Promise<GeneratorFrame[]> {
  const frames: GeneratorFrame[] = [];
  
  // Calculate frame timing based on mode
  const actualFrameCount = settings.timingMode === 'frameCount' 
    ? settings.frameCount 
    : frameCount;
  
  const actualFrameDuration = settings.timingMode === 'duration'
    ? Math.floor(settings.duration / actualFrameCount)
    : frameDuration;
  
  // Generate each frame
  for (let frameIdx = 0; frameIdx < actualFrameCount; frameIdx++) {
    const t = frameIdx / actualFrameCount; // 0 to 1
    
    // Calculate time offset for evolution
    const timeOffset = t * settings.evolutionSpeed * 100;
    
    // Create RGBA buffer
    const pixelCount = width * height;
    const data = new Uint8ClampedArray(pixelCount * 4);
    
    // Render each pixel
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Calculate noise value with octaves (fractal noise)
        let noiseValue = 0;
        let amplitude = settings.amplitude;
        let frequency = settings.baseFrequency;
        let maxValue = 0;
        
        for (let octave = 0; octave < settings.octaves; octave++) {
          // Calculate sample position with offsets and frequency
          const sampleX = (x + settings.offsetX) * frequency / width;
          const sampleY = (y + settings.offsetY) * frequency / height;
          const sampleZ = timeOffset * 0.01; // Time dimension for evolution
          
          // Get noise value based on type
          let octaveNoise = 0;
          switch (settings.noiseType) {
            case 'perlin':
              octaveNoise = perlinNoise3D(sampleX, sampleY, sampleZ);
              break;
            case 'simplex':
              octaveNoise = simplexNoise3D(sampleX, sampleY, sampleZ);
              break;
            case 'worley':
              octaveNoise = worleyNoise2D(sampleX, sampleY);
              break;
          }
          
          noiseValue += octaveNoise * amplitude;
          maxValue += amplitude;
          
          // Update for next octave
          amplitude *= settings.persistence;
          frequency *= settings.lacunarity;
        }
        
        // Normalize to 0-1 range
        noiseValue = (noiseValue / maxValue) * 0.5 + 0.5;
        
        // Convert to grayscale color (0-255)
        const intensity = Math.round(noiseValue * 255);
        
        // Set pixel
        const pixelIdx = (y * width + x) * 4;
        data[pixelIdx] = intensity;     // R
        data[pixelIdx + 1] = intensity; // G
        data[pixelIdx + 2] = intensity; // B
        data[pixelIdx + 3] = 255;       // A (fully opaque)
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
 * Simple 3D Perlin noise implementation
 * Returns value in range [-1, 1]
 */
function perlinNoise3D(x: number, y: number, z: number): number {
  // Simplified Perlin noise using gradients
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;
  
  // Fade curves
  const u = fade(xf);
  const v = fade(yf);
  const w = fade(zf);
  
  // Hash coordinates of the 8 cube corners
  const aaa = grad3D(hash3D(xi, yi, zi), xf, yf, zf);
  const aba = grad3D(hash3D(xi, yi + 1, zi), xf, yf - 1, zf);
  const aab = grad3D(hash3D(xi, yi, zi + 1), xf, yf, zf - 1);
  const abb = grad3D(hash3D(xi, yi + 1, zi + 1), xf, yf - 1, zf - 1);
  const baa = grad3D(hash3D(xi + 1, yi, zi), xf - 1, yf, zf);
  const bba = grad3D(hash3D(xi + 1, yi + 1, zi), xf - 1, yf - 1, zf);
  const bab = grad3D(hash3D(xi + 1, yi, zi + 1), xf - 1, yf, zf - 1);
  const bbb = grad3D(hash3D(xi + 1, yi + 1, zi + 1), xf - 1, yf - 1, zf - 1);
  
  // Interpolate
  const x1 = lerp(aaa, baa, u);
  const x2 = lerp(aba, bba, u);
  const x3 = lerp(aab, bab, u);
  const x4 = lerp(abb, bbb, u);
  
  const y1 = lerp(x1, x2, v);
  const y2 = lerp(x3, x4, v);
  
  return lerp(y1, y2, w);
}

/**
 * Simplified 3D Simplex noise
 * Returns value in range [-1, 1]
 */
function simplexNoise3D(x: number, y: number, z: number): number {
  // For simplicity, use Perlin as base and add some variation
  return perlinNoise3D(x * 1.5, y * 1.5, z * 1.5) * 0.8;
}

/**
 * Simple 2D Worley (cellular) noise
 * Returns value in range [0, 1]
 */
function worleyNoise2D(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  
  let minDist = 999999;
  
  // Check surrounding cells
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cellX = xi + dx;
      const cellY = yi + dy;
      
      // Generate random point in cell
      const hash = hash2D(cellX, cellY);
      const pointX = cellX + (hash % 1000) / 1000;
      const pointY = cellY + ((hash * 73) % 1000) / 1000;
      
      // Calculate distance
      const distX = x - pointX;
      const distY = y - pointY;
      const dist = Math.sqrt(distX * distX + distY * distY);
      
      minDist = Math.min(minDist, dist);
    }
  }
  
  return Math.min(1, minDist);
}

/**
 * Hash function for 3D coordinates
 */
function hash3D(x: number, y: number, z: number): number {
  return ((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) & 0x7fffffff;
}

/**
 * Hash function for 2D coordinates
 */
function hash2D(x: number, y: number): number {
  return ((x * 73856093) ^ (y * 19349663)) & 0x7fffffff;
}

/**
 * Gradient function for 3D Perlin noise
 */
function grad3D(hash: number, x: number, y: number, z: number): number {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

/**
 * Fade curve for smooth interpolation
 */
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Linear interpolation
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
