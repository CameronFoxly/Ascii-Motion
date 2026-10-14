import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { usePlaybackOnlySnapshot } from '../../hooks/usePlaybackOnlySnapshot';
import { useTimelineStore } from '../../stores/timelineStore';
import { useToolStore } from '../../stores/toolStore';
import { useAnimatedTextEditStore } from '../../stores/animatedTextEditStore';
import { canvasPointToParticleOrigin, layerLocalPointToCanvas } from '../../utils/generators/particleOrigin';
import { recordGeneratorChange, setGeneratorValueAtFrame } from '../../utils/generators/generatorHistory';
import { isFrameInGeneratorRange, resolveGeneratorSettings } from '../../utils/generators/generatorRuntime';
import { ANIMATED_TEXT_GENERATOR_TYPE, getAnimatedTextBox } from '../../registry/generators/animatedText';
import type { GeneratorSource } from '../../types/generatorLayer';
import type { Tool } from '../../types';
import type { LayerId } from '../../types/timeline';
import { MotionPathDots } from './MotionPathDots';

const POSITION_LIMIT = 1000;
const NON_DRAWING_TOOLS: ReadonlySet<Tool> = new Set<Tool>([
  'select', 'lasso', 'magicwand', 'eyedropper', 'layertransform', 'fliphorizontal', 'flipvertical',
]);

interface BoxDrag {
  pointerId: number;
  layerId: LayerId;
  frame: number;
  before: GeneratorSource;
  /** Pointer → top-left offset in canvas cells, so the box doesn't jump */
  offset: { x: number; y: number };
}

/**
 * Canvas overlay for the active Animated Text layer: box outline, draggable
 * top-left position handle with motion trail, and on-canvas text editing.
 */
