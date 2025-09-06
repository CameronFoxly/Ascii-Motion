# ASCII Motion - Developm```
src/
├── components/
│   ├── common/         # Shared/reusable components (CellRenderer, PerformanceMonitor, ThemeToggle)
│   ├── features/       # Complex components (CanvasGrid, CanvasRenderer, CanvasOverlay, CanvasWithShortcuts, ToolPalette, CharacterPalette, ColorPicker)
│   ├── tools/          # Tool-specific components (SelectionTool, DrawingTool, LassoTool, TextTool, RectangleTool, EllipseTool, PaintBucketTool, EyedropperTool)
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
│   ├── tools/          # Tool-specific components (SelectionTool, DrawingTool, LassoTool, TextTool, RectangleTool, EllipseTool, PaintBucketTool, EyedropperTool)
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

## Development Guidelines

### **🚨 MANDATORY: New Tool Requirements**
When adding ANY new drawing tool to ASCII Motion, you MUST follow these requirements:

#### **1. Tool Hotkey Assignment (NON-NEGOTIABLE)**
- **Every new tool must have a hotkey** assigned in `src/constants/hotkeys.ts`
- **Choose intuitive keys**: First letter of tool name preferred (B for Brush, S for Spray)
- **Avoid conflicts**: Check existing TOOL_HOTKEYS array and common shortcuts (C, V, Z, X)
- **Single character only**: Use lowercase letters, no modifiers (Shift/Cmd/Ctrl)

```typescript
// Example for new brush tool:
{ tool: 'brush', key: 'b', displayName: 'B', description: 'Brush tool hotkey' }
```

#### **2. Follow 9-Step Tool Creation Pattern**
All new tools must follow the established 9-step pattern documented in COPILOT_INSTRUCTIONS.md:
1. Update Tool type definition
2. Create tool component  
3. Export tool component
4. Update useToolBehavior
5. Update ToolManager
6. Update ToolStatusManager
7. Implement tool logic
8. Update tool store (if needed)
9. **Add tool hotkey (MANDATORY)**

#### **3. Architecture Consistency**
- **Use existing hooks** when possible (`useDrawingTool`, `useCanvasDragAndDrop`)
- **Create dedicated hooks** only for complex multi-state tools
- **Follow shadcn styling** guidelines for UI components
- **Include status messages** for user feedback

#### **Benefits of Following Guidelines:**
- ✅ Automatic hotkey integration and tooltip enhancement
- ✅ Text input protection for your hotkey
- ✅ Professional tool behavior matching industry standards
- ✅ Consistent architectural patterns
- ✅ Easy maintenance and future updates

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
- [x] Keyboard shortcuts (Cmd/Ctrl+C, Cmd/Ctrl+V, Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z, Space for hand tool with text tool protection)

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

1. **Phase 1.6: Enhanced Art Creation Tools** - ✅ **COMPLETE** (Sept 6, 2025)
   - ✅ **Advanced Selection Tools**: Lasso selection, magic wand with contiguous/non-contiguous modes
   - ✅ **Text Input System**: Type tool with cursor rendering and keyboard shortcut protection
   - ✅ **Enhanced Fill Tool**: Paint bucket with contiguous/non-contiguous toggle
   - ✅ **Universal Tool Hotkeys**: Complete hotkey system for all tools with centralized configuration (Sept 5, 2025)
   - ✅ **Typography System**: Monospace aspect ratio (~0.6) with character/line spacing controls (Sept 6, 2025)
   - ✅ **UI Layout Optimization**: Reorganized interface for typography controls and action buttons (Sept 6, 2025)
   - ✅ **Font Zoom Integration**: Proper font scaling with zoom levels
   - ✅ **Rectangular Cell System**: All tools updated for non-square character dimensions

2. **Phase 2: Animation System** - 🎯 **NEXT**
   - Timeline UI: Create the frame timeline with thumbnails  
   - Animation Playback: Implement frame switching and playback controls
   - Frame Management: Add/delete/duplicate frames
   - Onion Skinning: Show previous/next frames for animation reference

3. **Phase 3: Export Functions** - Final development
   - Text export capabilities
   - JSON project file format
   - GIF generation for animations
   - MP4 export for video output

