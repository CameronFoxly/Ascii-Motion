# ASCII Box Drawing Tool - Implementation Plan

**Date:** October 5, 2025  
**Status:** ✅ Ready for Implementation  
**Tool ID:** `asciibox`  
**Hotkey:** `Q`

---

## 1. Overview

The ASCII Box Drawing Tool allows users to draw lines, boxes, and tables using Unicode box-drawing characters. The tool automatically selects the correct character based on surrounding connections, similar to an automated tile-mapping system.

### Key Features
- **Three drawing modes**: Rectangle, Free Draw, and Erase
- **Multiple line styles**: Single line thin, single line thick, double line, rounded corners, etc.
- **Automatic character selection**: Smart connection detection for seamless box drawing
- **Preview mode**: Purple highlight overlay with live character updates
- **Side panel**: Similar to Gradient Fill and ASCII Type tools
- **Cancel/Apply workflow**: Restore original or commit changes with full undo support

---

## 2. Architecture Overview

### Component Structure
```
src/
├── components/
│   ├── features/
│   │   └── AsciiBoxPanel.tsx              # Side panel for tool configuration
│   ├── tools/
│   │   ├── AsciiBoxTool.tsx               # Main tool component
│   │   └── index.ts                       # Export new tool
├── hooks/
│   └── useAsciiBoxTool.ts                 # Tool logic and state management
├── stores/
│   └── asciiBoxStore.ts                   # Tool-specific Zustand store
├── utils/
│   ├── boxDrawingCharacters.ts            # Box character sets and definitions
│   └── boxDrawingEngine.ts                # Smart character selection algorithm
├── types/
│   └── index.ts                           # Add 'asciibox' to Tool type
└── constants/
    ├── hotkeys.ts                         # Add 'r' hotkey for asciibox
    └── boxDrawingStyles.ts                # Predefined box styles
```

---

## 3. Implementation Steps

### Step 1: Type System & Constants ✅

**Files to modify:**
- `src/types/index.ts`
- `src/constants/hotkeys.ts`
- `src/constants/boxDrawingStyles.ts` (new file)

**Tasks:**
1. Add `'asciibox'` to the `Tool` union type
2. Reassign Rectangle tool hotkey from 'r' to 'q' (or another available key)
3. Add ASCII Box tool hotkey as 'r'
4. Create box drawing style definitions with character sets

**Box Drawing Styles Structure:**
```typescript
export interface BoxDrawingStyle {
  id: string;
  name: string;
  characters: {
    // Corners
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
    
    // Lines
    horizontal: string;
    vertical: string;
    
    // T-junctions
    teeTop: string;
    teeBottom: string;
    teeLeft: string;
    teeRight: string;
    
    // Cross
    cross: string;
  };
  preview: string[][]; // 5x5 grid for style preview
}

export const BOX_DRAWING_STYLES: BoxDrawingStyle[] = [
  {
    id: 'single-line',
    name: 'Single Line',
    characters: {
      topLeft: '┌', topRight: '┐', bottomLeft: '└', bottomRight: '┘',
      horizontal: '─', vertical: '│',
      teeTop: '┬', teeBottom: '┴', teeLeft: '├', teeRight: '┤',
      cross: '┼'
    },
    preview: [
      ['┌', '─', '┬', '─', '┐'],
      ['│', ' ', '│', ' ', '│'],
      ['├', '─', '┼', '─', '┤'],
      ['│', ' ', '│', ' ', '│'],
      ['└', '─', '┴', '─', '┘']
    ]
  },
  {
    id: 'double-line',
    name: 'Double Line',
    characters: {
      topLeft: '╔', topRight: '╗', bottomLeft: '╚', bottomRight: '╝',
      horizontal: '═', vertical: '║',
      teeTop: '╦', teeBottom: '╩', teeLeft: '╠', teeRight: '╣',
      cross: '╬'
    },
    preview: [
      ['╔', '═', '╦', '═', '╗'],
      ['║', ' ', '║', ' ', '║'],
      ['╠', '═', '╬', '═', '╣'],
      ['║', ' ', '║', ' ', '║'],
      ['╚', '═', '╩', '═', '╝']
    ]
  },
  {
    id: 'heavy-line',
    name: 'Heavy Line',
    characters: {
      topLeft: '┏', topRight: '┓', bottomLeft: '┗', bottomRight: '┛',
      horizontal: '━', vertical: '┃',
      teeTop: '┳', teeBottom: '┻', teeLeft: '┣', teeRight: '┫',
      cross: '╋'
    },
    preview: [
      ['┏', '━', '┳', '━', '┓'],
      ['┃', ' ', '┃', ' ', '┃'],
      ['┣', '━', '╋', '━', '┫'],
      ['┃', ' ', '┃', ' ', '┃'],
      ['┗', '━', '┻', '━', '┛']
    ]
  },
  {
    id: 'rounded',
    name: 'Rounded',
    characters: {
      topLeft: '╭', topRight: '╮', bottomLeft: '╰', bottomRight: '╯',
      horizontal: '─', vertical: '│',
      teeTop: '┬', teeBottom: '┴', teeLeft: '├', teeRight: '┤',
      cross: '┼'
    },
    preview: [
      ['╭', '─', '┬', '─', '╮'],
      ['│', ' ', '│', ' ', '│'],
      ['├', '─', '┼', '─', '┤'],
      ['│', ' ', '│', ' ', '│'],
      ['╰', '─', '┴', '─', '╯']
    ]
  },
  {
    id: 'ascii-simple',
    name: 'ASCII Simple',
    characters: {
      topLeft: '+', topRight: '+', bottomLeft: '+', bottomRight: '+',
      horizontal: '-', vertical: '|',
      teeTop: '+', teeBottom: '+', teeLeft: '+', teeRight: '+',
      cross: '+'
    },
    preview: [
      ['+', '-', '+', '-', '+'],
      ['|', ' ', '|', ' ', '|'],
      ['+', '-', '+', '-', '+'],
      ['|', ' ', '|', ' ', '|'],
      ['+', '-', '+', '-', '+']
    ]
  }
];
```

