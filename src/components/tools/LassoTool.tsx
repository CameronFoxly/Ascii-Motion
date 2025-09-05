import React from 'react';
import { useCanvasLassoSelection } from '../../hooks/useCanvasLassoSelection';
import { useCanvasState } from '../../hooks/useCanvasState';
import { useToolStore } from '../../stores/toolStore';

/**
 * Lasso Selection Tool Component
 * Handles lasso selection-specific behavior and UI feedback
 */
export const LassoTool: React.FC = () => {
  // All lasso selection logic is handled in the hook
  // This component provides tool-specific UI feedback and status
  useCanvasLassoSelection();

  // This is a logical component that doesn't render UI directly
  // The actual lasso selection rendering is handled by useCanvasRenderer
  // This component can be extended to include tool-specific UI elements like:
  // - Lasso selection info panel
  // - Path smoothing controls
  // - Selection mode indicators
  
  return null; // No direct UI - handles behavior through hooks
};

/**
 * Lasso Selection Tool Status Component
 * Provides visual feedback about the current lasso selection state
 */
export const LassoToolStatus: React.FC = () => {
  const { lassoSelection } = useToolStore();
  const { moveState } = useCanvasState();

  if (!lassoSelection.active) {
    return <span className="text-gray-500">Click and drag to draw a freeform selection</span>;
  }

  if (lassoSelection.isDrawing) {
    const pathLength = lassoSelection.path.length;
    return (
      <span className="text-blue-600">
        Drawing lasso path ({pathLength} points) - Release to complete selection
      </span>
    );
  }

  const selectedCount = lassoSelection.selectedCells.size;

  if (moveState) {
    return (
      <span className="text-blue-600">
        Moving lasso selection ({selectedCount} cells) - Click to place, Escape to cancel
      </span>
    );
  }

  return (
    <span className="text-green-600">
      Lasso selected: {selectedCount} cells - Click inside to move, outside to deselect
    </span>
  );
};
