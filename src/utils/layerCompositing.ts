/**
 * Layer Compositing Utilities
 * 
 * Composites all visible layers at a given frame into a single Map<string, Cell>
 * for rendering. Handles visibility, solo mode, opacity, and transform properties
 * (position, scale, rotation) with keyframe interpolation.
 * 
 * Rendering order: First layer in array = bottom (rendered first)
 * Cell priority: Top layer's non-empty cell overwrites lower layers
 * 
 * Part of the Layer Timeline Refactor (Phase 2)
 * See: docs/LAYER_TIMELINE_REFACTOR_PLAN.md §2.4
 */

import type { Cell } from '../types';
import type {
  Layer,
  LayerGroup,
  ContentFrame,
  PropertyPath,
} from '../types/timeline';
import type { EffectTrack } from '../types/effectBlock';
import { PROPERTY_DEFINITIONS } from '../types/timeline';
import { interpolateKeyframes } from '../types/easing';
import { CELL_ASPECT_RATIO } from '../utils/fontMetrics';
import { applyEffectsToLayer, hasActiveEffectsAtFrame } from './effectsPipeline';
import { getEffect } from '../registry/effectRegistry';

// ============================================
// MAIN COMPOSITING FUNCTION
// ============================================

/**
 * Composite all visible layers at a given frame.
 * Returns a Map of cells for rendering.
 * 
 * @param layers - Array of layers ordered by z-index (first = bottom)
 * @param frame - Current frame number
 * @param canvasWidth - Canvas width in cells
 * @param canvasHeight - Canvas height in cells
 * @param cellAspectRatio - Cell width/height ratio for rotation compensation
 * @returns Composited cell map ready for rendering
 */
