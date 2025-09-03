# ASCII Motion - Copilot Development Instructions

## 🚨 **MANDATORY: DOCUMENTATION UPDATE PROTOCOL** 🚨

### **⚠️ STOP: Read This Before Making ANY Changes ⚠️**

**EVERY architectural change MUST include documentation updates. No exceptions.**

#### **🔥 IMMEDIATE ACTION REQUIRED After ANY Code Change:**

**Before considering your work "complete", you MUST complete this checklist:**

✅ **1. UPDATE COPILOT_INSTRUCTIONS.md (THIS FILE):**
   - [ ] Update "Current Architecture Status" section (lines 150-200)
   - [ ] Update relevant code patterns and examples  
   - [ ] Update file structure if files were added/moved
   - [ ] Update component patterns if new patterns introduced
   - [ ] Add new development guidelines if applicable

✅ **2. UPDATE DEVELOPMENT.md:**
   - [ ] Mark completed steps with ✅ **COMPLETE** status
   - [ ] Update current phase/step status
   - [ ] Add new architectural decisions to the log
   - [ ] Update timeline estimates and next steps
   - [ ] Document any breaking changes or migration steps

✅ **3. VALIDATE DOCUMENTATION CONSISTENCY:**
   - [ ] Search for outdated patterns that conflict with changes
   - [ ] Remove or update deprecated examples
   - [ ] Verify all code examples reflect current architecture
   - [ ] Update import statements and API references

✅ **4. TEST DOCUMENTATION ACCURACY:**
   - [ ] Ensure new contributors could follow the updated docs
   - [ ] Verify code examples compile and work
   - [ ] Check that docs reflect actual codebase state
   - [ ] Test that documented patterns match implemented code

### **🎯 Documentation Update Triggers (NEVER SKIP):**
- ✅ Creating new hooks, components, or utilities
- ✅ Modifying existing architectural patterns  
- ✅ Completing any refactoring step or phase
- ✅ Adding new development tools or workflows
- ✅ Changing file structure or organization
- ✅ Introducing new performance optimizations
- ✅ Adding new state management patterns

### **💥 ENFORCEMENT: If Documentation Is Not Updated**
- **Your changes are incomplete** - Documentation debt creates confusion
- **Future developers will be misled** - Outdated docs are worse than no docs
- **Architecture will deteriorate** - Patterns won't be followed consistently
- **Project velocity will slow** - Time wasted on confusion and rework

### **🎪 Quick Documentation Health Check:**
Before submitting any architectural change, ask yourself:
- ❓ Could a new team member understand the current architecture from the docs?
- ❓ Do all code examples in COPILOT_INSTRUCTIONS.md work with current code?
- ❓ Does DEVELOPMENT.md accurately reflect what's been completed?
- ❓ Are there conflicting patterns or outdated instructions anywhere?

---

## Project Context
ASCII Motion is a React + TypeScript web application for creating and animating ASCII art. We use Vite for building, Shadcn/ui for components, Zustand for state management, and Tailwind CSS for styling.

## 🚨 **CRITICAL: Adding New Tools**
**When adding ANY new drawing tool, ALWAYS follow the 8-step componentized pattern in Section 3 below.** This maintains architectural consistency and ensures all tools work seamlessly together. Do NOT add tool logic directly to CanvasGrid or mouse handlers.

**📋 REMINDER: After implementing ANY new tool, update both COPILOT_INSTRUCTIONS.md and DEVELOPMENT.md per the protocol above.**

## Code Organization Principles

### 1. Component Architecture
**Follow the Atomic Design Pattern:**
- **Atoms**: Basic UI elements (Button, Input, Icon)
- **Molecules**: Simple combinations (ToolButton, FrameThumbnail, ColorPicker)
- **Organisms**: Complex components (Timeline, Canvas, ToolPalette)
- **Templates**: Page layouts
- **Pages**: Complete views

**IMPORTANT: Canvas Component Refactoring Pattern (Post Phase 1.5)**
The canvas system has been refactored to use Context + Hooks pattern for better maintainability:

