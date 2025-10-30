/**
 * Generators System Types - TypeScript definitions for procedural animation generators
 * 
 * Defines interfaces for all generators, settings, and state management
 */

// Core generator types
export type GeneratorId = 'radio-waves' | 'turbulent-noise' | 'particle-physics' | 'rain-drops';

// Noise type options for turbulent noise generator
export type NoiseType = 'perlin' | 'simplex' | 'worley';

// Dithering options for turbulent noise generator
export type DitherType = 'none' | '2x2' | '4x4' | 'noise' | 'animated-noise';

// Wave shape options for radio waves generator
export type WaveShape = 'circle' | 'square' | 'triangle' | 'pentagon' | 'hexagon' | 'octagon' | 'star';

// Profile shape options for radio waves generator
export type ProfileShape = 'solid' | 'fade-out' | 'fade-in' | 'fade-in-out';

// Scatter pattern options (if needed for visual variety)
export type ScatterType = 'noise' | 'bayer-2x2' | 'bayer-4x4' | 'gaussian';

// Timing configuration mode
export type TimingMode = 'duration' | 'frameCount' | 'both';

// Individual generator settings interfaces

export interface RadioWavesSettings {
  // Origin point
  originX: number;          // 0 to canvas width
  originY: number;          // 0 to canvas height
  
  // Wave properties
  frequency: number;        // 0.1 - 5.0 waves per second
  startThickness: number;   // 1 - 10 pixel radius at origin
  endThickness: number;     // 1 - 10 pixel radius at max distance
  propagationSpeed: number; // -2.0 - 2.0 characters per frame
  lifetime: number;         // 0.1 - 1.0 (fraction of max distance before wave fades out)
  waveShape: WaveShape;     // Shape of the wave propagation
  profileShape: ProfileShape; // Intensity profile of the wave
  
  // Rotation (for non-circle shapes)
  startRotation: number;    // 0 - 360 degrees (rotation at origin)
  endRotation: number;      // 0 - 360 degrees (rotation at max distance)
  
  // Visual properties
  decayRate: number;        // 0.0 - 5.0 (0 = no decay, higher = faster decay)
  
  // Timing
  duration: number;         // milliseconds
  frameRate: number;        // fps
  frameCount: number;       // explicit frame count
  timingMode: TimingMode;   // which controls are active
  
  // Random seed
  seed: number;
}

export interface TurbulentNoiseSettings {
  // Noise configuration
  noiseType: NoiseType;     // 'perlin' | 'simplex' | 'worley'
  baseFrequency: number;    // 0.1 - 8.0
  seed: number;             // Random seed for noise generation
  
  // Fractal noise properties
  octaves: number;          // 1 - 6
  
  // Visual adjustments
  brightness: number;       // -1.0 to 1.0 (additive adjustment)
  contrast: number;         // 0.0 to 4.0 (multiplier, 1.0 = normal)
  
  // Evolution
  evolutionSpeed: number;   // Speed at which noise scrolls over time
  
  // Timing
  duration: number;         // milliseconds
  frameRate: number;        // fps
  frameCount: number;       // explicit frame count
  timingMode: TimingMode;
}

export interface ParticlePhysicsSettings {
  // Emitter properties
  originX: number;          // 0 to canvas width
  originY: number;          // 0 to canvas height
  emitterShape: 'point' | 'vertical-line' | 'horizontal-line' | 'square' | 'circle';
  emitterSize: number;      // 1 to max canvas dimension
  emitterMode: 'continuous' | 'burst'; // Continuous: spawn over time, Burst: all at once
  particleCount: number;    // 1 - 1000
  
  // Particle properties
  particleShape: 'circle' | 'square' | 'cloudlet';
  particleSize: number;     // Base size in pixels
  particleSizeRandomness: boolean;
  particleSizeMin: number;  // Min size when randomness enabled
  particleSizeMax: number;  // Max size when randomness enabled
  startSizeMultiplier: number; // 0.0 - 2.0 size multiplier at birth
  endSizeMultiplier: number;   // 0.0 - 2.0 size multiplier at death
  startOpacity: number;     // 0.0 - 1.0 opacity at birth
  endOpacity: number;       // 0.0 - 1.0 opacity at death
  lifespan: number;         // Frames before particle dies
  lifespanRandomness: boolean;
  lifespanRandomnessAmount: number; // 0.0 - 1.0 variation factor
  
