/**
 * AsciiTypePreviewDialog - Draggable dialog showing Figlet previews for every font.
 *
 * Renders a scrollable collection of cards, one per font, previewing the current
 * text using the active layout settings. Users can pick a font directly from this
 * dialog and the selection is applied immediately to the ASCII Type panel.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { FIGLET_FONTS_BY_CATEGORY } from '../../constants/figletFonts';
import { ALL_FIGLET_FONTS } from '../../constants/figletFonts';
import { renderFigletText } from '../../lib/figletClient';
import { useAsciiTypeTool } from '../../hooks/useAsciiTypeTool';
import { useAsciiTypeStore } from '../../stores/asciiTypeStore';
import { DraggableDialogBar } from '../common/DraggableDialogBar';
import { cn } from '../../lib/utils';
import { Loader2, TypeOutline } from 'lucide-react';

const DIALOG_WIDTH = 680;

interface FontPreviewState {
  lines: string[] | null;
  error?: string;
}

export function AsciiTypePreviewDialog() {
  const previewDialogOpen = useAsciiTypeStore((state) => state.previewDialogOpen);
  const setPreviewDialogOpen = useAsciiTypeStore((state) => state.setPreviewDialogOpen);
  const previewDialogScrollTop = useAsciiTypeStore((state) => state.previewDialogScrollTop);
  const setPreviewDialogScrollTop = useAsciiTypeStore((state) => state.setPreviewDialogScrollTop);

  const {
    text,
    horizontalLayout,
    verticalLayout,
    setSelectedFont,
  } = useAsciiTypeTool();

  const effectiveText = useMemo(() => {
    const trimmed = text.trim();
    return trimmed.length > 0 ? trimmed : 'Text Preview';
  }, [text]);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const dragOriginRef = useRef({ x: 0, y: 0 });

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hasBeenDragged, setHasBeenDragged] = useState(false);
  const [fontPreviews, setFontPreviews] = useState<Record<string, FontPreviewState>>({});
  const hasCenteredRef = useRef(false);

  // Reset previews and center dialog whenever inputs change
  const previewKey = useMemo(
    () => `${horizontalLayout}::${verticalLayout}::${effectiveText}`,
    [horizontalLayout, verticalLayout, effectiveText]
  );

  useEffect(() => {
    if (!previewDialogOpen) {
      hasCenteredRef.current = false;
      return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Calculate dialog height as 90vh to match the maxHeight
    const dialogHeight = Math.min(height * 0.9, height - 48);

    const offsetX = Math.max((width - DIALOG_WIDTH) / 2, 24);
    const offsetY = Math.max((height - dialogHeight) / 2, 24);

    setPosition({ x: offsetX, y: offsetY });
    setHasBeenDragged(false);
    hasCenteredRef.current = true;
  }, [previewDialogOpen]);

  useEffect(() => {
    if (!previewDialogOpen) {
      return undefined;
    }

    setFontPreviews({});
    let cancelled = false;

    const fonts = ALL_FIGLET_FONTS.slice();

    const renderSequentially = async (index: number) => {
      if (cancelled || index >= fonts.length) {
        return;
      }

      const fontName = fonts[index];

      try {
        const { lines } = await renderFigletText(effectiveText, {
          font: fontName,
          horizontalLayout,
          verticalLayout,
        });

        if (!cancelled) {
          setFontPreviews((prev) => ({
            ...prev,
            [fontName]: { lines },
          }));
        }
      } catch (error) {
        if (!cancelled) {
          setFontPreviews((prev) => ({
            ...prev,
            [fontName]: {
              lines: null,
              error: error instanceof Error ? error.message : String(error),
            },
          }));
        }
      } finally {
        if (!cancelled) {
          requestAnimationFrame(() => {
            void renderSequentially(index + 1);
          });
        }
      }
    };

    void renderSequentially(0);

    return () => {
      cancelled = true;
    };
  }, [previewDialogOpen, previewKey, horizontalLayout, verticalLayout, effectiveText]);

  useEffect(() => {
    if (!previewDialogOpen) {
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

    viewport.scrollTop = previewDialogScrollTop;

    const handleScroll = () => {
      setPreviewDialogScrollTop(viewport.scrollTop);
    };

    viewport.addEventListener('scroll', handleScroll);
    return () => {
      viewport.removeEventListener('scroll', handleScroll);
    };
  }, [previewDialogOpen, previewDialogScrollTop, setPreviewDialogScrollTop]);

  useEffect(() => {
    if (!previewDialogOpen) {
      return () => {};
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewDialogOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape, { capture: true });
    return () => window.removeEventListener('keydown', handleEscape, { capture: true });
  }, [previewDialogOpen, setPreviewDialogOpen]);

  useEffect(() => {
    if (!previewDialogOpen) {
      return;
    }

    const handleWindowResize = () => {
      if (!hasBeenDragged) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Calculate dialog height as 90vh to match the maxHeight
        const dialogHeight = Math.min(height * 0.9, height - 48);
        
        const offsetX = Math.max((width - DIALOG_WIDTH) / 2, 24);
        const offsetY = Math.max((height - dialogHeight) / 2, 24);
        setPosition({ x: offsetX, y: offsetY });
      }
    };

    window.addEventListener('resize', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [previewDialogOpen, hasBeenDragged]);

  const handleDragStart = useCallback(() => {
    dragOriginRef.current = position;
  }, [position]);

  const handleDrag = useCallback((deltaX: number, deltaY: number) => {
    setHasBeenDragged(true);
    setPosition({
      x: dragOriginRef.current.x + deltaX,
      y: dragOriginRef.current.y + deltaY,
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    dragOriginRef.current = position;
  }, [position]);

  const handleClose = useCallback(() => {
    setPreviewDialogOpen(false);
  }, [setPreviewDialogOpen]);

  const handleUseFont = useCallback(
    (fontName: string) => {
      setSelectedFont(fontName);
      setPreviewDialogOpen(false);
    },
    [setSelectedFont, setPreviewDialogOpen]
  );

  if (!previewDialogOpen) {
    return null;
  }

  const dialogContent = (
    <div
      ref={dialogRef}
      className={cn(
        'fixed z-[99999] w-[680px] max-w-[90vw] rounded-lg border border-border bg-background shadow-2xl'
      )}
      style={{
        top: position.y,
        left: position.x,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex flex-col overflow-hidden rounded-lg border border-border/50 bg-background shadow-lg" style={{ maxHeight: '90vh' }}>
        <DraggableDialogBar
          title="Preview all Figlet fonts"
          onDrag={handleDrag}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onClose={handleClose}
        />
        <div className="flex-1 overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="h-[calc(90vh-60px)]">
            <div className="p-2 space-y-3">
            {FIGLET_FONTS_BY_CATEGORY.map((category) => (
              <div key={category.label} className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <TypeOutline className="w-3.5 h-3.5 text-muted-foreground" />
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {category.label}
                  </h3>
                </div>
                <div className="grid gap-2">
                  {category.fonts.map((fontName) => {
                    const fontPreview = fontPreviews[fontName];
                    const previewLines = fontPreview?.lines ?? null;
                    const previewError = fontPreview?.error;
                    const isLoaded = Boolean(previewLines);

                    return (
                      <Card key={fontName} className="border-border/60 overflow-hidden">
                        <CardHeader className="pb-1.5 pt-2 px-3">
                          <CardTitle className="text-sm">{fontName}</CardTitle>
                          <CardDescription className="text-xs">
                            Horizontal: {horizontalLayout}, Vertical: {verticalLayout}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0 px-3 pb-2 overflow-hidden">
                          {previewError && (
                            <Alert variant="destructive">
                              <AlertDescription>{previewError}</AlertDescription>
                            </Alert>
                          )}
                          {!previewError && !isLoaded && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Rendering preview…
                            </div>
                          )}
                          {!previewError && previewLines && (
                            <div className="mt-1.5 overflow-x-auto rounded bg-muted/50 p-2">
                              <pre className="font-mono text-[10px] leading-tight whitespace-pre">
                                {previewLines.join('\n')}
                              </pre>
                            </div>
                          )}
                        </CardContent>
                        <CardFooter className="pt-1.5 pb-2 px-3">
                          <Button
                            variant="default"
                            size="sm"
                            className="ml-auto h-7 text-xs"
                            onClick={() => handleUseFont(fontName)}
                            disabled={!isLoaded || Boolean(previewError)}
                          >
                            Use this font
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}
