/**
 * Turbulent Noise Generator — fractal Perlin/Simplex/Worley noise evolving over time.
 *
 * Evolution is driven by the accumulated `evolutionSpeed` phase so keyframed
 * speed changes never cause the noise field to jump.
 */

import { Wind } from 'lucide-react';
import type { StatelessGeneratorEntry } from '../generatorRegistry';
import type { NoiseType } from '../../types/generators';
import { perlinNoise3D, simplexNoise3D, worleyNoise3D } from '../../utils/generators/noise3d';
import { numberProp, selectProp, seedProp, defaultsFromDefinitions, n, s } from './propertyHelpers';

/** Z-units travelled per second at evolutionSpeed = 1 (matches legacy 3s/90-frame default) */
const EVOLUTION_Z_PER_SECOND = 1 / 3;

const propertyDefinitions = [
  selectProp('noiseType', 'Noise Type', 'Noise', 'perlin', [
    { label: 'Perlin Noise', value: 'perlin' },
    { label: 'Simplex Noise', value: 'simplex' },
    { label: 'Worley (Cellular) Noise', value: 'worley' },
  ]),
  numberProp('baseFrequency', 'Base Frequency', 'Noise', 1.0, 0.1, 8.0, 0.1),
  numberProp('octaves', 'Octaves', 'Noise', 3, 1, 6, 1, { interpolation: 'hold' }),
  seedProp('Noise'),
  numberProp('brightness', 'Brightness', 'Visual', 0, -1, 1, 0.05),
  numberProp('contrast', 'Contrast', 'Visual', 1, 0, 4, 0.05),
  numberProp('evolutionSpeed', 'Evolution Speed', 'Evolution', 1.0, 0, 10.0, 0.1),
];

export const turbulentNoiseGenerator: StatelessGeneratorEntry = {
  type: 'turbulent-noise',
  name: 'Turbulent Noise',
  icon: Wind,
  description: 'Fractal noise patterns with temporal evolution',
  mode: 'stateless',
  defaultSettings: defaultsFromDefinitions(propertyDefinitions),
  propertyDefinitions,
  phaseProperties: ['evolutionSpeed'],
  render: (ctx, settings, phases, out) => {
    const { width, height } = ctx;
    const noiseType = s<NoiseType>(settings, 'noiseType', 'perlin');
    const baseFrequency = n(settings, 'baseFrequency', 1);
    const octaves = Math.max(1, Math.min(6, Math.round(n(settings, 'octaves', 3))));
    const seedOffset = n(settings, 'seed', 0) * 0.01;
    const brightness = n(settings, 'brightness', 0);
    const contrast = n(settings, 'contrast', 1);
    const sampleZ = (phases.evolutionSpeed ?? 0) * EVOLUTION_Z_PER_SECOND + seedOffset;

    const noiseFn = noiseType === 'simplex' ? simplexNoise3D : noiseType === 'worley' ? worleyNoise3D : perlinNoise3D;
    const invW = 1 / width;
    const invH = 1 / height;

    let maxValue = 0;
    for (let o = 0, a = 1; o < octaves; o++, a *= 0.5) maxValue += a;
    const invMax = 1 / maxValue;

    const { intensity, coverage } = out;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let noiseValue = 0;
        let amplitude = 1;
        let frequency = baseFrequency;
        for (let o = 0; o < octaves; o++) {
          noiseValue += noiseFn(x * frequency * invW + seedOffset, y * frequency * invH + seedOffset, sampleZ) * amplitude;
          amplitude *= 0.5;
          frequency *= 2;
        }
        let v = noiseValue * invMax * 0.5 + 0.5;
        v = (v - 0.5) * contrast + 0.5 + brightness;
        const i = y * width + x;
        intensity[i] = v < 0 ? 0 : v > 1 ? 1 : v;
        coverage[i] = 1;
      }
    }
  },
};
