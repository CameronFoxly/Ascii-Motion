/**
 * Rain Drops Generator — expanding ripples from random drop points, with interference.
 *
 * Rates are expressed per reference frame (30fps) and scaled by `ctx.dt`;
 * drop frequency is in drops per second.
 */

import { Droplets } from 'lucide-react';
import type { SimulationGeneratorEntry } from '../generatorRegistry';
import { CELL_ASPECT_RATIO } from '../../utils/fontMetrics';
import { frameRng } from '../../utils/generators/random';
import { numberProp, boolProp, seedProp, defaultsFromDefinitions, n, b } from './propertyHelpers';

const MAX_RIPPLES = 50;

interface Ripple {
  x: number;
  y: number;
  radius: number;
  amplitude: number;
  decayRate: number;
}

interface RainDropsState {
  ripples: Ripple[];
}

const propertyDefinitions = [
  numberProp('dropFrequency', 'Drop Frequency', 'Drops', 5, 0, 30, 0.5, { unit: '/s' }),
  numberProp('dropFrequencyRandomness', 'Frequency Randomness', 'Drops', 0.3, 0, 1, 0.05),
  numberProp('rippleSpeed', 'Ripple Speed', 'Ripples', 0.7, 0.05, 5, 0.05),
  numberProp('rippleBirthSize', 'Birth Size', 'Ripples', 0, 0, 20, 0.5),
  numberProp('rippleAmplitude', 'Amplitude', 'Ripples', 1, 0, 2, 0.05),
  numberProp('rippleAmplitudeRandomness', 'Amplitude Randomness', 'Ripples', 0.3, 0, 1, 0.05),
  numberProp('rippleDecay', 'Decay', 'Ripples', 0.05, 0, 0.5, 0.005),
  numberProp('rippleDecayRandomness', 'Decay Randomness', 'Ripples', 0.3, 0, 1, 0.05),
  numberProp('rippleWavelength', 'Wavelength', 'Ripples', 2, 0.5, 10, 0.1),
  numberProp('rippleFalloffWidth', 'Trailing Falloff', 'Ripples', 3, 0, 20, 0.5),
  boolProp('interferenceEnabled', 'Interference', 'Ripples', true),
  numberProp('brightness', 'Brightness', 'Visual', 0, -1, 1, 0.05),
  numberProp('contrast', 'Contrast', 'Visual', 1, 0, 4, 0.05),
  seedProp('Random'),
];

let scratch: Float32Array | null = null;
function getScratch(size: number): Float32Array {
  if (!scratch || scratch.length !== size) scratch = new Float32Array(size);
  else scratch.fill(0);
  return scratch;
}

export const rainDropsGenerator: SimulationGeneratorEntry<RainDropsState> = {
  type: 'rain-drops',
  name: 'Rain Drops',
  icon: Droplets,
  description: 'Expanding ripples from random drops with wave interference',
  mode: 'simulation',
  defaultSettings: defaultsFromDefinitions(propertyDefinitions),
  propertyDefinitions,

  createState: () => ({ ripples: [] }),
  cloneState: (state) => ({ ripples: state.ripples.map((r) => ({ ...r })) }),

  step: (state, settings, ctx) => {
    const { dt, fps, width, height, localFrame } = ctx;

    // Advance ripples spawned on earlier frames
    const speed = n(settings, 'rippleSpeed', 0.7) * dt;
    const survivors: Ripple[] = [];
    for (const r of state.ripples) {
      r.radius += speed;
      r.amplitude *= Math.pow(Math.max(0, 1 - r.decayRate), dt);
      if (r.amplitude >= 0.01) survivors.push(r);
    }
    state.ripples = survivors;

    // Spawn new drops
    const rng = frameRng(n(settings, 'seed', 0), localFrame, 0x4a1d);
    const randomness = n(settings, 'dropFrequencyRandomness', 0.3);
    const expected = (Math.max(0, n(settings, 'dropFrequency', 5)) / fps) * (1 + (rng() - 0.5) * 2 * randomness);
    let count = Math.floor(expected);
    if (rng() < expected - count) count++;

    const amplitude = n(settings, 'rippleAmplitude', 1);
    const amplitudeRandomness = n(settings, 'rippleAmplitudeRandomness', 0.3);
    const decay = n(settings, 'rippleDecay', 0.05);
    const decayRandomness = n(settings, 'rippleDecayRandomness', 0.3);
    const birthSize = n(settings, 'rippleBirthSize', 0);

    for (let i = 0; i < count && state.ripples.length < MAX_RIPPLES; i++) {
      const rippleAmplitude = amplitude * (1 + (rng() - 0.5) * 2 * amplitudeRandomness);
      const decayRate = decay * (1 + (rng() - 0.5) * 2 * decayRandomness);
      state.ripples.push({
        x: rng() * width,
        y: rng() * height,
        radius: birthSize,
        amplitude: rippleAmplitude,
        decayRate,
      });
    }
  },

  render: (state, settings, ctx, out) => {
    const { width, height } = ctx;
    const wavelength = Math.max(0.01, n(settings, 'rippleWavelength', 2));
    const falloffWidth = Math.max(0, n(settings, 'rippleFalloffWidth', 3));
    const interference = b(settings, 'interferenceEnabled', true);
    const contrast = n(settings, 'contrast', 1);
    const brightness = n(settings, 'brightness', 0);
    const waveK = (2 * Math.PI) / wavelength;
    const field = getScratch(width * height);

    for (const r of state.ripples) {
      const outer = r.radius + wavelength;
      const inner = r.radius - falloffWidth;
      const yMin = Math.max(0, Math.floor(r.y - outer));
      const yMax = Math.min(height - 1, Math.ceil(r.y + outer));
      const xReach = outer / CELL_ASPECT_RATIO;
      const xMin = Math.max(0, Math.floor(r.x - xReach));
      const xMax = Math.min(width - 1, Math.ceil(r.x + xReach));

      for (let y = yMin; y <= yMax; y++) {
        const dy = y - r.y;
        for (let x = xMin; x <= xMax; x++) {
          const dx = (x - r.x) * CELL_ASPECT_RATIO;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < inner || distance > outer) continue;
          const fromRadius = distance - r.radius;
          const falloff = fromRadius < 0 ? Math.max(0, 1 + fromRadius / falloffWidth) : 1;
          const value = Math.cos(fromRadius * waveK) * r.amplitude * falloff;
          const i = y * width + x;
          if (interference) field[i] += value;
          else if (Math.abs(value) > Math.abs(field[i])) field[i] = value;
        }
      }
    }

    const { intensity, coverage } = out;
    for (let i = 0; i < field.length; i++) {
      const clamped = field[i] < -1 ? -1 : field[i] > 1 ? 1 : field[i];
      const v = ((clamped + 1) * 0.5 - 0.5) * contrast + 0.5 + brightness;
      intensity[i] = v < 0 ? 0 : v > 1 ? 1 : v;
      coverage[i] = 1;
    }
  },
};
