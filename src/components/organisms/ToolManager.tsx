import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import {
  SelectionTool,
  DrawingTool,
  PaintBucketTool,
  RectangleTool,
  EyedropperTool,
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
    case 'pencil':
    case 'eraser':
      return <DrawingTool />;
    case 'paintbucket':
      return <PaintBucketTool />;
    case 'rectangle':
      return <RectangleTool />;
    case 'eyedropper':
      return <EyedropperTool />;
    default:
      return null;
  }
};
