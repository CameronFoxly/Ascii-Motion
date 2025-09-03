# ASCII Motion - Development Setup

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── atoms/          # Basic UI components (Button, Input, etc.)
│   ├── molecules/      # Simple combinations (ToolButton, ColorPicker, etc.)
│   ├── organisms/      # Complex components (Canvas, Timeline, ToolPalette)
│   └── templates/      # Page layouts
├── stores/             # Zustand state management
│   ├── canvasStore.ts  # Canvas data and operations
│   ├── animationStore.ts # Animation timeline and frames
│   ├── toolStore.ts    # Active tools and settings
│   └── projectStore.ts # Project management (to be created)
├── types/              # TypeScript type definitions
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── constants/          # App constants and configurations
└── lib/                # Third-party library configurations
```

## Tech Stack
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Shadcn/ui** - UI components
- **Zustand** - State management
- **Lucide React** - Icons

## Development Phases

### Phase 1: Core Editor ✅ **COMPLETE**
- [x] Project scaffolding
- [x] Basic stores (canvas, animation, tools)
- [x] Type definitions and constants
- [x] Canvas grid component
- [x] Basic drawing tools (pencil, eraser, paint bucket, select, eyedropper, rectangle)
- [x] Character palette
- [x] Color picker
- [x] Tool palette
- [x] Undo/redo functionality
- [x] Basic UI layout with sidebars
- [x] Rectangle drawing tool implementation
- [x] Fill tool (flood-fill algorithm with optimization)
- [x] Selection tool copy/paste functionality
- [x] Keyboard shortcuts (Cmd/Ctrl+C, Cmd/Ctrl+V, Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z)

## Phase 1 Features Summary

### 🎨 Drawing Tools
- **Pencil** ✏️ - Draw individual characters with selected colors
- **Eraser** 🧽 - Remove characters from cells
- **Paint Bucket** 🪣 - Flood fill connected areas with same character/color
- **Rectangle** ▭ - Draw filled or hollow rectangles
- **Eyedropper** 💧 - Pick character and colors from existing artwork

### 🎯 Selection & Editing
- **Selection Tool** ⬚ - Select rectangular areas with multiple interaction modes:
  - *Click & Drag*: Start selection and drag to define area
  - *Click + Shift+Click*: Click to start, move mouse, Shift+Click to complete
  - *Click Inside Selection*: Move existing selection content with real-time preview
- **Move Mode** - Drag content within selections with live marquee box movement
- **Copy/Paste** - Copy selected areas and paste them elsewhere
- **Undo/Redo** - Full history management with 50-action limit

### 🎭 Character & Color Management
- **Character Palette** - Organized character sets (Basic Text, Punctuation, Math/Symbols, Lines/Borders, Blocks/Shading, Arrows, Geometric, Special)
- **Color Picker** - Preset colors and custom color selection for text and background
- **Real-time Preview** - See changes instantly on the canvas

### ⌨️ Keyboard Shortcuts
- `Cmd/Ctrl + C` - Copy selection
- `Cmd/Ctrl + V` - Paste at selection or (0,0)
- `Cmd/Ctrl + Z` - Undo
- `Cmd/Ctrl + Shift + Z` - Redo
- `Escape` - Clear/deselect current selection

### 📐 Canvas Features
- **Configurable Size** - Default 80x24 (terminal size)
- **Grid-based Drawing** - Precise character placement
- **Visual Selection** - Animated selection overlay
- **Real-time Rendering** - Smooth canvas updates

### Phase 2: Animation System
- [ ] Timeline component
- [ ] Frame management
- [ ] Playback controls
- [ ] Frame thumbnails

### Phase 3: Export System
- [ ] Text export
- [ ] JSON project files
- [ ] GIF generation
- [ ] MP4 export

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## State Management

### Canvas Store (`useCanvasStore`)
- Canvas dimensions and cell data
- Drawing operations (set/get/clear cells)
- Fill tool implementation

### Animation Store (`useAnimationStore`)
- Frame management and timeline
- Playback controls
- Frame duration and ordering

### Tool Store (`useToolStore`)
- Active tool and settings
- Selection state
- Undo/redo history

## Phase 1.5: Architecture Refactoring Plan 🏗️

**Status**: IN PROGRESS - Major refactoring to improve maintainability
**Issue**: `CanvasGrid.tsx` had grown to 500+ lines and handled too many responsibilities
**Goal**: Improve maintainability, performance, and testability before adding animation features

### 🏗️ **Architectural Decisions Made**

#### **Context + Hooks Pattern for Canvas System**
We've established a new pattern for managing complex component state:

**Before (Anti-pattern)**: 
- Single 500+ line component with multiple `useState` calls
- Mixed concerns (rendering, interaction, state management)
- Hard to test and maintain

**After (New Pattern)**:
- `CanvasContext` for component-specific state
- `useCanvasState` hook for computed values and helpers
- Focused components with single responsibilities

**Key Files Created:**
- `src/contexts/CanvasContext.tsx` - Canvas state provider
- `src/hooks/useCanvasState.ts` - Canvas state management hook
- Updated `src/components/organisms/CanvasGrid.tsx` - Now uses context

**Benefits**:
- ✅ Reduced CanvasGrid from 501 to 424 lines (-15%)
- ✅ Better separation of concerns
- ✅ Easier to test individual pieces
- ✅ Pattern can be reused for other complex components

#### **Future Pattern Guidelines**
When any component exceeds ~200 lines or has multiple concerns:
1. **Extract state to Context** if state is component-specific
2. **Create custom hooks** for complex logic
3. **Split rendering** from interaction handling
4. **Create tool-specific** components when applicable

**Critical Zustand Hook Pattern**:
When creating hooks that use Zustand store data in useCallback/useMemo/useEffect:
- ✅ **Include all reactive store data** in dependency arrays
- ✅ **Destructure store data** at hook level, not inside callbacks
- ❌ **Don't rely on getters alone** - include the actual data objects
- 📝 **Example**: If using `getCell()`, also include `cells` in dependencies

This ensures consistent architecture across all development sessions.

### 🔄 **For Future Development Sessions**

**IMPORTANT**: When continuing this refactoring or adding new features:

1. **Always check COPILOT_INSTRUCTIONS.md** for current architectural patterns
2. **Follow the Context + Hooks pattern** for complex component state
3. **Reference completed steps** in this document to understand the current structure
4. **Before modifying CanvasGrid**: Check if logic belongs in hooks or separate components
5. **When adding new tools**: Create separate tool components in `src/components/tools/`

**Current Architecture Status** (Updated Sept 3, 2025):
- ✅ Canvas state management extracted to Context (Step 1)
- ✅ Mouse interaction logic extracted to Hooks (Step 2) - COMPLETE 
- ✅ Rendering split (Step 3) - COMPLETE
- ✅ Tool-specific components (Step 4) - COMPLETE

**Step 2 Completion Summary**:
- CanvasGrid reduced from 501 lines → 245 lines (~51% reduction)
- Created 5 specialized mouse handling hooks
- All functionality preserved: selection, drawing, rectangles, move operations
- Mouse drag events working correctly for all tools

**Pattern Example for New Features**:
```tsx
// ✅ DO: Use established patterns
function NewCanvasFeature() {
  const { canvasRef } = useCanvasContext();
  const { statusMessage } = useCanvasState();
  // ...
}