**Canvas Architecture:**
```
src/
├── contexts/
│   └── CanvasContext.tsx          # Canvas-specific state provider
├── hooks/
│   ├── useCanvasState.ts          # Canvas state management
│   ├── useCanvasMouseHandlers.ts  # Mouse interaction routing
│   ├── useCanvasSelection.ts      # Selection-specific logic
│   ├── useCanvasDragAndDrop.ts    # Drawing/rectangle tools
│   ├── useCanvasRenderer.ts       # Grid & overlay rendering
│   └── useToolBehavior.ts         # Tool coordination & metadata
├── components/
│   ├── organisms/
│   │   ├── CanvasGrid.tsx         # Main composition component (111 lines)
│   │   ├── ToolManager.tsx        # Active tool component renderer (34 lines)
│   │   └── ToolStatusManager.tsx  # Tool status UI renderer (34 lines)
│   └── tools/                     # Tool-specific components
│       ├── SelectionTool.tsx      # Selection behavior & status (53 lines)
│       ├── DrawingTool.tsx        # Pencil/eraser logic & status (42 lines)
│       ├── PaintBucketTool.tsx    # Fill tool & status (30 lines)
│       ├── RectangleTool.tsx      # Rectangle drawing & status (30 lines)
│       ├── EyedropperTool.tsx     # Color picking & status (26 lines)
│       └── index.ts               # Tool exports
```

**Canvas Component Pattern:**
```tsx
// ✅ NEW PATTERN: Use CanvasProvider + Context
function App() {
  return (
    <CanvasProvider>
      <CanvasGrid className="w-full" />
    </CanvasProvider>
  );
}

// ✅ Inside canvas components, use context hooks:
function CanvasGrid() {
  const { canvasRef, cellSize } = useCanvasContext();
  const { statusMessage, commitMove } = useCanvasState();
  const { getGridCoordinates } = useCanvasDimensions();
  // ...
}
```

**Directory Structure (Updated with Step 5.1):**
```
src/
├── components/
│   ├── atoms/
│   │   ├── CellRenderer.tsx           # Memoized cell rendering (NEW)
│   │   ├── PerformanceMonitor.tsx     # Development performance UI (NEW)
│   │   └── Button.tsx
│   ├── molecules/
│   ├── organisms/
│   └── templates/
├── hooks/
│   ├── useCanvasRenderer.ts           # Optimized with memoization
│   ├── useMemoizedGrid.ts             # Grid-level optimization (NEW)
│   └── ...
├── stores/
├── types/
├── utils/
│   ├── performance.ts                 # Performance measurement tools (NEW)
│   └── ...
├── constants/
└── lib/
```

### 2. State Management with Zustand
**Create focused, single-responsibility stores:**
- `useCanvasStore` - Canvas data, dimensions, current frame
- `useAnimationStore` - Timeline, frames, playback state
- `useToolStore` - Active tool, tool settings, drawing state
- `useProjectStore` - Project metadata, save/load operations
- `useUIStore` - UI state, panels, dialogs

**Store Patterns:**
```typescript
// ✅ Good: Focused store with clear responsibilities
const useCanvasStore = create<CanvasState>((set, get) => ({
  // State
  width: 80,
  height: 24,
  cells: new Map<string, Cell>(),
  
  // Actions
  setCell: (x: number, y: number, cell: Cell) => 
    set((state) => ({
      cells: new Map(state.cells).set(`${x},${y}`, cell)
    })),
    
  clearCanvas: () => set({ cells: new Map() }),
  
  // Computed values
  getCellAt: (x: number, y: number) => get().cells.get(`${x},${y}`),
}));

// ❌ Avoid: Monolithic store with mixed concerns
const useAppStore = create(() => ({
  // Don't mix canvas, animation, tools, and UI state
}));
```

**Context + Hooks Pattern (Canvas System):**
```typescript
// ✅ NEW PATTERN: Context for component-specific state
export const CanvasProvider = ({ children }) => {
  const [cellSize, setCellSize] = useState(12);
  const [isDrawing, setIsDrawing] = useState(false);
  // ... other local state
  
  return (
    <CanvasContext.Provider value={{ cellSize, isDrawing, ... }}>
      {children}
    </CanvasContext.Provider>
  );
};

// ✅ Custom hooks for complex logic
export const useCanvasState = () => {
  const context = useCanvasContext();
  const { width, height } = useCanvasStore();
  
  // Computed values and helper functions
  const statusMessage = useMemo(() => {
    // Complex status logic
  }, [/* deps */]);
  
  return { statusMessage, /* other helpers */ };
};

// ✅ Tool-specific mouse handlers (Step 2 pattern)
export const useCanvasMouseHandlers = () => {
  const { activeTool } = useToolStore();
  const selectionHandlers = useCanvasSelection();
  const drawingHandlers = useCanvasDragAndDrop();
  
  const handleMouseDown = useCallback((event) => {
    switch (activeTool) {
      case 'select': return selectionHandlers.handleSelectionMouseDown(event);
      case 'rectangle': return drawingHandlers.handleRectangleMouseDown(event);
      // ... other tools
    }
  }, [activeTool, selectionHandlers, drawingHandlers]);
  
  return { handleMouseDown, handleMouseMove, handleMouseUp };
};
```

