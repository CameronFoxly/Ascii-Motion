import React from 'react';
import { useCanvasDragAndDrop } from '../../hooks/useCanvasDragAndDrop';
import { useToolStore } from '../../stores/toolStore';
import { getBrushShapeDisplayName } from '../../utils/brushUtils';

/**
 * Drawing Tool Component
 * Handles pencil and eraser tool behavior
 */
export const DrawingTool: React.FC = () => {
  // The drawing logic is handled by useCanvasDragAndDrop hook
  // This component ensures the hook is active when drawing tools are selected
  useCanvasDragAndDrop();

  return null; // No direct UI - handles behavior through hooks
};

/**
 * Drawing Tool Status Component
 * Provides visual feedback about the current drawing tool
 */
export const DrawingToolStatus: React.FC = () => {
  const { activeTool, selectedChar, selectedColor, selectedBgColor, brushSize, brushShape } = useToolStore();

  if (activeTool === 'pencil') {
    const shapeDisplay = getBrushShapeDisplayName(brushShape);
    return (
      <span className="text-muted-foreground">
        Pencil: "{selectedChar}" with color {selectedColor}
        {selectedBgColor !== '#FFFFFF' && ` on ${selectedBgColor}`} - {shapeDisplay} brush (size {brushSize}) - Click to draw, hold Shift+click for lines
      </span>
    );
  }

  if (activeTool === 'eraser') {
    return (
      <span className="text-muted-foreground">
        Eraser: Click to remove characters
      </span>
    );
  }

  return null;
};
