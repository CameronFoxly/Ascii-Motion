import { create } from 'zustand';
import type { Tool, ToolState, Selection, LassoSelection, MagicWandSelection, TextToolState } from '../types';
import { DEFAULT_COLORS } from '../constants';

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
  
  // Clipboard for copy/paste
  clipboard: Map<string, any> | null;
  
  // Lasso clipboard for copy/paste
  lassoClipboard: Map<string, any> | null;
  
  // Magic wand clipboard for copy/paste
  magicWandClipboard: Map<string, any> | null;
  
  // History for undo/redo
  undoStack: Map<string, any>[];
  redoStack: Map<string, any>[];
  maxHistorySize: number;
  
  // Animation playback state
  isPlaybackMode: boolean;
  
  // Actions
  setActiveTool: (tool: Tool) => void;
  setSelectedChar: (char: string) => void;
  setSelectedColor: (color: string) => void;
  setSelectedBgColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setRectangleFilled: (filled: boolean) => void;
  setPaintBucketContiguous: (contiguous: boolean) => void;
  setMagicWandContiguous: (contiguous: boolean) => void;
  
  // Eyedropper functionality
  pickFromCell: (char: string, color: string, bgColor: string) => void;
  
  // Pencil tool actions
  setPencilLastPosition: (position: { x: number; y: number } | null) => void;
  
  // Rectangular selection actions
  startSelection: (x: number, y: number) => void;
  updateSelection: (x: number, y: number) => void;
  clearSelection: () => void;
  
  // Lasso selection actions
  startLassoSelection: () => void;
  addLassoPoint: (x: number, y: number) => void;
  updateLassoSelectedCells: (selectedCells: Set<string>) => void;
  finalizeLassoSelection: () => void;
  clearLassoSelection: () => void;
  
  // Magic wand selection actions
  startMagicWandSelection: (targetCell: any, selectedCells: Set<string>) => void;
  clearMagicWandSelection: () => void;
  
  // Clipboard actions
  copySelection: (canvasData: Map<string, any>) => void;
  pasteSelection: (x: number, y: number) => Map<string, any> | null;
  hasClipboard: () => boolean;
  
  // Lasso clipboard actions
  copyLassoSelection: (canvasData: Map<string, any>) => void;
  pasteLassoSelection: (offsetX: number, offsetY: number) => Map<string, any> | null;
  hasLassoClipboard: () => boolean;
  
  // Magic wand clipboard actions
  copyMagicWandSelection: (canvasData: Map<string, any>) => void;
  pasteMagicWandSelection: (offsetX: number, offsetY: number) => Map<string, any> | null;
  hasMagicWandClipboard: () => boolean;
  
  // Text tool actions
  startTyping: (x: number, y: number) => void;
  stopTyping: () => void;
  setCursorPosition: (x: number, y: number) => void;
  setCursorVisible: (visible: boolean) => void;
  setTextBuffer: (buffer: string) => void;
  setLineStartX: (x: number) => void;
  commitWord: () => void;
  
  // History actions
  pushToHistory: (canvasData: Map<string, any>) => void;
  undo: () => Map<string, any> | undefined;
  redo: () => Map<string, any> | undefined;
  addToRedoStack: (canvasData: Map<string, any>) => void;
  addToUndoStack: (canvasData: Map<string, any>) => void;
  clearHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Playback mode actions
  setPlaybackMode: (enabled: boolean) => void;
}