### **🎯 ENHANCEMENT COMPLETED: Lasso Selection Tool (Sept 5, 2025)**
✅ **Status**: COMPLETE - Full implementation with move functionality and proper tool switching
✅ **Files Created/Modified:**
- `src/types/index.ts` (ENHANCED) - Added 'lasso' tool type and LassoSelection interface
- `src/stores/toolStore.ts` (ENHANCED) - Added lasso selection state and actions (separate from rectangular selection)
- `src/utils/polygon.ts` (NEW) - Point-in-polygon algorithms and polygon utility functions (150 lines)
- `src/hooks/useCanvasLassoSelection.ts` (NEW) - Dedicated lasso selection hook with complex multi-state behavior (268 lines)
- `src/components/tools/LassoTool.tsx` (NEW) - Lasso tool component and status (45 lines)
- `src/components/tools/index.ts` (ENHANCED) - Added LassoTool exports and types
- `src/hooks/useToolBehavior.ts` (ENHANCED) - Added lasso tool routing and metadata
- `src/components/features/ToolManager.tsx` (ENHANCED) - Added lasso tool component routing
- `src/components/features/ToolStatusManager.tsx` (ENHANCED) - Added lasso tool status routing
- `src/hooks/useCanvasMouseHandlers.ts` (ENHANCED) - Integrated lasso tool mouse handling
- `src/hooks/useKeyboardShortcuts.ts` (ENHANCED) - Extended copy/paste to support lasso selections
- `src/components/features/ToolPalette.tsx` (ENHANCED) - Added lasso tool button with Lasso icon
- `src/hooks/useCanvasRenderer.ts` (ENHANCED) - Added complete lasso selection rendering (path drawing, cell highlighting, move preview)
- `src/components/features/CanvasGrid.tsx` (FIXED) - Fixed tool switching cleanup to prevent move state corruption

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
- **Tool Switching Fix**: Properly handles move state cleanup when switching between tools

✅ **Technical Architecture:**
- **Dedicated Hook Pattern**: `useCanvasLassoSelection` for complex multi-state tool behavior
- **Complete State Separation**: Lasso selection state completely separate from rectangular selection
- **Consistent Naming Convention**: All functions/variables prefixed with "Lasso" to prevent confusion
- **Advanced Algorithms**: Point-in-polygon detection, polygon smoothing, cell intersection testing
- **Performance Optimized**: Efficient polygon algorithms with bounding box optimization
- **Visual Rendering**: Real-time path drawing, cell highlighting, move mode preview with proper offsets
- **Tool Switching Safety**: useEffect patterns that prevent state corruption and infinite loops

✅ **User Experience:**
- **Professional Feel**: Matches behavior of advanced graphics editors
- **Visual Clarity**: Purple path and highlight colors distinguish from rectangular selection
- **Responsive Feedback**: Real-time visual feedback during drawing and moving
- **Error Prevention**: Minimum 3 points required for valid lasso selection
- **Intuitive Controls**: Natural click-drag-release workflow
- **Seamless Tool Switching**: No visual artifacts or state corruption when switching tools

✅ **Critical Bug Fixes Discovered and Resolved:**
- **useEffect Dependency Issue**: Fixed infinite commit loops by properly managing dependency arrays
- **Tool Switching State Corruption**: Added proper cleanup logic for move states when switching tools
- **React Passive Effects Race Condition**: Identified and fixed immediate commits caused by useEffect timing

### **🎯 ENHANCEMENT COMPLETED: Text Tool (Sept 5, 2025)**
✅ **Status**: COMPLETE - Full text input functionality with keyboard shortcut protection and visual cursor
✅ **Files Created/Modified:**
- `src/types/index.ts` (ENHANCED) - Added 'text' tool type and TextToolState interface
- `src/stores/toolStore.ts` (ENHANCED) - Added text tool state and actions (startTyping, stopTyping, etc.)
- `src/hooks/useTextTool.ts` (NEW) - Dedicated text tool hook with comprehensive text input logic (280+ lines)
- `src/components/tools/TextTool.tsx` (NEW) - Text tool component with global keyboard listener (65 lines)
- `src/components/tools/index.ts` (ENHANCED) - Added TextTool exports and types
- `src/hooks/useToolBehavior.ts` (ENHANCED) - Added text tool routing and metadata
- `src/components/features/ToolManager.tsx` (ENHANCED) - Added text tool component routing
- `src/components/features/ToolStatusManager.tsx` (ENHANCED) - Added text tool status routing
- `src/hooks/useCanvasMouseHandlers.ts` (ENHANCED) - Integrated text tool click handling
- `src/hooks/useCanvasRenderer.ts` (ENHANCED) - Added purple blinking cursor rendering
- `src/components/features/ToolPalette.tsx` (ENHANCED) - Added text tool button with Type icon
- `src/components/features/CanvasGrid.tsx` (ENHANCED) - Protected space key from hand tool when typing
- `src/hooks/useKeyboardShortcuts.ts` (ENHANCED) - Protected all non-modifier keys when typing

