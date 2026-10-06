import { useCallback, useRef } from 'react';
import { useCanvasContext, useCanvasDimensions } from '../contexts/CanvasContext';
import { useToolStore } from '../stores/toolStore';
import { useCanvasStore } from '../stores/canvasStore';
import { useCanvasSelection } from './useCanvasSelection';
import { useCanvasLassoSelection } from './useCanvasLassoSelection';
import { useCanvasMagicWandSelection } from './useCanvasMagicWandSelection';
import { useCanvasDragAndDrop } from './useCanvasDragAndDrop';
import { useTextTool } from './useTextTool';
import { useGradientFillTool } from './useGradientFillTool';
import { useCanvasState } from './useCanvasState';
import { useAnimationStore } from '../stores/animationStore';
import { useAsciiTypeTool } from './useAsciiTypeTool';
import { useAsciiTypeStore } from '../stores/asciiTypeStore';
import { useAsciiBoxTool } from './useAsciiBoxTool';
import { layerTransformHandlersRef } from './useLayerTransformTool';
import type { Tool } from '../types';

export interface MouseHandlers {
  handleMouseDown: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseMove: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseUp: (event?: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseLeave: () => void;
  handleContextMenu: (event: React.MouseEvent<HTMLCanvasElement>) => void;
}

/**
 * Hook for canvas mouse event handling
 * Routes mouse events to appropriate tool handlers
 */
export const useCanvasMouseHandlers = (): MouseHandlers => {
  // PERF FIX: Use targeted selectors instead of broad useToolStore()/useCanvasStore().
  // Previously: `const { activeTool, clearSelection, ... } = useToolStore();`
  // Broad subscriptions caused re-renders on ANY store field change.
  const activeTool = useToolStore((s) => s.activeTool);
  const clearCanvasSelection = useToolStore((s) => s.clearSelection);
  const clearLassoSelection = useToolStore((s) => s.clearLassoSelection);
  const isPlaybackMode = useToolStore((s) => s.isPlaybackMode);
  const clearTimelineSelection = useAnimationStore((state) => state.clearSelection);
  const { canvasRef, altKeyDown, ctrlKeyDown, setIsDrawing, setMouseButtonDown, setHoveredCell, pasteMode, updatePastePosition, startPasteDrag, stopPasteDrag, cancelPasteMode, commitPaste } = useCanvasContext();
  const { getGridCoordinates } = useCanvasDimensions();
  // PERF FIX: Targeted selectors for canvasStore — `cells` changes on every draw stroke;
  // broad subscription would cascade through all useCallback deps even for unrelated fields.
  const width = useCanvasStore((s) => s.width);
  const height = useCanvasStore((s) => s.height);
  const cells = useCanvasStore((s) => s.cells);
  const setCanvasData = useCanvasStore((s) => s.setCanvasData);
  const { moveState, commitMove, isPointInEffectiveSelection, selectionMode } = useCanvasState();
  
  // Throttle hover updates to reduce re-renders - only update if cell actually changed
  const lastHoveredCellRef = useRef<{ x: number; y: number } | null>(null);
  
  // Import tool hooks
  const selectionHandlers = useCanvasSelection();
  const lassoSelectionHandlers = useCanvasLassoSelection();
  const magicWandSelectionHandlers = useCanvasMagicWandSelection();
  const dragAndDropHandlers = useCanvasDragAndDrop();
  const textToolHandlers = useTextTool();
  const gradientFillHandlers = useGradientFillTool();
  const asciiBoxHandlers = useAsciiBoxTool();
  // PERF FIX: Don't call useLayerTransformTool() here — it adds ~49 React hooks
  // to every CanvasGrid render even when the tool isn't active. Instead, read
  // from a shared ref that LayerTransformOverlay populates when mounted.
  const {
    previewGrid: asciiPreviewGrid,
    previewDimensions: asciiPreviewDimensions,
    previewOrigin: asciiPreviewOrigin,
    isPreviewPlaced: asciiIsPreviewPlaced,
    setPreviewOrigin: setAsciiPreviewOrigin,
    setPreviewPlaced: setAsciiPreviewPlaced,
  } = useAsciiTypeTool();
  const startAsciiDrag = useAsciiTypeStore((state) => state.startDrag);
  const updateAsciiDrag = useAsciiTypeStore((state) => state.updateDrag);
  const endAsciiDrag = useAsciiTypeStore((state) => state.endDrag);
  const asciiDragState = useAsciiTypeStore((state) => state.dragState);

  // Determine effective tool (Alt key overrides with eyedropper for drawing tools, Ctrl key overrides with eraser for pencil only)
  const drawingTools: ReadonlyArray<Tool> = ['pencil', 'eraser', 'paintbucket', 'rectangle', 'ellipse'];
  const shouldAllowEyedropperOverride = drawingTools.includes(activeTool);
  let effectiveTool = activeTool;
  if (ctrlKeyDown && activeTool === 'pencil') {
    effectiveTool = 'eraser';
  } else if (altKeyDown && shouldAllowEyedropperOverride) {
    effectiveTool = 'eyedropper';
  }

  // Utility to get grid coordinates from mouse event (screen-space)
  const getGridCoordinatesFromEvent = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    return getGridCoordinates(mouseX, mouseY, rect, width, height);
  }, [getGridCoordinates, width, height, canvasRef]);

  const clampAsciiOrigin = useCallback(
    (origin: { x: number; y: number }) => {
      if (!asciiPreviewDimensions) {
        return origin;
      }

      const maxX = Math.max(0, width - asciiPreviewDimensions.width);
      const maxY = Math.max(0, height - asciiPreviewDimensions.height);

      return {
        x: Math.min(Math.max(origin.x, 0), maxX),
        y: Math.min(Math.max(origin.y, 0), maxY),
      };
    },
    [asciiPreviewDimensions, width, height]
  );

  // Helper to check if a point is inside the ASCII preview bounds
  const isPointInAsciiPreview = useCallback(
    (x: number, y: number) => {
      if (!asciiPreviewOrigin || !asciiPreviewDimensions) return false;
      
      return (
        x >= asciiPreviewOrigin.x &&
        x < asciiPreviewOrigin.x + asciiPreviewDimensions.width &&
        y >= asciiPreviewOrigin.y &&
        y < asciiPreviewOrigin.y + asciiPreviewDimensions.height
      );
    },
    [asciiPreviewOrigin, asciiPreviewDimensions]
  );

  // Prevent context menu on right-click
  const handleContextMenu = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
  }, []);

  // Clean up on mouse leave
  const handleMouseLeave = useCallback(() => {
    setIsDrawing(false);
    setMouseButtonDown(false);

    // Finish an in-progress text box drag using the last known cell
    if (activeTool === 'text') {
      textToolHandlers.handleTextToolMouseUp(lastHoveredCellRef.current);
    }

    lastHoveredCellRef.current = null; // Reset ref
    setHoveredCell(null); // Clear hover state when mouse leaves canvas
    
    // Reset pencil position to prevent unwanted connecting lines
    const { setPencilLastPosition, clearLinePreview } = useToolStore.getState();
    setPencilLastPosition(null);
    clearLinePreview(); // Clear line preview when mouse leaves canvas
  }, [setIsDrawing, setMouseButtonDown, setHoveredCell, activeTool, textToolHandlers]);

  // Route mouse down to appropriate tool handler based on effective tool
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Block mouse interactions during playback
    if (isPlaybackMode) {
      return;
    }

    const { selectedFrameIndices } = useAnimationStore.getState();
    if (selectedFrameIndices.size > 1) {
      clearTimelineSelection();
    }

    // Handle paste mode interactions first
    if (pasteMode.isActive && pasteMode.preview) {
      const { x, y } = getGridCoordinatesFromEvent(event);
      
      if (event.button === 0) { // Left click
        // Check if click is inside the paste preview bounds
        const { position, bounds } = pasteMode.preview;
        const previewMinX = position.x + bounds.minX;
        const previewMaxX = position.x + bounds.maxX;
        const previewMinY = position.y + bounds.minY;
        const previewMaxY = position.y + bounds.maxY;
        
        const isInsidePreview = x >= previewMinX && x <= previewMaxX && 
                               y >= previewMinY && y <= previewMaxY;
        
        if (isInsidePreview) {
          // Start dragging the paste preview
          startPasteDrag({ x, y });
        } else {
          // Click outside preview commits the paste
          const pastedData = commitPaste();
          if (pastedData) {
            // Apply the paste to canvas
            const currentCells = new Map(cells);
            pastedData.forEach((cell, key) => {
              currentCells.set(key, cell);
            });
            setCanvasData(currentCells);
          }
        }
      } else if (event.button === 2) { // Right click  
        // Cancel paste mode
        event.preventDefault();
        cancelPasteMode();
      }
      return;
    }

    // Handle selection move mode interactions ONLY for existing move operations
    // (Don't interfere with clicks that start new move operations)
    if (moveState && (activeTool === 'select' || activeTool === 'lasso') && selectionMode === 'moving') {
      const { x, y } = getGridCoordinatesFromEvent(event);
      
      if (event.button === 0) { // Left click
        // Check if click is inside the selection being moved
        const isInsideSelection = activeTool === 'select' 
          ? isPointInEffectiveSelection(x, y)
          : lassoSelectionHandlers.isPointInLassoSelection(x, y);
          
        if (isInsideSelection) {
          // Click inside selection - let normal selection handler manage it
          // (This will continue the move operation)
        } else {
          // Click outside selection commits the move
          commitMove();
          if (activeTool === 'select') {
            clearCanvasSelection();
          } else {
            clearLassoSelection();
          }
          return;
        }
      }
    }

    // Normal tool handling when not in paste mode
    switch (effectiveTool) {
      case 'select':
        selectionHandlers.handleSelectionMouseDown(event);
        break;
      case 'lasso':
        lassoSelectionHandlers.handleLassoMouseDown(event);
        break;
      case 'magicwand':
        magicWandSelectionHandlers.handleMagicWandMouseDown(event);
        break;
      case 'rectangle':
      case 'ellipse':
        // Handled by InteractiveVectorShapeOverlay
        break;
      case 'text': {
        const textCoords = getGridCoordinatesFromEvent(event);
        if (event.button === 0) {
          textToolHandlers.handleTextToolMouseDown(textCoords.x, textCoords.y);
          setMouseButtonDown(true);
        }
        break;
      }
      case 'gradientfill': {
        const gradientCoords = getGridCoordinatesFromEvent(event);
        gradientFillHandlers.handleCanvasClick(gradientCoords.x, gradientCoords.y);
        break;
      }
      case 'asciibox': {
        const boxCoords = getGridCoordinatesFromEvent(event);
        // Only handle click on mouse down - handleMouseDown will be called from mouse move if dragging starts
        asciiBoxHandlers.handleCanvasClick(boxCoords.x, boxCoords.y);
        break;
      }
      case 'layertransform': {
        const transformCoords = getGridCoordinatesFromEvent(event);
        layerTransformHandlersRef.current.handleMouseDown(transformCoords.x, transformCoords.y);
        break;
      }
      case 'asciitype': {
        if (!asciiPreviewGrid || !asciiPreviewDimensions) {
          break;
        }

        const coords = getGridCoordinatesFromEvent(event);

        // Right-click resets placement
        if (event.button === 2) {
          event.preventDefault();
          setAsciiPreviewPlaced(false);
          break;
        }

        if (event.button === 0) {
          // If already placed and clicking inside the preview, start dragging
          if (asciiIsPreviewPlaced && isPointInAsciiPreview(coords.x, coords.y)) {
            startAsciiDrag(coords);
            setMouseButtonDown(true);
          } else {
            // First placement or clicking outside - position and place
            const origin = clampAsciiOrigin(coords);
            if (!asciiPreviewOrigin || asciiPreviewOrigin.x !== origin.x || asciiPreviewOrigin.y !== origin.y) {
              setAsciiPreviewOrigin(origin);
            }
            setAsciiPreviewPlaced(true);
          }
        }
        break;
      }
      default:
        // For basic drawing tools (pencil, eraser, eyedropper, paintbucket)
        dragAndDropHandlers.handleDrawingMouseDown(event, effectiveTool);
        break;
    }
  }, [
    isPlaybackMode,
    clearTimelineSelection,
    effectiveTool,
    activeTool,
    pasteMode,
    moveState,
  selectionMode,
    getGridCoordinatesFromEvent,
    startPasteDrag,
    cancelPasteMode,
    commitPaste,
    cells,
    setCanvasData,
    isPointInEffectiveSelection,
    commitMove,
    clearCanvasSelection,
    clearLassoSelection,
    selectionHandlers,
    lassoSelectionHandlers,
    magicWandSelectionHandlers,
    dragAndDropHandlers,
    textToolHandlers,
    gradientFillHandlers,
    asciiBoxHandlers,
    asciiPreviewGrid,
    asciiPreviewDimensions,
    asciiIsPreviewPlaced,
    clampAsciiOrigin,
    asciiPreviewOrigin,
    setAsciiPreviewOrigin,
    setAsciiPreviewPlaced,
    isPointInAsciiPreview,
    startAsciiDrag,
    setMouseButtonDown,
  ]);

  // Route mouse move to appropriate tool handler
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Block mouse interactions during playback
    if (isPlaybackMode) {
      return;
    }

    // Update hovered cell for all tools (only if cell actually changed to reduce re-renders)
    const { x, y } = getGridCoordinatesFromEvent(event);
    const lastCell = lastHoveredCellRef.current;
    if (!lastCell || lastCell.x !== x || lastCell.y !== y) {
      lastHoveredCellRef.current = { x, y };
      setHoveredCell({ x, y });
    }

    // Handle paste mode interactions first
    if (pasteMode.isActive) {
      // Only update position if we're currently dragging
      if (pasteMode.isDragging) {
        const { x, y } = getGridCoordinatesFromEvent(event);
        updatePastePosition({ x, y });
      }
      return;
    }

    // Normal tool handling when not in paste mode
    switch (effectiveTool) {
      case 'select':
        selectionHandlers.handleSelectionMouseMove(event);
        break;
      case 'lasso':
        lassoSelectionHandlers.handleLassoMouseMove(event);
        break;
      case 'magicwand':
        magicWandSelectionHandlers.handleMagicWandMouseMove(event);
        break;
      case 'text': {
        const textCoords = getGridCoordinatesFromEvent(event);
        textToolHandlers.handleTextToolMouseMove(textCoords.x, textCoords.y);
        break;
      }
      case 'rectangle':
      case 'ellipse':
        // Handled by InteractiveVectorShapeOverlay
        break;
      case 'gradientfill': {
        const gradientCoords = getGridCoordinatesFromEvent(event);
        gradientFillHandlers.handleCanvasMouseMove(gradientCoords.x, gradientCoords.y);
        break;
      }
      case 'asciibox': {
        const boxCoords = getGridCoordinatesFromEvent(event);
        // Handle hover for shift+click line preview and rectangle preview
        asciiBoxHandlers.handleMouseHover(boxCoords.x, boxCoords.y);
        
        // Check if we should start drawing (user moved mouse after mouse down)
        // This differentiates between click (no move) and drag (with move)
        if (!asciiBoxHandlers.isDrawing && event.buttons === 1) {
          asciiBoxHandlers.handleMouseDown(boxCoords.x, boxCoords.y);
        }
        
        // Handle free draw dragging
        asciiBoxHandlers.handleCanvasDrag(boxCoords.x, boxCoords.y);
        // Handle erase dragging
        asciiBoxHandlers.handleEraseDrag(boxCoords.x, boxCoords.y);
        break;
      }
      case 'layertransform': {
        const transformCoords = getGridCoordinatesFromEvent(event);
        layerTransformHandlersRef.current.handleMouseMove(transformCoords.x, transformCoords.y);
        break;
      }
      case 'asciitype':
        // Handle drag movement if actively dragging
        if (asciiDragState) {
          const coords = getGridCoordinatesFromEvent(event);
          // Calculate new origin by adding the drag offset to the original origin
          const dragOffset = {
            x: coords.x - asciiDragState.pointerStart.x,
            y: coords.y - asciiDragState.pointerStart.y,
          };
          const newOrigin = {
            x: asciiDragState.originAtStart.x + dragOffset.x,
            y: asciiDragState.originAtStart.y + dragOffset.y,
          };
          const clamped = clampAsciiOrigin(newOrigin);
          updateAsciiDrag(clamped);
        }
        // Otherwise preview follows cursor via placement hook
        break;
      default:
        // For basic drawing tools (pencil, eraser, eyedropper, paintbucket)
        dragAndDropHandlers.handleDrawingMouseMove(event, effectiveTool);
        break;
    }
  }, [
    isPlaybackMode,
    effectiveTool,
    pasteMode,
    getGridCoordinatesFromEvent,
    setHoveredCell,
    updatePastePosition,
    selectionHandlers,
    lassoSelectionHandlers,
    magicWandSelectionHandlers,
    dragAndDropHandlers,
    gradientFillHandlers,
    asciiDragState,
    clampAsciiOrigin,
    updateAsciiDrag,
    asciiBoxHandlers,
    textToolHandlers,
  ]);

  // Route mouse up to appropriate tool handler
  const handleMouseUp = useCallback((event?: React.MouseEvent<HTMLCanvasElement>) => {
    // Block mouse interactions during playback
    if (isPlaybackMode) {
      return;
    }

    // Handle paste mode
    if (pasteMode.isActive && pasteMode.isDragging) {
      stopPasteDrag();
      return;
    }

    // Normal tool handling when not in paste mode
    switch (activeTool) {
      case 'select':
        selectionHandlers.handleSelectionMouseUp();
        break;
      case 'lasso':
        lassoSelectionHandlers.handleLassoMouseUp();
        break;
      case 'magicwand':
        magicWandSelectionHandlers.handleMagicWandMouseUp();
        break;
      case 'text': {
        const textCoords = event ? getGridCoordinatesFromEvent(event) : lastHoveredCellRef.current;
        textToolHandlers.handleTextToolMouseUp(textCoords);
        setMouseButtonDown(false);
        break;
      }
      case 'rectangle':
      case 'ellipse':
        // Handled by InteractiveVectorShapeOverlay
        break;
      case 'asciibox':
        asciiBoxHandlers.handleMouseUp();
        break;
      case 'layertransform':
        layerTransformHandlersRef.current.handleMouseUp();
        break;
      case 'asciitype':
        // End drag if we're dragging
        if (asciiDragState) {
          endAsciiDrag();
        }
        setMouseButtonDown(false);
        break;
      default:
          // For basic drawing tools, we need to manually stop drawing since they don't have explicit mouse up handlers
          setIsDrawing(false);
          setMouseButtonDown(false);
          // Finalize brush stroke (if a canvas_edit was initiated at mousedown)
          if (['pencil','eraser','paintbucket','eyedropper'].includes(activeTool)) {
            const { finalizeCanvasHistory } = useToolStore.getState();
            finalizeCanvasHistory(new Map(useCanvasStore.getState().cells));
          }
          
          // Reset pencil position only for non-pencil tools to prevent unwanted connecting lines
          // Pencil position will be managed separately to support shift+click line drawing
          if (activeTool !== 'pencil') {
            const { setPencilLastPosition } = useToolStore.getState();
            setPencilLastPosition(null);
          }
          break;
    }
  }, [
    isPlaybackMode,
    activeTool,
    pasteMode,
    stopPasteDrag,
    selectionHandlers,
    lassoSelectionHandlers,
    magicWandSelectionHandlers,
    setIsDrawing,
    setMouseButtonDown,
    asciiDragState,
    endAsciiDrag,
    asciiBoxHandlers,
    textToolHandlers,
    getGridCoordinatesFromEvent,
  ]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleContextMenu,
    handleMouseLeave,
  };
};