**🚨 CRITICAL: Zustand Hook Dependencies Pattern**
When creating hooks that use Zustand store data in useCallback/useMemo/useEffect:

```typescript
// ✅ CORRECT: Include reactive store data in dependencies
export const useCanvasRenderer = () => {
  const { width, height, cells, getCell } = useCanvasStore(); // Extract all needed data
  
  const renderCanvas = useCallback(() => {
    // Logic that uses getCell() and reads cells indirectly
  }, [width, height, cells, getCell]); // Include 'cells' even if using getCell()
  
  return { renderCanvas };
};

// ❌ INCORRECT: Missing reactive data dependencies
export const useCanvasRenderer = () => {
  const { getCell } = useCanvasStore(); // Only getter, missing 'cells'
  
  const renderCanvas = useCallback(() => {
    // Logic reads cells via getCell() but won't re-run when cells change
  }, [getCell]); // Missing 'cells' - BUG!
};
```

**Lesson Learned (Step 3)**: Always include the actual reactive data objects in dependency arrays, not just getters. This ensures hooks re-run when Zustand state changes.

**Component Splitting Rules:**
- **Single Responsibility**: Each component should have one clear purpose
- **Size Limit**: No component should exceed ~200 lines
- **Extract When**:
  - Multiple `useState` calls (consider Context)
  - Complex event handlers (extract to hooks)
  - Repeated logic (extract to utilities)
  - Tool-specific behavior (extract to tool components)

### 3. Component Patterns

**Prefer Composition over Props:**
```typescript
// ✅ Good: Composable tool palette
<ToolPalette>
  <ToolSection title="Drawing">
    <PencilTool />
    <EraserTool />
    <PaintBucketTool />
  </ToolSection>
  <ToolSection title="Selection">
    <SelectTool />
    <RectangleTool />
  </ToolSection>
</ToolPalette>

// ❌ Avoid: Props-heavy configuration
<ToolPalette 
  tools={['pencil', 'eraser', 'paintbucket']}
  sections={[...]}
  config={...}
/>
```

**Use Custom Hooks for Logic:**
```typescript
// ✅ Good: Extract complex logic to hooks
const useDrawingTool = (tool: Tool) => {
  const { setCell } = useCanvasStore();
  const { selectedChar, selectedColor } = useToolStore();
  
  const handleMouseDown = useCallback((x: number, y: number) => {
    // Drawing logic here
  }, [tool, selectedChar, selectedColor]);
  
  return { handleMouseDown, handleMouseMove, handleMouseUp };
};

// ❌ Avoid: Logic directly in components
const Canvas = () => {
  // Lots of drawing logic mixed with rendering
};
```

### 🔧 **Adding New Tools - Step-by-Step Guide**

**CRITICAL**: When adding ANY new tool, follow this exact pattern to maintain architectural consistency.

#### **Step 1: Update Tool Type Definition**
```typescript
// In src/types/index.ts, add your tool to the Tool union type:
type Tool = 
  | 'pencil' 
  | 'eraser' 
  | 'paintbucket' 
  | 'select' 
  | 'rectangle' 
  | 'eyedropper'
  | 'your-new-tool'; // Add this line
```

#### **Step 2: Create Tool Component**
Create `src/components/tools/YourNewTool.tsx`:

```typescript
import React from 'react';
import { useToolStore } from '../../stores/toolStore';
// Import any needed hooks for your tool's logic

/**
 * Your New Tool Component
 * Handles [describe what your tool does]
 */
export const YourNewTool: React.FC = () => {
  // Use existing hooks for tool logic, or create new ones
  // Example: useDrawingTool(), useCanvasDragAndDrop(), etc.
  
  return null; // No direct UI - handles behavior through hooks
};

/**
 * Your New Tool Status Component
 * Provides visual feedback about the tool's current state
 */
export const YourNewToolStatus: React.FC = () => {
  const { /* relevant tool store values */ } = useToolStore();

  return (
    <span className="text-[color]-600">
      [Tool Name]: [Current state/instruction for user]
    </span>
  );
};
```

#### **Step 3: Add Tool to Index**
Update `src/components/tools/index.ts`:

```typescript
// Add exports
export { YourNewTool, YourNewToolStatus } from './YourNewTool';

// Update type
export type ToolComponent = 
  | 'SelectionTool'
  | 'DrawingTool' 
  | 'PaintBucketTool'
  | 'RectangleTool'
  | 'EyedropperTool'
  | 'YourNewTool'; // Add this
```

