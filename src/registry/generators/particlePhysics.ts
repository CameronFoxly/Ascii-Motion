/**
 * Particle Physics Generator — emitter-based particle simulation.
 *
 * Per-particle attributes (velocity, size, lifespan, bounciness) are sampled
 * from the settings at the moment of emission, so keyframing emitter
 * controls shapes newly spawned particles. Global forces (gravity, drag,
 * turbulence) and the size/opacity-over-life curves are read every frame.
 *
 * Velocities are expressed in cells per reference frame (30fps) and scaled by
 * `ctx.dt`, so the look is consistent at any project frame rate.
 */

import { Sparkles } from 'lucide-react';
import type { SimulationGeneratorEntry, GeneratorFrameContext } from '../generatorRegistry';
import { CELL_ASPECT_RATIO } from '../../utils/fontMetrics';
import { frameRng } from '../../utils/generators/random';
import { numberProp, boolProp, selectProp, seedProp, defaultsFromDefinitions, n, b, s } from './propertyHelpers';

const MAX_PARTICLES = 1000;

type ParticleShape = 'circle' | 'square' | 'cloudlet';
type EmitterShape = 'point' | 'vertical-line' | 'horizontal-line' | 'square' | 'circle';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  /** Age in seconds */
  age: number;
  /** Lifespan in seconds */
  lifespan: number;
  shape: ParticleShape;
  cloudletOffsets?: ReadonlyArray<{ x: number; y: number }>;
  hasEnteredCanvas: boolean;
  bounciness: number;
}

interface ParticleState {
  particles: Particle[];
  emissionDebt: number;
  previousOrigin: { x: number; y: number } | null;
}

const visibleWhen = (path: string, ...values: string[]) => ({ visibleWhen: { path, values } });

