import React, { useEffect } from 'react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useToolStore } from '../../stores/toolStore';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { useCanvasState } from '../../hooks/useCanvasState';
import { useCanvasMouseHandlers } from '../../hooks/useCanvasMouseHandlers';
import { useCanvasRenderer } from '../../hooks/useCanvasRenderer';

interface CanvasGridProps {
  className?: string;
}

export const CanvasGrid: React.FC<CanvasGridProps> = ({ className = '' }) => {
  // Use our new context and state management
  const { canvasRef, setMouseButtonDown } = useCanvasContext();
  
  // Get active tool
  const { activeTool } = useToolStore();
  
  // Canvas dimensions hooks already provide computed values
  const {
    moveState,
    statusMessage,
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

  // Handle Escape key for committing moves and clearing selections
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [moveState, selection.active, activeTool, commitMove, clearSelection]);

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
      <div className="canvas-wrapper border-2 border-gray-300 rounded-lg overflow-auto max-h-96">
        <canvas
          ref={canvasRef}
          className={`canvas-grid ${
            activeTool === 'select' 
              ? 'cursor-crosshair'
              : 'cursor-crosshair'
          }`}
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
        <span>{statusMessage}</span>
      </div>
    </div>
  );
};
