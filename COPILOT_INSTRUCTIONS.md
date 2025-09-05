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
ASCII Motion is a React + TypeScript web application for creating and animating ASCII art. We use Vite for building, Shadcn/ui for components, Zustand for state management, and Tailwind CSS v3 for styling.

## 🚨 **CRITICAL: Shadcn/UI Styling Requirements**

### **⚠️ TAILWIND CSS VERSION REQUIREMENT**
**NEVER upgrade to Tailwind CSS v4+ without extensive testing!**

- ✅ **Required**: Tailwind CSS v3.4.0 or compatible v3.x version
- ❌ **Incompatible**: Tailwind CSS v4.x+ (breaks shadcn styling)
- 📋 **Reason**: Shadcn components were designed for Tailwind v3 architecture

### **PostCSS Configuration (CRITICAL)**
**File**: `postcss.config.js`
```javascript
// ✅ CORRECT (Tailwind v3):
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

// ❌ WRONG (Tailwind v4 - DO NOT USE):
export default {
  plugins: {
    '@tailwindcss/postcss': {}, // This breaks shadcn
    autoprefixer: {},
  },
}
```

### **Shadcn Component Styling Guidelines**

#### **✅ DO: Follow Shadcn Patterns**
```typescript
// ✅ Use shadcn variants and minimal custom classes
<Button 
  variant={isActive ? 'default' : 'outline'}
  size="lg"
  className="h-16 flex flex-col gap-1" // Only layout classes
>
  {icon}
  <span className="text-xs">{name}</span>
</Button>

// ✅ Let shadcn handle colors and styling
<Card className="bg-card border-border"> // Use CSS variables
```

#### **❌ DON'T: Override Shadcn Styling**
```typescript
// ❌ Don't override shadcn color/background classes
<Button 
  className="bg-primary text-primary-foreground border-primary hover:bg-primary/90"
  // This duplicates what variant="default" already provides!
>

// ❌ Don't use custom border styling that conflicts
<Button className="border-2 bg-background text-foreground">
  // This overrides shadcn's carefully crafted styling
</Button>

// ❌ Don't add universal CSS selectors that affect buttons
// In CSS files:
* { border-color: hsl(var(--border)); } // This breaks button styling!
```

#### **🎯 Component Styling Best Practices**

**1. CSS Variable Usage:**
```css
/* ✅ DO: Use shadcn CSS variables */
.custom-component {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  border: 1px solid hsl(var(--border));
}

/* ❌ DON'T: Use hardcoded colors that don't respond to theme */
.custom-component {
  background-color: #ffffff;
  color: #000000;
}
```

**2. Minimal Custom Classes:**
```typescript
// ✅ DO: Add only layout and spacing classes
<Button 
  variant="outline"
  className="h-20 w-full flex flex-col items-center gap-2"
>

// ❌ DON'T: Recreate what variants already provide
<Button 
  className="bg-background text-foreground border-border hover:bg-accent"
>
```

**3. CSS Scope and Specificity:**
```css
/* ✅ DO: Scope custom styles to specific components */
.ascii-cell {
  font-family: monospace;
  /* Canvas-specific styles only */
}

.timeline-frame {
  /* Timeline-specific styles only */
}

/* ❌ DON'T: Use universal selectors affecting shadcn */
* { /* This affects ALL elements including buttons */ }
button { /* This overrides shadcn button styling */ }
```

#### **🔍 Debugging Shadcn Styling Issues**

**Quick Diagnostic Steps:**
1. **Test with minimal button**: `<Button>Test</Button>` - should have proper shadcn styling
2. **Check Tailwind version**: Ensure `package.json` has `tailwindcss@^3.4.0`
3. **Verify PostCSS config**: Should use `tailwindcss: {}`, not `@tailwindcss/postcss`
4. **Remove custom overrides**: Strip className to just `variant` and `size` props
5. **Check for universal selectors**: Look for `* {` or `button {` in CSS files

**Common Issues and Solutions:**
```typescript
// 🚨 Issue: Buttons look unstyled/grey
// ✅ Solution: Check Tailwind version and PostCSS config

// 🚨 Issue: Custom styling not working
// ✅ Solution: Use CSS variables instead of hardcoded values

// 🚨 Issue: Inconsistent theming
// ✅ Solution: Use shadcn variants instead of custom classes
```

