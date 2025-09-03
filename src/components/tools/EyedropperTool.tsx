import React from 'react';
import { useDrawingTool } from '../../hooks/useDrawingTool';

/**
 * Eyedropper Tool Component
 * Handles color/character picking behavior
 */
export const EyedropperTool: React.FC = () => {
  // The eyedropper logic is handled by useDrawingTool hook
  // This component ensures the hook is active when eyedropper tool is selected
  useDrawingTool();

  return null; // No direct UI - handles behavior through hooks
};

/**
 * Eyedropper Tool Status Component
 * Provides visual feedback about the eyedropper tool
 */
export const EyedropperToolStatus: React.FC = () => {
  return (
    <span className="text-orange-600">
      Eyedropper: Click on any character to pick its style (character, color, background)
    </span>
  );
};
