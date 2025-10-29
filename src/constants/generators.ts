/**
 * Generators System Constants - Default settings and generator definitions
 * 
 * Provides default configurations for all generators and UI definitions
 */

import type { 
  GeneratorDefinition,
  RadioWavesSettings,
  TurbulentNoiseSettings,
  ParticlePhysicsSettings,
  RainDropsSettings
} from '../types/generators';

// Generator definitions for UI rendering
export const GENERATOR_DEFINITIONS: GeneratorDefinition[] = [
  {
    id: 'radio-waves',
    name: 'Radio Waves',
    description: 'Concentric wave propagation from a selectable origin',
    icon: 'Radio',
    supportsLoopSmoothing: true
  },
  {
    id: 'turbulent-noise',
    name: 'Turbulent Noise',
    description: 'Animated fractal noise field with configurable parameters',
    icon: 'Wind',
    supportsLoopSmoothing: true
  },
  {
    id: 'particle-physics',
    name: 'Particle Physics',
    description: 'Particle emitter with velocity, gravity, bounce, and friction',
    icon: 'Sparkles',
    supportsLoopSmoothing: false
  },
  {
    id: 'rain-drops',
    name: 'Rain Drops',
    description: 'Rippling raindrop interactions with interference',
    icon: 'Droplets',
    supportsLoopSmoothing: true
  }
];

// Default generator settings

export const DEFAULT_RADIO_WAVES_SETTINGS: RadioWavesSettings = {
  // Origin point (center of default 80x24 canvas)
  originX: 40,
  originY: 12,
  
  // Wave properties
  frequency: 1.0,           // 1 wave per second
  lineThickness: 2,         // 2 pixel radius
  propagationSpeed: 2.0,    // 2 characters per frame
  
  // Visual properties
  amplitudeDecay: true,
  decayRate: 0.5,
  useGradient: false,
  gradientStartColor: '#ffffff',
  gradientEndColor: '#000000',
  
  // Timing (default: 3 seconds at 30fps = 90 frames)
  duration: 3000,
  frameRate: 30,
  frameCount: 90,
  timingMode: 'frameCount',
  
  // Loop smoothing
  loopSmoothingEnabled: true,
  
  // Random seed
  seed: Math.floor(Math.random() * 10000)
};

export const DEFAULT_TURBULENT_NOISE_SETTINGS: TurbulentNoiseSettings = {
  // Noise configuration (After Effects defaults)
  noiseType: 'perlin',
  baseFrequency: 1.0,
  amplitude: 0.5,
  
  // Fractal noise properties
  octaves: 3,
  persistence: 0.5,
  lacunarity: 2.0,
  
  // Evolution
  evolutionSpeed: 1.0,
  offsetX: 0,
  offsetY: 0,
  
  // Timing (default: 3 seconds at 30fps)
  duration: 3000,
  frameRate: 30,
  frameCount: 90,
  timingMode: 'frameCount',
  
  // Loop smoothing
  loopSmoothingEnabled: true,
  
  // Random seed
  seed: Math.floor(Math.random() * 10000)
};

export const DEFAULT_PARTICLE_PHYSICS_SETTINGS: ParticlePhysicsSettings = {
  // Emitter properties (center of default canvas)
  originX: 40,
  originY: 12,
  particleCount: 100,
  
  // Particle properties
  particleSize: 2,
  particleSizeRandomness: false,
  particleSizeMin: 1,
  particleSizeMax: 4,
  lifespan: 60,             // 60 frames at 30fps = 2 seconds
  
  // Velocity
  velocityMagnitude: 2.0,
  velocityAngle: 270,       // Upward
  velocityRandomness: 0.3,
  
  // Physics
  gravity: 0.2,
  drag: 0.02,
  
  // Edge behavior
  edgeBounce: true,
  bounciness: 0.8,
  edgeFriction: 0.1,
  
  // Timing (default: 5 seconds at 30fps)
  duration: 5000,
  frameRate: 30,
  frameCount: 150,
  timingMode: 'frameCount',
  
  // Random seed
  seed: Math.floor(Math.random() * 10000)
};

export const DEFAULT_RAIN_DROPS_SETTINGS: RainDropsSettings = {
  // Drop spawn properties
  dropFrequency: 5.0,       // 5 drops per second
  dropFrequencyRandomness: 0.3,
  
  // Ripple properties
  rippleSpeed: 1.5,
  rippleRadiusMax: 10,
  rippleAmplitude: 1.0,
  rippleDecay: 0.05,
  
  // Drop properties
  dropSizeBase: 2,
  dropSizeRandomness: true,
  dropSizeMin: 1,
  dropSizeMax: 3,
  
  // Wave interaction
  interferenceEnabled: true,
  
  // Timing (default: 4 seconds at 30fps)
  duration: 4000,
  frameRate: 30,
  frameCount: 120,
  timingMode: 'frameCount',
  
  // Loop smoothing
  loopSmoothingEnabled: true,
  
  // Random seed
  seed: Math.floor(Math.random() * 10000)
};

// Generator processing limits
export const GENERATOR_LIMITS = {
  // Canvas size limits
  MAX_WIDTH: 200,
  MAX_HEIGHT: 100,
  
  // Frame count limits
  MAX_FRAME_COUNT: 500,
  MIN_FRAME_COUNT: 1,
  
  // Frame rate limits
  MAX_FRAME_RATE: 60,
  MIN_FRAME_RATE: 1,
  
  // Duration limits (milliseconds)
  MAX_DURATION: 30000,      // 30 seconds
  MIN_DURATION: 100,        // 0.1 seconds
  
  // Particle limits
  MAX_PARTICLES: 1000,
  MIN_PARTICLES: 1,
  
  // Processing timeout
  GENERATION_TIMEOUT_MS: 30 * 1000,  // 30 seconds
  
  // Preview update debounce
  PREVIEW_DEBOUNCE_MS: 200
} as const;

// Export debounce constant for easy access
export const PREVIEW_DEBOUNCE_MS = GENERATOR_LIMITS.PREVIEW_DEBOUNCE_MS;

// Loop smoothing configuration
export const LOOP_SMOOTHING = {
  // Number of frames to blend at loop point
  DEFAULT_BLEND_FRAMES: 4,
  MIN_BLEND_FRAMES: 2,
  MAX_BLEND_FRAMES: 10
} as const;