✅ **Features Implemented:**
- **Click to Position**: Click anywhere on canvas to start typing at that location
- **Live Text Input**: Characters appear immediately as you type with real-time visual feedback
- **Blinking Purple Cursor**: Visual cursor that blinks every 500ms when typing is active
- **Arrow Key Navigation**: Move cursor around with arrow keys within canvas boundaries
- **Word-based Undo**: Undo operations work on whole words, not individual characters
- **Boundary Constraints**: Cursor and text are constrained within canvas boundaries
- **Tool Persistence**: Text tool stays active until manually switched to another tool
- **Paste Support**: Clipboard paste works with word-based undo batching
- **Keyboard Shortcut Protection**: Space key and all single-key shortcuts disabled during typing
- **Modifier Key Pass-through**: Ctrl+Z, Cmd+C, etc. still work while typing

✅ **Technical Architecture:**
- **Dedicated Hook Pattern**: `useTextTool` for complex text input behavior (280+ lines)
- **Complete State Management**: TextToolState with isTyping, cursorPosition, textBuffer, and cursorVisible
- **Word Boundary Detection**: Smart word detection using comprehensive character set
- **Cursor Blink Animation**: setInterval-based blink with proper cleanup
- **Global Keyboard Listener**: Document-level keyboard handling for seamless text input
- **Keyboard Conflict Resolution**: Intelligent hotkey protection during active typing
- **Visual Cursor Integration**: Purple cursor rendering in useCanvasRenderer matching selection theme
- **Boundary Validation**: Smart cursor positioning that respects canvas dimensions

✅ **User Experience:**
- **Professional Text Editor Feel**: Immediate text input with visual cursor feedback
- **Predictable Behavior**: Word-based undo matching user expectations
- **Visual Consistency**: Purple cursor matches other selection tool highlighting
- **Conflict-free Operation**: No interference with space bar or future tool hotkeys
- **Seamless Integration**: Works naturally with existing copy/paste and undo systems
- **Intuitive Workflow**: Click to place cursor, type to add text, arrow keys to navigate

✅ **Future-Ready Design:**
- **Hotkey Infrastructure**: Foundation established for single-key tool shortcuts
- **Extensible Pattern**: Text tool follows established 8-step tool creation pattern
- **Modifier Key Preservation**: Essential shortcuts remain available during text input

### **🎯 ENHANCEMENT COMPLETED: Magic Wand Selection Tool (Sept 5, 2025)**
✅ **Status**: COMPLETE - Full implementation with contiguous/non-contiguous modes and move functionality
✅ **Files Created/Modified:**
- `src/types/index.ts` (ENHANCED) - Added 'magicwand' tool type and MagicWandSelection interface
- `src/stores/toolStore.ts` (ENHANCED) - Added magic wand selection state and actions with contiguous toggle
- `src/hooks/useCanvasMagicWandSelection.ts` (NEW) - Dedicated magic wand selection hook with flood fill and scan algorithms (295+ lines)
- `src/components/tools/MagicWandTool.tsx` (NEW) - Magic wand tool component and status (50 lines)
- `src/components/tools/index.ts` (ENHANCED) - Added MagicWandTool exports and types
- `src/hooks/useToolBehavior.ts` (ENHANCED) - Added magic wand tool routing and metadata
- `src/components/features/ToolManager.tsx` (ENHANCED) - Added magic wand tool component routing
- `src/components/features/ToolStatusManager.tsx` (ENHANCED) - Added magic wand tool status routing
- `src/hooks/useCanvasMouseHandlers.ts` (ENHANCED) - Integrated magic wand tool mouse handling
- `src/hooks/useKeyboardShortcuts.ts` (ENHANCED) - Extended copy/paste to support magic wand selections
- `src/components/features/ToolPalette.tsx` (ENHANCED) - Added magic wand tool button with Wand2 icon and contiguous toggle
- `src/hooks/useCanvasRenderer.ts` (ENHANCED) - Added magic wand selection rendering with orange highlighting

✅ **Features Implemented:**
- **Exact Match Selection**: Selects cells with identical character, color, and background color
- **Contiguous/Non-contiguous Modes**: Toggle between connected areas only (flood fill) or all matching cells (full scan)
- **Empty Cell Handling**: Ignores all empty cells (cells with no character or whitespace)
- **Single-click Selection**: Click to select all matching cells instantly
- **Complete Selection Workflow**: Selection → Move mode → Commit/Cancel (same as other selection tools)
- **Copy/Paste Integration**: Cmd/Ctrl+C and Cmd/Ctrl+V work with magic wand selections
- **Triple Clipboard System**: Separate clipboards for rectangular, lasso, and magic wand selections
- **Move Mode with Preview**: Click inside magic wand selection to move content with real-time preview
- **Keyboard Shortcuts**: Escape to cancel, consistent with existing patterns
- **Tool Preference Toggle**: UI toggle for contiguous/non-contiguous mode (like rectangle filled/hollow)

