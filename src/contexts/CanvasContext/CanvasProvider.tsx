import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { CanvasContext } from './context';
import type {
  CanvasContextValue,
  CanvasProviderProps,
  SelectionPreviewState,
} from './context';
import { usePasteMode } from '@/hooks/usePasteMode';
import { useFrameSynchronization } from '@/hooks/useFrameSynchronization';
import { calculateCellDimensions, calculateFontMetrics, DEFAULT_SPACING } from '@/utils/fontMetrics';
import { DEFAULT_FONT_ID, getFontStack, getFontById } from '@/constants/fonts';
import { detectAvailableFont } from '@/utils/fontDetection';
import { loadBundledFont, isFontLoaded } from '@/utils/fontLoader';

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

  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  
  // Optimized setter that only updates if coordinates actually changed
  const setHoveredCellOptimized = useCallback((cell: { x: number; y: number } | null) => {
    setHoveredCell((prev) => {
      // If both are null, no change
      if (!prev && !cell) return prev;
      // If one is null but not the other, update
      if (!prev || !cell) return cell;
      // If coordinates haven't changed, return previous reference to prevent re-renders
      if (prev.x === cell.x && prev.y === cell.y) return prev;
      // Coordinates changed, update
      return cell;
    });
  }, []);

  const [hoverPreview, setHoverPreview] = useState<CanvasContextValue['hoverPreview']>({
    active: false,
    mode: 'none',
    cells: [],
  });
  
  // Optimized setter that only updates if preview actually changed
  const setHoverPreviewOptimized = useCallback((preview: CanvasContextValue['hoverPreview']) => {
    setHoverPreview((prev) => {
      // If active state changed, always update
      if (prev.active !== preview.active) return preview;
      
      // If mode changed, always update
      if (prev.mode !== preview.mode) return preview;
      
      // If both inactive, no need to update
      if (!prev.active && !preview.active) return prev;
      
      // Check if cells array actually changed (length or content)
      if (prev.cells.length !== preview.cells.length) return preview;
      
      // For active previews, check if cell coordinates changed
      if (prev.active && preview.active && prev.cells.length > 0 && preview.cells.length > 0) {
        // Quick check: compare first and last cell only (optimization)
        const firstChanged = prev.cells[0].x !== preview.cells[0].x || prev.cells[0].y !== preview.cells[0].y;
        const lastChanged = prev.cells[prev.cells.length - 1].x !== preview.cells[preview.cells.length - 1].x || 
                           prev.cells[prev.cells.length - 1].y !== preview.cells[preview.cells.length - 1].y;
        
        if (firstChanged || lastChanged) return preview;
      }
      
      // No meaningful change, return previous reference
      return prev;
    });
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
          } catch (error) {
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

  const contextValue: CanvasContextValue = {
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
    hoveredCell,
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
    setHoverPreview: setHoverPreviewOptimized,
    setMoveState,
    startPasteMode,
    updatePastePosition,
    startPasteDrag,
    stopPasteDrag,
    cancelPasteMode,
    commitPaste,
    setSelectionPreview,
    canvasRef,
  };

  return <CanvasContext.Provider value={contextValue}>{children}</CanvasContext.Provider>;
};
