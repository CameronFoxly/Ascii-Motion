/**
 * Flip Horizontal Tool Component
 * Provides immediate horizontal flip action with status feedback
 */

import React from 'react';
import { useFlipUtilities } from '../../hooks/useFlipUtilities';

export const FlipHorizontalTool: React.FC = () => {
  // This tool doesn't need any active behavior - it's triggered immediately from button clicks
  return null;
};

/**
 * Flip Horizontal Tool Status Component
 * Provides status feedback about what will be flipped
 */
export const FlipHorizontalToolStatus: React.FC = () => {
  const { getFlipDescription } = useFlipUtilities();

  const description = getFlipDescription();

  return (
    <span className="text-muted-foreground">
      Flip horizontal: {description} - Click or Shift+H
    </span>
  );
};