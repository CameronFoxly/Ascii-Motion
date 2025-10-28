/**
 * particlePhysics.ts - Particle Physics generator implementation
 * 
 * Generates particle system with Euler integration, gravity, drag, and bounce physics.
 * Particles spawn from an origin point with configurable velocity and lifespan.
 */

import type { ParticlePhysicsSettings, GeneratorFrame } from '../../types/generators';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  age: number;
  lifespan: number;
  active: boolean;
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
  
  // Calculate frame timing
  const actualFrameCount = settings.timingMode === 'frameCount' 
    ? settings.frameCount 
    : frameCount;
  
  const actualFrameDuration = settings.timingMode === 'duration'
    ? settings.duration / actualFrameCount
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
    particles.push({
      x: settings.originX,
      y: settings.originY,
      vx: 0,
      vy: 0,
      size: settings.particleSize,
      age: 0,
      lifespan: settings.lifespan,
      active: false
    });
  }
  
  // Spawn particles gradually over time
  const spawnInterval = Math.max(1, Math.floor(actualFrameCount / settings.particleCount));
  let nextParticleIndex = 0;
  
  // Generate each frame
  for (let frameIdx = 0; frameIdx < actualFrameCount; frameIdx++) {
    // Spawn new particles
    if (frameIdx % spawnInterval === 0 && nextParticleIndex < particles.length) {
      const particle = particles[nextParticleIndex++];
      particle.active = true;
      particle.x = settings.originX;
      particle.y = settings.originY;
      particle.age = 0;
      
      // Calculate velocity with randomness
      const angleRad = (settings.velocityAngle * Math.PI) / 180;
      const angleVariation = (seededRandom() - 0.5) * 2 * settings.velocityRandomness * Math.PI;
      const finalAngle = angleRad + angleVariation;
      
      const magnitudeVariation = 1.0 + (seededRandom() - 0.5) * settings.velocityRandomness;
      const finalMagnitude = settings.velocityMagnitude * magnitudeVariation;
      
      particle.vx = Math.cos(finalAngle) * finalMagnitude;
      particle.vy = Math.sin(finalAngle) * finalMagnitude;
      
      // Randomize size if enabled
      if (settings.particleSizeRandomness) {
        particle.size = settings.particleSizeMin + 
          seededRandom() * (settings.particleSizeMax - settings.particleSizeMin);
      } else {
        particle.size = settings.particleSize;
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
      
      // Update position (Euler integration)
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Bounce off edges
      if (particle.x < 0 || particle.x >= width) {
        particle.vx *= -1;
        particle.x = Math.max(0, Math.min(width - 1, particle.x));
      }
      if (particle.y < 0 || particle.y >= height) {
        particle.vy *= -1;
        particle.y = Math.max(0, Math.min(height - 1, particle.y));
      }
      
      // Age particle
      particle.age++;
      if (particle.age >= particle.lifespan) {
        particle.active = false;
      }
    }
    
    // Create RGBA buffer
    const pixelCount = width * height;
    const data = new Uint8ClampedArray(pixelCount * 4);
    
    // Render particles
    for (const particle of particles) {
      if (!particle.active) continue;
      
      // Calculate fade based on age
      const lifetimeRatio = particle.age / particle.lifespan;
      const alpha = 1.0 - lifetimeRatio; // Fade out as particle ages
      
      // Render particle as a filled circle
      const px = Math.floor(particle.x);
      const py = Math.floor(particle.y);
      const radius = Math.ceil(particle.size / 2);
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= radius) {
            const x = px + dx;
            const y = py + dy;
            
            if (x >= 0 && x < width && y >= 0 && y < height) {
              const pixelIdx = (y * width + x) * 4;
              
              // Use distance for anti-aliasing
              const edgeFade = radius - dist;
              const finalAlpha = Math.min(1, edgeFade) * alpha;
              
              // White particles
              data[pixelIdx] = 255;
              data[pixelIdx + 1] = 255;
              data[pixelIdx + 2] = 255;
              data[pixelIdx + 3] = Math.max(data[pixelIdx + 3], Math.round(finalAlpha * 255));
            }
          }
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
