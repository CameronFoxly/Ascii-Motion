import React, { useCallback, useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react';
import { CanvasContext } from './context';
import type {
  CanvasContextValue,
  CanvasProviderProps,
  SelectionPreviewState,
} from './context';
import { usePasteMode } from '@/hooks/usePasteMode';
import { useFrameSynchronization } from '@/hooks/useFrameSynchronization';
import { useSelectionSync } from '@/hooks/useSelectionSync';
import { calculateCellDimensions, calculateFontMetrics, DEFAULT_SPACING } from '@/utils/fontMetrics';
import { DEFAULT_FONT_ID, getFontStack, getFontById } from '@/constants/fonts';
import { detectAvailableFont } from '@/utils/fontDetection';
import { loadBundledFont, isFontLoaded } from '@/utils/fontLoader';
import { setCanvasTypographySnapshot } from '@/stores/canvasTypographySnapshot';

export const CanvasProvider: React.FC<CanvasProviderProps> = ({
  children,
  initialCellSize = 18,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [cellSize, setCellSize] = useState(initialCellSize);
  const [selectedFontId, setSelectedFontId] = useState(DEFAULT_FONT_ID);
  const [actualFont, setActualFont] = useState<string | null>(null);
  const [isFontDetecting, setIsFontDetecting] = useState(false);
  const [isFontLoading, setIsFontLoading] = useState(false);
  const [fontLoadError, setFontLoadError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const [characterSpacing, setCharacterSpacing] = useState(DEFAULT_SPACING.characterSpacing);
  const [lineSpacing, setLineSpacing] = useState(DEFAULT_SPACING.lineSpacing);

  // Calculate font metrics with selected font
  const fontMetrics = useMemo(
    () => {
      const fontStack = getFontStack(selectedFontId);
      return calculateFontMetrics(cellSize, fontStack);
    },
    [cellSize, selectedFontId]
  );

  const { cellWidth, cellHeight } = useMemo(
    () => calculateCellDimensions(fontMetrics, { characterSpacing, lineSpacing }),
    [fontMetrics, characterSpacing, lineSpacing],
  );

  const [isDrawing, setIsDrawing] = useState(false);
  const [mouseButtonDown, setMouseButtonDown] = useState(false);
  const [shiftKeyDown, setShiftKeyDown] = useState(false);
  const [altKeyDown, setAltKeyDown] = useState(false);
  const [ctrlKeyDown, setCtrlKeyDown] = useState(false);

  const [selectionMode, setSelectionMode] = useState<'none' | 'dragging' | 'moving'>('none');
  const [pendingSelectionStart, setPendingSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [justCommittedMove, setJustCommittedMove] = useState(false);
  
  // hoveredCell is ref-based (see hoveredCellRef below) — no React state needed.
  // The context value uses null as a stable placeholder since consumers read from the ref directly.
  
  // Ref-based hoveredCell for zero-latency rendering — bypasses React state entirely.
  // PERF FIX: hoveredCell was previously a React state that changed on every mouse move,
  // causing CanvasProvider to re-render and ALL context consumers to re-render.
  // Now it's ref-based: writes go to the ref, and a direct render callback fires
  // without React involvement. Only MouseCoordinates.tsx needs the old state pattern,
  // and it subscribes via registerHoveredCellRender instead.
  const hoveredCellRef = useRef<{ x: number; y: number } | null>(null);
  const hoveredCellCallbacksRef = useRef<Set<() => void>>(new Set());

  const registerHoveredCellRender = useCallback((cb: (() => void) | null) => {
    if (cb) hoveredCellCallbacksRef.current.add(cb);
    // Return cleanup: caller should call the returned function to unregister
    return () => { if (cb) hoveredCellCallbacksRef.current.delete(cb); };
  }, []);
  
  // Optimized setter: writes to ref + calls direct render callbacks, skips React state
  const setHoveredCellOptimized = useCallback((cell: { x: number; y: number } | null) => {
    const prev = hoveredCellRef.current;
    if (!prev && !cell) return;
    if (!prev || !cell) {
      hoveredCellRef.current = cell;
      hoveredCellCallbacksRef.current.forEach(fn => fn());
      return;
    }
    if (prev.x === cell.x && prev.y === cell.y) return;
    hoveredCellRef.current = cell;
    hoveredCellCallbacksRef.current.forEach(fn => fn());
  }, []);

  const [hoverPreview, _setHoverPreview] = useState<CanvasContextValue['hoverPreview']>({
    active: false,
    mode: 'none',
    cells: [],
  });
  
  // Ref-based hover preview for zero-latency rendering
  const hoverPreviewRef = useRef<CanvasContextValue['hoverPreview']>({
    active: false,
    mode: 'none',
    cells: [],
  });
  const hoverRenderCallbackRef = useRef<(() => void) | null>(null);
  
  const registerHoverRender = useCallback((cb: (() => void) | null) => {
    hoverRenderCallbackRef.current = cb;
  }, []);
  
  // Optimized setter: writes to ref + calls direct render, skips React state entirely
  const setHoverPreviewOptimized = useCallback((preview: CanvasContextValue['hoverPreview']) => {
    const prev = hoverPreviewRef.current;
    
    // Quick check: no meaningful change?
    if (prev.active === preview.active && prev.mode === preview.mode) {
      if (!prev.active && !preview.active) return;
      if (prev.cells.length === preview.cells.length && prev.cells.length > 0) {
        const firstSame = prev.cells[0].x === preview.cells[0].x && prev.cells[0].y === preview.cells[0].y;
        const lastSame = prev.cells[prev.cells.length - 1].x === preview.cells[preview.cells.length - 1].x &&
                         prev.cells[prev.cells.length - 1].y === preview.cells[preview.cells.length - 1].y;
        if (firstSame && lastSame) return;
      }
    }
    
    // Write to ref (immediate, no React)
    hoverPreviewRef.current = preview;
    
    // Call direct render callback (bypasses React render cycle entirely)
    if (hoverRenderCallbackRef.current) {
      hoverRenderCallbackRef.current();
    }
  }, []);

  const [moveState, setMoveState] = useState<CanvasContextValue['moveState']>(null);
  const [selectionPreviewState, setSelectionPreviewState] = useState<SelectionPreviewState>({
    active: false,
    modifier: 'replace',
    tool: null,
    baseCells: [],
    gestureCells: [],
  });

  const setSelectionPreview = useCallback((preview: SelectionPreviewState) => {
    setSelectionPreviewState(preview);
  }, []);

  const {
    pasteMode,
    startPasteMode,
    updatePastePosition,
    startPasteDrag,
    stopPasteDrag,
    cancelPasteMode,
    commitPaste,
  } = usePasteMode();

  useFrameSynchronization(moveState, setMoveState);
  
  // Sync tool store selections to global selection store
  useSelectionSync();

  // Detect actual font being rendered when selected font changes
  // Also load bundled fonts if needed
  useEffect(() => {
    const detectFont = async () => {
      setIsFontDetecting(true);
      setFontLoadError(null);
      
      try {
        const font = getFontById(selectedFontId);
        const fontStack = getFontStack(selectedFontId);
        
        // If this is a bundled font and it's not loaded yet, load it
        if (font.isBundled && !isFontLoaded(font.name)) {
          setIsFontLoading(true);
          try {
            await loadBundledFont(font.name);
          } catch (error) {
            console.error(`[CanvasProvider] Failed to load font ${font.name}:`, error);
            setFontLoadError(`Failed to load ${font.name}`);
          } finally {
            setIsFontLoading(false);
          }
        }
        
        // For CSS-loaded fonts (not bundled), ensure they're loaded before detection
        if (!font.isBundled && document.fonts) {
          setIsFontLoading(true);
          try {
            const fontNameWithQuotes = font.name.includes(' ') ? `"${font.name}"` : font.name;
            await document.fonts.load(`12px ${fontNameWithQuotes}`);
          } catch {
            // Font might already be loaded or not available, continue anyway
          } finally {
            setIsFontLoading(false);
          }
        }
        
        // Detect which font is actually being rendered
        const detected = await detectAvailableFont(fontStack);
        setActualFont(detected);
      } catch (error) {
        console.error('[CanvasProvider] Font detection failed:', error);
        setActualFont(null);
      } finally {
        setIsFontDetecting(false);
      }
    };
    
    detectFont();
  }, [selectedFontId]);

  // Publish typography for non-React export paths (silent cloud save, MCP exports)
  useLayoutEffect(() => {
    setCanvasTypographySnapshot({
      fontMetrics,
      fontSize: cellSize,
      characterSpacing,
      lineSpacing,
      selectedFontId,
      actualFont,
      zoom,
      panOffset,
    });
  }, [fontMetrics, cellSize, characterSpacing, lineSpacing, selectedFontId, actualFont, zoom, panOffset]);

  // PERF FIX: Memoize context value to prevent cascading re-renders.
  // Without this, every CanvasProvider re-render creates a new object reference,
  // which forces ALL context consumers to re-render even if no values changed.
  const contextValue: CanvasContextValue = useMemo(() => ({
    cellSize,
    zoom,
    panOffset,
    characterSpacing,
    lineSpacing,
    fontSize: cellSize,
    selectedFontId,
    actualFont,
    isFontDetecting,
    isFontLoading,
    fontLoadError,
    fontMetrics,
    cellWidth,
    cellHeight,
    isDrawing,
    mouseButtonDown,
    shiftKeyDown,
    altKeyDown,
    ctrlKeyDown,
    selectionMode,
    pendingSelectionStart,
    justCommittedMove,
    hoveredCell: null, // always null — consumers read from hoveredCellRef instead
    hoverPreview,
    moveState,
    pasteMode,
    selectionPreview: selectionPreviewState,
    setCellSize,
    setZoom,
    setPanOffset,
    setCharacterSpacing,
    setLineSpacing,
    setFontSize: setCellSize,
    setSelectedFontId,
    setIsDrawing,
    setMouseButtonDown,
    setShiftKeyDown,
    setAltKeyDown,
    setCtrlKeyDown,
    setSelectionMode,
    setPendingSelectionStart,
    setJustCommittedMove,
    setHoveredCell: setHoveredCellOptimized,
    hoveredCellRef,
    registerHoveredCellRender,
    setHoverPreview: setHoverPreviewOptimized,
    hoverPreviewRef,
    registerHoverRender,
    setMoveState,
    startPasteMode,
    updatePastePosition,
    startPasteDrag,
    stopPasteDrag,
    cancelPasteMode,
    commitPaste,
    setSelectionPreview,
    canvasRef,
  }), [
    cellSize, zoom, panOffset, characterSpacing, lineSpacing,
    selectedFontId, actualFont, isFontDetecting, isFontLoading, fontLoadError,
    fontMetrics, cellWidth, cellHeight,
    isDrawing, mouseButtonDown, shiftKeyDown, altKeyDown, ctrlKeyDown,
    selectionMode, pendingSelectionStart, justCommittedMove,
    hoverPreview, moveState, pasteMode, selectionPreviewState,
    // All setters are stable useCallback refs — they don't change
    setCellSize, setZoom, setPanOffset, setCharacterSpacing, setLineSpacing,
    setSelectedFontId, setIsDrawing, setMouseButtonDown,
    setShiftKeyDown, setAltKeyDown, setCtrlKeyDown,
    setSelectionMode, setPendingSelectionStart, setJustCommittedMove,
    setHoveredCellOptimized, setHoverPreviewOptimized,
    registerHoverRender, registerHoveredCellRender,
    setMoveState,
    startPasteMode, updatePastePosition, startPasteDrag, stopPasteDrag,
    cancelPasteMode, commitPaste, setSelectionPreview,
  ]);

  return <CanvasContext.Provider value={contextValue}>{children}</CanvasContext.Provider>;
};