// ❌ DON'T: Add more useState to CanvasGrid
function CanvasGrid() {
  const [newState, setNewState] = useState(); // NO!
  // ...
}
```

### 📝 **Documentation Update Checklist**

**🚨 IMPORTANT**: After completing ANY refactoring step, update documentation:

#### Required Updates After Each Step:
- [ ] **Mark step as ✅ COMPLETE** in this file
- [ ] **Update COPILOT_INSTRUCTIONS.md** with new patterns
- [ ] **Remove outdated examples** from both files
- [ ] **Add new architectural decisions** to the log above
- [ ] **Update file structure** if components were moved/created
- [ ] **Test all code examples** still work

#### Documentation Validation:
- [ ] New contributors can follow the current instructions
- [ ] No conflicting patterns between old and new approaches
- [ ] All references to file paths are accurate
- [ ] Component examples match actual implementation

**Next person working on this project**: Before starting, verify documentation reflects current codebase state!

---

## 📋 Documentation Update Template

**Use this checklist after completing any architectural changes:**

### Step Completion Update:
```markdown
#### **Step X: [Description]** ✅ **COMPLETE**
- [x] Specific task 1
- [x] Specific task 2

**Completed**: 
- ✅ [What was accomplished]
- ✅ [Files created/modified]
- ✅ [Benefits achieved]
- ✅ [Line count improvements]
```

### Architectural Decision Log Entry:
```markdown
**Decision**: [Brief description]
**Reason**: [Why this approach was chosen]
**Impact**: [What changes for developers]
**Files**: [Which files were affected]
**Pattern**: [Code example of new pattern]
```

### COPILOT_INSTRUCTIONS.md Updates Needed:
- [ ] Update "Current Architecture Status" 
- [ ] Add new component patterns
- [ ] Update file structure
- [ ] Add new code examples
- [ ] Remove deprecated patterns

### Quick Validation:
- [ ] Run `npm run dev` - ensures no breaking changes
- [ ] Check file structure matches documentation
- [ ] Verify new patterns work in practice
- [ ] Remove any TODO comments from completed work

### 🎯 Refactoring Overview

The `CanvasGrid` component has become a "god component" that handles:
- Canvas rendering (drawing cells, grid, selection overlays)
- Mouse interaction (drawing, selection, drag & drop)
- Complex selection state management 
- Move/drag state with real-time preview
- Keyboard event handling
- Multiple drawing tool behaviors

**Target**: Break into focused, composable components and hooks

### 📋 Refactoring Tasks

#### **Step 1: Extract Canvas Context & State Management** ✅ **COMPLETE**
- [x] `src/contexts/CanvasContext.tsx` - Canvas-specific state provider
  - Canvas dimensions, cell size, zoom level
  - Local rendering state (separate from global canvas store)
  - Canvas interaction modes and flags
- [x] `src/hooks/useCanvasState.ts` - Canvas state management hook
- [x] Move local state out of `CanvasGrid` into context
- [x] Update `App.tsx` to wrap CanvasGrid with CanvasProvider

**Completed**: 
- ✅ Created `CanvasContext` with canvas-specific state (cellSize, interaction flags, selection/move state)
- ✅ Created `useCanvasState` hook with computed values and helper functions
- ✅ Created `useCanvasDimensions` helper for coordinate calculations
- ✅ Refactored `CanvasGrid` to use context instead of local useState
- ✅ All functionality preserved, ~50 lines removed from CanvasGrid component
- ✅ No breaking changes - all existing features work correctly

#### **Step 2: Extract Mouse Interaction Logic** ✅
- ✅ `src/hooks/useCanvasMouseHandlers.ts` - Core mouse event handling
  - Mouse coordinate conversion
  - Basic click/drag detection
  - Tool-agnostic mouse state
- ✅ `src/hooks/useCanvasSelection.ts` - Selection-specific logic
  - Selection bounds calculation
  - Selection rendering helpers
  - Selection state management
- ✅ `src/hooks/useCanvasDragAndDrop.ts` - Drag & drop behavior
  - Move state management
  - Drag preview rendering
  - Drop commit logic

**Results**: 
- ✅ Refactored `CanvasGrid` from 501 lines down to 245 lines (~256 lines removed)
- ✅ All mouse handling logic extracted to specialized hooks
- ✅ Eliminated duplicate mouse handler declarations
- ✅ Preserved all existing functionality including selection, drawing, and tool switching
- ✅ No breaking changes - development server runs successfully

#### **Step 3: Split Rendering Responsibilities** ✅ **COMPLETE**

**Goal**: Extract rendering logic from CanvasGrid.tsx while preserving all integration with the hook ecosystem.

**Completed**:
- ✅ Created `src/hooks/useCanvasRenderer.ts` - Coordinated rendering hook (159 lines)
- ✅ Extracted `drawCell` function and main rendering logic from CanvasGrid
- ✅ Combined grid rendering and selection overlay rendering in correct order
- ✅ Reduced CanvasGrid from 246 lines → 109 lines (~56% reduction)
- ✅ Preserved all visual features: selection marquee, move preview, grid rendering
- ✅ Maintained canvas resize handling and re-render coordination
- ✅ Fixed live rendering bug: Added `cells` dependency to ensure real-time updates
- ✅ No breaking changes - all functionality working correctly

**Critical Bug Fix During Step 3**:
- **Issue**: Drawing tools (pencil, eraser, fill) were not updating canvas in real-time
- **Root Cause**: `useCanvasRenderer` hook missing `cells` dependency in useCallback
- **Solution**: Added `cells` from `useCanvasStore()` to dependency array
- **Lesson**: When extracting Zustand store logic to hooks, ensure all reactive data is in dependencies

**Architecture Decision**: 
- **Pattern**: Used hook-based rendering instead of separate components
- **Reason**: Maintains rendering order (grid first, then overlays) and avoids component lifecycle coordination issues
- **Benefits**: Cleaner separation, easier to test, single hook manages all canvas rendering concerns

**Before/After**:
- CanvasGrid.tsx: 246 lines → 109 lines (137 lines removed)
- New hook: useCanvasRenderer.ts (159 lines of extracted rendering logic)
- Net result: ~20 lines reduction + much better separation of concerns

#### **Step 4: Create Tool-Specific Components** ✅ **COMPLETE**

**Goal**: Extract tool-specific logic into focused, reusable components for better maintainability and easier tool development.

**Completed**:
- ✅ Created `src/components/tools/` directory with tool-specific components:
  - `SelectionTool.tsx` (53 lines) - Selection tool behavior and status UI
  - `DrawingTool.tsx` (42 lines) - Pencil/eraser tool logic and status
  - `PaintBucketTool.tsx` (30 lines) - Fill tool implementation and status
  - `RectangleTool.tsx` (30 lines) - Rectangle drawing logic and status
  - `EyedropperTool.tsx` (26 lines) - Color/character picking and status
- ✅ Created `src/hooks/useToolBehavior.ts` (109 lines) - Tool behavior coordination and metadata
- ✅ Created `src/components/organisms/ToolManager.tsx` (34 lines) - Renders active tool component
- ✅ Created `src/components/organisms/ToolStatusManager.tsx` (34 lines) - Renders tool status UI
- ✅ Updated CanvasGrid to use ToolManager and ToolStatusManager
- ✅ Improved cursor logic using tool-specific cursor styles
- ✅ Maintained final CanvasGrid size at 111 lines (minimal growth due to new imports)

**Architecture Achievement**:
- **Separation of Concerns**: Each tool now has its own focused component
- **Status UI Enhancement**: Rich, tool-specific status messages replace generic statusMessage
- **Extensibility**: Easy to add new tools by creating new tool components
- **Maintainability**: Tool logic isolated and independently testable
- **Composition Pattern**: CanvasGrid now composes tool components rather than handling tool logic directly

**Total New Files Created**: 8 files, 358 lines of well-organized tool-specific code
**Pattern Established**: Clear template for future tool development

#### **Step 5: Performance Optimizations** 🚀 **IN PROGRESS**

**Goal**: Optimize canvas rendering for larger grids and smoother drawing performance before Phase 2.

##### **Step 5.1: Memoization & Cell Rendering Optimization** ⏳ **NEXT SESSION**
- [ ] Create memoized `CellRenderer` component with `React.memo`
- [ ] Implement `useMemoizedGrid` hook for grid data optimization
- [ ] Add cell-level change detection to prevent unnecessary re-renders
- [ ] Optimize `drawCell` function with computed font styles
- [ ] Create performance measurement utilities

**Current Performance Bottlenecks Identified**:
- `drawCell` function recalculates font/styles on every render (159 lines in useCanvasRenderer.ts)
- Canvas re-renders entire 80x24 grid (1,920 cells) on any cell change
- Selection overlay redraws on every move state change
- No caching of rendered cell content

**Target Improvements**:
- 🎯 Reduce canvas render time by 60-80% for large grids
- 🎯 Enable smooth 200x100 grid support (20,000 cells)
- 🎯 Cache rendered cell content for unchanged cells
- 🎯 Optimize font rendering and style calculations

##### **Step 5.2: Dirty Region Tracking** (Future)
- [ ] Implement dirty region tracking for partial re-renders
- [ ] Add viewport chunking for large grids (200x100+ support)

##### **Step 5.3: Drawing Performance** (Future)
- [ ] Debounce canvas updates during active drawing
- [ ] Optimize selection rendering performance

#### **Step 6: Final Canvas Composition**
- [ ] Refactor `CanvasGrid.tsx` to be a composition component:
```tsx
// Target structure:
<CanvasProvider>
  <CanvasRenderer />
  <CanvasOverlay />
  <CanvasInteraction>
    {activeTool === 'select' && <SelectionTool />}
    {activeTool === 'pencil' && <DrawingTool />}
    {activeTool === 'paintbucket' && <PaintBucketTool />}
    {/* Other tool components */}
  </CanvasInteraction>
