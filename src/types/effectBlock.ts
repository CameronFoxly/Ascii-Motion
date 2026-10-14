/**
 * Effect Block & Track Types
 *
 * Procedural, timeline-based effects system.
 * Effects are non-destructive blocks on per-layer/group/global tracks,
 * with keyframeable properties and in/out points.
 *
 * Part of the Procedural Effects Refactor
 */

import type { EasingCurve, KeyframeId, LayerGroupId, LayerId } from './timeline';

// ============================================
// BRANDED ID TYPES
// ============================================

declare const __brand: unique symbol;
type Brand<T, B> = T & { [__brand]: B };

export type EffectBlockId = Brand<string, 'EffectBlockId'>;
export type EffectTrackId = Brand<string, 'EffectTrackId'>;
export type EffectPropertyTrackId = Brand<string, 'EffectPropertyTrackId'>;

// ============================================
// ID GENERATION HELPERS
// ============================================

let effectBlockCounter = 0;
let effectTrackCounter = 0;
let effectPropertyTrackCounter = 0;

export function generateEffectBlockId(): EffectBlockId {
  return `eb-${++effectBlockCounter}-${Date.now().toString(36)}` as EffectBlockId;
}

export function generateEffectTrackId(): EffectTrackId {
  return `et-${++effectTrackCounter}-${Date.now().toString(36)}` as EffectTrackId;
}

export function generateEffectPropertyTrackId(): EffectPropertyTrackId {
  return `ept-${++effectPropertyTrackCounter}-${Date.now().toString(36)}` as EffectPropertyTrackId;
}

/**
 * Reset effect ID counters — used in tests and when creating new projects.
 */
export function resetEffectIdCounters(): void {
  effectBlockCounter = 0;
  effectTrackCounter = 0;
  effectPropertyTrackCounter = 0;
}

// ============================================
// EFFECT KEYFRAME
// ============================================

/**
 * A keyframe on an effect property track.
 * Reuses the same easing system as layer keyframes.
 */
export interface EffectKeyframe {
  id: KeyframeId;
  frame: number;
  value: number | boolean | string | Record<string, string>;
  easing: EasingCurve;
}

// ============================================
// EFFECT PROPERTY TRACK
// ============================================

/**
 * A property track within an effect block.
 * Stores keyframes for a single animatable effect property.
 */
export interface EffectPropertyTrack {
  id: EffectPropertyTrackId;
  propertyPath: string;
  keyframes: EffectKeyframe[];
  loopKeyframes: boolean;
}

// ============================================
// EFFECT BLOCK
// ============================================

/**
 * An effect block on the timeline.
 * Represents a single effect instance with a time range and keyframeable properties.
 */
export interface EffectBlock {
  id: EffectBlockId;
  effectType: string;

  // Timeline placement
  startFrame: number;
  durationFrames: number;

  // State
  enabled: boolean;

  // Effect parameters — resolved values (used when no keyframe track exists for a property)
  settings: Record<string, unknown>;

  // Per-property animation tracks within this effect block
  propertyTracks: EffectPropertyTrack[];
}

// ============================================
// EFFECT TRACK
// ============================================

/**
 * A container for effect blocks on a layer, group, or the global timeline.
 * Each effect track holds a single effect block and its sub-tracks.
 * Multiple effect tracks per owner enable stacking (z-order = array order, top-to-bottom).
 */
export interface EffectTrack {
  id: EffectTrackId;

  /**
   * Owner of this effect track:
   * - LayerId: per-layer effect
   * - LayerGroupId: per-group effect (applied to intermediate composite)
   * - null: global effect (applied after full compositing)
   */
  ownerId: LayerId | LayerGroupId | null;

  /** The effect block on this track */
  effectBlock: EffectBlock;

  /** Whether this track is collapsed in the timeline UI */
  collapsed: boolean;
}

// ============================================
// EFFECT PROPERTY DEFINITION
// ============================================

/**
 * Interpolation mode for effect properties.
 * - 'numeric': standard cubic bezier interpolation between values
 * - 'hold': snap to the most recent keyframe value (for mappings, enums, booleans)
 */
export type EffectInterpolationMode = 'numeric' | 'hold';

/**
 * Metadata for a single animatable property of an effect.
 * Used by the UI to render controls and by the pipeline to interpolate values.
 */
export interface EffectPropertyDefinition {
  /** Property path within the effect settings (e.g., 'strength', 'hue') */
  path: string;

  /** Display name in the UI (e.g., 'Strength', 'Hue Shift') */
  displayName: string;

  /** Category for UI grouping */
  category: string;

  /** Value type determines the UI control rendered */
  valueType: 'number' | 'boolean' | 'string' | 'color' | 'select' | 'mapping' | 'palette' | 'characterSet';

  /** Default value when the effect is first created */
  defaultValue: number | boolean | string | Record<string, string>;

  /** Interpolation mode */
  interpolation: EffectInterpolationMode;

  // Numeric constraints
  min?: number;
  max?: number;
  step?: number;
  unit?: string;

  // Select options (for valueType: 'select')
  options?: Array<{ label: string; value: string }>;

  /** Conditional visibility — only show this property when another property matches one of the given values */
  visibleWhen?: { path: string; values: string[] };
}

// ============================================
// SERIALIZATION TYPES
// ============================================

/**
 * Serialized effect keyframe for session files.
 */
export interface SessionEffectKeyframeV2 {
  id: string;
  frame: number;
  value: number | boolean | string | Record<string, string>;
  easing: EasingCurve;
}

/**
 * Serialized effect property track for session files.
 */
export interface SessionEffectPropertyTrackV2 {
  id: string;
  propertyPath: string;
  keyframes: SessionEffectKeyframeV2[];
  loopKeyframes: boolean;
}

/**
 * Serialized effect block for session files.
 */
export interface SessionEffectBlockV2 {
  id: string;
  effectType: string;
  startFrame: number;
  durationFrames: number;
  enabled: boolean;
  settings: Record<string, unknown>;
  propertyTracks: SessionEffectPropertyTrackV2[];
}

/**
 * Serialized effect track for session files.
 */
export interface SessionEffectTrackV2 {
  id: string;
  ownerId: string | null;
  effectBlock: SessionEffectBlockV2;
  collapsed: boolean;
}
