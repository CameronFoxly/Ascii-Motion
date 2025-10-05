import { useCallback } from 'react';
import { useToolStore } from '../stores/toolStore';
import type { Tool } from '../types';

/**
 * Hook for coordinating tool behavior and providing tool metadata
 */
export const useToolBehavior = () => {
  const { activeTool, setActiveTool } = useToolStore();

  // Get the appropriate tool component for the active tool
  const getActiveToolComponent = useCallback(() => {
    switch (activeTool) {
      case 'select':
        return 'SelectionTool';
      case 'lasso':
        return 'LassoTool';
      case 'magicwand':
        return 'MagicWandTool';
      case 'pencil':
      case 'eraser':
        return 'DrawingTool';
      case 'paintbucket':
        return 'PaintBucketTool';
      case 'rectangle':
        return 'RectangleTool';
      case 'ellipse':
        return 'EllipseTool';
      case 'eyedropper':
        return 'EyedropperTool';
      case 'text':
        return 'TextTool';
      case 'asciitype':
        return 'AsciiTypeTool';
      case 'fliphorizontal':
        return 'FlipHorizontalTool';
      case 'flipvertical':
        return 'FlipVerticalTool';
      default:
        return null;
    }
  }, [activeTool]);

  // Get the appropriate status component for the active tool
  const getActiveToolStatusComponent = useCallback(() => {
    switch (activeTool) {
      case 'select':
        return 'SelectionToolStatus';
      case 'lasso':
        return 'LassoToolStatus';
      case 'magicwand':
        return 'MagicWandToolStatus';
      case 'pencil':
      case 'eraser':
        return 'DrawingToolStatus';
      case 'paintbucket':
        return 'PaintBucketToolStatus';
      case 'rectangle':
        return 'RectangleToolStatus';
      case 'ellipse':
        return 'EllipseToolStatus';
      case 'eyedropper':
        return 'EyedropperToolStatus';
      case 'text':
        return 'TextToolStatus';
      case 'asciitype':
        return 'AsciiTypeToolStatus';
      case 'fliphorizontal':
        return 'FlipHorizontalToolStatus';
      case 'flipvertical':
        return 'FlipVerticalToolStatus';
      default:
        return null;
    }
  }, [activeTool]);

  // Get tool cursor style
  const getToolCursor = useCallback((tool: Tool) => {
    switch (tool) {
      case 'select':
        return 'cursor-crosshair';
      case 'lasso':
        return 'cursor-crosshair';
      case 'magicwand':
        return 'cursor-magicwand'; // Custom magic wand cursor
      case 'pencil':
        return 'cursor-pen'; // Custom pen cursor
      case 'eraser':
        return 'cursor-eraser'; // Custom eraser cursor
      case 'paintbucket':
        return 'cursor-paintbucket'; // Custom paint bucket cursor
      case 'rectangle':
        return 'cursor-crosshair';
      case 'ellipse':
        return 'cursor-crosshair';
      case 'eyedropper':
        return 'cursor-eyedropper'; // Custom eyedropper icon cursor
      case 'text':
        return 'cursor-text';
      case 'asciitype':
        return 'cursor-text';
      case 'fliphorizontal':
      case 'flipvertical':
        return 'cursor-pointer'; // Clickable utilities
      default:
        return 'cursor-default';
    }
  }, []);

  // Get tool display name
  const getToolDisplayName = useCallback((tool: Tool) => {
    switch (tool) {
      case 'select':
        return 'Selection';
      case 'lasso':
        return 'Lasso';
      case 'magicwand':
        return 'Magic Wand';
      case 'pencil':
        return 'Pencil';
      case 'eraser':
        return 'Eraser';
      case 'paintbucket':
        return 'Paint Bucket';
      case 'rectangle':
        return 'Rectangle';
      case 'ellipse':
        return 'Ellipse';
      case 'eyedropper':
        return 'Eyedropper';
      case 'text':
        return 'Text';
      case 'asciitype':
        return 'ASCII Type';
      case 'fliphorizontal':
        return 'Flip Horizontal';
      case 'flipvertical':
        return 'Flip Vertical';
      default:
        return 'Unknown';
    }
  }, []);

  // Check if tool requires continuous interaction (click and drag)
  const isInteractiveTool = useCallback((tool: Tool) => {
    return ['select', 'lasso', 'magicwand', 'rectangle', 'ellipse', 'text', 'asciitype'].includes(tool);
  }, []);

  // Check if tool is a drawing tool (modifies canvas on click)
  const isDrawingTool = useCallback((tool: Tool) => {
    return ['pencil', 'eraser', 'paintbucket', 'rectangle', 'ellipse', 'text', 'asciitype'].includes(tool);
  }, []);

  return {
    activeTool,
    setActiveTool,
    getActiveToolComponent,
    getActiveToolStatusComponent,
    getToolCursor,
    getToolDisplayName,
    isInteractiveTool,
    isDrawingTool,
  };
};