</CanvasProvider>
```

### 🎯 Success Criteria

**Maintainability**:
- [ ] No component > 200 lines
- [ ] Each component has single responsibility
- [ ] Easy to add new tools without modifying existing code
- [ ] Comprehensive unit tests possible

**Performance**:
- [ ] Canvas renders smoothly with 200x100 grids
- [ ] No unnecessary re-renders during drawing
- [ ] Selection operations feel instant
- [ ] Memory usage remains reasonable

**Developer Experience**:
- [ ] Clear separation of concerns
- [ ] Tool behaviors are isolated and testable
- [ ] Adding new tools follows clear patterns
- [ ] Debugging is straightforward

### 🚧 Implementation Strategy

1. **Incremental Refactoring**: Extract one piece at a time to avoid breaking changes
2. **Feature Parity**: Ensure all current functionality works after each step
3. **Testing**: Add tests as we extract components
4. **Documentation**: Update this plan as we complete tasks

### 📅 Timeline Estimate

- **Step 1-2**: ✅ COMPLETE (2 sessions - context + mouse handlers)
- **Step 3**: 1-2 sessions (rendering split) - **NEXT**
- **Step 4**: 2-3 sessions (tool components)
- **Step 5**: 1-2 sessions (performance)
- **Step 6**: 1 session (final composition)

**Total**: ~6-10 development sessions

---

## 🎯 **STEP 3 PREPARATION - Session Handover Notes**

### **Current Files Ready for Extraction**
**File**: `src/components/organisms/CanvasGrid.tsx` (245 lines)

**Key Functions to Extract**:
1. **`drawCell`** (lines 57-85): Character rendering logic
2. **`renderGrid`** (lines 87-175): Main canvas drawing + selection overlay
3. **Canvas resize useEffect** (lines ~180-190): Canvas dimension handling

### **Step 3 Success Criteria**
- [ ] CanvasGrid.tsx reduced to ~100-120 lines (pure composition)
- [ ] Rendering logic in separate focused components
- [ ] All visual features preserved (selection marquee, move preview, etc.)
- [ ] Performance maintained or improved

### **Dependencies to Preserve**
- Canvas context integration (`useCanvasContext`)
- Selection state rendering (`selection.active`, move state preview)  
- Tool-specific rendering (selection marquee, move ghosts)
- Grid line rendering and cell backgrounds

### **Testing Requirements**
- Selection tool: Create, move, and clear selections
- Rectangle tool: Draw rectangles with preview
- Drawing tools: Pencil/eraser functionality
- Visual feedback: All animations and previews working

### **Current Canvas Architecture Files**
```
src/components/organisms/
  CanvasGrid.tsx              (111 lines - Pure composition component)
  ToolManager.tsx             (34 lines - Active tool component renderer)  
  ToolStatusManager.tsx       (34 lines - Tool status UI renderer)