---

### Step 2: Box Drawing Store ✅

**File:** `src/stores/asciiBoxStore.ts` (new file)

**Store Structure:**
```typescript
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
  isDrawing: false,
  lastPoint: null,
  
  // Panel actions
  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => {
    const { reset } = get();
    reset();
    set({ isPanelOpen: false });
  },
  
  setSelectedStyle: (styleId: string) => set({ selectedStyleId: styleId }),
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
  
  // Free draw mode
  startDrawing: (point) => set({ 
    isDrawing: true, 
    lastPoint: point 
  }),
  
  continueDrawing: (point) => {
    const { isDrawing } = get();
    if (!isDrawing) return;
    set({ lastPoint: point });
  },
  
  endDrawing: () => set({ 
    isDrawing: false,
    lastPoint: null 
  }),
  
  // Reset
  reset: () => set({
    isApplying: false,
    previewData: null,
    originalData: null,
    drawnCells: new Set(),
    rectangleStart: null,
    rectangleEnd: null,
    isDrawing: false,
    lastPoint: null
  })
}));
```

---

### Step 3: Box Drawing Engine ✅

**File:** `src/utils/boxDrawingEngine.ts` (new file)

This is the core logic that determines which box-drawing character to use based on surrounding cells.

**Algorithm:**
1. For each drawn cell, check all 4 neighbors (top, right, bottom, left)
2. Determine which neighbors are connected (contain box-drawing characters)
3. Select the appropriate character based on connection pattern
4. Handle special cases: corners, T-junctions, crosses, straight lines

