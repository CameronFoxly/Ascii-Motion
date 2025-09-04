import React from 'react';
import { useCanvasDragAndDrop } from '../../hooks/useCanvasDragAndDrop';
import { useToolStore } from '../../stores/toolStore';

/**
 * Ellipse Tool Component
 * Handles ellipse drawing behavior
 */
export const EllipseTool: React.FC = () => {
  // The ellipse logic is handled by useCanvasDragAndDrop hook
  // This component ensures the hook is active when ellipse tool is selected
  useCanvasDragAndDrop();

  return null; // No direct UI - handles behavior through hooks
};

/**
 * Ellipse Tool Status Component
 * Provides visual feedback about the ellipse tool
 */
export const EllipseToolStatus: React.FC = () => {
  const { selectedChar, selectedColor, selectedBgColor, rectangleFilled } = useToolStore();

  return (
    <span className="text-purple-600">
      Ellipse ({rectangleFilled ? 'filled' : 'hollow'}): "{selectedChar}" with color {selectedColor}
      {selectedBgColor !== '#FFFFFF' && ` on ${selectedBgColor}`} - Drag to draw, hold Shift for circle
    </span>
  );
};
