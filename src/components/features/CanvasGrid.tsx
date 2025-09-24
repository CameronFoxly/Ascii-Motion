import React, { useEffect, useRef } from 'react';
import { useToolStore } from '../../stores/toolStore';
import { useCanvasStore } from '../../stores/canvasStore';
import { useAnimationStore } from '../../stores/animationStore';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { useCanvasState } from '../../hooks/useCanvasState';
import { useCanvasMouseHandlers } from '../../hooks/useCanvasMouseHandlers';
import { useCanvasRenderer } from '../../hooks/useCanvasRenderer';
import { useToolBehavior } from '../../hooks/useToolBehavior';
import { ToolManager } from './ToolManager';
import { ToolStatusManager } from './ToolStatusManager';
import { CanvasActionButtons } from './CanvasActionButtons';
import { CanvasOverlay } from './CanvasOverlay';

interface CanvasGridProps {
  className?: string;
}

export const CanvasGrid: React.FC<CanvasGridProps> = ({ className = '' }) => {
  // Use our new context and state management
  const { canvasRef, setMouseButtonDown, setShiftKeyDown, setAltKeyDown, altKeyDown } = useCanvasContext();
  
  // Get active tool and tool behavior
  const { activeTool, textToolState, isPlaybackMode } = useToolStore();
  const { isPlaying } = useAnimationStore();
  const { getToolCursor } = useToolBehavior();
  
  // Track previous tool for cleanup on tool changes
  const prevToolRef = useRef(activeTool);
  
  // Calculate effective tool (Alt key overrides with eyedropper for drawing tools)
  const drawingTools = ['pencil', 'eraser', 'paintbucket', 'gradientfill', 'rectangle', 'ellipse'] as const;
  const shouldAllowEyedropperOverride = drawingTools.includes(activeTool as any);
  
  const effectiveTool = (altKeyDown && shouldAllowEyedropperOverride) ? 'eyedropper' : activeTool;
  
  // Canvas dimensions hooks already provide computed values
  const {
    moveState,
    commitMove,
    cancelMove,
    setSelectionMode,
    setMoveState,
    setPendingSelectionStart,
    setJustCommittedMove,
  } = useCanvasState();

  // Use our new mouse handlers
  const {
    handleMouseDown,
    handleMouseMove, 
    handleMouseUp,
    handleMouseLeave,
    handleContextMenu
  } = useCanvasMouseHandlers();

  // Use the new renderer hook that handles both grid and overlay rendering
  useCanvasRenderer();

  const { 
    selection, 
    lassoSelection, 
    magicWandSelection, 
    clearSelection, 
    clearLassoSelection, 
    clearMagicWandSelection 
  } = useToolStore();

  // Handle arrow key movement for selections
  const handleArrowKeyMovement = (arrowOffset: { x: number; y: number }) => {
    // Determine which selection is active and handle accordingly
    if (activeTool === 'select' && selection.active) {
      handleRectangularSelectionArrowMovement(arrowOffset);
    } else if (activeTool === 'lasso' && lassoSelection.active) {
      handleLassoSelectionArrowMovement(arrowOffset);
    } else if (activeTool === 'magicwand' && magicWandSelection.active) {
      handleMagicWandSelectionArrowMovement(arrowOffset);
    }
  };

  // Handle arrow movement for rectangular selection
  const handleRectangularSelectionArrowMovement = (arrowOffset: { x: number; y: number }) => {
    if (!selection.active) return;

    // Ensure we're not blocked by justCommittedMove state
    setJustCommittedMove(false);

    if (moveState) {
      // Already in move mode - update the current offset
      setMoveState({
        ...moveState,
        currentOffset: {
          x: moveState.currentOffset.x + arrowOffset.x,
          y: moveState.currentOffset.y + arrowOffset.y
        }
      });
    } else {
      // Enter move mode for the first time
      const { getCell } = useCanvasStore.getState();
      const startX = Math.min(selection.start.x, selection.end.x);
      const endX = Math.max(selection.start.x, selection.end.x);
      const startY = Math.min(selection.start.y, selection.end.y);
      const endY = Math.max(selection.start.y, selection.end.y);
      
      // Store only the non-empty cells from the selection
      const originalData = new Map();
      for (let cy = startY; cy <= endY; cy++) {
        for (let cx = startX; cx <= endX; cx++) {
          const cell = getCell(cx, cy);
          // Only store non-empty cells (not spaces or empty cells)
          if (cell && cell.char !== ' ') {
            originalData.set(`${cx},${cy}`, cell);
          }
        }
      }
      
      setMoveState({
        originalData,
        startPos: { x: startX, y: startY }, // Use selection start as reference point
        baseOffset: { x: 0, y: 0 },
        currentOffset: arrowOffset // Start with the arrow offset
      });
      setSelectionMode('moving');
    }
  };

  // Handle arrow movement for lasso selection
  const handleLassoSelectionArrowMovement = (arrowOffset: { x: number; y: number }) => {
    if (!lassoSelection.active) return;

    // Ensure we're not blocked by justCommittedMove state
    setJustCommittedMove(false);

    if (moveState) {
      // Already in move mode - update the current offset
      setMoveState({
        ...moveState,
        currentOffset: {
          x: moveState.currentOffset.x + arrowOffset.x,
          y: moveState.currentOffset.y + arrowOffset.y
        }
      });
    } else {
      // Enter move mode for the first time
      const { getCell } = useCanvasStore.getState();
      
      // Store only the non-empty cells from the lasso selection
      const originalData = new Map();
      lassoSelection.selectedCells.forEach((cellKey) => {
        const [cx, cy] = cellKey.split(',').map(Number);
        const cell = getCell(cx, cy);
        // Only store non-empty cells (not spaces or empty cells)
        if (cell && cell.char !== ' ') {
          originalData.set(cellKey, cell);
        }
      });
      
      // Use center of selection as reference point
      const cellCoords = Array.from(lassoSelection.selectedCells).map(key => {
        const [x, y] = key.split(',').map(Number);
        return { x, y };
      });
      const centerX = Math.floor(cellCoords.reduce((sum, c) => sum + c.x, 0) / cellCoords.length);
      const centerY = Math.floor(cellCoords.reduce((sum, c) => sum + c.y, 0) / cellCoords.length);
      
      setMoveState({
        originalData,
        startPos: { x: centerX, y: centerY }, // Use selection center as reference point
        baseOffset: { x: 0, y: 0 },
        currentOffset: arrowOffset // Start with the arrow offset
      });
      setSelectionMode('moving');
    }
  };

  // Handle arrow movement for magic wand selection
  const handleMagicWandSelectionArrowMovement = (arrowOffset: { x: number; y: number }) => {
    if (!magicWandSelection.active) return;

    // Ensure we're not blocked by justCommittedMove state
    setJustCommittedMove(false);

    if (moveState) {
      // Already in move mode - update the current offset
      setMoveState({
        ...moveState,
        currentOffset: {
          x: moveState.currentOffset.x + arrowOffset.x,
          y: moveState.currentOffset.y + arrowOffset.y
        }
      });
    } else {
      // Enter move mode for the first time
      const { getCell } = useCanvasStore.getState();
      
      // Store only the non-empty cells from the magic wand selection
      const originalData = new Map();
      magicWandSelection.selectedCells.forEach((cellKey) => {
        const [cx, cy] = cellKey.split(',').map(Number);
        const cell = getCell(cx, cy);
        // Only store non-empty cells (not spaces or empty cells)
        if (cell && cell.char !== ' ') {
          originalData.set(cellKey, cell);
        }
      });
      
      // Use center of selection as reference point
      const cellCoords = Array.from(magicWandSelection.selectedCells).map(key => {
        const [x, y] = key.split(',').map(Number);
        return { x, y };
      });
      const centerX = Math.floor(cellCoords.reduce((sum, c) => sum + c.x, 0) / cellCoords.length);
      const centerY = Math.floor(cellCoords.reduce((sum, c) => sum + c.y, 0) / cellCoords.length);
      
      setMoveState({
        originalData,
        startPos: { x: centerX, y: centerY }, // Use selection center as reference point
        baseOffset: { x: 0, y: 0 },
        currentOffset: arrowOffset // Start with the arrow offset
      });
      setSelectionMode('moving');
    }
  };

  // Handle keyboard events for Escape and Shift keys
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Shift key for aspect ratio locking
      if (event.key === 'Shift') {
        setShiftKeyDown(true);
      }
      
      // Handle Alt key for temporary eyedropper tool (only for drawing tools)
      // Don't override Alt key if text tool is actively typing
      if (event.key === 'Alt' && shouldAllowEyedropperOverride) {
        event.preventDefault(); // Prevent browser menu activation
        setAltKeyDown(true);
      }
      
      // Handle Escape key for canceling moves and clearing selections
      if (event.key === 'Escape') {
        if ((selection.active && activeTool === 'select') || 
            (lassoSelection.active && activeTool === 'lasso') ||
            (magicWandSelection.active && activeTool === 'magicwand')) {
          event.preventDefault();
          event.stopPropagation();
          
          if (moveState) {
            // Cancel move without committing changes
            cancelMove();
          }
          
          // Clear the appropriate selection
          if (selection.active) {
            clearSelection();
          }
          if (lassoSelection.active) {
            clearLassoSelection();
          }
          if (magicWandSelection.active) {
            clearMagicWandSelection();
          }
        }
      }
      
      // Handle Enter key for committing moves
      if (event.key === 'Enter' && moveState && (activeTool === 'select' || activeTool === 'lasso' || activeTool === 'magicwand')) {
        event.preventDefault();
        event.stopPropagation();
        commitMove();
        
        // Clear the appropriate selection based on active tool
        if (activeTool === 'select') {
          clearSelection();
        } else if (activeTool === 'lasso') {
          clearLassoSelection();
        } else if (activeTool === 'magicwand') {
          clearMagicWandSelection();
        }
      }
      
      // Handle arrow keys for selection movement
      if ((event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        // Only handle arrow keys when a selection tool is active and has an active selection
        if ((activeTool === 'select' && selection.active) || 
            (activeTool === 'lasso' && lassoSelection.active) ||
            (activeTool === 'magicwand' && magicWandSelection.active)) {
          event.preventDefault();
          event.stopPropagation();
          
          // Calculate arrow direction offset
          const arrowOffset = {
            x: event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0,
            y: event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0
          };
          
          // Call the new arrow movement handler
          handleArrowKeyMovement(arrowOffset);
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      // Handle Shift key release
      if (event.key === 'Shift') {
        setShiftKeyDown(false);
        // Clear line preview when shift is released
        const { clearLinePreview } = useToolStore.getState();
        clearLinePreview();
      }
      
      // Handle Alt key release
      if (event.key === 'Alt') {
        setAltKeyDown(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    moveState, 
    activeTool, 
    commitMove, 
    cancelMove, 
    selection.active,
    lassoSelection.active, 
    magicWandSelection.active,
    handleArrowKeyMovement,
    clearSelection,
    clearLassoSelection,
    clearMagicWandSelection,
    textToolState.isTyping,
    shouldAllowEyedropperOverride
  ]);

  // Reset selection mode when tool changes
  useEffect(() => {
    const prevTool = prevToolRef.current;
    
    // If tool actually changed, handle cleanup
    if (prevTool !== activeTool) {
      // Always commit any pending move when switching tools
      if (moveState) {
        commitMove();
      }
      
      // Clear selection-related state when switching away from selection tools
      if (activeTool !== 'select' && activeTool !== 'lasso') {
        setSelectionMode('none');
        setMouseButtonDown(false);
        setPendingSelectionStart(null);
        setMoveState(null);
      }
      
      // Update the ref for next time
      prevToolRef.current = activeTool;
    }
  }, [activeTool, moveState, commitMove, setSelectionMode, setMouseButtonDown, setPendingSelectionStart, setMoveState]);

  return (
    <div className={`canvas-grid-container ${className} h-full flex flex-col relative`}>
      {/* Tool Manager - handles tool-specific behavior */}
      <ToolManager />
      
      <div className={`canvas-wrapper border rounded-lg overflow-auto flex-1 relative ${
        isPlaying 
          ? 'border-white border-2' 
          : isPlaybackMode 
            ? 'border-orange-500 border-2'
            : 'border-border border'
      }`}>
        <canvas
          ref={canvasRef}
          className={`canvas-grid border border-border ${getToolCursor(effectiveTool)}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onContextMenu={handleContextMenu}
          style={{
            display: 'block'
            // Width and height are set by canvas resize logic in useCanvasRenderer
          }}
        />
        <CanvasOverlay />
      </div>
      
      {/* Action buttons and status info positioned outside canvas */}
      <div className="my-2 flex justify-between items-center">
        <CanvasActionButtons />
        <ToolStatusManager />
      </div>
    </div>
  );
};