#### **Step 4: Update Tool Behavior Hook**
Update `src/hooks/useToolBehavior.ts`:

```typescript
// Add to getActiveToolComponent:
case 'your-new-tool':
  return 'YourNewTool';

// Add to getActiveToolStatusComponent:
case 'your-new-tool':
  return 'YourNewToolStatus';

// Add to getToolDisplayName:
case 'your-new-tool':
  return 'Your New Tool';

// Update other methods as needed (cursor, isDrawingTool, etc.)
```

#### **Step 5: Update Tool Manager**
Update `src/components/organisms/ToolManager.tsx`:

```typescript
import {
  // ... existing imports
  YourNewTool,
} from '../tools';

// Add case to switch statement:
case 'your-new-tool':
  return <YourNewTool />;
```

#### **Step 6: Update Tool Status Manager**
Update `src/components/organisms/ToolStatusManager.tsx`:

```typescript
import {
  // ... existing imports
  YourNewToolStatus,
} from '../tools';

// Add case to switch statement:
case 'your-new-tool':
  return <YourNewToolStatus />;
```

#### **Step 7: Tool Logic Implementation**
- **If simple drawing tool**: Use existing `useDrawingTool` hook
- **If interactive tool**: Use existing `useCanvasDragAndDrop` hook
- **If complex tool**: Create new hook in `src/hooks/useYourNewTool.ts`

#### **Step 8: Update Tool Store (if needed)**
If your tool needs new settings, add to `src/stores/toolStore.ts`:

```typescript
interface ToolState {
  // ... existing state
  yourNewToolSetting?: boolean; // Example
}

const useToolStore = create<ToolState>((set) => ({
  // ... existing state
  yourNewToolSetting: false,
  
  // ... existing actions
  setYourNewToolSetting: (value: boolean) => set({ yourNewToolSetting: value }),
}));
```

#### **✅ Validation Checklist**
Before considering your tool complete:

- [ ] Tool type added to `Tool` union type
- [ ] Tool component created with behavior + status components
- [ ] Tool component exported in tools/index.ts
- [ ] useToolBehavior updated with all tool metadata
- [ ] ToolManager renders your tool component
- [ ] ToolStatusManager renders your tool status
- [ ] Tool logic implemented (existing hooks or new hook)
- [ ] Tool store updated if new settings needed
- [ ] Tool works in development server
- [ ] Tool provides helpful status messages
- [ ] Tool follows existing interaction patterns

#### **🚨 DO NOT**
- ❌ Add tool logic directly to CanvasGrid
- ❌ Modify mouse handlers for tool-specific logic
- ❌ Create tool logic outside the component + hook pattern
- ❌ Skip the status component (users need feedback)
- ❌ Forget to update TypeScript types

### **❌ WRONG APPROACH - DON'T DO THIS**
```typescript
// DON'T add tool-specific logic to CanvasGrid
const handleMouseDown = (event: MouseEvent) => {
  if (currentTool === 'paintBucket') {
    // ❌ Tool-specific logic in CanvasGrid
    const floodFillLogic = ...
  } else if (currentTool === 'eyedropper') {
    // ❌ More tool logic cluttering the main component
    const colorPickLogic = ...
  }
}
```

### **✅ CORRECT APPROACH - DO THIS**
```typescript
// ✅ Tool components handle their own behavior
export const PaintBucketTool = () => {
  // Tool logic isolated in its own component
  const floodFillLogic = usePaintBucketTool()
  return null // Behavior component
}

// ✅ CanvasGrid stays clean and focused
const CanvasGrid = () => {
  return (
    <div>
      <canvas ref={canvasRef} />
      <ToolManager /> {/* All tools managed here */}
    </div>
  )
}
```

#### **✅ Pattern Benefits**
Following this pattern ensures:
- **Consistency**: All tools work the same way
- **Maintainability**: Tool bugs are isolated
- **Extensibility**: Easy to add more tools later
- **Testability**: Each tool can be tested independently
- **User Experience**: Consistent feedback and behavior

### 4. TypeScript Guidelines

**Define Clear, Specific Types:**
```typescript
// ✅ Good: Specific, well-defined types
type Cell = {
  char: string;
  color: string;
  bgColor: string;
};

type Frame = {
  id: string;
  name: string;
  duration: number; // milliseconds
  data: Map<string, Cell>; // key: "x,y"
  thumbnail?: string; // base64 image
};

type Tool = 
  | 'pencil' 
  | 'eraser' 
  | 'paintbucket' 
  | 'select' 
  | 'rectangle' 
  | 'eyedropper';

// ❌ Avoid: Vague or overly broad types
type CanvasData = any;
type ToolConfig = Record<string, unknown>;
```