**Connection Detection Logic:**
```typescript
import type { Cell } from '../types';
import type { BoxDrawingStyle } from '../constants/boxDrawingStyles';
import { BOX_DRAWING_STYLES } from '../constants/boxDrawingStyles';

interface ConnectionState {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

export function getBoxDrawingCharacter(
  connections: ConnectionState,
  style: BoxDrawingStyle
): string {
  const { top, right, bottom, left } = connections;
  const count = [top, right, bottom, left].filter(Boolean).length;
  
  // No connections - shouldn't happen in normal usage
  if (count === 0) {
    return style.characters.cross; // Default to cross
  }
  
  // Single connection - use appropriate line
  if (count === 1) {
    if (top || bottom) return style.characters.vertical;
    return style.characters.horizontal;
  }
  
  // Two connections
  if (count === 2) {
    // Straight lines
    if (top && bottom) return style.characters.vertical;
    if (left && right) return style.characters.horizontal;
    
    // Corners
    if (top && right) return style.characters.topLeft;
    if (top && left) return style.characters.topRight;
    if (bottom && right) return style.characters.bottomLeft;
    if (bottom && left) return style.characters.bottomRight;
  }
  
  // Three connections - T-junctions
  if (count === 3) {
    if (!top) return style.characters.teeTop;
    if (!right) return style.characters.teeRight;
    if (!bottom) return style.characters.teeBottom;
    if (!left) return style.characters.teeLeft;
  }
  
  // Four connections - cross
  return style.characters.cross;
}

export function detectConnections(
  x: number,
  y: number,
  drawnCells: Set<string>,
  currentStyle: BoxDrawingStyle,
  canvasData: Map<string, Cell>
): ConnectionState {
  const isBoxCharacter = (char: string): boolean => {
    // Check if character is part of any box drawing style
    for (const style of BOX_DRAWING_STYLES) {
      const chars = Object.values(style.characters);
      if (chars.includes(char)) return true;
    }
    return false;
  };
  
  const hasConnection = (nx: number, ny: number): boolean => {
    const key = `${nx},${ny}`;
    
    // Check if it's a cell we've drawn in this session
    if (drawnCells.has(key)) return true;
    
    // Check if it's an existing box character on canvas
    const cell = canvasData.get(key);
    if (cell && isBoxCharacter(cell.char)) return true;
    
    return false;
  };
  
  return {
    top: hasConnection(x, y - 1),
    right: hasConnection(x + 1, y),
    bottom: hasConnection(x, y + 1),
    left: hasConnection(x - 1, y)
  };
}

export function generateBoxRectangle(
  start: { x: number; y: number },
  end: { x: number; y: number },
  style: BoxDrawingStyle,
  canvasData: Map<string, Cell>,
  selectedColor: string,
  selectedBgColor: string
): { previewData: Map<string, Cell>; drawnCells: Set<string> } {
  const previewData = new Map<string, Cell>();
  const drawnCells = new Set<string>();
  
  const x1 = Math.min(start.x, end.x);
  const x2 = Math.max(start.x, end.x);
  const y1 = Math.min(start.y, end.y);
  const y2 = Math.max(start.y, end.y);
  
  // Draw rectangle outline
  for (let x = x1; x <= x2; x++) {
    for (let y = y1; y <= y2; y++) {
      // Only draw border cells
      const isBorder = x === x1 || x === x2 || y === y1 || y === y2;
      if (!isBorder) continue;
      
      const key = `${x},${y}`;
      drawnCells.add(key);
      
      // Determine connections for this cell
      const connections = detectConnections(x, y, drawnCells, style, canvasData);
      const char = getBoxDrawingCharacter(connections, style);
      
      previewData.set(key, {
        char,
        color: selectedColor,
        bgColor: selectedBgColor
      });
    }
  }
  
  // Second pass - update all cells with final connections
  // (Some cells may need different characters after all cells are drawn)
  drawnCells.forEach(key => {
    const [x, y] = key.split(',').map(Number);
    const connections = detectConnections(x, y, drawnCells, style, canvasData);
    const char = getBoxDrawingCharacter(connections, style);
    
    previewData.set(key, {
      char,
      color: selectedColor,
      bgColor: selectedBgColor
    });
  });
  
  return { previewData, drawnCells };
}

export function addBoxCell(
  x: number,
  y: number,
  drawnCells: Set<string>,
  style: BoxDrawingStyle,
  canvasData: Map<string, Cell>,
  selectedColor: string,
  selectedBgColor: string
): { char: string; affectedCells: Set<string> } {
  const key = `${x},${y}`;
  drawnCells.add(key);
  
  // Cells that need to be recalculated (this cell + its neighbors)
  const affectedCells = new Set<string>([key]);
  
  // Add neighboring cells to affected set if they're box characters
  const neighbors = [
    { x: x, y: y - 1 }, // top
    { x: x + 1, y }, // right
    { x: x, y: y + 1 }, // bottom
    { x: x - 1, y } // left
  ];
  
  neighbors.forEach(({ x: nx, y: ny }) => {
    const nKey = `${nx},${ny}`;
    if (drawnCells.has(nKey)) {
      affectedCells.add(nKey);
    }
  });
  
  // Calculate character for this cell
  const connections = detectConnections(x, y, drawnCells, style, canvasData);
  const char = getBoxDrawingCharacter(connections, style);
  
  return { char, affectedCells };
}

export function eraseBoxCell(
  x: number,
  y: number,
  drawnCells: Set<string>,
  style: BoxDrawingStyle,
  canvasData: Map<string, Cell>
): Set<string> {
  const key = `${x},${y}`;
  drawnCells.delete(key);
  
  // Neighboring cells that need recalculation
  const affectedCells = new Set<string>();
  
  const neighbors = [
    { x: x, y: y - 1 },
    { x: x + 1, y },
    { x: x, y: y + 1 },
    { x: x - 1, y }
  ];
  
  neighbors.forEach(({ x: nx, y: ny }) => {
    const nKey = `${nx},${ny}`;
    if (drawnCells.has(nKey)) {
      affectedCells.add(nKey);
    }
  });
  
  return affectedCells;
}
```