✅ **Technical Architecture:**
- **Dedicated Hook Pattern**: `useCanvasMagicWandSelection` for complex selection tool behavior
- **Flood Fill Algorithm**: Efficient contiguous selection using queue-based flood fill
- **Full Canvas Scan**: Non-contiguous mode scans entire canvas for matching cells
- **Cell Matching Logic**: Exact comparison of character, color, and background with empty cell filtering
- **Complete State Separation**: Magic wand selection state completely separate from other selection tools
- **Consistent Naming Convention**: All functions/variables prefixed with "MagicWand" to prevent confusion
- **Visual Rendering**: Orange cell highlighting and borders to distinguish from other selection tools
- **Tool Integration**: Follows established 8-step tool creation pattern perfectly

✅ **User Experience:**
- **Professional Graphics Editor Feel**: Matches behavior of industry-standard magic wand tools
- **Visual Clarity**: Orange highlighting distinguishes from purple (lasso) and blue (rectangular) selections
- **Responsive Feedback**: Instant selection feedback shows selected cell count and mode
- **Flexible Selection Modes**: Contiguous for connected areas, non-contiguous for scattered matching cells
- **Intuitive Controls**: Single-click to select, click inside to move, toggle for mode switching
- **Status Messages**: Clear feedback about selection state and available actions

✅ **Critical Bug Fixes Discovered and Resolved (Sept 5, 2025):**
- **Move State Bug**: Fixed `originalData` including all canvas cells instead of just selected cells, causing all filled cells to move together
- **Copy/Paste Integration Bug**: Fixed missing magic wand clipboard support in keyboard shortcuts and paste mode hooks
- **Keyboard Control Bug**: Fixed missing Escape (cancel) and Enter (commit) key support for magic wand move operations
- **Selection State Management Bug**: Fixed selection preview jumping back to original location after move commit by properly clearing selection state
- **Move Commit Sequence Bug**: Fixed incomplete move commit logic that left stale selection state after clicking outside moved selection

✅ **Architecture Lessons Learned:**
- **Dedicated Hook Pattern Validation**: Complex selection tools require dedicated hooks (250+ lines) to manage state properly
- **State Management Consistency**: All selection tools must follow identical move commit sequences (`commitMove() + clearSelection() + setJustCommittedMove()`)
- **Clipboard System Architecture**: Each selection type needs separate clipboard state and paste mode integration
- **Keyboard Handler Completeness**: All selection tools must be included in global keyboard event handlers for consistent UX
- **Testing Methodology**: Real-world usage testing revealed bugs not caught during initial implementation

✅ **Algorithm Implementation:**
- **Contiguous Mode**: Queue-based flood fill with 4-directional neighbor checking
- **Non-contiguous Mode**: Complete canvas scan with efficient cell matching
- **Empty Cell Detection**: Robust filtering of cells with no character, empty string, or whitespace
- **Exact Match Criteria**: Character + color + background color equality check
- **Performance Optimized**: Efficient algorithms for both small and large canvas sizes

### **🎯 ENHANCEMENT COMPLETED: Cell Hover Outline (Sept 5, 2025)**
✅ **Status**: COMPLETE - Universal hover outline for all tools except hand tool
✅ **Files Created/Modified:**
- `src/contexts/CanvasContext.tsx` (ENHANCED) - Added hoveredCell state and setHoveredCell action
- `src/hooks/useCanvasMouseHandlers.ts` (ENHANCED) - Added hover cell tracking on mouse move and clearing on mouse leave
- `src/hooks/useCanvasRenderer.ts` (ENHANCED) - Added subtle blue hover outline rendering

✅ **Features Implemented:**
- **Universal Hover Feedback**: Subtle blue outline appears on all tools except hand tool
- **Real-time Tracking**: Mouse position tracked and outline updated during mouse move
- **Proper State Management**: Hover state cleared when mouse leaves canvas or tool switches to hand
- **Performance Optimized**: Hover rendering integrated into existing canvas render cycle
- **Visual Consistency**: Blue outline matches other selection tool color themes
- **Grid Independence**: Works whether grid overlay is visible or not