const propertyDefinitions = [
  numberProp('originX', 'Origin X', 'Emitter', 40, -500, 1000, 1),
  numberProp('originY', 'Origin Y', 'Emitter', 12, -500, 1000, 1),
  boolProp('inheritOriginVelocity', 'Inherit Velocity from Origin', 'Emitter', false),
  numberProp('originVelocityInfluence', 'Origin Velocity Influence', 'Emitter', 100, 0, 200, 1, {
    unit: '%', control: 'slider', ...visibleWhen('inheritOriginVelocity', 'true'),
  }),
  selectProp('emitterShape', 'Emitter Shape', 'Emitter', 'point', [
    { label: 'Point', value: 'point' },
    { label: 'Vertical Line', value: 'vertical-line' },
    { label: 'Horizontal Line', value: 'horizontal-line' },
    { label: 'Square', value: 'square' },
    { label: 'Circle', value: 'circle' },
  ]),
  numberProp('emitterSize', 'Emitter Size', 'Emitter', 5, 1, 100, 1, visibleWhen('emitterShape', 'vertical-line', 'horizontal-line', 'square', 'circle')),
  selectProp('emitterMode', 'Emission Mode', 'Emitter', 'continuous', [
    { label: 'Continuous', value: 'continuous' },
    { label: 'Burst', value: 'burst' },
  ]),
  numberProp('emissionRate', 'Emission Rate', 'Emitter', 20, 0, 500, 1, { unit: '/s', ...visibleWhen('emitterMode', 'continuous') }),
  numberProp('particleCount', 'Burst Count', 'Emitter', 100, 1, MAX_PARTICLES, 1, { interpolation: 'hold', ...visibleWhen('emitterMode', 'burst') }),

  selectProp('particleShape', 'Particle Shape', 'Particle', 'circle', [
    { label: 'Circle', value: 'circle' },
    { label: 'Square', value: 'square' },
    { label: 'Cloudlet', value: 'cloudlet' },
  ]),
  numberProp('particleSize', 'Size', 'Particle', 2, 1, 20, 0.5),
  boolProp('particleSizeRandomness', 'Random Size', 'Particle', false),
  numberProp('particleSizeMin', 'Size Min', 'Particle', 1, 1, 20, 0.5, visibleWhen('particleSizeRandomness', 'true')),
  numberProp('particleSizeMax', 'Size Max', 'Particle', 4, 1, 20, 0.5, visibleWhen('particleSizeRandomness', 'true')),
  numberProp('startSizeMultiplier', 'Start Size ×', 'Particle', 1, 0, 5, 0.05),
  numberProp('endSizeMultiplier', 'End Size ×', 'Particle', 1, 0, 5, 0.05),
  numberProp('startOpacity', 'Start Opacity', 'Particle', 1, 0, 1, 0.05),
  numberProp('endOpacity', 'End Opacity', 'Particle', 1, 0, 1, 0.05),
  numberProp('lifespan', 'Lifespan', 'Particle', 2, 0.1, 30, 0.1, { unit: 's' }),
  numberProp('lifespanRandomness', 'Lifespan Randomness', 'Particle', 0, 0, 1, 0.05),

  numberProp('velocityMagnitude', 'Speed', 'Velocity', 2, 0, 20, 0.1),
  numberProp('velocityAngle', 'Direction', 'Velocity', 270, 0, 360, 1, { unit: '°' }),
  numberProp('velocityAngleRandomness', 'Angle Randomness', 'Velocity', 0.3, 0, 1, 0.05),
  numberProp('velocitySpeedRandomness', 'Speed Randomness', 'Velocity', 0.2, 0, 1, 0.05),

  numberProp('gravity', 'Gravity', 'Physics', 0.2, -2, 2, 0.05),
  numberProp('drag', 'Drag', 'Physics', 0.02, 0, 0.5, 0.01),

  boolProp('edgeBounce', 'Edge Bounce', 'Collisions', true),
  numberProp('bounciness', 'Bounciness', 'Collisions', 0.8, 0, 1, 0.05),
  numberProp('bouncinessRandomness', 'Bounciness Randomness', 'Collisions', 0, 0, 1, 0.05),
  numberProp('edgeFriction', 'Edge Friction', 'Collisions', 0.1, 0, 1, 0.05, visibleWhen('edgeBounce', 'true')),
  boolProp('selfCollisions', 'Self Collisions', 'Collisions', false),

  boolProp('turbulenceEnabled', 'Turbulence', 'Turbulence', false),
  numberProp('turbulenceFrequency', 'Frequency', 'Turbulence', 1, 0.1, 10, 0.1, visibleWhen('turbulenceEnabled', 'true')),
  numberProp('turbulenceAffectsPosition', 'Position Strength', 'Turbulence', 2, 0, 10, 0.1, visibleWhen('turbulenceEnabled', 'true')),
  numberProp('turbulenceAffectsScale', 'Scale Strength', 'Turbulence', 0.5, 0, 2, 0.05, visibleWhen('turbulenceEnabled', 'true')),

  seedProp('Random'),
];

// Perlin variant used by the legacy particle turbulence field
function hashInt(v: number): number {
  v = (v << 13) ^ v;
  return (v * (v * v * 15731 + 789221) + 1376312589) & 0x7fffffff;
}
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}
function lerp(a: number, c: number, t: number): number {
  return a + t * (c - a);
}
function grad(h: number, x: number, y: number, z: number): number {
  const k = h & 15;
  const u = k < 8 ? x : y;
  const v = k < 4 ? y : k === 12 || k === 14 ? x : z;
  return ((k & 1) === 0 ? u : -u) + ((k & 2) === 0 ? v : -v);
}
function turbulenceNoise(x: number, y: number, z: number): number {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const zi = Math.floor(z) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const zf = z - Math.floor(z);
  const u = fade(xf);
  const v = fade(yf);
  const w = fade(zf);
  const aaa = hashInt(hashInt(hashInt(xi) + yi) + zi);
  const aba = hashInt(hashInt(hashInt(xi) + yi + 1) + zi);
  const aab = hashInt(hashInt(hashInt(xi) + yi) + zi + 1);
  const abb = hashInt(hashInt(hashInt(xi) + yi + 1) + zi + 1);
  const baa = hashInt(hashInt(hashInt(xi + 1) + yi) + zi);
  const bba = hashInt(hashInt(hashInt(xi + 1) + yi + 1) + zi);
  const bab = hashInt(hashInt(hashInt(xi + 1) + yi) + zi + 1);
  const bbb = hashInt(hashInt(hashInt(xi + 1) + yi + 1) + zi + 1);
  const x1 = lerp(grad(aaa, xf, yf, zf), grad(baa, xf - 1, yf, zf), u);
  const x2 = lerp(grad(aba, xf, yf - 1, zf), grad(bba, xf - 1, yf - 1, zf), u);
  const x3 = lerp(grad(aab, xf, yf, zf - 1), grad(bab, xf - 1, yf, zf - 1), u);
  const x4 = lerp(grad(abb, xf, yf - 1, zf - 1), grad(bbb, xf - 1, yf - 1, zf - 1), u);
  return lerp(lerp(x1, x2, v), lerp(x3, x4, v), w);
}

