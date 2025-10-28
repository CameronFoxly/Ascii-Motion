import React from 'react';
import { useCanvasContext } from '../../contexts/CanvasContext';

/**
 * MouseCoordinates Component
 * Displays current mouse position over canvas as [x, y] coordinates
 * Shows [-, -] when mouse is not hovering the canvas
 */
export const MouseCoordinates: React.FC = () => {
  const { hoveredCell } = useCanvasContext();

  const displayText = hoveredCell 
    ? `[${hoveredCell.x}, ${hoveredCell.y}]`
    : '[-, -]';

  return (
    <span className="text-muted-foreground font-mono text-xs">
      {displayText}
    </span>
  );
};
