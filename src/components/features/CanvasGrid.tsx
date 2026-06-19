import React, { useEffect, useRef, useCallback } from 'react';
import { useToolStore } from '../../stores/toolStore';
import { useCanvasStore } from '../../stores/canvasStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { useCanvasState } from '../../hooks/useCanvasState';
import { useCanvasMouseHandlers } from '../../hooks/useCanvasMouseHandlers';
import { useCanvasRenderer } from '../../hooks/useCanvasRenderer';
import { useToolBehavior } from '../../hooks/useToolBehavior';
import { useBezierStore } from '../../stores/bezierStore';
import { useHoverPreview } from '../../hooks/useHoverPreview';
import { ToolManager } from './ToolManager';
import { ToolStatusManager } from './ToolStatusManager';
import { ZoomControls } from './ZoomControls';
import { CanvasOverlay } from './CanvasOverlay';
import { usePostEffectsRenderer } from '../../hooks/usePostEffectsRenderer';
import { PlaybackStatusBar } from './PlaybackStatusBar';
import type { Cell, Tool } from '../../types';
import { screenToLocal } from '../../utils/layerTransformUtils';
import { compositeLayersAtFrame } from '../../utils/layerCompositing';

interface CanvasGridProps {
  className?: string;
}

export const CanvasGrid: React.FC<CanvasGridProps> = ({ className = '' }) => {
  // Use our new context and state management
  const { canvasRef, setMouseButtonDown, setShiftKeyDown, setAltKeyDown, altKeyDown, setCtrlKeyDown, ctrlKeyDown, cellWidth, cellHeight, zoom, panOffset } = useCanvasContext();
  
  // Get active tool and tool behavior
  // PERF FIX: Use targeted selectors instead of broad useToolStore().
  // Previously had TWO broad useToolStore() calls causing entire grid re-render
  // on any tool state change (brush size, color, fill mode, etc.).
  const activeTool = useToolStore((s) => s.activeTool);
  const textToolState = useToolStore((s) => s.textToolState);
  const isPlaybackMode = useToolStore((s) => s.isPlaybackMode);
  const isPlaying = useTimelineStore((s) => s.view.isPlaying);
  const { getToolCursor } = useToolBehavior();
  
  // Track previous tool for cleanup on tool changes
  const prevToolRef = useRef(activeTool);
  
  // Calculate effective tool (Alt key overrides with eyedropper for drawing tools, except gradientfill)
  // Ctrl key overrides pencil with eraser
  const drawingTools: Tool[] = ['pencil', 'eraser', 'paintbucket', 'rectangle', 'ellipse'];
  const shouldAllowEyedropperOverride = drawingTools.includes(activeTool);
  
  let effectiveTool = activeTool;
  if (ctrlKeyDown && activeTool === 'pencil') {
    effectiveTool = 'eraser';
  } else if (altKeyDown && shouldAllowEyedropperOverride) {
    effectiveTool = 'eyedropper';
  }
  
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

  // Post effects WebGL overlay renderer
  const { overlayRef, isActive: postEffectsActive } = usePostEffectsRenderer();
  
  // Enable hover preview for tools (brush outline, etc.)
  useHoverPreview();

  // PERF FIX: Use targeted selectors instead of second broad useToolStore() call.
  const selection = useToolStore((s) => s.selection);
  const lassoSelection = useToolStore((s) => s.lassoSelection);
  const magicWandSelection = useToolStore((s) => s.magicWandSelection);
  const clearSelection = useToolStore((s) => s.clearSelection);
  const clearLassoSelection = useToolStore((s) => s.clearLassoSelection);
  const clearMagicWandSelection = useToolStore((s) => s.clearMagicWandSelection);

  const buildMovePreviewState = useCallback((selectionCells: Set<string>, startPos: { x: number; y: number }) => {
    const { getCell, width, height } = useCanvasStore.getState();
    const { selectionAffectsAllLayers } = useToolStore.getState();

    let compositedForMove: Map<string, Cell> | null = null;
    if (selectionAffectsAllLayers) {
      const tl = useTimelineStore.getState();
      if (tl.layers.length > 0) {
        compositedForMove = compositeLayersAtFrame(
          tl.layers,
          tl.view.currentFrame,
          width,
          height,
          undefined,
          false,
          tl.layerGroups,
        );
      }
    }

    const originalData = new Map<string, Cell>();
    const originalPositions = new Set(selectionCells);

    selectionCells.forEach((cellKey) => {
      const [screenX, screenY] = cellKey.split(',').map(Number);
      const local = screenToLocal(screenX, screenY);
      const cell = compositedForMove
        ? compositedForMove.get(cellKey)
        : getCell(local.x, local.y);

      if (cell && cell.char !== ' ') {
        originalData.set(cellKey, cell);
      }
    });

    return {
      originalData,
      originalPositions,
      startPos,
      baseOffset: { x: 0, y: 0 },
    };
  }, []);

  // Handle arrow movement for rectangular selection
  const handleRectangularSelectionArrowMovement = useCallback((arrowOffset: { x: number; y: number }) => {
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
      const startX = Math.min(selection.start.x, selection.end.x);
      const startY = Math.min(selection.start.y, selection.end.y);
      const movePreviewState = buildMovePreviewState(selection.selectedCells, { x: startX, y: startY });
      
      setMoveState({
        ...movePreviewState,
        currentOffset: arrowOffset // Start with the arrow offset
      });
      setSelectionMode('moving');
    }
  }, [selection, moveState, setJustCommittedMove, setMoveState, setSelectionMode, buildMovePreviewState]);

  // Handle arrow movement for lasso selection
  const handleLassoSelectionArrowMovement = useCallback((arrowOffset: { x: number; y: number }) => {
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
      // Use center of selection as reference point
      const cellCoords = Array.from(lassoSelection.selectedCells).map(key => {
        const [x, y] = key.split(',').map(Number);
        return { x, y };
      });
      const centerX = Math.floor(cellCoords.reduce((sum, c) => sum + c.x, 0) / cellCoords.length);
      const centerY = Math.floor(cellCoords.reduce((sum, c) => sum + c.y, 0) / cellCoords.length);
      const movePreviewState = buildMovePreviewState(lassoSelection.selectedCells, { x: centerX, y: centerY });
      
      setMoveState({
        ...movePreviewState,
        currentOffset: arrowOffset // Start with the arrow offset
      });
      setSelectionMode('moving');
    }
  }, [lassoSelection, moveState, setJustCommittedMove, setMoveState, setSelectionMode, buildMovePreviewState]);

  // Handle arrow movement for magic wand selection
  const handleMagicWandSelectionArrowMovement = useCallback((arrowOffset: { x: number; y: number }) => {
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
      // Use center of selection as reference point
      const cellCoords = Array.from(magicWandSelection.selectedCells).map(key => {
        const [x, y] = key.split(',').map(Number);
        return { x, y };
      });
      const centerX = Math.floor(cellCoords.reduce((sum, c) => sum + c.x, 0) / cellCoords.length);
      const centerY = Math.floor(cellCoords.reduce((sum, c) => sum + c.y, 0) / cellCoords.length);
      const movePreviewState = buildMovePreviewState(magicWandSelection.selectedCells, { x: centerX, y: centerY });
      
      setMoveState({
        ...movePreviewState,
        currentOffset: arrowOffset // Start with the arrow offset
      });
      setSelectionMode('moving');
    }
  }, [magicWandSelection, moveState, setJustCommittedMove, setMoveState, setSelectionMode, buildMovePreviewState]);

  // Handle keyboard events for Escape and Shift keys
  useEffect(() => {
    const handleArrowKeyMovement = (arrowOffset: { x: number; y: number }) => {
      if (activeTool === 'select' && selection.active) {
        handleRectangularSelectionArrowMovement(arrowOffset);
      } else if (activeTool === 'lasso' && lassoSelection.active) {
        handleLassoSelectionArrowMovement(arrowOffset);
      } else if (activeTool === 'magicwand' && magicWandSelection.active) {
        handleMagicWandSelectionArrowMovement(arrowOffset);
      }
    };

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
      
      // Handle Ctrl/Meta key for temporary eraser tool (only for pencil)
      if ((event.key === 'Control' || event.key === 'Meta') && activeTool === 'pencil') {
        event.preventDefault();
        setCtrlKeyDown(true);
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
      
      // Handle Ctrl/Meta key release
      if (event.key === 'Control' || event.key === 'Meta') {
        setCtrlKeyDown(false);
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
    clearSelection,
    clearLassoSelection,
    clearMagicWandSelection,
    textToolState.isTyping,
    shouldAllowEyedropperOverride,
    setShiftKeyDown,
    setAltKeyDown,
    setCtrlKeyDown,
    handleRectangularSelectionArrowMovement,
    handleLassoSelectionArrowMovement,
    handleMagicWandSelectionArrowMovement
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

  // Fallback handler: if Bezier overlay fails to capture the initial click after commit/cancel,
  // allow starting a new shape directly from the base canvas. This ensures seamless cycles.
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'beziershape') {
      const { anchorPoints, isDrawing, addAnchorPoint } = useBezierStore.getState();
      if (!isDrawing && anchorPoints.length === 0 && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const pixelX = e.clientX - rect.left;
        const pixelY = e.clientY - rect.top;
  const effectiveCellWidth = cellWidth * zoom;
  const effectiveCellHeight = cellHeight * zoom;
  const pan = panOffset;
        const gridX = (pixelX - pan.x - effectiveCellWidth / 2) / effectiveCellWidth;
        const gridY = (pixelY - pan.y - effectiveCellHeight / 2) / effectiveCellHeight;
        addAnchorPoint(gridX, gridY, false);
        // Prevent default canvas handler so we don't trigger unrelated logic
        return;
      }
    }
    // Delegate to existing canvas mouse handlers for all other cases
    handleMouseDown(e);
  }, [activeTool, handleMouseDown, canvasRef, cellWidth, cellHeight, zoom, panOffset]);

  return (
    <div className={`canvas-grid-container ${className} h-full flex flex-col relative`}>
      {/* Tool Manager - handles tool-specific behavior */}
      <ToolManager />
      
      <div className={`canvas-wrapper border rounded-lg overflow-auto flex-1 relative ${
        isPlaying 
          ? 'border-purple-400/60 border-2' 
          : isPlaybackMode 
            ? 'border-orange-500 border-2'
            : 'border-border border'
      }`}>
        <canvas
          ref={canvasRef}
          className={`canvas-grid border border-border ${getToolCursor(effectiveTool)}`}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onContextMenu={handleContextMenu}
          style={{
            display: 'block'
            // Width and height are set by canvas resize logic in useCanvasRenderer
          }}
        />
        {/* WebGL post-effects overlay canvas — sized to match main canvas via hook */}
        {postEffectsActive && (
          <canvas
            ref={overlayRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
              display: 'block',
            }}
          />
        )}
        <CanvasOverlay />
      </div>
      
      {/* Zoom controls and status info positioned outside canvas */}
      <div className="mt-2 mb-2 flex justify-between items-center gap-4">
        <ZoomControls />
        {isPlaying ? <PlaybackStatusBar /> : <ToolStatusManager />}
      </div>
    </div>
  );
};
