import { create } from 'zustand';
import type { Tool, ToolState, Selection } from '../types';
import { DEFAULT_COLORS } from '../constants';

interface ToolStoreState extends ToolState {
  // Selection state
  selection: Selection;
  
  // Clipboard for copy/paste
  clipboard: Map<string, any> | null;
  
  // History for undo/redo
  undoStack: Map<string, any>[];
  redoStack: Map<string, any>[];
  maxHistorySize: number;
  
  // Actions
  setActiveTool: (tool: Tool) => void;
  setSelectedChar: (char: string) => void;
  setSelectedColor: (color: string) => void;
  setSelectedBgColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setRectangleFilled: (filled: boolean) => void;
  
  // Eyedropper functionality
  pickFromCell: (char: string, color: string, bgColor: string) => void;
  
  // Selection actions
  startSelection: (x: number, y: number) => void;
  updateSelection: (x: number, y: number) => void;
  clearSelection: () => void;
  
  // Clipboard actions
  copySelection: (canvasData: Map<string, any>) => void;
  pasteSelection: (x: number, y: number) => Map<string, any> | null;
  hasClipboard: () => boolean;
  
  // History actions
  pushToHistory: (canvasData: Map<string, any>) => void;
  undo: () => Map<string, any> | undefined;
  redo: () => Map<string, any> | undefined;
  clearHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useToolStore = create<ToolStoreState>((set, get) => ({
  // Initial state
  activeTool: 'pencil',
  selectedChar: '@',
  selectedColor: DEFAULT_COLORS[0], // Black
  selectedBgColor: DEFAULT_COLORS[1], // White
  brushSize: 1,
  rectangleFilled: false,
  
  // Selection state
  selection: {
    start: { x: 0, y: 0 },
    end: { x: 0, y: 0 },
    active: false
  },
  
  // Clipboard state
  clipboard: null,
  
  // History state
  undoStack: [],
  redoStack: [],
  maxHistorySize: 50,

  // Tool actions
  setActiveTool: (tool: Tool) => {
    set({ activeTool: tool });
    // Clear selection when switching tools (except select tool)
    if (tool !== 'select') {
      get().clearSelection();
    }
  },

  setSelectedChar: (char: string) => set({ selectedChar: char }),
  setSelectedColor: (color: string) => set({ selectedColor: color }),
  setSelectedBgColor: (color: string) => set({ selectedBgColor: color }),
  setBrushSize: (size: number) => set({ brushSize: Math.max(1, size) }),
  setRectangleFilled: (filled: boolean) => set({ rectangleFilled: filled }),

  // Eyedropper functionality
  pickFromCell: (char: string, color: string, bgColor: string) => {
    set({ 
      selectedChar: char,
      selectedColor: color,
      selectedBgColor: bgColor
    });
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
    return get().clipboard !== null && get().clipboard!.size > 0;
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
    const { undoStack, redoStack } = get();
    
    if (undoStack.length === 0) return undefined;
    
    const previousState = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);
    const newRedoStack = [...redoStack, previousState];
    
    set({
      undoStack: newUndoStack,
      redoStack: newRedoStack
    });
    
    return previousState;
  },

  redo: () => {
    const { redoStack, undoStack } = get();
    
    if (redoStack.length === 0) return undefined;
    
    const nextState = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);
    const newUndoStack = [...undoStack, nextState];
    
    set({
      undoStack: newUndoStack,
      redoStack: newRedoStack
    });
    
    return nextState;
  },

  clearHistory: () => {
    set({
      undoStack: [],
      redoStack: []
    });
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0
}));
