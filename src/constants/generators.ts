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
    icon: 'Radio'
  },
  {
    id: 'turbulent-noise',
    name: 'Turbulent Noise',
    description: 'Animated fractal noise field with configurable parameters',
    icon: 'Wind'
  },
  {
    id: 'particle-physics',
    name: 'Particle Physics',
    description: 'Particle emitter with velocity, gravity, bounce, and friction',
    icon: 'Sparkles'
  },
  {
    id: 'rain-drops',
    name: 'Rain Drops',
    description: 'Rippling raindrop interactions with interference',
    icon: 'Droplets'
  }
];

// Default generator settings

export const DEFAULT_RADIO_WAVES_SETTINGS: RadioWavesSettings = {
  // Origin point (center of default 80x24 canvas - will be updated dynamically)
  originX: 40,
  originY: 12,
  
  // Wave properties
  frequency: 1.0,           // 1 wave per second
  startThickness: 2,        // 2 pixel radius at origin
  endThickness: 2,          // 2 pixel radius at max distance
  propagationSpeed: 0.3,    // -2.0 to 2.0 range
  lifetime: 1.0,            // 0.1 to 1.0 (full distance by default)
  waveShape: 'circle',      // Default to circular waves
  profileShape: 'solid',    // Default to solid intensity profile
  
  // Rotation
  startRotation: 0,         // No rotation at origin
  endRotation: 0,           // No rotation at max distance
  
  // Visual properties
  decayRate: 0,             // 0-5 range (0 = no decay)
  
  // Timing (default: 3 seconds at 30fps = 90 frames)
  duration: 3000,
  frameRate: 30,
  frameCount: 90,
  timingMode: 'frameCount',
  
  // Random seed
  seed: Math.floor(Math.random() * 10000)
};

export const DEFAULT_TURBULENT_NOISE_SETTINGS: TurbulentNoiseSettings = {
  // Noise configuration
  noiseType: 'perlin',
  baseFrequency: 1.0,
  seed: Math.floor(Math.random() * 10000),
  
  // Fractal noise properties
  octaves: 3,
  
  // Visual adjustments
  brightness: 0,            // -1 to 1 (0 = no adjustment)
  contrast: 1.0,            // 0 to 4 (1 = normal)
  
  // Evolution
  evolutionSpeed: 1.0,
  
  // Timing (default: 3 seconds at 30fps)
  duration: 3000,
  frameRate: 30,
  frameCount: 90,
  timingMode: 'frameCount'
};

export const DEFAULT_PARTICLE_PHYSICS_SETTINGS: ParticlePhysicsSettings = {
  // Emitter properties (center of default canvas)
  originX: 40,
  originY: 12,
  emitterShape: 'point',
  emitterSize: 5,
  emitterMode: 'continuous',
  particleCount: 100,
  
  // Particle properties
  particleShape: 'circle',
  particleSize: 2,
  particleSizeRandomness: false,
  particleSizeMin: 1,
  particleSizeMax: 4,
  startSizeMultiplier: 1.0,  // 100% of base size at birth
  endSizeMultiplier: 1.0,    // 100% of base size at death
  startOpacity: 1.0,         // Fully opaque at birth
  endOpacity: 1.0,           // Fully opaque at death
  lifespan: 60,             // 60 frames at 30fps = 2 seconds
  lifespanRandomness: false,
  lifespanRandomnessAmount: 0.3,
  
  // Velocity
  velocityMagnitude: 2.0,
  velocityAngle: 270,       // Upward
  velocityAngleRandomness: 0.3,
  velocitySpeedRandomness: 0.2,
  
  // Physics
  gravity: 0.2,
  drag: 0.02,
  
  // Collisions
  edgeBounce: true,
  bounciness: 0.8,
  bouncinessRandomness: 0.0,
  edgeFriction: 0.1,
  selfCollisions: false,
  
  // Turbulence Field
  turbulenceEnabled: false,
  turbulenceFrequency: 1.0,
  turbulenceAffectsPosition: 2.0,
  turbulenceAffectsScale: 0.5,
  
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
  rippleSpeed: 0.7,
  rippleBirthSize: 0.0,     // Start as a point
  rippleAmplitude: 1.0,
  rippleAmplitudeRandomness: 0.3,
  rippleDecay: 0.05,
  rippleDecayRandomness: 0.3,
  rippleWavelength: 2.0,
  rippleFalloffWidth: 3.0,  // Multiple of wavelength for trailing ripples
  
  // Wave interaction
  interferenceEnabled: true,
  
  // Visual adjustments
  brightness: 0.0,          // No brightness adjustment by default
  contrast: 1.0,            // No contrast adjustment by default
  
  // Timing (default: 4 seconds at 30fps)
  duration: 4000,
  frameRate: 30,
  frameCount: 120,
  timingMode: 'frameCount',
  
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