**Use Branded Types for IDs:**
```typescript
// ✅ Good: Prevent ID mixing
type FrameId = string & { __brand: 'FrameId' };
type CellId = string & { __brand: 'CellId' };

// ❌ Avoid: Generic strings that can be mixed up
frameId: string;
cellId: string;
```

### 5. Performance Optimization

**✅ Phase 1.5 Performance Optimizations COMPLETED (Step 5.1)**
ASCII Motion now handles large grids (200x100 = 20,000 cells) with optimized rendering performance:

**📋 REMINDER: When adding performance optimizations, update the patterns below AND the documentation per the mandatory protocol.**

**Canvas Rendering Optimization (IMPLEMENTED):**
```typescript
// ✅ Step 5.1: Memoized canvas rendering - COMPLETED
import { useMemoizedGrid } from '../hooks/useMemoizedGrid';
import { measureCanvasRender, finishCanvasRender } from '../utils/performance';

const useCanvasRenderer = () => {
  // Memoized font and style calculations (eliminates 1,920 repeated calculations)
  const drawingStyles = useMemo(() => ({
    font: `${cellSize - 2}px 'Courier New', monospace`,
    gridLineColor: '#E5E7EB',
    textAlign: 'center' as CanvasTextAlign,
    textBaseline: 'middle' as CanvasTextBaseline,
    defaultTextColor: '#000000',
    defaultBgColor: '#FFFFFF'
  }), [cellSize]);

  // Use grid-level memoization for change detection
  const { selectionData } = useMemoizedGrid(moveState, getTotalOffset);

  // Optimized render function with performance measurement
  const renderCanvas = useCallback(() => {
    measureCanvasRender(); // Start timing
    
    // Set font context once per render batch (not per cell)
    ctx.font = drawingStyles.font;
    ctx.textAlign = drawingStyles.textAlign;
    ctx.textBaseline = drawingStyles.textBaseline;
    
    // Render grid with optimized cell iteration
    // ... rendering logic
    
    finishCanvasRender(totalCells); // End timing & log metrics
  }, [width, height, cells, getCell, drawCell, drawingStyles]);
};

// ✅ Component-level memoization
const CellRenderer = React.memo(({ x, y, cell, cellSize }: CellProps) => {
  // Only re-renders when cell content actually changes
  const drawCell = useCallback(() => {
    // Optimized cell drawing with pre-computed styles
  }, [cell, cellSize]);
  
  return <canvas ref={canvasRef} />;
}, (prev, next) => 
  prev.cell?.char === next.cell?.char &&
  prev.cell?.color === next.cell?.color &&
  prev.cell?.bgColor === next.cell?.bgColor
);
```

**Performance Measurement Tools (IMPLEMENTED):**
```typescript
// ✅ Development performance monitoring
import { 
  logPerformanceStats, 
  testLargeGridPerformance, 
  clearPerformanceHistory 
} from '../utils/performance';

// Performance testing in development
const testResults = await testLargeGridPerformance(200, 100);
console.log(testResults); // Detailed performance analysis

// Global performance tools available in dev console
window.asciiMotionPerf.logStats(); // Current performance metrics
window.asciiMotionPerf.testGrid(300, 200); // Test specific grid size
```

**Grid Memoization (IMPLEMENTED):**
```typescript
// ✅ Grid-level optimization with change detection
const useMemoizedGrid = (moveState, getTotalOffset) => {
  // Memoize moving cell coordinates to prevent recalculation
  const movingCellKeys = useMemo(() => {
    if (!moveState?.originalData.size) return new Set();
    return new Set(moveState.originalData.keys());
  }, [moveState]);

  // Memoize grid data to prevent unnecessary recalculations
  const gridData = useMemo(() => {
    // Only process cells that actually changed
    // Separate static and moving cells for optimal rendering
  }, [width, height, cells, getCell, movingCellKeys, moveState]);
};
```

**Future Performance Steps (Steps 5.2-5.3):**
```typescript
// 🔄 Step 5.2: Dirty region tracking (PLANNED)
const useDirtyRegions = () => {
  const [dirtyRegions, setDirtyRegions] = useState<Set<string>>(new Set());
  
  // Track which cells actually changed
  const markCellDirty = useCallback((x: number, y: number) => {
    setDirtyRegions(prev => new Set(prev).add(`${x},${y}`));
  }, []);
};

// 🔄 Step 5.3: Grid virtualization (PLANNED)
const useVirtualizedGrid = (width: number, height: number) => {
  // Only render visible cells + buffer for very large grids
  // Support 500x500+ grids efficiently
};
```

