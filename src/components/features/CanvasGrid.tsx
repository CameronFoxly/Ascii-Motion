import React, { useEffect, useRef } from 'react';
import { useToolStore } from '../../stores/toolStore';
import { useAnimationStore } from '../../stores/animationStore';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { useCanvasState } from '../../hooks/useCanvasState';
import { useCanvasMouseHandlers } from '../../hooks/useCanvasMouseHandlers';
import { useCanvasRenderer } from '../../hooks/useCanvasRenderer';
import { useToolBehavior } from '../../hooks/useToolBehavior';
import { ToolManager } from './ToolManager';
import { ToolStatusManager } from './ToolStatusManager';
import { CanvasActionButtons } from './CanvasActionButtons';

interface CanvasGridProps {
  className?: string;
}

export const CanvasGrid: React.FC<CanvasGridProps> = ({ className = '' }) => {
  // Use our new context and state management
  const { canvasRef, setMouseButtonDown, setShiftKeyDown, setSpaceKeyDown, spaceKeyDown } = useCanvasContext();
  
  // Get active tool and tool behavior
  const { activeTool, textToolState, isPlaybackMode } = useToolStore();
  const { isPlaying } = useAnimationStore();
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

  const { 
    selection, 
    lassoSelection, 
    magicWandSelection, 
    clearSelection, 
    clearLassoSelection, 
    clearMagicWandSelection 
  } = useToolStore();

  // Handle keyboard events for Escape and Shift keys
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Shift key for aspect ratio locking
      if (event.key === 'Shift') {
        setShiftKeyDown(true);
      }
      
      // Handle Space key for temporary hand tool
      // Don't override space key if text tool is actively typing
      if ((event.key === ' ' || event.code === 'Space') && !textToolState.isTyping) {
        event.preventDefault(); // Prevent page scrolling
        setSpaceKeyDown(true);
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
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      // Handle Shift key release
      if (event.key === 'Shift') {
        setShiftKeyDown(false);
        // Clear line preview when shift is released
        const { clearLinePreview } = useToolStore.getState();
        clearLinePreview();
      }
      
      // Handle Space key release
      // Only handle space release if we were handling space press (text tool not typing)
      if ((event.key === ' ' || event.code === 'Space') && !textToolState.isTyping) {
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
    <div className={`canvas-grid-container ${className} h-full flex flex-col relative`}>
      {/* Tool Manager - handles tool-specific behavior */}
      <ToolManager />
      
      <div className={`canvas-wrapper border rounded-lg overflow-auto flex-1 ${
        isPlaying 
          ? 'border-white border-2' 
          : isPlaybackMode 
            ? 'border-orange-500 border-2'
            : 'border-border border'
      }`}>
        <canvas
          ref={canvasRef}
          className={`canvas-grid ${getToolCursor(effectiveTool)}`}
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
      </div>
      
      {/* Action buttons and status info positioned outside canvas */}
      <div className="mt-2 flex justify-between items-center">
        <CanvasActionButtons />
        <ToolStatusManager />
      </div>
    </div>
  );
};
