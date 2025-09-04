import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import { useCanvasContext } from '../../contexts/CanvasContext';
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
  const { spaceKeyDown } = useCanvasContext();

  // If space key is down, show hand tool status regardless of active tool
  if (spaceKeyDown) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-blue-600 font-medium">
          🖐️ Hand Tool (Space Override)
        </span>
        <span className="text-green-600">
          Click and drag to pan canvas - Release Space to return to {activeTool}
        </span>
      </div>
    );
  }

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
