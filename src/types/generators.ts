/**
 * Shared option types for procedural generators.
 *
 * Generator settings themselves are plain records described by each
 * generator's property definitions in `src/registry/generators/*`.
 */

/** Built-in generator type ids */
export type GeneratorId = 'radio-waves' | 'turbulent-noise' | 'particle-physics' | 'rain-drops' | 'digital-rain' | 'animated-text';

/** Noise type options for the turbulent noise generator */
export type NoiseType = 'perlin' | 'simplex' | 'worley';

/** Wave shape options for the radio waves generator */
export type WaveShape = 'circle' | 'square' | 'triangle' | 'pentagon' | 'hexagon' | 'octagon' | 'star';

/** Profile shape options for the radio waves generator */
export type ProfileShape = 'solid' | 'fade-out' | 'fade-in' | 'fade-in-out';
