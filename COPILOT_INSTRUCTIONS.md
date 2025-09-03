# ASCII Motion - Copilot Development Instructions

## Project Context
ASCII Motion is a React + TypeScript web application for creating and animating ASCII art. We use Vite for building, Shadcn/ui for components, Zustand for state management, and Tailwind CSS for styling.

## 🚨 **CRITICAL: Adding New Tools**
**When adding ANY new drawing tool, ALWAYS follow the 8-step componentized pattern in Section 3 below.** This maintains architectural consistency and ensures all tools work seamlessly together. Do NOT add tool logic directly to CanvasGrid or mouse handlers.

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

**Directory Structure:**
```
src/
├── components/
│   ├── atoms/
│   ├── molecules/
│   ├── organisms/
│   └── templates/
├── hooks/
├── stores/
├── types/
├── utils/
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

**Memoize Grid Components:**
```typescript
// ✅ Good: Memoized cells only re-render when their data changes
const Cell = memo(({ x, y, cell }: CellProps) => {
  return (
    <div 
      className="cell"
      style={{ color: cell.color, backgroundColor: cell.bgColor }}
    >
      {cell.char}
    </div>
  );
});

// Use React.memo comparison for complex objects
const CellMemo = memo(Cell, (prev, next) => 
  prev.cell.char === next.cell.char &&
  prev.cell.color === next.cell.color &&
  prev.cell.bgColor === next.cell.bgColor
);
```

**Optimize Zustand Subscriptions:**
```typescript
// ✅ Good: Subscribe to specific slices
const currentFrame = useAnimationStore(state => state.currentFrame);
const isPlaying = useAnimationStore(state => state.isPlaying);

// ❌ Avoid: Subscribing to entire store
const animationState = useAnimationStore(); // Causes unnecessary re-renders
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

1. **Start with types** - Define interfaces before implementation
2. **Build atoms first** - Create basic UI components
3. **Create stores** - Set up state management
4. **Build molecules** - Combine atoms into functional units
5. **Assemble organisms** - Create complex components
6. **Test integration** - Ensure components work together
7. **Optimize performance** - Profile and optimize bottlenecks

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
1. **Always consider performance** - This app handles large grids and animations
2. **Think in components** - Break down features into reusable pieces
3. **Optimize for the user workflow** - Make common actions fast and intuitive
4. **Plan for future features** - Design APIs that can be extended
5. **Test cross-browser** - Ensure compatibility with major browsers
6. **Consider accessibility** - Use proper ARIA labels and keyboard navigation

## Current Architecture Status (Phase 1.5 Refactoring):
🚨 **CRITICAL**: The canvas system has been refactored following a Context + Hooks pattern.

**Always check DEVELOPMENT.md for current refactoring status before modifying canvas-related code.**

**Current State** (Updated Sept 3, 2025):
- ✅ Canvas Context & State extracted (Step 1 complete)  
- ✅ Mouse Interaction Logic extracted to Hooks (Step 2 complete)
- ✅ Rendering split into focused hook (Step 3 complete)
- ✅ Tool-specific components (Step 4 complete)

**Step 4 Completion**:
- CanvasGrid.tsx maintained at ~111 lines (pure composition)
- Created 5 tool-specific components with status UI (181 lines total)
- Created ToolManager and ToolStatusManager for composition (68 lines total)
- Created useToolBehavior hook for tool coordination (109 lines)
- Enhanced user experience with rich, tool-specific status messages

**Final Architecture Achievements**:
- Total CanvasGrid reduction: 501 → 111 lines (~78% reduction)
- 7 specialized hooks created for canvas functionality
- 5 tool components created for extensible tool system
- Complete separation of concerns: state, interaction, rendering, tools
- Pattern established for easy addition of new tools
- Ready for Phase 2: Animation System
1. **Use CanvasProvider** - Wrap canvas components in context
2. **Use established hooks** - `useCanvasContext()`, `useCanvasState()`, etc.
3. **Don't add useState to CanvasGrid** - Extract to context or hooks instead
4. **Include Zustand dependencies** - Add reactive store data (like `cells`) to useCallback/useMemo deps
5. **Follow tool component pattern** - Use the 8-step guide above for ALL new tools
6. **Follow the pattern** - Reference existing refactored code for consistency
7. **Check DEVELOPMENT.md** - Always review current step status before changes

## 📝 Documentation Maintenance Protocol:

### After ANY Architectural Change:
**MANDATORY STEPS** - Do not skip these:

1. **Update COPILOT_INSTRUCTIONS.md**:
   - [ ] Update "Current Architecture Status" section above
   - [ ] Add/modify relevant patterns and examples
   - [ ] Update file structure if changed
   - [ ] Update component patterns if changed

2. **Update DEVELOPMENT.md**:
   - [ ] Mark completed steps as ✅ **COMPLETE**
   - [ ] Update current status section
   - [ ] Add new architectural decisions to the log
   - [ ] Update timeline estimates

3. **Check for Outdated Instructions**:
   - [ ] Search for old patterns that no longer apply
   - [ ] Remove or update deprecated examples
   - [ ] Verify all code examples still work
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
