import { useCallback } from 'react';
import { useCanvasContext, useCanvasDimensions } from '../contexts/CanvasContext';
import { useToolStore } from '../stores/toolStore';
import { useCanvasStore } from '../stores/canvasStore';
import { useCanvasSelection } from './useCanvasSelection';
import { useCanvasLassoSelection } from './useCanvasLassoSelection';
import { useCanvasMagicWandSelection } from './useCanvasMagicWandSelection';
import { useCanvasDragAndDrop } from './useCanvasDragAndDrop';
import { useTextTool } from './useTextTool';
import { useCanvasState } from './useCanvasState';

export interface MouseHandlers {
  handleMouseDown: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseMove: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseUp: (event?: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseLeave: () => void;
  handleContextMenu: (event: React.MouseEvent<HTMLCanvasElement>) => void;
}

/**
 * Hook for canvas mouse event handling
 * Routes mouse events to appropriate tool handlers
 */
export const useCanvasMouseHandlers = (): MouseHandlers => {
  const { activeTool, clearSelection, clearLassoSelection, isPlaybackMode } = useToolStore();
  const { canvasRef, altKeyDown, setIsDrawing, setMouseButtonDown, setHoveredCell, pasteMode, updatePastePosition, startPasteDrag, stopPasteDrag, cancelPasteMode, commitPaste } = useCanvasContext();
  const { getGridCoordinates } = useCanvasDimensions();
  const { width, height, cells, setCanvasData } = useCanvasStore();
  const { moveState, commitMove, isPointInEffectiveSelection, selectionMode } = useCanvasState();
  
  // Import tool hooks
  const selectionHandlers = useCanvasSelection();
  const lassoSelectionHandlers = useCanvasLassoSelection();
  const magicWandSelectionHandlers = useCanvasMagicWandSelection();
  const dragAndDropHandlers = useCanvasDragAndDrop();
  const textToolHandlers = useTextTool();

  // Determine effective tool (Alt key overrides with eyedropper for drawing tools)
  const drawingTools = ['pencil', 'eraser', 'paintbucket', 'rectangle', 'ellipse'] as const;
  const shouldAllowEyedropperOverride = drawingTools.includes(activeTool as any);
  const effectiveTool = (altKeyDown && shouldAllowEyedropperOverride) ? 'eyedropper' : activeTool;

  // Utility to get grid coordinates from mouse event
  const getGridCoordinatesFromEvent = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    return getGridCoordinates(mouseX, mouseY, rect, width, height);
  }, [getGridCoordinates, width, height, canvasRef]);

  // Prevent context menu on right-click
  const handleContextMenu = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
  }, []);

  // Clean up on mouse leave
  const handleMouseLeave = useCallback(() => {
    setIsDrawing(false);
    setMouseButtonDown(false);
    setHoveredCell(null); // Clear hover state when mouse leaves canvas
    
    // Reset pencil position to prevent unwanted connecting lines
    const { setPencilLastPosition, clearLinePreview } = useToolStore.getState();
    setPencilLastPosition(null);
    clearLinePreview(); // Clear line preview when mouse leaves canvas
  }, [setIsDrawing, setMouseButtonDown, setHoveredCell]);

  // Route mouse down to appropriate tool handler based on effective tool
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Block mouse interactions during playback
    if (isPlaybackMode) {
      return;
    }

    // Handle paste mode interactions first
    if (pasteMode.isActive && pasteMode.preview) {
      const { x, y } = getGridCoordinatesFromEvent(event);
      
      if (event.button === 0) { // Left click
        // Check if click is inside the paste preview bounds
        const { position, bounds } = pasteMode.preview;
        const previewMinX = position.x + bounds.minX;
        const previewMaxX = position.x + bounds.maxX;
        const previewMinY = position.y + bounds.minY;
        const previewMaxY = position.y + bounds.maxY;
        
        const isInsidePreview = x >= previewMinX && x <= previewMaxX && 
                               y >= previewMinY && y <= previewMaxY;
        
        if (isInsidePreview) {
          // Start dragging the paste preview
          startPasteDrag({ x, y });
        } else {
          // Click outside preview commits the paste
          const pastedData = commitPaste();
          if (pastedData) {
            // Apply the paste to canvas
            const currentCells = new Map(cells);
            pastedData.forEach((cell, key) => {
              currentCells.set(key, cell);
            });
            setCanvasData(currentCells);
          }
        }
      } else if (event.button === 2) { // Right click  
        // Cancel paste mode
        event.preventDefault();
        cancelPasteMode();
      }
      return;
    }

    // Handle selection move mode interactions ONLY for existing move operations
    // (Don't interfere with clicks that start new move operations)
    if (moveState && (activeTool === 'select' || activeTool === 'lasso') && selectionMode === 'moving') {
      const { x, y } = getGridCoordinatesFromEvent(event);
      
      if (event.button === 0) { // Left click
        // Check if click is inside the selection being moved
        const isInsideSelection = activeTool === 'select' 
          ? isPointInEffectiveSelection(x, y)
          : lassoSelectionHandlers.isPointInLassoSelection(x, y);
          
        if (isInsideSelection) {
          // Click inside selection - let normal selection handler manage it
          // (This will continue the move operation)
        } else {
          // Click outside selection commits the move
          commitMove();
          if (activeTool === 'select') {
            clearSelection();
          } else {
            clearLassoSelection();
          }
          return;
        }
      }
    }

    // Normal tool handling when not in paste mode
    switch (effectiveTool) {
      case 'select':
        selectionHandlers.handleSelectionMouseDown(event);
        break;
      case 'lasso':
        lassoSelectionHandlers.handleLassoMouseDown(event);
        break;
      case 'magicwand':
        magicWandSelectionHandlers.handleMagicWandMouseDown(event);
        break;
      case 'rectangle':
        dragAndDropHandlers.handleRectangleMouseDown(event);
        break;
      case 'ellipse':
        dragAndDropHandlers.handleEllipseMouseDown(event);
        break;
      case 'text':
        const coords = getGridCoordinatesFromEvent(event);
        textToolHandlers.handleTextToolClick(coords.x, coords.y);
        break;
      default:
        // For basic drawing tools (pencil, eraser, eyedropper, paintbucket)
        dragAndDropHandlers.handleDrawingMouseDown(event, effectiveTool);
        break;
    }
  }, [isPlaybackMode, effectiveTool, activeTool, pasteMode, moveState, getGridCoordinatesFromEvent, startPasteDrag, cancelPasteMode, commitPaste, cells, setCanvasData, isPointInEffectiveSelection, commitMove, clearSelection, clearLassoSelection, selectionHandlers, lassoSelectionHandlers, dragAndDropHandlers]);

  // Route mouse move to appropriate tool handler
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Block mouse interactions during playback
    if (isPlaybackMode) {
      return;
    }

    // Update hovered cell for all tools
    const { x, y } = getGridCoordinatesFromEvent(event);
    setHoveredCell({ x, y });

    // Handle paste mode interactions first
    if (pasteMode.isActive) {
      // Only update position if we're currently dragging
      if (pasteMode.isDragging) {
        const { x, y } = getGridCoordinatesFromEvent(event);
        updatePastePosition({ x, y });
      }
      return;
    }

    // Normal tool handling when not in paste mode
    switch (effectiveTool) {
      case 'select':
        selectionHandlers.handleSelectionMouseMove(event);
        break;
      case 'lasso':
        lassoSelectionHandlers.handleLassoMouseMove(event);
        break;
      case 'magicwand':
        magicWandSelectionHandlers.handleMagicWandMouseMove(event);
        break;
      case 'rectangle':
        dragAndDropHandlers.handleRectangleMouseMove(event);
        break;
      case 'ellipse':
        dragAndDropHandlers.handleEllipseMouseMove(event);
        break;
      default:
        // For basic drawing tools (pencil, eraser, eyedropper, paintbucket)
        dragAndDropHandlers.handleDrawingMouseMove(event);
        break;
    }
  }, [isPlaybackMode, effectiveTool, pasteMode, getGridCoordinatesFromEvent, setHoveredCell, updatePastePosition, selectionHandlers, lassoSelectionHandlers, dragAndDropHandlers]);

  // Route mouse up to appropriate tool handler
  const handleMouseUp = useCallback((event?: React.MouseEvent<HTMLCanvasElement>) => {
    // Block mouse interactions during playback
    if (isPlaybackMode) {
      return;
    }

    // Handle paste mode
    if (pasteMode.isActive && pasteMode.isDragging) {
      stopPasteDrag();
      return;
    }

    // Normal tool handling when not in paste mode
    switch (activeTool) {
      case 'select':
        selectionHandlers.handleSelectionMouseUp();
        break;
      case 'lasso':
        lassoSelectionHandlers.handleLassoMouseUp();
        break;
      case 'magicwand':
        magicWandSelectionHandlers.handleMagicWandMouseUp();
        break;
        case 'rectangle':
          dragAndDropHandlers.handleRectangleMouseUp();
          break;
        case 'ellipse':
          dragAndDropHandlers.handleEllipseMouseUp();
          break;
        default:
          // For basic drawing tools, we need to manually stop drawing since they don't have explicit mouse up handlers
          setIsDrawing(false);
          setMouseButtonDown(false);
          
          // Reset pencil position only for non-pencil tools to prevent unwanted connecting lines
          // Pencil position will be managed separately to support shift+click line drawing
          if (activeTool !== 'pencil') {
            const { setPencilLastPosition } = useToolStore.getState();
            setPencilLastPosition(null);
          }
          break;
    }
  }, [isPlaybackMode, effectiveTool, activeTool, pasteMode, stopPasteDrag, selectionHandlers, lassoSelectionHandlers, dragAndDropHandlers, setIsDrawing, setMouseButtonDown]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleContextMenu,
    handleMouseLeave,
  };
};