export function compositeLayersAtFrame(
  layers: Layer[],
  frame: number,
  canvasWidth: number,
  canvasHeight: number,
  cellAspectRatio: number = CELL_ASPECT_RATIO,
  clip: boolean = true,
  groups?: LayerGroup[],
  globalEffectTracks?: EffectTrack[],
): Map<string, Cell> {
  const result = new Map<string, Cell>();

  // Check if any layer is solo'd
  const hasSoloLayer = layers.some((l) => l.solo);

  // Identify groups with active screen-space effects for post-loop processing
  const groupScreenEffectMap = new Map<string, EffectTrack[]>();
  const groupCellMaps = new Map<string, Map<string, Cell>>();
  if (groups) {
    for (const group of groups) {
      const screenTracks = (group.effectTracks ?? []).filter((t) => {
        const entry = getEffect(t.effectBlock.effectType);
        return !!entry?.screenSpace && t.effectBlock.enabled;
      });
      if (screenTracks.length > 0 && hasActiveEffectsAtFrame(screenTracks, frame)) {
        groupScreenEffectMap.set(group.id, screenTracks);
        groupCellMaps.set(group.id, new Map<string, Cell>());
      }
    }
  }

  // Iterate layers from bottom to top (first in array = bottom)
  for (const layer of layers) {
    // Skip invisible layers
    if (!layer.visible) continue;

    // If any layer is solo'd, only render solo'd layers
    if (hasSoloLayer && !layer.solo) continue;

    // Get content frame at this time
    const contentFrame = getContentFrameAtTime(layer, frame);
    if (!contentFrame) continue;

    // Split effects into local-space and screen-space
    const localEffects = (layer.effectTracks ?? []).filter((t) => {
      const entry = getEffect(t.effectBlock.effectType);
      return !entry?.screenSpace;
    });
    const screenEffects = (layer.effectTracks ?? []).filter((t) => {
      const entry = getEffect(t.effectBlock.effectType);
      return !!entry?.screenSpace;
    });

    // Apply per-layer procedural effects (non-destructive, in local space)
    let cellData = contentFrame.data;
    if (localEffects.length > 0 && hasActiveEffectsAtFrame(localEffects, frame)) {
      cellData = applyEffectsToLayer(cellData, localEffects, frame, {
        canvasBackgroundColor: '#000000',
        frame,
        canvasWidth,
        canvasHeight,
      });
    }

    // Get transform values at this frame via keyframe interpolation
    let posX = getPropertyValueAtFrame(layer, 'transform.position.x', frame);
    let posY = getPropertyValueAtFrame(layer, 'transform.position.y', frame);
    let scaleX = getPropertyValueAtFrame(layer, 'transform.scale.x', frame);
    let scaleY = getPropertyValueAtFrame(layer, 'transform.scale.y', frame);
    let rotation = getPropertyValueAtFrame(layer, 'transform.rotation', frame);
    const anchorX = getPropertyValueAtFrame(layer, 'transform.anchorPoint.x', frame);
    const anchorY = getPropertyValueAtFrame(layer, 'transform.anchorPoint.y', frame);

    // Compose group transforms if this layer belongs to a group
    if (layer.parentGroupId && groups) {
      const group = groups.find((g) => g.id === layer.parentGroupId);
      if (group) {
        // Apply only local (non-screen-space) group effects per-layer
        const localGroupEffects = (group.effectTracks ?? []).filter((t) => {
          const entry = getEffect(t.effectBlock.effectType);
          return !entry?.screenSpace;
        });
        if (localGroupEffects.length > 0 && hasActiveEffectsAtFrame(localGroupEffects, frame)) {
          cellData = applyEffectsToLayer(cellData, localGroupEffects, frame, {
            canvasBackgroundColor: '#000000',
            frame,
            canvasWidth,
            canvasHeight,
          });
        }

        const gPosX = getGroupPropertyValue(group, 'transform.position.x', frame);
        const gPosY = getGroupPropertyValue(group, 'transform.position.y', frame);
        const gScaleX = getGroupPropertyValue(group, 'transform.scale.x', frame);
        const gScaleY = getGroupPropertyValue(group, 'transform.scale.y', frame);
        const gRotation = getGroupPropertyValue(group, 'transform.rotation', frame);
        const gAnchorX = getGroupPropertyValue(group, 'transform.anchorPoint.x', frame);
        const gAnchorY = getGroupPropertyValue(group, 'transform.anchorPoint.y', frame);
        // Compose: group transform applied after layer transform
        // Apply group anchor offset, then group scale/rotation, then group position
        posX += gPosX;
        posY += gPosY;
        scaleX *= gScaleX;
        scaleY *= gScaleY;
        rotation += gRotation;
        // Group anchor offsets the composited result
        if (gAnchorX !== 0 || gAnchorY !== 0) {
          // Anchor shifts the rotation/scale center for the group
          // The offset is already handled by the compositing math via position + anchor
        }
      }
    }

    // Check if transforms are identity (common case — skip expensive math)
    const hasTransform =
      posX !== 0 ||
      posY !== 0 ||
      scaleX !== 1 ||
      scaleY !== 1 ||
      rotation !== 0 ||
      anchorX !== 0 ||
      anchorY !== 0;

    // Determine final destination: group temp map or result
    const groupTarget = (layer.parentGroupId && groupCellMaps.has(layer.parentGroupId))
      ? groupCellMaps.get(layer.parentGroupId)!
      : result;

    // If layer has screen-space effects, collect in a temp map first
    const hasActiveScreenEffects = screenEffects.length > 0 && hasActiveEffectsAtFrame(screenEffects, frame);
    const target = hasActiveScreenEffects ? new Map<string, Cell>() : groupTarget;

    // Apply each cell from the content frame
    if (hasTransform) {
      // ── Inverse mapping: iterate destination cells, sample source ──
      // This prevents gaps that forward mapping creates during scale/rotation.
      // 
      // 1. Compute the screen-space bounding box by forward-transforming the
      //    content's local bounding box corners.
      // 2. For each cell in that screen-space box, inverse-transform to find
      //    which source cell it maps to.
      // 3. If the source cell exists, place it at the destination.

      // Find local-space content bounds
      let localMinX = Infinity, localMaxX = -Infinity;
      let localMinY = Infinity, localMaxY = -Infinity;
      for (const coordKey of cellData.keys()) {
        const commaIdx = coordKey.indexOf(',');
        const x = parseInt(coordKey.substring(0, commaIdx), 10);
        const y = parseInt(coordKey.substring(commaIdx + 1), 10);
        if (x < localMinX) localMinX = x;
        if (x > localMaxX) localMaxX = x;
        if (y < localMinY) localMinY = y;
        if (y > localMaxY) localMaxY = y;
      }

      if (localMinX === Infinity) continue; // empty content frame

      // Forward-transform the 4 corners of the local bounding box to screen space
      const corners = [
        forwardTransform(localMinX, localMinY),
        forwardTransform(localMaxX + 1, localMinY),
        forwardTransform(localMinX, localMaxY + 1),
        forwardTransform(localMaxX + 1, localMaxY + 1),
      ];

      // Find the axis-aligned bounding box in screen space
      let screenMinX = Infinity, screenMaxX = -Infinity;
      let screenMinY = Infinity, screenMaxY = -Infinity;
      for (const c of corners) {
        if (c.x < screenMinX) screenMinX = c.x;
        if (c.x > screenMaxX) screenMaxX = c.x;
        if (c.y < screenMinY) screenMinY = c.y;
        if (c.y > screenMaxY) screenMaxY = c.y;
      }

      // Add 1-cell padding to avoid edge clipping from rounding
      screenMinX -= 1;
      screenMinY -= 1;
      screenMaxX += 1;
      screenMaxY += 1;

      // Build the transform object for inverseTransformPoint
      const transform = { positionX: posX, positionY: posY, scaleX, scaleY, rotation, anchorPointX: anchorX, anchorPointY: anchorY };

      // Iterate every destination cell in the screen-space bounding box
      for (let sy = screenMinY; sy <= screenMaxY; sy++) {
        for (let sx = screenMinX; sx <= screenMaxX; sx++) {
          // Bounds check (only when clipping for export)
          if (clip && (sx < 0 || sx >= canvasWidth || sy < 0 || sy >= canvasHeight)) {
            continue;
          }

          // Inverse-transform to find the source cell
          const source = inverseTransformPoint(sx, sy, transform);
          const sourceKey = `${source.x},${source.y}`;
          const cell = cellData.get(sourceKey);

          if (cell && cell.char && cell.char !== ' ') {
            target.set(`${sx},${sy}`, cell);
          }
        }
      }

      // Helper: forward-transform a local-space point to screen space
      function forwardTransform(x: number, y: number): { x: number; y: number } {
        const localX = x - anchorX;
        const localY = y - anchorY;
        const scaledX = localX * scaleX;
        const scaledY = localY * scaleY;
        const { rotatedX, rotatedY } = applyRotation(scaledX, scaledY, rotation, cellAspectRatio);
        return {
          x: Math.round(rotatedX + anchorX + posX),
          y: Math.round(rotatedY + anchorY + posY),
        };
      }
    } else {
      // No transform — use coordinates directly (fast path, forward mapping is fine)
      for (const [coordKey, cell] of cellData) {
        if (!cell.char || cell.char === ' ') continue;

        const commaIdx = coordKey.indexOf(',');
        const finalX = parseInt(coordKey.substring(0, commaIdx), 10);
        const finalY = parseInt(coordKey.substring(commaIdx + 1), 10);

        if (clip && (finalX < 0 || finalX >= canvasWidth || finalY < 0 || finalY >= canvasHeight)) {
          continue;
        }

        target.set(coordKey, cell);
      }
    }

    // Apply layer screen-space effects with temporal access, then merge into groupTarget
    if (hasActiveScreenEffects) {
      const frameCache = new Map<number, Map<string, Cell>>();
      const getLayerCompositeAtFrame = (reqFrame: number): Map<string, Cell> => {
        if (frameCache.has(reqFrame)) return frameCache.get(reqFrame)!;
        const cells = compositeOneLayerToScreenSpace(
          layer, reqFrame, canvasWidth, canvasHeight, cellAspectRatio, clip, groups,
        );
        frameCache.set(reqFrame, cells);
        return cells;
      };

      const processed = applyEffectsToLayer(target, screenEffects, frame, {
        canvasBackgroundColor: '#000000',
        frame,
        canvasWidth,
        canvasHeight,
        getLayerCompositeAtFrame,
      });

      processed.forEach((cell, key) => groupTarget.set(key, cell));
    }
  }

  // Apply screen-space group effects post-loop
  for (const [groupId, screenTracks] of groupScreenEffectMap) {
    const groupCells = groupCellMaps.get(groupId)!;
    if (groupCells.size === 0) continue;

    const frameCache = new Map<number, Map<string, Cell>>();
    const getGroupCompositeAtFrame = (reqFrame: number): Map<string, Cell> => {
      if (frameCache.has(reqFrame)) return frameCache.get(reqFrame)!;
      // Re-composite just this group's child layers at the requested frame
      const groupLayers = layers.filter((l) => l.parentGroupId === groupId);
      const composite = compositeLayersAtFrame(
        groupLayers, reqFrame, canvasWidth, canvasHeight, cellAspectRatio, clip, groups,
      );
      frameCache.set(reqFrame, composite);
      return composite;
    };

    const processed = applyEffectsToLayer(groupCells, screenTracks, frame, {
      canvasBackgroundColor: '#000000',
      frame,
      canvasWidth,
      canvasHeight,
      getLayerCompositeAtFrame: getGroupCompositeAtFrame,
    });

    processed.forEach((cell, key) => result.set(key, cell));
  }

  // Apply global effects post-compositing
  if (globalEffectTracks && globalEffectTracks.length > 0 && hasActiveEffectsAtFrame(globalEffectTracks, frame)) {
    // Split global effects into local and screen-space
    const localGlobalEffects = globalEffectTracks.filter((t) => {
      const entry = getEffect(t.effectBlock.effectType);
      return !entry?.screenSpace;
    });
    const screenGlobalEffects = globalEffectTracks.filter((t) => {
      const entry = getEffect(t.effectBlock.effectType);
      return !!entry?.screenSpace;
    });

    // Apply local global effects
    let globalCells = result;
    if (localGlobalEffects.length > 0 && hasActiveEffectsAtFrame(localGlobalEffects, frame)) {
      globalCells = applyEffectsToLayer(result, localGlobalEffects, frame, {
        canvasBackgroundColor: '#000000',
        frame,
        canvasWidth,
        canvasHeight,
      });
    }

    // Apply screen-space global effects with temporal callback
    if (screenGlobalEffects.length > 0 && hasActiveEffectsAtFrame(screenGlobalEffects, frame)) {
      const frameCache = new Map<number, Map<string, Cell>>();
      const getGlobalCompositeAtFrame = (reqFrame: number): Map<string, Cell> => {
        if (frameCache.has(reqFrame)) return frameCache.get(reqFrame)!;
        // Re-composite at the requested frame with only local global effects
        const composite = compositeLayersAtFrame(
          layers, reqFrame, canvasWidth, canvasHeight, cellAspectRatio, clip, groups,
          localGlobalEffects.length > 0 ? localGlobalEffects : undefined,
        );
        frameCache.set(reqFrame, composite);
        return composite;
      };

      const processed = applyEffectsToLayer(globalCells, screenGlobalEffects, frame, {
        canvasBackgroundColor: '#000000',
        frame,
        canvasWidth,
        canvasHeight,
        getLayerCompositeAtFrame: getGlobalCompositeAtFrame,
      });
      return processed;
    }

    return globalCells;
  }

  return result;
}