## 🚨 **CRITICAL: Adding New Tools**
**When adding ANY new drawing tool, ALWAYS follow the 8-step componentized pattern in Section 3 below.** This maintains architectural consistency and ensures all tools work seamlessly together. Do NOT add tool logic directly to CanvasGrid or mouse handlers.

**📋 REMINDER: After implementing ANY new tool, update both COPILOT_INSTRUCTIONS.md and DEVELOPMENT.md per the protocol above.**

## Code Organization Principles

### 1. Component Architecture
**Follow the simplified component pattern:**
- **Common**: Shared/reusable components (CellRenderer, PerformanceMonitor, ThemeToggle)
- **Features**: Complex functional components (Canvas, ToolPalette, CharacterPalette)
- **Tools**: Specialized tool components (DrawingTool, SelectionTool, RectangleTool, etc.)
- **UI**: Shared UI components from shadcn/ui

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
│   ├── useHandTool.ts             # Hand tool pan functionality
│   └── useToolBehavior.ts         # Tool coordination & metadata
├── components/
│   ├── features/
│   │   ├── CanvasGrid.tsx         # Main composition component (111 lines)
│   │   ├── CanvasSettings.tsx     # Canvas controls with zoom/pan features
│   │   ├── ZoomControls.tsx       # Zoom and reset view controls (78 lines)
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

### **Tool Architecture Reference**

**Current Tool-to-Hook Mapping:**
| Tool | Hook Used | Architecture Reason |
|------|-----------|-------------------|
| **Selection** | `useCanvasSelection` (dedicated) | Complex: Multi-state (select→move→resize), sophisticated coordinate tracking |
| **Pencil** | `useDrawingTool` (shared) | Simple: Single-click cell modification |
| **Eraser** | `useDrawingTool` (shared) | Simple: Single-click cell clearing |
| **Paint Bucket** | `useDrawingTool` (shared) | Simple: Single-click flood fill algorithm |
| **Eyedropper** | `useDrawingTool` (shared) | Simple: Single-click color sampling |
| **Rectangle** | `useCanvasDragAndDrop` (shared) | Interactive: Drag-based drawing with preview, aspect ratio locking |
| **Ellipse** | `useCanvasDragAndDrop` (shared) | Interactive: Drag-based drawing with preview, aspect ratio locking |
| **Hand** | `useHandTool` (dedicated) | Navigation: Pan offset management, space key override, cursor states |

**Architecture Benefits:**
- **Dedicated hooks** for complex tools maintain clear separation of concerns
- **Shared hooks** eliminate code duplication for similar tool behaviors  
- **Consistent component pattern** across all tools for UI feedback and activation

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