### **🎯 ENHANCEMENT COMPLETED: Universal Tool Hotkey System (Sept 5, 2025)**
✅ **Status**: COMPLETE - Comprehensive hotkey system for all tools with centralized configuration
✅ **Files Created/Modified:**
- `src/constants/hotkeys.ts` (NEW) - Centralized hotkey configuration with utilities (75 lines)
- `src/constants/index.ts` (ENHANCED) - Added hotkey utility exports for easier access
- `src/components/features/ToolPalette.tsx` (ENHANCED) - Enhanced tooltips with hotkey display using `getToolTooltipText()`
- `src/hooks/useKeyboardShortcuts.ts` (ENHANCED) - Added comprehensive tool hotkey handling with text input protection

✅ **Features Implemented:**
- **Complete Tool Coverage**: Hotkeys for all 11 tools with intuitive key assignments
- **Professional Hotkey Mapping**: P=Pencil, E=Eraser, G=Fill, M=Selection, L=Lasso, W=Magic Wand, I=Eyedropper, R=Rectangle, O=Ellipse, T=Text, Space=Hand
- **Enhanced Tooltips**: All tool buttons automatically show hotkeys in tooltips (e.g., "Draw characters (P)")
- **Text Input Protection**: All single-key hotkeys automatically disabled during text tool typing
- **Modifier Key Preservation**: Cmd+C, Ctrl+Z, etc. continue working; hotkeys only trigger on unmodified key presses
- **Space Key Special Behavior**: Space key maintains existing temporary hand tool behavior (hold to pan, release to return)
- **Centralized Configuration**: All hotkey mappings in one maintainable file with lookup utilities
- **Future-Proof Architecture**: Easy to add new tools or change hotkey assignments

✅ **Technical Architecture:**
- **Centralized Configuration**: `TOOL_HOTKEYS` array with tool, key, and display name mappings
- **Efficient Lookup Maps**: `HOTKEY_TO_TOOL` and `TOOL_TO_HOTKEY` for O(1) key processing
- **Utility Functions**: `getToolForHotkey()`, `getToolTooltipText()`, and other helper functions
- **Integration Points**: Automatic integration with existing keyboard shortcut system and tool palette
- **Text Input Compatibility**: Respects existing text input protection patterns
- **Keyboard Event Processing**: Clean separation between tool hotkeys and modifier-based shortcuts

✅ **User Experience:**
- **Industry Standard**: Matches hotkey conventions from professional design tools
- **Visual Feedback**: Tooltips clearly show which key activates each tool
- **Conflict-Free Operation**: No interference with existing copy/paste, undo/redo, or space key behavior
- **Intuitive Assignments**: Keys chosen for memorability (P=Pencil, E=Eraser, etc.)
- **Consistent Behavior**: Single key press switches tools permanently (except space for temporary hand tool)
- **Error Prevention**: Tool switching disabled during text input to prevent accidental switches

✅ **Maintenance Benefits:**
- **Single Source of Truth**: Change hotkey in one place, updates everywhere automatically
- **Easy Updates**: Add new tools or modify hotkeys with minimal code changes
- **Clear Documentation**: Self-documenting configuration with descriptive names
- **Testable Architecture**: Hotkey utilities can be unit tested independently
- **IDE Support**: TypeScript interfaces provide autocompletion for tool hotkey management

✅ **MANDATORY REQUIREMENT FOR FUTURE TOOLS:**
- **All New Tools Must Have Hotkeys**: Every tool added to ASCII Motion MUST include a hotkey in the TOOL_HOTKEYS array
- **No Exceptions**: This is a core architectural requirement, not an optional enhancement
- **Automatic Benefits**: New tools automatically get enhanced tooltips, text input protection, and professional tool switching behavior
- **Development Guidelines**: See "Development Guidelines" section above for complete requirements

✅ **Features Implemented:**
- **Universal Hover Tracking**: Shows subtle outline around cell under cursor for all tools except hand tool
- **Grid Independence**: Works whether grid is visible or hidden
- **Tool-Aware Behavior**: Automatically disabled for hand tool to avoid visual clutter during panning
- **Subtle Visual Design**: Semi-transparent blue outline (rgba(59, 130, 246, 0.2)) that doesn't interfere with content
- **Performance Optimized**: Integrates seamlessly with existing mouse handling and rendering systems
- **Boundary Checking**: Only renders outline when cursor is within valid canvas bounds

✅ **Technical Architecture:**
- **Context Integration**: hoveredCell state managed in CanvasContext alongside other canvas-specific state
- **Mouse Handler Enhancement**: Real-time tracking in handleMouseMove with tool-specific logic
- **Renderer Integration**: Hover outline rendered after main content but before text cursor for proper layering
- **Clean State Management**: Hover state cleared on mouse leave and when switching to hand tool
- **Dependency Management**: hoveredCell properly included in useCanvasRenderer dependency array

