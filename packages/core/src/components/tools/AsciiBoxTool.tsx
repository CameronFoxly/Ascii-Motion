import React from 'react';
import { useAsciiBoxTool } from '../../hooks/useAsciiBoxTool';

/**
 * ASCII Box Tool Component
 * Handles box drawing functionality with automatic character selection
 */
export const AsciiBoxTool: React.FC = () => {
  // Tool behavior is handled through the hook and mouse handlers
  // No direct rendering needed
  return null;
};

/**
 * ASCII Box Tool Status Component
 * Provides visual feedback about the tool's current state
 */
export const AsciiBoxToolStatus: React.FC = () => {
  const { drawingMode, isApplying, currentStyle, rectangleStart } = useAsciiBoxTool();
  
  if (!isApplying) {
    const modeText = {
      rectangle: 'Click start, then click end',
      freedraw: 'Click/drag to draw, Shift+click for lines',
      erase: 'Click/drag to erase'
    }[drawingMode];
    
    return (
      <span className="text-muted-foreground">
        ASCII Box: {modeText} • Style: {currentStyle.name}
      </span>
    );
  }
  
  let statusText = 'Drawing...';
  if (drawingMode === 'rectangle') {
    statusText = rectangleStart ? 'Click end point' : 'Click start point';
  } else if (drawingMode === 'erase') {
    statusText = 'Erasing...';
  }
  
  return (
    <span className="text-muted-foreground">
      ASCII Box: {statusText} • {currentStyle.name} • Enter to apply • Escape to cancel
    </span>
  );
};
