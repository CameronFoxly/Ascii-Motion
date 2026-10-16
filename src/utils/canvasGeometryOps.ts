/**
 * Store-level canvas geometry operations shared by the resize/crop UI hooks and
 * the MCP bridge. Callers own history recording.
 */
import { useCanvasStore } from '../stores/canvasStore';
import { useTimelineStore } from '../stores/timelineStore';
import { calculateAnchorOffset, type AnchorPosition } from './canvasResizeUtils';
import type { Cell } from '../types';
import type { LayerId } from '../types/timeline';

/**
 * Shift all cell coordinates in a map by an offset.
 * Unlike resizeFrameWithAnchor, this does NOT clip to bounds
 * (unbounded canvas — content outside viewport is preserved).
 */
export function shiftCellMap(
  data: Map<string, Cell>,
  offsetX: number,
  offsetY: number,
): Map<string, Cell> {
  if (offsetX === 0 && offsetY === 0) return new Map(data);
  const result = new Map<string, Cell>();
  data.forEach((cell, key) => {
    const [x, y] = key.split(',').map(Number);
    result.set(`${x + offsetX},${y + offsetY}`, { ...cell });
  });
  return result;
}

/**
 * Resize the canvas in layer mode: shifts every content frame by the anchor
 * offset (content outside the viewport is preserved), compensates anchor
 * points, then sets the canvas size.
 */
export function applyLayerCanvasResize(
  previousWidth: number,
  previousHeight: number,
  newWidth: number,
  newHeight: number,
  anchor: AnchorPosition,
): void {
  const { offsetX, offsetY } = calculateAnchorOffset(previousWidth, previousHeight, newWidth, newHeight, anchor);
  const tl = useTimelineStore.getState();
  const tlFlushed = useTimelineStore.getState();
  for (const layer of tlFlushed.layers) {
    for (const cf of layer.contentFrames) {
      const shifted = shiftCellMap(cf.data, offsetX, offsetY);
      tl.updateContentFrameData(layer.id, cf.id, shifted);
    }
  }

  // Shift anchor points for ALL layers so rotation/scale centers track with
  // the shifted content. Position transforms must NOT be shifted — the cell
  // data shift already accounts for the visual offset, and shifting position
  // too would double it. Group properties also stay untouched because group
  // position is additive with layer position in compositing.
  for (const layer of tlFlushed.layers) {
    const oldAnchorX = layer.staticProperties['transform.anchorPoint.x'] ?? 0;
    const oldAnchorY = layer.staticProperties['transform.anchorPoint.y'] ?? 0;
    tl.setStaticProperty(layer.id, 'transform.anchorPoint.x', oldAnchorX + offsetX);
    tl.setStaticProperty(layer.id, 'transform.anchorPoint.y', oldAnchorY + offsetY);

    // Shift anchor point keyframes only (NOT position keyframes)
    for (const track of layer.propertyTracks) {
      if (track.propertyPath === 'transform.anchorPoint.x') {
        for (const kf of track.keyframes) {
          tl.updateKeyframe(layer.id, track.id, kf.id, {
            value: (kf.value as number) + offsetX,
          });
        }
      } else if (track.propertyPath === 'transform.anchorPoint.y') {
        for (const kf of track.keyframes) {
          tl.updateKeyframe(layer.id, track.id, kf.id, {
            value: (kf.value as number) + offsetY,
          });
        }
      }
    }
  }

  // Update canvas dimensions
  useCanvasStore.getState().setCanvasSize(newWidth, newHeight);
}

/** Crop the canvas in layer mode to inclusive bounds by offsetting layer/group positions. */
export function applyLayerCanvasCrop(bounds: { minX: number; minY: number; maxX: number; maxY: number }): void {
  const { minX, minY, maxX, maxY } = bounds;
  const tl = useTimelineStore.getState();
  const tlFlushed = useTimelineStore.getState();
  const posXOffset = -minX;
  const posYOffset = -minY;

  // Collect group IDs for quick lookup
  const groupChildIds = new Set<string>();
  for (const group of tlFlushed.layerGroups) {
    for (const childId of group.childLayerIds) {
      groupChildIds.add(childId as string);
    }
  }

  // Shift each UNGROUPED layer's position (grouped layers get shifted via their group)
  for (const layer of tlFlushed.layers) {
    if (groupChildIds.has(layer.id as string)) continue; // Skip grouped layers

    const oldPosX = layer.staticProperties['transform.position.x'] ?? 0;
    const oldPosY = layer.staticProperties['transform.position.y'] ?? 0;

    tl.setStaticProperty(layer.id, 'transform.position.x', oldPosX + posXOffset);
    tl.setStaticProperty(layer.id, 'transform.position.y', oldPosY + posYOffset);

    // Shift position keyframes by the same offset
    for (const track of layer.propertyTracks) {
      if (track.propertyPath === 'transform.position.x') {
        for (const kf of track.keyframes) {
          tl.updateKeyframe(layer.id, track.id, kf.id, {
            value: (kf.value as number) + posXOffset,
          });
        }
      } else if (track.propertyPath === 'transform.position.y') {
        for (const kf of track.keyframes) {
          tl.updateKeyframe(layer.id, track.id, kf.id, {
            value: (kf.value as number) + posYOffset,
          });
        }
      }
    }
  }

  // Shift group positions the same way
  for (const group of tlFlushed.layerGroups) {
    const groupId = group.id as unknown as LayerId;
    const oldGPosX = group.staticProperties?.['transform.position.x'] ?? 0;
    const oldGPosY = group.staticProperties?.['transform.position.y'] ?? 0;

    tl.setStaticProperty(groupId, 'transform.position.x', oldGPosX + posXOffset);
    tl.setStaticProperty(groupId, 'transform.position.y', oldGPosY + posYOffset);

    for (const track of (group.propertyTracks ?? [])) {
      if (track.propertyPath === 'transform.position.x') {
        for (const kf of track.keyframes) {
          tl.updateKeyframe(groupId, track.id, kf.id, {
            value: (kf.value as number) + posXOffset,
          });
        }
      } else if (track.propertyPath === 'transform.position.y') {
        for (const kf of track.keyframes) {
          tl.updateKeyframe(groupId, track.id, kf.id, {
            value: (kf.value as number) + posYOffset,
          });
        }
      }
    }
  }

  // Resize canvas and reload the active layer's content frame into canvasStore
  useCanvasStore.getState().setCanvasSize(maxX - minX + 1, maxY - minY + 1);
}
