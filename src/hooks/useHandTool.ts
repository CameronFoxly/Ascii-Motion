import { useCallback, useRef } from 'react';
import { useCanvasContext } from '../contexts/CanvasContext';
import { useToolStore } from '../stores/toolStore';

/**
 * Hook for hand tool pan functionality
 * Handles click and drag panning of the canvas viewport
 */
export const useHandTool = () => {
  const { panOffset, setPanOffset } = useCanvasContext();
  const { activeTool } = useToolStore();
  const isPanningRef = useRef(false);
  const lastPanPositionRef = useRef<{ x: number; y: number } | null>(null);

  // Handle mouse down for pan start
  const handleHandMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'hand') return;

    event.preventDefault();
    isPanningRef.current = true;
    lastPanPositionRef.current = { x: event.clientX, y: event.clientY };
    
    // Change cursor to grabbing
    if (event.currentTarget) {
      event.currentTarget.style.cursor = 'grabbing';
    }
  }, [activeTool]);

  // Handle mouse move for panning
  const handleHandMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPanningRef.current || !lastPanPositionRef.current || activeTool !== 'hand') {
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
  }, [activeTool, panOffset, setPanOffset]);

  // Handle mouse up for pan end
  const handleHandMouseUp = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'hand') return;

    isPanningRef.current = false;
    lastPanPositionRef.current = null;
    
    // Reset cursor to grab
    if (event.currentTarget) {
      event.currentTarget.style.cursor = 'grab';
    }
  }, [activeTool]);

  // Handle mouse leave
  const handleHandMouseLeave = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'hand') return;

    isPanningRef.current = false;
    lastPanPositionRef.current = null;
    
    // Reset cursor
    if (event.currentTarget) {
      event.currentTarget.style.cursor = 'grab';
    }
  }, [activeTool]);

  return {
    handleHandMouseDown,
    handleHandMouseMove,
    handleHandMouseUp,
    handleHandMouseLeave,
    isPanning: isPanningRef.current,
  };
};
