import React from 'react';
import { useCanvasMagicWandSelection } from '../../hooks/useCanvasMagicWandSelection';
import { useCanvasState } from '../../hooks/useCanvasState';
import { useToolStore } from '../../stores/toolStore';

/**
 * Magic Wand Selection Tool Component
 * Handles magic wand selection-specific behavior and UI feedback
 */
export const MagicWandTool: React.FC = () => {
  // All magic wand selection logic is handled in the hook
  // This component provides tool-specific UI feedback and status
  useCanvasMagicWandSelection();

  // This is a logical component that doesn't render UI directly
  // The actual magic wand selection rendering is handled by useCanvasRenderer
  // This component can be extended to include tool-specific UI elements like:
  // - Magic wand selection info panel
  // - Contiguous/non-contiguous toggle controls
  // - Selection criteria indicators
  
  return null; // No direct UI - handles behavior through hooks
};

/**
 * Magic Wand Selection Tool Status Component
 * Provides visual feedback about the current magic wand selection state
 */
export const MagicWandToolStatus: React.FC = () => {
  const { magicWandSelection, magicWandContiguous } = useToolStore();
  const { moveState } = useCanvasState();

  if (!magicWandSelection.active) {
    const modeText = magicWandContiguous ? 'contiguous' : 'all matching';
    return (
      <span className="text-gray-500">
        Click to select {modeText} cells with same character and colors
      </span>
    );
  }

  const selectedCount = magicWandSelection.selectedCells.size;
  const cellsText = selectedCount === 1 ? 'cell' : 'cells';
  const modeText = magicWandContiguous ? 'contiguous' : 'matching';

  if (moveState) {
    return (
      <span className="text-muted-foreground">
        Moving {selectedCount} {modeText} {cellsText} - Click to place, Escape to cancel
      </span>
    );
  }

  return (
    <span className="text-muted-foreground">
      Selected: {selectedCount} {modeText} {cellsText} - Click inside to move, outside to deselect
    </span>
  );
};
