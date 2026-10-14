import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { GripHorizontal, X } from 'lucide-react';
import { Button } from '../ui/button';
import { CharacterMappingSection } from './CharacterMappingSection';
import { TextColorMappingSection } from './TextColorMappingSection';
import { useCharacterPaletteStore } from '../../stores/characterPaletteStore';
import { usePaletteStore } from '../../stores/paletteStore';
import { useToolStore } from '../../stores/toolStore';

export interface PaletteEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: 'character' | 'color';
  paletteId: string;
  onPaletteChange: (paletteId: string) => void;
  title?: string;
}

/** Shared palette library editor, independent of the consumer's mapping settings. */
export function PaletteEditorDialog({
  open, onOpenChange, kind, paletteId, onPaletteChange, title,
}: PaletteEditorDialogProps) {
  const characterPalettes = useCharacterPaletteStore((s) => s.availablePalettes);
  const customCharacterPalettes = useCharacterPaletteStore((s) => s.customPalettes);
  const colorPalettes = usePaletteStore((s) => s.palettes);
  const customColorPalettes = usePaletteStore((s) => s.customPalettes);
  const palettes = kind === 'character'
    ? [...characterPalettes, ...customCharacterPalettes]
    : [...colorPalettes, ...customColorPalettes];
  const missingPalette = !palettes.some((p) => p.id === paletteId);
  const paletteEditor = { paletteId, onPaletteChange };
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const contentRef = useRef<HTMLDivElement>(null);

  const startDrag = (event: ReactPointerEvent) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    const start = { x: event.clientX, y: event.clientY };
    const origin = offset;
    const rect = contentRef.current?.getBoundingClientRect();
    const move = (e: PointerEvent) => {
      let dx = e.clientX - start.x;
      let dy = e.clientY - start.y;
      if (rect) {
        // Keep the header reachable inside the viewport
        dx = Math.min(Math.max(dx, 40 - rect.right), window.innerWidth - 40 - rect.left);
        dy = Math.min(Math.max(dy, -rect.top), window.innerHeight - 40 - rect.top);
      }
      setOffset({ x: origin.x + dx, y: origin.y + dy });
    };
    const end = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', end);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', end);
  };

  useEffect(() => {
    if (!open) return;
    if (kind === 'character') {
      return useCharacterPaletteStore.subscribe((state, previous) => {
        if (state.customPalettes === previous.customPalettes || useToolStore.getState().isProcessingHistory ||
            JSON.stringify(state.customPalettes) === JSON.stringify(previous.customPalettes)) return;
        useToolStore.getState().pushToHistory({
          type: 'palette_edit', timestamp: Date.now(), description: 'Edit character palettes',
          data: {
            kind: 'character',
            previousPalettes: structuredClone(previous.customPalettes),
            newPalettes: structuredClone(state.customPalettes),
          },
        });
      });
    }
    return usePaletteStore.subscribe((state, previous) => {
      if (state.customPalettes === previous.customPalettes || useToolStore.getState().isProcessingHistory ||
          JSON.stringify(state.customPalettes) === JSON.stringify(previous.customPalettes)) return;
      useToolStore.getState().pushToHistory({
        type: 'palette_edit', timestamp: Date.now(), description: 'Edit color palettes',
        data: {
          kind: 'color',
          previousPalettes: structuredClone(previous.customPalettes),
          newPalettes: structuredClone(state.customPalettes),
        },
      });
    });
  }, [open, kind]);

  return (
    // Non-modal and undimmed so the canvas stays visible and interactive while editing
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogPrimitive.Portal>
      <DialogPrimitive.Content
        ref={contentRef}
        className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] sm:w-[480px] max-h-[85vh] flex flex-col rounded-lg border border-border/50 bg-background shadow-2xl"
        style={{ transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }}
        onInteractOutside={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div
          className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border cursor-grab active:cursor-grabbing select-none touch-none"
          onPointerDown={startDrag}
        >
          <DialogPrimitive.Title className="text-sm font-medium flex items-center gap-2">
            <GripHorizontal className="w-3 h-3 text-muted-foreground" />
            {title ?? (kind === 'character' ? 'Character Palette' : 'Color Palette')}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" aria-label="Close">
              <X className="w-3 h-3" />
            </Button>
          </DialogPrimitive.Close>
        </div>
        <div className="flex flex-col gap-3 p-4 min-h-0 flex-1">
        <DialogPrimitive.Description className="text-xs text-muted-foreground">
          Choose, create, or edit a shared palette. Edits affect every feature using it.
          Editing a preset creates a custom copy.
        </DialogPrimitive.Description>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {missingPalette ? (
            <div className="space-y-2">
              <p role="alert" className="text-sm text-destructive">
                This palette is unavailable. Choose a palette below to replace it.
              </p>
              <select
                aria-label="Choose replacement palette"
                className="w-full rounded border border-border bg-background p-2 text-sm"
                value=""
                onChange={(event) => onPaletteChange(event.target.value)}
              >
                <option value="" disabled>Select a palette</option>
                {palettes.map((palette) => (
                  <option key={palette.id} value={palette.id}>{palette.name}</option>
                ))}
              </select>
            </div>
          ) : kind === 'character'
            ? <CharacterMappingSection paletteEditor={paletteEditor} />
            : <TextColorMappingSection paletteEditor={paletteEditor} />}
        </div>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
