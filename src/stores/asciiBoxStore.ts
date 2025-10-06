import { create } from 'zustand';
import type { Cell } from '../types';

export type BoxDrawingMode = 'rectangle' | 'freedraw' | 'erase';

interface AsciiBoxStore {
  // Panel state
  isPanelOpen: boolean;
  
  // Drawing configuration
  selectedStyleId: string; // Current box style ID
  drawingMode: BoxDrawingMode;
  
  // Preview state
  isApplying: boolean;
  previewData: Map<string, Cell> | null; // Preview cells
  originalData: Map<string, Cell> | null; // Original canvas cells (for cancel)
  drawnCells: Set<string>; // Cell keys where user has drawn
  
  // Rectangle drawing state (for rectangle mode)
  rectangleStart: { x: number; y: number } | null;
  rectangleEnd: { x: number; y: number } | null;
  rectanglePreview: Map<string, Cell> | null; // Live preview of current rectangle being drawn
  
  // Free draw state (for freedraw mode)
  isDrawing: boolean;
  lastPoint: { x: number; y: number } | null;
  
  // Actions
  openPanel: () => void;
  closePanel: () => void;
  setSelectedStyle: (styleId: string) => void;
  setDrawingMode: (mode: BoxDrawingMode) => void;
  
  // Preview management
  startApplying: () => void;
  updatePreview: (previewData: Map<string, Cell>, drawnCells: Set<string>) => void;
  applyPreview: () => void;
  cancelPreview: () => void;
  
  // Rectangle mode
  setRectangleStart: (point: { x: number; y: number } | null) => void;
  setRectangleEnd: (point: { x: number; y: number } | null) => void;
  setRectanglePreview: (preview: Map<string, Cell> | null) => void;
  cancelRectanglePreview: () => void;
  
  // Free draw mode
  startDrawing: (point: { x: number; y: number }) => void;
  continueDrawing: (point: { x: number; y: number }) => void;
  endDrawing: () => void;
  
  // Reset
  reset: () => void;
}

export const useAsciiBoxStore = create<AsciiBoxStore>((set, get) => ({
  // Initial state
  isPanelOpen: false,
  selectedStyleId: 'single-line',
  drawingMode: 'rectangle',
  isApplying: false,
  previewData: null,
  originalData: null,
  drawnCells: new Set(),
  rectangleStart: null,
  rectangleEnd: null,
  rectanglePreview: null,
  isDrawing: false,
  lastPoint: null,
  
  // Panel actions
  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => {
    const { reset } = get();
    reset();
    set({ isPanelOpen: false });
  },
  
  setSelectedStyle: (styleId: string) => {
    set({ selectedStyleId: styleId });
    // When style changes, we need to regenerate preview if we're currently applying
    // This will be handled by the hook watching for style changes
  },
  
  setDrawingMode: (mode: BoxDrawingMode) => set({ drawingMode: mode }),
  
  // Preview management
  startApplying: () => set({ isApplying: true }),
  
  updatePreview: (previewData: Map<string, Cell>, drawnCells: Set<string>) => 
    set({ previewData, drawnCells }),
  
  applyPreview: () => {
    // This will be handled by the hook - just reset state
    get().reset();
  },
  
  cancelPreview: () => {
    get().reset();
  },
  
  // Rectangle mode
  setRectangleStart: (point) => set({ rectangleStart: point }),
  setRectangleEnd: (point) => set({ rectangleEnd: point }),
  setRectanglePreview: (preview) => set({ rectanglePreview: preview }),
  cancelRectanglePreview: () => set({ 
    rectangleStart: null, 
    rectangleEnd: null, 
    rectanglePreview: null 
  }),
  
  // Free draw mode
  startDrawing: (point) => set({ 
    isDrawing: true, 
    lastPoint: point 
  }),
  
  continueDrawing: (point) => {
    // Set lastPoint for shift+click line drawing
    // Don't check isDrawing - we want to set lastPoint on clicks too
    set({ lastPoint: point });
  },
  
  endDrawing: () => set({ 
    isDrawing: false
    // Keep lastPoint so we can shift+click from the end of a drag
  }),
  
  // Reset
  reset: () => set({
    isApplying: false,
    previewData: null,
    originalData: null,
    drawnCells: new Set(),
    rectangleStart: null,
    rectangleEnd: null,
    rectanglePreview: null,
    isDrawing: false,
    lastPoint: null
  })
}));
