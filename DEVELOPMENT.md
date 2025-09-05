# ASCII Motion - Developm```
src/
├── components/
│   ├── common/         # Shared/reusable components (CellRenderer, PerformanceMonitor, ThemeToggle)
│   ├── features/       # Complex components (CanvasGrid, CanvasRenderer, CanvasOverlay, CanvasWithShortcuts, ToolPalette, CharacterPalette, ColorPicker)
│   ├── tools/          # Tool-specific components (SelectionTool, DrawingTool, RectangleTool, PaintBucketTool, EyedropperTool)
│   └── ui/             # Shadcn UI components
├── stores/             # Zustand state management
│   ├── canvasStore.ts  # Canvas data and operations
│   ├── animationStore.ts # Animation timeline and frames
│   └── toolStore.ts    # Active tools and settings
├── types/              # TypeScript type definitions
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── constants/          # App constants and configurations
└── lib/                # Third-party library configurations
```ting Started

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
│   ├── common/         # Shared/reusable components (CellRenderer, PerformanceMonitor, ThemeToggle)
│   ├── features/       # Complex components (CanvasGrid, CanvasRenderer, CanvasOverlay, CanvasWithShortcuts, ToolPalette, CharacterPalette, ColorPicker)
│   ├── tools/          # Tool-specific components (SelectionTool, DrawingTool, RectangleTool, PaintBucketTool, EyedropperTool)
│   └── ui/             # Shadcn UI components
├── stores/             # Zustand state management
│   ├── canvasStore.ts  # Canvas data and operations
│   ├── animationStore.ts # Animation timeline and frames
│   └── toolStore.ts    # Active tools and settings
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
- **Tailwind CSS v3.4.17** - Styling (⚠️ **CRITICAL**: Must use v3.x for shadcn compatibility)
- **Shadcn/ui** - UI components
- **Zustand** - State management
- **Lucide React** - Icons

### **🚨 IMPORTANT: Tailwind CSS Version Lock**
**This project requires Tailwind CSS v3.x**. Do NOT upgrade to v4+ without extensive testing as it breaks shadcn/ui compatibility.

## Development Phases

### Phase 1: Core Editor ✅ **COMPLETE**
- [x] Project scaffolding
- [x] Basic stores (canvas, animation, tools)
- [x] Type definitions and constants
- [x] Canvas grid component
- [x] Basic drawing tools (pencil, eraser, paint bucket, select, eyedropper, rectangle, ellipse)
- [x] Character palette
- [x] Color picker
- [x] Tool palette
- [x] Undo/redo functionality
- [x] Undo/redo fixed - proper full-action batching (Sept 3, 2025)
- [x] Basic UI layout with sidebars
- [x] Rectangle drawing tool implementation
- [x] Fill tool (flood-fill algorithm with optimization)
- [x] Selection tool copy/paste functionality
- [x] **Enhanced Paste with Visual Preview** - Advanced paste mode with drag positioning (Sept 3, 2025)
- [x] **Ellipse Drawing Tool** - Complete ellipse tool with filled/hollow modes (Sept 3, 2025)
- [x] **Aspect Ratio Locking** - Shift key constraints for rectangle and ellipse tools (Sept 3, 2025)
- [x] **Enhanced Pencil Tool** - Shift+click line drawing functionality (Sept 3, 2025)
- [x] **Zoom and Navigation System** - Complete zoom/pan controls with space key override (Sept 4, 2025)
- [x] Keyboard shortcuts (Cmd/Ctrl+C, Cmd/Ctrl+V, Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z, Space for hand tool)

## 🔄 **Phase 1.5 COMPLETE - Enhanced Toolset Next**

### **🎯 What's Been Accomplished**

**Complete Architecture Refactoring**: The entire Phase 1.5 refactoring plan has been successfully completed:
- ✅ All 6 steps executed (Context extraction → Performance optimization → Final composition)
- ✅ CanvasGrid reduced from 501 lines to 111 lines (~78% reduction)
- ✅ 20+ focused components and hooks created
- ✅ Performance optimized for large grids (200x100+ support)
- ✅ Clean separation of concerns achieved
- ✅ Tool system fully modularized

### **🎨 Next Development Focus**

**Phase 1.6: Enhanced Art Creation Tools** - Advanced toolset before animation:
- **New Tools**: Type tool, lasso selection, magic wand, re-color brush, pattern brush
- **UI/UX**: Responsive layout redesign, enhanced status panel, better grid overlay
- **Advanced Features**: Custom palette system, text box grid shape, non-contiguous fill
- **Polish**: Active cell highlighting, tool hotkeys, additional block characters

**Benefits of Completed Architecture**:
- 🎯 **Tool Extension**: New tools follow established patterns (8-step tool creation process)
- 🎯 **Performance**: Optimizations support complex tools without lag
- 🎯 **Maintainability**: Adding features won't create "god components"
- 🎯 **UI Flexibility**: Context-based state allows for advanced tool interfaces

## Next Steps

1. **Phase 1.6: Enhanced Art Creation Tools** - Next phase
   - New tool implementations: Type tool, lasso selection, magic wand
   - UI/UX improvements: Responsive layout, enhanced status panel
   - Advanced systems: Custom palette, non-square grid cells
   - Tool polish: Hotkeys, hover highlights, expanded character sets

2. **Phase 2: Animation System** - After enhanced toolset
   - Timeline UI: Create the frame timeline with thumbnails  
   - Animation Playback: Implement frame switching and playback controls
   - Frame Management: Add/delete/duplicate frames
   - Onion Skinning: Show previous/next frames for animation reference

3. **Phase 3: Export Functions** - Final development
   - Text export capabilities
   - JSON project file format
   - GIF generation for animations
   - MP4 export for video output

### **🎯 ENHANCEMENT COMPLETED: Lasso Selection Tool (Sept 4, 2025)**
✅ **Files Created/Modified:**
- `src/types/index.ts` (ENHANCED) - Added 'lasso' tool type and LassoSelection interface
- `src/stores/toolStore.ts` (ENHANCED) - Added lasso selection state and actions (separate from rectangular selection)
- `src/utils/polygon.ts` (NEW) - Point-in-polygon algorithms and polygon utility functions (150 lines)
- `src/hooks/useCanvasLassoSelection.ts` (NEW) - Dedicated lasso selection hook with complex multi-state behavior (180 lines)
- `src/components/tools/LassoTool.tsx` (NEW) - Lasso tool component and status (45 lines)
- `src/components/tools/index.ts` (ENHANCED) - Added LassoTool exports and types
- `src/hooks/useToolBehavior.ts` (ENHANCED) - Added lasso tool routing and metadata
- `src/components/features/ToolManager.tsx` (ENHANCED) - Added lasso tool component routing
- `src/components/features/ToolStatusManager.tsx` (ENHANCED) - Added lasso tool status routing
- `src/hooks/useCanvasMouseHandlers.ts` (ENHANCED) - Integrated lasso tool mouse handling
- `src/hooks/useKeyboardShortcuts.ts` (ENHANCED) - Extended copy/paste to support lasso selections
- `src/components/features/ToolPalette.tsx` (ENHANCED) - Added lasso tool button with Lasso icon
- `src/hooks/useCanvasRenderer.ts` (ENHANCED) - Added complete lasso selection rendering (path drawing, cell highlighting, move preview)

✅ **Features Implemented:**
- **Freeform Drawing**: Click and drag to draw irregular selection paths
- **True Point-in-Polygon**: Accurate irregular shape selection using ray casting algorithm
- **Real-time Visual Feedback**: Shows both the drawn path and highlighted selected cells during creation
- **Auto-close on Mouse Release**: Selection automatically completes when user releases mouse
- **Complete Selection Workflow**: Selection mode → Move mode → Commit/Cancel (same as rectangular selection)
- **Copy/Paste Integration**: Cmd/Ctrl+C and Cmd/Ctrl+V work with lasso selections
- **Dual Clipboard System**: Separate clipboards for rectangular and lasso selections
- **Move Mode with Preview**: Click inside lasso selection to move content with real-time preview
- **Keyboard Shortcuts**: Escape to cancel, Enter to commit, consistent with existing patterns
- **Proper Tool Integration**: Follows established 8-step tool creation pattern

✅ **Technical Architecture:**
- **Dedicated Hook Pattern**: `useCanvasLassoSelection` for complex multi-state tool behavior
- **Complete State Separation**: Lasso selection state completely separate from rectangular selection
- **Consistent Naming Convention**: All functions/variables prefixed with "Lasso" to prevent confusion
- **Advanced Algorithms**: Point-in-polygon detection, polygon smoothing, cell intersection testing
- **Performance Optimized**: Efficient polygon algorithms with bounding box optimization
- **Visual Rendering**: Real-time path drawing, cell highlighting, move mode preview with proper offsets

✅ **User Experience:**
- **Professional Feel**: Matches behavior of advanced graphics editors
- **Visual Clarity**: Purple path and highlight colors distinguish from rectangular selection
- **Responsive Feedback**: Real-time visual feedback during drawing and moving
- **Error Prevention**: Minimum 3 points required for valid lasso selection
- **Intuitive Controls**: Natural click-drag-release workflow

### **🎯 ENHANCEMENT COMPLETED: Advanced Paste with Visual Preview (Sept 3, 2025)**
✅ **Files Created/Modified:**
- `src/hooks/usePasteMode.ts` (NEW) - Advanced paste mode state management (188 lines)
- `src/components/features/CanvasWithShortcuts.tsx` (NEW) - Context-aware shortcuts wrapper (21 lines)
- `src/contexts/CanvasContext.tsx` (ENHANCED) - Added paste mode state and actions
- `src/hooks/useCanvasRenderer.ts` (ENHANCED) - Integrated paste preview rendering  
- `src/hooks/useCanvasMouseHandlers.ts` (ENHANCED) - Added paste mode mouse interactions
- `src/hooks/useKeyboardShortcuts.ts` (ENHANCED) - Enhanced paste workflow with preview mode
- `src/hooks/useCanvasSelection.ts` (FIXED) - Fixed selection deselection bug
- `src/App.tsx` (UPDATED) - Updated to use CanvasWithShortcuts wrapper

✅ **Enhancement Achieved:**
- **Visual Preview**: Real-time paste preview with 85% opacity and purple marquee
- **Drag Positioning**: Click and drag to reposition paste content before committing
- **Professional Workflow**: Matches advanced graphics editor paste behavior
- **Multiple Commit Options**: Keyboard shortcuts, mouse clicks, or cancel with Escape
- **Context Integration**: Follows established CanvasProvider pattern
- **Bug Fix**: Selection deselection now works properly when clicking outside selection

✅ **Ready for Phase 2:**
- Timeline and animation system development
- Export system implementation

### **🎯 ENHANCEMENT COMPLETED: Zoom and Navigation System (Sept 4, 2025)**
✅ **Files Created/Modified:**
- `src/components/features/ZoomControls.tsx` (NEW) - Zoom controls with reset view functionality (78 lines)
- `src/hooks/useHandTool.ts` (NEW) - Hand tool pan functionality with space key override (85 lines)
- `src/contexts/CanvasContext.tsx` (ENHANCED) - Added zoom, pan offset, and hand dragging state
- `src/hooks/useToolBehavior.ts` (ENHANCED) - Dynamic cursor management for hand tool states
- `src/hooks/useCanvasMouseHandlers.ts` (ENHANCED) - Priority routing for hand tool and space key override
- `src/hooks/useCanvasState.ts` (ENHANCED) - Zoom-aware coordinate calculations and rendering
- `src/components/features/CanvasGrid.tsx` (ENHANCED) - Integrated zoom and pan transformations
- `src/components/features/CanvasSettings.tsx` (UPDATED) - Included ZoomControls component

✅ **Features Implemented:**
- **Zoom Controls**: Zoom in/out buttons with 25%-400% range, current zoom display
- **Pan System**: Complete pan offset state management with coordinate transformations
- **Hand Tool**: Dedicated hand tool for canvas panning with proper cursor states
- **Space Key Override**: Hold space to temporarily activate hand tool (industry standard)
- **Reset View**: Single button to reset both zoom (100%) and pan position (origin)
- **Dynamic Cursors**: CSS class-based cursor system (grab/grabbing) without layout shift
- **Coordinate System**: Zoom and pan-aware mouse coordinate calculations
- **Performance**: Efficient state management and rendering with proper memoization

✅ **User Experience:**
- **Professional Controls**: Zoom controls match industry standard design patterns
- **Smooth Navigation**: Real-time pan and zoom with immediate visual feedback
- **Keyboard Integration**: Space key override follows graphics editor conventions
- **No Layout Shift**: Reset button always visible, properly disabled when at default
- **Visual Feedback**: Proper cursor states (crosshair → grab → grabbing) for tool clarity
- **Stable UI**: CSS class-based cursors prevent inline style override issues

✅ **Ready for Phase 2:**
- Timeline and animation system development
- Export system implementation

## Phase 1 Features Summary

### 🎨 Drawing Tools
- **Pencil** ✏️ - Draw individual characters with selected colors, Shift+click for line drawing
- **Eraser** 🧽 - Remove characters from cells
- **Paint Bucket** 🪣 - Flood fill connected areas with same character/color
- **Rectangle** ▭ - Draw filled or hollow rectangles with Shift key for perfect squares
- **Ellipse** 🔵 - Draw filled or hollow ellipses with Shift key for perfect circles
- **Eyedropper** 💧 - Pick character and colors from existing artwork
- **Hand Tool** ✋ - Pan and navigate around the canvas, activated by Space key override

### 🎯 Selection & Editing
- **Selection Tool** ⬚ - Select rectangular areas with multiple interaction modes:
  - *Click & Drag*: Start selection and drag to define area
  - *Click + Shift+Click*: Click to start, move mouse, Shift+Click to complete
  - *Click Inside Selection*: Move existing selection content with real-time preview
- **Move Mode** - Drag content within selections with live marquee box movement
- **Enhanced Copy/Paste** - Copy selected areas and paste with **visual preview and drag positioning** (Sept 3, 2025)
- **Undo/Redo** - Full history management with 50-action limit

### 🎭 Character & Color Management
- **Character Palette** - Organized character sets (Basic Text, Punctuation, Math/Symbols, Lines/Borders, Blocks/Shading, Arrows, Geometric, Special)
- **Color Picker** - Preset colors and custom color selection for text and background
- **Real-time Preview** - See changes instantly on the canvas

### ⌨️ Keyboard Shortcuts
- `Cmd/Ctrl + C` - Copy selection
- `Cmd/Ctrl + V` - **Enhanced Paste with Preview** - Shows visual preview with drag positioning (Sept 3, 2025)
- `Cmd/Ctrl + Z` - Undo (full action batching - Sept 3, 2025)
- `Cmd/Ctrl + Shift + Z` - Redo (full action batching - Sept 3, 2025)
- `Space` - **Hand Tool Override** - Hold to temporarily activate hand tool for panning (Sept 4, 2025)
- `Escape` - Clear/deselect current selection or cancel paste preview
- `Enter` - Commit paste preview (when in paste mode)
- `Click outside selection` - Commit paste at current preview position

### 📐 Canvas Features
- **Configurable Size** - Default 80x24 (terminal size), customizable up to 200x100
- **Grid-based Drawing** - Precise character placement
- **Zoom Controls** - 25% to 400% zoom range with smooth scaling (Sept 4, 2025)
- **Pan Navigation** - Click and drag with hand tool or space key override (Sept 4, 2025)
- **Reset View** - Single button to reset zoom and pan position (Sept 4, 2025)
- **Visual Selection** - Animated selection overlay
- **Real-time Rendering** - Smooth canvas updates with coordinate transformation
- **Aspect Ratio Constraints** - Shift key for perfect squares/circles in shape tools

### Phase 1.6: Enhanced Art Creation Tools
**Status**: PLANNED - Advanced tool set and improved editor experience
**Goal**: Complete the art creation toolset before moving to animation features

#### New Drawing Tools
- [ ] **Type Tool** - Text input and editing directly on canvas
- [x] **Lasso Selection** ✅ **COMPLETE** - Freeform selection tool for irregular shapes (Sept 4, 2025)
- [ ] **Select Same/Magic Wand** - Select similar cells (contiguous and non-contiguous modes)
- [ ] **Re-Color Brush** - Change colors without affecting characters
- [ ] **Pattern Brush** - Apply repeating patterns while drawing
- [ ] **Gradient Color Fill** *(wait until custom palette system)*

#### Tool Behavior Enhancements
- [ ] **Non-contiguous Fill** - Fill all matching cells regardless of connection
- [ ] **Active Cell Highlight** - Hover highlight for all drawing tools
- [ ] **Hotkeys for All Tools** - Keyboard shortcuts for tool switching
- [ ] **Additional Block Characters** - Expand character palette with more block sets

#### UI/UX Improvements
- [ ] **Responsive Layout Redesign** - Better screen space usage and mobile support
- [ ] **Grid Overlay Enhancement** - Prettier grid with blend modes and opacity
- [ ] **Canvas Settings Panel** - Character tracking/line spacing controls
- [ ] **Enhanced Status Panel** - More useful information and tool settings integration

#### Advanced Systems
- [ ] **Custom Palette System** - Move beyond ANSI 4-bit to full color support
- [ ] **Text Box Grid Shape** - Non-square cells for better text proportions

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

## 🔧 Troubleshooting

### **Shadcn Components Look Unstyled/Grey**
**Symptoms**: Buttons, cards, and other shadcn components appear with grey backgrounds and no modern styling

**Quick Fix**:
1. Check Tailwind CSS version: `npm list tailwindcss` (should be v3.x)
2. Verify PostCSS config uses `tailwindcss: {}`, not `@tailwindcss/postcss`
3. Test with minimal button: `<Button>Test</Button>` should have proper styling
4. Remove any universal CSS selectors (`* { }`) from CSS files
5. Strip custom className overrides from shadcn components

**Root Cause**: Usually Tailwind v4 incompatibility or CSS conflicts with shadcn styling

### **Performance Issues with Large Grids**
**Symptoms**: Slow rendering when canvas size exceeds 100x50 cells

**Solutions**:
1. Ensure Step 5.1 performance optimizations are implemented
2. Use PerformanceMonitor component to measure render times
3. Check for missing React.memo on cell components
4. Verify memoization dependencies include all reactive data

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
- Updated `src/components/features/CanvasGrid.tsx` - Now uses context

**Benefits**:
- ✅ Reduced CanvasGrid from 501 to 424 lines (-15%)
- ✅ Better separation of concerns
- ✅ Easier to test individual pieces
- ✅ Pattern can be reused for other complex components

#### **Tailwind CSS v3 Requirement for Shadcn Compatibility (Sept 3, 2025)**
**Decision**: Lock project to Tailwind CSS v3.x and prevent upgrades to v4+
**Issue**: Tailwind v4 introduces breaking changes that make shadcn/ui components unstyled
**Root Cause**: Shadcn components designed for Tailwind v3 architecture and PostCSS configuration
**Solution**: 
- Downgraded from Tailwind v4.1.12 to v3.4.17
- Updated PostCSS config from `@tailwindcss/postcss` to `tailwindcss`
- Established styling guidelines to prevent future conflicts

**Files Affected**:
- `package.json` - Tailwind version locked to v3.x (currently v3.4.17)
- `postcss.config.js` - Configuration updated for v3
- Documentation updated with styling requirements

**Impact for Developers**:
- ✅ Shadcn components now render with proper modern styling
- ✅ Buttons, cards, and other UI components work as expected
- ⚠️ **CRITICAL**: Never upgrade Tailwind to v4+ without extensive compatibility testing
- 📋 **Pattern**: Always test shadcn components when changing build tools

**Lessons Learned**:
- Always validate UI component libraries work with bleeding-edge dependencies
- Shadcn styling issues often indicate build tool incompatibilities
- Test with minimal components first when debugging styling issues

#### **Ellipse Tool Implementation with Aspect Ratio Locking (Sept 3, 2025)**
**Decision**: Implement ellipse tool following established 8-step tool pattern with enhanced Shift key functionality
**Issue**: Need additional drawing tool for geometric shapes and professional graphics editor-style constraints
**Root Cause**: User request for ellipse drawing capability with modern graphics software features
**Solution**: 
- Created complete ellipse tool following componentized architecture pattern
- Enhanced existing rectangle tool with Shift key aspect ratio locking 
- Implemented global keyboard event handling for modifier key detection
- Added mathematical ellipse algorithms for both filled and hollow ellipses

**Files Affected**:
- `src/types/index.ts` - Added 'ellipse' to Tool union type
- `src/components/tools/EllipseTool.tsx` - New ellipse tool component (31 lines)
- `src/hooks/useDrawingTool.ts` - Enhanced with ellipse drawing algorithms
- `src/hooks/useCanvasDragAndDrop.ts` - Added aspect ratio constraint logic
- `src/contexts/CanvasContext.tsx` - Added shiftKeyDown state management
- `src/components/features/CanvasGrid.tsx` - Added global keyboard event listeners
- All tool management files updated per 8-step pattern

**Impact for Developers**:
- ✅ Complete ellipse drawing tool with filled/hollow modes
- ✅ Professional aspect ratio locking (Shift for squares/circles)
- ✅ Enhanced status messages indicating Shift key functionality  
- ✅ Pattern established for keyboard modifier integration
- 📋 **Architecture**: Demonstrates proper tool extensibility and modifier key handling

**Lessons Learned**:
- Mathematical approach more reliable than pixel-level algorithms for ASCII grids
- Global keyboard event handling enables professional modifier key functionality
- 8-step tool pattern scales well for complex interactive tools
- Status message enhancement improves user experience significantly

#### **Enhanced Pencil Tool with Shift+Click Line Drawing (Sept 3, 2025)**
**Decision**: Add shift+click line drawing functionality to pencil tool following existing patterns
**Issue**: User request for professional line drawing capability between points using shift+click
**Root Cause**: Need for efficient line drawing in ASCII art creation, similar to professional graphics software
**Solution**: 
- Added pencil-specific state tracking (`pencilLastPosition`) to tool store
- Implemented Bresenham line algorithm for accurate ASCII grid line drawing
- Enhanced drawAtPosition to handle shift+click mode with line drawing
- Modified mouse handlers to detect and pass shift key state to drawing functions

**Files Affected**:
- `src/stores/toolStore.ts` - Added pencilLastPosition state and setPencilLastPosition action
- `src/hooks/useDrawingTool.ts` - Added getLinePoints and drawLine functions with Bresenham algorithm
- `src/hooks/useCanvasDragAndDrop.ts` - Modified to pass shift key state to drawing functions
- `src/components/tools/DrawingTool.tsx` - Enhanced status message to indicate shift+click functionality

**Impact for Developers**:
- ✅ Professional line drawing functionality with shift+click
- ✅ Follows established architecture patterns without introducing tech debt
- ✅ Bresenham algorithm ensures accurate line drawing on ASCII grid
- ✅ Enhanced user feedback through improved status messages
- ✅ State management follows existing tool-specific patterns
- 📋 **Architecture**: Demonstrates proper tool enhancement within existing framework

**Technical Implementation**:
- **Line Algorithm**: Bresenham's line algorithm for pixel-perfect ASCII grid lines
- **State Management**: Tool-specific state that auto-clears when switching tools
- **User Experience**: First click sets start point, shift+subsequent clicks draw lines to new endpoints
- **Integration**: Leverages existing shift key detection from CanvasContext

**Lessons Learned**:
- Tool-specific state can be efficiently managed in Zustand store
- Bresenham algorithm translates well to ASCII grid coordinates
- Existing architecture patterns accommodate feature enhancements seamlessly
- Clear status messages significantly improve discoverability of features

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

---

**Current Architecture Status** (Updated September 3, 2025):
- ✅ Canvas state management extracted to Context (Step 1) - COMPLETE
- ✅ Mouse interaction logic extracted to Hooks (Step 2) - COMPLETE 
- ✅ Rendering split to dedicated components (Step 3) - COMPLETE
- ✅ Tool-specific components created (Step 4) - COMPLETE
- ✅ Performance optimizations implemented (Step 5) - COMPLETE  
- ✅ Final canvas composition achieved (Step 6) - COMPLETE

**Phase 1.5 Refactoring**: ✅ **FULLY COMPLETE**
- CanvasGrid reduced from 501 lines → 111 lines (~78% reduction)
- Created 15+ focused components and hooks
- Achieved full separation of concerns
- Performance optimized for large grids
- Ready for Phase 2 development



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
- ✅ Created `src/components/features/ToolManager.tsx` (34 lines) - Renders active tool component
- ✅ Created `src/components/features/ToolStatusManager.tsx` (34 lines) - Renders tool status UI
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

#### **Step 5: Performance Optimizations** 🚀 **COMPLETE**

**All performance optimization tasks completed successfully. Ready for Phase 2.**

#### **Step 6: Final Canvas Composition** ✅ **COMPLETE**

**Canvas architecture fully refactored and optimized. System ready for timeline and animation features.**

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

## 🔧 Tool Architecture Guide

When adding new tools, follow this classification:

**Simple Tools (use `useDrawingTool`):**
- Single-click operations (pencil, eraser, paint bucket, eyedropper)
- No state persistence between interactions
- Direct cell modification or sampling

**Interactive Tools (use `useCanvasDragAndDrop`):**
- Drag-based operations (rectangle, future line/circle tools)
- Preview during interaction
- Start→end coordinate logic

**Complex Tools (create dedicated hook):**
- Multi-state workflows (selection: select→move→resize)
- Complex state management and coordinate tracking
- Custom interaction patterns (animation tools, text editing)

See `COPILOT_INSTRUCTIONS.md` for detailed implementation steps.

### 🚧 Implementation Strategy

1. **Incremental Refactoring**: Extract one piece at a time to avoid breaking changes
2. **Feature Parity**: Ensure all current functionality works after each step
3. **Testing**: Add tests as we extract components
4. **Documentation**: Update this plan as we complete tasks

### 📅 Timeline Status

- **Phase 1**: ✅ COMPLETE (Core editor with all tools)
- **Phase 1.5**: ✅ COMPLETE (Architecture refactoring - 6 steps completed)
- **Phase 1.6**: 🎯 **NEXT** (Enhanced art creation tools and UX improvements)
- **Phase 2**: ⏳ Future (Animation system)
- **Phase 3**: ⏳ Future (Export system)

---

## 🎯 **STEP 3 PREPARATION - Session Handover Notes**

### **Current Files Ready for Extraction**
**File**: `src/components/features/CanvasGrid.tsx` (245 lines)

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
src/components/common/
  CellRenderer.tsx            (105 lines - Memoized cell rendering)
  PerformanceMonitor.tsx      (152 lines - Dev performance testing UI)
  ThemeToggle.tsx             (existing - theme switching)

src/components/features/
  CanvasGrid.tsx              (111 lines - Pure composition component)
  CanvasRenderer.tsx          (124 lines - Dedicated rendering logic)
  CanvasOverlay.tsx           (78 lines - Selection/interaction overlays)
  ToolManager.tsx             (34 lines - Active tool component renderer)  
  ToolStatusManager.tsx       (34 lines - Tool status UI renderer)

src/components/tools/
  SelectionTool.tsx           (53 lines - Selection behavior & status)
  DrawingTool.tsx             (42 lines - Pencil/eraser behavior & status)
  EllipseTool.tsx             (31 lines - Ellipse drawing behavior & status)
  PaintBucketTool.tsx         (30 lines - Fill tool behavior & status)
  RectangleTool.tsx           (30 lines - Rectangle behavior & status)
  EyedropperTool.tsx          (26 lines - Eyedropper behavior & status)
  index.ts                    (11 lines - Tool exports)

src/contexts/
  CanvasContext.tsx           (Enhanced - Canvas-specific state with shift key handling)

src/hooks/
  useCanvasState.ts           (138 lines - State management & helpers)
  useCanvasMouseHandlers.ts   (123 lines - Mouse event routing)
  useCanvasSelection.ts       (185 lines - Selection tool logic)
  useCanvasDragAndDrop.ts     (Enhanced - Drawing/rectangle/ellipse tools with aspect ratio constraints)
  useCanvasRenderer.ts        (159 lines - Grid & overlay rendering)
  useToolBehavior.ts          (109 lines - Tool coordination & metadata)
  useDrawingTool.ts           (97 lines - Tool implementations)
  useMemoizedGrid.ts          (164 lines - Grid-level performance optimization)
  useKeyboardShortcuts.ts     (existing - keyboard handling)

src/utils/
  performance.ts              (257 lines - Performance measurement utilities)
```

