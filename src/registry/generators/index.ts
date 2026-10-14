/**
 * Generator Registrations — initializes all built-in procedural generators.
 */

import { registerGenerator } from '../generatorRegistry';
import { radioWavesGenerator } from './radioWaves';
import { turbulentNoiseGenerator } from './turbulentNoise';
import { particlePhysicsGenerator } from './particlePhysics';
import { rainDropsGenerator } from './rainDrops';
import { digitalRainGenerator } from './digitalRain';
import { animatedTextGenerator } from './animatedText';

/** Register all built-in generators. Safe to call multiple times. */
export function registerAllGenerators(): void {
  const generators = [
    radioWavesGenerator,
    turbulentNoiseGenerator,
    particlePhysicsGenerator,
    rainDropsGenerator,
    digitalRainGenerator,
    animatedTextGenerator,
  ];
  for (const generator of generators) {
    try {
      registerGenerator(generator);
    } catch {
      // Already registered — skip
    }
  }
}

export {
  radioWavesGenerator,
  turbulentNoiseGenerator,
  particlePhysicsGenerator,
  rainDropsGenerator,
  digitalRainGenerator,
  animatedTextGenerator,
};
