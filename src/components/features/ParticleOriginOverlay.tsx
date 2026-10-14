import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { usePlaybackOnlySnapshot } from '../../hooks/usePlaybackOnlySnapshot';
import { useTimelineStore } from '../../stores/timelineStore';
import { useToolStore } from '../../stores/toolStore';
import { canvasPointToParticleOrigin, getParticleOriginAtFrame } from '../../utils/generators/particleOrigin';
import { recordGeneratorChange, setGeneratorValueAtFrame } from '../../utils/generators/generatorHistory';
import type { GeneratorSource } from '../../types/generatorLayer';
import type { Tool } from '../../types';
import type { LayerId } from '../../types/timeline';
import { isFrameInGeneratorRange, resolveGeneratorSettings } from '../../utils/generators/generatorRuntime';
import { MotionPathDots } from './MotionPathDots';

/** Tools that keep working normally on generator layers; every other tool drags the origin instead of drawing. */
const NON_DRAWING_TOOLS: ReadonlySet<Tool> = new Set<Tool>([
  'select', 'lasso', 'magicwand', 'eyedropper', 'layertransform', 'fliphorizontal', 'flipvertical',
]);

const ORIGIN_MIN = -500;
const ORIGIN_MAX = 1000;

interface OriginDrag {
  pointerId: number;
  layerId: LayerId;
  frame: number;
  before: GeneratorSource;
  /** Offset from the pointer to the origin when grabbing the dot, so it doesn't jump */
  offset: { x: number; y: number } | null;
}

export function ParticleOriginOverlay() {
  const layer = useTimelineStore((s) => s.view.activeGroupId === null
    ? s.layers.find((l) => l.id === s.view.activeLayerId)
    : undefined);
  const groups = useTimelineStore((s) => s.layerGroups);
  const currentFrame = useTimelineStore((s) => s.view.currentFrame);
  const durationFrames = useTimelineStore((s) => s.config.durationFrames);
  const { cellWidth, cellHeight, zoom, panOffset, altKeyDown } = useCanvasContext();
  const activeTool = useToolStore((s) => s.activeTool);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<OriginDrag | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const playback = usePlaybackOnlySnapshot();
  const source = layer?.generator;
  const isParticle = source?.generatorType === 'particle-physics';
  const aspectRatio = cellWidth / cellHeight;

  const path = useMemo(() => {
    if (!layer || !source || !isParticle) return [];
    const hasAnimation = source.propertyTracks.some((t) =>
      (t.propertyPath === 'originX' || t.propertyPath === 'originY') && t.keyframes.length > 1)
      || layer.propertyTracks.some((t) => t.propertyPath.startsWith('transform.') && t.keyframes.length > 1)
      || groups.some((g) => g.id === layer.parentGroupId
        && g.propertyTracks.some((t) => t.propertyPath.startsWith('transform.') && t.keyframes.length > 1));
    if (!hasAnimation) return [];
    const points = [];
    const end = Math.min(durationFrames, source.startFrame + source.durationFrames);
    for (let frame = Math.max(0, source.startFrame); frame < end; frame++) {
      points.push({ ...getParticleOriginAtFrame(layer, source, groups, frame, aspectRatio), frame });
    }
    return points;
  }, [layer, source, isParticle, groups, durationFrames, aspectRatio]);

  if (!layer || !source || !isParticle || !layer.visible || !source.enabled
    || !isFrameInGeneratorRange(source, currentFrame) || playback.isActive) return null;

  const origin = getParticleOriginAtFrame(layer, source, groups, currentFrame, aspectRatio);
  const toPixelX = (x: number) => x * cellWidth * zoom + panOffset.x;
  const toPixelY = (y: number) => y * cellHeight * zoom + panOffset.y;
  const dotDraggable = activeTool !== 'layertransform';
  const capturesCanvas = !NON_DRAWING_TOOLS.has(activeTool) && !altKeyDown;

  const pointerToCell = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    return {
      x: (clientX - (rect?.left ?? 0) - panOffset.x) / (cellWidth * zoom),
      y: (clientY - (rect?.top ?? 0) - panOffset.y) / (cellHeight * zoom),
    };
  };

  const moveOriginTo = (drag: OriginDrag, clientX: number, clientY: number) => {
    const state = useTimelineStore.getState();
    const target = state.layers.find((l) => l.id === drag.layerId);
    const current = target?.generator;
    if (!target || !current) return;
    const cell = pointerToCell(clientX, clientY);
    const point = drag.offset
      ? { x: cell.x + drag.offset.x, y: cell.y + drag.offset.y }
      : { x: Math.floor(cell.x), y: Math.floor(cell.y) };
    const local = canvasPointToParticleOrigin(target, state.layerGroups, drag.frame, point, aspectRatio);
    const settings = resolveGeneratorSettings(current, drag.frame);
    const clamp = (v: number) => Math.min(ORIGIN_MAX, Math.max(ORIGIN_MIN, v));
    const nextX = clamp(local.x);
    const nextY = clamp(local.y);
    if (settings.originX !== nextX) setGeneratorValueAtFrame(target.id, 'originX', nextX, drag.frame);
    if (settings.originY !== nextY) setGeneratorValueAtFrame(target.id, 'originY', nextY, drag.frame);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || dragRef.current) return;
    const onDot = (event.target as HTMLElement).closest('[data-origin-handle]') !== null;
    if (!onDot && !capturesCanvas) return;
    event.preventDefault();
    event.stopPropagation();
    const cell = pointerToCell(event.clientX, event.clientY);
    const drag: OriginDrag = {
      pointerId: event.pointerId,
      layerId: layer.id,
      frame: currentFrame,
      before: source,
      offset: onDot ? { x: origin.x - cell.x, y: origin.y - cell.y } : null,
    };
    dragRef.current = drag;
    (event.target as Element).setPointerCapture?.(event.pointerId);
    setIsDragging(true);
    if (!onDot) moveOriginTo(drag, event.clientX, event.clientY);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    moveOriginTo(drag, event.clientX, event.clientY);
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    dragRef.current = null;
    setIsDragging(false);
    recordGeneratorChange(drag.layerId, 'Move particle origin', drag.before);
  };

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 ${capturesCanvas || isDragging ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}
      style={{ zIndex: capturesCanvas || isDragging ? 25 : 15 }}
      data-testid="particle-origin-overlay"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <MotionPathDots points={path} currentFrame={currentFrame} toPixelX={toPixelX} toPixelY={toPixelY} />
      <div
        aria-label="Particle origin"
        data-origin-handle
        className={`absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center ${
          dotDraggable ? `pointer-events-auto ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}` : ''}`}
        style={{ left: toPixelX(origin.x), top: toPixelY(origin.y) }}
        title="Drag to move the particle origin"
      >
        <div className="w-2 h-2 rounded-full bg-yellow-400 border border-yellow-600" />
      </div>
    </div>
  );
}