**Zustand Performance Best Practices:**
```typescript
// ✅ Good: Subscribe to specific slices
const currentFrame = useAnimationStore(state => state.currentFrame);
const cells = useCanvasStore(state => state.cells); // Include in deps!

// ✅ Critical: Include reactive data in dependencies
const renderCanvas = useCallback(() => {
  // Canvas rendering logic
}, [width, height, cells, getCell]); // cells is crucial for live updates

// ❌ Avoid: Subscribing to entire store
const animationState = useAnimationStore(); // Causes unnecessary re-renders
```

**Performance Monitoring Patterns (Step 5.1):**
```typescript
// ✅ Use performance utilities in development
import { measureCanvasRender, finishCanvasRender } from '../utils/performance';

const optimizedRenderFunction = useCallback(() => {
  measureCanvasRender(); // Start timing
  
  // Expensive rendering operations
  
  const cellCount = width * height;
  const { duration, fps } = finishCanvasRender(cellCount); // End timing
  
  // Performance data automatically logged in development
}, [width, height]);

// ✅ Test large grid performance
const testPerformance = async () => {
  const result = await testLargeGridPerformance(200, 100);
  console.log(`Grid ${result.gridSize}: ${result.avgRenderTime}ms`);
  // Recommendation: result.recommendation
};
```

**Memoization Patterns for Canvas Components:**
```typescript
// ✅ Memoize expensive style calculations
const drawingStyles = useMemo(() => ({
  font: `${cellSize - 2}px 'Courier New', monospace`,
  gridLineColor: '#E5E7EB',
  textAlign: 'center' as CanvasTextAlign,
  textBaseline: 'middle' as CanvasTextBaseline
}), [cellSize]);

// ✅ Use React.memo for cell-level components  
const CellRenderer = React.memo(({ x, y, cell, cellSize }: CellProps) => {
  // Only re-renders when cell content changes
}, (prev, next) => 
  prev.cell?.char === next.cell?.char &&
  prev.cell?.color === next.cell?.color &&
  prev.cell?.bgColor === next.cell?.bgColor
);

// ✅ Grid-level memoization for change detection
const { gridData, selectionData } = useMemoizedGrid(moveState, getTotalOffset);
```

### 6. Event Handling Patterns

**Use Event Delegation for Canvas:**
```typescript
// ✅ Good: Single event listener on canvas container
const Canvas = () => {
  const handleCanvasEvent = useCallback((event: MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / cellWidth);
    const y = Math.floor((event.clientY - rect.top) / cellHeight);
    
    // Dispatch to appropriate tool handler
    currentTool.handleEvent(x, y, event.type);
  }, [currentTool]);
  
  return (
    <div 
      ref={canvasRef}
      onMouseDown={handleCanvasEvent}
      onMouseMove={handleCanvasEvent}
      onMouseUp={handleCanvasEvent}
    >
      {/* Grid cells */}
    </div>
  );
};
```

### 7. Animation & Timeline Guidelines

**Use RequestAnimationFrame for Playback:**
```typescript
const useAnimationPlayback = () => {
  const animationRef = useRef<number>();
  
  const play = useCallback(() => {
    const frame = () => {
      // Update current frame based on elapsed time
      animationRef.current = requestAnimationFrame(frame);
    };
    animationRef.current = requestAnimationFrame(frame);
  }, []);
  
  const stop = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);
  
  return { play, stop };
};
```

### 8. Export System Architecture

**Use Web Workers for Heavy Processing:**
```typescript
// ✅ Good: Offload GIF generation to worker
const exportGif = async (frames: Frame[], options: GifOptions) => {
  const worker = new Worker('/workers/gif-generator.js');
  
  return new Promise<Blob>((resolve, reject) => {
    worker.postMessage({ frames, options });
    worker.onmessage = (e) => resolve(e.data);
    worker.onerror = reject;
  });
};
```

### 9. Error Handling

**Use Error Boundaries and Try-Catch:**
```typescript
// Component-level error boundary
const CanvasErrorBoundary = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary fallback={<CanvasErrorFallback />}>
    {children}
  </ErrorBoundary>
);

// Store-level error handling
const useCanvasStore = create<CanvasState>((set) => ({
  setCell: (x, y, cell) => {
    try {
      // Validation
      if (x < 0 || y < 0) throw new Error('Invalid coordinates');
      
      set((state) => ({
        cells: new Map(state.cells).set(`${x},${y}`, cell)
      }));
    } catch (error) {
      console.error('Failed to set cell:', error);
      // Handle error appropriately
    }
  }
}));
```

### 10. Testing Approach