**Architecture Achievement**: Successfully transformed a 501-line monolithic component into a modular, performant system with 20+ focused components and hooks.

---

## 🔄 **Phase 1.5 COMPLETE - Ready for Phase 2**

### **🎯 What's Been Accomplished**

**Complete Architecture Refactoring**: The entire Phase 1.5 refactoring plan has been successfully completed:
- ✅ All 6 steps executed (Context extraction → Performance optimization → Final composition)
- ✅ CanvasGrid reduced from 501 lines to 111 lines (~78% reduction)
- ✅ 20+ focused components and hooks created
- ✅ Performance optimized for large grids (200x100+ support)
- ✅ Clean separation of concerns achieved
- ✅ Tool system fully modularized

### **� Next Development Focus**

**Phase 2: Animation System** - Now ready to begin:
- Timeline component and frame management
- Animation playback controls
- Frame thumbnails and navigation
- Export system implementation

**Benefits of Completed Refactoring**:
- 🎯 **Timeline Integration**: Canvas composition makes frame switching easier
- 🎯 **Performance**: Optimizations support animation without lag
- 🎯 **Maintainability**: Adding animation features won't create "god components"
- 🎯 **Tool Extension**: New animation tools follow established patterns

## Next Steps

1. **Phase 2: Animation System** - Ready to begin
   - Timeline UI: Create the frame timeline with thumbnails  
   - Animation Playback: Implement frame switching and playback controls
   - Frame Management: Add/delete/duplicate frames
   - Onion Skinning: Show previous/next frames for animation reference

2. **Phase 3: Export Functions** - Future development
   - Text export capabilities
   - JSON project file format
   - GIF generation for animations
   - MP4 export for video output

## Contributing

Follow the component structure and Copilot instructions in `COPILOT_INSTRUCTIONS.md` for consistent code organization.
