import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { useGradientStore } from '../../stores/gradientStore';
import { useAsciiTypeStore } from '../../stores/asciiTypeStore';
import { useAsciiBoxStore } from '../../stores/asciiBoxStore';
import { useLayoutState } from '../../hooks/useLayoutState';
import type { Tool } from '../../types';
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
  GradientFillToolStatus,
  FlipHorizontalToolStatus,
  FlipVerticalToolStatus,
  AsciiTypeToolStatus,
  AsciiBoxToolStatus,
} from '../tools';
import { MouseCoordinates } from '../common/MouseCoordinates';

/**
 * Tool Status Manager Component
 * Renders the appropriate tool status component based on the active tool
 * Always displays mouse coordinates at the end
 */
export const ToolStatusManager: React.FC = () => {
  const { activeTool } = useToolStore();
  const { altKeyDown } = useCanvasContext();
  const { layout } = useLayoutState();
  
  // Check if any right-side panel is open
  const isGradientPanelOpen = useGradientStore((state) => state.isOpen);
  const isAsciiTypePanelOpen = useAsciiTypeStore((state) => state.isPanelOpen);
  const isAsciiBoxPanelOpen = useAsciiBoxStore((state) => state.isPanelOpen);
  
  const isAnyToolPanelOpen = isGradientPanelOpen || isAsciiTypePanelOpen || isAsciiBoxPanelOpen;
  
  // Calculate right margin to avoid tool panels:
  // - When no tool panel is open: 0px (status bar stays at the right edge)
  // - When tool panel is open without toolbar: 320px (avoid the full tool panel width)
  // - When tool panel is open WITH toolbar: 96px (tool panel extends 96px beyond toolbar)
  let rightMargin = 0;
  if (isAnyToolPanelOpen) {
    rightMargin = layout.rightPanelOpen ? 96 : 320;
  }

  // Calculate effective tool (Alt key overrides with eyedropper for drawing tools)
  const drawingTools: Tool[] = ['pencil', 'eraser', 'paintbucket', 'gradientfill', 'rectangle', 'ellipse'];
  const shouldAllowEyedropperOverride = drawingTools.includes(activeTool);
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
      case 'gradientfill':
        return <GradientFillToolStatus />;
      case 'asciitype':
        return <AsciiTypeToolStatus />;
      case 'asciibox':
        return <AsciiBoxToolStatus />;
      case 'fliphorizontal':
        return <FlipHorizontalToolStatus />;
      case 'flipvertical':
        return <FlipVerticalToolStatus />;
      default:
        return <span className="text-muted-foreground">No tool selected</span>;
    }
  })();

  return (
    <div 
      className="text-xs flex flex-col items-end w-full transition-all duration-300 ease-in-out"
      style={{ marginRight: `${rightMargin}px` }}
    >
      <div>{statusContent}</div>
      <MouseCoordinates />
    </div>
  );
};