**Focus on Integration Tests:**
- Test user workflows (create animation, add frames, export)
- Test tool interactions with canvas
- Test state management flows
- Mock heavy operations (export, file I/O)

## Development Workflow

**🚨 DOCUMENTATION-FIRST WORKFLOW - Follow This Sequence:**

1. **Start with types** - Define interfaces before implementation
2. **Build atoms first** - Create basic UI components  
3. **Create stores** - Set up state management
4. **Build molecules** - Combine atoms into functional units
5. **Assemble organisms** - Create complex components
6. **Test integration** - Ensure components work together
7. **Optimize performance** - Profile and optimize bottlenecks
8. **📋 UPDATE DOCUMENTATION** - Complete the mandatory protocol checklist above

**⚠️ Your work is NOT complete until step 8 is done!**

## Code Quality Standards

- Use ESLint + Prettier for consistent formatting
- Prefer explicit over implicit code
- Write self-documenting code with clear naming
- Add JSDoc comments for complex functions
- Use TypeScript strict mode
- Avoid any types - use unknown or specific types
- Prefer immutable updates over mutations
- Use semantic commit messages

## When Working on ASCII Motion:
1. **Always consider performance** - App now supports large grids (200x100+) with optimized rendering
2. **Use performance tools** - Leverage measureCanvasRender, PerformanceMonitor for development
3. **Think in components** - Break down features into reusable, memoized pieces
4. **Optimize for the user workflow** - Make common actions fast and intuitive
5. **Plan for future features** - Design APIs that can be extended (Steps 5.2-5.3)
6. **Test cross-browser** - Ensure compatibility with major browsers
7. **Consider accessibility** - Use proper ARIA labels and keyboard navigation
8. **Monitor render performance** - Use development tools to validate optimizations
9. **📋 DOCUMENT EVERYTHING** - Complete the mandatory documentation protocol for ANY change

**🚨 FINAL CHECKPOINT: Before considering ANY work "complete":**
- [ ] Code implements the intended functionality
- [ ] Tests pass and code works as expected  
- [ ] Performance impact has been considered/measured
- [ ] **COPILOT_INSTRUCTIONS.md has been updated**
- [ ] **DEVELOPMENT.md has been updated**
- [ ] **Documentation reflects current architecture**

**If any checkbox above is unchecked, your work is not finished!**

## Current Architecture Status (Phase 1.5 Refactoring):
🚨 **CRITICAL**: The canvas system has been refactored following a Context + Hooks pattern.

**Always check DEVELOPMENT.md for current refactoring status before modifying canvas-related code.**

**Current State** (Updated Sept 3, 2025):
- ✅ Canvas Context & State extracted (Step 1 complete)  
- ✅ Mouse Interaction Logic extracted to Hooks (Step 2 complete)
- ✅ Rendering split into focused hook (Step 3 complete)
- ✅ Tool-specific components (Step 4 complete)
- ✅ Performance Optimizations - Memoization (Step 5.1 complete)

**Step 5.1 Completion - Performance Optimizations**:
- ✅ CellRenderer.tsx: Memoized cell rendering component
- ✅ useMemoizedGrid.ts: Grid-level optimization hook (117 lines)
- ✅ performance.ts: Performance measurement utilities (217 lines)
- ✅ PerformanceMonitor.tsx: Development UI for testing (147 lines)
- ✅ useCanvasRenderer.ts: Optimized with memoization (195 lines)
- ✅ Font/style calculations memoized (eliminates 1,920 repeated computations)
- ✅ Performance measurement integration with real-time monitoring
- ✅ Development tools for testing grid sizes up to 200x100+ cells

**Step 4 Completion - Tool Components**:
- CanvasGrid.tsx maintained at ~111 lines (pure composition)
- Created 5 tool-specific components with status UI (181 lines total)
- Created ToolManager and ToolStatusManager for composition (68 lines total)
- Created useToolBehavior hook for tool coordination (109 lines)
- Enhanced user experience with rich, tool-specific status messages

