/**
 * Wave Warp Effect — Registry Entry
 *
 * Extracted from the time effects system into the procedural effects pipeline.
 * Applies sine wave distortion to cells based on position and time.
 */

import { Waves } from 'lucide-react';
import type { EffectRegistryEntry } from '../effectRegistry';
import type { EffectPropertyDefinition } from '../../types/effectBlock';
import type { WaveWarpSettings } from '../../types/timeEffects';
import { applyWaveWarpToFrame } from '../../utils/timeEffectsProcessing';
import { deriveCanvasBounds } from './canvasBounds';

const propertyDefinitions: EffectPropertyDefinition[] = [
  {
    path: 'axis',
    displayName: 'Axis',
    category: 'Wave',
    valueType: 'select',
    defaultValue: 'horizontal',
    interpolation: 'hold',
    options: [
      { label: 'Horizontal', value: 'horizontal' },
      { label: 'Vertical', value: 'vertical' },
    ],
  },
  {
    path: 'frequency',
    displayName: 'Frequency',
    category: 'Wave',
    valueType: 'number',
    defaultValue: 1.0,
    interpolation: 'numeric',
    min: 0.1,
    max: 5.0,
    step: 0.1,
  },
  {
    path: 'amplitude',
    displayName: 'Amplitude',
    category: 'Wave',
    valueType: 'number',
    defaultValue: 5,
    interpolation: 'numeric',
    min: -30,
    max: 30,
    step: 1,
    unit: 'cells',
  },
  {
    path: 'speed',
    displayName: 'Speed',
    category: 'Wave',
    valueType: 'number',
    defaultValue: 5,
    interpolation: 'numeric',
    min: -50,
    max: 50,
    step: 1,
  },
  {
    path: 'phase',
    displayName: 'Phase',
    category: 'Wave',
    valueType: 'number',
    defaultValue: 0,
    interpolation: 'numeric',
    min: 0,
    max: 360,
    step: 1,
    unit: '°',
  },
];

export const waveWarpEffect: EffectRegistryEntry = {
  type: 'wave-warp',
  name: 'Wave Warp',
  icon: Waves,
  category: 'distortion',
  description: 'Apply sine wave distortion to cell positions',
  perFrameBake: true,
  defaultSettings: {
    axis: 'horizontal',
    frequency: 1.0,
    amplitude: 5,
    speed: 5,
    phase: 0,
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

    const processedCells = applyWaveWarpToFrame(
      cells,
      width,
      height,
      settings as unknown as WaveWarpSettings,
      accumulatedTime,
    );

    // Count affected cells (cells that moved)
    let affectedCells = 0;
    cells.forEach((_, key) => {
      if (!processedCells.has(key) || processedCells.get(key) !== cells.get(key)) {
        affectedCells++;
      }
    });

    return { processedCells, affectedCells };
  },
};
