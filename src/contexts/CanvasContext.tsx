import React, { createContext, useContext, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Cell } from '../types';

// Canvas-specific state that doesn't belong in global stores
interface CanvasState {
  // Canvas display settings
  cellSize: number;
  
  // Interaction state
  isDrawing: boolean;
  mouseButtonDown: boolean;
  
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
}

interface CanvasActions {
  // Canvas settings
  setCellSize: (size: number) => void;
  
  // Interaction actions
  setIsDrawing: (drawing: boolean) => void;
  setMouseButtonDown: (down: boolean) => void;
  
  // Selection actions
  setSelectionMode: (mode: CanvasState['selectionMode']) => void;
  setPendingSelectionStart: (start: { x: number; y: number } | null) => void;
  setJustCommittedMove: (committed: boolean) => void;
  
  // Move/drag actions
  setMoveState: (state: CanvasState['moveState']) => void;
  
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
  
  // Interaction state
  const [isDrawing, setIsDrawing] = useState(false);
  const [mouseButtonDown, setMouseButtonDown] = useState(false);
  
  // Selection state
  const [selectionMode, setSelectionMode] = useState<CanvasState['selectionMode']>('none');
  const [pendingSelectionStart, setPendingSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [justCommittedMove, setJustCommittedMove] = useState(false);
  
  // Move/drag state
  const [moveState, setMoveState] = useState<CanvasState['moveState']>(null);

  const contextValue: CanvasContextValue = {
    // State
    cellSize,
    isDrawing,
    mouseButtonDown,
    selectionMode,
    pendingSelectionStart,
    justCommittedMove,
    moveState,
    
    // Actions
    setCellSize,
    setIsDrawing,
    setMouseButtonDown,
    setSelectionMode,
    setPendingSelectionStart,
    setJustCommittedMove,
    setMoveState,
    
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
  const { cellSize } = useCanvasContext();
  
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
      const relativeX = mouseX - canvasRect.left;
      const relativeY = mouseY - canvasRect.top;
      
      const x = Math.floor(relativeX / cellSize);
      const y = Math.floor(relativeY / cellSize);
      
      return {
        x: Math.max(0, Math.min(x, gridWidth - 1)),
        y: Math.max(0, Math.min(y, gridHeight - 1)),
      };
    },
  };
};