**Final Architecture Achievements**:
- Total CanvasGrid reduction: 501 → 111 lines (~78% reduction)
- 8 specialized hooks created for canvas functionality (including performance)
- 5 tool components created for extensible tool system
- Complete separation of concerns: state, interaction, rendering, tools, performance
- Pattern established for easy addition of new tools
- Performance optimizations support large grids (200x100+ cells)
- Ready for Steps 5.2-5.3 and Phase 2: Animation System
**When Working with Canvas Components (Post Step 5.1):**
1. **Use CanvasProvider** - Wrap canvas components in context
2. **Use established hooks** - `useCanvasContext()`, `useCanvasState()`, `useMemoizedGrid()`, etc.
3. **Don't add useState to CanvasGrid** - Extract to context or hooks instead
4. **Include Zustand dependencies** - Add reactive store data (like `cells`) to useCallback/useMemo deps
5. **Use performance tools** - Import and use performance measurement utilities in development
6. **Follow memoization patterns** - Use React.memo, useMemo, useCallback for expensive operations
7. **Follow tool component pattern** - Use the 8-step guide above for ALL new tools
8. **Test large grids** - Use PerformanceMonitor to validate performance on 200x100+ grids
9. **Follow the pattern** - Reference existing refactored code for consistency
10. **Check DEVELOPMENT.md** - Always review current step status before changes
11. **📋 UPDATE DOCS** - Complete documentation protocol after ANY architectural change

**🚨 STOP: Before finishing ANY canvas work, have you updated the documentation?**

---

## 📝 **DOCUMENTATION ENFORCEMENT (Detailed Checklist)**

**This section provides the detailed checklist referenced in the mandatory protocol at the top of this file.**

### **Detailed Steps for Documentation Updates:**

**1. Update COPILOT_INSTRUCTIONS.md (THIS FILE):**
   - [ ] Update "Current Architecture Status" section (around line 200)
   - [ ] Add/modify relevant code patterns and examples
   - [ ] Update "Directory Structure" if files were added/moved
   - [ ] Update component patterns if new patterns introduced
   - [ ] Add new development guidelines if applicable
   - [ ] Update performance patterns if optimizations added
   - [ ] Update hook patterns if new hooks created

**2. Update DEVELOPMENT.md:**
   - [ ] Mark completed steps with ✅ **COMPLETE** status  
   - [ ] Update current phase/step status section
   - [ ] Add new architectural decisions to the log
   - [ ] Update timeline estimates and next steps
   - [ ] Document any breaking changes or migration steps
   - [ ] Update file structure documentation
   - [ ] Add new features to the feature summary

**3. Check for Outdated Instructions:**
   - [ ] Search for old patterns that conflict with new changes
   - [ ] Remove or update deprecated examples in both files
   - [ ] Verify all code examples still compile and work
   - [ ] Update import statements and API references
   - [ ] Check for inconsistent architecture descriptions

**4. Validation:**
   - [ ] Ensure new contributors could follow the updated docs
   - [ ] Test that documented examples actually work
   - [ ] Verify docs reflect actual codebase state
   - [ ] Check that patterns are consistently described

**🎯 Remember: Documentation updates are NOT optional - they're part of the development process!**

---

## 🎪 **TEMPLATE: Completion Message for Any Architectural Change**

**Copy this template for use when completing any work that affects architecture:**

```
## ✅ [Feature/Step Name] - IMPLEMENTATION COMPLETE

### 📊 **Changes Made**
- [List files created/modified]
- [List architectural patterns introduced/changed]
- [List performance impacts]

### 📋 **Documentation Updates Completed**
✅ **COPILOT_INSTRUCTIONS.md Updated:**
- [ ] Current Architecture Status section updated
- [ ] New patterns/examples added
- [ ] File structure updated
- [ ] Development guidelines enhanced

✅ **DEVELOPMENT.md Updated:**  
- [ ] Step marked as ✅ COMPLETE
- [ ] Current status updated
- [ ] New architectural decisions documented
- [ ] Timeline/next steps updated

✅ **Validation Completed:**
- [ ] Code examples tested and working
- [ ] Documentation reflects actual implementation
- [ ] No conflicting patterns remain
- [ ] New contributors can follow updated docs

### 🎯 **Ready for Next Steps**
[Describe what's now possible/what should be done next]

**All documentation requirements satisfied - implementation truly complete!** 🚀
```

Use this template to ensure consistent, complete documentation with every change.
   - [ ] Update dependency information if needed

4. **Validation**:
   - [ ] Ensure new contributors can follow the docs
   - [ ] Test that examples compile and work
   - [ ] Verify docs reflect actual codebase state

### Documentation Review Triggers:
- ✅ **After completing any refactoring step**
- ✅ **When changing component architecture** 
- ✅ **When adding new patterns or conventions**
- ✅ **When major file structure changes**
- ✅ **Before marking any phase as complete**

### Quick Documentation Health Check:
Ask yourself:
- Do the patterns in COPILOT_INSTRUCTIONS.md match the actual code?
- Would a new contributor be confused by any instructions?
- Are there conflicting patterns mentioned?
- Do all code examples reflect current best practices?

**🎯 Goal**: Documentation should always be the source of truth for current architecture.
