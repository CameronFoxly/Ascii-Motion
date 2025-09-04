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
      default:
        return null;
    }
  }, [activeTool]);

  // Get the appropriate status component for the active tool
  const getActiveToolStatusComponent = useCallback(() => {
    switch (activeTool) {
      case 'select':
        return 'SelectionToolStatus';
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
      default:
        return null;
    }
  }, [activeTool]);

  // Get tool cursor style
  const getToolCursor = useCallback((tool: Tool) => {
    switch (tool) {
      case 'select':
        return 'cursor-crosshair';
      case 'pencil':
        return 'cursor-crosshair';
      case 'eraser':
        return 'cursor-crosshair';
      case 'paintbucket':
        return 'cursor-crosshair';
      case 'rectangle':
        return 'cursor-crosshair';
      case 'ellipse':
        return 'cursor-crosshair';
      case 'eyedropper':
        return 'cursor-crosshair';
      default:
        return 'cursor-default';
    }
  }, []);

  // Get tool display name
  const getToolDisplayName = useCallback((tool: Tool) => {
    switch (tool) {
      case 'select':
        return 'Selection';
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
      default:
        return 'Unknown';
    }
  }, []);

  // Check if tool requires continuous interaction (click and drag)
  const isInteractiveTool = useCallback((tool: Tool) => {
    return ['select', 'rectangle', 'ellipse'].includes(tool);
  }, []);

  // Check if tool is a drawing tool (modifies canvas on click)
  const isDrawingTool = useCallback((tool: Tool) => {
    return ['pencil', 'eraser', 'paintbucket', 'rectangle', 'ellipse'].includes(tool);
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
