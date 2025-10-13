import { useCallback } from 'react';
import { scheduleCanvasRender } from '../utils/renderScheduler';
import { markCellDirty, markRegionDirty, markFullRedraw } from '../utils/dirtyTracker';

/**
 * Hook for optimized canvas rendering triggers
 * Provides functions to schedule renders with dirty region tracking
 */
export const useOptimizedRender = () => {
  
  // Schedule a render for a single cell change
  const scheduleCell = useCallback((x: number, y: number, renderFn?: () => void) => {
    markCellDirty(x, y);
    if (renderFn) {
      scheduleCanvasRender(renderFn);
    }
  }, []);

  // Schedule a render for a region change
  const scheduleRegion = useCallback((startX: number, startY: number, endX: number, endY: number, renderFn?: () => void) => {
    markRegionDirty(startX, startY, endX, endY);
    if (renderFn) {
      scheduleCanvasRender(renderFn);
    }
  }, []);

  // Schedule a full canvas render
  const scheduleFull = useCallback((renderFn?: () => void) => {
    markFullRedraw();
    if (renderFn) {
      scheduleCanvasRender(renderFn);
    }
  }, []);

  // Generic scheduled render
  const scheduleRender = useCallback((renderFn: () => void) => {
    scheduleCanvasRender(renderFn);
  }, []);

  return {
    scheduleCell,
    scheduleRegion,
    scheduleFull,
    scheduleRender
  };
};