✅ **User Experience:**
- **Intuitive Feedback**: Clear visual indication of which cell each tool will interact with
- **Non-Intrusive Design**: Outline subtle enough to not distract from artwork creation
- **Professional Feel**: Matches behavior expectations from graphics editing applications
- **Tool Context Awareness**: Disappears automatically when using navigation tools
- **Universal Compatibility**: Works consistently across all drawing and selection tools

✅ **Architecture Benefits:**
- **Extensible Pattern**: Hover system can be enhanced for future tools without structural changes
- **Performance Friendly**: Minimal rendering overhead with efficient state updates
- **Clean Integration**: Follows established canvas architecture patterns without introducing technical debt
- **Type Safety**: Full TypeScript integration with existing canvas and context interfaces

### **🎯 ENHANCEMENT COMPLETED: Delete Key for All Selection Tools (Sept 5, 2025)**
✅ **Status**: COMPLETE - Universal delete functionality for rectangular, lasso, and magic wand selections
✅ **Files Created/Modified:**
- `src/hooks/useKeyboardShortcuts.ts` (ENHANCED) - Added Delete/Backspace key handler for all selection types

✅ **Features Implemented:**
- **Universal Delete Support**: Delete and Backspace keys work for all three selection tools
- **Content Clearing**: Removes all cells within the selection area (rectangular) or selected cells (lasso/magic wand)
- **Selection Priority**: Follows same priority order as copy/paste (magic wand → lasso → rectangular)
- **Undo Integration**: Saves canvas state before deletion for proper undo/redo functionality
- **Auto-clear Selection**: Automatically clears selection state after deleting content for clean UX
- **Text Tool Protection**: Delete keys ignored when text tool is actively typing to prevent conflicts

✅ **Technical Implementation:**
- **Priority-based Handler**: Checks selection types in priority order (magic wand first, then lasso, then rectangular)
- **Cell Clearing Logic**: Uses Map.delete() for efficient cell removal from canvas data
- **Undo State Management**: Pushes current canvas state to history before deletion
- **Selection State Cleanup**: Calls appropriate clear function after content deletion
- **Event Prevention**: Prevents default browser behavior and stops event propagation

✅ **User Experience:**
- **Intuitive Workflow**: Standard Delete/Backspace keys work as expected across all selection tools
- **Immediate Feedback**: Selected content disappears instantly with proper visual feedback
- **Consistent Behavior**: Same delete functionality regardless of selection tool used
- **Undo Support**: Cmd/Ctrl+Z restores deleted content as expected
- **Clean State**: Selection automatically clears after deletion, ready for next operation

✅ **Architecture Benefits:**
- **Unified Implementation**: Single handler manages all selection types without code duplication
- **Future-ready**: Pattern easily extensible for any future selection tools
- **Performance Optimized**: Efficient Map operations for cell deletion
- **Type Safety**: Full TypeScript integration with existing selection interfaces

### **🎯 ENHANCEMENT COMPLETED: Paint Bucket Contiguous Toggle (Sept 5, 2025)**
✅ **Status**: COMPLETE - Enhanced fill tool with contiguous/non-contiguous mode selection
✅ **Files Created/Modified:**
- `src/types/index.ts` (ENHANCED) - Added paintBucketContiguous boolean to ToolState interface
- `src/stores/toolStore.ts` (ENHANCED) - Added paintBucketContiguous state and setPaintBucketContiguous action
- `src/stores/canvasStore.ts` (ENHANCED) - Enhanced fillArea function with contiguous parameter and dual algorithms
- `src/hooks/useDrawingTool.ts` (ENHANCED) - Updated paint bucket logic to use contiguous setting
- `src/components/tools/PaintBucketTool.tsx` (ENHANCED) - Updated status component to show current mode
- `src/components/features/ToolPalette.tsx` (ENHANCED) - Added contiguous toggle UI below paint bucket tool button

✅ **Features Implemented:**
- **Contiguous Fill Mode** (default): Original flood fill behavior - fills only connected areas with same character/color
- **Non-contiguous Fill Mode**: Scans entire canvas and fills ALL cells matching the target, regardless of connection
- **UI Toggle Integration**: Checkbox appears below paint bucket button when tool is active
- **Status Feedback**: Tool status shows "connected areas" vs "all matching cells" based on current mode
- **Consistent Pattern**: Follows same toggle pattern as rectangle filled/hollow and magic wand contiguous modes

