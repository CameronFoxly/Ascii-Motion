/**
 * particlePhysics.ts - Particle Physics generator implementation
 * 
 * Generates particle system with physics simulation (gravity, velocity, bounce, friction).
 * Particles emit from configurable origin with randomized velocities.
 */

import type { ParticlePhysicsSettings, GeneratorFrame } from '../../types/generators';
import { CELL_ASPECT_RATIO } from '../fontMetrics';

/**
 * Simple 3D Perlin noise function for turbulence field
 * (Simplified version - uses basic gradient noise)
 */
function perlinNoise3D(x: number, y: number, z: number): number {
  // Integer coordinates
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const zi = Math.floor(z) & 255;
  
  // Fractional coordinates
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const zf = z - Math.floor(z);
  
  // Fade curves
  const u = fade(xf);
  const v = fade(yf);
  const w = fade(zf);
  
  // Hash coordinates
  const aaa = hash(hash(hash(xi) + yi) + zi);
  const aba = hash(hash(hash(xi) + yi + 1) + zi);
  const aab = hash(hash(hash(xi) + yi) + zi + 1);
  const abb = hash(hash(hash(xi) + yi + 1) + zi + 1);
  const baa = hash(hash(hash(xi + 1) + yi) + zi);
  const bba = hash(hash(hash(xi + 1) + yi + 1) + zi);
  const bab = hash(hash(hash(xi + 1) + yi) + zi + 1);
  const bbb = hash(hash(hash(xi + 1) + yi + 1) + zi + 1);
  
  // Interpolate
  const x1 = lerp(grad(aaa, xf, yf, zf), grad(baa, xf - 1, yf, zf), u);
  const x2 = lerp(grad(aba, xf, yf - 1, zf), grad(bba, xf - 1, yf - 1, zf), u);
  const y1 = lerp(x1, x2, v);
  
  const x3 = lerp(grad(aab, xf, yf, zf - 1), grad(bab, xf - 1, yf, zf - 1), u);
  const x4 = lerp(grad(abb, xf, yf - 1, zf - 1), grad(bbb, xf - 1, yf - 1, zf - 1), u);
  const y2 = lerp(x3, x4, v);
  
  return lerp(y1, y2, w);
}