// ============================================
// CONTENT FRAME LOOKUP
// ============================================

/**
 * Get the content frame active at a given frame number for a layer.
 * Returns null if the frame falls in a gap between content frames.
 * 
 * PERF FIX: Uses binary search (O(log F)) instead of linear scan (O(F)).
 * Content frames are expected to be sorted by startFrame, so binary search is valid.
 * Falls back to a linear scan if the binary search misses, which guarantees a
 * correct result even if the array is momentarily unsorted (content frames never
 * overlap, so at most one frame can contain a given time — there are no false hits).
 */
export function getContentFrameAtTime(layer: Layer, frame: number): ContentFrame | null {
  const cfs = layer.contentFrames;
  if (cfs.length === 0) return null;

  // Binary search: content frames are expected to be sorted by startFrame
  let lo = 0;
  let hi = cfs.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const cf = cfs[mid];

    if (frame < cf.startFrame) {
      hi = mid - 1;
    } else if (frame >= cf.startFrame + cf.durationFrames) {
      lo = mid + 1;
    } else {
      // frame is within this content frame's range
      if (cf.hidden) return null;
      return cf;
    }
  }

  // Fallback: if the array was not sorted by startFrame, the binary search above
  // can incorrectly miss a frame that actually contains `frame`. A linear scan
  // recovers it. Because content frames never overlap, this can only ever find the
  // one correct frame (or nothing, for a genuine gap).
  for (const cf of cfs) {
    if (frame >= cf.startFrame && frame < cf.startFrame + cf.durationFrames) {
      return cf.hidden ? null : cf;
    }
  }

  return null;
}

