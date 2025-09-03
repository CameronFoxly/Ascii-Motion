# ASCII Motion - Copilot Development Instructions

## Project Context
ASCII Motion is a React + TypeScript web application for creating and animating ASCII art. We use Vite for building, Shadcn/ui for components, Zustand for state management, and Tailwind CSS for styling.

## Code Organization Principles

### 1. Component Architecture
**Follow the Atomic Design Pattern:**
- **Atoms**: Basic UI elements (Button, Input, Icon)
- **Molecules**: Simple combinations (ToolButton, FrameThumbnail, ColorPicker)
- **Organisms**: Complex components (Timeline, Canvas, ToolPalette)
- **Templates**: Page layouts
- **Pages**: Complete views

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