---

### Step 4: ASCII Box Tool Hook ✅

**File:** `src/hooks/useAsciiBoxTool.ts` (new file)

This hook integrates the store, engine, and canvas interactions.

**Key Responsibilities:**
1. Handle mouse events for drawing
2. Generate preview data
3. Apply/cancel preview
4. Integrate with undo/redo system
5. Support shift+click line drawing for free draw mode

**Hook Structure:**
```typescript
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
  getBoxDrawingCharacter
} from '../utils/boxDrawingEngine';
import type { Cell } from '../types';
import type { CanvasHistoryAction } from '../types';

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
        drawLineBetweenPoints(lastPoint, { x, y });
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
      }
    } else if (drawingMode === 'erase') {
      // Erase mode
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
  }, [/* ... dependencies ... */]);
  
  // Handle mouse drag for free draw mode
  const handleCanvasDrag = useCallback((x: number, y: number) => {
    if (activeTool !== 'asciibox' || drawingMode !== 'freedraw' || !isDrawing) return;
    
    continueDrawing({ x, y });
    
    // Add cells along the drag path
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
  }, [/* ... dependencies ... */]);
  
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
    
    // Reset state
    reset();
    setActiveTool('pencil');
  }, [/* ... dependencies ... */]);
  
  // Cancel preview
  const cancelPreview = useCallback(() => {
    reset();
    setActiveTool('pencil');
  }, [reset, setActiveTool]);
  
  return {
    // State
    isPanelOpen,
    selectedStyleId,
    drawingMode,
    isApplying,
    previewData,
    currentStyle,
    
    // Actions
    setSelectedStyle,
    setDrawingMode,
    handleCanvasClick,
    handleCanvasDrag,
    applyPreview,
    cancelPreview,
    closePanel
  };
};
```

---

### Step 5: ASCII Box Tool Component ✅

**File:** `src/components/tools/AsciiBoxTool.tsx` (new file)

Simple component that handles behavior and status display.

```typescript
import React from 'react';
import { useAsciiBoxTool } from '../../hooks/useAsciiBoxTool';

export const AsciiBoxTool: React.FC = () => {
  // Tool behavior is handled through the hook
  // No direct rendering needed
  return null;
};

export const AsciiBoxToolStatus: React.FC = () => {
  const { drawingMode, isApplying, currentStyle } = useAsciiBoxTool();
  
  if (!isApplying) {
    return (
      <span className="text-muted-foreground">
        ASCII Box: Click to start drawing • Style: {currentStyle.name} • Mode: {drawingMode}
      </span>
    );
  }
  
  return (
    <span className="text-muted-foreground">
      ASCII Box: Drawing ({drawingMode}) • Enter to apply • Escape to cancel
    </span>
  );
};
```

**Export in:** `src/components/tools/index.ts`

---

### Step 6: ASCII Box Panel Component ✅

**File:** `src/components/features/AsciiBoxPanel.tsx` (new file)

Side panel for configuring the tool, similar to Gradient Fill panel.

**Panel Structure:**
- **Style selector**: Navigation buttons with preview grid
- **Mode toggle**: Three-button group (Rectangle / Free Draw / Erase)
- **Sticky footer**: Cancel and Apply buttons

