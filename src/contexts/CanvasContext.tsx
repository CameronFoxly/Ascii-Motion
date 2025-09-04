import React, { createContext, useContext, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Cell } from '../types';
import { usePasteMode } from '../hooks/usePasteMode';
import type { PasteModeState } from '../hooks/usePasteMode';

// Canvas-specific state that doesn't belong in global stores
interface CanvasState {
  // Canvas display settings
  cellSize: number;
  zoom: number; // 0.25 to 4.0 (25% to 400%)
  panOffset: { x: number; y: number };
  
  // Interaction state
  isDrawing: boolean;
  mouseButtonDown: boolean;
  shiftKeyDown: boolean;
  spaceKeyDown: boolean;
  
  // Selection state
  selectionMode: 'none' | 'dragging' | 'moving';
  pendingSelectionStart: { x: number; y: number } | null;
  justCommittedMove: boolean;
  
  // Move/drag state
  moveState: {
    originalData: Map<string, Cell>;
    startPos: { x: number; y: number };
    baseOffset: { x: number; y: number };
    currentOffset: { x: number; y: number };
  } | null;
  
  // Paste mode state
  pasteMode: PasteModeState;
}

interface CanvasActions {
  // Canvas settings
  setCellSize: (size: number) => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  
  // Interaction actions
  setIsDrawing: (drawing: boolean) => void;
  setMouseButtonDown: (down: boolean) => void;
  setShiftKeyDown: (down: boolean) => void;
  setSpaceKeyDown: (down: boolean) => void;
  
  // Selection actions
  setSelectionMode: (mode: CanvasState['selectionMode']) => void;
  setPendingSelectionStart: (start: { x: number; y: number } | null) => void;
  setJustCommittedMove: (committed: boolean) => void;
  
  // Move/drag actions
  setMoveState: (state: CanvasState['moveState']) => void;
  
  // Paste mode actions
  startPasteMode: (position: { x: number; y: number }) => boolean;
  updatePastePosition: (position: { x: number; y: number }) => void;
  startPasteDrag: (clickPosition: { x: number; y: number }) => void;
  stopPasteDrag: () => void;
  cancelPasteMode: () => void;
  commitPaste: () => Map<string, any> | null;
  
  // Canvas ref
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

interface CanvasContextValue extends CanvasState, CanvasActions {}

const CanvasContext = createContext<CanvasContextValue | null>(null);

interface CanvasProviderProps {
  children: ReactNode;
  initialCellSize?: number;
}

export const CanvasProvider: React.FC<CanvasProviderProps> = ({ 
  children, 
  initialCellSize = 12 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Canvas display settings
  const [cellSize, setCellSize] = useState(initialCellSize);
  const [zoom, setZoom] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  
  // Interaction state
  const [isDrawing, setIsDrawing] = useState(false);
  const [mouseButtonDown, setMouseButtonDown] = useState(false);
  const [shiftKeyDown, setShiftKeyDown] = useState(false);
  const [spaceKeyDown, setSpaceKeyDown] = useState(false);
  
  // Selection state
  const [selectionMode, setSelectionMode] = useState<CanvasState['selectionMode']>('none');
  const [pendingSelectionStart, setPendingSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [justCommittedMove, setJustCommittedMove] = useState(false);
  
  // Move/drag state
  const [moveState, setMoveState] = useState<CanvasState['moveState']>(null);
  
  // Paste mode integration
  const {
    pasteMode,
    startPasteMode,
    updatePastePosition,
    startPasteDrag,
    stopPasteDrag,
    cancelPasteMode,
    commitPaste
  } = usePasteMode();

  const contextValue: CanvasContextValue = {
    // State
    cellSize,
    zoom,
    panOffset,
    isDrawing,
    mouseButtonDown,
    shiftKeyDown,
    spaceKeyDown,
    selectionMode,
    pendingSelectionStart,
    justCommittedMove,
    moveState,
    pasteMode,
    
    // Actions
    setCellSize,
    setZoom,
    setPanOffset,
    setIsDrawing,
    setMouseButtonDown,
    setShiftKeyDown,
    setSpaceKeyDown,
    setSelectionMode,
    setPendingSelectionStart,
    setJustCommittedMove,
    setMoveState,
    startPasteMode,
    updatePastePosition,
    startPasteDrag,
    stopPasteDrag,
    cancelPasteMode,
    commitPaste,
    
    // Ref
    canvasRef,
  };

  return (
    <CanvasContext.Provider value={contextValue}>
      {children}
    </CanvasContext.Provider>
  );
};

export const useCanvasContext = (): CanvasContextValue => {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error('useCanvasContext must be used within a CanvasProvider');
  }
  return context;
};

// Helper hook for canvas dimensions calculations
export const useCanvasDimensions = () => {
  const { cellSize, zoom, panOffset } = useCanvasContext();
  
  return {
    cellSize,
    getCanvasSize: (gridWidth: number, gridHeight: number) => ({
      width: gridWidth * cellSize,
      height: gridHeight * cellSize,
    }),
    getGridCoordinates: (
      mouseX: number, 
      mouseY: number, 
      canvasRect: DOMRect,
      gridWidth: number,
      gridHeight: number
    ) => {
      // Get relative position within canvas
      const relativeX = mouseX - canvasRect.left;
      const relativeY = mouseY - canvasRect.top;
      
      // Account for pan offset - subtract pan offset to get actual grid position
      const adjustedX = relativeX - panOffset.x;
      const adjustedY = relativeY - panOffset.y;
      
      // Account for zoom - divide by zoomed cell size
      const effectiveCellSize = cellSize * zoom;
      const x = Math.floor(adjustedX / effectiveCellSize);
      const y = Math.floor(adjustedY / effectiveCellSize);
      
      return {
        x: Math.max(0, Math.min(x, gridWidth - 1)),
        y: Math.max(0, Math.min(y, gridHeight - 1)),
      };
    },
  };
};
