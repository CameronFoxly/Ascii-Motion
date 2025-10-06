import { useCallback, useEffect } from 'react';
import { useAsciiBoxStore } from '../stores/asciiBoxStore';
import { useToolStore } from '../stores/toolStore';
import { useCanvasStore } from '../stores/canvasStore';
import { useAnimationStore } from '../stores/animationStore';
import { useCanvasContext } from '../contexts/CanvasContext';
import { BOX_DRAWING_STYLES } from '../constants/boxDrawingStyles';
import {
  generateBoxRectangle,
  addBoxCell,
  eraseBoxCell,
  detectConnections,
  getBoxDrawingCharacter,
  getLineCells
} from '../utils/boxDrawingEngine';
import type { Cell } from '../types';
import type { CanvasHistoryAction } from '../types';

/**
 * Custom hook for handling ASCII Box Drawing tool operations
 * Integrates canvas interaction, box drawing engine, and undo/redo
 */
export const useAsciiBoxTool = () => {
  const {
    isPanelOpen,
    selectedStyleId,
    drawingMode,
    isApplying,
    previewData,
    originalData,
    drawnCells,
    rectangleStart,
    rectangleEnd,
    rectanglePreview,
    isDrawing,
    lastPoint,
    openPanel,
    closePanel,
    setSelectedStyle,
    setDrawingMode,
    startApplying,
    updatePreview,
    setRectangleStart,
    setRectangleEnd,
    setRectanglePreview,
    cancelRectanglePreview,
    startDrawing,
    continueDrawing,
    endDrawing,
    reset
  } = useAsciiBoxStore();
  
  const { 
    activeTool,
    selectedColor,
    selectedBgColor,
    setActiveTool,
    pushToHistory,
    setLinePreview,
    clearLinePreview
  } = useToolStore();
  
  const {
    cells,
    setCanvasData
  } = useCanvasStore();
  
  const { shiftKeyDown } = useCanvasContext();
  
  const { currentFrameIndex } = useAnimationStore();
  
  // Get current style definition
  const currentStyle = BOX_DRAWING_STYLES.find(s => s.id === selectedStyleId) 
    || BOX_DRAWING_STYLES[0];
  
  // Debug: Log shift key state changes
  useEffect(() => {
    console.log('[ASCII Box] shiftKeyDown changed:', shiftKeyDown, 'lastPoint:', lastPoint, 'drawingMode:', drawingMode);
  }, [shiftKeyDown, lastPoint, drawingMode]);
  
  // Open panel when tool becomes active
  useEffect(() => {
    if (activeTool === 'asciibox' && !isPanelOpen) {
      openPanel();
    }
  }, [activeTool, isPanelOpen, openPanel]);
  
  // Cancel preview when switching away from ASCII Box tool
  useEffect(() => {
    if (activeTool !== 'asciibox' && isApplying) {
      // User switched tools while in preview mode - cancel and cleanup
      reset();
      closePanel();
    }
  }, [activeTool, isApplying, reset, closePanel]);
  
  // Regenerate preview when style changes mid-drawing
  useEffect(() => {
    if (!isApplying || !drawnCells.size) return;
    
    // Recalculate all preview cells with new style
    const newPreview = new Map<string, Cell>();
    
    drawnCells.forEach(key => {
      const [x, y] = key.split(',').map(Number);
      const connections = detectConnections(x, y, drawnCells, currentStyle, cells);
      const char = getBoxDrawingCharacter(connections, currentStyle);
      
      newPreview.set(key, {
        char,
        color: selectedColor,
        bgColor: selectedBgColor
      });
    });
    
    updatePreview(newPreview, drawnCells);
  }, [selectedStyleId]); // Only trigger on style change
  
  // Handle canvas click - depends on mode
  const handleCanvasClick = useCallback((x: number, y: number) => {
    if (activeTool !== 'asciibox') return;
    
    // Clear line preview when clicking
    clearLinePreview();
    
    // Start applying if first interaction
    if (!isApplying) {
      startApplying();
      // Save original canvas state
      const store = useAsciiBoxStore.getState();
      store.originalData = new Map(cells);
    }
    
    if (drawingMode === 'rectangle') {
      if (!rectangleStart) {
        // First click - set starting corner
        setRectangleStart({ x, y });
        setRectangleEnd(null);
        setRectanglePreview(null);
      } else {
        // Second click - commit the rectangle and merge with existing preview
        const { previewData: rectPreview, drawnCells: rectDrawn } = generateBoxRectangle(
          rectangleStart,
          { x, y },
          currentStyle,
          cells,
          selectedColor,
          selectedBgColor
        );
        
        // Merge with existing drawn cells and preview
        const newDrawnCells = new Set([...drawnCells, ...rectDrawn]);
        const newPreview = new Map(previewData || new Map());
        
        // Update all affected cells with new connections
        newDrawnCells.forEach(key => {
          const [cx, cy] = key.split(',').map(Number);
          const connections = detectConnections(cx, cy, newDrawnCells, currentStyle, cells);
          const cellChar = getBoxDrawingCharacter(connections, currentStyle);
          
          newPreview.set(key, {
            char: cellChar,
            color: selectedColor,
            bgColor: selectedBgColor
          });
        });
        
        updatePreview(newPreview, newDrawnCells);
        
        // Reset for next rectangle
        setRectangleStart(null);
        setRectangleEnd(null);
        setRectanglePreview(null);
      }
    } else if (drawingMode === 'freedraw') {
      console.log('[ASCII Box] Free draw mode click', { x, y, shiftKeyDown, lastPoint });
      
      // Handle shift+click line drawing
      if (shiftKeyDown && lastPoint) {
        console.log('[ASCII Box] Shift+click detected! Drawing line from', lastPoint, 'to', { x, y });
        // Draw line from lastPoint to current point
        const lineCells = getLineCells(lastPoint, { x, y });
        console.log('[ASCII Box] Line cells generated:', lineCells.length, 'cells');
        const newDrawnCells = new Set(drawnCells);
        const newPreview = new Map(previewData || new Map());
        
        // Add all cells along the line
        lineCells.forEach(point => {
          const { char, affectedCells } = addBoxCell(
            point.x, point.y,
            newDrawnCells,
            currentStyle,
            cells,
            selectedColor,
            selectedBgColor
          );
          
          // Update preview for all affected cells
          affectedCells.forEach(cellKey => {
            const [cx, cy] = cellKey.split(',').map(Number);
            const connections = detectConnections(cx, cy, newDrawnCells, currentStyle, cells);
            const cellChar = getBoxDrawingCharacter(connections, currentStyle);
            
            newPreview.set(cellKey, {
              char: cellChar,
              color: selectedColor,
              bgColor: selectedBgColor
            });
          });
        });
        
        updatePreview(newPreview, newDrawnCells);
        continueDrawing({ x, y });
      } else {
        // Single click - add one cell
        const newDrawnCells = new Set(drawnCells);
        const { char, affectedCells } = addBoxCell(
          x, y,
          newDrawnCells,
          currentStyle,
          cells,
          selectedColor,
          selectedBgColor
        );
        
        // Update preview with new and affected cells
        const newPreview = new Map(previewData || new Map());
        affectedCells.forEach(cellKey => {
          const [cx, cy] = cellKey.split(',').map(Number);
          const connections = detectConnections(cx, cy, newDrawnCells, currentStyle, cells);
          const cellChar = getBoxDrawingCharacter(connections, currentStyle);
          
          newPreview.set(cellKey, {
            char: cellChar,
            color: selectedColor,
            bgColor: selectedBgColor
          });
        });
        
        updatePreview(newPreview, newDrawnCells);
        continueDrawing({ x, y });
      }
    } else if (drawingMode === 'erase') {
      // Erase mode - only erase cells in current session
      const key = `${x},${y}`;
      if (drawnCells.has(key)) {
        const newDrawnCells = new Set(drawnCells);
        const affectedCells = eraseBoxCell(x, y, newDrawnCells, currentStyle, cells);
        
        // Update preview - remove erased cell and update neighbors
        const newPreview = new Map(previewData || new Map());
        newPreview.delete(key);
        
        affectedCells.forEach(cellKey => {
          const [cx, cy] = cellKey.split(',').map(Number);
          const connections = detectConnections(cx, cy, newDrawnCells, currentStyle, cells);
          const cellChar = getBoxDrawingCharacter(connections, currentStyle);
          
          newPreview.set(cellKey, {
            char: cellChar,
            color: selectedColor,
            bgColor: selectedBgColor
          });
        });
        
        updatePreview(newPreview, newDrawnCells);
      }
    }
  }, [
    activeTool,
    isApplying,
    drawingMode,
    rectangleStart,
    lastPoint,
    drawnCells,
    previewData,
    cells,
    currentStyle,
    selectedColor,
    selectedBgColor,
    startApplying,
    setRectangleStart,
    setRectangleEnd,
    updatePreview,
    continueDrawing,
    shiftKeyDown,
    clearLinePreview
  ]);
  
  // Handle mouse drag for free draw mode
  const handleCanvasDrag = useCallback((x: number, y: number) => {
    if (activeTool !== 'asciibox' || drawingMode !== 'freedraw' || !isDrawing) return;
    
    // Gap filling: check if we need to fill gaps between last point and current point
    const cellsToAdd: { x: number; y: number }[] = [];
    
    if (lastPoint && (Math.abs(x - lastPoint.x) > 1 || Math.abs(y - lastPoint.y) > 1)) {
      // Large distance - fill the gap with a line
      const lineCells = getLineCells(lastPoint, { x, y });
      cellsToAdd.push(...lineCells);
    } else {
      // Normal drag - just add current cell
      cellsToAdd.push({ x, y });
    }
    
    // Add all cells (either just current, or a line for gap filling)
    const newDrawnCells = new Set(drawnCells);
    const newPreview = new Map(previewData || new Map());
    
    cellsToAdd.forEach(point => {
      const { char, affectedCells } = addBoxCell(
        point.x, point.y,
        newDrawnCells,
        currentStyle,
        cells,
        selectedColor,
        selectedBgColor
      );
      
      // Update preview for all affected cells
      affectedCells.forEach(cellKey => {
        const [cx, cy] = cellKey.split(',').map(Number);
        const connections = detectConnections(cx, cy, newDrawnCells, currentStyle, cells);
        const cellChar = getBoxDrawingCharacter(connections, currentStyle);
        
        newPreview.set(cellKey, {
          char: cellChar,
          color: selectedColor,
          bgColor: selectedBgColor
        });
      });
    });
    
    updatePreview(newPreview, newDrawnCells);
    continueDrawing({ x, y });
  }, [
    activeTool,
    drawingMode,
    isDrawing,
    lastPoint,
    drawnCells,
    previewData,
    cells,
    currentStyle,
    selectedColor,
    selectedBgColor,
    updatePreview,
    continueDrawing
  ]);
  
  // Handle erase drag
  const handleEraseDrag = useCallback((x: number, y: number) => {
    if (activeTool !== 'asciibox' || drawingMode !== 'erase' || !isDrawing) return;
    
    // Gap filling: check if we need to fill gaps between last point and current point
    const cellsToErase: { x: number; y: number }[] = [];
    
    if (lastPoint && (Math.abs(x - lastPoint.x) > 1 || Math.abs(y - lastPoint.y) > 1)) {
      // Large distance - fill the gap with a line
      const lineCells = getLineCells(lastPoint, { x, y });
      cellsToErase.push(...lineCells);
    } else {
      // Normal drag - just erase current cell
      cellsToErase.push({ x, y });
    }
    
    // Erase all cells (either just current, or a line for gap filling)
    const newDrawnCells = new Set(drawnCells);
    const newPreview = new Map(previewData || new Map());
    
    cellsToErase.forEach(point => {
      const key = `${point.x},${point.y}`;
      if (newDrawnCells.has(key)) {
        const affectedCells = eraseBoxCell(point.x, point.y, newDrawnCells, currentStyle, cells);
        
        // Remove from preview
        newPreview.delete(key);
        
        // Update affected neighboring cells
        affectedCells.forEach(cellKey => {
          const [cx, cy] = cellKey.split(',').map(Number);
          const connections = detectConnections(cx, cy, newDrawnCells, currentStyle, cells);
          const cellChar = getBoxDrawingCharacter(connections, currentStyle);
          
          newPreview.set(cellKey, {
            char: cellChar,
            color: selectedColor,
            bgColor: selectedBgColor
          });
        });
      }
    });
    
    updatePreview(newPreview, newDrawnCells);
    continueDrawing({ x, y });
  }, [
    activeTool,
    drawingMode,
    isDrawing,
    lastPoint,
    drawnCells,
    previewData,
    cells,
    currentStyle,
    selectedColor,
    selectedBgColor,
    updatePreview,
    continueDrawing
  ]);
  
  // Start drawing (mouse down)
  const handleMouseDown = useCallback((x: number, y: number) => {
    if (activeTool !== 'asciibox') return;
    
    // Don't start a new drawing session for shift+click line drawing
    if (shiftKeyDown && lastPoint && drawingMode === 'freedraw') {
      return;
    }
    
    if (drawingMode === 'freedraw' || drawingMode === 'erase') {
      startDrawing({ x, y });
    }
  }, [activeTool, drawingMode, lastPoint, shiftKeyDown, startDrawing]);
  
  // End drawing (mouse up)
  const handleMouseUp = useCallback(() => {
    if (activeTool !== 'asciibox') return;
    
    console.log('[ASCII Box] handleMouseUp - isDrawing:', isDrawing, 'drawingMode:', drawingMode);
    
    // Only end drawing (which clears lastPoint) if we were actually dragging
    // For free draw mode, we want to preserve lastPoint for shift+click line drawing
    if (isDrawing) {
      endDrawing();
    }
  }, [activeTool, isDrawing, drawingMode, endDrawing]);
  
  // Handle mouse hover - show line preview when shift is held, or rectangle preview in rectangle mode
  const handleMouseHover = useCallback((x: number, y: number) => {
    if (activeTool !== 'asciibox') return;
    
    // Debug logging
    console.log('[ASCII Box] handleMouseHover called', {
      x, y,
      drawingMode,
      shiftKeyDown,
      hasLastPoint: !!lastPoint,
      lastPoint,
      isDrawing,
      hasRectangleStart: !!rectangleStart
    });
    
    // Handle rectangle mode live preview
    if (drawingMode === 'rectangle' && rectangleStart && !isDrawing) {
      // Generate live preview of rectangle
      const { previewData: rectPreview } = generateBoxRectangle(
        rectangleStart,
        { x, y },
        currentStyle,
        cells,
        selectedColor,
        selectedBgColor
      );
      setRectanglePreview(rectPreview);
      clearLinePreview();
      return;
    } else if (rectanglePreview) {
      // Clear rectangle preview if not in rectangle preview mode
      setRectanglePreview(null);
    }
    
    // Handle free draw mode shift+click line preview
    if (drawingMode === 'freedraw' && shiftKeyDown && lastPoint && !isDrawing) {
      // Generate preview line from last position to current position
      const lineCells = getLineCells(lastPoint, { x, y });
      console.log('[ASCII Box] Setting line preview', { lineCells });
      setLinePreview(lineCells);
    } else {
      // Clear preview when conditions not met
      console.log('[ASCII Box] Clearing line preview - conditions not met');
      clearLinePreview();
    }
  }, [
    activeTool, 
    drawingMode, 
    shiftKeyDown, 
    lastPoint, 
    isDrawing, 
    rectangleStart,
    rectanglePreview,
    currentStyle,
    cells,
    selectedColor,
    selectedBgColor,
    setLinePreview, 
    clearLinePreview,
    setRectanglePreview
  ]);
  
  // Apply preview to canvas
  const applyPreview = useCallback(() => {
    if (!previewData || previewData.size === 0) return;
    
    // Store original for undo
    const originalCells = new Map(cells);
    
    // Apply preview to canvas
    const newCells = new Map(cells);
    previewData.forEach((cell, key) => {
      newCells.set(key, { ...cell });
    });
    
    setCanvasData(newCells);
    
    // Add to history
    const historyAction: CanvasHistoryAction = {
      type: 'canvas_edit',
      timestamp: Date.now(),
      description: `ASCII Box Drawing (${drawingMode} mode, ${currentStyle.name})`,
      data: {
        canvasData: originalCells,
        frameIndex: currentFrameIndex
      }
    };
    
    pushToHistory(historyAction);
    
    // Reset state and switch to pencil
    reset();
    closePanel();
    setActiveTool('pencil');
  }, [
    previewData,
    cells,
    drawingMode,
    currentStyle,
    currentFrameIndex,
    setCanvasData,
    pushToHistory,
    reset,
    closePanel,
    setActiveTool
  ]);
  
  // Cancel preview
  const cancelPreview = useCallback(() => {
    reset();
    closePanel();
    setActiveTool('pencil');
  }, [reset, closePanel, setActiveTool]);
  
  // Handle keyboard shortcuts (Enter to apply, Escape to cancel)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (activeTool !== 'asciibox' || !isApplying) return;
      
      // Prevent default browser behavior for our handled keys
      if (event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        
        if (event.key === 'Enter') {
          applyPreview();
        } else if (event.key === 'Escape') {
          // If in rectangle mode with a start point, cancel just the rectangle preview
          if (drawingMode === 'rectangle' && rectangleStart) {
            cancelRectanglePreview();
          } else {
            // Otherwise cancel the entire preview
            cancelPreview();
          }
        }
      }
    };
    
    // Use capture phase to ensure we handle the event before other handlers
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [activeTool, isApplying, drawingMode, rectangleStart, applyPreview, cancelPreview, cancelRectanglePreview]);
  
  return {
    // State
    isPanelOpen,
    selectedStyleId,
    drawingMode,
    isApplying,
    previewData,
    drawnCells,
    currentStyle,
    rectangleStart,
    rectangleEnd,
    rectanglePreview,
    isDrawing,
    
    // Actions
    setSelectedStyle,
    setDrawingMode,
    handleCanvasClick,
    handleCanvasDrag,
    handleEraseDrag,
    handleMouseDown,
    handleMouseUp,
    handleMouseHover,
    applyPreview,
    cancelPreview,
    closePanel
  };
};
