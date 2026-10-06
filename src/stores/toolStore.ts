import { create } from 'zustand';
import type { Tool, ToolState, Selection, LassoSelection, MagicWandSelection, TextToolState, TextBoxRegion, AnyHistoryAction, CanvasHistoryAction, BrushShape, BrushSettings, Cell } from '../types';
import { createCellKey } from '../types';
import { DEFAULT_COLORS } from '../constants';
import { 
  rectangularSelectionToText, 
  lassoSelectionToText, 
  magicWandSelectionToText, 
  writeToOSClipboard 
} from '../utils/clipboardUtils';
import { screenToLocal } from '../utils/layerTransformUtils';
import { 
  createRectSelectionMask,
  updateSelectionFromMask,
  getBoundsFromMask
} from '../utils/selectionUtils';
import { useAsciiTypeStore } from './asciiTypeStore';
import { useCanvasStore } from './canvasStore';
import { useAnimationStore } from './animationStore';
import { usePreviewStore } from './previewStore';

interface ToolStoreState extends ToolState {
  // Rectangular selection state
  selection: Selection;
  
  // Lasso selection state
  lassoSelection: LassoSelection;
  
  // Magic wand selection state
  magicWandSelection: MagicWandSelection;
  
  // Text tool state
  textToolState: TextToolState;
  
  // Pencil tool state for line drawing
  pencilLastPosition: { x: number; y: number } | null;
  
  // Shift+click line preview state
  linePreview: {
    active: boolean;
    points: { x: number; y: number }[];
  };
  
  // Shape preview state for rectangle/ellipse tools (separate from selection)
  shapePreview: {
    active: boolean;
    tool: 'rectangle' | 'ellipse' | null;
    start: { x: number; y: number };
    end: { x: number; y: number };
  };
  
  // Clipboard for copy/paste
  clipboard: Map<string, Cell> | null;
  clipboardOriginalPosition: { x: number; y: number } | null;
  activeClipboardType: 'rectangle' | 'lasso' | 'magicwand' | null;
  
  // Lasso clipboard for copy/paste
  lassoClipboard: Map<string, Cell> | null;
  lassoClipboardOriginalPosition: { x: number; y: number } | null;
  
  // Magic wand clipboard for copy/paste
  magicWandClipboard: Map<string, Cell> | null;
  magicWandClipboardOriginalPosition: { x: number; y: number } | null;
  
  // Enhanced history for undo/redo
  historyStack: AnyHistoryAction[];
  historyPosition: number; // Current position in history stack (-1 = no history)
  maxHistorySize: number;
  isProcessingHistory: boolean; // Flag to prevent auto-save during undo/redo
  
  // Animation playback state
  isPlaybackMode: boolean;
  
  // Brush size preview overlay state
  brushSizePreviewVisible: boolean;
  brushSizePreviewTimerRef: NodeJS.Timeout | null;

  // Layer Transform tool auto-keyframe mode
  layerTransformAutoKeyframe: boolean;
  
  // Actions
  setActiveTool: (tool: Tool) => void;
  setSelectedChar: (char: string) => void;
  setSelectedColor: (color: string) => void;
  setSelectedBgColor: (color: string) => void;
  setBrushSize: (size: number, tool?: 'pencil' | 'eraser') => void;
  setBrushShape: (shape: BrushShape, tool?: 'pencil' | 'eraser') => void;
  getBrushSettings: (tool?: 'pencil' | 'eraser') => BrushSettings;
  setRectangleFilled: (filled: boolean) => void;
  setPaintBucketContiguous: (contiguous: boolean) => void;
  setMagicWandContiguous: (contiguous: boolean) => void;
  
  // Multi-layer selection operations
  selectionAffectsAllLayers: boolean;
  setSelectionAffectsAllLayers: (value: boolean) => void;
  
  // Brush size preview overlay actions
  showBrushSizePreview: () => void;
  hideBrushSizePreview: () => void;
  
  // Tool behavior toggles
  toolAffectsChar: boolean;
  toolAffectsColor: boolean;
  toolAffectsBgColor: boolean;

  // Paint bucket match criteria (Selects same:)
  fillMatchChar: boolean;
  fillMatchColor: boolean;
  fillMatchBgColor: boolean;

  // Magic wand match criteria (Selects same:)
  magicMatchChar: boolean;
  magicMatchColor: boolean;
  magicMatchBgColor: boolean;
  
  // Eyedropper behavior toggles
  eyedropperPicksChar: boolean;
  eyedropperPicksColor: boolean;
  eyedropperPicksBgColor: boolean;
  
  // Actions for toggles
  setToolAffectsChar: (enabled: boolean) => void;
  setToolAffectsColor: (enabled: boolean) => void;
  setToolAffectsBgColor: (enabled: boolean) => void;
  setFillMatchChar: (enabled: boolean) => void;
  setFillMatchColor: (enabled: boolean) => void;
  setFillMatchBgColor: (enabled: boolean) => void;
  setMagicMatchChar: (enabled: boolean) => void;
  setMagicMatchColor: (enabled: boolean) => void;
  setMagicMatchBgColor: (enabled: boolean) => void;
  setEyedropperPicksChar: (enabled: boolean) => void;
  setEyedropperPicksColor: (enabled: boolean) => void;
  setEyedropperPicksBgColor: (enabled: boolean) => void;
  
