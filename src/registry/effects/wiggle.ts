/**
 * Wiggle Effect — Registry Entry
 *
 * Extracted from the time effects system into the procedural effects pipeline.
 * Applies global displacement to all cells based on wave or noise functions.
 */

import { Vibrate } from 'lucide-react';
import type { EffectRegistryEntry } from '../effectRegistry';
import type { EffectPropertyDefinition } from '../../types/effectBlock';
import type { WiggleSettings } from '../../types/timeEffects';
import { applyWiggleToFrame } from '../../utils/timeEffectsProcessing';
import { deriveCanvasBounds } from './canvasBounds';

const propertyDefinitions: EffectPropertyDefinition[] = [
  {
    path: 'mode',
    displayName: 'Mode',
    category: 'Wiggle',
    valueType: 'select',
    defaultValue: 'horizontal-wave',
    interpolation: 'hold',
    options: [
      { label: 'Horizontal Wave', value: 'horizontal-wave' },
      { label: 'Vertical Wave', value: 'vertical-wave' },
      { label: 'Noise', value: 'noise' },
    ],
  },
  {
    path: 'waveFrequency',
    displayName: 'Frequency',
    category: 'Wave',
    valueType: 'number',
    defaultValue: 1.0,
    interpolation: 'numeric',
    min: 0,
    max: 20,
    step: 1,
    visibleWhen: { path: 'mode', values: ['horizontal-wave', 'vertical-wave'] },
  },
  {
    path: 'waveAmplitude',
    displayName: 'Amplitude',
    category: 'Wave',
    valueType: 'number',
    defaultValue: 3,
    interpolation: 'numeric',
    min: 1,
    max: 20,
    step: 1,
    unit: 'cells',
    visibleWhen: { path: 'mode', values: ['horizontal-wave', 'vertical-wave'] },
  },
  {
    path: 'noiseOctaves',
    displayName: 'Octaves',
    category: 'Noise',
    valueType: 'number',
    defaultValue: 3,
    interpolation: 'numeric',
    min: 1,
    max: 8,
    step: 1,
    visibleWhen: { path: 'mode', values: ['noise'] },
  },
  {
    path: 'noiseHFrequency',
    displayName: 'H Frequency',
    category: 'Noise',
    valueType: 'number',
    defaultValue: 1.0,
    interpolation: 'numeric',
    min: 0,
    max: 5,
    step: 0.1,
    visibleWhen: { path: 'mode', values: ['noise'] },
  },
  {
    path: 'noiseHAmplitude',
    displayName: 'H Amplitude',
    category: 'Noise',
    valueType: 'number',
    defaultValue: 10,
    interpolation: 'numeric',
    min: 0,
    max: 50,
    step: 1,
    unit: 'cells',
    visibleWhen: { path: 'mode', values: ['noise'] },
  },
  {
    path: 'noiseVFrequency',
    displayName: 'V Frequency',
    category: 'Noise',
    valueType: 'number',
    defaultValue: 1.0,
    interpolation: 'numeric',
    min: 0,
    max: 5,
    step: 0.1,
    visibleWhen: { path: 'mode', values: ['noise'] },
  },
  {
    path: 'noiseVAmplitude',
    displayName: 'V Amplitude',
    category: 'Noise',
    valueType: 'number',
    defaultValue: 10,
    interpolation: 'numeric',
    min: 0,
    max: 50,
    step: 1,
    unit: 'cells',
    visibleWhen: { path: 'mode', values: ['noise'] },
  },
  {
    path: 'noiseSeed',
    displayName: 'Seed',
    category: 'Noise',
    valueType: 'number',
    defaultValue: 0,
    interpolation: 'numeric',
    min: 0,
    max: 9999,
    step: 1,
    visibleWhen: { path: 'mode', values: ['noise'] },
  },
];

export const wiggleEffect: EffectRegistryEntry = {
  type: 'wiggle',
  name: 'Wiggle',
  icon: Vibrate,
  category: 'distortion',
  description: 'Apply global displacement via wave or noise functions',
  perFrameBake: true,
  defaultSettings: {
    mode: 'horizontal-wave' as const,
    waveFrequency: 1.0,
    waveAmplitude: 3,
    noiseOctaves: 3,
    noiseHFrequency: 1.0,
    noiseHAmplitude: 10,
    noiseVFrequency: 1.0,
    noiseVAmplitude: 10,
    noiseSeed: 0,
  },
  propertyDefinitions,
  process: (cells, settings, options) => {
    const frame = options?.frame ?? 0;
    const frameRate = options?.frameRate ?? 12;

    // Calculate accumulated time from frame number and frame rate
    const accumulatedTime = (frame / frameRate) * 1000;

    // Use canvas dimensions from options, falling back to content bounds
    const width = options?.canvasWidth ?? deriveCanvasBounds(cells).width;
    const height = options?.canvasHeight ?? deriveCanvasBounds(cells).height;

    const processedCells = applyWiggleToFrame(
      cells,
      width,
      height,
      settings as unknown as WiggleSettings,
      accumulatedTime,
    );

    let affectedCells = 0;
    cells.forEach((_, key) => {
      if (!processedCells.has(key) || processedCells.get(key) !== cells.get(key)) {
        affectedCells++;
      }
    });

    return { processedCells, affectedCells };
  },
};
