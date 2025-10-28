/**
 * BrushSizePreviewOverlay Component
 * 
 * Floating overlay that displays brush size preview when adjusting size
 * via slider, +/- buttons, or keyboard shortcuts ([ ]).
 * 
 * Features:
 * - Appears to the right of the left tool panel
 * - Auto-hides after 2 seconds of inactivity
 * - Closes when clicking outside, switching tools, or clicking canvas
 * - Shows brush preview grid, size number, and shape name
 * - Positioned below draggable pickers (z-[99998])
 * - Dynamic grid size scales with brush size
 * - Smooth entrance/exit animations
 */

import React, { useEffect, useRef, useState } from 'react';
import { useToolStore } from '../../stores/toolStore';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { Card, CardContent } from '@/components/ui/card';
import { BrushPreview } from './BrushPreview';
import { getBrushShapeDisplayName } from '../../utils/brushUtils';

type OverlayState = 'hidden' | 'entering' | 'visible' | 'exiting';

export const BrushSizePreviewOverlay: React.FC = () => {
  const isVisible = useToolStore((state) => state.brushSizePreviewVisible);
  const activeTool = useToolStore((state) => state.activeTool);
  const brushSettings = useToolStore((state) => state.brushSettings);
  const hideBrushSizePreview = useToolStore((state) => state.hideBrushSizePreview);
  
  const overlayRef = useRef<HTMLDivElement>(null);
  const [overlayState, setOverlayState] = useState<OverlayState>('hidden');
  const prevVisibleRef = useRef(isVisible);
  
  // Determine which tool's brush to show (pencil or eraser)
  const tool = activeTool === 'eraser' ? 'eraser' : 'pencil';
  const { size, shape } = brushSettings[tool];
  const shapeName = getBrushShapeDisplayName(shape);
  const toolLabel = tool === 'eraser' ? 'Eraser' : 'Brush';
  
  // Calculate dynamic grid size based on brush size and shape
  // Need to account for how each shape extends in space:
  // - Circle: Uses aspect ratio compensation, extends more horizontally
  // - Square: Compensates for aspect ratio, extends in both dimensions
  // - Horizontal: Extends horizontally only
  // - Vertical: Extends vertically only
  const getGridSize = (brushSize: number, brushShape: string): { width: number; height: number } => {
    const cellAspectRatio = 0.6; // Typical monospace ratio
    const margin = 2; // Extra cells on each side for padding
    
    // Calculate max extents based on brush shape
    if (brushShape === 'circle') {
      const radius = brushSize / 2;
      const radiusX = radius / cellAspectRatio; // Horizontal radius compensated for aspect ratio
      const radiusY = radius; // Vertical radius
      const maxX = Math.ceil(radiusX);
      const maxY = Math.ceil(radiusY);
      
      return {
        width: (maxX * 2) + margin * 2 + 1, // +1 for center cell
        height: (maxY * 2) + margin * 2 + 1
      };
    } else if (brushShape === 'square') {
      const halfSizeY = Math.floor((brushSize * cellAspectRatio) / 2);
      const halfSizeX = Math.floor(brushSize / 2);
      
      return {
        width: (halfSizeX * 2) + margin * 2 + 1,
        height: (halfSizeY * 2) + margin * 2 + 1
      };
    } else if (brushShape === 'horizontal') {
      const halfLength = Math.floor(brushSize / 2);
      
      return {
        width: (halfLength * 2) + margin * 2 + 1,
        height: 7 // Fixed height for horizontal lines
      };
    } else if (brushShape === 'vertical') {
      const halfLength = Math.floor(brushSize / 2);
      
      return {
        width: 7, // Fixed width for vertical lines
        height: (halfLength * 2) + margin * 2 + 1
      };
    }
    
    // Fallback for unknown shapes
    return { width: 11, height: 7 };
  };
  
  const gridSize = getGridSize(size, shape);
  
  // Calculate card width based on grid size and cell dimensions
  // Need to account for: grid width × cell width + padding (p-3 = 12px on each side = 24px total) + borders
  const { cellWidth } = useCanvasContext();
  const cardWidth = Math.max(200, gridSize.width * cellWidth + 24 + 4); // min 200px, +24 for padding, +4 for borders
  
  // Handle visibility state machine
  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    prevVisibleRef.current = isVisible;
    
    if (isVisible && !wasVisible) {
      // Show requested: enter if hidden
      if (overlayState === 'hidden') {
        setOverlayState('entering');
        // After animation completes, transition to visible
        const timer = setTimeout(() => setOverlayState('visible'), 200);
        return () => clearTimeout(timer);
      }
      // If currently exiting, interrupt and go back to visible
      if (overlayState === 'exiting') {
        setOverlayState('visible');
      }
    } else if (!isVisible && wasVisible) {
      // Hide requested: start exit animation only if we're currently visible/entering
      if (overlayState === 'entering' || overlayState === 'visible') {
        setOverlayState('exiting');
        // After animation completes, transition to hidden
        const timer = setTimeout(() => setOverlayState('hidden'), 200);
        return () => clearTimeout(timer);
      }
    }
    // Note: We deliberately do NOT include overlayState in dependencies to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);
  
  // Close overlay when clicking outside
  useEffect(() => {
    if (overlayState !== 'visible' && overlayState !== 'entering') return;
    
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is on a brush control element (slider or +/- buttons)
      const target = event.target as HTMLElement;
      const isBrushControl = target.closest('[data-brush-control="true"]');
      
      // Don't close if clicking on brush controls or the overlay itself
      if (isBrushControl) {
        return;
      }
      
      if (overlayRef.current && !overlayRef.current.contains(target)) {
        hideBrushSizePreview();
      }
    };
    
    // Add listener with slight delay to avoid immediate close on the triggering click
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [overlayState, hideBrushSizePreview]);
  
  // Close overlay when hovering over the canvas
  useEffect(() => {
    if (overlayState !== 'visible' && overlayState !== 'entering') return;
    
    const handleCanvasHover = () => {
      hideBrushSizePreview();
    };
    
    // Find the canvas element
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('mouseenter', handleCanvasHover);
      
      return () => {
        canvas.removeEventListener('mouseenter', handleCanvasHover);
      };
    }
  }, [overlayState, hideBrushSizePreview]);
  
  // Don't render if hidden or tool doesn't support brush sizing
  if (overlayState === 'hidden' || (activeTool !== 'pencil' && activeTool !== 'eraser')) {
    return null;
  }
  
  // Custom inline style for horizontal-only animations (both entrance and exit)
  const getAnimationStyle = (): React.CSSProperties => {
    if (overlayState === 'entering') {
      return {
        animation: 'slideInFromLeft 200ms ease-out',
      };
    }
    if (overlayState === 'exiting') {
      return {
        animation: 'slideOutToLeft 200ms ease-in',
      };
    }
    return {};
  };
  
  return (
    <>
      {/* CSS keyframes for horizontal-only slide animations */}
      <style>{`
        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-1rem) translateY(-50%);
          }
          to {
            opacity: 1;
            transform: translateX(0) translateY(-50%);
          }
        }
        @keyframes slideOutToLeft {
          from {
            opacity: 1;
            transform: translateX(0) translateY(-50%);
          }
          to {
            opacity: 0;
            transform: translateX(-1rem) translateY(-50%);
          }
        }
      `}</style>
      
      <div
        ref={overlayRef}
        className="fixed left-56 top-1/2 -translate-y-1/2 z-[99998]"
        style={getAnimationStyle()}
      >
        <Card 
          className="border-border/50 shadow-lg bg-background"
          style={{ width: `${cardWidth}px` }}
        >
          <CardContent className="p-3 space-y-2">
            {/* Header with size and shape info */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">
                {toolLabel} Size: {size}
              </span>
              <span className="text-xs text-muted-foreground">
                {shapeName}
              </span>
            </div>
            
            {/* Brush preview grid with dynamic sizing */}
            <BrushPreview 
              tool={tool} 
              gridWidth={gridSize.width}
              gridHeight={gridSize.height}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
};