export const useToolStore = create<ToolStoreState>((set, get) => ({
  // Initial state
  activeTool: 'pencil',
  selectedChar: '@',
  selectedColor: DEFAULT_COLORS[1], // White
  selectedBgColor: DEFAULT_COLORS[0], // Black
  brushSize: 1,
  rectangleFilled: false,
  paintBucketContiguous: true, // Default to contiguous fill
  magicWandContiguous: true, // Default to contiguous selection
  
  // Animation playback state
  isPlaybackMode: false,
  
  // Pencil tool state
  pencilLastPosition: null,
  
  // Rectangular selection state
  selection: {
    start: { x: 0, y: 0 },
    end: { x: 0, y: 0 },
    active: false
  },
  
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
    lineStartX: 0
  },
  
  // Clipboard state
  clipboard: null,
  
  // Lasso clipboard state
  lassoClipboard: null,
  
  // Magic wand clipboard state
  magicWandClipboard: null,
  
  // History state
  undoStack: [],
  redoStack: [],
  maxHistorySize: 50,

  // Tool actions
  setActiveTool: (tool: Tool) => {
    set({ activeTool: tool });
    // Clear selections when switching tools (except select/lasso/magicwand tools)
    if (tool !== 'select') {
      get().clearSelection();
    }
    if (tool !== 'lasso') {
      get().clearLassoSelection();
    }
    if (tool !== 'magicwand') {
      get().clearMagicWandSelection();
    }
    // Clear pencil last position when switching tools
    if (tool !== 'pencil') {
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
  setBrushSize: (size: number) => set({ brushSize: Math.max(1, size) }),
  setRectangleFilled: (filled: boolean) => set({ rectangleFilled: filled }),
  setPaintBucketContiguous: (contiguous: boolean) => set({ paintBucketContiguous: contiguous }),
  setMagicWandContiguous: (contiguous: boolean) => set({ magicWandContiguous: contiguous }),

  // Eyedropper functionality
  pickFromCell: (char: string, color: string, bgColor: string) => {
    set({ 
      selectedChar: char,
      selectedColor: color,
      selectedBgColor: bgColor
    });
  },

  // Pencil tool actions
  setPencilLastPosition: (position: { x: number; y: number } | null) => {
    set({ pencilLastPosition: position });
  },

  // Selection actions
  startSelection: (x: number, y: number) => {
    set({
      selection: {
        start: { x, y },
        end: { x, y },
        active: true
      }
    });
  },

  updateSelection: (x: number, y: number) => {
    set((state) => ({
      selection: {
        ...state.selection,
        end: { x, y }
      }
    }));
  },

  clearSelection: () => {
    set({
      selection: {
        start: { x: 0, y: 0 },
        end: { x: 0, y: 0 },
        active: false
      }
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
        selectedCells
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

  // Magic wand selection actions
  startMagicWandSelection: (targetCell: any, selectedCells: Set<string>) => {
    set({
      magicWandSelection: {
        selectedCells: new Set(selectedCells),
        targetCell: targetCell,
        active: true,
        contiguous: get().magicWandContiguous
      }
    });
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

  // Clipboard actions
  copySelection: (canvasData: Map<string, any>) => {
    const { selection } = get();
    if (!selection.active) return;

    const minX = Math.min(selection.start.x, selection.end.x);
    const maxX = Math.max(selection.start.x, selection.end.x);
    const minY = Math.min(selection.start.y, selection.end.y);
    const maxY = Math.max(selection.start.y, selection.end.y);

    const copiedData = new Map<string, any>();
    
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const key = `${x},${y}`;
        const relativeKey = `${x - minX},${y - minY}`;
        if (canvasData.has(key)) {
          copiedData.set(relativeKey, canvasData.get(key));
        }
      }
    }

    set({ clipboard: copiedData });
  },

  pasteSelection: (x: number, y: number) => {
    const { clipboard } = get();
    if (!clipboard) return null;

    const pastedData = new Map<string, any>();
    
    clipboard.forEach((cell, relativeKey) => {
      const [relX, relY] = relativeKey.split(',').map(Number);
      const absoluteKey = `${x + relX},${y + relY}`;
      pastedData.set(absoluteKey, cell);
    });

    return pastedData;
  },

  hasClipboard: () => {
    const state = get();
    return (state.clipboard !== null && state.clipboard!.size > 0) || 
           (state.lassoClipboard !== null && state.lassoClipboard!.size > 0);
  },

  // Lasso clipboard actions
  copyLassoSelection: (canvasData: Map<string, any>) => {
    const { lassoSelection } = get();
    
    if (!lassoSelection.active || lassoSelection.selectedCells.size === 0) {
      return;
    }

    const copiedData = new Map<string, any>();
    
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
      if (canvasData.has(key)) {
        copiedData.set(relativeKey, canvasData.get(key));
      }
    });

    set({ lassoClipboard: copiedData });
  },

  pasteLassoSelection: (offsetX: number, offsetY: number) => {
    const { lassoClipboard } = get();
    if (!lassoClipboard) return null;

    const pastedData = new Map<string, any>();
    
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

  // Magic wand clipboard actions
  copyMagicWandSelection: (canvasData: Map<string, any>) => {
    const { magicWandSelection } = get();
    if (!magicWandSelection.active || magicWandSelection.selectedCells.size === 0) {
      return;
    }

    const copiedData = new Map<string, any>();
    
    // Copy all selected cells with their relative positions
    const selectedArray = Array.from(magicWandSelection.selectedCells);
    for (const cellKey of selectedArray) {
      const cell = canvasData.get(cellKey);
      if (cell) {
        copiedData.set(cellKey, { ...cell });
      }
    }
    
    set({ magicWandClipboard: copiedData });
  },

  pasteMagicWandSelection: (offsetX: number, offsetY: number) => {
    const { magicWandClipboard } = get();
    if (!magicWandClipboard || magicWandClipboard.size === 0) {
      return null;
    }

    const pasteData = new Map<string, any>();
    
    // Apply offset to each cell position
    for (const [cellKey, cell] of magicWandClipboard.entries()) {
      const [x, y] = cellKey.split(',').map(Number);
      const newKey = `${x + offsetX},${y + offsetY}`;
      pasteData.set(newKey, { ...cell });
    }
    
    return pasteData;
  },

  hasMagicWandClipboard: () => {
    return get().magicWandClipboard !== null && get().magicWandClipboard!.size > 0;
  },

  // History actions
  pushToHistory: (canvasData: Map<string, any>) => {
    set((state) => {
      const newUndoStack = [...state.undoStack];
      
      // Add current state to undo stack
      newUndoStack.push(new Map(canvasData));
      
      // Limit history size
      if (newUndoStack.length > state.maxHistorySize) {
        newUndoStack.shift();
      }
      
      return {
        undoStack: newUndoStack,
        redoStack: [] // Clear redo stack when new action is performed
      };
    });
  },

  undo: () => {
    const { undoStack } = get();
    
    if (undoStack.length === 0) return undefined;
    
    // Get the previous state (what we want to restore)
    const previousState = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);
    
    // Note: We need the current state to be passed from the caller
    // The redo stack will be updated when setCanvasData is called
    
    set({
      undoStack: newUndoStack,
      // Don't modify redoStack here - let the caller handle it
    });
    
    return previousState;
  },

  redo: () => {
    const { redoStack } = get();
    
    if (redoStack.length === 0) return undefined;
    
    // Get the next state (what we want to restore)
    const nextState = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);
    
    // Note: We need the current state to be passed from the caller
    // The undo stack will be updated when setCanvasData is called
    
    set({
      redoStack: newRedoStack,
      // Don't modify undoStack here - let the caller handle it
    });
    
    return nextState;
  },

  // Helper function to update the opposite stack when undo/redo is performed
  addToRedoStack: (canvasData: Map<string, any>) => {
    set((state) => ({
      redoStack: [...state.redoStack, new Map(canvasData)]
    }));
  },

  addToUndoStack: (canvasData: Map<string, any>) => {
    set((state) => ({
      undoStack: [...state.undoStack, new Map(canvasData)]
    }));
  },

  clearHistory: () => {
    set({
      undoStack: [],
      redoStack: []
    });
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,
  
  // Text tool actions
  startTyping: (x: number, y: number) => {
    set({
      textToolState: {
        ...get().textToolState,
        isTyping: true,
        cursorPosition: { x, y },
        cursorVisible: true,
        textBuffer: '',
        lineStartX: x
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
        textBuffer: ''
      }
    });
  },

  setCursorPosition: (x: number, y: number) => {
    set({
      textToolState: {
        ...get().textToolState,
        cursorPosition: { x, y },
        cursorVisible: true // Reset blink on move
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
