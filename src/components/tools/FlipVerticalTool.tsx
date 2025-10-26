/**
 * Flip Vertical Tool Component
 * Provides immediate vertical flip action with status feedback
 */

import React from 'react';
import { useFlipUtilities } from '../../hooks/useFlipUtilities';

export const FlipVerticalTool: React.FC = () => {
  // This tool doesn't need any active behavior - it's triggered immediately from button clicks
  return null;
};

/**
 * Flip Vertical Tool Status Component
 * Provides status feedback about what will be flipped
 */
export const FlipVerticalToolStatus: React.FC = () => {
  const { getFlipDescription } = useFlipUtilities();

  const description = getFlipDescription();

  return (
    <span className="text-muted-foreground">
      Flip vertical: {description} - Click or Shift+V
    </span>
  );
};