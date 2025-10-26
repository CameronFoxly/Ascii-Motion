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
  
  // Calculate dynamic grid size based on brush size
  // For sizes 1-6: use 11x7 grid
  // For sizes 7-12: use 15x9 grid
  // For sizes 13-20: use 21x13 grid
  const getGridSize = (brushSize: number): { width: number; height: number } => {
    if (brushSize <= 6) {
      return { width: 11, height: 7 };
    } else if (brushSize <= 12) {
      return { width: 15, height: 9 };
    } else {
      return { width: 21, height: 13 };
    }
  };
  
  const gridSize = getGridSize(size);
  
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
        <Card className="border-border/50 shadow-lg bg-background w-64">
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