✅ **Technical Implementation:**
- **Enhanced fillArea Algorithm**: Single function with contiguous parameter controlling fill behavior
- **Tool Store Integration**: paintBucketContiguous boolean with default true (contiguous mode)
- **Hook Integration**: useDrawingTool passes contiguous setting to fillArea function
- **UI Pattern Consistency**: Uses same Card/checkbox styling as other tool options
- **Type Safety**: Full TypeScript integration with interface updates

✅ **User Experience:**
- **Default Behavior**: Maintains existing contiguous fill as default to preserve familiarity
- **Visual Feedback**: Clear status messages indicate current fill mode and expected behavior
- **Toggle Accessibility**: Easy-to-find checkbox with descriptive label "Contiguous fill (connected areas only)"
- **Professional Feel**: Matches behavior expectations from other graphics applications

✅ **Architecture Benefits:**
- **Backwards Compatibility**: No breaking changes to existing fill functionality
- **Pattern Reusability**: Establishes clear pattern for future tool toggles
- **Performance Optimization**: Non-contiguous mode efficiently scans canvas without recursion
- **Code Maintainability**: Clean separation between contiguous and non-contiguous algorithms

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
- **Lasso Selection** ⟲ - Select freeform irregular shapes with point-in-polygon detection (Sept 5, 2025):
  - *Click & Drag*: Draw irregular selection paths
  - *Auto-close*: Selection completes on mouse release
  - *Click Inside Selection*: Move lasso content with real-time preview
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
- **Cell Hover Outline** - Subtle blue outline shows current cell for all tools except hand tool (Sept 5, 2025)
- **Real-time Rendering** - Smooth canvas updates with coordinate transformation
- **Aspect Ratio Constraints** - Shift key for perfect squares/circles in shape tools

### Phase 1.6: Enhanced Art Creation Tools
**Status**: ✅ **COMPLETE** (Sept 6, 2025) - Advanced tool set and editor experience

#### New Drawing Tools
- [x] **Text Tool** ✅ **COMPLETE** - Text input and editing directly on canvas (Sept 5, 2025)
- [x] **Lasso Selection** ✅ **COMPLETE** - Freeform selection tool for irregular shapes (Sept 5, 2025)
- [x] **Magic Wand Selection** ✅ **COMPLETE** - Select cells with matching character/color (contiguous and non-contiguous modes) (Sept 5, 2025)

#### Tool Behavior Enhancements
- [x] **Non-contiguous Fill** ✅ **COMPLETE** - Fill all matching cells regardless of connection
- [x] **Active Cell Highlight** ✅ **COMPLETE** - Hover highlight for all drawing tools (Sept 5, 2025)
- [x] **Hotkeys for All Tools** ✅ **COMPLETE** - Keyboard shortcuts for tool switching (Sept 5, 2025)

#### Typography & Character Rendering System ✅ **COMPLETE** (Sept 6, 2025)
- [x] **Monospace Aspect Ratio** - Realistic character dimensions (~0.6 width/height ratio)
- [x] **Character Spacing Controls** - User-adjustable tracking (0.5x-2.0x character width)
- [x] **Line Spacing Controls** - User-adjustable leading (0.8x-2.0x line height)
- [x] **Font Zoom Integration** - Proper font scaling with zoom levels
- [x] **Rectangular Cell System** - All tools updated for non-square character dimensions
- [x] **Typography UI Controls** - Integrated controls in canvas settings toolbar

#### UI/UX Improvements ✅ **COMPLETE** (Sept 6, 2025)
- [x] **Layout Reorganization** - Moved action buttons to prevent toolbar crowding
- [x] **Typography Control Integration** - Dedicated space for character/line spacing
- [x] **Canvas Settings Panel** - Centralized controls with typography options
- [x] **Compact Action Buttons** - Relocated copy/paste/undo/redo to canvas footer
- [x] **Enhanced Status Integration** - Tool status with action buttons in organized layout

#### Advanced Systems
- [ ] **Custom Palette System** - Move beyond ANSI 4-bit to full color support *(Future)*
- [ ] **Re-Color Brush** - Change colors without affecting characters *(Future)*
- [ ] **Pattern Brush** - Apply repeating patterns while drawing *(Future)*

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

## 🏗️ **Architectural Lessons Learned**

### **Critical Selection Tool Implementation Patterns (Sept 5, 2025)**

During lasso selection implementation, we discovered critical patterns that MUST be followed for all future selection tools to prevent state corruption and infinite loops.

#### **1. Tool Switching State Management**
**Problem**: Moving between selection tools (lasso ↔ rectangle) could corrupt move state and cause visual artifacts.