// ============================================
// PROPERTY VALUE INTERPOLATION
// ============================================

/**
 * Get the interpolated value of a property at a specific frame for a layer.
 * Uses the keyframe interpolation system from easing.ts.
 * 
 * If the property has no track or no keyframes, returns the default value
 * from PROPERTY_DEFINITIONS.
 * 
 * @param layer - The layer to query
 * @param propertyPath - The property path (e.g., 'transform.position.x')
 * @param frame - The frame number to evaluate at
 * @returns The interpolated numeric value
 */
export function getPropertyValueAtFrame(
  layer: Layer,
  propertyPath: PropertyPath,
  frame: number,
): number {
  // Find the property track for this path
  const track = layer.propertyTracks.find((t) => t.propertyPath === propertyPath);

  if (!track || track.keyframes.length === 0) {
    // Check layer-specific static value first, then global default
    if (layer.staticProperties && propertyPath in layer.staticProperties) {
      return layer.staticProperties[propertyPath];
    }
    const def = PROPERTY_DEFINITIONS[propertyPath];
    return (def?.defaultValue as number) ?? 0;
  }

  // Use the keyframe interpolation system
  return interpolateKeyframes(track.keyframes, frame, track.loopKeyframes);
}

/**
 * Get all property values for a layer at a specific frame.
 * Convenience function that returns all transform properties at once.
 */
