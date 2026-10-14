/**
 * Radio Waves Generator — concentric waves emanating from an origin point.
 *
 * Wave travel is driven by the accumulated `propagationSpeed` phase
 * (cells per second), so keyframed speed changes stay continuous.
 */

import { Radio } from 'lucide-react';
import type { StatelessGeneratorEntry } from '../generatorRegistry';
import type { WaveShape, ProfileShape } from '../../types/generators';
import { CELL_ASPECT_RATIO } from '../../utils/fontMetrics';
import { numberProp, selectProp, defaultsFromDefinitions, n, s } from './propertyHelpers';

/**
 * Calculate distance based on wave shape
 */
function calculateShapeDistance(
  dx: number,
  dy: number,
  shape: WaveShape,
  rotationRadians: number
): number {
  // Apply rotation if needed (not for circles)
  let rotatedDx = dx;
  let rotatedDy = dy;
  
  if (shape !== 'circle' && rotationRadians !== 0) {
    // Rotate the point around origin
    const cos = Math.cos(rotationRadians);
    const sin = Math.sin(rotationRadians);
    rotatedDx = dx * cos - dy * sin;
    rotatedDy = dx * sin + dy * cos;
  }
  
  switch (shape) {
    case 'circle':
      return Math.sqrt(dx * dx + dy * dy);
      
    case 'square':
      return Math.max(Math.abs(rotatedDx), Math.abs(rotatedDy));
      
    case 'triangle': {
      // Equilateral triangle with point facing up
      const angle = Math.atan2(rotatedDy, rotatedDx) + Math.PI / 2;
      const r = Math.sqrt(rotatedDx * rotatedDx + rotatedDy * rotatedDy);
      const sides = 3;
      const segmentAngle = (Math.PI * 2) / sides;
      const normalizedAngle = ((angle + Math.PI) % segmentAngle) - segmentAngle / 2;
      return r * Math.cos(normalizedAngle);
    }
      
    case 'pentagon': {
      // Pentagon with point facing up
      const angle = Math.atan2(rotatedDy, rotatedDx) + Math.PI / 2;
      const r = Math.sqrt(rotatedDx * rotatedDx + rotatedDy * rotatedDy);
      const sides = 5;
      const segmentAngle = (Math.PI * 2) / sides;
      const normalizedAngle = ((angle + Math.PI) % segmentAngle) - segmentAngle / 2;
      return r * Math.cos(normalizedAngle);
    }
      
    case 'hexagon': {
      // Hexagon distance (6 sides)
      const angle = Math.atan2(rotatedDy, rotatedDx);
      const segmentAngle = (Math.PI * 2) / 6;
      const normalizedAngle = ((angle + Math.PI) % segmentAngle) - segmentAngle / 2;
      const r = Math.sqrt(rotatedDx * rotatedDx + rotatedDy * rotatedDy);
      return r * Math.cos(normalizedAngle);
    }
      
    case 'octagon': {
      // Octagon distance (8 sides)
      const angle = Math.atan2(rotatedDy, rotatedDx);
      const segmentAngle = (Math.PI * 2) / 8;
      const normalizedAngle = ((angle + Math.PI) % segmentAngle) - segmentAngle / 2;
      const r = Math.sqrt(rotatedDx * rotatedDx + rotatedDy * rotatedDy);
      return r * Math.cos(normalizedAngle);
    }
      
    case 'star': {
      // Classic 5-pointed star with point facing up
      const angle = Math.atan2(rotatedDy, rotatedDx) + Math.PI / 2;
      const r = Math.sqrt(rotatedDx * rotatedDx + rotatedDy * rotatedDy);
      const points = 5;
      const outerAngle = (Math.PI * 2) / points;
      
      const normalizedAngle = ((angle + Math.PI) % (Math.PI * 2));
      const segmentIndex = Math.floor(normalizedAngle / outerAngle);
      const angleInSegment = normalizedAngle - segmentIndex * outerAngle;
      
      const innerRadiusRatio = 0.382;
      const halfSegment = outerAngle / 2;
      
      let radiusAtAngle: number;
      if (angleInSegment < halfSegment) {
        const t = angleInSegment / halfSegment;
        radiusAtAngle = 1.0 - (1.0 - innerRadiusRatio) * t;
      } else {
        const t = (angleInSegment - halfSegment) / halfSegment;
        radiusAtAngle = innerRadiusRatio + (1.0 - innerRadiusRatio) * t;
      }
      
      return r * radiusAtAngle;
    }
      
    default:
      return Math.sqrt(dx * dx + dy * dy);
  }
}

/**
 * Calculate intensity profile based on profile shape
 */
function calculateProfileIntensity(
  crossSectionPosition: number,
  profileShape: ProfileShape
): number {
  // crossSectionPosition: 0 = outer edge, 0.5 = peak/center, 1 = inner edge
  const t = Math.max(0, Math.min(1, crossSectionPosition));
  
  switch (profileShape) {
    case 'solid':
      return 1.0;
      
    case 'fade-out':
      // Full white (1.0) at outer edge (t=0), fade to black (0.0) at inner edge (t=1)
      return 1.0 - t;
      
    case 'fade-in':
      // Full black (0.0) at outer edge (t=0), fade to white (1.0) at inner edge (t=1)
      return t;
      
    case 'fade-in-out':
      // Black (0.0) at both edges (t=0 and t=1), white (1.0) at center (t=0.5)
      return 1.0 - Math.abs(t - 0.5) * 2.0;
      
    default:
      return 1.0;
  }
}

