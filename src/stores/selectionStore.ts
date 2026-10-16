/**
 * Selection Store - Unified global selection state for ASCII Motion
 * 
 * This store manages a single, persistent selection that:
 * - Persists across tool changes (not cleared when switching to drawing tools)
 * - Can be combined/modified by any selection tool type (rect, lasso, wand)
 * - Constrains drawing and effects operations when active
 * - Handles move operations with proper frame change handling
 * 
 * @see docs/PERSISTENT_SELECTION_IMPLEMENTATION_PLAN.md
 */

import { create } from 'zustand';
import type { Cell } from '../types';
import { 
  getBoundsFromMask, 
  unionSelectionMasks, 
  subtractSelectionMask,
  cloneSelectionMask 
} from '../utils/selectionUtils';

export interface SelectionBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface MoveState {
  /** Original cell data that was "lifted" for moving */
  originalData: Map<string, Cell>;
  /** Original cell positions (keys) before move */
  originalPositions: Set<string>;
  /** Starting mouse position for the move operation */
  startPos: { x: number; y: number };
  /** Accumulated offset from previous drag operations */
  baseOffset: { x: number; y: number };
  /** Current drag offset (resets to 0 after each drag release) */
  currentOffset: { x: number; y: number };
}

export interface SelectionState {
  // ─────────────────────────────────────────────────────────────
  // Core Selection State
  // ─────────────────────────────────────────────────────────────
  
  /** The unified set of selected cell keys (e.g., "x,y") */
  selectedCells: Set<string>;
  
  /** Whether any selection is currently active */
  isActive: boolean;
  
  /** Cached bounding box for quick hit testing (null if no selection) */
  bounds: SelectionBounds | null;
  
  // ─────────────────────────────────────────────────────────────
  // Move Operation State
  // ─────────────────────────────────────────────────────────────
  
  /** Current move operation state (null if not moving) */
  moveState: MoveState | null;
  
  // ─────────────────────────────────────────────────────────────
  // Clipboard State
  // ─────────────────────────────────────────────────────────────
  
  /** Copied cell data for paste operations */
  clipboard: Map<string, Cell> | null;
  
  /** Bounds of the copied content for positioning */
  clipboardBounds: SelectionBounds | null;
  
  // ─────────────────────────────────────────────────────────────
  // Selection Actions
  // ─────────────────────────────────────────────────────────────
  
  /** Set selection to a new set of cells (replaces existing) */
  setSelection: (cells: Set<string>) => void;
  
  /** Add cells to the existing selection (union) */
  addToSelection: (cells: Set<string>) => void;
  
  /** Remove cells from the existing selection (subtract) */
  subtractFromSelection: (cells: Set<string>) => void;
  
  /** Clear all selection state */
  clearSelection: () => void;
  
  // ─────────────────────────────────────────────────────────────
  // Move Actions
  // ─────────────────────────────────────────────────────────────
  
  /** Start a move operation - lifts content from canvas */
  startMove: (startPos: { x: number; y: number }, canvasData: Map<string, Cell>) => void;
  
  /** Update move offset during drag */
  updateMoveOffset: (currentOffset: { x: number; y: number }) => void;
  
  /** Persist current offset to base offset (after drag release) */
  persistMoveOffset: () => void;
  
  /** Commit move to canvas and return updated canvas data */
  commitMove: (canvasData: Map<string, Cell>, canvasWidth: number, canvasHeight: number) => Map<string, Cell>;
  
  /** Cancel move operation without applying changes */
  cancelMove: () => void;
  
  /** Check if a move operation is in progress */
  hasActiveMove: () => boolean;
  
  /** Get total offset (base + current) for rendering */
  getTotalOffset: () => { x: number; y: number };
  
  // ─────────────────────────────────────────────────────────────
  // Clipboard Actions
  // ─────────────────────────────────────────────────────────────
  
  /** Copy selected cells to clipboard */
  copySelection: (canvasData: Map<string, Cell>) => void;
  
  /** Get clipboard data for paste */
  getClipboard: () => { data: Map<string, Cell>; bounds: SelectionBounds } | null;
  
  /** Check if clipboard has content */
  hasClipboard: () => boolean;
  
  // ─────────────────────────────────────────────────────────────
  // Query Methods
  // ─────────────────────────────────────────────────────────────
  
  /** Check if a specific cell is selected */
  isCellSelected: (x: number, y: number) => boolean;
  
  /** Check if a point is in the selection (accounting for move offset) */
  isPointInSelection: (x: number, y: number) => boolean;
  
  /** Get selection bounds */
  getBounds: () => SelectionBounds | null;
  
  /** Get the count of selected cells */
  getSelectionSize: () => number;
  
  // ─────────────────────────────────────────────────────────────
  // Frame Change Handling
  // ─────────────────────────────────────────────────────────────
  
  /** Called before frame changes - commits any pending move and returns updated canvas data */
  onFrameWillChange: (canvasData: Map<string, Cell>, canvasWidth: number, canvasHeight: number) => Map<string, Cell> | null;
}