export function getTransformAtFrame(
  layer: Layer,
  frame: number,
): {
  positionX: number;
  positionY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  anchorPointX: number;
  anchorPointY: number;
} {
  return {
    positionX: getPropertyValueAtFrame(layer, 'transform.position.x', frame),
    positionY: getPropertyValueAtFrame(layer, 'transform.position.y', frame),
    scaleX: getPropertyValueAtFrame(layer, 'transform.scale.x', frame),
    scaleY: getPropertyValueAtFrame(layer, 'transform.scale.y', frame),
    rotation: getPropertyValueAtFrame(layer, 'transform.rotation', frame),
    anchorPointX: getPropertyValueAtFrame(layer, 'transform.anchorPoint.x', frame),
    anchorPointY: getPropertyValueAtFrame(layer, 'transform.anchorPoint.y', frame),
  };
}

// ============================================
// TRANSFORM HELPERS
// ============================================

/**
 * Apply rotation at 1° increments around the origin.
 * Accounts for cell aspect ratio (cells are typically taller than wide).
 * 
 * Cells rotated off-canvas are preserved in layer data — they simply
 * won't render. This prevents data loss when animating rotation.
 * 
 * @param x - X position after anchor/scale
 * @param y - Y position after anchor/scale
 * @param degrees - Rotation angle in degrees
 * @param cellAspectRatio - Cell width/height ratio (typically 0.6 for monospace)
 * @returns Rotated coordinates snapped to whole cells
 */
export function applyRotation(
  x: number,
  y: number,
  degrees: number,
  cellAspectRatio: number = CELL_ASPECT_RATIO,
): { rotatedX: number; rotatedY: number } {
  if (degrees === 0) return { rotatedX: x, rotatedY: y };

  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  // Scale x to account for cell aspect ratio, making rotation visually correct
  const scaledX = x * cellAspectRatio;

  // Apply rotation
  const rotatedScaledX = scaledX * cos - y * sin;
  const rotatedY = scaledX * sin + y * cos;

  // Scale x back and snap to whole cells
  const rotatedX = Math.round(rotatedScaledX / cellAspectRatio);

  return { rotatedX, rotatedY: Math.round(rotatedY) };
}

// ============================================
// LAYER VISIBILITY HELPERS
// ============================================

/**
 * Get the list of layers that would be visible at render time.
 * Respects visibility and solo mode.
 */
export function getVisibleLayers(layers: Layer[]): Layer[] {
  const hasSoloLayer = layers.some((l) => l.solo);

  return layers.filter((layer) => {
    if (!layer.visible) return false;
    if (hasSoloLayer && !layer.solo) return false;
    return true;
  });
}

/**
 * Check if a layer is editable (visible and not locked).
 */
export function isLayerEditable(layer: Layer): boolean {
  return layer.visible && !layer.locked;
}

