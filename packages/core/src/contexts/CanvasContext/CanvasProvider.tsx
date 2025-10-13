import React, { useCallback, useMemo, useRef, useState } from 'react';
import { CanvasContext } from './context';
import type {
  CanvasContextValue,
  CanvasProviderProps,
  SelectionPreviewState,
} from './context';
import { usePasteMode } from '@/hooks/usePasteMode';
import { useFrameSynchronization } from '@/hooks/useFrameSynchronization';
import { calculateCellDimensions, calculateFontMetrics, DEFAULT_SPACING } from '@/utils/fontMetrics';

export const CanvasProvider: React.FC<CanvasProviderProps> = ({
  children,
  initialCellSize = 18,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [cellSize, setCellSize] = useState(initialCellSize);
  const [zoom, setZoom] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const [characterSpacing, setCharacterSpacing] = useState(DEFAULT_SPACING.characterSpacing);
  const [lineSpacing, setLineSpacing] = useState(DEFAULT_SPACING.lineSpacing);

  const fontMetrics = useMemo(() => calculateFontMetrics(cellSize), [cellSize]);

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

  const contextValue: CanvasContextValue = {
    cellSize,
    zoom,
    panOffset,
    characterSpacing,
    lineSpacing,
    fontSize: cellSize,
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
