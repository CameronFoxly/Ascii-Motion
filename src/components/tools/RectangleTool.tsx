import React from 'react';
import { useCanvasDragAndDrop } from '../../hooks/useCanvasDragAndDrop';
import { useToolStore } from '../../stores/toolStore';

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
    <span className="text-indigo-600">
      Rectangle ({rectangleFilled ? 'filled' : 'hollow'}): "{selectedChar}" with color {selectedColor}
      {selectedBgColor !== '#FFFFFF' && ` on ${selectedBgColor}`} - Drag to draw
    </span>
  );
};
