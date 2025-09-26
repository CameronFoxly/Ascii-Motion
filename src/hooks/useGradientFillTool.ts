import { useCallback, useEffect } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useCanvasContext } from '../contexts/CanvasContext';
import { useGradientStore, initializeGradientWithCurrentValues } from '../stores/gradientStore';
import { useToolStore } from '../stores/toolStore';
import { useAnimationStore } from '../stores/animationStore';
import { calculateGradientCells } from '../utils/gradientEngine';
import { getGradientFillArea } from '../utils/fillArea';
import type { CanvasHistoryAction } from '../types';

/**
 * Custom hook for handling gradient fill tool operations
 * Integrates canvas interaction, fill area detection, gradient calculation, and undo/redo
 */
export const useGradientFillTool = () => {
  const { 
    cells,
    width: canvasWidth,
    height: canvasHeight,
    getCell, 
    setCanvasData 
  } = useCanvasStore();
  
  const { cellWidth, cellHeight } = useCanvasContext();
  
  const { currentFrameIndex } = useAnimationStore();
  
  const { 
    activeTool,
    selectedChar,
    selectedColor,
    selectedBgColor,
    pushToHistory
  } = useToolStore();
  
  const { 
    isApplying, 
    startPoint, 
    endPoint,
    ellipsePoint,
    hoverEndPoint,
    definition, 
    contiguous, 
    matchChar, 
    matchColor, 
    matchBgColor,
    previewData,
    setApplying, 
    setPoints, 
    setHoverEndPoint,
    setPreview,
    reset: resetGradient
  } = useGradientStore();  // Initialize gradient with current tool values when tool becomes active
  useEffect(() => {
    if (activeTool === 'gradientfill') {
      // Initialize gradient definition with current tool values
      initializeGradientWithCurrentValues(selectedChar, selectedColor, selectedBgColor);
    }
  }, [activeTool, selectedChar, selectedColor, selectedBgColor]);

  // Generate gradient preview
  const generatePreview = useCallback((start: { x: number; y: number }, end: { x: number; y: number }) => {
    try {
      // Find fill area using gradient matching criteria
      const fillArea = getGradientFillArea(
        start.x, 
        start.y,
        { width: canvasWidth, height: canvasHeight, getCell },
        { contiguous, matchChar, matchColor, matchBgColor }
      );
      
      if (fillArea.size === 0) {
        setPreview(null);
        return;
      }
      
      // Calculate gradient cells
      const cellAspectRatio = cellWidth / cellHeight;
      const gradientCells = calculateGradientCells({
        startPoint: start,
        endPoint: end,
        ellipsePoint: ellipsePoint || undefined,
        definition,
        fillArea,
        cellAspectRatio
      });
      
      setPreview(gradientCells);
    } catch (error) {
      console.error('Error generating gradient preview:', error);
      setPreview(null);
    }
  }, [
    canvasWidth,
    canvasHeight,
    getCell,
    contiguous,
    matchChar,
    matchColor,
    matchBgColor,
    definition,
    setPreview
  ]);
  
  // Apply gradient (Enter key or confirmation click)
  const applyGradient = useCallback(() => {
    if (!isApplying || !startPoint || !endPoint || !previewData) {
      console.warn('Cannot apply gradient: missing required state');
      return;
    }
    
    try {
      // Store current canvas state for undo
      const originalCells = new Map(cells);
      
      // Apply gradient to canvas
      const newCells = new Map(cells);
      previewData.forEach((cell, key) => {
        if (cell.char === ' ' && cell.color === '#FFFFFF' && cell.bgColor === 'transparent') {
          // Remove empty cells to save memory
          newCells.delete(key);
        } else {
          newCells.set(key, { ...cell });
        }
      });
      
      setCanvasData(newCells);
      
      // Add to history for undo/redo
      const historyAction: CanvasHistoryAction = {
        type: 'canvas_edit',
        timestamp: Date.now(),
        description: `Apply ${definition.type} gradient fill (${previewData.size} cells)`,
        data: {
          canvasData: originalCells,
          frameIndex: currentFrameIndex
        }
      };
      
      pushToHistory(historyAction);
      
      // Reset gradient state
      resetGradient();
    } catch (error) {
      console.error('Error applying gradient:', error);
      // Reset on error to prevent stuck state
      resetGradient();
    }
  }, [
    isApplying, 
    startPoint, 
    endPoint, 
    previewData, 
    cells, 
    currentFrameIndex,
    definition.type,
    setCanvasData, 
    pushToHistory, 
    resetGradient
  ]);

  // Handle canvas click during gradient application
  const handleCanvasClick = useCallback((x: number, y: number) => {
    if (activeTool !== 'gradientfill') return;

    // Ignore clicks on UI elements or outside canvas bounds
    if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) return;
    
    if (!isApplying) {
      // First click - start applying gradient
      setApplying(true);
      setPoints({ x, y }, null);
      setHoverEndPoint({ x, y });
      return;
    }
    
    if (startPoint && !endPoint) {
      // Second click - set end point and generate preview
      const newEndPoint = { x, y };
      setPoints(startPoint, newEndPoint);
      setHoverEndPoint(null);
      generatePreview(startPoint, newEndPoint);
      return;
    }
    
    // If we already have both points, treat this as a confirmation click
    // (unless it's on a control point - that would be handled by drag logic)
    if (startPoint && endPoint && previewData) {
      applyGradient();
    }
  }, [
    activeTool, 
    isApplying, 
    startPoint, 
    endPoint, 
    previewData,
    canvasWidth,
    canvasHeight,
    setApplying, 
    setPoints,
    setHoverEndPoint,
    generatePreview,
    applyGradient
  ]);

  // Handle mouse move for interactive preview updates
  const handleCanvasMouseMove = useCallback((x: number, y: number) => {
    if (activeTool !== 'gradientfill' || !isApplying || !startPoint) return;
    
    if (!endPoint) {
      // Still dragging to set the end point - update preview with current mouse position
      const currentEndPoint = { x, y };
      setHoverEndPoint(currentEndPoint);
      generatePreview(startPoint, currentEndPoint);
    } else {
      // Both points are set - allow dragging to adjust them
      // For now, we'll regenerate preview if definition changes
      // TODO: Add drag detection for start/end point adjustment
    }
  }, [activeTool, isApplying, startPoint, endPoint, ellipsePoint, setHoverEndPoint, generatePreview]);

  // Cancel gradient (Escape key)
  const cancelGradient = useCallback(() => {
    if (!isApplying) return;
    resetGradient();
  }, [isApplying, resetGradient]);

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (activeTool !== 'gradientfill' || !isApplying) return;
      
      // Prevent default browser behavior for our handled keys
      if (event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        
        if (event.key === 'Enter') {
          applyGradient();
        } else if (event.key === 'Escape') {
          cancelGradient();
        }
      }
    };
    
    // Use capture phase to ensure we handle the event before other handlers
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [activeTool, isApplying, applyGradient, cancelGradient]);
  
  // Reset gradient state when switching tools
  useEffect(() => {
    if (activeTool !== 'gradientfill') {
      resetGradient();
    }
  }, [activeTool, resetGradient]);

  // Regenerate preview when gradient definition changes (while both points are set)
  useEffect(() => {
    const targetEndPoint = endPoint ?? hoverEndPoint;
    if (activeTool === 'gradientfill' && isApplying && startPoint && targetEndPoint) {
      generatePreview(startPoint, targetEndPoint);
    }
  }, [activeTool, isApplying, startPoint, endPoint, ellipsePoint, hoverEndPoint, definition, contiguous, matchChar, matchColor, matchBgColor, generatePreview]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetGradient();
    };
  }, [resetGradient]);
  
  return {
    // State
    isApplying,
    startPoint,
    endPoint,
  hoverEndPoint,
    previewData,
    
    // Actions
    handleCanvasClick,
    handleCanvasMouseMove,
    applyGradient,
    cancelGradient,
    
    // Computed properties
    canApply: isApplying && startPoint && endPoint && previewData && previewData.size > 0,
    fillAreaSize: previewData?.size || 0
  };
};