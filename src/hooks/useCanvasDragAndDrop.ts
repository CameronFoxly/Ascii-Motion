import { useCallback } from 'react';
import { useCanvasContext, useCanvasDimensions } from '../contexts/CanvasContext';
import { useCanvasStore } from '../stores/canvasStore';
import { useToolStore } from '../stores/toolStore';
import { useDrawingTool } from './useDrawingTool';
import { useCanvasState } from './useCanvasState';

/**
 * Hook for handling drag and drop operations on the canvas
 * Used by drawing tools (pencil, eraser) and rectangle tool
 */
export const useCanvasDragAndDrop = () => {
  const { canvasRef, isDrawing, setIsDrawing, setMouseButtonDown } = useCanvasContext();
  const { getGridCoordinates } = useCanvasDimensions();
  const { width, height, cells } = useCanvasStore();
  const { 
    selection,
    startSelection,
    updateSelection,
    clearSelection,
    pushToHistory
  } = useToolStore();
  const { setSelectionMode } = useCanvasState();
  const { drawAtPosition, drawRectangle, activeTool } = useDrawingTool();

  // Convert mouse coordinates to grid coordinates
  const getGridCoordinatesFromEvent = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    return getGridCoordinates(mouseX, mouseY, rect, width, height);
  }, [getGridCoordinates, width, height, canvasRef]);

  // Handle drawing operations
  const handleDrawing = useCallback((x: number, y: number) => {
    drawAtPosition(x, y);
  }, [drawAtPosition]);

  // Handle drawing tool mouse down
  const handleDrawingMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getGridCoordinatesFromEvent(event);
    
    // Save current state for undo
    pushToHistory(new Map(cells));
    setMouseButtonDown(true);
    setIsDrawing(true);
    handleDrawing(x, y);
  }, [getGridCoordinatesFromEvent, cells, pushToHistory, setMouseButtonDown, setIsDrawing, handleDrawing]);

  // Handle drawing tool mouse move
  const handleDrawingMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getGridCoordinatesFromEvent(event);
    
    if (isDrawing && (activeTool === 'pencil' || activeTool === 'eraser')) {
      handleDrawing(x, y);
    }
  }, [getGridCoordinatesFromEvent, isDrawing, activeTool, handleDrawing]);

  // Handle rectangle tool mouse down
  const handleRectangleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getGridCoordinatesFromEvent(event);
    
    // Save current state for undo
    pushToHistory(new Map(cells));
    
    // Start selection for rectangle bounds
    startSelection(x, y);
    setSelectionMode('dragging');
    setMouseButtonDown(true);
  }, [getGridCoordinatesFromEvent, cells, pushToHistory, startSelection, setSelectionMode, setMouseButtonDown]);

  // Handle rectangle tool mouse move  
  const handleRectangleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getGridCoordinatesFromEvent(event);
    
    // Rectangle tool uses selection bounds for preview
    if (selection.active) {
      updateSelection(x, y);
    }
  }, [getGridCoordinatesFromEvent, selection.active, updateSelection]);

  // Handle rectangle tool mouse up
  const handleRectangleMouseUp = useCallback(() => {
    if (selection.active) {
      // Draw rectangle and clear selection
      drawRectangle(selection.start.x, selection.start.y, selection.end.x, selection.end.y);
      clearSelection();
      setSelectionMode('none');
    }
    setIsDrawing(false);
    setMouseButtonDown(false);
  }, [selection, drawRectangle, clearSelection, setSelectionMode, setIsDrawing, setMouseButtonDown]);

  return {
    // Drawing tools
    handleDrawingMouseDown,
    handleDrawingMouseMove,
    
    // Rectangle tool
    handleRectangleMouseDown,
    handleRectangleMouseMove,
    handleRectangleMouseUp,
    
    // Shared utilities
    getGridCoordinatesFromEvent,
    handleDrawing,
  };
};