/** Turbulence noise time coordinate (legacy: 0.1 per frame at 30fps) */
const turbulenceZ = (ctx: GeneratorFrameContext) => ctx.time * 3;

function emitterPosition(settings: Record<string, unknown>, rng: () => number): { x: number; y: number } {
  const originX = n(settings, 'originX', 40);
  const originY = n(settings, 'originY', 12);
  const size = n(settings, 'emitterSize', 5);
  switch (s<EmitterShape>(settings, 'emitterShape', 'point')) {
    case 'vertical-line':
      return { x: originX, y: originY + (rng() - 0.5) * size };
    case 'horizontal-line':
      return { x: originX + (rng() - 0.5) * size, y: originY };
    case 'square':
      return { x: originX + (rng() - 0.5) * size, y: originY + (rng() - 0.5) * size };
    case 'circle': {
      const angle = rng() * Math.PI * 2;
      const radius = (rng() * size) / 2;
      return { x: originX + Math.cos(angle) * radius, y: originY + Math.sin(angle) * radius };
    }
    default:
      return { x: originX, y: originY };
  }
}

function spawnParticle(
  settings: Record<string, unknown>,
  rng: () => number,
  originVelocity: { x: number; y: number },
): Particle {
  const shape = s<ParticleShape>(settings, 'particleShape', 'circle');
  let cloudletOffsets: Array<{ x: number; y: number }> | undefined;
  if (shape === 'cloudlet') {
    cloudletOffsets = [];
    const count = 5 + Math.floor(rng() * 5);
    for (let j = 0; j < count; j++) {
      const angle = rng() * Math.PI * 2;
      const radius = rng() * 0.5;
      cloudletOffsets.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    }
  }

  const pos = emitterPosition(settings, rng);
  const angle = (n(settings, 'velocityAngle', 270) * Math.PI) / 180
    + (rng() - 0.5) * 2 * n(settings, 'velocityAngleRandomness', 0.3) * Math.PI;
  const magnitude = n(settings, 'velocityMagnitude', 2)
    * (1 + (rng() - 0.5) * 2 * n(settings, 'velocitySpeedRandomness', 0.2));

  let size = n(settings, 'particleSize', 2);
  if (b(settings, 'particleSizeRandomness', false)) {
    const min = n(settings, 'particleSizeMin', 1);
    const max = n(settings, 'particleSizeMax', 4);
    size = min + rng() * (max - min);
  }

  const lifespanRandomness = n(settings, 'lifespanRandomness', 0);
  const lifespan = Math.max(0.01, n(settings, 'lifespan', 2) * (1 + (rng() - 0.5) * 2 * lifespanRandomness));

  const baseBounciness = n(settings, 'bounciness', 0.8);
  const bouncinessRandomness = n(settings, 'bouncinessRandomness', 0);
  const bounciness = bouncinessRandomness > 0
    ? Math.max(0, Math.min(1, baseBounciness * (1 + (rng() - 0.5) * 2 * bouncinessRandomness)))
    : baseBounciness;

  return {
    x: pos.x,
    y: pos.y,
    vx: Math.cos(angle) * magnitude + originVelocity.x,
    vy: Math.sin(angle) * magnitude + originVelocity.y,
    size,
    age: 0,
    lifespan,
    shape,
    cloudletOffsets,
    hasEnteredCanvas: false,
    bounciness,
  };
}

