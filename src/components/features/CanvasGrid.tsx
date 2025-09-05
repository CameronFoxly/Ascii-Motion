import React, { useEffect, useRef } from 'react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useToolStore } from '../../stores/toolStore';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { useCanvasState } from '../../hooks/useCanvasState';
import { useCanvasMouseHandlers } from '../../hooks/useCanvasMouseHandlers';
import { useCanvasRenderer } from '../../hooks/useCanvasRenderer';
import { useToolBehavior } from '../../hooks/useToolBehavior';
import { ToolManager } from './ToolManager';
import { ToolStatusManager } from './ToolStatusManager';

interface CanvasGridProps {
  className?: string;
}

export const CanvasGrid: React.FC<CanvasGridProps> = ({ className = '' }) => {
  // Use our new context and state management
  const { canvasRef, setMouseButtonDown, setShiftKeyDown, setSpaceKeyDown, spaceKeyDown } = useCanvasContext();
  
  // Get active tool and tool behavior
  const { activeTool } = useToolStore();
  const { getToolCursor } = useToolBehavior();
  
  // Track previous tool for cleanup on tool changes
  const prevToolRef = useRef(activeTool);
  
  // Calculate effective tool (space key overrides with hand tool)
  const effectiveTool = spaceKeyDown ? 'hand' : activeTool;
  
  // Canvas dimensions hooks already provide computed values
  const {
    moveState,
    commitMove,
    cancelMove,
    setSelectionMode,
    setMoveState,
    setPendingSelectionStart,
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

  const { width, height } = useCanvasStore();
  const { selection, lassoSelection, clearSelection, clearLassoSelection } = useToolStore();

  // Handle keyboard events for Escape and Shift keys
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Shift key for aspect ratio locking
      if (event.key === 'Shift') {
        setShiftKeyDown(true);
      }
      
      // Handle Space key for temporary hand tool
      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault(); // Prevent page scrolling
        setSpaceKeyDown(true);
      }
      
      // Handle Escape key for canceling moves and clearing selections
      if (event.key === 'Escape') {
        if ((selection.active && activeTool === 'select') || (lassoSelection.active && activeTool === 'lasso')) {
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
        }
      }
      
      // Handle Enter key for committing moves
      if (event.key === 'Enter' && moveState && (activeTool === 'select' || activeTool === 'lasso')) {
        event.preventDefault();
        event.stopPropagation();
        commitMove();
        
        // Clear the appropriate selection based on active tool
        if (activeTool === 'select') {
          clearSelection();
        } else if (activeTool === 'lasso') {
          clearLassoSelection();
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      // Handle Shift key release
      if (event.key === 'Shift') {
        setShiftKeyDown(false);
      }
      
      // Handle Space key release
      if (event.key === ' ' || event.code === 'Space') {
        setSpaceKeyDown(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [moveState, activeTool, commitMove, cancelMove]);

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
    <div className={`canvas-grid-container ${className}`}>
      {/* Tool Manager - handles tool-specific behavior */}
      <ToolManager />
      
      <div className="canvas-wrapper border-2 border-gray-300 rounded-lg overflow-auto max-w-full max-h-96 relative">
        <canvas
          ref={canvasRef}
          className={`canvas-grid ${getToolCursor(effectiveTool)}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onContextMenu={handleContextMenu}
          style={{
            imageRendering: 'pixelated',
            display: 'block',
            minWidth: 'fit-content',
            minHeight: 'fit-content'
          }}
        />
      </div>
      
      {/* Canvas info */}
      <div className="mt-2 text-sm text-gray-600 flex justify-between">
        <span>Grid: {width} × {height}</span>
        <ToolStatusManager />
      </div>
    </div>
  );
};
