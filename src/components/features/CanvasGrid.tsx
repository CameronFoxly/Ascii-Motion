import React, { useEffect } from 'react';
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
  const { canvasRef, setMouseButtonDown, setShiftKeyDown } = useCanvasContext();
  
  // Get active tool and tool behavior
  const { activeTool } = useToolStore();
  const { getToolCursor } = useToolBehavior();
  
  // Canvas dimensions hooks already provide computed values
  const {
    moveState,
    commitMove,
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
  const { selection, clearSelection } = useToolStore();

  // Handle keyboard events for Escape and Shift keys
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Shift key for aspect ratio locking
      if (event.key === 'Shift') {
        setShiftKeyDown(true);
      }
      
      // Handle Escape key for committing moves and clearing selections
      if (event.key === 'Escape' && selection.active && activeTool === 'select') {
        event.preventDefault();
        event.stopPropagation();
        
        if (moveState) {
          // Commit move first, then clear selection
          commitMove();
        }
        clearSelection();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      // Handle Shift key release
      if (event.key === 'Shift') {
        setShiftKeyDown(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [moveState, selection.active, activeTool, commitMove, clearSelection, setShiftKeyDown]);

  // Reset selection mode when tool changes
  useEffect(() => {
    if (activeTool !== 'select') {
      // Commit any pending move before clearing
      if (moveState) {
        commitMove();
      }
      setSelectionMode('none');
      setMouseButtonDown(false);
      setPendingSelectionStart(null);
      setMoveState(null);
    }
  }, [activeTool, moveState, commitMove]);

  return (
    <div className={`canvas-grid-container ${className}`}>
      {/* Tool Manager - handles tool-specific behavior */}
      <ToolManager />
      
      <div className="canvas-wrapper border-2 border-gray-300 rounded-lg overflow-auto max-h-96">
        <canvas
          ref={canvasRef}
          className={`canvas-grid ${getToolCursor(activeTool)}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onContextMenu={handleContextMenu}
          style={{
            imageRendering: 'pixelated',
            background: '#FFFFFF'
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
