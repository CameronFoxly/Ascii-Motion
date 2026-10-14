/**
 * Digital Rain Generator — Matrix-style falling trails with fading tails.
 *
 * Trail speed is in characters per reference frame (30fps) and scaled by
 * `ctx.dt`; spawn frequency is in trails per second. Direction, length and
 * width are sampled per trail at spawn time, so keyframing them affects new trails.
 */

import { CloudHail } from 'lucide-react';
import type { SimulationGeneratorEntry, GeneratorFrameContext } from '../generatorRegistry';
import { frameRng } from '../../utils/generators/random';
import { numberProp, boolProp, seedProp, defaultsFromDefinitions, n, b } from './propertyHelpers';

const MAX_TRAILS = 100;
const MAX_PRERUN_TRAILS = 50;

interface Trail {
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  speed: number;
  length: number;
  width: number;
}

interface DigitalRainState {
  trails: Trail[];
  noisePhase: number;
}

const propertyDefinitions = [
  numberProp('trailLength', 'Trail Length', 'Trail', 10, 1, 100, 1),
  numberProp('trailLengthRandomness', 'Length Randomness', 'Trail', 0.3, 0, 1, 0.05),
  numberProp('fadeAmount', 'Fade Amount', 'Trail', 0.95, 0, 1, 0.05),
  numberProp('trailWidth', 'Trail Width', 'Trail', 1, 1, 10, 1),
  boolProp('widthRandomness', 'Random Width', 'Trail', false),
  numberProp('widthMin', 'Width Min', 'Trail', 1, 1, 10, 1, { visibleWhen: { path: 'widthRandomness', values: ['true'] } }),
  numberProp('widthMax', 'Width Max', 'Trail', 3, 1, 10, 1, { visibleWhen: { path: 'widthRandomness', values: ['true'] } }),
  numberProp('frequency', 'Frequency', 'Spawn', 5, 0, 60, 0.5, { unit: '/s' }),
  boolProp('preRun', 'Pre-run', 'Spawn', true),
  numberProp('speed', 'Speed', 'Movement', 0.8, 0.05, 5, 0.05),
  numberProp('speedRandomness', 'Speed Randomness', 'Movement', 0, 0, 1, 0.05),
  numberProp('directionAngle', 'Direction', 'Movement', 180, 0, 360, 1, { unit: '°' }),
  numberProp('noiseAmount', 'Noise Amount', 'Noise', 20, 0, 200, 1, { unit: '%' }),
  numberProp('noiseScale', 'Noise Scale', 'Noise', 0.1, 0.01, 2, 0.01),
  boolProp('animatedNoise', 'Animated Noise', 'Noise', false),
  numberProp('noiseSpeed', 'Noise Speed', 'Noise', 10, 0, 100, 1, { visibleWhen: { path: 'animatedNoise', values: ['true'] } }),
  seedProp('Random'),
];

/** Compass angle (0°=up, 90°=right, 180°=down) → unit vector in canvas space */
function directionVector(settings: Record<string, unknown>): { x: number; y: number } {
  const radians = ((n(settings, 'directionAngle', 180) + 90) % 360) * (Math.PI / 180);
  return { x: Math.cos(radians), y: -Math.sin(radians) };
}

function createTrail(
  settings: Record<string, unknown>,
  rng: () => number,
  ctx: GeneratorFrameContext,
  anywhere: boolean,
): Trail {
  const { width, height } = ctx;
  const dir = directionVector(settings);
  const length = Math.max(1, Math.round(n(settings, 'trailLength', 10) * (1 + (rng() - 0.5) * 2 * n(settings, 'trailLengthRandomness', 0.3))));
  const speed = n(settings, 'speed', 0.8) * (1 + (rng() - 0.5) * 2 * n(settings, 'speedRandomness', 0));
  let trailWidth = n(settings, 'trailWidth', 1);
  if (b(settings, 'widthRandomness', false)) {
    const min = n(settings, 'widthMin', 1);
    trailWidth = min + rng() * (n(settings, 'widthMax', 3) - min);
  }

  let x: number;
  let y: number;
  if (anywhere) {
    x = rng() * width;
    y = rng() * height;
  } else if (Math.abs(dir.y) >= Math.abs(dir.x)) {
    // Mostly vertical: enter from the top or bottom edge
    x = rng() * width;
    y = dir.y > 0 ? -1 : height;
  } else {
    // Mostly horizontal: enter from the left or right edge
    x = dir.x > 0 ? -1 : width;
    y = rng() * height;
  }

  return { x, y, dirX: dir.x, dirY: dir.y, speed, length, width: trailWidth };
}