**Solution**: Proper useEffect pattern with previous tool tracking:
```typescript
// ✅ REQUIRED PATTERN for tool switching cleanup
const prevToolRef = useRef(activeTool);

useEffect(() => {
  const prevTool = prevToolRef.current;
  
  if (prevTool !== activeTool) {
    // Always commit pending moves when switching tools
    if (moveState) {
      commitMove();
    }
    
    // Only clear state when leaving selection tools entirely
    if (activeTool !== 'select' && activeTool !== 'lasso') {
      setSelectionMode('none');
      setMoveState(null);
    }
    
    prevToolRef.current = activeTool;
  }
}, [activeTool, /* other deps but carefully managed */);
```

#### **2. useEffect Dependency Array Management**
**Problem**: Including `moveState` in dependency arrays can cause infinite loops when `commitMove` is called.

**Solution**: Use refs for tracking previous values and carefully manage what triggers effects:
```typescript
// ❌ DANGEROUS: Can cause infinite loops
useEffect(() => {
  if (moveState) {
    commitMove(); // This changes moveState, triggering the effect again!
  }
}, [moveState, commitMove]);

// ✅ SAFE: Use refs and specific change detection
useEffect(() => {
  const prevTool = prevToolRef.current;
  if (prevTool !== activeTool && moveState) {
    commitMove();
  }
  prevToolRef.current = activeTool;
}, [activeTool, moveState, commitMove]);
```

#### **3. React Passive Effects and Timing**
**Problem**: React's passive effects can cause commits to happen immediately after state creation, bypassing user interaction.

**Solution**: Add debug logging to trace execution flow and identify unexpected callers:
```typescript
const commitMove = useCallback(() => {
  console.log('commitMove called from:', new Error().stack);
  // ... rest of commit logic
}, []);
```

#### **4. State Separation Between Tools**
**Problem**: Sharing state between different selection tools can cause conflicts and unexpected behavior.

**Solution**: Completely separate state systems with tool-prefixed naming:
```typescript
// ✅ CORRECT: Separate state for each tool type
const rectangularSelection = { active: false, bounds: ... };
const lassoSelection = { active: false, path: ..., selectedCells: ... };

// ✅ CORRECT: Tool-specific function naming
const isPointInLassoSelection = (x, y) => { /* lasso-specific logic */ };
const isPointInRectangleSelection = (x, y) => { /* rectangle-specific logic */ };
```

#### **5. Debugging Complex Selection Tools**
**Essential debugging patterns discovered:**
- Add execution flow logging with timestamps
- Use stack traces to identify unexpected function calls
- Test tool switching during active operations
- Verify state cleanup when switching tools
- Check for infinite re-renders in development

#### **6. Testing Checklist for Selection Tools**
Before marking any selection tool as complete:
- [ ] Tool switching during move operations (should commit cleanly)
- [ ] Switching between different selection tools (should maintain separate state)
- [ ] No infinite re-renders when state changes
- [ ] No unexpected commits during user interactions
- [ ] Visual feedback matches actual selection bounds
- [ ] Console is clean of unexpected debug output in production

These patterns are now incorporated into the codebase and should be followed for all future selection tool implementations.

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
  LassoTool.tsx               (45 lines - Lasso selection behavior & status)
  EllipseTool.tsx             (31 lines - Ellipse drawing behavior & status)
  PaintBucketTool.tsx         (30 lines - Fill tool behavior & status)
  RectangleTool.tsx           (30 lines - Rectangle behavior & status)
  EyedropperTool.tsx          (26 lines - Eyedropper behavior & status)
  TextTool.tsx                (65 lines - Text input behavior & status)
  index.ts                    (11 lines - Tool exports)

src/contexts/
  CanvasContext.tsx           (Enhanced - Canvas-specific state with shift key handling)

src/hooks/
  useCanvasState.ts           (138 lines - State management & helpers)
  useCanvasMouseHandlers.ts   (123 lines - Mouse event routing)
  useCanvasSelection.ts       (185 lines - Selection tool logic)
  useCanvasLassoSelection.ts  (268 lines - Lasso selection tool logic)
  useTextTool.ts              (280+ lines - Text input tool logic)
  useCanvasDragAndDrop.ts     (Enhanced - Drawing/rectangle/ellipse tools with aspect ratio constraints)
  useCanvasRenderer.ts        (159 lines - Grid & overlay rendering)
  useToolBehavior.ts          (109 lines - Tool coordination & metadata)
  useDrawingTool.ts           (97 lines - Tool implementations)
  useMemoizedGrid.ts          (164 lines - Grid-level performance optimization)
  useKeyboardShortcuts.ts     (existing - keyboard handling)

src/utils/
  performance.ts              (257 lines - Performance measurement utilities)
  polygon.ts                  (150 lines - Point-in-polygon algorithms and polygon utilities)
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
