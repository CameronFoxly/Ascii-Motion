/**
 * Post Effects Pipeline
 *
 * Evaluates post effect blocks at a given frame (resolving keyframes)
 * and orchestrates the WebGL post-processing chain.
 */

import type { PostEffectBlock, PostEffectTrack } from '../types/postEffect';
import type { PostEffectPass } from './webgl/WebGLPostProcessor';
import { getPostEffect } from '../registry/postEffectRegistry';
import { interpolateEffectProperty } from './effectKeyframeInterpolation';
import type { EffectPropertyTrack, EffectPropertyDefinition } from '../types/effectBlock';

// ============================================
// BLOCK EVALUATION
// ============================================

/**
 * Evaluate a post effect block at a given frame, resolving all keyframed
 * properties to their interpolated values.
 *
 * @param block - The post effect block to evaluate
 * @param frame - Target frame number
 * @returns Resolved settings with keyframed values overriding static defaults
 */
export function evaluatePostEffectBlock(
  block: PostEffectBlock,
  frame: number,
): Record<string, unknown> {
  const entry = getPostEffect(block.postEffectType);
  if (!entry) return { ...block.settings };

  const resolved = { ...block.settings };

  // Override with keyframe-interpolated values where property tracks exist
  for (const propTrack of block.propertyTracks) {
    if (propTrack.keyframes.length === 0) continue;

    // Find the matching property definition for interpolation mode
    const definition = entry.propertyDefinitions.find(
      (d) => d.path === propTrack.propertyPath,
    );
    if (!definition) continue;

    // Reuse the existing effect keyframe interpolation system
    // PostEffectPropertyTrack is structurally compatible with EffectPropertyTrack
    const compatTrack: EffectPropertyTrack = {
      id: propTrack.id as unknown as EffectPropertyTrack['id'],
      propertyPath: propTrack.propertyPath,
      keyframes: propTrack.keyframes,
      loopKeyframes: propTrack.loopKeyframes,
    };
    const compatDef: EffectPropertyDefinition = {
      path: definition.path,
      displayName: definition.displayName,
      category: definition.category,
      valueType: definition.valueType as EffectPropertyDefinition['valueType'],
      defaultValue: definition.defaultValue,
      interpolation: definition.interpolation,
      min: definition.min,
      max: definition.max,
      step: definition.step,
      unit: definition.unit,
    };

    resolved[propTrack.propertyPath] = interpolateEffectProperty(
      compatTrack,
      frame,
      compatDef,
    );
  }

  return resolved;
}

// ============================================
// ACTIVE EFFECTS QUERY
// ============================================

/**
 * Get the list of active post effects at a given frame.
 * Returns effects in render order (array order) that are enabled
 * and whose time range includes the current frame.
 *
 * @param postEffectTracks - All post effect tracks
 * @param frame - Current frame number
 * @returns Ordered list of active post effect blocks
 */
export function getActivePostEffects(
  postEffectTracks: PostEffectTrack[],
  frame: number,
): PostEffectBlock[] {
  return postEffectTracks
    .map((t) => t.effectBlock)
    .filter((block) => {
      if (!block.enabled) return false;
      const start = block.startFrame;
      const end = start + block.durationFrames;
      return frame >= start && frame < end;
    });
}

/**
 * Check if any post effects are active at a given frame.
 */
export function hasActivePostEffectsAtFrame(
  postEffectTracks: PostEffectTrack[],
  frame: number,
): boolean {
  return postEffectTracks.some((t) => {
    const block = t.effectBlock;
    if (!block.enabled) return false;
    const start = block.startFrame;
    const end = start + block.durationFrames;
    return frame >= start && frame < end;
  });
}

// ============================================
// PIPELINE ORCHESTRATION
// ============================================

/**
 * Build the list of PostEffectPass objects for the WebGL processor.
 * Evaluates keyframes and resolves settings for each active effect.
 *
 * @param postEffectTracks - All post effect tracks
 * @param frame - Current frame number
 * @returns Array of passes ready for WebGLPostProcessor.render()
 */
export function buildPostEffectPasses(
  postEffectTracks: PostEffectTrack[],
  frame: number,
): PostEffectPass[] {
  const activeBlocks = getActivePostEffects(postEffectTracks, frame);
  const passes: PostEffectPass[] = [];

  for (const block of activeBlocks) {
    const entry = getPostEffect(block.postEffectType);
    if (!entry) continue;

    const settings = evaluatePostEffectBlock(block, frame);
    passes.push({ entry, settings });
  }

  return passes;
}

/**
 * Check if any post effect tracks exist (regardless of active state).
 * Used to determine if the WebGL pipeline should be engaged.
 */
export function hasAnyPostEffects(postEffectTracks: PostEffectTrack[]): boolean {
  return postEffectTracks.length > 0;
}
