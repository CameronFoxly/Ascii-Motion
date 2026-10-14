/**
 * Generator Block — the timeline span of a procedural generator layer.
 *
 * Drag to move (keyframes move with it), drag the edges to trim, click to
 * select (opens the GeneratorPropertiesPanel).
 */

import React, { useCallback } from 'react';
import { useTimelineStore } from '../../../stores/timelineStore';
import { cn } from '@/lib/utils';
import { getGenerator } from '../../../registry/generatorRegistry';
import { recordGeneratorChange } from '../../../utils/generators/generatorHistory';
import type { Layer } from '../../../types/timeline';

interface GeneratorBlockProps {
  layer: Layer;
  pxPerFrame: number;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const GeneratorBlock: React.FC<GeneratorBlockProps> = React.memo(function GeneratorBlock({
  layer,
  pxPerFrame,
  onContextMenu,
}) {
  const source = layer.generator!;
  const isSelected = useTimelineStore((s) => s.view.selectedGeneratorLayerId === layer.id);
  const selectGeneratorLayer = useTimelineStore((s) => s.selectGeneratorLayer);
  const updateGeneratorTiming = useTimelineStore((s) => s.updateGeneratorTiming);

  const entry = getGenerator(source.generatorType);
  const Icon = entry?.icon;
  const left = source.startFrame * pxPerFrame;
  const width = Math.max(source.durationFrames * pxPerFrame, 4);

  const startDrag = useCallback((
    e: React.MouseEvent,
    mode: 'move' | 'left' | 'right',
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const before = source;
    const origStart = source.startFrame;
    const origDuration = source.durationFrames;
    const endFrame = origStart + origDuration;
    let didDrag = false;
    let last = { start: origStart, duration: origDuration };

    const onMouseMove = (me: MouseEvent) => {
      const dx = me.clientX - startX;
      if (mode === 'move' && !didDrag && Math.abs(dx) < 4) return;
      didDrag = true;
      const df = Math.round(dx / pxPerFrame);
      let next = last;
      if (mode === 'move') {
        next = { start: Math.max(0, origStart + df), duration: origDuration };
      } else if (mode === 'left') {
        const start = Math.max(0, Math.min(endFrame - 1, origStart + df));
        next = { start, duration: endFrame - start };
      } else {
        next = { start: origStart, duration: Math.max(1, origDuration + df) };
      }
      if (next.start !== last.start || next.duration !== last.duration) {
        // Keyframes travel with the block on move (relative to the original snapshot)
        if (mode === 'move') {
          useTimelineStore.getState().setGeneratorSource(layer.id, before);
          updateGeneratorTiming(layer.id, next.start, next.duration, true);
        } else {
          updateGeneratorTiming(layer.id, next.start, next.duration);
        }
        last = next;
      }
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      if (!didDrag) {
        selectGeneratorLayer(layer.id);
      } else if (last.start !== origStart || last.duration !== origDuration) {
        recordGeneratorChange(
          layer.id,
          mode === 'move' ? 'Move generator' : 'Trim generator',
          before,
        );
      }
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [source, layer.id, pxPerFrame, updateGeneratorTiming, selectGeneratorLayer]);

  return (
    <div
      data-generator-block
      className={cn(
        'absolute top-1 h-[24px] rounded border cursor-move overflow-hidden',
        !source.enabled && 'opacity-40',
        isSelected
          ? 'bg-teal-500/35 border-teal-500/70 ring-1 ring-teal-500/40'
          : 'bg-teal-500/20 border-teal-500/50',
      )}
      style={{ left, width }}
      onMouseDown={(e) => startDrag(e, 'move')}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={onContextMenu}
      title={`${entry?.name ?? source.generatorType} — frames ${source.startFrame}–${source.startFrame + source.durationFrames - 1}`}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/20 rounded-l z-10"
        onMouseDown={(e) => startDrag(e, 'left')}
      />
      {width > 40 && (
        <div className="flex items-center gap-1 px-2 h-full text-[10px] text-foreground/70 pointer-events-none">
          {Icon && <Icon className="w-3 h-3 flex-shrink-0" />}
          <span className="truncate">{entry?.name ?? source.generatorType}</span>
        </div>
      )}
      <div
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/20 rounded-r z-10"
        onMouseDown={(e) => startDrag(e, 'right')}
      />
    </div>
  );
});