function hash(n: number): number {
  n = (n << 13) ^ n;
  return (n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function grad(hash: number, x: number, y: number, z: number): number {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  age: number;
  lifespan: number;
  active: boolean;
  shape: 'circle' | 'square' | 'cloudlet';
  cloudletOffsets?: { x: number; y: number }[]; // For cloudlet shape
}

/**
 * Generate a spawn position based on emitter shape
 */
function getEmitterPosition(
  settings: ParticlePhysicsSettings,
  random: () => number
): { x: number; y: number } {
  const { originX, originY, emitterShape, emitterSize } = settings;
  
  switch (emitterShape) {
    case 'point':
      return { x: originX, y: originY };
      
    case 'vertical-line': {
      const offset = (random() - 0.5) * emitterSize;
      return { x: originX, y: originY + offset };
    }
      
    case 'horizontal-line': {
      const offset = (random() - 0.5) * emitterSize;
      return { x: originX + offset, y: originY };
    }
      
    case 'square': {
      const offsetX = (random() - 0.5) * emitterSize;
      const offsetY = (random() - 0.5) * emitterSize;
      return { x: originX + offsetX, y: originY + offsetY };
    }
      
    case 'circle': {
      const angle = random() * Math.PI * 2;
      const radius = random() * emitterSize / 2;
      return {
        x: originX + Math.cos(angle) * radius,
        y: originY + Math.sin(angle) * radius
      };
    }
      
    default:
      return { x: originX, y: originY };
  }
}

/**
 * Check collision between two particles
 */
function checkParticleCollision(
  p1: Particle,
  p2: Particle
): boolean {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = (p1.size + p2.size) / 2;
  return dist < minDist;
}

/**
 * Resolve collision between two particles
 */
function resolveParticleCollision(
  p1: Particle,
  p2: Particle,
  bounciness: number
): void {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  if (dist === 0) return;
  
  // Normal vector
  const nx = dx / dist;
  const ny = dy / dist;
  
  // Relative velocity
  const dvx = p2.vx - p1.vx;
  const dvy = p2.vy - p1.vy;
  
  // Relative velocity in normal direction
  const dvn = dvx * nx + dvy * ny;
  
  // Don't resolve if particles are separating
  if (dvn > 0) return;
  
  // Impulse magnitude (simplified, assuming equal mass)
  const impulse = -(1 + bounciness) * dvn / 2;
  
  // Apply impulse
  p1.vx -= impulse * nx;
  p1.vy -= impulse * ny;
  p2.vx += impulse * nx;
  p2.vy += impulse * ny;
  
  // Separate particles
  const overlap = (p1.size + p2.size) / 2 - dist;
  if (overlap > 0) {
    const separationX = nx * overlap / 2;
    const separationY = ny * overlap / 2;
    p1.x -= separationX;
    p1.y -= separationY;
    p2.x += separationX;
    p2.y += separationY;
  }
}

/**
 * Generate particle physics animation frames
 */
export async function generateParticlePhysics(
  settings: ParticlePhysicsSettings,
  width: number,
  height: number,
  frameCount: number,
  frameDuration: number,
  seed: number
  // Note: Particles don't use loop smoothing (free-running simulation)
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
  
  // Initialize particle pool
  const particles: Particle[] = [];
  for (let i = 0; i < settings.particleCount; i++) {
    // Generate cloudlet offsets if using cloudlet shape
    let cloudletOffsets: { x: number; y: number }[] | undefined;
    if (settings.particleShape === 'cloudlet') {
      cloudletOffsets = [];
      const numPoints = 5 + Math.floor(seededRandom() * 5);
      for (let j = 0; j < numPoints; j++) {
        const angle = seededRandom() * Math.PI * 2;
        const radius = seededRandom() * 0.5;
        cloudletOffsets.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius
        });
      }
    }
    
    particles.push({
      x: settings.originX,
      y: settings.originY,
      vx: 0,
      vy: 0,
      size: settings.particleSize,
      age: 0,
      lifespan: settings.lifespan,
      active: false,
      shape: settings.particleShape,
      cloudletOffsets
    });
  }
  
  // Spawn particles gradually over time (or all at once in burst mode)
  // Calculate how many particles to spawn per frame
  const particlesPerFrame = settings.emitterMode === 'burst' 
    ? settings.particleCount  // Spawn all on first frame
    : settings.particleCount / actualFrameCount; // Spread over animation
  let nextParticleIndex = 0;
  let particleDebt = 0; // Track fractional particles to spawn
  
  // Generate each frame
  for (let frameIdx = 0; frameIdx < actualFrameCount; frameIdx++) {
    // Spawn new particles - handle both whole and fractional amounts
    // In burst mode, only spawn on first frame
    if (settings.emitterMode === 'continuous' || frameIdx === 0) {
      particleDebt += particlesPerFrame;
      const particlesToSpawn = Math.floor(particleDebt);
      particleDebt -= particlesToSpawn;
      
      for (let i = 0; i < particlesToSpawn && nextParticleIndex < particles.length; i++) {
        const particle = particles[nextParticleIndex++];
        particle.active = true;
        
        // Get spawn position based on emitter shape
        const spawnPos = getEmitterPosition(settings, seededRandom);
        particle.x = spawnPos.x;
        particle.y = spawnPos.y;
        particle.age = 0;
      
      // Calculate velocity with angle randomness
      const angleRad = (settings.velocityAngle * Math.PI) / 180;
      const angleVariation = (seededRandom() - 0.5) * 2 * settings.velocityAngleRandomness * Math.PI;
      const finalAngle = angleRad + angleVariation;
      
      // Calculate velocity with speed randomness
      const speedVariation = 1.0 + (seededRandom() - 0.5) * 2 * settings.velocitySpeedRandomness;
      const finalMagnitude = settings.velocityMagnitude * speedVariation;
      
      particle.vx = Math.cos(finalAngle) * finalMagnitude;
      particle.vy = Math.sin(finalAngle) * finalMagnitude;
      
      // Randomize size if enabled
      if (settings.particleSizeRandomness) {
        particle.size = settings.particleSizeMin + 
          seededRandom() * (settings.particleSizeMax - settings.particleSizeMin);
      } else {
        particle.size = settings.particleSize;
      }
      
      // Randomize lifespan if enabled
      if (settings.lifespanRandomness) {
        const variation = 1.0 + (seededRandom() - 0.5) * 2 * settings.lifespanRandomnessAmount;
        particle.lifespan = Math.max(1, Math.floor(settings.lifespan * variation));
      } else {
        particle.lifespan = settings.lifespan;
      }
      }
    }
    
    // Update particles with physics
    for (const particle of particles) {
      if (!particle.active) continue;
      
      // Apply gravity
      particle.vy += settings.gravity * 0.1;
      
      // Apply drag
      particle.vx *= (1.0 - settings.drag);
      particle.vy *= (1.0 - settings.drag);
      
      // Apply turbulence field if enabled
      if (settings.turbulenceEnabled) {
        // Sample noise at particle position with frequency
        const noiseX = particle.x * settings.turbulenceFrequency * 0.05;
        const noiseY = particle.y * settings.turbulenceFrequency * 0.05;
        const noiseZ = frameIdx * 0.1; // Time component for animation
        
        // Get turbulence force from noise (use derivatives for vector field)
        const turbulenceX = perlinNoise3D(noiseX + 100, noiseY, noiseZ);
        const turbulenceY = perlinNoise3D(noiseX, noiseY + 100, noiseZ);
        
        // Apply turbulence to position
        particle.x += turbulenceX * settings.turbulenceAffectsPosition * 0.1;
        particle.y += turbulenceY * settings.turbulenceAffectsPosition * 0.1;
      }
      
      // Update position (Euler integration)
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Handle edge behavior
      if (settings.edgeBounce) {
        // Bounce off edges with friction and bounciness
        if (particle.x < 0 || particle.x >= width) {
          particle.vx *= -settings.bounciness;
          particle.vy *= (1.0 - settings.edgeFriction);
          particle.x = Math.max(0, Math.min(width - 1, particle.x));
        }
        if (particle.y < 0 || particle.y >= height) {
          particle.vy *= -settings.bounciness;
          particle.vx *= (1.0 - settings.edgeFriction);
          particle.y = Math.max(0, Math.min(height - 1, particle.y));
        }
      } else {
        // Particles leave canvas when they reach the edge
        if (particle.x < 0 || particle.x >= width || particle.y < 0 || particle.y >= height) {
          particle.active = false;
          continue;
        }
      }
      
      // Age particle
      particle.age++;
      if (particle.age >= particle.lifespan) {
        particle.active = false;
      }
    }
    
    // Handle self-collisions if enabled
    if (settings.selfCollisions) {
      const activeParticles = particles.filter(p => p.active);
      for (let i = 0; i < activeParticles.length; i++) {
        for (let j = i + 1; j < activeParticles.length; j++) {
          if (checkParticleCollision(activeParticles[i], activeParticles[j])) {
            resolveParticleCollision(activeParticles[i], activeParticles[j], settings.bounciness);
          }
        }
      }
    }
    
    // Create RGBA buffer
    const pixelCount = width * height;
    const data = new Uint8ClampedArray(pixelCount * 4);
    
    // Render particles
    for (const particle of particles) {
      if (!particle.active) continue;
      
      // Calculate interpolation factor based on lifetime
      const lifetimeRatio = particle.age / particle.lifespan;
      
      // Interpolate opacity from start to end
      const opacity = settings.startOpacity + (settings.endOpacity - settings.startOpacity) * lifetimeRatio;
      
      // Interpolate size multiplier from start to end
      let sizeMultiplier = settings.startSizeMultiplier + (settings.endSizeMultiplier - settings.startSizeMultiplier) * lifetimeRatio;
      
      // Apply turbulence to scale if enabled
      if (settings.turbulenceEnabled && settings.turbulenceAffectsScale > 0) {
        const noiseX = particle.x * settings.turbulenceFrequency * 0.05;
        const noiseY = particle.y * settings.turbulenceFrequency * 0.05;
        const noiseZ = frameIdx * 0.1;
        const scaleNoise = perlinNoise3D(noiseX + 200, noiseY + 200, noiseZ);
        // Map noise from [-1, 1] to a multiplier around 1.0
        const scaleVariation = 1.0 + scaleNoise * settings.turbulenceAffectsScale;
        sizeMultiplier *= scaleVariation;
      }
      
      const currentSize = particle.size * sizeMultiplier;
      
      const px = Math.floor(particle.x);
      const py = Math.floor(particle.y);
      // Keep radius as float for smoother interpolation
      const radius = currentSize / 2;
      const radiusCeil = Math.ceil(radius);
      
      // Render based on particle shape
      switch (particle.shape) {
        case 'circle': {
          // Render as filled circle with aspect ratio correction
          for (let dy = -radiusCeil; dy <= radiusCeil; dy++) {
            for (let dx = -radiusCeil; dx <= radiusCeil; dx++) {
              const correctedDx = dx * CELL_ASPECT_RATIO;
              const dist = Math.sqrt(correctedDx * correctedDx + dy * dy);
              if (dist <= radius) {
                const x = px + dx;
                const y = py + dy;
                
                if (x >= 0 && x < width && y >= 0 && y < height) {
                  const pixelIdx = (y * width + x) * 4;
                  const edgeFade = radius - dist;
                  const finalAlpha = Math.min(1, edgeFade) * opacity;
                  
                  // Convert opacity to grayscale luminosity (0-255)
                  const luminosity = Math.round(finalAlpha * 255);
                  
                  // Use max to handle overlapping particles
                  data[pixelIdx] = Math.max(data[pixelIdx], luminosity);
                  data[pixelIdx + 1] = Math.max(data[pixelIdx + 1], luminosity);
                  data[pixelIdx + 2] = Math.max(data[pixelIdx + 2], luminosity);
                  data[pixelIdx + 3] = 255; // Full opacity - intensity is in RGB
                }
              }
            }
          }
          break;
        }
        
        case 'square': {
          // Render as filled square
          for (let dy = -radiusCeil; dy <= radiusCeil; dy++) {
            for (let dx = -radiusCeil; dx <= radiusCeil; dx++) {
              // Check if within the actual radius bounds
              if (Math.abs(dx) <= radius && Math.abs(dy) <= radius) {
                const x = px + dx;
                const y = py + dy;
                
                if (x >= 0 && x < width && y >= 0 && y < height) {
                  const pixelIdx = (y * width + x) * 4;
                  
                  // Convert opacity to grayscale luminosity (0-255)
                  const luminosity = Math.round(opacity * 255);
                  
                  // Use max to handle overlapping particles
                  data[pixelIdx] = Math.max(data[pixelIdx], luminosity);
                  data[pixelIdx + 1] = Math.max(data[pixelIdx + 1], luminosity);
                  data[pixelIdx + 2] = Math.max(data[pixelIdx + 2], luminosity);
                  data[pixelIdx + 3] = 255; // Full opacity - intensity is in RGB
                }
              }
            }
          }
          break;
        }
        
        case 'cloudlet': {
          // Render as blob using cloudlet offsets
          if (particle.cloudletOffsets) {
            for (const offset of particle.cloudletOffsets) {
              const cx = px + Math.floor(offset.x * currentSize);
              const cy = py + Math.floor(offset.y * currentSize);
              const blobRadius = radius / 2;
              const blobRadiusCeil = Math.ceil(blobRadius);
              
              for (let dy = -blobRadiusCeil; dy <= blobRadiusCeil; dy++) {
                for (let dx = -blobRadiusCeil; dx <= blobRadiusCeil; dx++) {
                  const correctedDx = dx * CELL_ASPECT_RATIO;
                  const dist = Math.sqrt(correctedDx * correctedDx + dy * dy);
                  if (dist <= blobRadius) {
                    const x = cx + dx;
                    const y = cy + dy;
                    
                    if (x >= 0 && x < width && y >= 0 && y < height) {
                      const pixelIdx = (y * width + x) * 4;
                      const edgeFade = blobRadius - dist;
                      const finalAlpha = Math.min(1, edgeFade) * opacity;
                      
                      // Convert opacity to grayscale luminosity (0-255)
                      const luminosity = Math.round(finalAlpha * 255);
                      
                      // Use max to handle overlapping particles
                      data[pixelIdx] = Math.max(data[pixelIdx], luminosity);
                      data[pixelIdx + 1] = Math.max(data[pixelIdx + 1], luminosity);
                      data[pixelIdx + 2] = Math.max(data[pixelIdx + 2], luminosity);
                      data[pixelIdx + 3] = 255; // Full opacity - intensity is in RGB
                    }
                  }
                }
              }
            }
          }
          break;
        }
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
