import { useEffect } from 'react';
import { useToolStore } from '../stores/toolStore';
import { useCanvasContext } from '../contexts/CanvasContext';
import { calculateBrushCells } from '../utils/brushUtils';

/**
 * Hook for calculating and managing hover preview patterns for different tools
 * 
 * This hook monitors the current tool, tool settings, and cursor position to
 * automatically update the canvas hover preview overlay. The preview shows
 * which cells will be affected by the tool action before clicking.
 * 
 * Supported modes:
 * - 'brush': Shows brush pattern based on current size/shape (pencil tool)
 * - 'none': No preview (default for most tools)
 * 
 * Future extensibility:
 * - 'rectangle': Preview rectangle bounds before drawing
 * - 'ellipse': Preview ellipse shape before drawing
 * - 'line': Preview line path from start point to cursor
 * - 'paint-bucket': Preview fill area before applying
 */
export const useHoverPreview = () => {
  const { activeTool, brushSettings } = useToolStore();
  const { hoveredCell, fontMetrics, setHoverPreview, isDrawing } = useCanvasContext();
  const activeBrush = activeTool === 'eraser' ? brushSettings.eraser : brushSettings.pencil;
  
  useEffect(() => {
    // Don't show preview while actively drawing
    if (isDrawing) {
      setHoverPreview({ active: false, mode: 'none', cells: [] });
      return;
    }
    
    // Clear preview when mouse leaves canvas
    if (!hoveredCell) {
      setHoverPreview({ active: false, mode: 'none', cells: [] });
      return;
    }
    
    // Calculate preview based on active tool
    switch (activeTool) {
      case 'pencil':
      case 'eraser': {
        // Calculate brush pattern cells
        const brushCells = calculateBrushCells(
          hoveredCell.x,
          hoveredCell.y,
          activeBrush.size,
          activeBrush.shape,
          fontMetrics.aspectRatio
        );
        
        setHoverPreview({
          active: true,
          mode: activeTool === 'eraser' ? 'eraser-brush' : 'brush',
          cells: brushCells
        });
        break;
      }
      
      // Future tool modes can be added here:
      // case 'rectangle':
      //   if (rectangleStartPoint) {
      //     const cells = calculateRectangleCells(
      //       rectangleStartPoint,
      //       hoveredCell,
      //       rectangleFilled
      //     );
      //     setHoverPreview({ active: true, mode: 'rectangle', cells });
      //   }
      //   break;
      //
      // case 'ellipse':
      //   // Similar pattern for ellipse
      //   break;
      //
      // case 'line':
      //   // Similar pattern for line
      //   break;
      
      default:
        // No hover preview for other tools (selection, eyedropper, etc.)
        setHoverPreview({ active: false, mode: 'none', cells: [] });
    }
  }, [
    hoveredCell, 
    activeTool, 
  activeBrush.size,
  activeBrush.shape,
    fontMetrics.aspectRatio,
    isDrawing,
    setHoverPreview
  ]);
};
