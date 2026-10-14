import type { Layer, LayerGroup } from '../../types/timeline';
import type { GeneratorSource } from '../../types/generatorLayer';
import { n } from '../../registry/generators/propertyHelpers';
import { applyRotation, getGroupPropertyValue, getTransformAtFrame } from '../layerCompositing';
import { resolveGeneratorSettings } from './generatorRuntime';

function getComposedTransform(layer: Layer, groups: LayerGroup[], frame: number) {
  const transform = getTransformAtFrame(layer, frame);
  const group = groups.find((g) => g.id === layer.parentGroupId);
  if (group) {
    transform.positionX += getGroupPropertyValue(group, 'transform.position.x', frame);
    transform.positionY += getGroupPropertyValue(group, 'transform.position.y', frame);
    transform.scaleX *= getGroupPropertyValue(group, 'transform.scale.x', frame);
    transform.scaleY *= getGroupPropertyValue(group, 'transform.scale.y', frame);
    transform.rotation += getGroupPropertyValue(group, 'transform.rotation', frame);
  }
  return transform;
}

/** Locate the emitter in canvas space using the same transform composition as rendered cells. */
export function getParticleOriginAtFrame(
  layer: Layer,
  source: GeneratorSource,
  groups: LayerGroup[],
  frame: number,
  cellAspectRatio: number,
): { x: number; y: number } {
  const settings = resolveGeneratorSettings(source, frame);
  const transform = getComposedTransform(layer, groups, frame);
  const { rotatedX, rotatedY } = applyRotation(
    (n(settings, 'originX', 40) - transform.anchorPointX) * transform.scaleX,
    (n(settings, 'originY', 12) - transform.anchorPointY) * transform.scaleY,
    transform.rotation,
    cellAspectRatio,
  );
  return {
    x: rotatedX + transform.anchorPointX + transform.positionX,
    y: rotatedY + transform.anchorPointY + transform.positionY,
  };
}

/**
 * Inverse of {@link getParticleOriginAtFrame}: convert a canvas-space cell
 * position into the layer-local origin that renders there.
 */
export function canvasPointToParticleOrigin(
  layer: Layer,
  groups: LayerGroup[],
  frame: number,
  point: { x: number; y: number },
  cellAspectRatio: number,
): { x: number; y: number } {
  const transform = getComposedTransform(layer, groups, frame);
  let dx = point.x - transform.positionX - transform.anchorPointX;
  const dy = point.y - transform.positionY - transform.anchorPointY;
  let localY = dy;
  if (transform.rotation !== 0) {
    const radians = (-transform.rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const scaledX = dx * cellAspectRatio;
    dx = (scaledX * cos - dy * sin) / cellAspectRatio;
    localY = scaledX * sin + dy * cos;
  }
  const safeScale = (s: number) => (Math.abs(s) < 1e-6 ? 1e-6 : s);
  return {
    x: Math.round(dx / safeScale(transform.scaleX) + transform.anchorPointX),
    y: Math.round(localY / safeScale(transform.scaleY) + transform.anchorPointY),
  };
}