src/components/tools/
  SelectionTool.tsx           (53 lines - Selection behavior & status)
  DrawingTool.tsx             (42 lines - Pencil/eraser behavior & status)
  PaintBucketTool.tsx         (30 lines - Fill tool behavior & status)
  RectangleTool.tsx           (30 lines - Rectangle behavior & status)
  EyedropperTool.tsx          (26 lines - Eyedropper behavior & status)
  index.ts                    (11 lines - Tool exports)

src/contexts/
  CanvasContext.tsx           (98 lines - Canvas-specific state)

src/hooks/
  useCanvasState.ts           (138 lines - State management & helpers)
  useCanvasMouseHandlers.ts   (123 lines - Mouse event routing)
  useCanvasSelection.ts       (185 lines - Selection tool logic)
  useCanvasDragAndDrop.ts     (108 lines - Drawing/rectangle tools)
  useCanvasRenderer.ts        (159 lines - Grid & overlay rendering)
  useToolBehavior.ts          (109 lines - Tool coordination & metadata)
  useDrawingTool.ts           (97 lines - Tool implementations)
  useKeyboardShortcuts.ts     (existing - keyboard handling)
```

**Step 4 Results**: Successfully extracted tool-specific behavior into focused components while maintaining all existing functionality. Canvas system now fully modularized and ready for Phase 2.

---

## 🔄 **SESSION HANDOVER PLAN - Step 5.1 Memoization**

### **� Context for Next Session**

**Status**: Ready to begin Step 5.1 (Performance Optimizations - Memoization)
**Current Architecture**: Phase 1.5 refactoring COMPLETE (Steps 1-4 done)
**Target**: Optimize canvas rendering performance before Phase 2 (Animation System)

### **🎯 Step 5.1 Implementation Plan**

#### **Task 1: Create Memoized Cell Renderer Component** 
**File**: `src/components/atoms/CellRenderer.tsx` (NEW)
```typescript
// Target structure for memoized cell rendering
interface CellRendererProps {
  x: number;
  y: number;
  cell: Cell | undefined;
  cellSize: number;
  isMoving?: boolean;
  moveOffset?: { x: number; y: number };
}

