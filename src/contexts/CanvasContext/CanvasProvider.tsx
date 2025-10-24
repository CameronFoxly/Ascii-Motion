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
import { DEFAULT_FONT_ID, getFontStack } from '@/constants/fonts';
import { detectAvailableFont } from '@/utils/fontDetection';

export const CanvasProvider: React.FC<CanvasProviderProps> = ({
  children,
  initialCellSize = 18,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [cellSize, setCellSize] = useState(initialCellSize);
  const [selectedFontId, setSelectedFontId] = useState(DEFAULT_FONT_ID);
  const [actualFont, setActualFont] = useState<string | null>(null);
  const [isFontDetecting, setIsFontDetecting] = useState(false);
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

  const [selectionMode, setSelectionMode] = useState<'none' | 'dragging' | 'moving'>('none');
  const [pendingSelectionStart, setPendingSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [justCommittedMove, setJustCommittedMove] = useState(false);

  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);

  const [hoverPreview, setHoverPreview] = useState<CanvasContextValue['hoverPreview']>({
    active: false,
    mode: 'none',
    cells: [],
  });

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
  useEffect(() => {
    const detectFont = async () => {
      setIsFontDetecting(true);
      try {
        const fontStack = getFontStack(selectedFontId);
        const detected = await detectAvailableFont(fontStack);
        setActualFont(detected);
      } catch (error) {
        console.error('Font detection failed:', error);
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
    fontMetrics,
    cellWidth,
    cellHeight,
    isDrawing,
    mouseButtonDown,
    shiftKeyDown,
    altKeyDown,
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
    setSelectionMode,
    setPendingSelectionStart,
    setJustCommittedMove,
    setHoveredCell,
    setHoverPreview,
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