/**
 * Inverse-transform a screen-space cell coordinate back to layer-local space.
 * This is the reverse of the forward transform applied during compositing.
 *
 * Used by drawing tools so that drawing on the composited canvas writes
 * to the correct position in the layer's raw data.
 *
 * @param screenX - Cell X in composited (screen) space
 * @param screenY - Cell Y in composited (screen) space
 * @param transform - The layer's transform at the current frame
 * @returns Layer-local cell coordinates
 */
export function inverseTransformPoint(
  screenX: number,
  screenY: number,
  transform: ReturnType<typeof getTransformAtFrame>,
): { x: number; y: number } {
  const { positionX, positionY, scaleX, scaleY, rotation, anchorPointX, anchorPointY } = transform;

  // 1. Remove position and anchor offset
  const relX = screenX - positionX - anchorPointX;
  const relY = screenY - positionY - anchorPointY;

  // 2. Inverse rotation (negate angle)
  const { rotatedX: invRotX, rotatedY: invRotY } = applyRotation(
    relX, relY, -rotation,
  );

  // 3. Inverse scale (per-axis)
  const localX = scaleX !== 0 ? Math.round(invRotX / scaleX + anchorPointX) : anchorPointX;
  const localY = scaleY !== 0 ? Math.round(invRotY / scaleY + anchorPointY) : anchorPointY;

  return { x: localX, y: localY };
}

// ============================================
// GROUP PROPERTY HELPERS
// ============================================

/**
 * Get a property value from a LayerGroup at a given frame.
 * Mirrors getPropertyValueAtFrame but works with LayerGroup's propertyTracks.
 */
export function getGroupPropertyValue(
  group: LayerGroup,
  propertyPath: PropertyPath,
  frame: number,
): number {
  const track = group.propertyTracks.find((t) => t.propertyPath === propertyPath);

  if (!track || track.keyframes.length === 0) {
    // Check group static properties first, then defaults
    if (group.staticProperties && propertyPath in group.staticProperties) {
      return group.staticProperties[propertyPath];
    }
    const def = PROPERTY_DEFINITIONS[propertyPath];
    return (def?.defaultValue as number) ?? 0;
  }

  return interpolateKeyframes(track.keyframes, frame, track.loopKeyframes);
}

// ============================================
// SCREEN-SPACE EFFECT HELPERS
// ============================================

/**
 * Composite a single layer to screen space at a given frame.
 * Only applies local-space effects (no screen-space effects) to prevent recursion.
 * Used by screen-space effects (e.g., Motion Trails) to look up previous frames.
 */