function isGone(t: Trail, width: number, height: number): boolean {
  const tailX = t.x - t.dirX * t.length;
  const tailY = t.y - t.dirY * t.length;
  const half = t.width / 2 + 1;
  const minX = Math.min(t.x, tailX) - half;
  const maxX = Math.max(t.x, tailX) + half;
  const minY = Math.min(t.y, tailY) - half;
  const maxY = Math.max(t.y, tailY) + half;
  const vx = t.dirX * t.speed;
  const vy = t.dirY * t.speed;
  return (minX >= width && vx >= 0) || (maxX < 0 && vx <= 0) || (minY >= height && vy >= 0) || (maxY < 0 && vy <= 0);
}

export const digitalRainGenerator: SimulationGeneratorEntry<DigitalRainState> = {
  type: 'digital-rain',
  name: 'Digital Rain',
  icon: CloudHail,
  description: 'Matrix-style falling trails with fading tails',
  mode: 'simulation',
  defaultSettings: defaultsFromDefinitions(propertyDefinitions),
  propertyDefinitions,

  createState: (ctx, settings) => {
    const state: DigitalRainState = { trails: [], noisePhase: 0 };
    if (b(settings, 'preRun', true)) {
      const rng = frameRng(n(settings, 'seed', 0), -1, 0xd1a1);
      const speed = Math.max(0.01, n(settings, 'speed', 0.8));
      const averageLifetimeFrames = (Math.max(ctx.width, ctx.height) + n(settings, 'trailLength', 10)) / speed;
      const spawnPerFrame = n(settings, 'frequency', 5) / 30;
      const count = Math.min(Math.floor(spawnPerFrame * averageLifetimeFrames * 0.5), MAX_PRERUN_TRAILS);
      for (let i = 0; i < count; i++) state.trails.push(createTrail(settings, rng, ctx, true));
    }
    return state;
  },

  cloneState: (state) => ({ noisePhase: state.noisePhase, trails: state.trails.map((t) => ({ ...t })) }),

  step: (state, settings, ctx) => {
    const { dt, fps, width, height, localFrame } = ctx;

    if (localFrame > 0 && b(settings, 'animatedNoise', false)) {
      state.noisePhase += (n(settings, 'noiseSpeed', 10) / 100) * dt;
    }

    const rng = frameRng(n(settings, 'seed', 0), localFrame, 0xd1a2);
    const expected = Math.max(0, n(settings, 'frequency', 5)) / fps;
    let count = Math.floor(expected);
    if (rng() < expected - count) count++;
    for (let i = 0; i < count && state.trails.length < MAX_TRAILS; i++) {
      state.trails.push(createTrail(settings, rng, ctx, false));
    }

    const survivors: Trail[] = [];
    for (const t of state.trails) {
      t.x += t.dirX * t.speed * dt;
      t.y += t.dirY * t.speed * dt;
      if (!isGone(t, width, height)) survivors.push(t);
    }
    state.trails = survivors;
  },

  render: (state, settings, ctx, out) => {
    const { width, height } = ctx;
    const fadeAmount = n(settings, 'fadeAmount', 0.95);
    const noiseStrength = n(settings, 'noiseAmount', 20) / 100;
    const noiseScale = n(settings, 'noiseScale', 0.1);
    const noiseZ = b(settings, 'animatedNoise', false) ? state.noisePhase : 0;
    const { intensity, coverage } = out;
    coverage.fill(1);

    for (const t of state.trails) {
      const halfWidth = Math.floor(t.width / 2);
      for (let i = 0; i < t.length; i++) {
        const cx = t.x - t.dirX * i;
        const cy = t.y - t.dirY * i;
        const pos = i / (t.length - 1 || 1);
        const base = pos <= 1 - fadeAmount ? 1 : 1 - (pos - (1 - fadeAmount)) / fadeAmount;

        for (let dx = -halfWidth; dx <= halfWidth; dx++) {
          for (let dy = -halfWidth; dy <= halfWidth; dy++) {
            const px = Math.round(cx + dx);
            const py = Math.round(cy + dy);
            if (px < 0 || px >= width || py < 0 || py >= height) continue;

            const distance = Math.sqrt(dx * dx + dy * dy);
            const edge = distance > halfWidth ? 0 : 1 - (distance / (halfWidth + 1)) * 0.3;
            let lum = base * edge;
            if (noiseStrength > 0) {
              const nx = px * noiseScale;
              const ny = py * noiseScale;
              const noise = (Math.sin(nx * 2.1 + noiseZ) * 0.5 + Math.sin(ny * 1.7 + noiseZ) * 0.5 + Math.sin((nx + ny) * 1.3 + noiseZ) * 0.5) / 1.5;
              lum = Math.max(0, Math.min(1, lum + noise * noiseStrength));
            }
            const idx = py * width + px;
            if (lum > intensity[idx]) intensity[idx] = lum;
          }
        }
      }
    }
  },
};
