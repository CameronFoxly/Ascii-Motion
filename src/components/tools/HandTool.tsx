import React from 'react';
import { useHandTool } from '../../hooks/useHandTool';
import { useCanvasContext } from '../../contexts/CanvasContext';

/**
 * Hand Tool Component
 * Handles canvas panning behavior
 */
export const HandTool: React.FC = () => {
  // The hand tool logic is handled by useHandTool hook
  // This component ensures the hook is active when hand tool is selected
  useHandTool();

  return null; // No direct UI - handles behavior through hooks
};

/**
 * Hand Tool Status Component
 * Provides visual feedback about the hand tool
 */
export const HandToolStatus: React.FC = () => {
  const { panOffset } = useCanvasContext();

  return (
    <span className="text-muted-foreground">
      Hand: Click and drag to pan canvas (offset: {Math.round(panOffset.x)}, {Math.round(panOffset.y)}) - Hold Space for temporary access
    </span>
  );
};
