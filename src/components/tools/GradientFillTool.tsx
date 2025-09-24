import React from 'react';
import { useGradientFillTool } from '../../hooks/useGradientFillTool';
import { useGradientStore } from '../../stores/gradientStore';

/**
 * Gradient Fill Tool Component
 * Handles gradient fill behavior and interactive preview
 */
export const GradientFillTool: React.FC = () => {
  // The gradient fill logic is handled by useGradientFillTool hook
  // This component ensures the hook is active when gradient fill tool is selected
  useGradientFillTool();

  return null; // No direct UI - handles behavior through hooks
};

/**
 * Gradient Fill Tool Status Component
 * Provides visual feedback about the gradient fill tool
 */
export const GradientFillToolStatus: React.FC = () => {
  const { 
    isApplying, 
    definition, 
    contiguous, 
    startPoint, 
    endPoint 
  } = useGradientStore();
  
  const { fillAreaSize } = useGradientFillTool();
  
  // Count enabled properties
  const enabledProperties = [
    definition.character.enabled && 'Character',
    definition.textColor.enabled && 'Text Color',
    definition.backgroundColor.enabled && 'Background'
  ].filter(Boolean);
  
  const fillMode = contiguous ? 'connected areas' : 'all matching cells';
  const gradientType = definition.type === 'linear' ? 'Linear' : 'Radial';
  
  if (isApplying) {
    if (!startPoint) {
      return (
        <span className="text-muted-foreground">
          Gradient Fill: Click to set start point
        </span>
      );
    } else if (!endPoint) {
      return (
        <span className="text-muted-foreground">
          Gradient Fill: Click to set end point, or drag to preview
        </span>
      );
    } else {
      return (
        <span className="text-muted-foreground">
          Gradient Fill: {fillAreaSize} cells • Press Enter to apply, Escape to cancel
        </span>
      );
    }
  }
  
  if (enabledProperties.length === 0) {
    return (
      <span className="text-yellow-600">
        Gradient Fill: Enable at least one property in the panel
      </span>
    );
  }
  
  return (
    <span className="text-muted-foreground">
      {gradientType} Gradient: Will apply {enabledProperties.join(', ')} to {fillMode}
    </span>
  );
};