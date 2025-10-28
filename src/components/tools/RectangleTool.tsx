import React from 'react';
import { Type } from 'lucide-react';
import { useCanvasDragAndDrop } from '../../hooks/useCanvasDragAndDrop';
import { useToolStore } from '../../stores/toolStore';
import { ColorSwatch } from '../common/ColorSwatch';

/**
 * Rectangle Tool Component
 * Handles rectangle drawing behavior
 */
export const RectangleTool: React.FC = () => {
  // The rectangle logic is handled by useCanvasDragAndDrop hook
  // This component ensures the hook is active when rectangle tool is selected
  useCanvasDragAndDrop();

  return null; // No direct UI - handles behavior through hooks
};

/**
 * Rectangle Tool Status Component
 * Provides visual feedback about the rectangle tool
 */
export const RectangleToolStatus: React.FC = () => {
  const { selectedChar, selectedColor, selectedBgColor, rectangleFilled } = useToolStore();

  return (
    <span className="text-muted-foreground flex items-center gap-1.5">
      Rectangle ({rectangleFilled ? 'filled' : 'hollow'}): "{selectedChar}" <Type className="w-3 h-3 inline" /> <ColorSwatch color={selectedColor} />
      {selectedBgColor !== '#FFFFFF' && (
        <> BG: <ColorSwatch color={selectedBgColor} /></>
      )} - Drag to draw, Shift for square
    </span>
  );
};
