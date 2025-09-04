import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import {
  SelectionToolStatus,
  DrawingToolStatus,
  PaintBucketToolStatus,
  RectangleToolStatus,
  EllipseToolStatus,
  EyedropperToolStatus,
  HandToolStatus,
} from '../tools';

/**
 * Tool Status Manager Component
 * Renders the appropriate tool status component based on the active tool
 */
export const ToolStatusManager: React.FC = () => {
  const { activeTool } = useToolStore();

  // Render the appropriate tool status component
  switch (activeTool) {
    case 'select':
      return <SelectionToolStatus />;
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
    default:
      return <span className="text-gray-500">No tool selected</span>;
  }
};