**Directory Structure (Updated):**
```
src/
├── components/
│   ├── common/
│   │   ├── CellRenderer.tsx          # Memoized cell rendering
│   │   ├── PerformanceMonitor.tsx    # Development performance UI
│   │   └── ThemeToggle.tsx           # Dark/light mode toggle
│   ├── features/
│   │   ├── CanvasGrid.tsx            # Main canvas grid component
│   │   ├── CanvasOverlay.tsx         # Selection and paste overlays
│   │   ├── CanvasRenderer.tsx        # Core canvas rendering logic
│   │   ├── CanvasWithShortcuts.tsx   # Canvas with keyboard shortcuts
│   │   ├── CharacterPalette.tsx      # Character selection palette
│   │   ├── ColorPicker.tsx           # Color selection component
│   │   ├── PastePreviewOverlay.tsx   # Preview for paste operations
│   │   ├── ToolManager.tsx           # Tool management logic
│   │   ├── ToolPalette.tsx           # Tool selection UI
│   │   └── ToolStatusManager.tsx     # Tool status display
│   ├── tools/
│   │   ├── DrawingTool.tsx           # Pencil/pen drawing tool
│   │   ├── EyedropperTool.tsx        # Color picker tool
│   │   ├── PaintBucketTool.tsx       # Fill/flood fill tool
│   │   ├── RectangleTool.tsx         # Rectangle drawing tool
│   │   ├── EllipseTool.tsx           # Ellipse drawing tool
│   │   ├── SelectionTool.tsx         # Selection and copy/paste
│   │   └── index.ts                  # Tool exports
│   └── ui/                           # Shadcn/ui components
├── hooks/
│   ├── useCanvasRenderer.ts          # Optimized with memoization
│   ├── useMemoizedGrid.ts            # Grid-level optimization
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
**Current focused, single-responsibility stores:**
- `useCanvasStore` - Canvas data, dimensions, cells, and canvas operations
- `useAnimationStore` - Timeline, frames, playback state  
- `useToolStore` - Active tool, tool settings, drawing state, undo/redo

**Future planned stores:**
- `useProjectStore` - Project metadata, save/load operations (planned)
- `useUIStore` - UI state, panels, dialogs (if needed)

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
  | 'ellipse'
  | 'eyedropper'
  | 'hand'
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
  | 'HandTool'
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
Update `src/components/features/ToolManager.tsx`:

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
Update `src/components/features/ToolStatusManager.tsx`:

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

**🎯 Hook Selection Criteria:**

**Use Existing `useDrawingTool` Hook If:**
- Tool performs single-click actions (click → immediate effect)
- No state persistence between clicks
- Simple cell modification (set, clear, pick color)
- Examples: Pencil, Eraser, Paint Bucket, Eyedropper

**Use Existing `useCanvasDragAndDrop` Hook If:**
- Tool requires drag operations (mousedown → drag → mouseup)
- Creates preview during drag
- Simple start→end coordinate logic
- Supports aspect ratio constraints with Shift key modifier
- Examples: Rectangle, Ellipse, Line tools

**Create New Dedicated Hook If Tool Has:**
- **Multiple operational states** (selecting → moving → resizing)
- **Complex state management** (selection bounds, move state, drag detection)
- **Multi-step workflows** (initiate → modify → commit)
- **Sophisticated coordinate tracking** (relative positioning, boundary calculations)
- **Custom interaction patterns** that don't fit existing hooks
- Examples: Selection tool (`useCanvasSelection`), Multi-select, Animation timeline

**Implementation Guide:**
- **If simple drawing tool**: Use existing `useDrawingTool` hook
- **If interactive drag tool**: Use existing `useCanvasDragAndDrop` hook  
- **If complex multi-state tool**: Create new hook in `src/hooks/useYourNewTool.ts`

**📝 Tool Examples by Pattern:**
- **Pencil Tool** → `useDrawingTool` (enhanced: click to draw, shift+click for lines using Bresenham algorithm)
- **Spray Brush** → `useDrawingTool` (simple: click to apply random pattern)
- **Line Tool** → `useCanvasDragAndDrop` (interactive: drag from start to end, aspect ratio locking)
- **Ellipse Tool** → `useCanvasDragAndDrop` (implemented: drag-based ellipse with Shift for circles)
- **Rectangle Tool** → `useCanvasDragAndDrop` (implemented: drag-based rectangle with Shift for squares)
- **Multi-Select** → `useCanvasMultiSelect` (complex: multiple selections, group operations)
- **Animation Onion Skin** → `useOnionSkin` (complex: multi-frame state, transparency layers)
- **Text Tool** → `useTextTool` (complex: text input mode, cursor positioning, editing)

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
- [ ] **UI components use proper shadcn styling** (see guidelines above)

#### **🎨 Tool UI Styling Requirements**
**When creating tool palettes, buttons, or status UI:**

```typescript
// ✅ DO: Use shadcn variants for tool buttons
<Button 
  variant={isActive ? 'default' : 'outline'}
  size="lg"
  className="h-16 flex flex-col gap-1" // Only layout classes
  onClick={() => setActiveTool(toolId)}
>
  {toolIcon}
  <span className="text-xs">{toolName}</span>
</Button>

// ✅ DO: Use shadcn components for tool options
<Card>
  <CardContent>
    <Label htmlFor="tool-option">Tool Setting</Label>
    <Switch 
      id="tool-option"
      checked={setting}
      onCheckedChange={setSetting}
    />
  </CardContent>
</Card>

// ❌ DON'T: Override shadcn styling with custom classes
<Button 
  className="bg-gray-500 text-white border-gray-700 hover:bg-gray-400"
  // This breaks theme consistency and shadcn styling!
