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

This ensures consistent architecture across all development sessions.

### 🔄 **For Future Development Sessions**

**IMPORTANT**: When continuing this refactoring or adding new features:

1. **Always check COPILOT_INSTRUCTIONS.md** for current architectural patterns
2. **Follow the Context + Hooks pattern** for complex component state
3. **Reference completed steps** in this document to understand the current structure
4. **Before modifying CanvasGrid**: Check if logic belongs in hooks or separate components
5. **When adding new tools**: Create separate tool components in `src/components/tools/`

**Current Architecture Status**:
- ✅ Canvas state management extracted to Context
- 🚧 Mouse interaction logic (Step 2) - NEXT
- ⏳ Rendering split (Step 3) - PENDING  
- ⏳ Tool-specific components (Step 4) - PENDING

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

#### **Step 2: Extract Mouse Interaction Logic**
- [ ] `src/hooks/useCanvasMouseHandlers.ts` - Core mouse event handling
  - Mouse coordinate conversion
  - Basic click/drag detection
  - Tool-agnostic mouse state
- [ ] `src/hooks/useCanvasSelection.ts` - Selection-specific logic
  - Selection bounds calculation
  - Selection rendering helpers
  - Selection state management
- [ ] `src/hooks/useCanvasDragAndDrop.ts` - Drag & drop behavior
  - Move state management
  - Drag preview rendering
  - Drop commit logic

#### **Step 3: Split Rendering Responsibilities**
- [ ] `src/components/organisms/CanvasRenderer.tsx` - Pure rendering component
  - Canvas drawing logic (cells, characters, backgrounds)
  - Grid line rendering
  - Performance optimizations (memoization, partial updates)
- [ ] `src/components/organisms/CanvasOverlay.tsx` - UI overlay component
  - Selection rectangles and animation
  - Tool cursors and indicators
  - Drag preview ghost images
- [ ] `src/components/organisms/CanvasInteraction.tsx` - Interaction handling
  - Mouse event bindings
  - Keyboard event handling
  - Tool behavior coordination

#### **Step 4: Create Tool-Specific Components**
- [ ] `src/components/tools/` directory structure:
  - `SelectionTool.tsx` - Selection tool behavior and UI
  - `DrawingTool.tsx` - Pencil/eraser tool logic
  - `PaintBucketTool.tsx` - Fill tool implementation
  - `RectangleTool.tsx` - Rectangle drawing logic
  - `EyedropperTool.tsx` - Color/character picking
- [ ] `src/hooks/useToolBehavior.ts` - Tool behavior coordination

#### **Step 5: Performance Optimizations**
- [ ] Canvas viewport/chunking for large grids (200x100+ support)
- [ ] Implement dirty region tracking for partial re-renders
- [ ] Memoize cell rendering with `React.memo`
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

- **Step 1-2**: 1-2 sessions (context + mouse handlers)
- **Step 3**: 1-2 sessions (rendering split)
- **Step 4**: 2-3 sessions (tool components)
- **Step 5**: 1-2 sessions (performance)
- **Step 6**: 1 session (final composition)

**Total**: ~6-10 development sessions

### 🔄 After Refactoring: Ready for Phase 2

Once refactoring is complete, we'll be well-positioned for:
- **Timeline Integration**: Canvas composition makes frame switching easier
- **Export Features**: Clean rendering separation helps with export functionality  
- **Advanced Tools**: Tool component pattern makes complex tools manageable
- **Performance at Scale**: Optimizations support larger ASCII art projects

## Next Steps

1. **Complete Phase 1.5 Refactoring**: Follow the plan above
2. **Timeline UI**: Create the frame timeline with thumbnails  
3. **Animation Playback**: Implement frame switching and playback controls
4. **Export Functions**: Implement text and JSON export capabilities

## Contributing

Follow the component structure and Copilot instructions in `COPILOT_INSTRUCTIONS.md` for consistent code organization.
