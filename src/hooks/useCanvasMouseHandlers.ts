import { useCallback } from 'react';
import { useCanvasContext } from '../contexts/CanvasContext';
import { useToolStore } from '../stores/toolStore';
import { useCanvasDimensions } from '../contexts/CanvasContext';
import { useCanvasStore } from '../stores/canvasStore';
import { useCanvasSelection } from './useCanvasSelection';
import { useCanvasDragAndDrop } from './useCanvasDragAndDrop';

export interface MouseHandlers {
  handleMouseDown: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseMove: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseUp: () => void;
  handleMouseLeave: () => void;
  handleContextMenu: (event: React.MouseEvent<HTMLCanvasElement>) => void;
}

/**
 * Core mouse interaction handling for the canvas
 * Coordinates with tool-specific hooks for behavior
 */
export const useCanvasMouseHandlers = (): MouseHandlers => {
  const { 
    setIsDrawing, 
    setMouseButtonDown, 
    canvasRef,
    pasteMode, 
    updatePastePosition, 
    startPasteDrag, 
    stopPasteDrag,
    commitPaste,
    cancelPasteMode
  } = useCanvasContext();
  const { activeTool } = useToolStore();
  const { width, height, cells, setCanvasData } = useCanvasStore();
  const { pushToHistory } = useToolStore();
  const { getGridCoordinates } = useCanvasDimensions();
  
  // Tool-specific mouse handlers
  const {
    handleSelectionMouseDown,
    handleSelectionMouseMove,
    handleSelectionMouseUp,
  } = useCanvasSelection();
  
  const {
    handleDrawingMouseDown,
    handleDrawingMouseMove,
    handleRectangleMouseDown,
    handleRectangleMouseMove,
    handleRectangleMouseUp,
  } = useCanvasDragAndDrop();

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

  // Route mouse down to appropriate tool handler
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Handle paste mode interactions first
    if (pasteMode.isActive) {
      const { x, y } = getGridCoordinatesFromEvent(event);
      
      if (event.button === 0) { // Left click
        // Start dragging the paste preview
        updatePastePosition({ x, y });
        startPasteDrag();
      } else if (event.button === 2) { // Right click  
        // Cancel paste mode
        event.preventDefault();
        cancelPasteMode();
      }
      return;
    }

    // Normal tool handling when not in paste mode
    switch (activeTool) {
      case 'select':
        handleSelectionMouseDown(event);
        break;
      case 'pencil':
      case 'eraser':
      case 'eyedropper':
      case 'paintbucket':
        handleDrawingMouseDown(event);
        break;
      case 'rectangle':
        handleRectangleMouseDown(event);
        break;
      default:
        console.warn('Unknown tool:', activeTool);
    }
  }, [
    activeTool, 
    pasteMode,
    getGridCoordinatesFromEvent,
    updatePastePosition,
    startPasteDrag,
    cancelPasteMode,
    handleSelectionMouseDown, 
    handleDrawingMouseDown, 
    handleRectangleMouseDown
  ]);

  // Route mouse move to appropriate tool handler
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Handle paste mode interactions first
    if (pasteMode.isActive) {
      const { x, y } = getGridCoordinatesFromEvent(event);
      updatePastePosition({ x, y });
      return;
    }

    // Normal tool handling when not in paste mode
    switch (activeTool) {
      case 'select':
        handleSelectionMouseMove(event);
        break;
      case 'pencil':
      case 'eraser':
        handleDrawingMouseMove(event);
        break;
      case 'rectangle':
        handleRectangleMouseMove(event);
        break;
      case 'eyedropper':
      case 'paintbucket':
        // These tools don't need mouse move handling
        break;
      default:
        console.warn('Unknown tool:', activeTool);
    }
  }, [
    activeTool, 
    pasteMode,
    getGridCoordinatesFromEvent,
    updatePastePosition,
    handleSelectionMouseMove, 
    handleDrawingMouseMove, 
    handleRectangleMouseMove
  ]);

  // Route mouse up to appropriate tool handler
  const handleMouseUp = useCallback(() => {
    // Handle paste mode interactions first
    if (pasteMode.isActive && pasteMode.isDragging) {
      // Stop dragging and commit the paste
      stopPasteDrag();
      const pastedData = commitPaste();
      
      if (pastedData) {
        // Save current state for undo
        pushToHistory(new Map(cells));
        
        // Merge pasted data with current canvas
        const newCells = new Map(cells);
        pastedData.forEach((cell, key) => {
          newCells.set(key, cell);
        });
        
        setCanvasData(newCells);
      }
      return;
    }

    // Normal tool handling when not in paste mode
    switch (activeTool) {
      case 'select':
        handleSelectionMouseUp();
        break;
      case 'rectangle':
        handleRectangleMouseUp();
        break;
      case 'pencil':
      case 'eraser':
      case 'eyedropper':
      case 'paintbucket':
        // These tools just need basic cleanup
        setIsDrawing(false);
        setMouseButtonDown(false);
        break;
      default:
        console.warn('Unknown tool:', activeTool);
        setIsDrawing(false);
        setMouseButtonDown(false);
    }
  }, [
    activeTool, 
    pasteMode,
    stopPasteDrag,
    commitPaste,
    pushToHistory,
    cells,
    setCanvasData,
    handleSelectionMouseUp, 
    handleRectangleMouseUp, 
    setIsDrawing, 
    setMouseButtonDown
  ]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleContextMenu,
  };
};