const CellRenderer = React.memo(({ x, y, cell, cellSize, isMoving, moveOffset }: CellRendererProps) => {
  // Memoized cell rendering logic
  // Only re-renders when cell content or position actually changes
});
```

#### **Task 2: Optimize Font and Style Calculations**
**File**: `src/hooks/useCanvasRenderer.ts` (MODIFY)
**Current Issue**: `drawCell` function recalculates font styles on every render
**Target**: Pre-compute and memoize font styles, drawing parameters

#### **Task 3: Implement Grid Memoization Hook**
**File**: `src/hooks/useMemoizedGrid.ts` (NEW)
```typescript
// Target structure for grid-level memoization
const useMemoizedGrid = () => {
  // Memoize grid data and change detection
  // Track which cells actually changed
  // Return optimized render data
}
```

#### **Task 4: Create Performance Measurement Utils**
**File**: `src/utils/performance.ts` (NEW)
```typescript
// Development utilities to measure rendering performance
const measureCanvasRender = () => {
  // Measure render times
  // Track FPS during drawing
  // Log performance metrics
}
```

### **🔍 Files to Focus On**

#### **Primary Files for Step 5.1**:
1. **`src/hooks/useCanvasRenderer.ts`** (159 lines)
   - Current rendering logic that needs optimization
   - `drawCell` function (lines 28-57) - main optimization target
   - `renderCanvas` function (lines 59-139) - grid iteration logic

2. **`src/stores/canvasStore.ts`** (163 lines)
   - Canvas data structure (`cells: Map<string, Cell>`)
   - Cell getter/setter methods for change detection

3. **`src/components/organisms/CanvasGrid.tsx`** (111 lines)
   - Integration point for new memoized components

#### **Key Code Sections to Understand**:

**Canvas Rendering Loop** (useCanvasRenderer.ts:84-96):
```typescript
// Current: Re-renders ALL cells on ANY change
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const key = `${x},${y}`;
    // This is what we need to optimize
    if (movingCells.has(key)) {
      drawCell(ctx, x, y, { char: ' ', color: '#000000', bgColor: '#FFFFFF' });
    } else {
      const cell = getCell(x, y);
      drawCell(ctx, x, y, cell);
    }
  }
}
```

**Cell Drawing Function** (useCanvasRenderer.ts:28-57):
```typescript
// Current: Recalculates font/styles every call
const drawCell = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, cell?: Cell) => {
  // Font calculation happens every render - OPTIMIZE THIS
  ctx.font = `${cellSize - 2}px 'Courier New', monospace`;
  // Style calculations - MEMOIZE THESE
});
```

### **🎯 Success Criteria for Step 5.1**

**Performance Targets**:
- [ ] 60-80% reduction in render time for 80x24 grid
- [ ] Enable smooth 200x100 grid support (test with large canvas)
- [ ] Eliminate unnecessary cell re-renders (only changed cells render)
- [ ] Font/style calculations cached and reused

**Architecture Targets**:
- [ ] Maintain all existing functionality (no breaking changes)
- [ ] Preserve tool integration (selection, drawing, move operations)
- [ ] Keep clean separation of concerns from Steps 1-4
- [ ] Add performance measurement capabilities

**Testing Requirements**:
- [ ] All drawing tools work correctly (pencil, eraser, fill, rectangle)
- [ ] Selection and move operations maintain smooth performance
- [ ] Large grid test (create 200x100 canvas, verify smooth drawing)
- [ ] Performance measurements show improvement

### **🔧 Implementation Strategy**

#### **Phase A: Component Memoization** (First Priority)
1. Create `CellRenderer` component with `React.memo`
2. Replace direct canvas drawing with component-based approach
3. Add proper equality checks for memoization

#### **Phase B: Style Optimization** (Second Priority) 
1. Pre-compute font styles and drawing parameters
2. Memoize expensive calculations in `drawCell`
3. Cache rendering contexts and settings

#### **Phase C: Change Detection** (Third Priority)
1. Implement cell-level change tracking
2. Only re-render cells that actually changed
3. Optimize grid iteration logic

#### **Phase D: Performance Measurement** (Final)
1. Add performance monitoring utilities
2. Benchmark before/after performance
3. Validate large grid support

### **🚨 Important Reminders**

**Architecture Consistency**:
- Follow established patterns from Steps 1-4
- Use hooks for logic, components for UI
- Maintain Context + Hooks pattern

**Zustand Integration**:
- Remember to include all reactive store data in dependency arrays
- Don't rely on getter functions alone - include actual data objects
- Test that live rendering still works after optimizations

**Testing Protocol**:
- Test with `npm run dev` after each change
- Verify all tools work: selection, drawing, rectangles, fill, eyedropper
- Test large canvas creation to validate performance gains

### **🔗 Architecture Status After Step 5.1**

**Target File Structure After Completion**:
```
src/components/atoms/
  CellRenderer.tsx              (NEW - Memoized cell rendering)