```typescript
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '../ui/label';
import { PANEL_ANIMATION } from '../../constants';
import { BOX_DRAWING_STYLES } from '../../constants/boxDrawingStyles';
import { useAsciiBoxTool } from '../../hooks/useAsciiBoxTool';
import { cn } from '../../lib/utils';
import { X, ChevronLeft, ChevronRight, Square, PenTool, Eraser } from 'lucide-react';
import type { BoxDrawingMode } from '../../stores/asciiBoxStore';

const parseTailwindDuration = (token: string): number | null => {
  const match = token.match(/duration-(\d+)/);
  return match ? Number(match[1]) : null;
};

export function AsciiBoxPanel() {
  const {
    isPanelOpen,
    selectedStyleId,
    drawingMode,
    isApplying,
    setSelectedStyle,
    setDrawingMode,
    applyPreview,
    cancelPreview,
    closePanel
  } = useAsciiBoxTool();
  
  const [shouldRender, setShouldRender] = useState(isPanelOpen);
  const [isAnimating, setIsAnimating] = useState(isPanelOpen);
  
  const animationDurationMs = useMemo(
    () => parseTailwindDuration(PANEL_ANIMATION.DURATION) ?? 300,
    []
  );
  
  useEffect(() => {
    if (isPanelOpen) {
      setShouldRender(true);
      requestAnimationFrame(() => setIsAnimating(true));
    } else if (shouldRender) {
      setIsAnimating(false);
      const timer = setTimeout(() => setShouldRender(false), animationDurationMs);
      return () => clearTimeout(timer);
    }
  }, [isPanelOpen, shouldRender, animationDurationMs]);
  
  const currentStyleIndex = BOX_DRAWING_STYLES.findIndex(s => s.id === selectedStyleId);
  const currentStyle = BOX_DRAWING_STYLES[currentStyleIndex];
  
  const handlePreviousStyle = useCallback(() => {
    const newIndex = currentStyleIndex === 0 
      ? BOX_DRAWING_STYLES.length - 1 
      : currentStyleIndex - 1;
    setSelectedStyle(BOX_DRAWING_STYLES[newIndex].id);
  }, [currentStyleIndex, setSelectedStyle]);
  
  const handleNextStyle = useCallback(() => {
    const newIndex = (currentStyleIndex + 1) % BOX_DRAWING_STYLES.length;
    setSelectedStyle(BOX_DRAWING_STYLES[newIndex].id);
  }, [currentStyleIndex, setSelectedStyle]);
  
  const handleModeChange = useCallback((mode: BoxDrawingMode) => {
    setDrawingMode(mode);
  }, [setDrawingMode]);
  
  if (!shouldRender) return null;
  
  return (
    <div
      className={cn(
        'fixed top-0 right-0 h-screen w-80 bg-background border-l border-border shadow-lg z-[100]',
        PANEL_ANIMATION.TRANSITION,
        isAnimating ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Square className="w-5 h-5" />
          ASCII Box Drawing
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={cancelPreview}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Content */}
      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="p-4 space-y-6">
          
          {/* Box Style Selector */}
          <div className="space-y-2">
            <Label>Box Style</Label>
            
            {/* Style Preview Grid */}
            <div className="bg-muted rounded-md p-4 flex items-center justify-center">
              <div className="font-mono text-sm leading-tight">
                {currentStyle.preview.map((row, i) => (
                  <div key={i} className="flex">
                    {row.map((char, j) => (
                      <span key={j} className="inline-block w-4 text-center">
                        {char}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Style Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousStyle}
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="flex-1 text-center text-sm font-medium">
                {currentStyle.name}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextStyle}
                className="flex-1"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Drawing Mode */}
          <div className="space-y-2">
            <Label>Drawing Mode</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={drawingMode === 'rectangle' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleModeChange('rectangle')}
                className="flex flex-col gap-1 h-auto py-2"
              >
                <Square className="w-4 h-4" />
                <span className="text-xs">Rectangle</span>
              </Button>
              
              <Button
                variant={drawingMode === 'freedraw' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleModeChange('freedraw')}
                className="flex flex-col gap-1 h-auto py-2"
              >
                <PenTool className="w-4 h-4" />
                <span className="text-xs">Free Draw</span>
              </Button>
              
              <Button
                variant={drawingMode === 'erase' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleModeChange('erase')}
                className="flex flex-col gap-1 h-auto py-2"
              >
                <Eraser className="w-4 h-4" />
                <span className="text-xs">Erase</span>
              </Button>
            </div>
          </div>
          
          {/* Mode Description */}
          <div className="text-xs text-muted-foreground space-y-1">
            {drawingMode === 'rectangle' && (
              <p>Click to set start point, then click again to draw rectangle outline.</p>
            )}
            {drawingMode === 'freedraw' && (
              <p>Click or drag to draw box lines. Shift+click for straight lines.</p>
            )}
            {drawingMode === 'erase' && (
              <p>Click or drag to erase box drawing characters.</p>
            )}
          </div>
          
        </div>
      </ScrollArea>
      
      {/* Footer Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-background">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={cancelPreview}
            className="flex-1"
          >
            Cancel (Esc)
          </Button>
          <Button
            onClick={applyPreview}
            className="flex-1"
            disabled={!isApplying}
          >
            Apply (Enter)
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

### Step 7: Canvas Integration ✅

**Files to modify:**
- `src/components/features/ToolManager.tsx`
- `src/components/features/ToolStatusManager.tsx`
- `src/components/features/CanvasOverlay.tsx`
- `src/hooks/useCanvasMouseHandlers.ts`
- `src/App.tsx` (to render AsciiBoxPanel)

**ToolManager.tsx:**
```typescript
// Add import
import { AsciiBoxTool } from '../tools/AsciiBoxTool';

