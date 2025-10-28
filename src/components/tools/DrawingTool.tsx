import React from 'react';
import { Type } from 'lucide-react';
import { useCanvasDragAndDrop } from '../../hooks/useCanvasDragAndDrop';
import { useToolStore } from '../../stores/toolStore';
import { getBrushShapeDisplayName } from '../../utils/brushUtils';
import { ColorSwatch } from '../common/ColorSwatch';

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
      <span className="text-muted-foreground flex items-center gap-1.5">
        Pencil: "{selectedChar}" <Type className="w-3 h-3 inline" /> <ColorSwatch color={selectedColor} />
        {selectedBgColor !== '#FFFFFF' && (
          <> BG: <ColorSwatch color={selectedBgColor} /></>
        )} - {shapeDisplay}: {size} - Click to draw, Shift+click for lines
      </span>
    );
  }

  if (activeTool === 'eraser') {
    const { size, shape } = brushSettings.eraser;
    const shapeDisplay = getBrushShapeDisplayName(shape);
    return (
      <span className="text-muted-foreground">
        Eraser: {shapeDisplay}: {size} - Click to erase, Shift+click for lines
      </span>
    );
  }

  return null;
};