src/hooks/
  useCanvasRenderer.ts          (OPTIMIZED - Reduced render overhead)
  useMemoizedGrid.ts            (NEW - Grid-level optimization)

src/utils/
  performance.ts                (NEW - Performance measurement)
```

**Benefits Expected**:
- ✅ 60-80% faster canvas rendering
- ✅ Support for 200x100 grids (20K cells)
- ✅ Smooth drawing performance
- ✅ Foundation for Phase 2 animation performance

---

Once refactoring is complete, we'll be well-positioned for:
- **Timeline Integration**: Canvas composition makes frame switching easier
- **Export Features**: Clean rendering separation helps with export functionality  
- **Advanced Tools**: Tool component pattern makes complex tools manageable
- **Performance at Scale**: Optimizations support larger ASCII art projects

### 🔄 After Step 5.1: Ready for Remaining Performance Work

Once Step 5.1 memoization is complete, we'll be positioned for:
- **Step 5.2**: Dirty region tracking for partial re-renders
- **Step 5.3**: Drawing performance optimization and debouncing
- **Phase 2**: Timeline and animation system with smooth performance

## 📋 Quick Reference for Next Session

### **Files to Read First**:
1. `src/hooks/useCanvasRenderer.ts` - Current rendering logic (159 lines)
2. `src/stores/canvasStore.ts` - Cell data structure 
3. This section of DEVELOPMENT.md - Step 5.1 implementation plan

### **Commands to Run**:
```bash
# Start development server
npm run dev

# Test large canvas (after implementing Step 5.1)
# Create 200x100 canvas in UI to test performance

# Measure current performance
# (Add performance utils first)
```

### **Key Performance Bottleneck**:
The `drawCell` function in `useCanvasRenderer.ts` runs 1,920 times (80x24) on every canvas render, recalculating font styles each time. This is the main optimization target for Step 5.1.

### **Current Status Reminder**:
- ✅ Phase 1.5 Steps 1-4 COMPLETE (Architecture fully refactored)
- ⏳ Step 5.1 (Memoization) ready to begin
- 🎯 Target: 60-80% render performance improvement

## Next Steps

1. **Complete Phase 1.5 Refactoring**: Follow the plan above
2. **Timeline UI**: Create the frame timeline with thumbnails  
3. **Animation Playback**: Implement frame switching and playback controls
4. **Export Functions**: Implement text and JSON export capabilities

## Contributing

Follow the component structure and Copilot instructions in `COPILOT_INSTRUCTIONS.md` for consistent code organization.
