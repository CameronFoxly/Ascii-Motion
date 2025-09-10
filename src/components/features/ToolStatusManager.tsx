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
  TextToolStatus,
} from '../tools';

/**
 * Tool Status Manager Component
 * Renders the appropriate tool status component based on the active tool
 */
export const ToolStatusManager: React.FC = () => {
  const { activeTool } = useToolStore();
  const { altKeyDown } = useCanvasContext();

  // Calculate effective tool (Alt key overrides with eyedropper for drawing tools)
  const drawingTools = ['pencil', 'eraser', 'paintbucket', 'rectangle', 'ellipse'] as const;
  const shouldAllowEyedropperOverride = drawingTools.includes(activeTool as any);
  const effectiveTool = (altKeyDown && shouldAllowEyedropperOverride) ? 'eyedropper' : activeTool;

  // Render the appropriate tool status component with smaller text
  const statusContent = (() => {
    switch (effectiveTool) {
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