// Add to render logic
{activeTool === 'asciibox' && <AsciiBoxTool />}
```

**ToolStatusManager.tsx:**
```typescript
// Add import
import { AsciiBoxToolStatus } from '../tools/AsciiBoxTool';

// Add to render logic
{activeTool === 'asciibox' && <AsciiBoxToolStatus />}
```

**CanvasOverlay.tsx:**
Add rendering for ASCII Box preview (purple highlight + live character updates):

```typescript
// Import store
import { useAsciiBoxStore } from '../../stores/asciiBoxStore';

// In component
const { isApplying: boxApplying, previewData: boxPreview, drawnCells: boxDrawnCells } = useAsciiBoxStore();

// In render function (after gradient preview)
// Draw ASCII Box preview
if (boxApplying && boxPreview && boxPreview.size > 0) {
  ctx.save();
  
  // Draw highlight for drawn cells
  boxDrawnCells.forEach(cellKey => {
    const [x, y] = cellKey.split(',').map(Number);
    
    // Purple highlight
    ctx.fillStyle = 'rgba(168, 85, 247, 0.2)'; // Purple with 20% opacity
    ctx.fillRect(
      x * effectiveCellWidth + panOffset.x,
      y * effectiveCellHeight + panOffset.y,
      effectiveCellWidth,
      effectiveCellHeight
    );
  });
  
  // Draw characters
  ctx.font = drawingStyles.font;
  ctx.textAlign = drawingStyles.textAlign;
  ctx.textBaseline = drawingStyles.textBaseline;
  
  boxPreview.forEach((cell, cellKey) => {
    const [x, y] = cellKey.split(',').map(Number);
    
    const pixelX = x * effectiveCellWidth + panOffset.x;
    const pixelY = y * effectiveCellHeight + panOffset.y;
    
    // Draw character
    ctx.fillStyle = cell.color;
    ctx.fillText(
      cell.char,
      pixelX + effectiveCellWidth / 2,
      pixelY + effectiveCellHeight / 2
    );
  });
  
  ctx.restore();
}
```

**useCanvasMouseHandlers.ts:**
Integrate ASCII Box tool mouse handlers:

```typescript
// Import hook
import { useAsciiBoxTool } from './useAsciiBoxTool';

// In hook
const { handleCanvasClick: handleBoxClick, handleCanvasDrag: handleBoxDrag } = useAsciiBoxTool();

// In handleMouseDown
if (effectiveTool === 'asciibox') {
  handleBoxClick(x, y, event.shiftKey);
  return;
}