function resolveCollision(p1: Particle, p2: Particle, bounciness: number): void {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0 || dist >= (p1.size + p2.size) / 2) return;
  const nx = dx / dist;
  const ny = dy / dist;
  const dvn = (p2.vx - p1.vx) * nx + (p2.vy - p1.vy) * ny;
  if (dvn > 0) return;
  const impulse = (-(1 + bounciness) * dvn) / 2;
  p1.vx -= impulse * nx;
  p1.vy -= impulse * ny;
  p2.vx += impulse * nx;
  p2.vy += impulse * ny;
  const overlap = (p1.size + p2.size) / 2 - dist;
  if (overlap > 0) {
    p1.x -= (nx * overlap) / 2;
    p1.y -= (ny * overlap) / 2;
    p2.x += (nx * overlap) / 2;
    p2.y += (ny * overlap) / 2;
  }
}

function plotMax(out: { intensity: Float32Array; coverage: Uint8Array }, width: number, height: number, x: number, y: number, value: number): void {
  if (x < 0 || x >= width || y < 0 || y >= height || value <= 0) return;
  const i = y * width + x;
  if (value > out.intensity[i]) out.intensity[i] = value;
  out.coverage[i] = 1;
}

function plotDisc(
  out: { intensity: Float32Array; coverage: Uint8Array },
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
  opacity: number,
): void {
  const r = Math.ceil(radius);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const cdx = dx * CELL_ASPECT_RATIO;
      const dist = Math.sqrt(cdx * cdx + dy * dy);
      if (dist <= radius) {
        plotMax(out, width, height, cx + dx, cy + dy, Math.min(1, radius - dist) * opacity);
      }
    }
  }
}

