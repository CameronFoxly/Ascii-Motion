import { createContext } from 'react';
import type { ReactNode } from 'react';
import type { Cell } from '@/types';
import type { PasteModeState } from '@/hooks/usePasteMode';
import type { FontMetrics } from '@/utils/fontMetrics';

export interface SelectionPreviewState {
  active: boolean;
  modifier: 'replace' | 'add' | 'subtract';
  tool: 'select' | 'lasso' | 'magicwand' | null;
  baseCells: string[];
  gestureCells: string[];
}

export interface CanvasState {
  cellSize: number;
  zoom: number;
  panOffset: { x: number; y: number };

  characterSpacing: number;
  lineSpacing: number;
  fontSize: number;
  selectedFontId: string;
  actualFont: string | null; // Detected font actually being rendered
  isFontDetecting: boolean; // Loading state for font detection
  isFontLoading: boolean; // Loading state for bundled font download
  fontLoadError: string | null; // Error message if font loading fails

  fontMetrics: FontMetrics;
  cellWidth: number;
  cellHeight: number;

  isDrawing: boolean;
  mouseButtonDown: boolean;
  shiftKeyDown: boolean;
  altKeyDown: boolean;

  selectionMode: 'none' | 'dragging' | 'moving';
  pendingSelectionStart: { x: number; y: number } | null;
  justCommittedMove: boolean;

  hoveredCell: { x: number; y: number } | null;
  hoverPreview: {
    active: boolean;
    mode: 'none' | 'brush' | 'eraser-brush' | 'rectangle' | 'ellipse' | 'line';
    cells: Array<{ x: number; y: number }>;
  };

  moveState: {
    originalData: Map<string, Cell>;
    originalPositions: Set<string>;
    startPos: { x: number; y: number };
    baseOffset: { x: number; y: number };
    currentOffset: { x: number; y: number };
  } | null;

  pasteMode: PasteModeState;
  selectionPreview: SelectionPreviewState;
}

export interface CanvasActions {
  setCellSize: (size: number) => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;

  setCharacterSpacing: (spacing: number) => void;
  setLineSpacing: (spacing: number) => void;
  setFontSize: (size: number) => void;
  setSelectedFontId: (fontId: string) => void;

  setIsDrawing: (drawing: boolean) => void;
  setMouseButtonDown: (down: boolean) => void;
  setShiftKeyDown: (down: boolean) => void;
  setAltKeyDown: (down: boolean) => void;

  setSelectionMode: (mode: CanvasState['selectionMode']) => void;
  setPendingSelectionStart: (start: { x: number; y: number } | null) => void;
  setJustCommittedMove: (committed: boolean) => void;

  setHoveredCell: (cell: { x: number; y: number } | null) => void;
  setHoverPreview: (preview: {
    active: boolean;
    mode: 'none' | 'brush' | 'eraser-brush' | 'rectangle' | 'ellipse' | 'line';
    cells: Array<{ x: number; y: number }>;
  }) => void;

  setMoveState: (state: CanvasState['moveState']) => void;

  startPasteMode: (position: { x: number; y: number }) => boolean;
  updatePastePosition: (position: { x: number; y: number }) => void;
  startPasteDrag: (clickPosition: { x: number; y: number }) => void;
  stopPasteDrag: () => void;
  cancelPasteMode: () => void;
  commitPaste: () => Map<string, Cell> | null;

  canvasRef: React.RefObject<HTMLCanvasElement | null>;

  setSelectionPreview: (preview: SelectionPreviewState) => void;
}

export type CanvasContextValue = CanvasState & CanvasActions;

export interface CanvasProviderProps {
  children: ReactNode;
  initialCellSize?: number;
}

export const CanvasContext = createContext<CanvasContextValue | null>(null);