// In handleMouseMove (for drag)
if (effectiveTool === 'asciibox' && isMouseDown) {
  handleBoxDrag(x, y);
  return;
}
```

**App.tsx:**
```typescript
// Import panel
import { AsciiBoxPanel } from './components/features/AsciiBoxPanel';

// Render panel
<AsciiBoxPanel />
```

---

### Step 8: Tool Palette Integration ✅

**File:** `src/components/features/ToolPalette.tsx`

Add ASCII Box tool to the drawing tools section:

```typescript
import { Grid2x2 } from 'lucide-react'; // Grid icon for box tool

const DRAWING_TOOLS: Array<{ id: Tool; name: string; icon: React.ReactNode; description: string }> = [
  { id: 'pencil', name: 'Pencil', icon: <PenTool className="w-3 h-3" />, description: 'Draw characters' },
  { id: 'eraser', name: 'Eraser', icon: <Eraser className="w-3 h-3" />, description: 'Remove characters' },
  { id: 'paintbucket', name: 'Fill', icon: <PaintBucket className="w-3 h-3" />, description: 'Fill connected areas' },
  { id: 'gradientfill', name: 'Gradient', icon: <GradientIcon className="w-3 h-3" />, description: 'Apply gradient fills' },
  { id: 'rectangle', name: 'Rectangle', icon: <Square className="w-3 h-3" />, description: 'Draw rectangles' },
  { id: 'ellipse', name: 'Ellipse', icon: <Circle className="w-3 h-3" />, description: 'Draw ellipses/circles' },
  { id: 'text', name: 'Text', icon: <Type className="w-3 h-3" />, description: 'Type text directly' },
  { id: 'asciitype', name: 'ASCII Type', icon: <TypeOutline className="w-3 h-3" />, description: 'Create Figlet ASCII text' },
  { id: 'asciibox', name: 'ASCII Box', icon: <Grid2x2 className="w-3 h-3" />, description: 'Draw box drawing characters' }, // NEW
];
```

---

### Step 9: Keyboard Shortcuts ✅

**Files to modify:**
- `src/hooks/useKeyboardShortcuts.ts`
- `src/components/features/KeyboardShortcutsDialog.tsx`

**useKeyboardShortcuts.ts:**
Add Enter and Escape handlers for ASCII Box tool:

```typescript
// In keyboard handler
if (activeTool === 'asciibox') {
  const { isApplying, applyPreview, cancelPreview } = useAsciiBoxStore.getState();
  
  if (event.key === 'Enter' && isApplying) {
    event.preventDefault();
    applyPreview();
    return;
  }
  
  if (event.key === 'Escape' && isApplying) {
    event.preventDefault();
    cancelPreview();
    return;
  }
}
```

**KeyboardShortcutsDialog.tsx:**
Add ASCII Box tool to the shortcuts list.

---

### Step 10: Testing & Refinement ✅

**Manual Testing Checklist:**
- [ ] Rectangle mode: Click start, click end, verify rectangle drawn
- [ ] Free draw mode: Click/drag to draw lines
- [ ] Free draw mode: Shift+click for straight lines
- [ ] Erase mode: Remove box characters
- [ ] Character selection: Verify correct characters at corners, T-junctions, crosses
- [ ] Style switching: Test all 5 box styles
- [ ] Preview overlay: Purple highlight visible
- [ ] Cancel: Verify original canvas restored
- [ ] Apply: Verify preview committed to canvas
- [ ] Undo/Redo: Verify history integration
- [ ] Connected detection: Draw multiple boxes, verify proper connections
- [ ] Hotkey 'r': Switch to ASCII Box tool
- [ ] Enter key: Apply preview
- [ ] Escape key: Cancel preview

---

## 4. UI/UX Considerations

### Visual Design
- **Purple highlight**: `rgba(168, 85, 247, 0.2)` for drawn cell backgrounds
- **Live character updates**: Characters update as user draws
- **Clear mode indication**: Active mode button highlighted in panel
- **Style preview**: 5x5 grid showing box pattern

### User Workflow
1. Select ASCII Box tool (hotkey 'r')
2. Panel opens on right side
3. Choose box style (< > navigation)
4. Choose drawing mode (Rectangle/Free Draw/Erase)
5. Draw on canvas with live preview
6. Enter to apply or Escape to cancel
7. Tool switches back to pencil

### Performance Considerations
- Recalculate only affected cells (current + neighbors)
- Use Set for O(1) lookup of drawn cells
- Debounce drag events if needed for large canvases
- Preview data stored as Map for efficient updates

---

## 5. Future Enhancements

### Phase 2 Features (Post-MVP)
- **Custom box styles**: Allow users to define their own character sets
- **Table mode**: Quick table creation with column/row controls
- **Line continuation**: Detect and extend existing box lines
- **Smart fill**: Fill rectangles with pattern characters
- **Multi-style mixing**: Different styles for different elements
- **Copy/paste box sections**: Preserve box structure

---

## 6. Documentation Updates Required

**After implementation, update:**
1. `COPILOT_INSTRUCTIONS.md`: Add ASCII Box tool to tool architecture table
2. `DEVELOPMENT.md`: Mark Phase 4 ASCII Box tool as complete
3. `docs/ASCII_BOX_TOOL_USER_GUIDE.md`: Create user guide (new file)
4. `README.md`: Add ASCII Box tool to features list

---

## 7. Implementation Timeline

**Estimated effort:** 8-12 hours

| Step | Estimated Time | Priority |
|------|---------------|----------|
| 1. Type System & Constants | 1 hour | High |
| 2. Box Drawing Store | 1 hour | High |
| 3. Box Drawing Engine | 3 hours | High |
| 4. ASCII Box Tool Hook | 2 hours | High |
| 5. Tool Component | 30 min | High |
| 6. Panel Component | 2 hours | High |
| 7. Canvas Integration | 1.5 hours | High |
| 8. Tool Palette Integration | 30 min | Medium |
| 9. Keyboard Shortcuts | 30 min | Medium |
| 10. Testing & Refinement | 2 hours | High |

---

## 9. Implementation Decisions ✅

All questions resolved. Ready to proceed with implementation:

1. **Hotkey Assignment**: ASCII Box tool uses **'Q'** hotkey. Rectangle tool keeps 'R'. ✅

2. **Color Application**: Tool uses currently selected text color and background color from tool store. ✅

3. **Erase Mode Behavior**: Erase mode only removes cells drawn in the current session (tracked in `drawnCells` set). Pre-existing box characters on canvas are preserved. ✅

4. **Style Switching Mid-Drawing**: When user changes box style during preview, all existing preview cells are updated to the new style. No mixing of styles within a single drawing session. ✅

5. **Free Draw Mode Behavior**: 
   - Uses same gap-filling algorithm as pencil tool during drag operations ✅
   - Supports shift+click for straight line drawing ✅
   - No brush size controls (always single cell width) ✅

---

## 10. Success Criteria

**The ASCII Box Drawing Tool is considered complete when:**

✅ Users can draw rectangles with automatic corner/junction detection  
✅ Free draw mode supports click/drag and shift+click line drawing  
✅ Erase mode removes box characters and updates connections  
✅ All 5 box styles work correctly  
✅ Preview overlay shows purple highlight and live character updates  
✅ Cancel restores original canvas state  
✅ Apply commits changes with undo/redo support  
✅ Tool integrates seamlessly with existing tool architecture  
✅ Hotkey 'Q' switches to ASCII Box tool  
✅ No regressions in existing tools  

---

## 11. Implementation Notes

### Key Architecture Decisions:

1. **Dedicated store**: Following gradient fill pattern with dedicated Zustand store
2. **Smart character selection**: Algorithm checks 4-directional connections
3. **Preview pattern**: Uses same overlay system as gradient/ASCII type
4. **Mode separation**: Three distinct modes with shared character logic
5. **Style persistence**: Selected style persists across tool sessions
6. **Connection detection**: Works with both drawn cells and existing canvas cells

### Code Patterns to Follow:

- **Store pattern**: Similar to `gradientStore.ts` and `asciiTypeStore.ts`
- **Hook pattern**: Similar to `useGradientFillTool.ts` and `useAsciiTypeTool.ts`
- **Panel pattern**: Similar to `AsciiTypePanel.tsx` with sticky footer
- **Preview pattern**: Similar to gradient overlay rendering

---

**Ready to begin implementation? Please confirm hotkey assignment and answer open questions above before proceeding.**