>

// ❌ DON'T: Add universal CSS that affects tool UI
/* In CSS files - DON'T do this: */
* { border-color: gray !important; } /* Breaks shadcn buttons */
button { background: gray; } /* Overrides all button styling */
```

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

**Use Global Keyboard Event Handling for Modifier Keys:**
```typescript
// ✅ Good: Global keyboard event handling with proper cleanup
const CanvasGrid = () => {
  const { setShiftKeyDown } = useCanvasContext();
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift' && !event.repeat) {
        setShiftKeyDown(true);
      }
    };
    
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setShiftKeyDown(false);
      }
    };
    
    // Global listeners for modifier keys
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setShiftKeyDown]);
};

// ✅ Use shift key state for tool constraints
const useCanvasDragAndDrop = () => {
  const { shiftKeyDown } = useCanvasContext();
  
  const constrainToAspectRatio = (width: number, height: number) => {
    if (!shiftKeyDown) return { width, height };
    const maxDimension = Math.max(Math.abs(width), Math.abs(height));
    return {
      width: width >= 0 ? maxDimension : -maxDimension,
      height: height >= 0 ? maxDimension : -maxDimension
    };
  };
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
2. **Build common components** - Create basic UI components  
3. **Create stores** - Set up state management
4. **Build tools** - Create specialized tool components
5. **Assemble features** - Create complex functional components
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
- **Follow shadcn styling patterns** - Never override component library styling
- **Use Tailwind CSS v3.x only** - Do not upgrade to v4+ without compatibility testing
- **Scope custom CSS** - Avoid universal selectors that affect UI components

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
10. **🎨 PRESERVE STYLING INTEGRITY** - Follow shadcn patterns, never override component styling
11. **🔒 MAINTAIN DEPENDENCY COMPATIBILITY** - Test UI components when changing build tools

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

**Current State** (Updated Sept 4, 2025):
- ✅ Canvas Context & State extracted (Step 1 complete)  
- ✅ Mouse Interaction Logic extracted to Hooks (Step 2 complete)
- ✅ Rendering split into focused hook (Step 3 complete)
- ✅ Tool-specific components (Step 4 complete)
- ✅ Performance Optimizations - Memoization (Step 5.1 complete)
- ✅ Enhanced Paste Functionality with Visual Preview (Sept 3, 2025)
- ✅ **Ellipse Tool Implementation** - Complete drag-based ellipse drawing tool (Sept 3, 2025)
- ✅ **Shift Key Aspect Ratio Locking** - Rectangle and ellipse tools support Shift for squares/circles (Sept 3, 2025)
- ✅ **Enhanced Pencil Tool** - Shift+click line drawing with Bresenham algorithm (Sept 3, 2025)
- ✅ **Lasso Selection Tool** - Complete freeform selection with point-in-polygon detection (Sept 4, 2025)

**Step 5.1 Completion - Performance Optimizations**:
- ✅ CellRenderer.tsx: Memoized cell rendering component
- ✅ useMemoizedGrid.ts: Grid-level optimization hook (117 lines)
- ✅ performance.ts: Performance measurement utilities (217 lines)
- ✅ PerformanceMonitor.tsx: Development UI for testing (147 lines)
- ✅ useCanvasRenderer.ts: Optimized with memoization (195 lines)
- ✅ Font/style calculations memoized (eliminates 1,920 repeated computations)
- ✅ Performance measurement integration with real-time monitoring
- ✅ Development tools for testing grid sizes up to 200x100+ cells

**Enhanced Paste Functionality - September 3, 2025**:
- ✅ **usePasteMode.ts**: Advanced paste mode hook with position tracking (188 lines)
- ✅ **CanvasWithShortcuts.tsx**: Context-aware keyboard shortcuts wrapper (21 lines)  
- ✅ **Enhanced Canvas Renderer**: Integrated paste preview with visual feedback
- ✅ **Mouse Integration**: Full drag-and-drop positioning for paste content
- ✅ **Keyboard Shortcuts**: Enhanced Cmd/Ctrl+V workflow with preview mode
- ✅ **Visual Preview System**: Real content display with purple marquee and transparency
- ✅ **Selection Deselect Fix**: Proper click-outside-to-deselect behavior restored

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

## � **Architectural Decisions Log**

### **Enhanced Paste Functionality with Visual Preview (Sept 3, 2025)**
**Decision**: Implement advanced paste mode with real-time visual preview and drag positioning  
**Issue**: Basic paste was immediate and provided no visual feedback about placement  
**Goal**: Create professional graphics editor experience with paste preview and positioning

**Implementation**:
- Created `usePasteMode.ts` hook for paste state management and interaction
- Integrated paste preview rendering into `useCanvasRenderer.ts`  
- Enhanced keyboard shortcuts to support preview mode workflow
- Added mouse interaction for drag-and-drop paste positioning
- Fixed selection deselection bug discovered during implementation

**Files Affected**:
- `src/hooks/usePasteMode.ts` (NEW) - 188 lines of paste mode logic
- `src/components/features/CanvasWithShortcuts.tsx` (NEW) - Context-aware shortcuts wrapper
- `src/contexts/CanvasContext.tsx` - Added paste mode state and actions
- `src/hooks/useCanvasRenderer.ts` - Integrated paste preview rendering
- `src/hooks/useCanvasMouseHandlers.ts` - Added paste mode mouse interactions
- `src/hooks/useKeyboardShortcuts.ts` - Enhanced paste workflow
- `src/hooks/useCanvasSelection.ts` - Fixed selection deselection bug
- `src/App.tsx` - Updated to use CanvasWithShortcuts wrapper

**Pattern Established**:
```typescript
// ✅ Enhanced Paste Mode Pattern
const usePasteMode = () => {
  // State management for paste preview
  const [pasteMode, setPasteMode] = useState<PasteModeState>({
    isActive: false,
    preview: null,
    isDragging: false
  });

  // Actions for paste interaction
  const startPasteMode = useCallback((position) => {
    // Initialize paste preview at position
  }, []);

  const updatePastePosition = useCallback((position) => {
    // Update preview position for real-time feedback
  }, []);

  return { pasteMode, startPasteMode, updatePastePosition, commitPaste };
};

// ✅ Canvas Context Integration
const CanvasProvider = ({ children }) => {
  const pasteMode = usePasteMode();
  
  return (
    <CanvasContext.Provider value={{ ...pasteMode }}>
      {children}
    </CanvasContext.Provider>
  );
};

// ✅ Visual Preview Rendering
const useCanvasRenderer = () => {
  const { pasteMode } = useCanvasContext();
  
  const renderCanvas = useCallback(() => {
    // Draw paste preview with actual content
    if (pasteMode.isActive && pasteMode.preview) {
      ctx.globalAlpha = 0.85;
      pasteMode.preview.data.forEach((cell, key) => {
        // Render actual copied content with transparency
        drawCell(ctx, x, y, {
          char: cell.char,
          color: cell.color, 
          bgColor: cell.bgColor
        });
      });
      ctx.globalAlpha = 1.0;
    }
  }, [pasteMode]);
};
```

**User Experience Benefits**:
- **Visual Feedback**: See exactly what content will be pasted and where
- **Drag Positioning**: Click and drag to reposition paste content before committing
- **Multiple Commit Options**: Keyboard shortcuts, mouse clicks, or UI buttons
- **Professional Workflow**: Matches behavior of advanced graphics editors
- **Real-time Preview**: 85% opacity with purple marquee for clear visual distinction

**Technical Benefits**:
- **Incremental Implementation**: Built and tested each component separately
- **Context Integration**: Follows established CanvasProvider pattern
- **Canvas Rendering**: Integrated with existing overlay system for consistency
- **Type Safety**: Full TypeScript coverage throughout
- **Performance**: Efficient rendering with proper alpha blending

**Bug Fix During Implementation**:
- **Issue**: Selection remained active after copy, couldn't click outside to deselect
- **Root Cause**: Missing condition in `handleSelectionMouseDown` for "click outside active selection"
- **Solution**: Added explicit deselection case for clicking outside selection bounds
- **Pattern**: Always include comprehensive condition handling in mouse interaction logic

---

## �📝 **DOCUMENTATION ENFORCEMENT (Detailed Checklist)**

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
