import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import {
  SelectionTool,
  LassoTool,
  MagicWandTool,
  DrawingTool,
  PaintBucketTool,
  RectangleTool,
  EllipseTool,
  EyedropperTool,
  HandTool,
  TextTool,
} from '../tools';

/**
 * Tool Manager Component
 * Renders the appropriate tool component based on the active tool
 */
export const ToolManager: React.FC = () => {
  const { activeTool } = useToolStore();

  // Render the appropriate tool component
  switch (activeTool) {
    case 'select':
      return <SelectionTool />;
    case 'lasso':
      return <LassoTool />;
    case 'magicwand':
      return <MagicWandTool />;
    case 'pencil':
    case 'eraser':
      return <DrawingTool />;
    case 'paintbucket':
      return <PaintBucketTool />;
    case 'rectangle':
      return <RectangleTool />;
    case 'ellipse':
      return <EllipseTool />;
    case 'eyedropper':
      return <EyedropperTool />;
    case 'hand':
      return <HandTool />;
    case 'text':
      return <TextTool />;
    default:
      return null;
  }
};
