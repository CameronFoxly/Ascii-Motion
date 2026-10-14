/**
 * Session Format Migration (v1.0.0 → v2.0.0)
 * 
 * Converts legacy frame-based session data to the new layer-based format.
 * 
 * Part of the Layer Timeline Refactor (v2.0.0)
 * See: docs/LAYER_TIMELINE_REFACTOR_PLAN.md §1.2
 */

import type { Cell } from '../types';
import type {
  SessionDataV2,
  SessionLayerV2,
  SessionContentFrameV2,
} from '../types/timeline';

// ============================================
// V1 SESSION FORMAT TYPES (read-only)
// ============================================

/**
 * V1 session frame data (from existing SessionImporter).
 */
interface V1SessionFrame {
  id: string;
  name?: string;
  duration?: number;  // in milliseconds
  data?: Record<string, Cell>;
  thumbnail?: string;
}

/**
 * V1 session data format. Reconstructed from sessionImporter.ts
 * and exportRenderer.ts to avoid circular dependencies.
 */
interface V1SessionData {
  version: string;
  name?: string;
  description?: string;
  metadata?: {
    exportedAt?: string;
    exportVersion?: string;
    userAgent?: string;
    [key: string]: unknown;
  };
  canvas: {
    width: number;
    height: number;
    canvasBackgroundColor: string;
    showGrid?: boolean;
  };
  animation: {
    frames: V1SessionFrame[];
    currentFrameIndex?: number;
    frameRate?: number;
    looping?: boolean;
  };
  tools?: Record<string, unknown>;
  typography?: Record<string, unknown>;
  palettes?: Record<string, unknown>;
  characterPalettes?: Record<string, unknown>;
}

// ============================================
// VERSION DETECTION
// ============================================

/**
 * Detect session format version from raw parsed JSON.
 */
export function detectSessionVersion(data: unknown): '1.0.0' | '2.0.0' | 'unknown' {
  if (typeof data !== 'object' || data === null) return 'unknown';

  const session = data as Record<string, unknown>;

  // v2 detection: has version '2.0.0', '2.1.0' or '2.2.0' and layers array
  if ((session.version === '2.0.0' || session.version === '2.1.0' || session.version === '2.2.0') && Array.isArray(session.layers)) {
    return '2.0.0';
  }

  // v1 detection: has animation object with frames array
  if (session.animation && typeof session.animation === 'object') {
    const animation = session.animation as Record<string, unknown>;
    if (Array.isArray(animation.frames)) {
      return '1.0.0';
    }
  }

  return 'unknown';
}

// ============================================
// V1 → V2 MIGRATION
// ============================================

/**
 * Default frame duration in milliseconds (matches existing DEFAULT_FRAME_DURATION).
 */
const DEFAULT_FRAME_DURATION_MS = 100;

/**
 * Minimum and maximum frame rates for the derived-from-content calculation.
 */
const MIN_FRAME_RATE = 1;
const MAX_FRAME_RATE = 60;

/**
 * Migrate a v1.0.0 session to v2.0.0 format.
 * 
 * Converts the frame-based animation model to a single-layer composition:
 * - Each v1 frame becomes a content frame (frame block) on "Layer 1"
 * - Frame rate is derived from the shortest frame duration in the v1 project,
 *   ensuring the fastest frame maps to ~1 timeline frame
 * - Longer frames get proportionally more timeline frames (rounded up)
 * - All non-animation data (tools, palettes, typography) is passed through
 * 
 * @param v1Data - Raw v1 session data (parsed from JSON)
 * @returns Fully migrated v2 session data
 */
