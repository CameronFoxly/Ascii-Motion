/**
 * digitalRain.ts - Digital Rain (Matrix) generator implementation
 * 
 * Generates vertical falling trails with luminosity fade from white to black.
 * Supports configurable trail length, speed, direction, and noise overlay.
 */

import type { DigitalRainSettings, GeneratorFrame } from '../../types/generators';

interface DigitalTrail {
  x: number;              // Horizontal position (constant for vertical trails)
  y: number;              // Vertical position (head of trail)
  velocityX: number;      // Horizontal velocity component
  velocityY: number;      // Vertical velocity component
  length: number;         // Number of pixels in trail
  width: number;          // Width of trail in pixels
  speed: number;          // Movement speed in pixels/frame
  active: boolean;        // Whether trail is still visible on canvas
}

/**
 * Generate digital rain animation frames
 */
export async function generateDigitalRain(
  settings: DigitalRainSettings,
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
  
  // Initialize seeded random (Mulberry32)
  let randomState = seed;
  const seededRandom = (): number => {
    randomState = (randomState * 1103515245 + 12345) & 0x7fffffff;
    return randomState / 0x7fffffff;
  };
  
  // Convert direction angle from compass (0°=up, 90°=right, 180°=down, 270°=left)
  // to standard math coordinates for velocity calculation
  const angleRadians = ((settings.directionAngle + 90) % 360) * (Math.PI / 180);
  const baseVelocityX = Math.cos(angleRadians);
  const baseVelocityY = -Math.sin(angleRadians); // Negative because canvas Y increases downward
  
  // Initialize trail pool
  const maxTrails = 100; // Maximum concurrent trails
  const trails: DigitalTrail[] = [];
  
  // Perlin-style noise state for noise overlay (if enabled)
  let noisePhase = 0;
  
  // Pre-run: spawn initial trails if enabled
  if (settings.preRun) {
    // Calculate steady-state trail count based on frequency and expected lifetime
    // Spawn rate per frame
    const fps = 1000 / actualFrameDuration;
    const spawnRatePerFrame = settings.frequency / fps;
    
    // Expected lifetime: time for trail to cross canvas plus trail length
    // Trail needs to travel approximately canvas dimension + trail length to fully exit
    const averageDistance = Math.max(width, height) + settings.trailLength;
    const averageLifetimeFrames = averageDistance / settings.speed;
    
    // Steady state: spawn rate × lifetime
    const steadyStateTrailCount = Math.floor(spawnRatePerFrame * averageLifetimeFrames * 0.5); // 0.5 factor to be conservative
    
    // Cap at reasonable limits
    const initialTrailCount = Math.min(steadyStateTrailCount, maxTrails, 50);
    
    for (let i = 0; i < initialTrailCount; i++) {
      // Randomize trail length
      const lengthVariation = 1.0 + (seededRandom() - 0.5) * 2 * settings.trailLengthRandomness;
      const trailLength = Math.max(1, Math.round(settings.trailLength * lengthVariation));
      
      // Randomize speed
      const speedVariation = 1.0 + (seededRandom() - 0.5) * 2 * settings.speedRandomness;
      const trailSpeed = settings.speed * speedVariation;
      
      // Randomize width
      let trailWidth = settings.trailWidth;
      if (settings.widthRandomness) {
        const widthRange = settings.widthMax - settings.widthMin;
        trailWidth = settings.widthMin + seededRandom() * widthRange;
      }
      
      // Speed is in characters per frame
      const pixelsPerFrame = trailSpeed;
      
      // Calculate velocity components
      const velocityX = baseVelocityX * pixelsPerFrame;
      const velocityY = baseVelocityY * pixelsPerFrame;
      
      // Spawn at random position across canvas
      const spawnX = seededRandom() * width;
      const spawnY = seededRandom() * height; // Random Y position within canvas
      
      trails.push({
        x: spawnX,
        y: spawnY,
        velocityX,
        velocityY,
        length: trailLength,
        width: trailWidth,
        speed: trailSpeed,
        active: true
      });
    }
  }
  
  // Generate each frame
  for (let frameIdx = 0; frameIdx < actualFrameCount; frameIdx++) {
    // Calculate spawn probability per frame
    // frequency is trails per second, convert to probability per frame
    const baseSpawnProbability = settings.frequency / (1000 / actualFrameDuration);
    
    // Spawn new trails randomly
    if (seededRandom() < baseSpawnProbability && trails.length < maxTrails) {
      // Randomize trail length
      const lengthVariation = 1.0 + (seededRandom() - 0.5) * 2 * settings.trailLengthRandomness;
      const trailLength = Math.max(1, Math.round(settings.trailLength * lengthVariation));
      
      // Randomize speed
      const speedVariation = 1.0 + (seededRandom() - 0.5) * 2 * settings.speedRandomness;
      const trailSpeed = settings.speed * speedVariation;
      
      // Randomize width
      let trailWidth = settings.trailWidth;
      if (settings.widthRandomness) {
        const widthRange = settings.widthMax - settings.widthMin;
        trailWidth = settings.widthMin + seededRandom() * widthRange;
      }
      
      // Speed is in characters per frame (not pixels per second)
      const pixelsPerFrame = trailSpeed;
      
      // Calculate velocity components
      const velocityX = baseVelocityX * pixelsPerFrame;
      const velocityY = baseVelocityY * pixelsPerFrame;
      
      // Spawn at random position along canvas width
      const spawnX = seededRandom() * width;
      
      // Spawn just off-screen at the top (for downward trails)
      // Adjust spawn position based on direction angle
      let spawnY: number;
      if (settings.directionAngle >= 135 && settings.directionAngle <= 225) {
        // Downward-ish (180° ± 45°), spawn above canvas
        spawnY = -trailLength;
      } else if (settings.directionAngle >= 315 || settings.directionAngle <= 45) {
        // Upward-ish (0° ± 45°), spawn below canvas
        spawnY = height + trailLength;
      } else if (settings.directionAngle > 45 && settings.directionAngle < 135) {
        // Rightward-ish (90° ± 45°), spawn left of canvas
        spawnY = seededRandom() * height;
      } else {
        // Leftward-ish (270° ± 45°), spawn right of canvas
        spawnY = seededRandom() * height;
      }
      
      trails.push({
        x: spawnX,
        y: spawnY,
        velocityX,
        velocityY,
        length: trailLength,
        width: trailWidth,
        speed: trailSpeed,
        active: true
      });
    }
    
    // Update trail positions
    for (const trail of trails) {
      if (!trail.active) continue;
      
      trail.x += trail.velocityX;
      trail.y += trail.velocityY;
      
      // Check if trail tail has exited canvas (continue until tail fully exits)
      const tailX = trail.x - baseVelocityX * trail.length;
      const tailY = trail.y - baseVelocityY * trail.length;
      
      const headOffCanvas = 
        trail.x < 0 || trail.x >= width || 
        trail.y < 0 || trail.y >= height;
      
      const tailOffCanvas = 
        tailX < 0 || tailX >= width || 
        tailY < 0 || tailY >= height;
      
      // Deactivate when both head and tail are off canvas
      if (headOffCanvas && tailOffCanvas) {
        // Check if trail has moved past canvas entirely
        const dx = trail.x - tailX;
        const dy = trail.y - tailY;
        const trailVectorLength = Math.sqrt(dx * dx + dy * dy);
        
        // If trail has moved far enough that no part could be on canvas
        if (trailVectorLength > Math.max(width, height) * 2) {
          trail.active = false;
        }
      }
    }
    
    // Create RGBA buffer
    const pixelCount = width * height;
    const data = new Uint8ClampedArray(pixelCount * 4);
    
    // Initialize all pixels to black
    for (let i = 0; i < pixelCount * 4; i += 4) {
      data[i] = 0;     // R
      data[i + 1] = 0; // G
      data[i + 2] = 0; // B
      data[i + 3] = 255; // A
    }
    
    // Render trails
    for (const trail of trails) {
      if (!trail.active) continue;
      
      // Render each pixel of the trail
      for (let i = 0; i < trail.length; i++) {
        // Calculate center position of this pixel in the trail
        const centerX = trail.x - baseVelocityX * i;
        const centerY = trail.y - baseVelocityY * i;
        
        // Calculate luminosity based on position in trail
        // i=0 is the head (brightest), i=length-1 is the tail (darkest)
        const positionInTrail = i / (trail.length - 1 || 1); // 0 at head, 1 at tail
        
        // Calculate fade based on fadeAmount
        // fadeAmount=1.0 means entire trail fades linearly white→black
        // fadeAmount=0.5 means only last 50% of trail fades
        let baseLuminosity: number;
        if (positionInTrail <= (1 - settings.fadeAmount)) {
          // Before fade zone: full white
          baseLuminosity = 1.0;
        } else {
          // Within fade zone: linear interpolation white→black
          const fadeProgress = (positionInTrail - (1 - settings.fadeAmount)) / settings.fadeAmount;
          baseLuminosity = 1.0 - fadeProgress;
        }
        
        // Render width: draw pixels in a radius around center
        const halfWidth = Math.floor(trail.width / 2);
        for (let dx = -halfWidth; dx <= halfWidth; dx++) {
          for (let dy = -halfWidth; dy <= halfWidth; dy++) {
            const pixelX = Math.round(centerX + dx);
            const pixelY = Math.round(centerY + dy);
            
            // Skip if off canvas
            if (pixelX < 0 || pixelX >= width || pixelY < 0 || pixelY >= height) {
              continue;
            }
            
            // Calculate distance from center for softer edges (optional)
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = halfWidth;
            const edgeFalloff = distance > maxDistance ? 0 : 1.0 - (distance / (maxDistance + 1)) * 0.3;
            
            let luminosity = baseLuminosity * edgeFalloff;
            
            // Apply noise if enabled
            if (settings.noiseAmount > 0) {
              // Simple noise based on pixel position and optional frame evolution
              const noiseX = pixelX * settings.noiseScale;
              const noiseY = pixelY * settings.noiseScale;
              const noiseZ = settings.animatedNoise ? noisePhase : 0;
              
              // Simple 3D noise approximation using sine waves
              const noise = (
                Math.sin(noiseX * 2.1 + noiseZ) * 0.5 +
                Math.sin(noiseY * 1.7 + noiseZ) * 0.5 +
                Math.sin((noiseX + noiseY) * 1.3 + noiseZ) * 0.5
              ) / 1.5; // -1 to 1 range
              
              // Scale noise by noiseAmount (0-200 → 0-2.0, allows for extreme effects)
              const noiseStrength = settings.noiseAmount / 100;
              const noiseDelta = noise * noiseStrength;
              
              // Apply noise to luminosity
              luminosity = Math.max(0, Math.min(1, luminosity + noiseDelta));
            }
            
            // Convert luminosity to grayscale value (0-255)
            const value = Math.round(luminosity * 255);
            
            // Set pixel in RGBA buffer
            const pixelIndex = (pixelY * width + pixelX) * 4;
            
            // Use max value to allow trail overlapping
            data[pixelIndex] = Math.max(data[pixelIndex], value);       // R
            data[pixelIndex + 1] = Math.max(data[pixelIndex + 1], value); // G
            data[pixelIndex + 2] = Math.max(data[pixelIndex + 2], value); // B
            // Alpha already set to 255
          }
        }
      }
    }
    
    // Update noise phase for next frame if animated
    if (settings.animatedNoise) {
      noisePhase += settings.noiseSpeed / 100;
    }
    
    // Create frame
    frames.push({
      width,
      height,
      data,
      frameDuration: actualFrameDuration
    });
  }
  
  return frames;
}