// ─────────────────────────────────────────────────────────────────
// Store Implementation
// ─────────────────────────────────────────────────────────────────

export const useSelectionStore = create<SelectionState>((set, get) => ({
  // Initial state
  selectedCells: new Set<string>(),
  isActive: false,
  bounds: null,
  moveState: null,
  clipboard: null,
  clipboardBounds: null,

  // ─────────────────────────────────────────────────────────────
  // Selection Actions
  // ─────────────────────────────────────────────────────────────

  setSelection: (cells: Set<string>) => {
    const newCells = cloneSelectionMask(cells);
    const bounds = getBoundsFromMask(newCells);
    
    set({
      selectedCells: newCells,
      isActive: newCells.size > 0,
      bounds: bounds ? {
        minX: bounds.minX,
        minY: bounds.minY,
        maxX: bounds.maxX,
        maxY: bounds.maxY
      } : null,
      // Clear move state when selection changes
      moveState: null
    });
  },

  addToSelection: (cells: Set<string>) => {
    const { selectedCells } = get();
    const newCells = unionSelectionMasks(selectedCells, cells);
    const bounds = getBoundsFromMask(newCells);
    
    set({
      selectedCells: newCells,
      isActive: newCells.size > 0,
      bounds: bounds ? {
        minX: bounds.minX,
        minY: bounds.minY,
        maxX: bounds.maxX,
        maxY: bounds.maxY
      } : null
    });
  },

  subtractFromSelection: (cells: Set<string>) => {
    const { selectedCells } = get();
    const newCells = subtractSelectionMask(selectedCells, cells);
    const bounds = getBoundsFromMask(newCells);
    
    set({
      selectedCells: newCells,
      isActive: newCells.size > 0,
      bounds: bounds ? {
        minX: bounds.minX,
        minY: bounds.minY,
        maxX: bounds.maxX,
        maxY: bounds.maxY
      } : null,
      // Clear move state if selection becomes empty
      moveState: newCells.size === 0 ? null : get().moveState
    });
  },

  clearSelection: () => {
    set({
      selectedCells: new Set<string>(),
      isActive: false,
      bounds: null,
      moveState: null
    });
  },

  // ─────────────────────────────────────────────────────────────
  // Move Actions
  // ─────────────────────────────────────────────────────────────

  startMove: (startPos: { x: number; y: number }, canvasData: Map<string, Cell>) => {
    const { selectedCells, isActive } = get();
    
    if (!isActive || selectedCells.size === 0) {
      return;
    }
    
    // Collect the cell data that will be moved
    const originalData = new Map<string, Cell>();
    const originalPositions = new Set<string>();
    
    selectedCells.forEach((cellKey) => {
      originalPositions.add(cellKey);
      const cell = canvasData.get(cellKey);
      if (cell && cell.char !== ' ') {
        originalData.set(cellKey, { ...cell });
      }
    });
    
    set({
      moveState: {
        originalData,
        originalPositions,
        startPos,
        baseOffset: { x: 0, y: 0 },
        currentOffset: { x: 0, y: 0 }
      }
    });
  },

  updateMoveOffset: (currentOffset: { x: number; y: number }) => {
    const { moveState } = get();
    if (!moveState) return;
    
    set({
      moveState: {
        ...moveState,
        currentOffset
      }
    });
  },

  persistMoveOffset: () => {
    const { moveState } = get();
    if (!moveState) return;
    
    set({
      moveState: {
        ...moveState,
        baseOffset: {
          x: moveState.baseOffset.x + moveState.currentOffset.x,
          y: moveState.baseOffset.y + moveState.currentOffset.y
        },
        currentOffset: { x: 0, y: 0 }
      }
    });
  },

  commitMove: (canvasData: Map<string, Cell>, canvasWidth: number, canvasHeight: number) => {
    const { moveState, selectedCells } = get();
    
    if (!moveState) {
      return canvasData;
    }
    
    const totalOffset = {
      x: moveState.baseOffset.x + moveState.currentOffset.x,
      y: moveState.baseOffset.y + moveState.currentOffset.y
    };
    
    // Create new canvas data
    const newCells = new Map(canvasData);
    
    // Clear original positions
    moveState.originalPositions.forEach((key) => {
      newCells.delete(key);
    });
    
    // Place cells at new positions
    moveState.originalData.forEach((cell, key) => {
      const [origX, origY] = key.split(',').map(Number);
      const newX = origX + totalOffset.x;
      const newY = origY + totalOffset.y;
      
      // Only place if within bounds
      if (newX >= 0 && newX < canvasWidth && newY >= 0 && newY < canvasHeight) {
        newCells.set(`${newX},${newY}`, cell);
      }
    });
    
    // Update selection to new positions
    const newSelectedCells = new Set<string>();
    selectedCells.forEach((key) => {
      const [origX, origY] = key.split(',').map(Number);
      const newX = origX + totalOffset.x;
      const newY = origY + totalOffset.y;
      
      if (newX >= 0 && newX < canvasWidth && newY >= 0 && newY < canvasHeight) {
        newSelectedCells.add(`${newX},${newY}`);
      }
    });
    
    const bounds = getBoundsFromMask(newSelectedCells);
    
    set({
      selectedCells: newSelectedCells,
      bounds: bounds ? {
        minX: bounds.minX,
        minY: bounds.minY,
        maxX: bounds.maxX,
        maxY: bounds.maxY
      } : null,
      moveState: null
    });
    
    return newCells;
  },

  cancelMove: () => {
    set({
      moveState: null
    });
  },

  hasActiveMove: () => {
    return get().moveState !== null;
  },

  getTotalOffset: () => {
    const { moveState } = get();
    if (!moveState) {
      return { x: 0, y: 0 };
    }
    return {
      x: moveState.baseOffset.x + moveState.currentOffset.x,
      y: moveState.baseOffset.y + moveState.currentOffset.y
    };
  },

  // ─────────────────────────────────────────────────────────────
  // Clipboard Actions
  // ─────────────────────────────────────────────────────────────

  copySelection: (canvasData: Map<string, Cell>) => {
    const { selectedCells, isActive, moveState } = get();
    
    if (!isActive || selectedCells.size === 0) {
      return;
    }
    
    const clipboard = new Map<string, Cell>();
    const totalOffset = moveState ? {
      x: moveState.baseOffset.x + moveState.currentOffset.x,
      y: moveState.baseOffset.y + moveState.currentOffset.y
    } : { x: 0, y: 0 };
    
    // If moving, copy from original data at moved positions
    if (moveState) {
      moveState.originalData.forEach((cell, key) => {
        const [origX, origY] = key.split(',').map(Number);
        const newKey = `${origX + totalOffset.x},${origY + totalOffset.y}`;
        clipboard.set(newKey, { ...cell });
      });
    } else {
      // Normal copy from canvas
      selectedCells.forEach((cellKey) => {
        const cell = canvasData.get(cellKey);
        // Background-only cells are visible artwork too.
        if (cell && (cell.char !== ' ' || (cell.bgColor && cell.bgColor !== 'transparent'))) {
          clipboard.set(cellKey, { ...cell });
        }
      });
    }
    
    const bounds = getBoundsFromMask(new Set(clipboard.keys()));
    
    set({
      clipboard,
      clipboardBounds: bounds ? {
        minX: bounds.minX,
        minY: bounds.minY,
        maxX: bounds.maxX,
        maxY: bounds.maxY
      } : null
    });
  },

  getClipboard: () => {
    const { clipboard, clipboardBounds } = get();
    if (!clipboard || clipboard.size === 0 || !clipboardBounds) {
      return null;
    }
    return {
      data: new Map(clipboard),
      bounds: { ...clipboardBounds }
    };
  },

  hasClipboard: () => {
    const { clipboard } = get();
    return clipboard !== null && clipboard.size > 0;
  },

  // ─────────────────────────────────────────────────────────────
  // Query Methods
  // ─────────────────────────────────────────────────────────────

  isCellSelected: (x: number, y: number) => {
    const { selectedCells, isActive } = get();
    if (!isActive) return false;
    return selectedCells.has(`${x},${y}`);
  },

  isPointInSelection: (x: number, y: number) => {
    const { selectedCells, isActive, moveState } = get();
    if (!isActive || selectedCells.size === 0) return false;
    
    // If there's a move state, check against offset coordinates
    if (moveState) {
      const totalOffset = {
        x: moveState.baseOffset.x + moveState.currentOffset.x,
        y: moveState.baseOffset.y + moveState.currentOffset.y
      };
      
      // Convert click point back to original coordinates
      const originalX = x - totalOffset.x;
      const originalY = y - totalOffset.y;
      return selectedCells.has(`${originalX},${originalY}`);
    }
    
    return selectedCells.has(`${x},${y}`);
  },

  getBounds: () => {
    return get().bounds;
  },

  getSelectionSize: () => {
    return get().selectedCells.size;
  },

  // ─────────────────────────────────────────────────────────────
  // Frame Change Handling
  // ─────────────────────────────────────────────────────────────

  onFrameWillChange: (canvasData: Map<string, Cell>, canvasWidth: number, canvasHeight: number) => {
    const { moveState } = get();
    
    if (moveState) {
      // Commit the move and return the new canvas data
      const newData = get().commitMove(canvasData, canvasWidth, canvasHeight);
      return newData;
    }
    
    // No move in progress, no changes needed
    return null;
  }
}));

// ─────────────────────────────────────────────────────────────────
// Selector Hooks for Performance
// ─────────────────────────────────────────────────────────────────

/** Subscribe to just the active state */
export const useSelectionActive = () => useSelectionStore((state) => state.isActive);

/** Subscribe to just the selected cells */
export const useSelectedCells = () => useSelectionStore((state) => state.selectedCells);

/** Subscribe to just the bounds */
export const useSelectionBounds = () => useSelectionStore((state) => state.bounds);

/** Subscribe to move state */
export const useMoveState = () => useSelectionStore((state) => state.moveState);
