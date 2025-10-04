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
  const { activeTool, selectedChar, selectedColor, selectedBgColor, brushSettings } = useToolStore();

  if (activeTool === 'pencil') {
    const { size, shape } = brushSettings.pencil;
    const shapeDisplay = getBrushShapeDisplayName(shape);
    return (
      <span className="text-muted-foreground">
        Pencil: "{selectedChar}" with color {selectedColor}
        {selectedBgColor !== '#FFFFFF' && ` on ${selectedBgColor}`} - {shapeDisplay} brush (size {size}) - Click to draw, hold Shift+click for lines
      </span>
    );
  }

  if (activeTool === 'eraser') {
    const { size, shape } = brushSettings.eraser;
    const shapeDisplay = getBrushShapeDisplayName(shape);
    return (
      <span className="text-muted-foreground">
        Eraser: {shapeDisplay} brush (size {size}) - Click to remove characters, hold Shift+click for clean lines
      </span>
    );
  }

  return null;
};
