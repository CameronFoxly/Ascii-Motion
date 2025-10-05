import { useCallback, useEffect } from 'react';
import { useAsciiBoxStore } from '../stores/asciiBoxStore';
import { useToolStore } from '../stores/toolStore';
import { useCanvasStore } from '../stores/canvasStore';
import { useAnimationStore } from '../stores/animationStore';
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
    pushToHistory
  } = useToolStore();
  
  const {
    cells,
    setCanvasData
  } = useCanvasStore();
  
  const { currentFrameIndex } = useAnimationStore();
  
  // Get current style definition
  const currentStyle = BOX_DRAWING_STYLES.find(s => s.id === selectedStyleId) 
    || BOX_DRAWING_STYLES[0];
  
  // Open panel when tool becomes active
  useEffect(() => {
    if (activeTool === 'asciibox' && !isPanelOpen) {
      openPanel();
    }
  }, [activeTool, isPanelOpen, openPanel]);
  
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
  const handleCanvasClick = useCallback((x: number, y: number, shiftKey: boolean) => {
    if (activeTool !== 'asciibox') return;
    
    // Start applying if first interaction
    if (!isApplying) {
      startApplying();
      // Save original canvas state
      const store = useAsciiBoxStore.getState();
      store.originalData = new Map(cells);
    }
    
    if (drawingMode === 'rectangle') {
      if (!rectangleStart) {
        setRectangleStart({ x, y });
        setRectangleEnd(null);
      } else {
        setRectangleEnd({ x, y });
        // Generate rectangle preview
        const { previewData: newPreview, drawnCells: newDrawn } = generateBoxRectangle(
          rectangleStart,
          { x, y },
          currentStyle,
          cells,
          selectedColor,
          selectedBgColor
        );
        updatePreview(newPreview, newDrawn);
      }
    } else if (drawingMode === 'freedraw') {
      // Handle shift+click line drawing
      if (shiftKey && lastPoint) {
        // Draw line from lastPoint to current point
        const lineCells = getLineCells(lastPoint, { x, y });
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
    continueDrawing
  ]);
  
  // Handle mouse drag for free draw mode
  const handleCanvasDrag = useCallback((x: number, y: number) => {
    if (activeTool !== 'asciibox' || drawingMode !== 'freedraw' || !isDrawing) return;
    
    // Add cell at drag position
    const newDrawnCells = new Set(drawnCells);
    const { char, affectedCells } = addBoxCell(
      x, y,
      newDrawnCells,
      currentStyle,
      cells,
      selectedColor,
      selectedBgColor
    );
    
    // Update preview
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
  }, [
    activeTool,
    drawingMode,
    isDrawing,
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
    
    const key = `${x},${y}`;
    if (drawnCells.has(key)) {
      const newDrawnCells = new Set(drawnCells);
      const affectedCells = eraseBoxCell(x, y, newDrawnCells, currentStyle, cells);
      
      // Update preview
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
  }, [
    activeTool,
    drawingMode,
    isDrawing,
    drawnCells,
    previewData,
    cells,
    currentStyle,
    selectedColor,
    selectedBgColor,
    updatePreview
  ]);
  
  // Start drawing (mouse down)
  const handleMouseDown = useCallback((x: number, y: number) => {
    if (activeTool !== 'asciibox') return;
    
    if (drawingMode === 'freedraw' || drawingMode === 'erase') {
      startDrawing({ x, y });
    }
  }, [activeTool, drawingMode, startDrawing]);
  
  // End drawing (mouse up)
  const handleMouseUp = useCallback(() => {
    if (activeTool !== 'asciibox') return;
    
    endDrawing();
  }, [activeTool, endDrawing]);
  
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
    
    // Actions
    setSelectedStyle,
    setDrawingMode,
    handleCanvasClick,
    handleCanvasDrag,
    handleEraseDrag,
    handleMouseDown,
    handleMouseUp,
    applyPreview,
    cancelPreview,
    closePanel
  };
};