export const particlePhysicsGenerator: SimulationGeneratorEntry<ParticleState> = {
  type: 'particle-physics',
  name: 'Particle Physics',
  icon: Sparkles,
  description: 'Particle system with gravity, drag, collisions and turbulence',
  mode: 'simulation',
  defaultSettings: defaultsFromDefinitions(propertyDefinitions),
  propertyDefinitions,
  getCanvasDefaults: (w, h) => ({ originX: Math.floor(w / 2), originY: Math.floor(h / 2) }),

  createState: () => ({ particles: [], emissionDebt: 0, previousOrigin: null }),

  cloneState: (state) => ({
    emissionDebt: state.emissionDebt,
    particles: state.particles.map((p) => ({ ...p })),
    previousOrigin: state.previousOrigin ? { ...state.previousOrigin } : null,
  }),

  step: (state, settings, ctx) => {
    const { width, height, dt, fps, localFrame } = ctx;
    const rng = frameRng(n(settings, 'seed', 0), localFrame, 0x9a71);
    const origin = { x: n(settings, 'originX', 40), y: n(settings, 'originY', 12) };
    const influence = b(settings, 'inheritOriginVelocity', false)
      ? n(settings, 'originVelocityInfluence', 100) / 100
      : 0;
    // Convert cell displacement to the same 30fps reference units as particle speed.
    const originVelocity = state.previousOrigin
      ? {
        x: (origin.x - state.previousOrigin.x) / dt * influence,
        y: (origin.y - state.previousOrigin.y) / dt * influence,
      }
      : { x: 0, y: 0 };
    state.previousOrigin = origin;

    // Emission
    let toSpawn = 0;
    if (s<'continuous' | 'burst'>(settings, 'emitterMode', 'continuous') === 'burst') {
      if (localFrame === 0) toSpawn = Math.round(n(settings, 'particleCount', 100));
    } else {
      state.emissionDebt += Math.max(0, n(settings, 'emissionRate', 20)) / fps;
      toSpawn = Math.floor(state.emissionDebt);
      state.emissionDebt -= toSpawn;
    }
    toSpawn = Math.min(toSpawn, MAX_PARTICLES - state.particles.length);
    for (let i = 0; i < toSpawn; i++) state.particles.push(spawnParticle(settings, rng, originVelocity));

    // Physics
    const gravity = n(settings, 'gravity', 0.2) * 0.1 * dt;
    const dragFactor = Math.pow(Math.max(0, 1 - n(settings, 'drag', 0.02)), dt);
    const turbulenceEnabled = b(settings, 'turbulenceEnabled', false);
    const turbFreq = n(settings, 'turbulenceFrequency', 1) * 0.05;
    const turbPos = n(settings, 'turbulenceAffectsPosition', 2) * 0.1 * dt;
    const edgeBounce = b(settings, 'edgeBounce', true);
    const edgeFriction = n(settings, 'edgeFriction', 0.1);
    const z = turbulenceZ(ctx);
    const ageStep = 1 / fps;

    const survivors: Particle[] = [];
    for (const p of state.particles) {
      p.vy += gravity;
      p.vx *= dragFactor;
      p.vy *= dragFactor;

      if (turbulenceEnabled) {
        const nx = p.x * turbFreq;
        const ny = p.y * turbFreq;
        p.x += turbulenceNoise(nx + 100, ny, z) * turbPos;
        p.y += turbulenceNoise(nx, ny + 100, z) * turbPos;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const inside = p.x >= 0 && p.x < width && p.y >= 0 && p.y < height;
      if (inside) p.hasEnteredCanvas = true;

      if (edgeBounce) {
        if (p.hasEnteredCanvas) {
          if (p.x < 0 || p.x >= width) {
            p.vx *= -p.bounciness;
            p.vy *= 1 - edgeFriction;
            p.x = Math.max(0, Math.min(width - 1, p.x));
          }
          if (p.y < 0 || p.y >= height) {
            p.vy *= -p.bounciness;
            p.vx *= 1 - edgeFriction;
            p.y = Math.max(0, Math.min(height - 1, p.y));
          }
        }
      } else if (p.hasEnteredCanvas && !inside) {
        continue;
      }

      p.age += ageStep;
      if (p.age >= p.lifespan) continue;
      survivors.push(p);
    }
    state.particles = survivors;

    if (b(settings, 'selfCollisions', false)) {
      const bounciness = n(settings, 'bounciness', 0.8);
      const ps = state.particles;
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) resolveCollision(ps[i], ps[j], bounciness);
      }
    }
  },

  render: (state, settings, ctx, out) => {
    const { width, height } = ctx;
    const startOpacity = n(settings, 'startOpacity', 1);
    const endOpacity = n(settings, 'endOpacity', 1);
    const startSize = n(settings, 'startSizeMultiplier', 1);
    const endSize = n(settings, 'endSizeMultiplier', 1);
    const turbulenceScale = b(settings, 'turbulenceEnabled', false) ? n(settings, 'turbulenceAffectsScale', 0.5) : 0;
    const turbFreq = n(settings, 'turbulenceFrequency', 1) * 0.05;
    const z = turbulenceZ(ctx);

    for (const p of state.particles) {
      const life = p.age / p.lifespan;
      const opacity = startOpacity + (endOpacity - startOpacity) * life;
      let sizeMultiplier = startSize + (endSize - startSize) * life;
      if (turbulenceScale > 0) {
        sizeMultiplier *= 1 + turbulenceNoise(p.x * turbFreq + 200, p.y * turbFreq + 200, z) * turbulenceScale;
      }
      const currentSize = p.size * sizeMultiplier;
      const px = Math.floor(p.x);
      const py = Math.floor(p.y);
      const radius = currentSize / 2;

      if (p.shape === 'square') {
        const r = Math.ceil(radius);
        const value = opacity;
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (Math.abs(dx) <= radius && Math.abs(dy) <= radius) plotMax(out, width, height, px + dx, py + dy, value);
          }
        }
      } else if (p.shape === 'cloudlet' && p.cloudletOffsets) {
        for (const o of p.cloudletOffsets) {
          plotDisc(out, width, height, px + Math.floor(o.x * currentSize), py + Math.floor(o.y * currentSize), radius / 2, opacity);
        }
      } else {
        plotDisc(out, width, height, px, py, radius, opacity);
      }
    }
  },
};
