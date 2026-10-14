/**
 * Helpers for declaring generator property definitions concisely.
 */

import type { EffectPropertyDefinition } from '../../types/effectBlock';

export function numberProp(
  path: string,
  displayName: string,
  category: string,
  defaultValue: number,
  min: number,
  max: number,
  step: number,
  extra: Partial<EffectPropertyDefinition> = {},
): EffectPropertyDefinition {
  return { path, displayName, category, valueType: 'number', defaultValue, interpolation: 'numeric', min, max, step, ...extra };
}

export function boolProp(
  path: string,
  displayName: string,
  category: string,
  defaultValue: boolean,
  extra: Partial<EffectPropertyDefinition> = {},
): EffectPropertyDefinition {
  return { path, displayName, category, valueType: 'boolean', defaultValue, interpolation: 'hold', ...extra };
}

export function selectProp(
  path: string,
  displayName: string,
  category: string,
  defaultValue: string,
  options: Array<{ label: string; value: string }>,
  extra: Partial<EffectPropertyDefinition> = {},
): EffectPropertyDefinition {
  return { path, displayName, category, valueType: 'select', defaultValue, interpolation: 'hold', options, ...extra };
}

/** Integer seed — held between keyframes so patterns don't morph */
export function seedProp(category: string): EffectPropertyDefinition {
  return { path: 'seed', displayName: 'Seed', category, valueType: 'number', defaultValue: 1234, interpolation: 'hold', min: 0, max: 99999, step: 1 };
}

/** Build defaults from property definitions */
export function defaultsFromDefinitions(defs: EffectPropertyDefinition[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const d of defs) out[d.path] = d.defaultValue;
  return out;
}

export function n(settings: Record<string, unknown>, key: string, fallback: number): number {
  const v = settings[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export function b(settings: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const v = settings[key];
  return typeof v === 'boolean' ? v : fallback;
}

export function s<T extends string>(settings: Record<string, unknown>, key: string, fallback: T): T {
  const v = settings[key];
  return typeof v === 'string' ? (v as T) : fallback;
}
