import React, { useEffect, useRef, useState } from 'react';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { useToolStore } from '../../stores/toolStore';
import { layoutTextBox, textBoxOffsetAt, textBoxToolbarPosition } from '../../utils/textBoxLayout';
import { TransformBoundingBoxVisual } from './TransformBoundingBoxVisual';
import { CanvasCommitCancelButtons } from './BezierActionButtons';
import type { TextAlignment, TextBoxRegion } from '../../types';

interface Viewport {
  left: number;
  top: number;
  width: number;
  height: number;
  canvasX: number;
  canvasY: number;
}

export const TextBoxEditingOverlay: React.FC = () => {
  const edit = useToolStore((s) => s.textToolState.boxEdit);
  const box = useToolStore((s) => s.textToolState.textBox);
  const { canvasRef, cellWidth, cellHeight, zoom, panOffset } = useCanvasContext();
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const dragRef = useRef<{ corner: number; box: TextBoxRegion } | { anchor: number } | null>(null);
  const ecw = cellWidth * zoom;
  const ech = cellHeight * zoom;
  const editing = edit !== null;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = canvas?.parentElement;
    const parent = wrapper?.parentElement;
    if (!canvas || !wrapper || !parent || !editing) return;
    const measure = () => {
      const grid = parent.getBoundingClientRect();
      const view = wrapper.getBoundingClientRect();
      const rect = canvas.getBoundingClientRect();
      setViewport({
        left: view.left - grid.left + wrapper.clientLeft,
        top: view.top - grid.top + wrapper.clientTop,
        width: wrapper.clientWidth, height: wrapper.clientHeight,
        canvasX: rect.left - view.left - wrapper.clientLeft,
        canvasY: rect.top - view.top - wrapper.clientTop,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrapper);
    observer.observe(canvas);
    wrapper.addEventListener('scroll', measure);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      wrapper.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [canvasRef, editing, zoom, panOffset.x, panOffset.y]);

  if (!edit || !box || !viewport) return null;
  const left = viewport.canvasX + panOffset.x + box.left * ecw;
  const top = viewport.canvasY + panOffset.y + box.top * ech;
  const right = viewport.canvasX + panOffset.x + (box.right + 1) * ecw;
  const bottom = viewport.canvasY + panOffset.y + (box.bottom + 1) * ech;
  const corners = [{ x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom }];
  const toolbar = textBoxToolbarPosition(right, bottom, viewport.width, viewport.height);
  const focusEditor = () => window.dispatchEvent(new Event('text-box-focus'));
  const toCell = (event: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: Math.floor((event.clientX - rect.left - panOffset.x) / ecw),
      y: Math.floor((event.clientY - rect.top - panOffset.y) / ech),
    };
  };
  const movePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const cell = toCell(event);
    const store = useToolStore.getState();
    if ('corner' in drag) {
      const region = { ...drag.box };
      if (drag.corner === 0 || drag.corner === 3) region.left = Math.min(cell.x, region.right);
      else region.right = Math.max(region.left, cell.x - 1);
      if (drag.corner === 0 || drag.corner === 1) region.top = Math.min(cell.y, region.bottom);
      else region.bottom = Math.max(region.top, cell.y - 1);
      store.updateTextBoxEdit({ preferredColumn: null }, region);
    } else {
      const current = store.textToolState;
      if (current.boxEdit && current.textBox) {
        const caret = textBoxOffsetAt(layoutTextBox(current.boxEdit.text, current.textBox, current.boxEdit.alignment), cell.x, cell.y);
        store.updateTextBoxEdit({ anchor: drag.anchor, caret, preferredColumn: null });
      }
    }
  };
  const alignments: { value: TextAlignment; icon: typeof AlignLeft; label: string }[] = [
    { value: 'left', icon: AlignLeft, label: 'Align left' },
    { value: 'center', icon: AlignCenter, label: 'Align center' },
    { value: 'right', icon: AlignRight, label: 'Align right' },
  ];
  return (
    <div
      className="absolute pointer-events-none overflow-hidden"
      style={{ left: viewport.left, top: viewport.top, width: viewport.width, height: viewport.height, zIndex: 25 }}
      onPointerMove={movePointer}
      onPointerUp={(event) => {
        dragRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => { dragRef.current = null; }}
    >
      <TransformBoundingBoxVisual corners={corners} />
      <div
        className="absolute pointer-events-auto cursor-text"
        style={{ left, top, width: right - left, height: bottom - top }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.stopPropagation();
          const cell = toCell(event);
          const caret = textBoxOffsetAt(layoutTextBox(edit.text, box, edit.alignment), cell.x, cell.y);
          const anchor = event.shiftKey ? edit.anchor : caret;
          useToolStore.getState().updateTextBoxEdit({ anchor, caret, preferredColumn: null });
          dragRef.current = { anchor };
          event.currentTarget.parentElement?.setPointerCapture(event.pointerId);
          focusEditor();
        }}
      />
      {corners.map((corner, index) => (
        <div
          key={index}
          role="button"
          aria-label={`Resize text box ${['top left', 'top right', 'bottom right', 'bottom left'][index]}`}
          className="absolute pointer-events-auto"
          style={{ left: corner.x - 8, top: corner.y - 8, width: 16, height: 16, cursor: index % 2 === 0 ? 'nwse-resize' : 'nesw-resize' }}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.stopPropagation();
            dragRef.current = { corner: index, box: { ...box } };
            event.currentTarget.parentElement?.setPointerCapture(event.pointerId);
            focusEditor();
          }}
        />
      ))}
      <TooltipProvider delayDuration={300}>
        <div
          className="absolute flex rounded-md border bg-background shadow-lg pointer-events-auto"
          style={{ left: toolbar.left, top: toolbar.top }}
          onMouseDown={(event) => event.preventDefault()}
        >
          {alignments.map(({ value, icon: Icon, label }) => (
            <Tooltip key={value}>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant={edit.alignment === value ? 'secondary' : 'ghost'}
                  aria-label={label}
                  aria-pressed={edit.alignment === value}
                  onClick={() => {
                    useToolStore.getState().updateTextBoxEdit({ alignment: value, preferredColumn: null });
                    focusEditor();
                  }}
                ><Icon className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
      <CanvasCommitCancelButtons
        acceptLabel="Commit text box"
        cancelLabel="Cancel text box"
        acceptShortcut="Cmd/Ctrl+Enter"
        onAccept={() => useToolStore.getState().commitTextBox()}
        onCancel={() => useToolStore.getState().stopTyping()}
      />
    </div>
  );
};
