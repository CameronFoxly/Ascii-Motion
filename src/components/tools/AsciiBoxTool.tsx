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
      rectangle: 'Click start, then end',
      freedraw: 'Click/drag, Shift+click for lines',
      erase: 'Click/drag to erase'
    }[drawingMode];
    
    return (
      <span className="text-muted-foreground">
        {modeText} • {currentStyle.name}
      </span>
    );
  }
  
  let statusText = 'Drawing...';
  if (drawingMode === 'rectangle') {
    statusText = rectangleStart ? 'Click end' : 'Click start';
  } else if (drawingMode === 'erase') {
    statusText = 'Erasing...';
  }
  
  return (
    <span className="text-muted-foreground">
      {statusText} • {currentStyle.name} • Enter to apply • Esc to cancel
    </span>
  );
};