const WAVE_SHAPE_OPTIONS = [
  { label: 'Circle', value: 'circle' },
  { label: 'Square', value: 'square' },
  { label: 'Triangle', value: 'triangle' },
  { label: 'Pentagon', value: 'pentagon' },
  { label: 'Hexagon', value: 'hexagon' },
  { label: 'Octagon', value: 'octagon' },
  { label: 'Star', value: 'star' },
];

const PROFILE_OPTIONS = [
  { label: 'Solid', value: 'solid' },
  { label: 'Fade Out', value: 'fade-out' },
  { label: 'Fade In', value: 'fade-in' },
  { label: 'Fade In and Out', value: 'fade-in-out' },
];

const NON_CIRCLE_SHAPES = WAVE_SHAPE_OPTIONS.map((o) => o.value).filter((v) => v !== 'circle');

const propertyDefinitions = [
  numberProp('originX', 'Origin X', 'Origin', 40, -500, 1000, 1),
  numberProp('originY', 'Origin Y', 'Origin', 12, -500, 1000, 1),
  numberProp('frequency', 'Frequency', 'Wave', 1.0, 0.1, 5.0, 0.1),
  numberProp('startThickness', 'Start Thickness', 'Wave', 2, 1, 10, 1),
  numberProp('endThickness', 'End Thickness', 'Wave', 2, 1, 10, 1),
  selectProp('waveShape', 'Wave Shape', 'Wave', 'circle', WAVE_SHAPE_OPTIONS),
  selectProp('profileShape', 'Profile Shape', 'Wave', 'solid', PROFILE_OPTIONS),
  numberProp('propagationSpeed', 'Propagation Speed', 'Wave', 10, -60, 60, 0.5, { unit: 'cells/s' }),
  numberProp('lifetime', 'Wave Lifetime', 'Wave', 1.0, 0.1, 1.0, 0.05),
  numberProp('startRotation', 'Start Rotation', 'Rotation', 0, 0, 360, 1, { unit: '°', visibleWhen: { path: 'waveShape', values: NON_CIRCLE_SHAPES } }),
  numberProp('endRotation', 'End Rotation', 'Rotation', 0, 0, 360, 1, { unit: '°', visibleWhen: { path: 'waveShape', values: NON_CIRCLE_SHAPES } }),
  numberProp('decayRate', 'Amplitude Decay', 'Visual', 0, 0, 5, 0.1),
];

export const radioWavesGenerator: StatelessGeneratorEntry = {
  type: 'radio-waves',
  name: 'Radio Waves',
  icon: Radio,
  description: 'Concentric wave propagation from a selectable origin',
  mode: 'stateless',
  defaultSettings: defaultsFromDefinitions(propertyDefinitions),
  propertyDefinitions,
  phaseProperties: ['propagationSpeed'],
  getCanvasDefaults: (w, h) => ({ originX: Math.floor(w / 2), originY: Math.floor(h / 2) }),
  render: (ctx, settings, phases, out) => {
    const { width, height } = ctx;
    const originX = n(settings, 'originX', 40);
    const originY = n(settings, 'originY', 12);
    const frequency = Math.max(0.01, n(settings, 'frequency', 1));
    const startThickness = n(settings, 'startThickness', 2);
    const endThickness = n(settings, 'endThickness', 2);
    const lifetime = n(settings, 'lifetime', 1);
    const startRotation = n(settings, 'startRotation', 0);
    const endRotation = n(settings, 'endRotation', 0);
    const decayRate = n(settings, 'decayRate', 0);
    const waveShape = s<WaveShape>(settings, 'waveShape', 'circle');
    const profileShape = s<ProfileShape>(settings, 'profileShape', 'solid');

    const waveOffset = phases.propagationSpeed ?? 0;
    const wavelength = (2 * Math.PI) / frequency;
    const maxDistance = Math.sqrt((width * CELL_ASPECT_RATIO) ** 2 + height ** 2);
    const lifetimeDistance = maxDistance * lifetime;
    const rotationVaries = startRotation !== endRotation;
    const constantRotation = (startRotation * Math.PI) / 180;
    const { intensity, coverage } = out;

    for (let y = 0; y < height; y++) {
      const dy = y - originY;
      for (let x = 0; x < width; x++) {
        const dx = (x - originX) * CELL_ASPECT_RATIO;

        let rotationRadians = constantRotation;
        if (waveShape !== 'circle' && rotationVaries) {
          const distanceRatio = Math.sqrt(dx * dx + dy * dy) / maxDistance;
          rotationRadians = ((startRotation + (endRotation - startRotation) * distanceRatio) * Math.PI) / 180;
        }

        const distance = calculateShapeDistance(dx, dy, waveShape, rotationRadians);
        if (distance > lifetimeDistance) continue;

        const lifetimeRatio = distance / lifetimeDistance;
        const lineThickness = startThickness + (endThickness - startThickness) * lifetimeRatio;

        const wavePhase = (distance - waveOffset) / wavelength;
        const fractionalPhase = wavePhase - Math.floor(wavePhase);
        const distanceFromPeak = Math.abs(fractionalPhase - 0.5) * 2.0;
        const thicknessRadius = lineThickness / wavelength;
        if (distanceFromPeak > thicknessRadius) continue;

        const crossSectionPosition = fractionalPhase < 0.5
          ? 0.5 - (distanceFromPeak / thicknessRadius) * 0.5
          : 0.5 + (distanceFromPeak / thicknessRadius) * 0.5;

        const profileIntensity = calculateProfileIntensity(crossSectionPosition, profileShape);
        const amplitude = decayRate > 0
          ? Math.max(0, 1.0 - (distance / lifetimeDistance) * decayRate)
          : 1.0;

        const i = y * width + x;
        intensity[i] = profileIntensity * amplitude;
        coverage[i] = 1;
      }
    }
  },
};
