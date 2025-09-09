import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import { useCanvasContext } from '../../contexts/CanvasContext';
import {
  SelectionToolStatus,
  LassoToolStatus,
  MagicWandToolStatus,
  DrawingToolStatus,
  PaintBucketToolStatus,
  RectangleToolStatus,
  EllipseToolStatus,
  EyedropperToolStatus,
  HandToolStatus,
  TextToolStatus,
} from '../tools';

/**
 * Tool Status Manager Component
 * Renders the appropriate tool status component based on the active tool
 */
export const ToolStatusManager: React.FC = () => {
  const { activeTool } = useToolStore();
  const { spaceKeyDown } = useCanvasContext();

  // If space key is down, show hand tool status regardless of active tool
  if (spaceKeyDown) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground font-medium">
          🖐️ Hand Tool (Space Override)
        </span>
        <span className="text-muted-foreground">
          Click and drag to pan canvas - Release Space to return to {activeTool}
        </span>
      </div>
    );
  }

  // Render the appropriate tool status component with smaller text
  const statusContent = (() => {
    switch (activeTool) {
      case 'select':
        return <SelectionToolStatus />;
      case 'lasso':
        return <LassoToolStatus />;
      case 'magicwand':
        return <MagicWandToolStatus />;
      case 'pencil':
      case 'eraser':
        return <DrawingToolStatus />;
      case 'paintbucket':
        return <PaintBucketToolStatus />;
      case 'rectangle':
        return <RectangleToolStatus />;
      case 'ellipse':
        return <EllipseToolStatus />;
      case 'eyedropper':
        return <EyedropperToolStatus />;
      case 'hand':
        return <HandToolStatus />;
      case 'text':
        return <TextToolStatus />;
      default:
        return <span className="text-muted-foreground">No tool selected</span>;
    }
  })();

  return (
    <div className="text-xs">
      {statusContent}
    </div>
  );
};