  // Eyedropper functionality
  pickFromCell: (char: string, color: string, bgColor: string) => void;
  
  // Pencil tool actions
  setPencilLastPosition: (position: { x: number; y: number } | null) => void;
  setLinePreview: (points: { x: number; y: number }[]) => void;
  clearLinePreview: () => void;
  
  // Shape preview actions (for rectangle/ellipse tools)
  startShapePreview: (tool: 'rectangle' | 'ellipse', x: number, y: number) => void;
  updateShapePreview: (x: number, y: number) => void;
  clearShapePreview: () => void;
  
  // Rectangular selection actions
  startSelection: (x: number, y: number) => void;
  updateSelection: (x: number, y: number) => void;
  clearSelection: () => void;
  setSelectionFromMask: (mask: Set<string>) => void;
  
  // Lasso selection actions
  startLassoSelection: () => void;
  addLassoPoint: (x: number, y: number) => void;
  updateLassoSelectedCells: (selectedCells: Set<string>) => void;
  setLassoPath: (path: { x: number; y: number }[]) => void;
  finalizeLassoSelection: () => void;
  clearLassoSelection: () => void;
  setLassoSelectionFromMask: (mask: Set<string>, path?: { x: number; y: number }[]) => void;
  
  // Magic wand selection actions
  startMagicWandSelection: (targetCell: Cell | null, selectedCells: Set<string>) => void;
  updateMagicWandSelectedCells: (selectedCells: Set<string>) => void;
  clearMagicWandSelection: () => void;
  setMagicWandSelectionFromMask: (mask: Set<string>, targetCell?: Cell | null) => void;
  
  // Clipboard actions
  copySelection: (canvasData: Map<string, Cell>, screenSpace?: boolean) => void;
  pasteSelection: (x: number, y: number) => Map<string, Cell> | null;
  hasClipboard: () => boolean;
  getActiveClipboardType: () => 'rectangle' | 'lasso' | 'magicwand' | null;
  getActiveClipboardOriginalPosition: () => { x: number; y: number } | null;
  getClipboardOriginalPosition: () => { x: number; y: number } | null;
  
  // Lasso clipboard actions
  copyLassoSelection: (canvasData: Map<string, Cell>, screenSpace?: boolean) => void;
  pasteLassoSelection: (offsetX: number, offsetY: number) => Map<string, Cell> | null;
  hasLassoClipboard: () => boolean;
  getLassoClipboardOriginalPosition: () => { x: number; y: number } | null;
  
  // Magic wand clipboard actions
  copyMagicWandSelection: (canvasData: Map<string, Cell>, screenSpace?: boolean) => void;
  pasteMagicWandSelection: (offsetX: number, offsetY: number) => Map<string, Cell> | null;
  hasMagicWandClipboard: () => boolean;
  getMagicWandClipboardOriginalPosition: () => { x: number; y: number } | null;
  
  // Text tool actions
  startTyping: (x: number, y: number, textBox?: TextBoxRegion | null) => void;
  stopTyping: () => void;
  setCursorPosition: (x: number, y: number) => void;
  setCursorVisible: (visible: boolean) => void;
  setTextBoxFull: (full: boolean) => void;
  setTextBuffer: (buffer: string) => void;
  setLineStartX: (x: number) => void;
  commitWord: () => void;
  startTextBoxDraft: (x: number, y: number) => void;
  updateTextBoxDraft: (x: number, y: number) => void;
  clearTextBoxDraft: () => void;
  
  // Enhanced history actions
  pushToHistory: (action: AnyHistoryAction) => void;
  pushCanvasHistory: (canvasData: Map<string, Cell>, frameIndex: number, description?: string) => void;
  finalizeCanvasHistory: (newCanvasData: Map<string, Cell>) => void;
  pushCanvasResizeHistory: (previousWidth: number, previousHeight: number, newWidth: number, newHeight: number, previousCanvasData: Map<string, Cell>, frameIndex: number) => void;
  undo: () => AnyHistoryAction | undefined;
  redo: () => AnyHistoryAction | undefined;
  clearHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Playback mode actions
  setPlaybackMode: (enabled: boolean) => void;
}

const createEmptySelection = (): Selection => ({
  start: { x: 0, y: 0 },
  end: { x: 0, y: 0 },
  active: false,
  selectedCells: new Set<string>(),
  shape: 'rectangle'
});

const buildSelectionFromMask = (mask: Set<string>): Selection => {
  if (mask.size === 0) {
    return createEmptySelection();
  }

  const { start, end, selectedCells, shape } = updateSelectionFromMask(mask);
  return {
    start,
    end,
    selectedCells,
    shape,
    active: true
  };
};

