/**
 * 3D noise functions shared by procedural generators.
 * Perlin / simplified simplex return [-1, 1]; Worley returns [0, 1].
 */

/**
 * Simple 3D Perlin noise implementation
 * Returns value in range [-1, 1]
 */
export function perlinNoise3D(x: number, y: number, z: number): number {
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
export function simplexNoise3D(x: number, y: number, z: number): number {
  // For simplicity, use Perlin as base and add some variation
  return perlinNoise3D(x * 1.5, y * 1.5, z * 1.5) * 0.8;
}

/**
 * Simple 3D Worley (cellular) noise with time evolution
 * Returns value in range [0, 1]
 */
export function worleyNoise3D(x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  
  let minDist = 999999;
  
  // Check surrounding cells in 3D
  for (let dz = -1; dz <= 1; dz++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cellX = xi + dx;
        const cellY = yi + dy;
        const cellZ = zi + dz;
        
        // Generate random point in cell
        const hash = hash3D(cellX, cellY, cellZ);
        const pointX = cellX + (hash % 1000) / 1000;
        const pointY = cellY + ((hash * 73) % 1000) / 1000;
        const pointZ = cellZ + ((hash * 139) % 1000) / 1000;
        
        // Calculate 3D distance
        const distX = x - pointX;
        const distY = y - pointY;
        const distZ = z - pointZ;
        const dist = Math.sqrt(distX * distX + distY * distY + distZ * distZ);
        
        minDist = Math.min(minDist, dist);
      }
    }
  }
  
  return Math.min(1, minDist);
}

/**
 * Hash function for 3D coordinates
 */
export function hash3D(x: number, y: number, z: number): number {
  return ((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) & 0x7fffffff;
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