  // Velocity
  velocityMagnitude: number; // Speed
  velocityAngle: number;     // Direction in degrees (0-360)
  velocityAngleRandomness: number; // 0.0 - 1.0 angle randomness factor
  velocitySpeedRandomness: number; // 0.0 - 1.0 speed randomness factor
  
  // Physics
  gravity: number;          // Positive = downward
  drag: number;             // 0.0 - 1.0 friction/air resistance
  
  // Collisions
  edgeBounce: boolean;
  bounciness: number;       // 0.0 - 1.0 restitution coefficient
  bouncinessRandomness: number; // 0.0 - 1.0 randomness factor for bounciness
  edgeFriction: number;     // 0.0 - 1.0 friction on bounce
  selfCollisions: boolean;  // Enable particle-to-particle collisions
  
  // Turbulence Field
  turbulenceEnabled: boolean;     // Enable turbulence field
  turbulenceFrequency: number;    // 0.1 - 10.0 (affects noise octaves)
  turbulenceAffectsPosition: number; // 0.0 - 10.0 force applied to position
  turbulenceAffectsScale: number;    // 0.0 - 2.0 size variation multiplier
  
  // Timing
  duration: number;         // milliseconds
  frameRate: number;        // fps
  frameCount: number;       // explicit frame count
  timingMode: TimingMode;
  
  // No loop smoothing for particles (free-running simulation)
  
  // Random seed
  seed: number;
}

export interface RainDropsSettings {
  // Drop spawn properties
  dropFrequency: number;    // Drops per second
  dropFrequencyRandomness: number; // 0.0 - 1.0
  
  // Ripple properties
  rippleSpeed: number;      // Expansion rate
  rippleRadiusMax: number;  // Maximum ripple radius
  rippleAmplitude: number;  // Initial wave height
  rippleDecay: number;      // 0.0 - 1.0 amplitude decay rate
  
  // Drop properties
  dropSizeBase: number;     // Base drop size
  dropSizeRandomness: boolean;
  dropSizeMin: number;      // Min when randomness enabled
  dropSizeMax: number;      // Max when randomness enabled
  
  // Wave interaction
  interferenceEnabled: boolean; // Whether overlapping ripples add
  
  // Timing
  duration: number;         // milliseconds
  frameRate: number;        // fps
  frameCount: number;       // explicit frame count
  timingMode: TimingMode;
  
  // Random seed
  seed: number;
}

// Union type for all generator settings
export type GeneratorSettings = 
  | RadioWavesSettings 
  | TurbulentNoiseSettings 
  | ParticlePhysicsSettings 
  | RainDropsSettings;

// Mapping settings (mirrors import store structure)
export interface GeneratorMappingSettings {
  // Character mapping
  enableCharacterMapping: boolean;
  characterSet: string[];
  characterMappingMode: 'brightness' | 'edge' | 'custom';
  characterDitherMode: 'by-index' | 'noise-dither' | 'bayer2x2' | 'bayer4x4';
  ditherStrength: number; // 0-1 for character dithering
  customCharacterMapping: { [brightness: string]: string };
  
  // Text color mapping
  enableTextColorMapping: boolean;
  textColorPaletteId: string | null;
  textColorMappingMode: 'closest' | 'noise-dither' | 'bayer2x2' | 'bayer4x4' | 'by-index';
  textColorDitherStrength: number; // 0-1 for text color dithering
  
  // Background color mapping
  enableBackgroundColorMapping: boolean;
  backgroundColorPaletteId: string | null;
  backgroundColorMappingMode: 'closest' | 'noise-dither' | 'bayer2x2' | 'bayer4x4' | 'by-index';
  backgroundColorDitherStrength: number; // 0-1 for background color dithering
}

// Generator definition for UI display
export interface GeneratorDefinition {
  id: GeneratorId;
  name: string;
  description: string;
  icon: string; // Lucide icon name
}

// Preview frame data (RGBA pixel array)
export interface GeneratorFrame {
  width: number;
  height: number;
  data: Uint8ClampedArray; // RGBA pixel data
  frameDuration: number;   // milliseconds
}