export function AnimatedTextOverlay() {
  const layer = useTimelineStore((s) => s.view.activeGroupId === null
    ? s.layers.find((l) => l.id === s.view.activeLayerId)
    : undefined);
  const groups = useTimelineStore((s) => s.layerGroups);
  const currentFrame = useTimelineStore((s) => s.view.currentFrame);
  const durationFrames = useTimelineStore((s) => s.config.durationFrames);
  const { cellWidth, cellHeight, zoom, panOffset, altKeyDown } = useCanvasContext();
  const activeTool = useToolStore((s) => s.activeTool);
  const editingLayerId = useAnimatedTextEditStore((s) => s.editingLayerId);
  const selectAllOnStart = useAnimatedTextEditStore((s) => s.selectAllOnStart);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragRef = useRef<BoxDrag | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const playback = usePlaybackOnlySnapshot();
  const source = layer?.generator;
  const isText = source?.generatorType === ANIMATED_TEXT_GENERATOR_TYPE;
  const aspectRatio = cellWidth / cellHeight;
  const shown = !!layer && !!source && isText && layer.visible && source.enabled
    && isFrameInGeneratorRange(source, currentFrame) && !playback.isActive;
  const editable = shown && !layer?.locked;
  const isEditing = editable && editingLayerId === layer?.id;

  // Leave edit mode when the edited layer is no longer shown here
  useEffect(() => {
    if (editingLayerId && (!editable || editingLayerId !== layer?.id)) {
      useAnimatedTextEditStore.getState().stopEditing();
    }
  }, [editingLayerId, editable, layer?.id]);

  // Focus the hidden textarea when editing starts
  useEffect(() => {
    if (!isEditing) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    if (selectAllOnStart) el.setSelectionRange(0, el.value.length);
    else el.setSelectionRange(el.value.length, el.value.length);
    setSelection({ start: el.selectionStart, end: el.selectionEnd });
  }, [isEditing, selectAllOnStart]);

  // Clicking anywhere outside the overlay ends editing
  useEffect(() => {
    if (!isEditing) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        useAnimatedTextEditStore.getState().stopEditing();
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [isEditing]);

  const path = useMemo(() => {
    if (!layer || !source || !isText) return [];
    const hasAnimation = source.propertyTracks.some((t) =>
      (t.propertyPath === 'position.x' || t.propertyPath === 'position.y') && t.keyframes.length > 1)
      || layer.propertyTracks.some((t) => t.propertyPath.startsWith('transform.') && t.keyframes.length > 1)
      || groups.some((g) => g.id === layer.parentGroupId
        && g.propertyTracks.some((t) => t.propertyPath.startsWith('transform.') && t.keyframes.length > 1));
    if (!hasAnimation) return [];
    const points = [];
    const end = Math.min(durationFrames, source.startFrame + source.durationFrames);
    for (let frame = Math.max(0, source.startFrame); frame < end; frame++) {
      const { x, y } = getAnimatedTextBox(resolveGeneratorSettings(source, frame));
      points.push({ ...layerLocalPointToCanvas(layer, groups, frame, { x, y }, aspectRatio), frame });
    }
    return points;
  }, [layer, source, isText, groups, durationFrames, aspectRatio]);

  if (!shown || !layer || !source) return null;

  const settings = resolveGeneratorSettings(source, currentFrame);
  const text = typeof settings.text === 'string' ? settings.text : '';
  const box = getAnimatedTextBox(settings);
  const toCanvas = (col: number, row: number) =>
    layerLocalPointToCanvas(layer, groups, currentFrame, { x: box.x + col, y: box.y + row }, aspectRatio);
  const toPixelX = (x: number) => x * cellWidth * zoom + panOffset.x;
  const toPixelY = (y: number) => y * cellHeight * zoom + panOffset.y;
  const toPixel = (p: { x: number; y: number }) => ({ x: toPixelX(p.x), y: toPixelY(p.y) });
  const corners = [
    toCanvas(0, 0), toCanvas(box.layout.width, 0),
    toCanvas(box.layout.width, box.layout.height), toCanvas(0, box.layout.height),
  ].map(toPixel);
  const topLeft = corners[0];
  const interactive = editable && !NON_DRAWING_TOOLS.has(activeTool) && !altKeyDown;

  const pointerToCell = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    return {
      x: (clientX - (rect?.left ?? 0) - panOffset.x) / (cellWidth * zoom),
      y: (clientY - (rect?.top ?? 0) - panOffset.y) / (cellHeight * zoom),
    };
  };

  const moveBoxTo = (drag: BoxDrag, clientX: number, clientY: number) => {
    const state = useTimelineStore.getState();
    const target = state.layers.find((l) => l.id === drag.layerId);
    const current = target?.generator;
    if (!target || !current) return;
    const cell = pointerToCell(clientX, clientY);
    const local = canvasPointToParticleOrigin(
      target, state.layerGroups, drag.frame,
      { x: cell.x + drag.offset.x, y: cell.y + drag.offset.y }, aspectRatio,
    );
    const resolved = resolveGeneratorSettings(current, drag.frame);
    const clamp = (v: number) => Math.min(POSITION_LIMIT, Math.max(-POSITION_LIMIT, v));
    const nextX = clamp(local.x);
    const nextY = clamp(local.y);
    if (resolved['position.x'] !== nextX) setGeneratorValueAtFrame(target.id, 'position.x', nextX, drag.frame);
    if (resolved['position.y'] !== nextY) setGeneratorValueAtFrame(target.id, 'position.y', nextY, drag.frame);
  };

  /** Place the textarea caret nearest to a click inside the box */
  const placeCaret = (clientX: number, clientY: number) => {
    const el = textareaRef.current;
    if (!el) return;
    const cell = pointerToCell(clientX, clientY);
    const local = canvasPointToParticleOrigin(layer, groups, currentFrame, { x: cell.x, y: cell.y - 0.5 }, aspectRatio);
    const col = local.x - box.x;
    const row = local.y - box.y;
    let best = text.length;
    let bestScore = Infinity;
    box.layout.carets.forEach((caret, i) => {
      const score = Math.abs(caret.row - row) * 1000 + Math.abs(caret.col - col);
      if (score < bestScore) { bestScore = score; best = i; }
    });
    el.focus({ preventScroll: true });
    el.setSelectionRange(best, best);
    setSelection({ start: best, end: best });
  };

  const handleBoxPointerDown = (event: ReactPointerEvent<Element>) => {
    if (event.button !== 0 || dragRef.current || !interactive) return;
    event.preventDefault();
    event.stopPropagation();
    if (isEditing) {
      placeCaret(event.clientX, event.clientY);
      return;
    }
    const cell = pointerToCell(event.clientX, event.clientY);
    const origin = toCanvas(0, 0);
    dragRef.current = {
      pointerId: event.pointerId,
      layerId: layer.id,
      frame: currentFrame,
      before: source,
      offset: { x: origin.x - cell.x, y: origin.y - cell.y },
    };
    (event.target as Element).setPointerCapture?.(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<Element>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    moveBoxTo(drag, event.clientX, event.clientY);
  };

  const endDrag = (event: ReactPointerEvent<Element>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    dragRef.current = null;
    setIsDragging(false);
    recordGeneratorChange(drag.layerId, 'Move text box', drag.before);
  };

  const handleContainerPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // While editing, the overlay covers the canvas so outside clicks end editing instead of drawing
    if (!isEditing || event.target !== event.currentTarget) return;
    event.preventDefault();
    event.stopPropagation();
    useAnimatedTextEditStore.getState().stopEditing();
  };

  const syncSelection = () => {
    const el = textareaRef.current;
    if (el) setSelection({ start: el.selectionStart, end: el.selectionEnd });
  };

  const cellH = cellHeight * zoom;
  const caret = isEditing && selection.start === selection.end
    ? toPixel(toCanvas(box.layout.carets[selection.start]?.col ?? 0, box.layout.carets[selection.start]?.row ?? 0))
    : null;
  const caretEnd = isEditing && selection.start === selection.end
    ? toPixel(toCanvas(
      box.layout.carets[selection.start]?.col ?? 0,
      (box.layout.carets[selection.start]?.row ?? 0) + 1,
    ))
    : null;
  const selectedGlyphs = isEditing && selection.start !== selection.end
    ? box.layout.glyphs.filter((g) => g.sourceIndex >= selection.start && g.sourceIndex < selection.end)
    : [];
  const polygon = corners.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 ${isEditing || isDragging ? 'pointer-events-auto' : 'pointer-events-none'}`}
      style={{ zIndex: isEditing || isDragging ? 25 : 15 }}
      data-testid="animated-text-overlay"
      onPointerDown={handleContainerPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <MotionPathDots points={path} currentFrame={currentFrame} toPixelX={toPixelX} toPixelY={toPixelY} />
      <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
        {selectedGlyphs.map((g) => {
          const glyphCorners = [
            toCanvas(g.col, g.row), toCanvas(g.col + 1, g.row),
            toCanvas(g.col + 1, g.row + 1), toCanvas(g.col, g.row + 1),
          ].map(toPixel);
          return <polygon key={`${g.col},${g.row}`} points={glyphCorners.map((p) => `${p.x},${p.y}`).join(' ')} className="fill-sky-400/40" />;
        })}
        <polygon
          data-testid="animated-text-box"
          points={polygon}
          className={`fill-transparent ${isEditing ? 'stroke-sky-400' : 'stroke-yellow-400/80'} ${
            interactive ? `pointer-events-auto ${isEditing ? 'cursor-text' : isDragging ? 'cursor-grabbing' : 'cursor-move'}` : ''}`}
          style={{ pointerEvents: interactive ? 'all' : 'none' }}
          strokeWidth={1}
          strokeDasharray={isEditing ? undefined : '4 3'}
          onPointerDown={handleBoxPointerDown}
          onDoubleClick={(event) => {
            if (!interactive) return;
            event.stopPropagation();
            useAnimatedTextEditStore.getState().startEditing(layer.id);
          }}
        />
        {caret && (
          <line
            data-testid="animated-text-caret"
            x1={caret.x} y1={caret.y} x2={caretEnd?.x ?? caret.x} y2={caretEnd?.y ?? caret.y + cellH}
            className="stroke-sky-400 animate-pulse" strokeWidth={2}
          />
        )}
      </svg>
      <div
        aria-label="Text box position"
        data-text-position-handle
        className={`absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center ${
          interactive ? `pointer-events-auto ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}` : ''}`}
        style={{ left: topLeft.x, top: topLeft.y }}
        title="Drag to move the text box"
        onPointerDown={(event) => {
          if (isEditing) {
            event.preventDefault();
            event.stopPropagation();
            placeCaret(event.clientX, event.clientY);
            return;
          }
          handleBoxPointerDown(event);
        }}
      >
        <div className="w-2 h-2 rounded-sm bg-yellow-400 border border-yellow-600" />
      </div>
      {isEditing && (
        <textarea
          ref={textareaRef}
          aria-label="Edit text"
          data-testid="animated-text-input"
          value={text}
          spellCheck={false}
          className="absolute opacity-0 w-px h-px p-0 border-0 resize-none overflow-hidden"
          style={{ left: topLeft.x, top: topLeft.y }}
          onChange={(event) => {
            setGeneratorValueAtFrame(layer.id, 'text', event.target.value, currentFrame);
            setSelection({ start: event.target.selectionStart, end: event.target.selectionEnd });
          }}
          onSelect={syncSelection}
          onKeyUp={syncSelection}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Escape') {
              event.preventDefault();
              useAnimatedTextEditStore.getState().stopEditing();
            }
          }}
        />
      )}
    </div>
  );
}
