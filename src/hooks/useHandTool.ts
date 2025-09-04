import { useCallback, useRef } from 'react';
import { useCanvasContext } from '../contexts/CanvasContext';
import { useToolStore } from '../stores/toolStore';

/**
 * Hook for hand tool pan functionality
 * Handles click and drag panning of the canvas viewport
 */
export const useHandTool = () => {
  const { panOffset, setPanOffset, spaceKeyDown, setHandDragging } = useCanvasContext();
  const { activeTool } = useToolStore();
  const isPanningRef = useRef(false);
  const lastPanPositionRef = useRef<{ x: number; y: number } | null>(null);

  // Calculate effective tool (space key overrides with hand tool)
  const effectiveTool = spaceKeyDown ? 'hand' : activeTool;

  // Handle mouse down for pan start
  const handleHandMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (effectiveTool !== 'hand') return;

    event.preventDefault();
    isPanningRef.current = true;
    lastPanPositionRef.current = { x: event.clientX, y: event.clientY };
    
    // Set dragging state to update cursor
    setHandDragging(true);
  }, [effectiveTool, setHandDragging]);

  // Handle mouse move for panning
  const handleHandMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPanningRef.current || !lastPanPositionRef.current || effectiveTool !== 'hand') {
      return;
    }

    const deltaX = event.clientX - lastPanPositionRef.current.x;
    const deltaY = event.clientY - lastPanPositionRef.current.y;

    // Update pan offset
    setPanOffset({
      x: panOffset.x + deltaX,
      y: panOffset.y + deltaY
    });

    // Update last position
    lastPanPositionRef.current = { x: event.clientX, y: event.clientY };
  }, [effectiveTool, panOffset, setPanOffset]);

  // Handle mouse up for pan end
  const handleHandMouseUp = useCallback(() => {
    if (effectiveTool !== 'hand') return;

    isPanningRef.current = false;
    lastPanPositionRef.current = null;
    
    // Clear dragging state to update cursor
    setHandDragging(false);
  }, [effectiveTool, setHandDragging]);

  // Handle mouse leave
  const handleHandMouseLeave = useCallback(() => {
    if (effectiveTool !== 'hand') return;

    isPanningRef.current = false;
    lastPanPositionRef.current = null;
    
    // Clear dragging state to update cursor
    setHandDragging(false);
  }, [effectiveTool, setHandDragging]);

  return {
    handleHandMouseDown,
    handleHandMouseMove,
    handleHandMouseUp,
    handleHandMouseLeave,
    isPanning: isPanningRef.current,
  };
};
