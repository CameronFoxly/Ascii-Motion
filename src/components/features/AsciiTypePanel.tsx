/**
 * AsciiTypePanel - Side panel overlay for configuring the ASCII Type tool.
 *
 * Features:
 * - Persistent state backed by useAsciiTypeStore
 * - Grouped Figlet font selection with "Preview all fonts" button
 * - Layout controls for Figlet horizontal/vertical kerning presets
 * - Transparent whitespace toggle with live preview metadata
 * - Sticky footer with Cancel/Apply actions
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { PANEL_ANIMATION } from '../../constants';
import { FIGLET_FONTS_BY_CATEGORY } from '../../constants/figletFonts';
import { ASCII_TYPE_LAYOUT_OPTIONS, type AsciiTypeLayoutPreset } from '../../lib/figletClient';
import { useAsciiTypeTool } from '../../hooks/useAsciiTypeTool';
import { useAsciiTypeStore } from '../../stores/asciiTypeStore';
import { useCanvasStore } from '../../stores/canvasStore';
import { useAnimationStore } from '../../stores/animationStore';
import { usePreviewStore } from '../../stores/previewStore';
import { useToolStore } from '../../stores/toolStore';
import { cn } from '../../lib/utils';
import { Loader2, Sparkles, Type, X } from 'lucide-react';

const parseTailwindDuration = (token: string): number | null => {
  const match = token.match(/duration-(\d+)/);
  return match ? Number(match[1]) : null;
};

const LAYOUT_LABELS: Record<AsciiTypeLayoutPreset, string> = {
  normal: 'Normal',
  narrow: 'Narrow',
  squeezed: 'Squeezed',
  fitted: 'Fitted',
  wide: 'Wide',
};

export function AsciiTypePanel() {
  const isPanelOpen = useAsciiTypeStore((state) => state.isPanelOpen);
  const setPreviewDialogOpen = useAsciiTypeStore((state) => state.setPreviewDialogOpen);
  const setPanelScrollPosition = useAsciiTypeStore((state) => state.setPanelScrollTop);
  const panelScrollTop = useAsciiTypeStore((state) => state.panelScrollTop);
  const lastPositionUpdateTimestamp = useAsciiTypeStore((state) => state.lastPositionUpdateTimestamp);

  const setActiveTool = useToolStore((state) => state.setActiveTool);
  const pushCanvasHistory = useToolStore((state) => state.pushCanvasHistory);
  const setCanvasData = useCanvasStore((state) => state.setCanvasData);
  const currentFrameIndex = useAnimationStore((state) => state.currentFrameIndex);
  const clearPreviewOverlay = usePreviewStore((state) => state.clearPreview);

  const {
    text,
    selectedFont,
    horizontalLayout,
    verticalLayout,
    transparentWhitespace,
    previewDimensions,
    previewCellCount,
    isRendering,
    renderError,
    previewGrid,
    previewCanvasCells,
    previewOrigin,
    isPreviewPlaced,
    setText,
    setSelectedFont,
    setHorizontalLayout,
    setVerticalLayout,
    setTransparentWhitespace,
    clearPreview,
  } = useAsciiTypeTool();

  const [shouldRender, setShouldRender] = useState(isPanelOpen);
  const [isAnimating, setIsAnimating] = useState(isPanelOpen);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const animationDurationMs = useMemo(
    () => parseTailwindDuration(PANEL_ANIMATION.DURATION) ?? 300,
    []
  );

  // Auto-focus textarea when preview position is updated (placement or drag end)
  useEffect(() => {
    if (lastPositionUpdateTimestamp > 0 && textareaRef.current) {
      // Use requestAnimationFrame to ensure focus happens after the click event has fully settled
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          // Also select all text for easy replacement
          textareaRef.current.select();
        }
      });
    }
  }, [lastPositionUpdateTimestamp]);

  useEffect(() => {
    if (isPanelOpen) {
      setShouldRender(true);
      requestAnimationFrame(() => setIsAnimating(true));
    } else if (shouldRender) {
      setIsAnimating(false);
      const timer = setTimeout(() => setShouldRender(false), animationDurationMs);
      return () => clearTimeout(timer);
    }
  }, [isPanelOpen, shouldRender, animationDurationMs]);

  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  // Restore scroll position when panel mounts and persist changes.
  useEffect(() => {
    if (!shouldRender) {
      return undefined;
    }

    const root = scrollAreaRef.current;
    if (!root) {
      return undefined;
    }

    const viewport = root.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
    if (!viewport) {
      return undefined;
    }

    viewport.scrollTop = panelScrollTop;

    const handleScroll = () => {
      setPanelScrollPosition(viewport.scrollTop);
    };

    viewport.addEventListener('scroll', handleScroll);
    return () => {
      viewport.removeEventListener('scroll', handleScroll);
    };
  }, [shouldRender, panelScrollTop, setPanelScrollPosition]);

  const handleFontSelect = useCallback(
    (fontName: string) => {
      setSelectedFont(fontName);
    },
    [setSelectedFont]
  );

  const handleHorizontalLayoutChange = useCallback(
    (layout: AsciiTypeLayoutPreset) => {
      setHorizontalLayout(layout);
    },
    [setHorizontalLayout]
  );

  const handleVerticalLayoutChange = useCallback(
    (layout: AsciiTypeLayoutPreset) => {
      setVerticalLayout(layout);
    },
    [setVerticalLayout]
  );

  const handleTransparentWhitespaceChange = useCallback(
    (checked: boolean) => {
      setTransparentWhitespace(checked);
    },
    [setTransparentWhitespace]
  );

  const handleTextChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setText(event.target.value);
    },
    [setText]
  );

  const handleCancel = useCallback(() => {
    clearPreview();
    clearPreviewOverlay();
    setActiveTool('pencil');
  }, [clearPreview, clearPreviewOverlay, setActiveTool]);

  const handlePreviewAllFonts = useCallback(() => {
    setPreviewDialogOpen(true);
  }, [setPreviewDialogOpen]);

  const handleApply = useCallback(() => {
    if (!isPreviewPlaced || !previewOrigin || previewCanvasCells.size === 0) {
      return;
    }

    const { cells: canvasCells } = useCanvasStore.getState();
    const nextCells = new Map(canvasCells);
    let applied = false;

    previewCanvasCells.forEach(({ cell, skipApply }, key) => {
      if (skipApply) {
        return;
      }

      applied = true;
      nextCells.set(key, { ...cell });
    });

    if (!applied) {
      clearPreview();
      clearPreviewOverlay();
      return;
    }

    setCanvasData(nextCells);
    pushCanvasHistory(new Map(nextCells), currentFrameIndex, 'ASCII Type apply');

    clearPreview();
    clearPreviewOverlay();
    setActiveTool('pencil');
  }, [
    isPreviewPlaced,
    previewOrigin,
    previewCanvasCells,
    setCanvasData,
    pushCanvasHistory,
    currentFrameIndex,
    clearPreview,
    clearPreviewOverlay,
    setActiveTool,
  ]);

  const isApplyDisabled = isRendering || !previewGrid || !isPreviewPlaced;

  const previewSummary = useMemo(() => {
    if (!previewDimensions) {
      return 'Preview will appear after placing text on the canvas.';
    }

    return `${previewDimensions.width} × ${previewDimensions.height} (${previewCellCount.toLocaleString()} cells)`;
  }, [previewDimensions, previewCellCount]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed inset-y-0 right-0 w-80 bg-background border-l border-border shadow-lg z-50 flex flex-col overflow-hidden',
        PANEL_ANIMATION.TRANSITION,
        isAnimating ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <Type className="w-3 h-3" />
          ASCII Type
        </h2>
        <Button
          onClick={handleCancel}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      <ScrollArea ref={scrollAreaRef} className="flex-1">
        <div className="p-3 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ascii-text">Text</Label>
            <Textarea
              ref={textareaRef}
              id="ascii-text"
              rows={5}
              value={text}
              onChange={handleTextChange}
              placeholder="Type to preview Figlet output..."
              className="resize-none"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{text.length.toLocaleString()} characters</span>
              {isRendering && (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Rendering…
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="ascii-font">Font</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={handlePreviewAllFonts}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Preview all fonts
              </Button>
            </div>
            <Select value={selectedFont} onValueChange={handleFontSelect}>
              <SelectTrigger id="ascii-font">
                <SelectValue placeholder="Choose a Figlet font" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {FIGLET_FONTS_BY_CATEGORY.map((category) => (
                  <SelectGroup key={category.label}>
                    <SelectLabel>{category.label}</SelectLabel>
                    {category.fonts.map((fontName) => (
                      <SelectItem key={fontName} value={fontName}>
                        {fontName}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ascii-horizontal-layout">Horizontal layout</Label>
              <Select value={horizontalLayout} onValueChange={handleHorizontalLayoutChange}>
                <SelectTrigger id="ascii-horizontal-layout">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASCII_TYPE_LAYOUT_OPTIONS.map((layout) => (
                    <SelectItem key={layout} value={layout}>
                      {LAYOUT_LABELS[layout]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ascii-vertical-layout">Vertical layout</Label>
              <Select value={verticalLayout} onValueChange={handleVerticalLayoutChange}>
                <SelectTrigger id="ascii-vertical-layout">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASCII_TYPE_LAYOUT_OPTIONS.map((layout) => (
                    <SelectItem key={layout} value={layout}>
                      {LAYOUT_LABELS[layout]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="ascii-transparent-whitespace" className="cursor-pointer">
                Transparent whitespace
              </Label>
              <p className="text-xs text-muted-foreground">
                When enabled, blank Figlet cells leave existing canvas pixels untouched.
              </p>
            </div>
            <Switch
              id="ascii-transparent-whitespace"
              checked={transparentWhitespace}
              onCheckedChange={handleTransparentWhitespaceChange}
            />
          </div>

          <div className="rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 p-3 text-xs space-y-1">
            <div className="font-medium text-foreground">Preview summary</div>
            <div className="text-muted-foreground">{previewSummary}</div>
          </div>

          {renderError && (
            <Alert variant="destructive">
              <AlertDescription>{renderError}</AlertDescription>
            </Alert>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border bg-background">
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8"
            disabled={isApplyDisabled}
            onClick={handleApply}
          >
            Apply
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Place the preview on the canvas, then use Apply to commit or Cancel to revert.
        </p>
      </div>
    </div>
  );
}
