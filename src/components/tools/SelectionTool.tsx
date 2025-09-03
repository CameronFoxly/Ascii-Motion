import React from 'react';
import { useCanvasSelection } from '../../hooks/useCanvasSelection';
import { useCanvasState } from '../../hooks/useCanvasState';
import { useToolStore } from '../../stores/toolStore';

/**
 * Selection Tool Component
 * Handles selection-specific behavior and UI feedback
 */
export const SelectionTool: React.FC = () => {
  // All selection logic is already in the hook
  // This component provides tool-specific UI feedback and status
  useCanvasSelection();

  // This is a logical component that doesn't render UI directly
  // The actual selection rendering is handled by useCanvasRenderer
  // This component can be extended to include tool-specific UI elements like:
  // - Selection info panel
  // - Selection controls
  // - Status indicators
  
  return null; // No direct UI - handles behavior through hooks
};

/**
 * Selection Tool Status Component
 * Provides visual feedback about the current selection state
 */
export const SelectionToolStatus: React.FC = () => {
  const { selection } = useToolStore();
  const { moveState } = useCanvasState();

  if (!selection.active) {
    return <span className="text-gray-500">Click and drag to select an area</span>;
  }

  const width = Math.abs(selection.end.x - selection.start.x) + 1;
  const height = Math.abs(selection.end.y - selection.start.y) + 1;

  if (moveState) {
    return (
      <span className="text-blue-600">
        Moving selection ({width} × {height}) - Click to place, Escape to cancel
      </span>
    );
  }

  return (
    <span className="text-green-600">
      Selected: {width} × {height} area - Click inside to move, outside to deselect
    </span>
  );
};