export function migrateV1ToV2(v1Data: unknown): SessionDataV2 {
  const v1 = v1Data as V1SessionData;

  const frames = v1.animation?.frames ?? [];

  // Derive frame rate from the shortest frame duration in the project.
  // This ensures the fastest frame maps to approximately 1 timeline frame,
  // and longer frames get proportionally more frames (rounded up).
  let shortestDurationMs = DEFAULT_FRAME_DURATION_MS;
  if (frames.length > 0) {
    shortestDurationMs = Infinity;
    for (const frame of frames) {
      const dur = frame.duration ?? DEFAULT_FRAME_DURATION_MS;
      if (dur > 0 && dur < shortestDurationMs) {
        shortestDurationMs = dur;
      }
    }
    // Safety: if all durations were 0 or negative, fall back
    if (!isFinite(shortestDurationMs) || shortestDurationMs <= 0) {
      shortestDurationMs = DEFAULT_FRAME_DURATION_MS;
    }
  }

  const frameRate = Math.max(
    MIN_FRAME_RATE,
    Math.min(MAX_FRAME_RATE, Math.round(1000 / shortestDurationMs)),
  );
  const msPerFrame = 1000 / frameRate;

  // Convert v1 frames to content frames
  const contentFrames: SessionContentFrameV2[] = [];
  let currentFrame = 0;

  for (const frame of frames) {
    // Convert duration from ms to frames, rounded UP so no frame loses time
    const durationMs = frame.duration ?? DEFAULT_FRAME_DURATION_MS;
    const durationFrames = Math.max(1, Math.ceil(durationMs / msPerFrame));

    contentFrames.push({
      id: frame.id || `cf-migrated-${contentFrames.length + 1}`,
      name: frame.name || `Frame ${contentFrames.length + 1}`,
      startFrame: currentFrame,
      durationFrames,
      data: frame.data ?? {},
    });

    currentFrame += durationFrames;
  }

  // Total duration: at least frameRate frames (1 second) if no frames exist
  const durationFrames = currentFrame || frameRate;

  // Create single layer from v1 animation data
  const defaultLayer: SessionLayerV2 = {
    id: 'layer-1',
    name: 'Layer 1',
    visible: true,
    solo: false,
    locked: false,
    opacity: 100,
    contentFrames,
    propertyTracks: [],
  };

  return {
    version: '2.0.0',

    name: v1.name,
    description: v1.description,
    metadata: v1.metadata ? {
      exportedAt: (v1.metadata.exportedAt as string) ?? new Date().toISOString(),
      exportVersion: (v1.metadata.exportVersion as string) ?? '1.0.0',
      userAgent: v1.metadata.userAgent as string | undefined,
    } : undefined,

    canvas: {
      width: v1.canvas?.width ?? 80,
      height: v1.canvas?.height ?? 24,
      canvasBackgroundColor: v1.canvas?.canvasBackgroundColor ?? '#1a1a2e',
      showGrid: v1.canvas?.showGrid ?? true,
    },

    timeline: {
      frameRate,
      durationFrames,
      looping: v1.animation?.looping ?? true,
    },

    layers: [defaultLayer],

    // Pass through preserved state
    tools: v1.tools,
    ui: undefined,
    typography: v1.typography,
    palettes: v1.palettes,
    characterPalettes: v1.characterPalettes,
  };
}

// ============================================
// V2 DATA VALIDATION & REPAIR
// ============================================

/**
 * Validate and repair a v2 session data object.
 * Fixes common corruption issues without data loss.
 * 
 * Per the plan's Error Recovery section:
 * - Missing `data` field: Initialize to empty object
 * - Negative `startFrame`: Clamp to 0
 * - `durationFrames` < 1: Set to 1
 * - Overlapping content frames: Keep first, shift subsequent
 */
export function validateAndRepairV2(data: SessionDataV2): {
  data: SessionDataV2;
  repairs: string[];
} {
  const repairs: string[] = [];
  const repaired = { ...data };

  repaired.layers = data.layers.map((layer) => {
    const repairedFrames: SessionContentFrameV2[] = [];

    // Sort by startFrame
    const sorted = [...layer.contentFrames].sort((a, b) => a.startFrame - b.startFrame);

    let nextAvailableFrame = 0;

    for (const cf of sorted) {
      let startFrame = cf.startFrame;
      let durationFrames = cf.durationFrames;
      let frameData = cf.data;

      // Repair: missing data
      if (!frameData || typeof frameData !== 'object') {
        frameData = {};
        repairs.push(`Layer "${layer.name}" frame "${cf.name}": missing data, initialized to empty`);
      }

      // Repair: negative start frame
      if (startFrame < 0) {
        repairs.push(`Layer "${layer.name}" frame "${cf.name}": negative startFrame ${startFrame} → 0`);
        startFrame = 0;
      }

      // Repair: duration < 1
      if (durationFrames < 1) {
        repairs.push(`Layer "${layer.name}" frame "${cf.name}": durationFrames ${durationFrames} → 1`);
        durationFrames = 1;
      }

      // Repair: overlapping with previous frame
      if (startFrame < nextAvailableFrame) {
        repairs.push(
          `Layer "${layer.name}" frame "${cf.name}": overlap detected, shifted from ${startFrame} → ${nextAvailableFrame}`
        );
        startFrame = nextAvailableFrame;
      }

      repairedFrames.push({
        ...cf,
        startFrame,
        durationFrames,
        data: frameData,
      });

      nextAvailableFrame = startFrame + durationFrames;
    }

    return { ...layer, contentFrames: repairedFrames };
  });

  return { data: repaired, repairs };
}
