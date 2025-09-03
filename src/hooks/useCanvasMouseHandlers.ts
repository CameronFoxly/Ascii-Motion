import { useCallback } from 'react';
import { useCanvasContext } from '../contexts/CanvasContext';
import { useToolStore } from '../stores/toolStore';
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
  const { setIsDrawing, setMouseButtonDown } = useCanvasContext();
  const { activeTool } = useToolStore();
  
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
  }, [activeTool, handleSelectionMouseDown, handleDrawingMouseDown, handleRectangleMouseDown]);

  // Route mouse move to appropriate tool handler
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
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
  }, [activeTool, handleSelectionMouseMove, handleDrawingMouseMove, handleRectangleMouseMove]);

  // Route mouse up to appropriate tool handler
  const handleMouseUp = useCallback(() => {
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
  }, [activeTool, handleSelectionMouseUp, handleRectangleMouseUp, setIsDrawing, setMouseButtonDown]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleContextMenu,
  };
};