export const useToolStore = create<ToolStoreState>((set, get) => ({
  // Initial state
  activeTool: 'pencil',
  selectedChar: '@',
  selectedColor: DEFAULT_COLORS[2], // White (moved from index 1 to 2)
  selectedBgColor: DEFAULT_COLORS[0], // Transparent
  brushSettings: {
    pencil: {
      size: 1,
      shape: 'circle' as BrushShape,
    },
    eraser: {
      size: 1,
      shape: 'circle' as BrushShape,
    }
  },
  rectangleFilled: false,
  paintBucketContiguous: true, // Default to contiguous fill
  magicWandContiguous: true, // Default to contiguous selection
  selectionAffectsAllLayers: false, // Default to active layer only
  
  // Tool behavior toggles - all enabled by default
  toolAffectsChar: true,
  toolAffectsColor: true,
  toolAffectsBgColor: true,

  // Paint bucket matching criteria (Selects same:) - all enabled by default
  fillMatchChar: true,
  fillMatchColor: true,
  fillMatchBgColor: true,

  // Magic wand matching criteria (Selects same:) - all enabled by default
  magicMatchChar: true,
  magicMatchColor: true,
  magicMatchBgColor: true,
  
  // Eyedropper behavior toggles - all enabled by default
  eyedropperPicksChar: true,
  eyedropperPicksColor: true,
  eyedropperPicksBgColor: true,
  
  // Animation playback state
  isPlaybackMode: false,
  
  // Brush size preview overlay state
  brushSizePreviewVisible: false,
  brushSizePreviewTimerRef: null,

  // Layer Transform tool auto-keyframe mode
  layerTransformAutoKeyframe: false,
  
  // Pencil tool state
  pencilLastPosition: null,
  
  // Shift+click line preview state
  linePreview: {
    active: false,
    points: []
  },
  
  // Shape preview state for rectangle/ellipse tools
  shapePreview: {
    active: false,
    tool: null,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 0 }
  },
  
  // Rectangular selection state
  selection: createEmptySelection(),
  
  // Lasso selection state
  lassoSelection: {
    path: [],
    selectedCells: new Set<string>(),
    active: false,
    isDrawing: false
  },
  
  // Magic wand selection state
  magicWandSelection: {
    selectedCells: new Set<string>(),
    targetCell: null,
    active: false,
    contiguous: true
  },
  
  // Text tool state
  textToolState: {
    isTyping: false,
    cursorPosition: null,
    cursorVisible: true,
    textBuffer: '',
    lineStartX: 0,
    textBox: null,
    textBoxDraft: null,
    textBoxFull: false
  },
  
  // Clipboard state
  clipboard: null,
  clipboardOriginalPosition: null,
  activeClipboardType: null,
  
  // Lasso clipboard state
  lassoClipboard: null,
  lassoClipboardOriginalPosition: null,
  
  // Magic wand clipboard state
  magicWandClipboard: null,
  magicWandClipboardOriginalPosition: null,
  
  // Enhanced history for undo/redo
  historyStack: [],
  historyPosition: -1,
  maxHistorySize: 50,
  isProcessingHistory: false,

  // Tool actions
  setActiveTool: (tool: Tool) => {
    const previousTool = get().activeTool;
    set({ activeTool: tool });
    const asciiStore = useAsciiTypeStore.getState();
    if (tool === 'asciitype') {
      asciiStore.openPanel();
    } else {
      // If switching away from asciitype, auto-apply any pending preview
      if (previousTool === 'asciitype') {
        const { isPreviewPlaced, previewOrigin, previewGrid, transparentWhitespace } = asciiStore;
        
        // Check if there's a valid preview to apply
        if (isPreviewPlaced && previewOrigin && previewGrid && previewGrid.length > 0) {
          const { selectedColor, selectedBgColor } = get();
          const canvasStore = useCanvasStore.getState();
          const animationStore = useAnimationStore.getState();
          const previewStore = usePreviewStore.getState();
          
          const { cells: canvasCells } = canvasStore;
          const { currentFrameIndex } = animationStore;
          
          // Save the PREVIOUS canvas state for undo
          const previousCanvasData = new Map(canvasCells);
          
          const nextCells = new Map(canvasCells);
          let applied = false;
          
          // Compute and apply preview cells to canvas
          for (let row = 0; row < previewGrid.length; row += 1) {
            const line = previewGrid[row];
            for (let col = 0; col < line.length; col += 1) {
              const cellInfo = line[col];
              if (!cellInfo) continue;
              
              const canvasX = previewOrigin.x + col;
              const canvasY = previewOrigin.y + row;
              const key = createCellKey(canvasX, canvasY);
              const isWhitespace = cellInfo.isWhitespace;
              const skipApply = isWhitespace && transparentWhitespace;
              
              if (skipApply) continue;
              
              const cell: Cell = {
                char: cellInfo.char,
                color: isWhitespace ? '#FFFFFF' : selectedColor,
                bgColor: selectedBgColor,
              };
              
              applied = true;
              nextCells.set(key, { ...cell });
            }
          }
          
          if (applied) {
            // Push history with PREVIOUS state (for undo)
            get().pushCanvasHistory(previousCanvasData, currentFrameIndex, 'ASCII Type apply');
            // Apply the changes
            canvasStore.setCanvasData(nextCells);
            // Finalize history with NEW state (for redo)
            get().finalizeCanvasHistory(new Map(nextCells));
          }
          
          // Clear preview overlay
          previewStore.clearPreview();
        }
        
        // Always clear asciiType preview state when switching away
        asciiStore.clearPreview();
      }
      asciiStore.closePanel();
    }
    // Clear line preview when switching tools
    get().clearLinePreview();
    // Hide brush size preview when switching tools
    get().hideBrushSizePreview();
    
    // PERSISTENT SELECTION: Selections now persist across tool changes
    // Only clear tool-specific DRAWING state, not the selection itself
    // Users must explicitly deselect with Escape, Cmd+D, or click outside
    
    // If switching away from lasso mid-draw, finalize the lasso path
    // but keep the selected cells (handled by the lasso hook)
    if (previousTool === 'lasso' && tool !== 'lasso') {
      const { lassoSelection } = get();
      if (lassoSelection.isDrawing) {
        get().finalizeLassoSelection();
      }
    }
    
    // Clear pencil last position when switching tools
    if (tool !== 'pencil' && tool !== 'eraser') {
      get().setPencilLastPosition(null);
    }
    // Stop typing when switching away from text tool
    if (tool !== 'text') {
      get().stopTyping();
    }
  },

  setSelectedChar: (char: string) => set({ selectedChar: char }),
  setSelectedColor: (color: string) => set({ selectedColor: color }),
  setSelectedBgColor: (color: string) => set({ selectedBgColor: color }),
  setBrushSize: (size: number, tool?: 'pencil' | 'eraser') => {
    const clampedSize = Math.max(1, Math.min(20, size));
    const targetTool = tool ?? (get().activeTool === 'eraser' ? 'eraser' : 'pencil');

    set((state) => ({
      brushSettings: {
        ...state.brushSettings,
        [targetTool]: {
          ...state.brushSettings[targetTool],
          size: clampedSize,
        }
      }
    }));
  },
  setBrushShape: (shape: BrushShape, tool?: 'pencil' | 'eraser') => {
    const targetTool = tool ?? (get().activeTool === 'eraser' ? 'eraser' : 'pencil');

    set((state) => ({
      brushSettings: {
        ...state.brushSettings,
        [targetTool]: {
          ...state.brushSettings[targetTool],
          shape,
        }
      }
    }));
  },
  getBrushSettings: (tool?: 'pencil' | 'eraser') => {
    const targetTool = tool ?? (get().activeTool === 'eraser' ? 'eraser' : 'pencil');
    const { brushSettings } = get();
    return brushSettings[targetTool];
  },
  setRectangleFilled: (filled: boolean) => set({ rectangleFilled: filled }),
  setPaintBucketContiguous: (contiguous: boolean) => set({ paintBucketContiguous: contiguous }),
  setMagicWandContiguous: (contiguous: boolean) => set({ magicWandContiguous: contiguous }),
  setSelectionAffectsAllLayers: (value: boolean) => set({ selectionAffectsAllLayers: value }),

  // Brush size preview overlay actions
  showBrushSizePreview: () => {
    const state = get();
    
    // Clear existing timer if any
    if (state.brushSizePreviewTimerRef) {
      clearTimeout(state.brushSizePreviewTimerRef);
    }
    
    // Only set visibility to true if it's not already visible
    // This prevents re-triggering entrance animation
    if (!state.brushSizePreviewVisible) {
      set({ brushSizePreviewVisible: true });
    }
    
    // Set new auto-hide timer (2 seconds)
    const timerId = setTimeout(() => {
      get().hideBrushSizePreview();
    }, 2000);
    
    set({ brushSizePreviewTimerRef: timerId });
  },
  
  hideBrushSizePreview: () => {
    const state = get();
    
    // Clear timer if any
    if (state.brushSizePreviewTimerRef) {
      clearTimeout(state.brushSizePreviewTimerRef);
    }
    
    // Hide the overlay
    set({ 
      brushSizePreviewVisible: false,
      brushSizePreviewTimerRef: null 
    });
  },

  // Tool behavior toggle actions
  setToolAffectsChar: (enabled: boolean) => set({ toolAffectsChar: enabled }),
  setToolAffectsColor: (enabled: boolean) => set({ toolAffectsColor: enabled }),
  setToolAffectsBgColor: (enabled: boolean) => set({ toolAffectsBgColor: enabled }),
  // Paint bucket matching criteria setters
  setFillMatchChar: (enabled: boolean) => set({ fillMatchChar: enabled }),
  setFillMatchColor: (enabled: boolean) => set({ fillMatchColor: enabled }),
  setFillMatchBgColor: (enabled: boolean) => set({ fillMatchBgColor: enabled }),
  // Magic wand matching criteria setters
  setMagicMatchChar: (enabled: boolean) => set({ magicMatchChar: enabled }),
  setMagicMatchColor: (enabled: boolean) => set({ magicMatchColor: enabled }),
  setMagicMatchBgColor: (enabled: boolean) => set({ magicMatchBgColor: enabled }),
  
  // Eyedropper behavior toggle actions
  setEyedropperPicksChar: (enabled: boolean) => set({ eyedropperPicksChar: enabled }),
  setEyedropperPicksColor: (enabled: boolean) => set({ eyedropperPicksColor: enabled }),
  setEyedropperPicksBgColor: (enabled: boolean) => set({ eyedropperPicksBgColor: enabled }),

  // Eyedropper functionality
  pickFromCell: (char: string, color: string, bgColor: string) => {
    const { eyedropperPicksChar, eyedropperPicksColor, eyedropperPicksBgColor } = get();
    
    const updates: Partial<ToolStoreState> = {};
    
    // Only pick character if toggle is enabled
    if (eyedropperPicksChar) {
      updates.selectedChar = char;
    }
    
    // Only pick color data if the cell has a character (not just a space) and toggle is enabled
    const hasChar = char !== ' ';
    if (eyedropperPicksColor && hasChar) {
      updates.selectedColor = color;
    }
    if (eyedropperPicksBgColor && hasChar) {
      updates.selectedBgColor = bgColor;
    }
    
    if (Object.keys(updates).length > 0) {
      set(updates);
    }
  },

  // Pencil tool actions
  setPencilLastPosition: (position: { x: number; y: number } | null) => {
    set({ pencilLastPosition: position });
  },

  setLinePreview: (points: { x: number; y: number }[]) => {
    set({ 
      linePreview: {
        active: points.length > 0,
        points
      }
    });
  },

  clearLinePreview: () => {
    set({ 
      linePreview: {
        active: false,
        points: []
      }
    });
  },

  // Shape preview actions (for rectangle/ellipse tools - separate from selection)
  startShapePreview: (tool: 'rectangle' | 'ellipse', x: number, y: number) => {
    set({
      shapePreview: {
        active: true,
        tool,
        start: { x, y },
        end: { x, y }
      }
    });
  },

  updateShapePreview: (x: number, y: number) => {
    set((state) => {
      if (!state.shapePreview.active) {
        return {};
      }
      return {
        shapePreview: {
          ...state.shapePreview,
          end: { x, y }
        }
      };
    });
  },

  clearShapePreview: () => {
    set({
      shapePreview: {
        active: false,
        tool: null,
        start: { x: 0, y: 0 },
        end: { x: 0, y: 0 }
      }
    });
  },

  // Selection actions
  startSelection: (x: number, y: number) => {
    const mask = createRectSelectionMask({ x, y }, { x, y });
    set({
      selection: {
        start: { x, y },
        end: { x, y },
        active: true,
        selectedCells: mask,
        shape: 'rectangle'
      }
    });
  },

  updateSelection: (x: number, y: number) => {
    set((state) => {
      if (!state.selection.active) {
        return {};
      }

      const mask = createRectSelectionMask(state.selection.start, { x, y });
      return {
        selection: {
          ...state.selection,
          end: { x, y },
          selectedCells: mask,
          shape: 'rectangle'
        }
      };
    });
  },

  clearSelection: () => {
    set({
      selection: createEmptySelection()
    });
  },

  setSelectionFromMask: (mask: Set<string>) => {
    set({
      selection: buildSelectionFromMask(mask)
    });
  },

  // Lasso selection actions
  startLassoSelection: () => {
    set({
      lassoSelection: {
        path: [],
        selectedCells: new Set<string>(),
        active: true,
        isDrawing: true
      }
    });
  },

  addLassoPoint: (x: number, y: number) => {
    set((state) => ({
      lassoSelection: {
        ...state.lassoSelection,
        path: [...state.lassoSelection.path, { x, y }]
      }
    }));
  },

  updateLassoSelectedCells: (selectedCells: Set<string>) => {
    set((state) => ({
      lassoSelection: {
        ...state.lassoSelection,
        selectedCells: new Set(selectedCells)
      }
    }));
  },

  setLassoPath: (path: { x: number; y: number }[]) => {
    set((state) => ({
      lassoSelection: {
        ...state.lassoSelection,
        path
      }
    }));
  },

  finalizeLassoSelection: () => {
    set((state) => ({
      lassoSelection: {
        ...state.lassoSelection,
        isDrawing: false
      }
    }));
  },

  clearLassoSelection: () => {
    set({
      lassoSelection: {
        path: [],
        selectedCells: new Set<string>(),
        active: false,
        isDrawing: false
      }
    });
  },

  setLassoSelectionFromMask: (mask: Set<string>, path: { x: number; y: number }[] = []) => {
    if (mask.size === 0) {
      set({
        lassoSelection: {
          path: [],
          selectedCells: new Set<string>(),
          active: false,
          isDrawing: false
        }
      });
      return;
    }

    set({
      lassoSelection: {
        path,
        selectedCells: new Set(mask),
        active: true,
        isDrawing: false
      }
    });
  },

  // Magic wand selection actions
  startMagicWandSelection: (targetCell: Cell | null, selectedCells: Set<string>) => {
    set({
      magicWandSelection: {
        selectedCells: new Set(selectedCells),
  targetCell: targetCell,
        active: true,
        contiguous: get().magicWandContiguous
      }
    });
  },

  updateMagicWandSelectedCells: (selectedCells: Set<string>) => {
    set((state) => ({
      magicWandSelection: {
        ...state.magicWandSelection,
        selectedCells: new Set(selectedCells)
      }
    }));
  },

  clearMagicWandSelection: () => {
    set({
      magicWandSelection: {
        selectedCells: new Set<string>(),
        targetCell: null,
        active: false,
        contiguous: get().magicWandContiguous
      }
    });
  },

  setMagicWandSelectionFromMask: (mask: Set<string>, targetCell: Cell | null = null) => {
    if (mask.size === 0) {
      set({
        magicWandSelection: {
          selectedCells: new Set<string>(),
          targetCell: null,
          active: false,
          contiguous: get().magicWandContiguous
        }
      });
      return;
    }

    set((state) => ({
      magicWandSelection: {
        selectedCells: new Set(mask),
  targetCell: targetCell ?? state.magicWandSelection.targetCell,
        active: true,
        contiguous: state.magicWandSelection.contiguous
      }
    }));
  },

  // Clipboard actions
  copySelection: (canvasData: Map<string, Cell>, screenSpace?: boolean) => {
    const { selection } = get();
    if (!selection.active || selection.selectedCells.size === 0) {
      return;
    }

    const bounds = getBoundsFromMask(selection.selectedCells);
    if (!bounds) {
      return;
    }

  const copiedData = new Map<string, Cell>();
    selection.selectedCells.forEach((key) => {
      const [x, y] = key.split(',').map(Number);
      const readKey = screenSpace ? `${x},${y}` : `${screenToLocal(x, y).x},${screenToLocal(x, y).y}`;
      const cell = canvasData.get(readKey);
      if (!cell) {
        return;
      }
      const relativeKey = `${x - bounds.minX},${y - bounds.minY}`;
      copiedData.set(relativeKey, cell);
    });

    set({ 
      clipboard: copiedData,
      clipboardOriginalPosition: { x: bounds.minX, y: bounds.minY },
      activeClipboardType: 'rectangle'
    });
    
    // Also copy to OS clipboard as text
    const textForClipboard = rectangularSelectionToText(canvasData, selection.selectedCells);
    if (textForClipboard.trim() !== '') {
      writeToOSClipboard(textForClipboard).catch(error => {
        console.warn('Failed to copy to OS clipboard:', error);
      });
    }
  },

  pasteSelection: (x: number, y: number) => {
    const { activeClipboardType, clipboard, lassoClipboard, magicWandClipboard } = get();

  let sourceClipboard: Map<string, Cell> | null = null;
    switch (activeClipboardType) {
      case 'magicwand':
        sourceClipboard = magicWandClipboard ?? null;
        break;
      case 'lasso':
        sourceClipboard = lassoClipboard ?? null;
        break;
      case 'rectangle':
        sourceClipboard = clipboard ?? null;
        break;
    }

    if (!sourceClipboard) {
      if (magicWandClipboard && magicWandClipboard.size > 0) {
        sourceClipboard = magicWandClipboard;
      } else if (lassoClipboard && lassoClipboard.size > 0) {
        sourceClipboard = lassoClipboard;
      } else if (clipboard && clipboard.size > 0) {
        sourceClipboard = clipboard;
      }
    }

    if (!sourceClipboard) {
      return null;
    }

  const pastedData = new Map<string, Cell>();
    
    sourceClipboard.forEach((cell, relativeKey) => {
      const [relX, relY] = relativeKey.split(',').map(Number);
      const absoluteKey = `${x + relX},${y + relY}`;
      pastedData.set(absoluteKey, cell);
    });

    return pastedData;
  },

  hasClipboard: () => {
    const state = get();
    return (state.clipboard !== null && state.clipboard!.size > 0) || 
           (state.lassoClipboard !== null && state.lassoClipboard!.size > 0) ||
           (state.magicWandClipboard !== null && state.magicWandClipboard!.size > 0);
  },

  getActiveClipboardType: () => {
    return get().activeClipboardType;
  },

  getActiveClipboardOriginalPosition: () => {
    const state = get();
    switch (state.activeClipboardType) {
      case 'magicwand':
        return state.magicWandClipboardOriginalPosition;
      case 'lasso':
        return state.lassoClipboardOriginalPosition;
      case 'rectangle':
        return state.clipboardOriginalPosition;
      default:
        return null;
    }
  },

  getClipboardOriginalPosition: () => {
    return get().clipboardOriginalPosition;
  },

  // Lasso clipboard actions
  copyLassoSelection: (canvasData: Map<string, Cell>, screenSpace?: boolean) => {
    const { lassoSelection } = get();
    
    if (!lassoSelection.active || lassoSelection.selectedCells.size === 0) {
      return;
    }

  const copiedData = new Map<string, Cell>();
    
    // Find bounds of the selected cells to create relative coordinates
    const cellCoords = Array.from(lassoSelection.selectedCells).map(key => {
      const [x, y] = key.split(',').map(Number);
      return { x, y };
    });
    
    const minX = Math.min(...cellCoords.map(c => c.x));
    const minY = Math.min(...cellCoords.map(c => c.y));
    
    // Copy only the selected cells with relative coordinates
    lassoSelection.selectedCells.forEach(key => {
      const [x, y] = key.split(',').map(Number);
      const relativeKey = `${x - minX},${y - minY}`;
      const readKey = screenSpace ? `${x},${y}` : `${screenToLocal(x, y).x},${screenToLocal(x, y).y}`;
      const cell = canvasData.get(readKey);
      if (cell) {
        copiedData.set(relativeKey, cell);
      }
    });

    set({ 
      lassoClipboard: copiedData,
      lassoClipboardOriginalPosition: { x: minX, y: minY },
      activeClipboardType: 'lasso'
    });
    
    // Also copy to OS clipboard as text
    const textForClipboard = lassoSelectionToText(canvasData, lassoSelection.selectedCells);
    if (textForClipboard.trim() !== '') {
      writeToOSClipboard(textForClipboard).catch(error => {
        console.warn('Failed to copy lasso selection to OS clipboard:', error);
      });
    }
  },

  pasteLassoSelection: (offsetX: number, offsetY: number) => {
    const { lassoClipboard } = get();
    if (!lassoClipboard) return null;

  const pastedData = new Map<string, Cell>();
    
    lassoClipboard.forEach((cell, relativeKey) => {
      const [relX, relY] = relativeKey.split(',').map(Number);
      const absoluteKey = `${offsetX + relX},${offsetY + relY}`;
      pastedData.set(absoluteKey, cell);
    });

    return pastedData;
  },

  hasLassoClipboard: () => {
    return get().lassoClipboard !== null && get().lassoClipboard!.size > 0;
  },

  getLassoClipboardOriginalPosition: () => {
    return get().lassoClipboardOriginalPosition;
  },

  // Magic wand clipboard actions
  copyMagicWandSelection: (canvasData: Map<string, Cell>, screenSpace?: boolean) => {
    const { magicWandSelection } = get();
    if (!magicWandSelection.active || magicWandSelection.selectedCells.size === 0) {
      return;
    }

  const copiedData = new Map<string, Cell>();
    
    // Find bounds of the selected cells to create relative coordinates (consistent with other clipboard types)
    const cellCoords = Array.from(magicWandSelection.selectedCells).map(key => {
      const [x, y] = key.split(',').map(Number);
      return { x, y };
    });
    
    const minX = Math.min(...cellCoords.map(c => c.x));
    const minY = Math.min(...cellCoords.map(c => c.y));
    
    // Copy selected cells with relative coordinates
    const selectedArray = Array.from(magicWandSelection.selectedCells);
    for (const cellKey of selectedArray) {
      const [x, y] = cellKey.split(',').map(Number);
      const relativeKey = `${x - minX},${y - minY}`;
      const readKey = screenSpace ? `${x},${y}` : `${screenToLocal(x, y).x},${screenToLocal(x, y).y}`;
      const cell = canvasData.get(readKey);
      if (cell) {
        copiedData.set(relativeKey, { ...cell });
      }
    }
    
    set({ 
      magicWandClipboard: copiedData,
      magicWandClipboardOriginalPosition: { x: minX, y: minY },
      activeClipboardType: 'magicwand'
    });
    
    // Also copy to OS clipboard as text
    const textForClipboard = magicWandSelectionToText(canvasData, magicWandSelection.selectedCells);
    if (textForClipboard.trim() !== '') {
      writeToOSClipboard(textForClipboard).catch(error => {
        console.warn('Failed to copy magic wand selection to OS clipboard:', error);
      });
    }
  },

  pasteMagicWandSelection: (offsetX: number, offsetY: number) => {
    const { magicWandClipboard } = get();
    if (!magicWandClipboard || magicWandClipboard.size === 0) {
      return null;
    }

  const pasteData = new Map<string, Cell>();
    
    // Apply offset to each cell position (now using relative coordinates like other clipboard types)
    magicWandClipboard.forEach((cell, relativeKey) => {
      const [relX, relY] = relativeKey.split(',').map(Number);
      const absoluteKey = `${offsetX + relX},${offsetY + relY}`;
      pasteData.set(absoluteKey, { ...cell });
    });
    
    return pasteData;
  },

  hasMagicWandClipboard: () => {
    return get().magicWandClipboard !== null && get().magicWandClipboard!.size > 0;
  },

  getMagicWandClipboardOriginalPosition: () => {
    return get().magicWandClipboardOriginalPosition;
  },

  // Enhanced history actions
  pushToHistory: (action: AnyHistoryAction) => {
    set((state) => {
      const newHistoryStack = [...state.historyStack];
      
      // If we're not at the end of history, truncate everything after current position
      if (state.historyPosition < newHistoryStack.length - 1) {
        newHistoryStack.splice(state.historyPosition + 1);
      }
      
      // Add new action to history
      newHistoryStack.push(action);
      
      // Limit history size
      if (newHistoryStack.length > state.maxHistorySize) {
        newHistoryStack.shift();
      }
      
      return {
        historyStack: newHistoryStack,
        historyPosition: newHistoryStack.length - 1
      };
    });
  },

  pushCanvasHistory: (canvasData: Map<string, Cell>, frameIndex: number, description: string = 'Canvas edit') => {
    const action: CanvasHistoryAction = {
      type: 'canvas_edit',
      timestamp: Date.now(),
      description,
      data: {
        previousCanvasData: new Map(canvasData),
        frameIndex
      }
    };
    get().pushToHistory(action);
  },

  // Finalize the most recent canvas_edit history action by attaching the post-edit canvas state
  finalizeCanvasHistory: (newCanvasData: Map<string, Cell>) => {
    set((state) => {
      const { historyStack, historyPosition } = state;
      if (historyPosition < 0) return {};
      const action = historyStack[historyPosition];
      if (action && action.type === 'canvas_edit') {
        const canvasAction = action as CanvasHistoryAction;
        if (!canvasAction.data.newCanvasData) {
          canvasAction.data.newCanvasData = new Map(newCanvasData);
        }
      }
      return { historyStack: [...historyStack] };
    });
  },

  pushCanvasResizeHistory: (previousWidth: number, previousHeight: number, newWidth: number, newHeight: number, previousCanvasData: Map<string, Cell>, frameIndex: number) => {
    const action: import('../types').CanvasResizeHistoryAction = {
      type: 'canvas_resize',
      timestamp: Date.now(),
      description: `Canvas resized from ${previousWidth}×${previousHeight} to ${newWidth}×${newHeight}`,
      data: {
        previousWidth,
        previousHeight,
        newWidth,
        newHeight,
        previousCanvasData: new Map(previousCanvasData),
        frameIndex
      }
    };
    get().pushToHistory(action);
  },

  undo: () => {
    const { historyStack, historyPosition } = get();
    
    if (historyPosition < 0) return undefined;
    
    const action = historyStack[historyPosition];
    
    set({
      historyPosition: historyPosition - 1
    });
    
    return action;
  },

  redo: () => {
    const { historyStack, historyPosition } = get();
    
    if (historyPosition >= historyStack.length - 1) return undefined;
    
    const nextPosition = historyPosition + 1;
    const action = historyStack[nextPosition];
    
    set({
      historyPosition: nextPosition
    });
    
    return action;
  },

  clearHistory: () => {
    set({
      historyStack: [],
      historyPosition: -1
    });
  },

  canUndo: () => get().historyPosition >= 0,
  canRedo: () => {
    const { historyStack, historyPosition } = get();
    return historyPosition < historyStack.length - 1;
  },
  
  // Text tool actions
  startTyping: (x: number, y: number, textBox: TextBoxRegion | null = null) => {
    set({
      textToolState: {
        ...get().textToolState,
        isTyping: true,
        cursorPosition: { x, y },
        cursorVisible: true,
        textBuffer: '',
        lineStartX: x,
        textBox,
        textBoxDraft: null,
        textBoxFull: false
      }
    });
  },

  stopTyping: () => {
    set({
      textToolState: {
        ...get().textToolState,
        isTyping: false,
        cursorPosition: null,
        cursorVisible: true,
        textBuffer: '',
        textBox: null,
        textBoxDraft: null,
        textBoxFull: false
      }
    });
  },

  startTextBoxDraft: (x: number, y: number) => {
    set({
      textToolState: {
        ...get().textToolState,
        textBoxDraft: { start: { x, y }, current: { x, y } }
      }
    });
  },

  updateTextBoxDraft: (x: number, y: number) => {
    const { textBoxDraft } = get().textToolState;
    if (!textBoxDraft) return;
    if (textBoxDraft.current.x === x && textBoxDraft.current.y === y) return;
    set({
      textToolState: {
        ...get().textToolState,
        textBoxDraft: { ...textBoxDraft, current: { x, y } }
      }
    });
  },

  clearTextBoxDraft: () => {
    if (!get().textToolState.textBoxDraft) return;
    set({
      textToolState: {
        ...get().textToolState,
        textBoxDraft: null
      }
    });
  },

  setCursorPosition: (x: number, y: number) => {
    set({
      textToolState: {
        ...get().textToolState,
        cursorPosition: { x, y },
        cursorVisible: true, // Reset blink on move
        textBoxFull: false // Repositioning the cursor always re-enables input
      }
    });
  },

  setTextBoxFull: (full: boolean) => {
    if (get().textToolState.textBoxFull === full) return;
    set({
      textToolState: {
        ...get().textToolState,
        textBoxFull: full
      }
    });
  },

  setCursorVisible: (visible: boolean) => {
    set({
      textToolState: {
        ...get().textToolState,
        cursorVisible: visible
      }
    });
  },

  setTextBuffer: (buffer: string) => {
    set({
      textToolState: {
        ...get().textToolState,
        textBuffer: buffer
      }
    });
  },

  setLineStartX: (x: number) => {
    set({
      textToolState: {
        ...get().textToolState,
        lineStartX: x
      }
    });
  },

  commitWord: () => {
    // Clear the text buffer after committing a word for undo
    set({
      textToolState: {
        ...get().textToolState,
        textBuffer: ''
      }
    });
  },

  // Playback mode actions
  setPlaybackMode: (enabled: boolean) => {
    set({ isPlaybackMode: enabled });
  }
}));