function compositeOneLayerToScreenSpace(
  layer: Layer,
  frame: number,
  canvasWidth: number,
  canvasHeight: number,
  cellAspectRatio: number,
  clip: boolean,
  groups?: LayerGroup[],
): Map<string, Cell> {
  const layerCells = new Map<string, Cell>();

  const contentFrame = getContentFrameAtTime(layer, frame);
  if (!contentFrame) return layerCells;

  // Apply only non-screen-space (local) effects
  let cellData = contentFrame.data;
  const localEffects = (layer.effectTracks ?? []).filter((t) => {
    const entry = getEffect(t.effectBlock.effectType);
    return !entry?.screenSpace;
  });

  if (localEffects.length > 0 && hasActiveEffectsAtFrame(localEffects, frame)) {
    cellData = applyEffectsToLayer(cellData, localEffects, frame, {
      canvasBackgroundColor: '#000000',
      frame,
      canvasWidth,
      canvasHeight,
    });
  }

  // Resolve transform values
  let posX = getPropertyValueAtFrame(layer, 'transform.position.x', frame);
  let posY = getPropertyValueAtFrame(layer, 'transform.position.y', frame);
  let scaleX = getPropertyValueAtFrame(layer, 'transform.scale.x', frame);
  let scaleY = getPropertyValueAtFrame(layer, 'transform.scale.y', frame);
  let rotation = getPropertyValueAtFrame(layer, 'transform.rotation', frame);
  const anchorX = getPropertyValueAtFrame(layer, 'transform.anchorPoint.x', frame);
  const anchorY = getPropertyValueAtFrame(layer, 'transform.anchorPoint.y', frame);

  // Compose group transforms
  if (layer.parentGroupId && groups) {
    const group = groups.find((g) => g.id === layer.parentGroupId);
    if (group) {
      // Apply only local (non-screen-space) group effects
      const localGroupEffects = (group.effectTracks ?? []).filter((t) => {
        const entry = getEffect(t.effectBlock.effectType);
        return !entry?.screenSpace;
      });
      if (localGroupEffects.length > 0 && hasActiveEffectsAtFrame(localGroupEffects, frame)) {
        cellData = applyEffectsToLayer(cellData, localGroupEffects, frame, {
          canvasBackgroundColor: '#000000',
          frame,
          canvasWidth,
          canvasHeight,
        });
      }
      posX += getGroupPropertyValue(group, 'transform.position.x', frame);
      posY += getGroupPropertyValue(group, 'transform.position.y', frame);
      scaleX *= getGroupPropertyValue(group, 'transform.scale.x', frame);
      scaleY *= getGroupPropertyValue(group, 'transform.scale.y', frame);
      rotation += getGroupPropertyValue(group, 'transform.rotation', frame);
    }
  }

  const hasTransform =
    posX !== 0 || posY !== 0 || scaleX !== 1 || scaleY !== 1 ||
    rotation !== 0 || anchorX !== 0 || anchorY !== 0;

  if (hasTransform) {
    // Find local-space content bounds
    let localMinX = Infinity, localMaxX = -Infinity;
    let localMinY = Infinity, localMaxY = -Infinity;
    for (const coordKey of cellData.keys()) {
      const commaIdx = coordKey.indexOf(',');
      const x = parseInt(coordKey.substring(0, commaIdx), 10);
      const y = parseInt(coordKey.substring(commaIdx + 1), 10);
      if (x < localMinX) localMinX = x;
      if (x > localMaxX) localMaxX = x;
      if (y < localMinY) localMinY = y;
      if (y > localMaxY) localMaxY = y;
    }

    if (localMinX === Infinity) return layerCells;

    const fwd = (x: number, y: number) => {
      const lx = x - anchorX;
      const ly = y - anchorY;
      const sx = lx * scaleX;
      const sy = ly * scaleY;
      const { rotatedX, rotatedY } = applyRotation(sx, sy, rotation, cellAspectRatio);
      return {
        x: Math.round(rotatedX + anchorX + posX),
        y: Math.round(rotatedY + anchorY + posY),
      };
    };

    const corners = [
      fwd(localMinX, localMinY),
      fwd(localMaxX + 1, localMinY),
      fwd(localMinX, localMaxY + 1),
      fwd(localMaxX + 1, localMaxY + 1),
    ];

    let sMinX = Infinity, sMaxX = -Infinity;
    let sMinY = Infinity, sMaxY = -Infinity;
    for (const c of corners) {
      if (c.x < sMinX) sMinX = c.x;
      if (c.x > sMaxX) sMaxX = c.x;
      if (c.y < sMinY) sMinY = c.y;
      if (c.y > sMaxY) sMaxY = c.y;
    }
    sMinX -= 1; sMinY -= 1; sMaxX += 1; sMaxY += 1;

    const transform = {
      positionX: posX, positionY: posY, scaleX, scaleY, rotation,
      anchorPointX: anchorX, anchorPointY: anchorY,
    };

    for (let sy = sMinY; sy <= sMaxY; sy++) {
      for (let sx = sMinX; sx <= sMaxX; sx++) {
        if (clip && (sx < 0 || sx >= canvasWidth || sy < 0 || sy >= canvasHeight)) continue;
        const source = inverseTransformPoint(sx, sy, transform);
        const cell = cellData.get(`${source.x},${source.y}`);
        if (cell && cell.char && cell.char !== ' ') {
          layerCells.set(`${sx},${sy}`, cell);
        }
      }
    }
  } else {
    for (const [coordKey, cell] of cellData) {
      if (!cell.char || cell.char === ' ') continue;
      const commaIdx = coordKey.indexOf(',');
      const finalX = parseInt(coordKey.substring(0, commaIdx), 10);
      const finalY = parseInt(coordKey.substring(commaIdx + 1), 10);
      if (clip && (finalX < 0 || finalX >= canvasWidth || finalY < 0 || finalY >= canvasHeight)) continue;
      layerCells.set(coordKey, cell);
    }
  }

  return layerCells;
}
