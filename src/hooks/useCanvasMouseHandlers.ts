import { useCallback } from 'react';
import { useCanvasContext, useCanvasDimensions } from '../contexts/CanvasContext';
import { useToolStore } from '../stores/toolStore';
import { useCanvasStore } from '../stores/canvasStore';
import { useCanvasSelection } from './useCanvasSelection';
import { useCanvasDragAndDrop } from './useCanvasDragAndDrop';
import { useHandTool } from './useHandTool';

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
  const { activeTool } = useToolStore();
  const { canvasRef, spaceKeyDown, setIsDrawing, setMouseButtonDown, pasteMode, updatePastePosition, startPasteDrag, stopPasteDrag, cancelPasteMode, commitPaste } = useCanvasContext();
  const { getGridCoordinates } = useCanvasDimensions();
  const { width, height, cells, setCanvasData } = useCanvasStore();
  
  // Import tool hooks
  const selectionHandlers = useCanvasSelection();
  const dragAndDropHandlers = useCanvasDragAndDrop();
  const handToolHandlers = useHandTool();

  // Determine effective tool (space key overrides with hand tool)
  const effectiveTool = spaceKeyDown ? 'hand' : activeTool;

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
  }, [setIsDrawing, setMouseButtonDown]);

  // Route mouse down to appropriate tool handler based on effective tool
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
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

    // Normal tool handling when not in paste mode
    switch (effectiveTool) {
      case 'hand':
        handToolHandlers.handleHandMouseDown(event);
        break;
      case 'select':
        selectionHandlers.handleSelectionMouseDown(event);
        break;
      case 'rectangle':
        dragAndDropHandlers.handleRectangleMouseDown(event);
        break;
      case 'ellipse':
        dragAndDropHandlers.handleEllipseMouseDown(event);
        break;
      default:
        // For basic drawing tools (pencil, eraser, eyedropper, paintbucket)
        dragAndDropHandlers.handleDrawingMouseDown(event);
        break;
    }
  }, [effectiveTool, pasteMode, getGridCoordinatesFromEvent, startPasteDrag, cancelPasteMode, commitPaste, cells, setCanvasData, handToolHandlers, selectionHandlers, dragAndDropHandlers]);

  // Route mouse move to appropriate tool handler
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
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
      case 'hand':
        handToolHandlers.handleHandMouseMove(event);
        break;
      case 'select':
        selectionHandlers.handleSelectionMouseMove(event);
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
  }, [effectiveTool, pasteMode, getGridCoordinatesFromEvent, updatePastePosition, handToolHandlers, selectionHandlers, dragAndDropHandlers]);

  // Route mouse up to appropriate tool handler
  const handleMouseUp = useCallback((event?: React.MouseEvent<HTMLCanvasElement>) => {
    // Handle paste mode
    if (pasteMode.isActive && pasteMode.isDragging) {
      stopPasteDrag();
      return;
    }

    // Normal tool handling when not in paste mode
    if (effectiveTool === 'hand' && event) {
      // Hand tool uses effectiveTool to handle space key override
      handToolHandlers.handleHandMouseUp(event);
    } else {
      // Other tools use activeTool for proper cleanup
      switch (activeTool) {
        case 'select':
          selectionHandlers.handleSelectionMouseUp();
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
          break;
      }
    }
  }, [effectiveTool, activeTool, pasteMode, stopPasteDrag, handToolHandlers, selectionHandlers, dragAndDropHandlers, setIsDrawing, setMouseButtonDown]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleContextMenu,
  };
};