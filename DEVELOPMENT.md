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

### Deployment

#### Vercel Deployment (Recommended)
This project is configured for deployment on Vercel with support for FFmpeg and media processing features.

**Initial Setup:**
1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Link your project to Vercel:
   ```bash
   vercel
   ```
   Follow the prompts to create a new project or link to an existing one.

**Deployment Commands:**
```bash
# Deploy to preview environment
npm run deploy:preview

# Deploy to production
npm run deploy

# Build and deploy with linting
npm run build:prod && npm run deploy
```

**Configuration:**
- `vercel.json`: Handles SPA routing, COOP/COEP headers for FFmpeg, and static asset serving
- `vite.config.ts`: Optimized build settings with code splitting for better performance
- FFmpeg WASM files are served with extended timeout limits for video processing

**Features Supported:**
- ✅ ASCII art creation and editing
- ✅ Animation timeline and playback  
- ✅ Image/video import with FFmpeg processing
- ✅ Export functionality (GIF, MP4, PNG, TXT, JSON)
- ✅ All drawing tools and selection modes
- ✅ Gradient fill overlay with live preview and provisional end handle
- ✅ Responsive design for various screen sizes

**Environment Variables:**
No environment variables required for basic deployment. Future auth and database features will require additional configuration.

### Automated Versioning System

#### **Overview**
ASCII Motion includes an automated versioning system that increments version numbers during deployment and maintains a complete changelog with commit history.

#### **File Structure**
```
src/constants/version.ts          # Auto-generated version data
src/components/common/VersionDisplay.tsx  # Clickable version component
scripts/version-bump.js           # Version management script
```

#### **Version Display Component**
- **Location**: Header next to "ASCII MOTION" title
- **Format**: `v0.1.23` (subtle grey monospace text)
- **Interactive**: Click to open version history modal
- **Metadata**: Shows build date, git hash, and complete changelog

#### **Version Management Script**
```javascript
// scripts/version-bump.js - Core functionality
- Parses current version from version.ts
- Increments based on type (patch/minor/major)  
- Collects git commit messages since last version
- Generates new version.ts with metadata
- Updates package.json version field
- Creates git tags automatically
```

#### **Deployment Integration**
```bash
# Standard deployment (patch increment)
npm run deploy
# → 0.1.23 becomes 0.1.24
# → Collects commits since last version
# → Builds and deploys to production

# Major feature deployment (minor increment)  
npm run deploy:major
# → 0.1.23 becomes 0.2.0
# → Resets patch to 0
# → Used for significant feature releases
```

#### **Export Metadata Integration**
All export formats automatically include version information:
```typescript
// Added to ExportDataBundle interface
metadata: {
  version: string;        // e.g. "0.1.23"
  buildDate: string;      // ISO timestamp
  buildHash: string;      // Short git hash
  exportDate: string;     // When export was created
}
```

#### **Implementation Details**
- **Version Storage**: `src/constants/version.ts` (auto-generated, do not edit manually)
- **History Tracking**: Array of version objects with commit messages
- **Git Integration**: Automatic tagging and commit message collection
- **Type Safety**: Full TypeScript integration throughout
- **Error Handling**: Graceful fallbacks for missing git data

```
src/
├── components/
│   ├── common/         # Shared/reusable components (CellRenderer, PerformanceMonitor, PerformanceOverlay, ThemeToggle)
│   ├── features/       # Complex components (CanvasGrid, CanvasRenderer, CanvasOverlay, CanvasWithShortcuts, ToolPalette, CharacterPalette, ColorPicker)
│   ├── tools/          # Tool-specific components (SelectionTool, DrawingTool, LassoTool, TextTool, RectangleTool, EllipseTool, PaintBucketTool, EyedropperTool)
│   └── ui/             # Shadcn UI components
├── stores/             # Zustand state management
│   ├── canvasStore.ts  # Canvas data and operations
│   ├── animationStore.ts # Animation timeline and frames
│   └── toolStore.ts    # Active tools and settings
├── types/              # TypeScript type definitions
├── hooks/              # Custom React hooks
│   ├── useCanvasRenderer.ts    # Optimized canvas rendering with batching
│   ├── useOptimizedRender.ts   # Performance-optimized render scheduling
│   └── ...
├── utils/              # Utility functions
│   ├── performance.ts          # Performance monitoring and metrics
│   ├── renderScheduler.ts      # 60fps render batching system
│   ├── dirtyTracker.ts         # Dirty region tracking for optimizations
│   ├── canvasTextRendering.ts  # High-DPI text rendering utilities
│   └── ...
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

### **🚨 MANDATORY: Tooltip Best Practices**
When implementing tooltips in ASCII Motion, follow these guidelines to maintain consistent purple Radix UI tooltips throughout the application:

#### **1. Always Use Radix Tooltips (Never HTML title attributes)**
```tsx
// ❌ INCORRECT - HTML title attribute creates dark grey browser tooltip
<Button title="My tooltip">Click me</Button>

// ✅ CORRECT - Radix tooltip with purple styling
<Tooltip>
  <TooltipTrigger asChild>
    <Button>Click me</Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>My tooltip</p>
  </TooltipContent>
</Tooltip>
```

#### **2. TooltipProvider Placement**
```tsx
// ❌ INCORRECT - Multiple providers in loops hurt performance
{items.map(item => (
  <TooltipProvider key={item.id}>
    <Tooltip>...</Tooltip>
  </TooltipProvider>
))}

// ✅ CORRECT - Single provider wraps the entire collection
<TooltipProvider>
  {items.map(item => (
    <Tooltip key={item.id}>...</Tooltip>
  ))}
</TooltipProvider>
```

#### **3. Import Requirements**
```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
```

#### **4. Common Patterns**

**Button with tooltip:**
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="outline" size="sm">
      <Icon className="w-3 h-3" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>Action description</p>
  </TooltipContent>
</Tooltip>
```

**Interactive element with tooltip:**
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <div className="cursor-pointer" onClick={handleClick}>
      Content
    </div>
  </TooltipTrigger>
  <TooltipContent>
    <p>Click to perform action</p>
  </TooltipContent>
</Tooltip>
```

**Dynamic tooltip content:**
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button>{isActive ? "Unlink" : "Link"}</Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>{isActive ? "Unlink aspect ratio" : "Maintain aspect ratio"}</p>
  </TooltipContent>
</Tooltip>
```

#### **5. Accessibility Considerations**
- Use `aria-label` on interactive elements for screen readers (independent of tooltips)
- Keep tooltip text concise and descriptive
- Avoid duplicating `aria-label` and tooltip content unnecessarily

#### **Benefits of Following Tooltip Guidelines:**
- ✅ Consistent purple Radix UI styling throughout application
- ✅ No dual tooltip conflicts (HTML + Radix)
- ✅ Better performance with proper TooltipProvider placement
- ✅ Professional user experience matching design system
- ✅ Accessibility support with proper ARIA attributes

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

#### **🚨 CRITICAL: Drawing Tool Development Patterns**
When modifying drawing tools or mouse handlers, follow these architectural principles to prevent breaking shift+click and other discrete drawing behaviors:

**State Management Rules:**
- **Pencil position persists** across mouse up events for shift+click functionality
- **Reset position only** when switching away from pencil tool
- **Tool-specific cleanup** in mouse handlers (not blanket resets)

**Behavioral Separation:**
- **Gap-filling logic** → Only in mouse move handlers during drag operations
- **Shift+click logic** → Only in mouse down handlers with shift detection  
- **Never mix** these two drawing behaviors in the same handler

**Critical Files & Responsibilities:**
- `useCanvasDragAndDrop.ts` → Mouse move gap-filling during drag
- `useDrawingTool.ts` → Shift+click line drawing between points
- `useCanvasMouseHandlers.ts` → Tool-specific state cleanup
- `toolStore.ts` → Pencil position persistence and tool switching

**Testing Requirements for Drawing Changes:**
- [ ] Normal single clicks place individual points
- [ ] Drag drawing creates smooth lines without gaps
- [ ] Shift+click draws lines between discrete points
- [ ] Tool switching doesn't create unwanted connections
- [ ] Canvas leave/enter doesn't break drawing state

**⚠️ Common Mistakes That Break Drawing:**
- Adding gap-filling to mouse down events
- Resetting pencil position on every mouse up
- Using isFirstStroke for both continuous and discrete drawing
- Mixing drag behavior with click behavior in same handler

#### **Benefits of Following Guidelines:**
- ✅ Automatic hotkey integration and tooltip enhancement
- ✅ Text input protection for your hotkey
- ✅ Professional tool behavior matching industry standards
- ✅ Consistent architectural patterns
- ✅ Easy maintenance and future updates
- ✅ **Reliable drawing functionality** that doesn't break with future changes

### **🚨 MANDATORY: Dropdown Menu Best Practices**
When implementing dropdown menus or overlays in ASCII Motion, follow these patterns to prevent layering issues:

#### **1. Use React Portals for Complex Dropdowns**
```typescript
import { createPortal } from 'react-dom';

// Dropdown with portal rendering
{showDropdown && createPortal(
  <div 
    className="fixed z-[99999] p-3 bg-popover border border-border rounded-md shadow-lg"
    style={{ top: `${position.top}px`, left: `${position.left}px` }}
    onMouseDown={(e) => e.stopPropagation()}
    onClick={(e) => e.stopPropagation()}
  >
    {/* Dropdown content */}
  </div>,
  document.body
)}
```

#### **2. Z-Index Hierarchy**
- **Canvas layers**: `z-10` to `z-40`
- **UI overlays**: `z-50` to `z-[999]` 
- **Dropdown menus**: `z-[99999]` (using portals)
- **Modals/dialogs**: `z-[100000]+`

#### **3. Click-Outside Detection**
```typescript
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Node;
    
    if (showDropdown && 
        buttonRef.current && 
        !buttonRef.current.contains(target)) {
      // Check if click is not on the portal dropdown
      const dropdown = document.getElementById('dropdown-id');
      if (!dropdown || !dropdown.contains(target)) {
        setShowDropdown(false);
      }
    }
  };

  if (showDropdown) {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }
}, [showDropdown]);
```

#### **4. Dynamic Positioning**
```typescript
const calculatePosition = (buttonRef: HTMLElement | null) => {
  if (!buttonRef) return { top: 0, left: 0 };
  
  const rect = buttonRef.getBoundingClientRect();
  return {
    top: rect.bottom + 4, // 4px gap
    left: rect.left,
    width: Math.max(200, rect.width)
  };
};
```

#### **Benefits of Following Dropdown Guidelines:**
- ✅ Dropdowns appear above canvas and other content
- ✅ Proper interaction without unexpected closures
- ✅ Consistent positioning and behavior
- ✅ Accessible keyboard and mouse navigation
- ✅ No z-index conflicts or layering issues

### **🚨 MANDATORY: Tool Palette Organization Guidelines**
When adding new tools to ASCII Motion, they must be categorized properly in the ToolPalette component to maintain a logical and organized UI.

#### **1. Tool Category Definitions**
Tools are organized into three logical categories in `src/components/features/ToolPalette.tsx`:

**DRAWING_TOOLS** - Tools that create or modify content:
- `pencil` - Freehand drawing
- `eraser` - Remove characters
- `paintbucket` - Fill connected areas
- `rectangle` - Draw rectangular shapes
- `ellipse` - Draw circular/oval shapes
- `text` - Type text directly

**SELECTION_TOOLS** - Tools for selecting and manipulating existing content:
- `select` - Rectangular area selection
- `lasso` - Freeform area selection
- `magicwand` - Select matching content

**UTILITY_TOOLS** - Special purpose tools that don't fit drawing/selection:
- `eyedropper` - Pick character/color from canvas
- `hand` - Pan and navigate canvas view

#### **2. Adding New Tools - Category Assignment Rules**

**For Drawing Tools:**
- Creates new content on canvas
- Modifies existing characters/colors
- Examples: brush, spray, line, shapes, patterns

**For Selection Tools:**
- Selects areas or content for manipulation
- Used for copy/paste operations
- Examples: polygonal select, color range select, similar content select

**For Utility Tools:**
- Special navigation or information tools
- Doesn't directly modify canvas content
- Examples: zoom, measure, grid toggle, eyedropper

#### **3. Implementation Requirements**

When adding a new tool, update the appropriate array in `ToolPalette.tsx`:

```typescript
// Example: Adding a new brush tool (DRAWING category)
const DRAWING_TOOLS: Array<{ id: Tool; name: string; icon: React.ReactNode; description: string }> = [
  // ... existing tools
  { id: 'brush', name: 'Brush', icon: <Brush className="w-3 h-3" />, description: 'Brush with adjustable size' },
];

// Example: Adding a new color select tool (SELECTION category)  
const SELECTION_TOOLS: Array<{ id: Tool; name: string; icon: React.ReactNode; description: string }> = [
  // ... existing tools
  { id: 'colorselect', name: 'Color Select', icon: <Palette className="w-3 h-3" />, description: 'Select by color' },
];
```

#### **4. UI Layout Behavior**
- **Flexible Wrapping**: Tools use `flex flex-wrap gap-1` for optimal space usage
- **Compact Panel**: Panel width is optimized to fit ~4 tools per row (176px width)
- **Section Headers**: Each category has a descriptive header ("Drawing", "Selection", "Utility")
- **Consistent Styling**: All tools use 32x32px buttons with 3x3px icons

#### **Benefits of Following Tool Organization:**
- ✅ Logical grouping makes tools easy to find
- ✅ Consistent visual hierarchy across tool types
- ✅ Efficient use of limited panel space
- ✅ Scalable organization as new tools are added
- ✅ Professional user experience matching industry standards

### **🚨 MANDATORY: File Organization Standards**
ASCII Motion maintains a clean, professional repository structure that supports both human developers and AI coding assistants. All files must be placed in their designated directories.

#### **1. Directory Usage Rules**

**Root Directory** - Reserved for essential project files only:
- ✅ `package.json`, `README.md`, `LICENSE` - Project metadata
- ✅ Config files: `vite.config.ts`, `tsconfig.json`, `tailwind.config.js` - Build configuration  
- ✅ `index.html`, `vercel.json` - Deployment essentials
- ❌ Implementation docs, guides, plans, test files, experiments

**docs/ Directory** - All implementation and planning documentation:
- ✅ Implementation guides: `GRADIENT_FILL_IMPLEMENTATION.md`, `ONION_SKINNING_GUIDE.md`
- ✅ Planning documents: `PHASE_4_ADVANCED_TOOLS_PLAN.md`, `PRD.md`
- ✅ Performance docs: `PERFORMANCE_OPTIMIZATION.md`, `CANVAS_RENDERING_IMPROVEMENTS.md`
- ✅ Testing guides: `RESPONSIVE_TESTING_CHECKLIST.md`, `PASTE_FUNCTIONALITY_TEST.md`
- ✅ Navigation: `docs/README.md` with categorized links

**dev-tools/ Directory** - Development utilities and test scripts:
- ✅ Test scripts: `test-video-export.js`, `test-frame-timing.js`, `clipboard-test.js`
- ✅ Debug utilities: `debug-video-export.js`, font-test files
- ✅ Development experiments and temporary test files
- ✅ Documentation: `dev-tools/README.md` explaining each tool

**src/ Directory** - Production application code only:
- ✅ Components, hooks, stores, types, utils
- ❌ Documentation files, test scripts, experiments

#### **2. File Creation Guidelines**

**Creating Implementation Documentation:**
```bash
# ✅ CORRECT - Place in docs/ directory
touch docs/NEW_FEATURE_IMPLEMENTATION.md
touch docs/PERFORMANCE_ANALYSIS.md
touch docs/USER_TESTING_RESULTS.md

# ❌ INCORRECT - Never place in root
touch NEW_FEATURE_IMPLEMENTATION.md  # Creates root clutter
```

**Creating Test Files:**
```bash
# ✅ CORRECT - Place in dev-tools/ directory  
touch dev-tools/test-new-feature.js
touch dev-tools/debug-performance.js
touch dev-tools/experiment-ui-layout.html

# ❌ INCORRECT - Never place in root
touch test-new-feature.js  # Creates root clutter
```

**Creating Source Code:**
```bash
# ✅ CORRECT - Place in appropriate src/ subdirectory
touch src/components/ui/NewComponent.tsx
touch src/hooks/useNewFeature.ts
touch src/stores/newStore.ts

# ❌ INCORRECT - Never place docs in src/
touch src/IMPLEMENTATION_GUIDE.md  # Wrong directory
```

#### **3. Maintenance Procedures**

**Before Committing - Root Directory Checklist:**
- [ ] No `.md` files except `README.md` and `LICENSE`
- [ ] No test files (`test-*.js`, `*-test.js`, `debug-*.js`)
- [ ] No temporary files (`.backup`, `.tmp`, experimental HTML)
- [ ] Only essential config and deployment files

**Directory Health Check Commands:**
```bash
# Check for documentation files in root (should return empty)
find . -maxdepth 1 -name "*.md" -not -name "README.md" -not -name "LICENSE"

# Check for test files in root (should return empty)
find . -maxdepth 1 -name "*test*.js" -o -name "debug-*.js" -o -name "*-test.*"

# Verify docs organization
ls docs/ | wc -l  # Should show organized documentation count

# Verify dev-tools organization  
ls dev-tools/ | wc -l  # Should show organized test utilities count
```

**Benefits of Following File Organization:**
- ✅ Professional repository appearance for stakeholders
- ✅ Clear separation between production code and development utilities
- ✅ Improved discoverability through organized documentation
- ✅ Supports both human developers and AI coding assistants
- ✅ Maintains clean git history and meaningful file structure
- ✅ Scalable organization as project grows

## Development Phases

### Phase 1: Core Editor ✅ **COMPLETE**
- [x] Project scaffolding
- [x] Basic stores (canvas, animation, tools)
- [x] Type definitions and constants
- [x] Canvas grid component
- [x] Basic drawing tools (pencil, eraser, paint bucket, select, eyedropper, rectangle, ellipse)
- [x] **Gradient Fill Tool** ✅ **COMPLETE** - Advanced gradient system with interactive controls (Sept 2025)
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
- [x] Keyboard shortcuts (Cmd/Ctrl+C, Cmd/Ctrl+V, Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z, Cmd/Ctrl+A, Alt for temporary eyedropper)
- [x] **Arrow Key Selection Movement** ✅ **COMPLETE** - All selection tools support arrow key movement for precise positioning (Sept 10, 2025)
- [x] **Select All Feature** ✅ **COMPLETE** - Cmd/Ctrl+A activates selection tool and selects entire canvas (Sept 10, 2025)

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

## ✅ **Phase 2.1: Enhanced Animation Timeline with Undo/Redo** - ✅ **COMPLETED** (Sept 8, 2025)

### **🎯 Animation Timeline Actions Now Support Undo/Redo**

**Major Enhancement**: All animation timeline operations are now fully integrated with the undo/redo system:

#### **✅ Implemented Features:**
- **Add Frame**: Creates new frames with automatic history recording
- **Duplicate Frame**: Copies frames with full state preservation and undo support
- **Delete Frame**: Removes frames with restoration capability (framework ready)
- **Reorder Frames**: Drag-and-drop with position tracking and history
- **Update Frame Duration**: Timeline duration changes with history support
- **Update Frame Name**: Frame renaming with undo/redo capability

#### **✅ Enhanced Architecture:**
- **Unified History System**: Single timeline for canvas and animation actions
- **Action-Specific Metadata**: Precise state restoration for each operation type
- **useAnimationHistory Hook**: Clean API for history-enabled animation operations
- **Smart State Management**: Frame navigation updates correctly during undo/redo

#### **✅ User Experience Improvements:**
- **Professional Workflow**: Industry-standard undo/redo for animation operations
- **Confidence in Experimentation**: Users can freely try frame operations
- **No Data Loss**: Complete protection against accidental animation changes
- **Mixed Operation Support**: Seamless undo across canvas and timeline actions

#### **✅ Technical Implementation:**
- **Enhanced Types**: Comprehensive action type definitions for all operations
- **History Processing**: Automatic action recording and restoration logic
- **Component Integration**: AnimationTimeline uses history-enabled functions
- **Keyboard Shortcuts**: Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z work across all actions

## Next Steps

1. **Phase 1.6: Enhanced Art Creation Tools** - ✅ **COMPLETE** (Sept 6, 2025)
   - ✅ **Advanced Selection Tools**: Lasso selection, magic wand with contiguous/non-contiguous modes
   - ✅ **Arrow Key Movement**: All selection tools support arrow key movement for precise positioning ✅ **COMPLETE** (Sept 10, 2025)
   - ✅ **Text Input System**: Type tool with cursor rendering and keyboard shortcut protection
   - ✅ **Enhanced Fill Tool**: Paint bucket with contiguous/non-contiguous toggle
   - ✅ **Universal Tool Hotkeys**: Complete hotkey system for all tools with centralized configuration (Sept 5, 2025)
   - ✅ **Typography System**: Monospace aspect ratio (~0.6) with text size, character/line spacing controls (Sept 6, 2025)
   - ✅ **UI Layout Optimization**: Reorganized interface for typography controls and action buttons (Sept 6, 2025)
   - ✅ **Font Zoom Integration**: Proper font scaling with zoom levels
   - ✅ **Rectangular Cell System**: All tools updated for non-square character dimensions

2. **Phase 2: Animation System** - ✅ **COMPLETED** (Sept 6, 2025)
   - ✅ **Timeline UI**: Complete frame timeline with pixel-perfect thumbnails and drag-and-drop reordering
   - ✅ **Animation Playback**: RequestAnimationFrame-based playback engine with frame-accurate timing
   - ✅ **Frame Management**: Add/delete/duplicate frames with auto-save synchronization
   - ✅ **Frame Synchronization**: Seamless canvas-to-frame data sync with conflict prevention
   - ✅ **Duration Controls**: Per-frame timing (50ms-10s) with visual duration indicators
   - ✅ **Drag-and-Drop Reordering**: HTML5 drag API with visual indicators and edge case handling
   - 🎯 **Next**: Onion Skinning - Show previous/next frames for animation reference

## 🎬 Phase 2: Animation System Architecture (COMPLETED)

### Overview
The animation system provides a complete frame-based animation workflow with seamless canvas integration, real-time playback, and professional drag-and-drop frame reordering. The architecture is designed to support onion skinning as the next natural extension.

### Core Components

#### 1. Animation Store (`src/stores/animationStore.ts`)
**Purpose**: Central state management for animation data and operations

**Key Features:**
- **Frame Management**: Add, remove, duplicate, and reorder frames
- **Playback State**: Play/pause/stop with looping support  
- **Frame Data Storage**: Deep copying with reference isolation
- **Drag State Tracking**: Global `isDraggingFrame` prevents auto-save interference
- **Current Frame Tracking**: Seamless frame switching with state persistence

**Critical Architecture Decisions:**
```typescript
interface AnimationState {
  frames: Frame[];
  currentFrameIndex: number;
  isPlaying: boolean;
  isDraggingFrame: boolean; // Prevents auto-save during reordering
  
  // Deep copying for reordering (prevents reference sharing)
  reorderFrames: (fromIndex: number, toIndex: number) => void;
  
  // Drag state coordination
  setDraggingFrame: (isDragging: boolean) => void;
}
```

**Frame Data Structure:**
```typescript
interface Frame {
  id: FrameId;
  name: string;
  duration: number; // 50ms - 10,000ms range
  data: Map<string, Cell>; // "x,y" coordinate mapping
  thumbnail?: string; // Base64 image data URL
}
```

#### 2. Frame Synchronization (`src/hooks/useFrameSynchronization.ts`)
**Purpose**: Bidirectional sync between canvas state and frame data

**Critical Features:**
- **Auto-save Canvas Changes**: Detects canvas modifications and saves to current frame
- **Auto-load Frame Data**: Switches frame data into canvas on frame changes
- **Conflict Prevention**: Disables auto-save during playback, dragging, and loading operations
- **Race Condition Protection**: Loading flags and timeouts prevent data corruption

**Conflict Prevention Logic:**
```typescript
// Auto-save only when safe
if (!isLoadingFrameRef.current && !isPlaying && !isDraggingFrame) {
  setFrameData(currentFrameIndex, currentCells);
}
```

**Onion Skinning Readiness:**
- Frame data accessible via `getFrameData(frameIndex)`
- Canvas loading system ready for overlay rendering
- Conflict prevention extensible for onion skin updates

#### 3. Animation Timeline (`src/components/features/AnimationTimeline.tsx`)
**Purpose**: Visual frame management interface with drag-and-drop reordering

**Drag-and-Drop Implementation:**
- **HTML5 Drag API**: Native browser drag-and-drop with `dataTransfer`
- **Visual Indicators**: White drop lines and drag state styling
- **Edge Case Handling**: Special logic for dropping after last frame
- **Global State Coordination**: Sets `isDraggingFrame` to prevent auto-save conflicts

**Timeline Features:**
- Frame thumbnails with real-time updates
- Duration controls with deferred validation
- Playback controls (play/pause/stop/loop)
- Frame operations (add/duplicate/delete)

#### 4. Frame Thumbnails (`src/components/features/FrameThumbnail.tsx`)
**Purpose**: Individual frame display with thumbnail generation and controls

**Thumbnail System:**
- **Canvas-based Rendering**: Pixel-perfect preview generation
- **Real-time Updates**: Thumbnails regenerate on frame data changes  
- **Performance Optimized**: Base64 caching in frame data
- **Aspect Ratio Maintenance**: Consistent character spacing and sizing

**Duration Controls:**
- Range: 50ms to 10,000ms (10 seconds)
- Deferred validation prevents input conflicts
- Visual indicators for current duration

#### 5. Animation Playback (`src/hooks/useAnimationPlayback.ts`)
**Purpose**: RequestAnimationFrame-based animation engine

**Playback Features:**
- **Frame-accurate Timing**: Uses individual frame durations
- **State Synchronization**: Prevents stale closures with `getState()`
- **Automatic Looping**: Seamless loop transitions
- **Tool Coordination**: Disables canvas tools during playback

**Integration Architecture:**
```typescript
const animateFrame = useCallback(() => {
  const state = getState(); // Fresh state on each frame
  
  if (!state.isPlaying) return;
  
  // Frame progression with timing
  const currentFrame = state.frames[state.currentFrameIndex];
  const frameDuration = currentFrame?.duration || DEFAULT_FRAME_DURATION;
  
  // Schedule next frame
  setTimeout(() => requestAnimationFrame(animateFrame), frameDuration);
}, [getState]);
```

### Data Flow Architecture

#### Canvas ↔ Frame Synchronization
1. **Canvas Changes** → Auto-save to current frame (when not dragging/playing)
2. **Frame Switch** → Load frame data into canvas
3. **Frame Reorder** → Drag state prevents auto-save interference
4. **Playback** → Loads each frame in sequence with timing

#### Conflict Prevention System
- **Loading States**: `isLoadingFrameRef` prevents auto-save during frame loading
- **Drag States**: `isDraggingFrame` prevents auto-save during reordering
- **Playback States**: `isPlaying` prevents auto-save during animation
- **Timeouts**: 50ms delays prevent race conditions

### Performance Optimizations

#### Canvas Rendering
- **High-DPI Support**: Device pixel ratio scaling for crisp text on all displays
- **Render Batching**: RequestAnimationFrame-based scheduling maintains 60fps
- **Dirty Region Tracking**: Only redraws changed areas for optimal performance
- **Line Interpolation**: Gap-free drawing tools using Bresenham's algorithm
- **Performance Monitoring**: Real-time FPS tracking and efficiency metrics (Ctrl+Shift+P)

#### Memory Management
- **Selective Deep Copying**: Only during reordering to prevent reference sharing
- **Thumbnail Caching**: Base64 images stored in frame data
- **Map-based Storage**: Efficient coordinate-based cell access

#### Render Optimizations
- **Debounced Auto-save**: 150ms delay prevents excessive operations
- **Conditional Rendering**: Thumbnails only regenerate when frame data changes
- **RequestAnimationFrame**: Smooth 60fps playback coordination

### Drag-and-Drop Implementation Details

#### HTML5 Drag API Usage
```typescript
// Drag start - set data and global state
const handleDragStart = (event: React.DragEvent, index: number) => {
  event.dataTransfer.setData('text/plain', index.toString());
  setDraggingFrame(true); // Global state
};

// Drop handling with edge cases
const handleDrop = (event: React.DragEvent) => {
  const dragIndex = parseInt(event.dataTransfer.getData('text/plain'));
  
  // Special handling for end-of-list drops
  if (dragOverIndex === frames.length) {
    targetIndex = frames.length - 1; // Append to end
  }
  
  reorderFrames(dragIndex, targetIndex);
};
```

#### Edge Case Resolution
- **End-of-list Drops**: Special index calculation for dropping after last frame
- **Forward Move Adjustment**: Index adjustment for moves within the array
- **Cleanup Delays**: 100ms timeout for drag state cleanup prevents race conditions

### Integration Points for Onion Skinning

The animation system is architected to seamlessly support onion skinning:

#### Frame Access Layer
```typescript
// Ready for onion skin rendering
const previousFrames = Array.from({length: previousCount}, (_, i) => 
  getFrameData(currentFrameIndex - i - 1)
).filter(Boolean);

const nextFrames = Array.from({length: nextCount}, (_, i) => 
  getFrameData(currentFrameIndex + i + 1)
).filter(Boolean);
```

#### Canvas Overlay System
- **Existing Infrastructure**: `CanvasOverlay.tsx` ready for onion skin layers
- **Z-index Coordination**: Overlay system supports multiple layers
- **Render Integration**: Canvas renderer supports additional render passes

#### State Management Extension Points
```typescript
// Proposed onion skin state extension
interface OnionSkinState {
  enabled: boolean;
  previousFrames: number; // frames back to show
  nextFrames: number;     // frames forward to show
  opacity: number;        // 0-1 transparency
  colorMode: 'original' | 'monochrome' | 'tinted';
  previousColor: string;  // tint for previous frames
  nextColor: string;      // tint for next frames
}
```

## **🚨 CRITICAL: Canvas-Animation Synchronization Patterns**

### **Frame Synchronization Race Conditions**
The interaction between canvas state and animation frames is complex and requires careful handling to prevent data corruption during frame operations.

#### **Problem Pattern: Automatic Frame Sync Interference**
The `useFrameSynchronization` hook automatically saves canvas changes to the current frame and loads frame data when switching frames. However, this creates race conditions during frame manipulation operations:

1. **Frame Deletion Issue**: When deleting frame N, the current frame index changes, triggering frame sync to save current canvas (containing deleted frame's content) to the new current frame
2. **Frame Reordering Issue**: When moving frames, multiple frame index changes trigger multiple save/load operations with stale canvas data
3. **Result**: Canvas content gets copied to wrong frames, corrupting the animation

#### **Solution Pattern: Operation Flags**
Prevent frame synchronization during critical frame operations using atomic state flags:

```typescript
// Animation Store: Add operation flags
interface AnimationState {
  isDraggingFrame: boolean;    // For reordering operations
  isDeletingFrame: boolean;    // For deletion operations
  // ... other state
}

// Frame Operations: Set flags during state updates
removeFrame: (index: number) => {
  set((state) => ({
    frames: newFrames,
    currentFrameIndex: newCurrentIndex,
    isDeletingFrame: true // Prevent sync during this update
  }));
  
  setTimeout(() => set({ isDeletingFrame: false }), 100); // Re-enable after operation
}

// Frame Sync: Check all operation flags
if (!isPlaying && !isLoadingFrame && !isDraggingFrame && !isDeletingFrame) {
  setFrameData(previousFrameIndex, currentCellsToSave); // Only save when safe
}
```

#### **Critical Implementation Rules**

1. **Atomic State Updates**: Set operation flags in the SAME state update as the frame manipulation
2. **Comprehensive Guards**: Check ALL operation flags in frame synchronization logic
3. **Timeout Reset**: Use setTimeout to reset flags after operations complete (100ms recommended)
4. **Consistent Naming**: Use descriptive flag names (`isDeletingFrame`, `isDraggingFrame`, etc.)

#### **Files Requiring Updates for New Frame Operations**
When adding new frame manipulation features:

1. **Animation Store** (`src/stores/animationStore.ts`): Add operation flag and set during state update
2. **Frame Sync** (`src/hooks/useFrameSynchronization.ts`): Add flag to guard conditions
3. **History Hook** (`src/hooks/useAnimationHistory.ts`): Ensure history operations use proper flags

#### **Testing Frame Operations**
Always test frame operations with this sequence:
1. Create frames with distinct, identifiable content (e.g., "1", "2", "3", "4")
2. Perform frame operation (delete, reorder, etc.)
3. Verify frame content matches expected result
4. Test undo/redo functionality
5. Verify no canvas content duplication or corruption

### Next Phase: Onion Skinning Implementation

#### Required Components
1. **Onion Skin State**: Extend animation store with visibility/opacity controls
2. **Onion Skin Renderer**: New component for overlay frame rendering
3. **Onion Skin Controls**: UI for enabling/configuring onion skins
4. **Integration Layer**: Connect to existing canvas overlay system

#### Implementation Strategy
1. Add onion skin state to `animationStore.ts`
2. Create `OnionSkinRenderer.tsx` component
3. Integrate with `CanvasOverlay.tsx` system
4. Extend conflict prevention for onion skin operations
5. Add onion skin controls to timeline UI

#### Performance Considerations
- Render only visible onion skins (previous/next N frames)
- Use opacity blending for performance
- Cache onion skin renders when frame data unchanged
- Leverage existing thumbnail generation system

## **Phase 3: Export/Import System** - ✅ **COMPLETED** (Sept 16, 2025)

### **🎯 Overview: Comprehensive Export/Import Functionality**

A modular, extensible export/import system providing multiple output formats for ASCII animations and static frames. The system is designed with a plugin-like architecture for easy expansion and follows established UI patterns from the existing application.

### **✅ Implementation Status - COMPLETED**

**Successfully Implemented Features:**
- ✅ **Image Export (PNG & JPEG)**: High-DPI image export with proper typography settings and adjustable JPEG quality
- ✅ **Session Export/Import**: Complete project state preservation including:
  - Canvas data and dimensions
  - Animation frames and timeline state
  - Tool state and selected colors/characters
  - Custom color palettes, character palettes (with mapping preferences), and recent color history
  - Typography settings (font size, character spacing, line spacing)
  - UI state (theme, zoom, pan offset)
- ✅ **Dropdown-based Export UI**: Clean interface with format-specific dialogs
- ✅ **Typography Integration**: Export/import now properly captures and restores font settings
- ✅ **Canvas Content Loading**: Session import correctly loads frame content to canvas
- ✅ **High-Quality Rendering**: PNG exports use device pixel ratio for crisp output

**Key Files Implemented:**
- `src/utils/exportRenderer.ts` - Core export functionality with high-DPI support
- `src/utils/sessionImporter.ts` - Complete session restore with typography callbacks
- `src/utils/exportDataCollector.ts` - Comprehensive data collection for all export formats
- `src/components/features/PngExportDialog.tsx` - Image export interface (PNG & JPEG)
- `src/components/features/SessionExportDialog.tsx` - Session export interface
- `src/components/features/ImportModal.tsx` - Session import interface
- `src/stores/exportStore.ts` - Export state management
- `src/types/export.ts` - Complete TypeScript definitions

### **🏗️ System Architecture**

#### **1. Core Export Architecture**
```typescript
// src/stores/exportStore.ts - Centralized export state management
interface ExportState {
  activeFormat: ExportFormat | null;
  isExporting: boolean;
  progress: number;
  settings: ExportSettings;
  history: ExportHistoryEntry[];
}

// src/types/export.ts - Export type definitions
interface ExportFormat {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  fileExtension: string;
  requiresAnimation: boolean;
  settings: ExportFormatSettings;
}

// src/utils/exportEngine.ts - Plugin-like export engine
class ExportEngine {
  exporters: Map<string, ExportHandler>;
  registerExporter(id: string, handler: ExportHandler): void;
  export(format: string, settings: ExportSettings): Promise<ExportResult>;
}
```

#### **2. Data Collection System**
```typescript
// src/utils/exportDataCollector.ts - Gathers all necessary export data
interface ExportDataBundle {
  // Animation data
  frames: Frame[];
  frameRange: { start: number; end: number };
  
  // Canvas data
  canvasData: Map<string, Cell>;
  canvasDimensions: { width: number; height: number };
  canvasBackgroundColor: string;
  
  // Typography & rendering
  fontMetrics: FontMetrics;
  typography: TypographySettings;
  
  // App state (for session saves)
  toolState: ToolState;
  animationState: AnimationState;
  contextState: CanvasContextState;
}
```

#### **3. Rendering Pipeline**
```typescript
// src/utils/exportRenderer.ts - High-quality frame rendering
interface ExportRenderer {
  renderFrame(frameData: Map<string, Cell>, settings: RenderSettings): Promise<HTMLCanvasElement>;
  renderFrameSequence(frames: Frame[], settings: RenderSettings): Promise<HTMLCanvasElement[]>;
  applyScaling(canvas: HTMLCanvasElement, multiplier: number): HTMLCanvasElement;
}
```

### **🎨 User Interface Design**

#### **1. Top Bar Integration**
- **Export Button**: Right side of top bar, next to theme toggle
- **Import Button**: Adjacent to export button
- Both buttons use consistent styling with existing UI elements
- Icons: `Download` for export, `Upload` for import

#### **2. Export Modal (`ExportModal.tsx`)**
```typescript
interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Modal structure:
// 1. Format selection (grid of cards)
// 2. Settings panel (dynamic based on format)
// 3. Frame range selector (for animation formats)
// 4. Quality/size controls
// 5. Export button with progress indicator
```

#### **3. Import Modal (`ImportModal.tsx`)**
- File drop zone with format auto-detection
- Import preview for supported formats
- Merge vs. replace options for session imports
- Error handling and validation feedback

### **📤 Export Formats Implementation**

#### **1. Video Export (.mp4)**
**Technical Requirements:**
- **FFmpeg Integration**: Web-based FFmpeg using `@ffmpeg/ffmpeg`
- **H.264 Codec**: Standard video codec for broad compatibility
- **Size Options**: 1x or 2x current canvas pixel dimensions
- **Frame Rate Control**: User-selectable up to 60 fps
- **Progress Tracking**: Real-time encoding progress updates

**Settings Interface:**
```typescript
interface VideoExportSettings {
  sizeMultiplier: 1 | 2;     // 1x or 2x canvas pixel size
  frameRate: number;         // 1-60 fps, user selectable
  frameRange: { start: number; end: number }; // Which frames to export
  quality: 'high' | 'medium' | 'low'; // Simplified quality presets
}
```

**Implementation:**
```typescript
// src/utils/exporters/videoExporter.ts
export class VideoExporter implements ExportHandler {
  async export(data: ExportDataBundle, settings: VideoExportSettings): Promise<Blob> {
    // 1. Render all frames at specified size multiplier
    // 2. Convert to image sequence for FFmpeg
    // 3. Initialize FFmpeg with H.264 preset
    // 4. Encode at user-specified frame rate
    // 5. Return MP4 blob for download
  }
}
```

#### **2. GIF Export (.gif)** - *Future Enhancement*
**Technical Requirements:**
- **GIF.js Library**: High-quality GIF encoding with dithering options
- **Frame Optimization**: Frame differencing for smaller file sizes
- **Color Palette**: Optimized 256-color palette generation

**Settings Interface:**
```typescript
interface GifExportSettings {
  sizeMultiplier: number; // 1x, 2x, 4x scaling
  quality: number;        // 1-20 (GIF.js quality setting)
  frameRange: { start: number; end: number };
  dithering: boolean;     // Floyd-Steinberg dithering
  repeat: number;         // 0 = infinite loop, n = repeat n times
}
```

*Note: GIF export will be implemented in a future phase to focus on core MP4 and PNG functionality first.*

#### **3. JSON Data Export (.json)** - ✅ Updated September 27, 2025
**Current Behavior:**
- **Dual Formatting Modes**: Compact exports retain the original string-based schema; pretty-print mode now outputs `content` as per-line string arrays for easy human inspection while preserving a `contentString` fallback
- **Color Payload Compaction**: When pretty print is enabled, foreground/background color maps serialize as single-line JSON strings to keep files concise without sacrificing readability elsewhere
- **Importer Compatibility**: `JsonImporter` seamlessly accepts legacy string content, the new array format, and stringified color maps—allowing mixed-version projects to round-trip safely
- **Typography & Metadata**: Font sizing, spacing, and optional metadata fields continue to mirror session exports for consistency

**Implementation Notes:**
- Export adjustments live in `src/utils/exportRenderer.ts` (`exportJson` pipeline)
- Import parsing upgrades are centralized in `src/utils/jsonImporter.ts`
- When updating export schema again, always provide backward compatibility in the importer before adjusting UI copy

#### **4. Export Dialog Responsive Layout Standard** - ✅ Completed September 28, 2025
**Goals Achieved:**
- **Unified Scaffold**: All export dialogs (HTML, PNG, Text, JSON, Video, Session) now use a shared layout pattern with `DialogContent` stripped of default padding, a max-height viewport, and sticky sections to keep controls accessible on smaller screens
- **Sticky Top Controls**: File name inputs (and progress bars where applicable) live inside a sticky header block so users can rename exports or monitor progress without losing scroll position in settings
- **Scrollable Settings Stage**: Format-specific controls sit within a `flex-1 overflow-y-auto px-6 py-4 space-y-4` container, preventing tall settings stacks from forcing the dialog beyond the viewport
- **Persistent Action Bar**: Export and cancel actions occupy a sticky bottom toolbar with `border-t`, mirroring the HTML dialog precedent and ensuring buttons remain in reach at all times
- **Consistent Disabled States**: Inputs, selects, switches, sliders, and checkboxes honor the shared `isExporting` state to prevent edits mid-export and provide uniform feedback across formats

**Implementation Notes:**
- Updated files: `HtmlExportDialog.tsx`, `PngExportDialog.tsx`, `TextExportDialog.tsx`, `JsonExportDialog.tsx`, `VideoExportDialog.tsx`, `SessionExportDialog.tsx`
- Tailwind structure: `max-w-* p-0 overflow-hidden` on `DialogContent`, sticky sections leveraging `bg-background`, `border-b`, and `border-t` to delineate zones cleanly
- Progress UI: Video and text exports display progress bars within the sticky header block to keep status visible during long operations
- Validation note: Buttons now guard against empty filenames where appropriate to prevent accidental blank exports

#### **5. HTML Export Canvas Presentation Refresh** - ✅ Completed September 28, 2025
**Goals Achieved:**
- **Accurate Canvas Frame**: Exported HTML now wraps frame layers in an `.animation-stage` sized via CSS variables so the visible grey outline communicates the true canvas dimensions instead of a 20px placeholder square
- **Columnar Layout**: Playback controls and metadata live in an `.animation-shell` flex column under the stage, guaranteeing narrow breakpoints never overlap buttons with the animation surface
- **Responsive Styling**: Dark-friendly button styling, hover/focus states, and centered metadata mirror in-app UI polish while keeping exports printer-friendly
- **Player Reliability**: The runtime rebuilds frames inside `#animationCanvas`, resets timeouts safely, allows the very first Play/Pause interaction to respond immediately, and swaps frames via display toggles so playback stays flicker-free
- **Control Parity**: Exported playback controls now clone the in-app timeline bar (skip back/forward, play/pause, stop, loop toggle, frame badge) with embedded Lucide SVGs so the HTML file stays dependency-free

**Implementation Notes:**
- Core updates live in `src/utils/exportRenderer.ts` within the `exportHtml` template (CSS, markup, and playback helpers)
- Stage dimensions leverage the recorded canvas width/height, so future typography tweaks automatically inherit correct sizing
- Playback changes remove hanging timers and ensure `resetAnimation` cleanly restores frame zero without ghost intervals
- Icon fidelity: Inline SVG definitions now mirror Lucide's 2px stroke paths verbatim so exported controls stay pixel-identical to the in-app bar without external dependencies
- Frame badge stability: The indicator pads digits and relies on tabular numerals within a fixed pill to prevent width shifts when entering double- or triple-digit frames
- Simplified controls: Pause button removed—play disables while playback is active, stop becomes the primary interrupt, and the guarded timer logic prevents mid-frame clicks from slipping through

#### **2. PNG Export (.png)**
**Technical Requirements:**
- **Current Frame Only**: Exports active frame as high-quality PNG
- **High-DPI Support**: Device pixel ratio scaling for crisp exports
- **Size Options**: 1x or 2x current canvas pixel dimensions
- **Background Handling**: Uses current canvas background color

**Settings Interface:**
```typescript
interface PngExportSettings {
  sizeMultiplier: 1 | 2;  // 1x or 2x canvas pixel size
  includeGrid: boolean;   // Optional grid overlay (default: false)
}
```

**Implementation:**
```typescript
// src/utils/exporters/pngExporter.ts
export class PngExporter implements ExportHandler {
  async export(data: ExportDataBundle, settings: PngExportSettings): Promise<Blob> {
    // 1. Render current frame at specified size multiplier
    // 2. Apply canvas background color
    // 3. Optionally overlay grid
    // 4. Convert canvas to PNG blob
    // 5. Return PNG blob for download
  }
}
```

#### **3. Session Save (.asciimtn)**
**Technical Requirements:**
- **Core Creative State**: Canvas data, animation frames, and typography settings
- **Tool State**: Active colors, selected character, and essential tool settings
- **Future-Proof Schema**: Extensible format for new features

**Data Structure:**
```typescript
interface SessionExport {
  version: string;
  metadata: {
    name: string;
    createdAt: string;
    appVersion: string;
  };
  
  // Complete animation state
  animation: {
    frames: Frame[]; // Full frame data with cells
    currentFrameIndex: number;
    frameRate: number;
    looping: boolean;
  };
  
  // Canvas state
  canvas: {
    width: number;
    height: number;
    backgroundColorstring;
    showGrid: boolean;
  };
  
  // Core tool state
  tools: {
    activeTool: Tool;
    selectedColor: string;
    selectedBgColor: string;
    selectedCharacter: string;
    // Essential tool settings only
    paintBucketContiguous: boolean;
    rectangleFilled: boolean;
  };
  
  // Typography settings
  typography: {
    fontSize: number;
    characterSpacing: number;
    lineSpacing: number;
  };
}
```

### **📥 Import System Implementation**

#### **1. JSON Animation Import**
- **File Validation**: Schema validation with detailed error messages
- **Merge Options**: Replace current animation vs. append frames
- **Canvas Resize**: Handle dimension mismatches gracefully

#### **2. Session Import**
- **State Restoration**: Complete app state restoration from `.asciimtn` files
- **Version Migration**: Handle imports from older app versions
- **Selective Import**: Choose which aspects to import (animation, tools, UI)

#### **3. Future Import Formats**
- **Text File Import**: Parse ASCII art from `.txt` files
- **Image Import**: Convert images to ASCII using edge detection
- **GIF Import**: Extract frames from animated GIFs for editing

### **🔧 Implementation Architecture**

#### **Component Structure**
```
src/
├── components/
│   └── features/
│       ├── ExportModal.tsx           # Main export interface
│       ├── ImportModal.tsx           # Main import interface  
│       ├── ExportFormatCard.tsx      # Individual format selection
│       ├── ExportSettings.tsx        # Dynamic settings panel
│       ├── ExportProgress.tsx        # Progress indicator with cancel
│       ├── FrameRangeSelector.tsx    # Animation frame range picker
│       └── ImportDropZone.tsx        # File drag-and-drop area
├── stores/
│   └── exportStore.ts                # Export/import state management
├── utils/
│   ├── exportEngine.ts               # Core export orchestration
│   ├── exportDataCollector.ts        # Data gathering utilities
│   ├── exportRenderer.ts             # High-quality rendering pipeline
│   └── exporters/
│       ├── pngExporter.ts            # PNG image export (Phase 3.2)
│       ├── sessionExporter.ts        # Session save/load (Phase 3.3)
│       └── videoExporter.ts          # MP4 export (Phase 3.4)
└── types/
    └── export.ts                     # Export-related type definitions
```

**Note**: Structure focuses on the three core export formats (PNG, Session, MP4) with clean separation between rendering pipeline and format-specific exporters.

#### **Dependencies to Add**
```json
{
  "dependencies": {
    "@ffmpeg/ffmpeg": "^0.12.7",      // Video encoding (MP4 export)
    "@ffmpeg/util": "^0.12.1",        // FFmpeg utilities
    "file-saver": "^2.0.5"            // File download utility
  },
  "devDependencies": {
    // Future: "gif.js": "^0.2.0" for GIF export
    // Future: "jszip": "^3.10.1" for multi-file exports
  }
}
```

### **🎯 Development Phases**

The implementation follows a clean architectural progression from simple to complex, building reusable infrastructure that supports all export formats.

#### **Phase 3.1: Foundation Infrastructure (Days 1-2)**
**Goal**: Establish core export system architecture and UI integration
- [ ] Export/Import store setup (`src/stores/exportStore.ts`)
- [ ] Export data collector utility (`src/utils/exportDataCollector.ts`)
- [ ] Top bar Export/Import buttons integration
- [ ] Basic export modal component with format selection
- [ ] High-quality canvas rendering pipeline for exports

**Why First**: Creates the foundation that all export formats will use, ensuring consistent architecture.

#### **Phase 3.2: PNG Export (Days 2-3)**
**Goal**: Simplest export format to validate the pipeline
- [ ] PNG exporter implementation (`src/utils/exporters/pngExporter.ts`)
- [ ] Size multiplier options (1x, 2x)
- [ ] Grid overlay toggle
- [ ] PNG export settings UI
- [ ] File download integration

**Why Second**: PNG is the simplest format and validates the entire export pipeline without complex encoding.

#### **Phase 3.3: Session Save/Load (Days 3-4)**
**Goal**: Core creative state preservation for project continuity
- [ ] Session data collector (core creative state)
- [ ] Session exporter implementation (`src/utils/exporters/sessionExporter.ts`)
- [ ] Import modal with file drop zone
- [ ] Session import validation and restoration
- [ ] Version compatibility handling

**Why Third**: Session save is critical for user workflow and tests complete state management integration.

#### **Phase 3.4: MP4 Video Export (Days 4-6)**
**Goal**: Animation export with H.264 encoding
- [ ] FFmpeg integration setup (`@ffmpeg/ffmpeg`)
- [ ] Frame sequence rendering for animation
- [ ] H.264 encoding with quality presets
- [ ] Frame rate control (1-60 fps)
- [ ] Progress tracking with cancellation
- [ ] MP4 export settings UI

**Why Last**: MP4 is the most complex format requiring external dependencies and the most sophisticated encoding pipeline.

#### **Phase 3.5: Polish & Error Handling (Days 6-7)**
**Goal**: Production-ready export system
- [ ] Comprehensive error handling and user feedback
- [ ] Export progress indicators with cancellation
- [ ] File naming conventions and metadata
- [ ] Performance optimization for large animations
- [ ] Documentation updates

**Why Final**: Ensures the entire system is robust and user-friendly before considering complete.

### **🚀 Future Expansion Points**

The export system is designed for easy extension. Future formats can be added by:

1. **Creating New Exporter**: Implement `ExportHandler` interface
2. **Registering Format**: Add to export engine registry
3. **Adding UI Components**: Settings panel and format card
4. **Defining Types**: Add format-specific settings interface

**Planned Future Formats:**
- **SVG Export**: Vector-based output for scalability
- **HTML Export**: Interactive web page with CSS animations
- **Sprite Sheets**: Game development asset generation
- **Adobe After Effects**: JSON export for motion graphics
- **ASCII Text**: Plain text art export with formatting

### **🔧 Technical Implementation Notes**

#### **Performance Optimizations**
- **Worker Threads**: Offload heavy rendering to web workers
- **Canvas Pooling**: Reuse canvas elements for memory efficiency  
- **Streaming Exports**: Process large animations in chunks
- **Progress Cancellation**: Allow users to cancel long exports

#### **Error Handling**
- **Graceful Degradation**: Fallback options for unsupported formats
- **Detailed Logging**: Export logs for debugging and user feedback
- **Recovery Options**: Resume failed exports where possible
- **Validation Feedback**: Clear error messages with suggested fixes

#### **Accessibility**
- **Keyboard Navigation**: Full keyboard support for export dialogs
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **Progress Announcements**: Audio feedback for export completion
- **High Contrast**: Export UI works with accessibility themes

This comprehensive export/import system will transform ASCII Motion from a creation tool into a complete production pipeline, enabling users to share their work across multiple platforms and formats while maintaining the highest quality output.

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

### **🎯 ENHANCEMENT COMPLETED: Color Management Hotkeys (Sept 23, 2025)**
✅ **Status**: COMPLETE - Professional color workflow hotkeys for efficient color manipulation during drawing
✅ **Files Modified:**
- `src/hooks/useKeyboardShortcuts.ts` (ENHANCED) - Added color swap and palette navigation hotkeys with edge case handling

✅ **Features Implemented:**
- **'X' Key - Foreground/Background Swap**: Instantly swap foreground and background colors using same logic as UI button
- **'[' and ']' Keys - Palette Navigation**: Navigate previous/next colors in active palette with loop-around support
- **Context-Aware Navigation**: Automatically detects foreground/background tab context for proper color assignment
- **Smart Color Selection**: Activates first color in palette if no color currently selected
- **Transparent Background Handling**: Proper edge case handling prevents transparent characters (foreground stays unchanged)
- **Recent Colors Integration**: Newly selected colors automatically added to recent colors history

✅ **Technical Architecture:**
- **Reused Existing Logic**: Color swap uses identical logic to ForegroundBackgroundSelector component for consistency
- **Robust DOM Context Detection**: Multi-strategy detection for active color picker tab (Text/BG) using various Radix UI selectors
- **Loop-Around Navigation**: Navigate beyond first/last color wraps to opposite end of palette
- **Edge Case Handling**: Graceful handling of empty palettes, no selection, and transparent backgrounds
- **Store Integration**: Direct integration with both toolStore (colors) and paletteStore (navigation)
- **Fallback Detection**: Multiple selector strategies ensure reliable tab detection across component states

✅ **User Experience:**
- **Professional Workflow**: Matches industry standards (Photoshop X key for color swap)
- **Efficient Drawing**: Rapid color changes without interrupting drawing flow
- **Keyboard-Driven**: Supports power users who prefer keyboard navigation
- **Intuitive Behavior**: '[' and ']' keys provide natural left/right navigation metaphor
- **Seamless Integration**: Works with all existing color palette features and recent colors system

✅ **Implementation Details:**
```typescript
// 'X' Key - Swap colors with transparent edge case handling
const swapForegroundBackground = () => {
  const tempColor = selectedColor;
  if (selectedBgColor === 'transparent') {
    setSelectedBgColor(tempColor);
    // Foreground stays unchanged (no transparent characters)
  } else {
    setSelectedColor(selectedBgColor);
    setSelectedBgColor(tempColor);
  }
  // Add to recent colors if not transparent
};

// '[' and ']' Keys - Navigate palette colors with context awareness
const navigatePaletteColor = (direction: 'previous' | 'next') => {
  // Detect foreground/background context from DOM
  // Filter colors appropriately (background includes transparent)
  // Navigate with loop-around
  // Update drawing color and palette selection
};
```

✅ **Benefits for Artists:**
- **Rapid Color Swapping**: Instant foreground/background swap during detail work
- **Efficient Palette Navigation**: Quick access to all colors without mouse interaction
- **Workflow Continuity**: Color changes don't interrupt drawing or selection operations
- **Professional Feel**: Familiar hotkeys matching industry-standard graphics software
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
- **Gradient Fill** 🌈 - **NEW** ✅ **COMPLETE** - Advanced gradient application with interactive controls (Sept 2025):
  - *Linear & Radial*: Full gradient type support with visual controls
  - *Multi-property*: Character, text color, and background color gradients
  - *Interactive UI*: Draggable start/end points and color stops with real-time preview
  - *Multiple Interpolation*: Linear, constant, Bayer dithering, and noise patterns
  - *Quantized Linear Steps*: Linear interpolation offers 1–10 stepped levels plus ∞ for smooth blends across all properties
  - *Smart Fill Detection*: Configurable matching criteria (contiguous, character, colors)
  - *Professional Workflow*: Enter to apply, Escape to cancel, full undo/redo integration

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
- `Cmd/Ctrl + A` - **Select All** - Activate selection tool and select entire canvas (Sept 10, 2025)
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
- [x] **Text Size Control** - User-adjustable font size (8px-48px, default 16px)
- [x] **Font Zoom Integration** - Proper font scaling with zoom levels
- [x] **Rectangular Cell System** - All tools updated for non-square character dimensions
- [x] **Typography UI Controls** - Integrated controls in canvas settings toolbar

#### UI/UX Improvements ✅ **COMPLETE** (Sept 6, 2025)
- [x] **Layout Reorganization** - Moved action buttons to prevent toolbar crowding
- [x] **Typography Control Integration** - Dedicated space for character/line spacing
- [x] **Canvas Settings Panel** - Centralized controls with typography options
- [x] **Compact Action Buttons** - Relocated copy/paste/undo/redo to canvas footer
- [x] **Enhanced Status Integration** - Tool status with action buttons in organized layout
- [x] **Character Picker Standardization** ✅ **COMPLETE** - Unified EnhancedCharacterPicker with icons and improved visual hierarchy across all features (Sept 29, 2025)

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

#### **Arrow Key Movement for Selection Tools (September 10, 2025)**
**Decision**: Implement keyboard-initiated move mode with seamless mouse interaction for all selection tools  
**Problem**: Professional graphics software supports arrow key movement for selections, but this required complex state coordination  
**Solution**: Arrow key detection in `CanvasGrid.tsx` with tool-specific movement handlers and adjusted mouse interaction logic  
**Files**: `src/components/features/CanvasGrid.tsx`, `src/hooks/useCanvasSelection.ts`, `src/hooks/useCanvasLassoSelection.ts`, `src/hooks/useCanvasMagicWandSelection.ts`  
**Key Fixes**:
- **Stale Closure Fix**: Added selection state variables to useEffect dependencies to prevent event handlers from using outdated state
- **Mouse Movement Fix**: Added `mouseButtonDown` condition to mouse move handlers to prevent arrow-initiated moves from jumping to mouse position
- **Click Position Fix**: Adjusted `startPos` calculation when clicking on existing moveState to account for `currentOffset` from arrow keys
**Pattern**: 
```typescript
// Arrow key detection and routing
if ((event.key === 'ArrowUp' || event.key === 'ArrowDown' || 
     event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
  if ((activeTool === 'select' && selection.active) || 
      (activeTool === 'lasso' && lassoSelection.active) ||
      (activeTool === 'magicwand' && magicWandSelection.active)) {
    event.preventDefault();
    const arrowOffset = {
      x: event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0,
      y: event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0
    };
    handleArrowKeyMovement(arrowOffset);
  }
}

// Fixed mouse move handler pattern
if (selectionMode === 'moving' && moveState && mouseButtonDown) {
  // Only update during mouse-initiated moves
}

// Fixed click on existing moveState pattern  
if (moveState) {
  const adjustedStartPos = {
    x: x - moveState.currentOffset.x,
    y: y - moveState.currentOffset.y
  };
  setMoveState({ ...moveState, startPos: adjustedStartPos });
}
```
**Lesson**: When implementing keyboard shortcuts for complex UI state, ensure event handlers have access to current state via proper dependency arrays, and coordinate mouse/keyboard interactions carefully to prevent conflicting behaviors

#### **Frame Synchronization Move Commit Pattern**
**Decision**: Move operations are committed to the original frame before clearing state during frame navigation  
**Problem**: During frame switching, move operations were being cancelled instead of committed, losing user work  
**Solution**: Enhanced `useFrameSynchronization` to commit moves to canvas and save committed data to frame  
**Files**: `src/hooks/useFrameSynchronization.ts`, `src/contexts/CanvasContext.tsx`  
**Pattern**: 
```typescript
// Commit move operations before frame switching
if (moveStateParam && setMoveStateParam) {
  // Calculate final position
  const totalOffset = { x: baseOffset.x + currentOffset.x, y: baseOffset.y + currentOffset.y };
  
  // Create new canvas with committed moves
  const newCells = new Map(cells);
  moveStateParam.originalData.forEach((cell, key) => {
    newCells.delete(key); // Clear original position
    const [origX, origY] = key.split(',').map(Number);
    const newX = origX + totalOffset.x;
    const newY = origY + totalOffset.y;
    if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
      newCells.set(`${newX},${newY}`, cell); // Place at new position
    }
  });
  
  // Save committed data to frame (not original canvas data)
  currentCellsToSave = newCells;
  setCanvasData(newCells);
  setMoveStateParam(null);
}
```
**Lesson**: When managing state across frame boundaries, ensure user operations are committed before state transitions

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
- **User Experience**: Visual feedback through enhanced status messages
- **Keyboard Integration**: Shift key detection without interfering with text input tools
- **Architecture**: Enhances existing tool framework without breaking established patterns

#### **Portal-Based Dropdown System for Layering Control (Sept 6, 2025)**
**Decision**: Implement dropdown menus using React portals to escape canvas stacking context
**Issue**: Typography and background color dropdowns appearing behind canvas due to z-index conflicts
**Root Cause**: Canvas components create stacking contexts that override traditional z-index values
**Solution**: 
- Implemented `createPortal(element, document.body)` for dropdown rendering
- Established z-index hierarchy: canvas (z-10-40), UI (z-50-999), dropdowns (z-99999+)
- Enhanced click-outside detection to work with portal-rendered elements
- Added event propagation control to prevent dropdown closure during interaction

**Files Affected**:
- `src/components/features/CanvasSettings.tsx` - Portal-based dropdown implementation
- `DEVELOPMENT.md` - Added dropdown best practices and z-index guidelines
- `COPILOT_INSTRUCTIONS.md` - Added component patterns for dropdown implementation

**Impact for Developers**:
- ✅ Dropdowns now properly layer above canvas content regardless of container nesting
- ✅ Reliable interaction without unexpected closure when using dropdown controls
- ✅ Established patterns for future overlay components (modals, tooltips, popovers)
- ✅ Clear z-index hierarchy prevents future layering conflicts
- 📋 **Architecture**: Portal pattern available for any component needing to escape stacking context

**Technical Implementation**:
- **Portal Rendering**: React.createPortal() to document.body for proper DOM hierarchy
- **Dynamic Positioning**: Calculate position relative to trigger button with getBoundingClientRect()
- **Event Handling**: stopPropagation() on dropdown content to prevent event bubbling
- **Click Detection**: Enhanced outside-click logic accounting for portal-rendered elements
- **Z-Index System**: Documented hierarchy prevents conflicts across component types

**Lessons Learned**:
- Canvas containers with relative positioning create stacking contexts that override z-index
- Portal rendering is essential for dropdowns/overlays that need to appear above complex layouts
- Event propagation must be carefully controlled when content is rendered outside normal DOM hierarchy
- Dynamic positioning calculations should account for viewport boundaries and scroll positions
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

### **🎯 PHASE 2: ANIMATION SYSTEM - IMPLEMENTATION COMPLETE (Sept 6, 2025)**

**✅ CORE FEATURES IMPLEMENTED:**

#### Phase 2.1: Frame Synchronization Foundation ✅
- **`useFrameSynchronization` Hook**: Auto-saves canvas changes to current frame
- **Real-time sync**: Canvas-to-frame and frame-to-canvas data synchronization  
- **Frame switching**: Auto-save/load on frame navigation with proper safeguards
- **Playback protection**: Prevents saving during animation playback

#### Phase 2.2: Timeline UI Core ✅
- **`AnimationTimeline` Component**: Complete horizontal scrollable timeline
- **`FrameThumbnail` Component**: Full ASCII miniature previews with controls
- **`FrameControls` Component**: Add/duplicate/delete frame buttons
- **Frame management**: Visual current frame indicator and selection

#### Phase 2.3: Playback Engine ✅
- **`useAnimationPlayback` Hook**: RequestAnimationFrame-based timing engine
- **Timeline-driven playback**: Individual frame duration support
- **Canvas read-only mode**: Tools disabled during playback
- **Visual indicators**: Canvas outline changes color during playback (green=playing, orange=paused)

#### Phase 2.4: Frame Management ✅
- **`useFrameNavigation` Hook**: Keyboard shortcuts (`,` `.` keys) 
- **Click-to-jump**: Frame selection and navigation
- **Duration controls**: Per-frame millisecond editing
- **Playback controls**: Play/pause/stop with keyboard shortcuts (Space, Esc)

#### Phase 2.5: Integration & Polish ✅
- **App integration**: Replaced "Coming Soon" timeline placeholder
- **Tool store enhancement**: Added playback mode state management
- **Keyboard shortcuts**: Integrated with existing hotkey system
- **Visual feedback**: Canvas outline styling for playback indication

**🎯 IMPLEMENTATION COMPLETE:**

**New Components Created:**
- `/src/components/features/AnimationTimeline.tsx` - Main timeline container
- `/src/components/features/FrameThumbnail.tsx` - Individual frame with ASCII preview
- `/src/components/features/PlaybackControls.tsx` - Play/pause/stop controls  
- `/src/components/features/FrameControls.tsx` - Add/duplicate/delete buttons

**New Hooks Created:**
- `/src/hooks/useFrameSynchronization.ts` - Canvas-frame data sync
- `/src/hooks/useAnimationPlayback.ts` - RequestAnimationFrame playback engine
- `/src/hooks/useFrameNavigation.ts` - Keyboard navigation and shortcuts

**Store Enhancements:**
- **Tool Store**: Added `isPlaybackMode` state and `setPlaybackMode` action
- **Canvas Context**: Integrated frame synchronization hook
- **App Component**: Timeline integration replacing placeholder

**🚀 FEATURES WORKING:**
- ✅ Changes automatically save to current frame
- ✅ Horizontal scrollable timeline with full ASCII thumbnails
- ✅ Canvas read-only during playback with green outline indicator
- ✅ Auto-save/load on frame switching
- ✅ Click-to-navigate frames + keyboard shortcuts (`,` `.` keys)
- ✅ Frame duration controls and visual management
- ✅ Playback controls with hotkeys (Space=play/pause, Esc=stop)
- ✅ Frame add/duplicate/delete functionality
- ✅ Timeline shows frame count, total duration, and progress

**Ready for Testing:** http://localhost:5178/

**✅ Onion Skinning Implementation Complete (September 2025):**
- Full onion skinning system with canvas-based rendering ✅
- Blue/red color tinting for previous/next frames ✅  
- Performance-optimized caching system (50 frame limit) ✅
- UI controls with Layers icon toggle and number steppers ✅
- Shift+O keyboard shortcut for quick toggle ✅
- Smart playback integration (auto-disable/restore) ✅
- Timeline visual indicators with colored borders and distance badges ✅
- Complete TypeScript integration with proper error handling ✅

**Technical Architecture:**
- State management: Extended `animationStore.ts` with onion skin state
- Rendering: `useOnionSkinRenderer.ts` hook with LRU caching
- Colors: Centralized in `constants/onionSkin.ts` (#3B82F6 blue, #EF4444 red)
- UI: `OnionSkinControls.tsx` integrated in animation timeline
- Performance: Canvas layer caching with 60%-20% opacity falloff

**Key Files Modified:**
- `src/stores/animationStore.ts` - Onion skin state management
- `src/hooks/useOnionSkinRenderer.ts` - Canvas rendering with caching
- `src/components/features/OnionSkinControls.tsx` - UI controls
- `src/components/features/AnimationTimeline.tsx` - Timeline integration
- `src/components/features/FrameThumbnail.tsx` - Visual indicators
- `src/hooks/useCanvasRenderer.ts` - Main canvas integration
- `src/hooks/useKeyboardShortcuts.ts` - Shift+O shortcut

**Developer Notes:**
- Cache performance: ~2ms with cache vs ~15ms without cache
- Memory usage: Limited to 50 cached canvas elements with LRU eviction
- TypeScript: Full type safety throughout the implementation
- Testing: Recommended to test with 1-10 frame ranges and 50+ frame animations

---

## ✅ **OS Clipboard Integration** - ✅ **COMPLETED** (September 10, 2025)

### **Feature Overview**
Enhanced copy functionality to support both internal clipboard AND OS system clipboard simultaneously. Users can now copy ASCII art selections and paste them directly into external text editors, terminals, and other applications.

### **Key Features**
- **Transparent Integration**: `Cmd/Ctrl+C` copies to both internal and OS clipboard
- **All Selection Types**: Works with rectangular, lasso, and magic wand selections
- **Smart Text Formatting**: 
  - Empty cells become spaces only when to the left of characters
  - Trailing spaces automatically cropped from each line
  - Leading spaces preserved for proper character positioning
  - Each row becomes a separate text line
- **Cross-Platform**: Uses modern Clipboard API with graceful fallback
- **Preserved Functionality**: All existing copy/paste behavior unchanged

### **Implementation Details**
- **New Utility**: `src/utils/clipboardUtils.ts` - Text conversion and OS clipboard functions
- **Enhanced Store Methods**: Updated all copy functions in `toolStore.ts` to include OS clipboard
- **Selection Format Conversion**:
  - Rectangular selections → Direct text grid
  - Lasso/Magic Wand selections → Bounding box with spaces for unselected areas
- **Error Handling**: Graceful fallback if Clipboard API unavailable

### **Technical Architecture**
```typescript
// Text conversion utility
export const selectionToText = (cellsData, minX, maxX, minY, maxY) => {
  // Convert cell grid to text with smart spacing
};

// OS clipboard integration  
export const writeToOSClipboard = async (text: string) => {
  // Use Clipboard API with fallback
};

// Enhanced store methods
copySelection: (canvasData) => {
  // Internal clipboard (unchanged)
  set({ clipboard: copiedData });
  
  // NEW: OS clipboard integration
  const textForClipboard = rectangularSelectionToText(canvasData, selection);
  writeToOSClipboard(textForClipboard);
}
```

### **User Benefits**
- **Workflow Integration**: Copy ASCII art directly to external applications
- **Professional Output**: Clean text format suitable for documentation, code comments, terminal output
- **Cross-Application**: Works with VS Code, TextEdit, terminal, documentation tools, etc.
- **Seamless Experience**: No additional steps required - standard copy behavior enhanced

### **Testing Verified**
- ✅ All three selection types export correctly
- ✅ Text formatting preserves character positioning
- ✅ Leading spaces maintained, trailing spaces cropped
- ✅ Multi-line content with proper line breaks
- ✅ Cross-browser compatibility (Chrome, Firefox, Safari)
- ✅ No impact on existing internal copy/paste functionality

### **Files Modified**
- `src/utils/clipboardUtils.ts` - NEW: OS clipboard integration utilities
- `src/stores/toolStore.ts` - Enhanced copy functions with dual clipboard support
- `src/components/features/CanvasActionButtons.tsx` - Updated handlers for consistency

---

---

## **Phase 4: Image/Video Import & ASCII Conversion System** - ✅ **COMPLETED** (Sept 18, 2025)

### **🎯 Overview: Professional Media-to-ASCII Conversion Pipeline**

A comprehensive image and video import system that converts visual media into ASCII art using configurable character mapping, color palette selection, and image processing filters. The system provides real-time preview capabilities with independent overlay rendering and integrates seamlessly with the existing canvas and animation workflows.

### **✅ Implementation Status - COMPLETED**

**Successfully Implemented Features:**
- ✅ **Media Import Panel**: Side panel overlay interface for importing images and videos
- ✅ **Drag & Drop Support**: File drop zone with format detection and validation
- ✅ **Real-time ASCII Conversion**: Live preview of media-to-ASCII conversion with settings changes
- ✅ **Independent Preview Overlay**: Non-destructive preview system that doesn't interfere with canvas data
- ✅ **Video Frame Extraction**: Frame-by-frame processing for video files with timeline integration
- ✅ **Configurable Settings**: Character width/height, color options, brightness adjustments
- ✅ **Import Modes**: Overwrite current frame or append as new animation frames
- ✅ **Format Support**: JPEG, PNG, GIF, MP4, WebM, and other common image/video formats

**Key Files Implemented:**
- `src/components/features/MediaImportPanel.tsx` - Main import interface (901 lines)
- `src/stores/importStore.ts` - Import state management with modular hooks
- `src/stores/previewStore.ts` - Independent preview overlay system
- `src/utils/mediaProcessor.ts` - Core media processing with FFmpeg integration
- `src/utils/asciiConverter.ts` - Image-to-ASCII conversion algorithms
- `src/types/palette.ts` - Color palette and import type definitions

### **🏗️ Architecture: Independent Preview Overlay System**

#### **Critical Innovation: Non-Destructive Preview**
The key architectural breakthrough was implementing an independent preview overlay system that resolved frame corruption issues:

**Problem Solved:**
- Video import overwrite mode was clearing current frame then appending
- Preview data was persisting in wrong frames when switching between timeline frames
- Single-frame preview state caused corruption across multiple frames

**Solution: Preview Store Architecture**
```typescript
// src/stores/previewStore.ts - Independent preview data management
interface PreviewState {
  previewData: Map<string, Cell>;    // Preview cells by coordinate key
  isPreviewActive: boolean;          // Preview overlay active state
  setPreviewData: (data: Map<string, Cell>) => void;
  clearPreview: () => void;
  setPreviewActive: (active: boolean) => void;
}
```

#### **Multi-Layer Canvas Rendering**
```typescript
// Enhanced src/hooks/useCanvasRenderer.ts - Preview overlay integration
const renderCanvas = useCallback(() => {
  // 1. Render static canvas cells
  // 2. Render onion skin layers
  // 3. Render moved cells during selection operations
  // 4. **NEW: Render preview overlay with transparency**
  if (isPreviewActive && previewData.size > 0) {
    previewData.forEach((cell, key) => {
      ctx.save();
      ctx.globalAlpha = 0.8; // Distinguish preview from actual content
      drawCell(ctx, x, y, cell);
      ctx.restore();
    });
  }
  // 5. Render selection overlays and cursor
}, [previewData, isPreviewActive, /* other deps */]);
```

#### **Preview Data Flow**
```typescript
// MediaImportPanel.tsx - User interface flow
const MediaImportPanel = () => {
  // 1. User uploads media file (drag & drop or file picker)
  // 2. Media processor extracts frames (image = 1 frame, video = multiple)
  // 3. Settings changes trigger live preview effect
  // 4. ASCII converter processes current preview frame
  // 5. Preview store receives converted cells
  // 6. Canvas renderer displays preview as overlay
  // 7. User confirms import → data moves to actual canvas/animation
};

// Data flow is completely isolated from main canvas data
const livePreviewEffect = useCallback(() => {
  startPreview(); // Activate preview overlay
  const result = asciiConverter.convertFrame(previewFrames[frameIndex], settings);
  const positionedCells = positionCellsOnCanvas(result.cells, settings);
  setPreviewData(positionedCells); // Preview store, not canvas data
}, [previewFrames, frameIndex, settings]);
```

### **🔧 Core Implementation Architecture**

#### **1. Media Processing Pipeline**
```typescript
// src/utils/mediaProcessor.ts - Actual implementation
export interface MediaFile {
  file: File;
  type: 'image' | 'video';
  name: string;
  size: number;
}

export interface MediaProcessingOptions {
  targetWidth: number;
  targetHeight: number;
  maintainAspectRatio: boolean;
  cropMode: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  quality: 'low' | 'medium' | 'high';
}

// Core processor with FFmpeg integration for video
export class MediaProcessor {
  static async processImage(file: MediaFile, options: MediaProcessingOptions): Promise<ProcessingResult>;
  static async processVideo(file: MediaFile, options: MediaProcessingOptions): Promise<ProcessingResult>;
  private static async extractVideoFrames(videoFile: File): Promise<ImageFrame[]>;
}
```

#### **2. ASCII Conversion Engine**
```typescript
// src/utils/asciiConverter.ts - Brightness-based character mapping
export interface ConversionSettings {
  characterSet: string;
  characterMappingMode: 'brightness';
  useOriginalColors: boolean;
  colorQuantization: number;
  paletteSize: number;
  colorMappingMode: 'nearest' | 'dithered';
  contrastEnhancement: number;
  brightnessAdjustment: number;
  ditherStrength: number;
}

export class AsciiConverter {
  static convertFrame(imageData: ImageFrame, settings: ConversionSettings): ConversionResult {
    // 1. Extract pixel data from image frame
    // 2. Calculate brightness/luminance for each pixel
    // 3. Map brightness to character density
    // 4. Apply color quantization if enabled
    // 5. Return Map<string, Cell> for canvas rendering
  }
}
```

#### **3. Modular Import Store System**
```typescript
// src/stores/importStore.ts - Separated concerns with focused hooks
export const useImportModal = () => ({ isOpen, closeModal, openModal });
export const useImportFile = () => ({ selectedFile, setSelectedFile, processedFrames });
export const useImportProcessing = () => ({ isProcessing, progress, error });
export const useImportSettings = () => ({ settings, updateSettings });
export const useImportPreview = () => ({ frameIndex, setFrameIndex, frames });

// Clean separation allows each hook to manage specific import aspect
// Prevents monolithic store and enables targeted re-renders
```

### **🎨 User Interface Design**

#### **1. Media Import Panel Integration**
```typescript
// src/components/features/MediaImportPanel.tsx - Side panel overlay
const MediaImportPanel = () => {
  return (
    <div className={cn(
      "fixed top-0 right-0 h-full bg-background border-l border-border",
      "transition-transform duration-300 ease-out z-[60]",
      "w-96 shadow-2xl overflow-auto",
      isOpen ? "translate-x-0" : "translate-x-full"
    )}>
      <div className="flex flex-col h-full">
        {/* Header with title and close button */}
        <div className="p-4 border-b border-border">
          <h2>Import Media</h2>
        </div>
        
        {/* File upload area with drag & drop */}
        <div className="p-4 border-2 border-dashed">
          <Upload className="w-8 h-8 mx-auto" />
          <p>Drop files here or click to browse</p>
        </div>
        
        {/* Settings panel (when file selected) */}
        {selectedFile && (
          <div className="flex-1 p-4 space-y-4">
            <div>
              <Label>Character Width: {settings.characterWidth}</Label>
              <Input type="range" min="10" max="200" />
            </div>
            <div>
              <Label>Character Height: {settings.characterHeight}</Label>
              <Input type="range" min="10" max="200" />
            </div>
            <Checkbox>Live Preview</Checkbox>
            <Checkbox>Use Original Colors</Checkbox>
          </div>
        )}
        
        {/* Import controls */}
        <div className="p-4 border-t border-border">
          <Select value={importMode}>
            <option value="overwrite">Overwrite Current Frame</option>
            <option value="append">Add as New Frames</option>
          </Select>
          <Button onClick={handleImport}>Import</Button>
        </div>
      </div>
    </div>
  );
};
```

#### **2. Import Trigger Integration**
```typescript
// Added to existing ExportImportButtons.tsx dropdown
const IMPORT_OPTIONS = [
  {
    id: 'session',
    name: 'Session File',
    description: 'Load complete project',
    icon: Save,
  },
  {
    id: 'media',  // NEW: Media import option
    name: 'Image/Video',
    description: 'Convert media to ASCII',
    icon: Image,
  },
];
  {
    id: 'image' as ExportFormatId,
    name: 'Image to ASCII',
    description: 'Convert image to ASCII art',
    icon: FileImage,
  },
  {
    id: 'video' as ExportFormatId,
    name: 'Video to Animation',
    description: 'Convert video to ASCII animation',
    icon: Film,
  },
];
```

#### **3. Configuration Panel Layout**
The import panel contains four main configuration sections, using established UI patterns:

```typescript
// Panel sections using existing collapsible pattern
const ConfigurationSections = [
  {
    title: "Sizing",
    icon: Maximize2,
    component: SizingControls,
    defaultOpen: true
  },
  {
    title: "Character Mapping", 
    icon: Type,
    component: CharacterMappingControls,
    defaultOpen: true
  },
  {
    title: "Color Palettes",
    icon: Palette,
    component: ColorPaletteControls, 
    defaultOpen: false
  },
  {
    title: "Image Processing",
    icon: Settings,
    component: ImageProcessingControls,
    defaultOpen: false
  }
];
```

### **🔧 Implementation Results: Critical Architecture Decisions**

#### **Key Achievement: Frame-Safe Preview System**
The most significant accomplishment was solving the preview data corruption issue that was causing imported video frames to overwrite wrong frame data when users switched between timeline frames during preview.

**Problem Resolution:**
1. **Identified Root Cause**: Direct canvas data manipulation during preview caused frame synchronization system to save preview data to wrong frames
2. **Architectural Solution**: Independent preview overlay system that never touches actual canvas data
3. **Implementation**: Preview store with separate rendering layer in canvas renderer
4. **Result**: Bulletproof import workflow that works correctly regardless of frame switching behavior

#### **Technical Implementation Highlights**

**Media Processing Pipeline:**
- FFmpeg integration for video frame extraction
- Support for all major image/video formats (JPEG, PNG, GIF, MP4, WebM)
- Configurable output dimensions with real-time preview
- Brightness-based ASCII character mapping

**Import Workflow:**
- Drag & drop file upload with format validation
- Live preview with settings adjustment
- Import mode selection (overwrite current frame vs. append as animation)
- Non-destructive preview that doesn't affect existing work

**User Experience:**
- Side panel overlay that maintains canvas visibility during import
- Real-time settings adjustment with immediate visual feedback
- Professional import modes matching animation software standards
- Seamless integration with existing animation timeline
- Full character mapping system with presets and custom palettes
- Professional sizing controls with aspect ratio management
- Character palette editor following established UI patterns

#### **Session 3: Color Palette System & Preview Integration**
**Goal**: Dual-palette color mapping with real-time preview

**Tasks:**
1. **Dual Palette System**
   - Foreground and background palette management
   - Palette enable/disable toggles
   - Integration with existing palette store patterns
   - Color matching algorithms (nearest color, dithering)

2. **Preview System Enhancement**
   - Real-time conversion preview on canvas
   - Preview mode toggle (original vs converted)
   - Preview zoom controls for detail inspection
   - Performance optimization for large images

3. **Color Mapping Controls**
   - Color matching method selection
   - Palette import/export (following existing patterns)
   - Color quantization controls
   - Background transparency handling

**Deliverables:**
- Complete color palette system with dual palettes
- Real-time preview system with zoom and comparison
- Color matching with multiple algorithms

#### **Session 4: Image Processing & Video Support**
**Goal**: Professional image filters and video-to-animation conversion

**Tasks:**
1. **Image Processing Pipeline**
   - Brightness, contrast, highlights, shadows, midtones controls
   - Blur and sharpen filters
   - Saturation adjustment
   - Filter preview system with before/after comparison

2. **Video Processing**
   - Video file parsing and frame extraction
   - Frame rate control and sampling
   - Progress indication for video processing
   - Integration with animation timeline (add frames)

3. **Advanced Features**
   - Batch processing for multiple files
   - Processing queue with progress tracking
   - Export/import of conversion settings
   - Conversion history and undo support

**Deliverables:**
- Complete image processing filter system
- Video-to-animation conversion pipeline
- Professional-grade import workflow

### **🏗️ Technical Architecture Details**

#### **1. File Processing Pipeline**
```typescript
// src/utils/import/MediaProcessor.ts
class MediaProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  async processImageFile(file: File): Promise<ImageData> {
    const img = await this.loadImage(file);
    const imageData = this.extractImageData(img);
    return imageData;
  }
  
  async processVideoFile(file: File): Promise<ImageData[]> {
    const video = await this.loadVideo(file);
    const frames = await this.extractFrames(video);
    return frames;
  }
  
  private applyFilters(imageData: ImageData, filters: ImageFilterSettings): ImageData {
    let result = imageData;
    
    // Apply filters in optimal order
    result = this.adjustBrightness(result, filters.brightness);
    result = this.adjustContrast(result, filters.contrast);
    result = this.adjustSaturation(result, filters.saturation);
    // ... additional filters
    
    return result;
  }
}
```

#### **2. ASCII Conversion Engine**
```typescript
// src/utils/import/ASCIIConverter.ts
class ASCIIConverter {
  convertImageToASCII(
    imageData: ImageData, 
    settings: ConversionSettings
  ): Map<string, Cell> {
    const result = new Map<string, Cell>();
    
    for (let y = 0; y < settings.sizing.height; y++) {
      for (let x = 0; x < settings.sizing.width; x++) {
        const pixel = this.getPixelAt(imageData, x, y);
        const cell = this.pixelToCell(pixel, settings);
        result.set(`${x},${y}`, cell);
      }
    }
    
    return result;
  }
  
  private pixelToCell(pixel: RGBA, settings: ConversionSettings): Cell {
    const char = this.getCharacterForPixel(pixel, settings.characters);
    const fgColor = this.getColorForPixel(pixel, settings.colors.foregroundPalette);
    const bgColor = this.getBackgroundColor(pixel, settings.colors.backgroundPalette);
    
    return { char, color: fgColor, bgColor };
  }
}
```

#### **3. State Management**
```typescript
// src/stores/importStore.ts - New store for import operations
interface ImportState {
  // Panel state
  isImportPanelOpen: boolean;
  currentStage: ImportStage;
  
  // Processing state
  isProcessing: boolean;
  progress: number;
  currentFile: File | null;
  
  // Configuration
  sizingSettings: SizingSettings;
  characterSettings: CharacterMappingSettings;
  colorSettings: ColorPaletteSettings;
  filterSettings: ImageFilterSettings;
  
  // Preview
  previewMode: boolean;
  originalImageData: ImageData | null;
  convertedData: Map<string, Cell> | null;
}

// Actions
interface ImportActions {
  openImportPanel: (file?: File) => void;
  closeImportPanel: () => void;
  setStage: (stage: ImportStage) => void;
  updateSettings: (settings: Partial<ConversionSettings>) => void;
  processFile: (file: File) => Promise<void>;
  importToCanvas: () => void;
  importToAnimation: () => void;
}
```

#### **4. Canvas Integration**
```typescript
// Preview mode integration with existing canvas system
const useImportPreview = () => {
  const { previewMode, convertedData } = useImportStore();
  const { setPreviewData, clearPreviewData } = useCanvasContext();
  
  useEffect(() => {
    if (previewMode && convertedData) {
      setPreviewData(convertedData);
    } else {
      clearPreviewData();
    }
  }, [previewMode, convertedData]);
};
```

### **🎯 Next Phase: Character Mapping System Enhancement**

#### **Character Palette System (Following Color Palette Patterns)**
The character mapping system should mirror our successful color palette architecture, allowing users to define custom character sets for different artistic styles and conversion needs.

**Core Requirements:**
```typescript
// src/types/palette.ts - Extended character palette definitions
export interface CharacterPalette {
  id: string;
  name: string;
  characters: string[];           // Ordered by density (light to dark)
  isCustom: boolean;             // User-created vs preset
  category: 'ascii' | 'unicode' | 'blocks' | 'custom';
}

export interface CharacterMappingSettings {
  activePalette: CharacterPalette;
  mappingMethod: 'brightness' | 'luminance' | 'contrast' | 'edge-detection';
  invertDensity: boolean;         // Reverse light/dark mapping
  characterSpacing: number;       // Spacing between characters (1.0 = normal)
  useCustomOrder: boolean;        // Allow manual character reordering
}
```

**Default Character Palettes:**
```typescript
// src/constants/defaultCharacterPalettes.ts
export const DEFAULT_CHARACTER_PALETTES: CharacterPalette[] = [
  {
    id: 'minimal',
    name: 'Minimal ASCII',
    characters: [' ', '.', ':', '-', '=', '+', '*', '#', '%', '@'],
    isCustom: false,
    category: 'ascii'
  },
  {
    id: 'standard', 
    name: 'Standard ASCII',
    characters: [' ', '`', '.', "'", ',', ':', ';', 'c', 'l', 'x', 'o', 'k', 'X', 'd', 'O', '0', 'K', 'N'],
    isCustom: false,
    category: 'ascii'
  },
  {
    id: 'blocks',
    name: 'Block Characters',
    characters: [' ', '░', '▒', '▓', '█'],
    isCustom: false,
    category: 'blocks'
  },
  {
    id: 'extended',
    name: 'Extended Unicode',
    characters: [' ', '·', '∘', '○', '●', '◐', '◑', '◒', '◓', '⬛'],
    isCustom: false,
    category: 'unicode'
  }
];
```

**Character Palette Editor Component:**
```typescript
// src/components/features/CharacterPaletteEditor.tsx - Following ColorPicker patterns
interface CharacterPaletteEditorProps {
  palette: CharacterPalette;
  onUpdate: (palette: CharacterPalette) => void;
  onSave?: () => void;
  onCancel?: () => void;
}

const CharacterPaletteEditor: React.FC<CharacterPaletteEditorProps> = ({
  palette, onUpdate, onSave, onCancel
}) => {
  return (
    <div className="character-palette-editor">
      {/* Palette Header */}
      <div className="palette-header">
        <Input 
          value={palette.name}
          onChange={(e) => onUpdate({...palette, name: e.target.value})}
          placeholder="Palette Name"
        />
      </div>
      
      {/* Character Grid */}
      <div className="character-grid">
        {palette.characters.map((char, index) => (
          <CharacterCell
            key={index}
            character={char}
            index={index}
            onEdit={(newChar) => updateCharacterAtIndex(index, newChar)}
            onDelete={() => removeCharacterAtIndex(index)}
            onReorder={(fromIndex, toIndex) => reorderCharacters(fromIndex, toIndex)}
          />
        ))}
        <button onClick={addNewCharacter}>+</button>
      </div>
      
      {/* Preview Section */}
      <div className="palette-preview">
        <div className="brightness-scale">
          {palette.characters.map((char, index) => (
            <span key={index} style={{opacity: (index + 1) / palette.characters.length}}>
              {char}
            </span>
          ))}
        </div>
      </div>
      
      {/* Actions */}
      <div className="palette-actions">
        <Button onClick={onSave}>Save Palette</Button>
        <Button onClick={onCancel} variant="outline">Cancel</Button>
      </div>
    </div>
  );
};
```

**Integration with Import Settings:**
```typescript
// Enhanced MediaImportPanel.tsx settings section
const CharacterMappingControls = () => {
  const { settings, updateSettings } = useImportSettings();
  const [showPaletteEditor, setShowPaletteEditor] = useState(false);
  
  return (
    <div className="character-mapping-controls">
      {/* Palette Selection */}
      <div className="palette-selector">
        <Label>Character Palette</Label>
        <Select 
          value={settings.characterMapping.activePalette.id}
          onValueChange={(paletteId) => selectCharacterPalette(paletteId)}
        >
          {CHARACTER_PALETTES.map(palette => (
            <option key={palette.id} value={palette.id}>{palette.name}</option>
          ))}
        </Select>
        <Button onClick={() => setShowPaletteEditor(true)}>Edit Palette</Button>
      </div>
      
      {/* Mapping Method */}
      <div className="mapping-method">
        <Label>Mapping Method</Label>
        <Select value={settings.characterMapping.mappingMethod}>
          <option value="brightness">Brightness</option>
          <option value="luminance">Luminance</option>
          <option value="contrast">Contrast</option>
          <option value="edge-detection">Edge Detection</option>
        </Select>
      </div>
      
      {/* Additional Controls */}
      <Checkbox 
        checked={settings.characterMapping.invertDensity}
        onCheckedChange={(checked) => updateCharacterMapping({invertDensity: checked})}
      >
        Invert Character Density
      </Checkbox>
      
      {/* Character Preview */}
      <div className="character-preview">
        <Label>Character Preview</Label>
        <div className="preview-grid">
          {settings.characterMapping.activePalette.characters.map((char, index) => (
            <span key={index} className="preview-char">{char}</span>
          ))}
        </div>
      </div>
    </div>
  );
};
```

**Store Integration:**
```typescript
// Enhanced src/stores/importStore.ts with character palette management
interface ImportSettingsState extends BaseImportState {
  characterPalettes: CharacterPalette[];
  
  // Actions
  addCharacterPalette: (palette: CharacterPalette) => void;
  updateCharacterPalette: (id: string, updates: Partial<CharacterPalette>) => void;
  deleteCharacterPalette: (id: string) => void;
  selectCharacterPalette: (id: string) => void;
  duplicateCharacterPalette: (id: string) => void;
}
```

**ASCII Conversion Integration:**
```typescript
// Enhanced src/utils/asciiConverter.ts with character palette support
export class AsciiConverter {
  static convertFrame(imageData: ImageFrame, settings: ConversionSettings): ConversionResult {
    const { characterMapping } = settings;
    
    return imageData.pixels.map(pixel => {
      // Calculate pixel value based on mapping method
      const pixelValue = this.calculatePixelValue(pixel, characterMapping.mappingMethod);
      
      // Map to character based on palette
      const characterIndex = this.mapValueToCharacterIndex(
        pixelValue, 
        characterMapping.activePalette.characters.length,
        characterMapping.invertDensity
      );
      
      const character = characterMapping.activePalette.characters[characterIndex];
      
      return {
        char: character,
        color: settings.useOriginalColors ? pixel.color : settings.defaultColor,
        bgColor: settings.useBackgroundColors ? pixel.bgColor : 'transparent'
      };
    });
  }
  
  private static calculatePixelValue(pixel: RGBA, method: MappingMethod): number {
    switch (method) {
      case 'brightness':
        return (pixel.r + pixel.g + pixel.b) / 3;
      case 'luminance':
        return 0.299 * pixel.r + 0.587 * pixel.g + 0.114 * pixel.b;
      case 'contrast':
        return this.calculateContrast(pixel);
      case 'edge-detection':
        return this.calculateEdgeStrength(pixel);
      default:
        return (pixel.r + pixel.g + pixel.b) / 3;
    }
  }
}
```

**Implementation Priority:**
1. **Character Palette Data Structure** - Extend existing palette types and constants
2. **Character Palette Editor** - Build UI component following ColorPicker patterns  
3. **Import Settings Integration** - Add character mapping controls to import panel
4. **ASCII Converter Enhancement** - Integrate character palette with conversion algorithm
5. **Palette Management** - Save/load custom character palettes following existing patterns

This system will provide users with the same level of customization for character mapping that they currently have for color palettes, enabling diverse ASCII art styles from minimal terminal-friendly characters to rich Unicode artistic symbols.

### **🔗 System Integration Results**

#### **Canvas & Animation Integration**
- **Independent Preview Overlay**: Preview renders as separate layer without affecting canvas data
- **Video Frame Import**: Seamless integration with animation timeline for multi-frame imports
- **Frame Synchronization**: Preview system respects existing frame sync patterns and doesn't interfere
- **Tool Coordination**: Import panel integrates with existing tool state and doesn't break other functionality

#### **Architecture Benefits**
- **Non-destructive Workflow**: Users can experiment with import settings without losing existing work
- **Frame-safe Operations**: Switching between timeline frames during preview doesn't corrupt data
- **Professional Import Modes**: Overwrite and append modes work correctly as expected
- **Scalable Design**: Preview overlay system can be extended for other features requiring visual previews

### **� Future Enhancement Points**

The modular architecture enables future enhancements:

#### **Advanced Conversion Features**
- **Custom Character Sets**: User-defined character mappings beyond default ASCII sets
- **Edge Detection**: Outline-based ASCII conversion for different artistic styles  
- **Color Quantization**: Advanced color palette reduction and dithering options
- **Batch Processing**: Import multiple files simultaneously with consistent settings

#### **Workflow Enhancements**
- **Import Templates**: Save and reuse conversion settings for consistent results
- **Comparison View**: Side-by-side preview of original vs. converted media
- **Undo Integration**: Import operations integrated with existing undo/redo system
- **Export Integration**: Direct export of imported media in various formats
- Filter accuracy and performance benchmarks

#### **Integration Tests**
- Canvas preview mode compatibility
- Animation timeline integration
- Existing tool compatibility during preview
- State management consistency

### **🚀 Future Enhancement Opportunities**

#### **Advanced Processing Features**
- **Edge Detection**: ASCII line art generation
- **Histogram Analysis**: Intelligent character distribution
- **Pattern Recognition**: Specialized ASCII art styles
- **AI Enhancement**: ML-based ASCII art optimization

#### **Workflow Improvements**
- **Batch Processing**: Multiple file import queues
- **Template System**: Saved conversion setting presets
- **Plugin Architecture**: User-defined conversion algorithms
- **Cloud Processing**: Server-side heavy processing

#### **Output Enhancements**
- **Multi-frame GIF**: Animated ASCII output
- **SVG Export**: Vector-based ASCII art
- **HTML Export**: Web-ready ASCII animations
- **Print Optimization**: High-resolution ASCII printing

---

This Phase 4 implementation establishes ASCII Motion as a professional tool for media-to-ASCII conversion with a breakthrough independent preview overlay system that ensures frame-safe import operations. The architecture maintains consistency with existing application patterns while introducing innovative solutions to complex data synchronization challenges. The modular design supports future enhancements while providing immediate, robust value for users converting visual media into ASCII art.

# 🌈 **Phase 5: Advanced Gradient Fill Tool** - 📋 **PLANNED**

## Overview
Implementation of a sophisticated gradient fill tool that applies customizable character, foreground color, and background color gradients to canvas areas with matching cell criteria. Features interactive visual controls, multiple interpolation methods, and professional UI integration.

## 🎯 **Core Requirements**

### **Gradient Types**
- **Linear Gradients**: Flow along user-defined line from start to end point
- **Radial Gradients**: Radiate outward from start point with end point defining radius
- **Property Support**: Independent gradients for character, text color, and background color
- **Stop System**: Up to 8 customizable stops per property with visual positioning

### **Fill Area Selection**
- **Contiguous Mode**: Fill connected areas (like current paint bucket contiguous)
- **Non-contiguous Mode**: Fill all matching cells on canvas (like paint bucket non-contiguous)
- **Matching Criteria**: Toggleable matching for character, color, and background color properties
- **Smart Defaults**: Inherit paint bucket matching logic and extend for gradient use

### **Interactive Preview System**
- **Visual Controls**: Draggable start/end points with dotted line overlay
- **Stop Positioning**: Visual stop indicators along gradient line with property values
- **Live Preview**: Real-time gradient application preview during editing
- **Escape/Enter Controls**: Cancel/confirm workflow with clean state management

## 🏗️ **Architecture & Implementation Plan**

### **Phase 5.1: Core Types & Store Foundation**

#### **1. Type Definitions (`src/types/index.ts`)**
```typescript
export type Tool = 
  | 'pencil' 
  | 'eraser' 
  | 'paintbucket' 
  | 'select' 
  | 'lasso'
  | 'magicwand'
  | 'rectangle' 
  | 'ellipse'
  | 'eyedropper'
  | 'line'
  | 'text'
  | 'brush'
  | 'gradientfill'; // NEW

// Gradient-specific types
export type InterpolationMethod = 'linear' | 'constant' | 'bayer2x2' | 'bayer4x4' | 'noise';
export type GradientType = 'linear' | 'radial';
export type QuantizeStepCount =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 'infinite';

export interface GradientStop {
  position: number; // 0-1 along gradient line
  value: string; // Character, color hex, or bgColor hex
}

export interface GradientProperty {
  enabled: boolean;
  stops: GradientStop[];
  interpolation: InterpolationMethod;
  ditherStrength: number; // 0-100 strength applied only to dithering modes
  quantizeSteps: QuantizeStepCount; // Linear interpolation step count ('infinite' for smooth)
}

export interface GradientDefinition {
  type: GradientType;
  character: GradientProperty;
  textColor: GradientProperty;
  backgroundColor: GradientProperty;
}

export interface GradientState {
  // Fill area matching (extends paint bucket logic)
  contiguous: boolean;
  matchChar: boolean;
  matchColor: boolean;
  matchBgColor: boolean;
  
  // Gradient definition
  definition: GradientDefinition;
  
  // Interactive state
  isApplying: boolean;
  startPoint: { x: number; y: number } | null;
  endPoint: { x: number; y: number } | null;
  previewData: Map<string, Cell> | null;
}
```

#### **2. Tool Store Extension (`src/stores/toolStore.ts`)**
```typescript
interface ToolStoreState extends ToolState {
  // ... existing properties
  
  // Gradient fill state
  gradientState: GradientState;
  
  // Actions
  setGradientContiguous: (contiguous: boolean) => void;
  setGradientMatchCriteria: (criteria: { char: boolean; color: boolean; bgColor: boolean }) => void;
  setGradientDefinition: (definition: GradientDefinition) => void;
  setGradientApplying: (isApplying: boolean) => void;
  setGradientPoints: (start: { x: number; y: number } | null, end: { x: number; y: number } | null) => void;
  setGradientPreview: (previewData: Map<string, Cell> | null) => void;
  resetGradientState: () => void;
}
```

#### **3. Gradient Store (`src/stores/gradientStore.ts`)**
```typescript
import { create } from 'zustand';
import { DEFAULT_COLORS } from '../constants';

interface GradientStoreState {
  // Panel state
  isOpen: boolean;
  
  // Current gradient configuration
  definition: GradientDefinition;
  
  // Interactive application state
  isApplying: boolean;
  startPoint: { x: number; y: number } | null;
  endPoint: { x: number; y: number } | null;
  previewData: Map<string, Cell> | null;
  
  // Fill area configuration
  contiguous: boolean;
  matchChar: boolean;
  matchColor: boolean;
  matchBgColor: boolean;
  
  // Actions
  setIsOpen: (open: boolean) => void;
  updateDefinition: (definition: Partial<GradientDefinition>) => void;
  updateProperty: (property: 'character' | 'textColor' | 'backgroundColor', update: Partial<GradientProperty>) => void;
  addStop: (property: 'character' | 'textColor' | 'backgroundColor') => void;
  removeStop: (property: 'character' | 'textColor' | 'backgroundColor', index: number) => void;
  updateStop: (property: 'character' | 'textColor' | 'backgroundColor', index: number, update: Partial<GradientStop>) => void;
  
  // Application state
  setApplying: (isApplying: boolean) => void;
  setPoints: (start: { x: number; y: number } | null, end: { x: number; y: number } | null) => void;
  setPreview: (previewData: Map<string, Cell> | null) => void;
  
  // Fill configuration
  setContiguous: (contiguous: boolean) => void;
  setMatchCriteria: (criteria: { char: boolean; color: boolean; bgColor: boolean }) => void;
  
  // Utility
  reset: () => void;
}
```

### **Phase 5.2: Gradient Algorithm Core**

#### **4. Gradient Engine (`src/utils/gradientEngine.ts`)**
```typescript
import type { Cell, GradientDefinition, InterpolationMethod } from '../types';

export interface GradientPoint {
  x: number;
  y: number;
}

export interface GradientOptions {
  startPoint: GradientPoint;
  endPoint: GradientPoint;
  definition: GradientDefinition;
  fillArea: Set<string>; // Cell keys to apply gradient to
}

// Core gradient calculation
export const calculateGradientCells = (options: GradientOptions): Map<string, Cell> => {
  const { startPoint, endPoint, definition, fillArea } = options;
  const result = new Map<string, Cell>();
  
  fillArea.forEach(cellKey => {
    const [x, y] = cellKey.split(',').map(Number);
    const position = calculatePositionOnGradient(x, y, startPoint, endPoint, definition.type);
    
    const gradientCell: Cell = {
      char: definition.character.enabled ? 
        interpolateProperty(position, definition.character) : ' ',
      color: definition.textColor.enabled ? 
        interpolateProperty(position, definition.textColor) : '#FFFFFF',
      bgColor: definition.backgroundColor.enabled ? 
        interpolateProperty(position, definition.backgroundColor) : 'transparent'
    };
    
    result.set(cellKey, gradientCell);
  });
  
  return result;
};

// Position calculation for linear/radial gradients
const calculatePositionOnGradient = (
  x: number, 
  y: number, 
  start: GradientPoint, 
  end: GradientPoint, 
  type: 'linear' | 'radial'
): number => {
  if (type === 'linear') {
    // Project point onto line and calculate 0-1 position
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return 0;
    
    const dot = (x - start.x) * dx + (y - start.y) * dy;
    return Math.max(0, Math.min(1, dot / (length * length)));
  } else {
    // Radial: distance from start point, normalized by end point distance
    const distToStart = Math.sqrt((x - start.x) ** 2 + (y - start.y) ** 2);
    const maxRadius = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
    
    return maxRadius === 0 ? 0 : Math.min(1, distToStart / maxRadius);
  }
};

// Property interpolation with method support
const interpolateProperty = (position: number, property: GradientProperty): string => {
  const { stops, interpolation } = property;
  
  if (stops.length === 0) return '';
  if (stops.length === 1) return stops[0].value;
  
  // Sort stops by position
  const sortedStops = [...stops].sort((a, b) => a.position - b.position);
  
  // Find surrounding stops
  let leftStop = sortedStops[0];
  let rightStop = sortedStops[sortedStops.length - 1];
  
  for (let i = 0; i < sortedStops.length - 1; i++) {
    if (position >= sortedStops[i].position && position <= sortedStops[i + 1].position) {
      leftStop = sortedStops[i];
      rightStop = sortedStops[i + 1];
      break;
    }
  }
  
  switch (interpolation) {
    case 'constant':
      return leftStop.value;
    case 'linear':
      return interpolateLinear(position, leftStop, rightStop);
    case 'bayer2x2':
    case 'bayer4x4':
      return applyBayerDither(position, leftStop, rightStop, interpolation);
    case 'noise':
      return applyNoiseDither(position, leftStop, rightStop);
    default:
      return leftStop.value;
  }
};

// Linear interpolation for colors and characters
const interpolateLinear = (position: number, left: GradientStop, right: GradientStop): string => {
  if (left.position === right.position) return left.value;
  
  const t = (position - left.position) / (right.position - left.position);
  
  // Character interpolation (Unicode code point blending)
  if (left.value.length === 1 && right.value.length === 1) {
    const leftCode = left.value.charCodeAt(0);
    const rightCode = right.value.charCodeAt(0);
    const interpolatedCode = Math.round(leftCode + t * (rightCode - leftCode));
    return String.fromCharCode(interpolatedCode);
  }
  
  // Color interpolation (hex colors)
  if (left.value.startsWith('#') && right.value.startsWith('#')) {
    return interpolateColor(left.value, right.value, t);
  }
  
  return t < 0.5 ? left.value : right.value;
};

// Color interpolation helper
const interpolateColor = (color1: string, color2: string, t: number): string => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return color1;
  
  const r = Math.round(rgb1.r + t * (rgb2.r - rgb1.r));
  const g = Math.round(rgb1.g + t * (rgb2.g - rgb1.g));
  const b = Math.round(rgb1.b + t * (rgb2.b - rgb1.b));
  
  return rgbToHex(r, g, b);
};

// Dithering implementations
const applyBayerDither = (
  position: number, 
  left: GradientStop, 
  right: GradientStop, 
  method: 'bayer2x2' | 'bayer4x4'
): string => {
  // Implementation of ordered Bayer dithering
  // Uses only the colors defined in the stops
  // Creates visual patterns between stop values
  // TODO: Implement Bayer matrix dithering
  return position < 0.5 ? left.value : right.value; // Placeholder
};

const applyNoiseDither = (position: number, left: GradientStop, right: GradientStop): string => {
  // Implementation of noise-based dithering
  // TODO: Implement noise dithering algorithm
  const noise = Math.random();
  return (position + noise * 0.1) < 0.5 ? left.value : right.value; // Placeholder
};

// Utility functions
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};
```

### **Phase 5.3: Tool Integration**

#### **5. Gradient Fill Tool Component (`src/components/tools/GradientFillTool.tsx`)**
```typescript
import React from 'react';
import { useGradientFillTool } from '../../hooks/useGradientFillTool';
import { useGradientStore } from '../../stores/gradientStore';

/**
 * Gradient Fill Tool Component
 * Handles gradient fill behavior and interactive preview
 */
export const GradientFillTool: React.FC = () => {
  // The gradient fill logic is handled by useGradientFillTool hook
  useGradientFillTool();
  
  return null; // No direct UI - handles behavior through hooks
};

/**
 * Gradient Fill Tool Status Component
 * Provides visual feedback about the gradient fill tool
 */
export const GradientFillToolStatus: React.FC = () => {
  const { isApplying, definition, contiguous } = useGradientStore();
  
  const enabledProperties = [
    definition.character.enabled && 'Character',
    definition.textColor.enabled && 'Color',
    definition.backgroundColor.enabled && 'Background'
  ].filter(Boolean).join(', ');
  
  const fillMode = contiguous ? 'connected areas' : 'all matching cells';
  
  if (isApplying) {
    return (
      <span className="text-muted-foreground">
        Gradient Fill: Click to set start point, drag to define gradient line
      </span>
    );
  }
  
  return (
    <span className="text-muted-foreground">
      Gradient Fill: Will apply {enabledProperties || 'no properties'} to {fillMode}
    </span>
  );
};
```

#### **6. Gradient Fill Hook (`src/hooks/useGradientFillTool.ts`)**
```typescript
import { useCallback, useEffect } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useGradientStore } from '../stores/gradientStore';
import { useToolStore } from '../stores/toolStore';
import { calculateGradientCells } from '../utils/gradientEngine';
import { useAnimationHistory } from './useAnimationHistory';

export const useGradientFillTool = () => {
  const { addToHistory } = useAnimationHistory();
  const { 
    isApplying, 
    startPoint, 
    endPoint, 
    definition, 
    contiguous, 
    matchChar, 
    matchColor, 
    matchBgColor,
    setApplying, 
    setPoints, 
    setPreview,
    reset 
  } = useGradientStore();
  
  const { cells, getCell, setCanvasData } = useCanvasStore();
  const { activeTool } = useToolStore();
  
  // Handle canvas click during gradient application
  const handleCanvasClick = useCallback((x: number, y: number) => {
    if (activeTool !== 'gradientfill') return;
    
    if (!isApplying) {
      // First click - start applying gradient
      setApplying(true);
      setPoints({ x, y }, null);
      return;
    }
    
    if (startPoint && !endPoint) {
      // Second click - set end point and generate preview
      const newEndPoint = { x, y };
      setPoints(startPoint, newEndPoint);
      generatePreview(startPoint, newEndPoint);
      return;
    }
  }, [activeTool, isApplying, startPoint, endPoint, setApplying, setPoints]);
  
  // Generate gradient preview
  const generatePreview = useCallback((start: { x: number; y: number }, end: { x: number; y: number }) => {
    // Find fill area using same logic as paint bucket
    const fillArea = findFillArea(start.x, start.y);
    
    // Calculate gradient cells
    const gradientCells = calculateGradientCells({
      startPoint: start,
      endPoint: end,
      definition,
      fillArea
    });
    
    setPreview(gradientCells);
  }, [definition, setPreview]);
  
  // Find fill area based on matching criteria
  const findFillArea = useCallback((startX: number, startY: number): Set<string> => {
    const targetCell = getCell(startX, startY);
    if (!targetCell) return new Set();
    
    const fillArea = new Set<string>();
    
    // Use same logic as paint bucket tool
    if (contiguous) {
      // Contiguous fill - flood fill algorithm
      const toFill: { x: number; y: number }[] = [{ x: startX, y: startY }];
      const visited = new Set<string>();
      
      while (toFill.length > 0) {
        const { x, y } = toFill.pop()!;
        const key = `${x},${y}`;
        
        if (visited.has(key)) continue;
        visited.add(key);
        
        const currentCell = getCell(x, y);
        if (!currentCell || !matchesTarget(currentCell, targetCell)) continue;
        
        fillArea.add(key);
        
        // Add adjacent cells
        const adjacent = [
          { x: x - 1, y },
          { x: x + 1, y },
          { x, y: y - 1 },
          { x, y: y + 1 }
        ];
        
        for (const adj of adjacent) {
          const adjKey = `${adj.x},${adj.y}`;
          if (!visited.has(adjKey)) {
            toFill.push(adj);
          }
        }
      }
    } else {
      // Non-contiguous fill - all matching cells
      cells.forEach((cell, key) => {
        if (matchesTarget(cell, targetCell)) {
          fillArea.add(key);
        }
      });
    }
    
    return fillArea;
  }, [contiguous, matchChar, matchColor, matchBgColor, cells, getCell]);
  
  // Check if cell matches target based on criteria
  const matchesTarget = useCallback((cell: any, target: any): boolean => {
    if (matchChar && cell.char !== target.char) return false;
    if (matchColor && cell.color !== target.color) return false;
    if (matchBgColor && cell.bgColor !== target.bgColor) return false;
    return true;
  }, [matchChar, matchColor, matchBgColor]);
  
  // Apply gradient (Enter key)
  const applyGradient = useCallback(() => {
    if (!isApplying || !previewData) return;
    
    const originalCells = new Map(cells);
    
    // Apply gradient to canvas
    const newCells = new Map(cells);
    previewData.forEach((cell, key) => {
      newCells.set(key, cell);
    });
    
    setCanvasData(newCells);
    
    // Add to history
    addToHistory({
      type: 'canvas_edit',
      timestamp: Date.now(),
      description: 'Apply gradient fill',
      data: {
        canvasData: originalCells,
        frameIndex: 0 // TODO: Get current frame index
      }
    });
    
    // Reset state
    reset();
  }, [isApplying, previewData, cells, setCanvasData, addToHistory, reset]);
  
  // Cancel gradient (Escape key)
  const cancelGradient = useCallback(() => {
    if (!isApplying) return;
    reset();
  }, [isApplying, reset]);
  
  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (activeTool !== 'gradientfill' || !isApplying) return;
      
      if (event.key === 'Enter') {
        event.preventDefault();
        applyGradient();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        cancelGradient();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, isApplying, applyGradient, cancelGradient]);
  
  // Reset when switching tools
  useEffect(() => {
    if (activeTool !== 'gradientfill') {
      reset();
    }
  }, [activeTool, reset]);
  
  return {
    handleCanvasClick,
    isApplying,
    startPoint,
    endPoint
  };
};
```

### **Phase 5.4: UI Components**

#### **7. Gradient Panel (`src/components/features/GradientPanel.tsx`)**
```typescript
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Collapsible, CollapsibleContent } from '../ui/collapsible';
import { CollapsibleHeader } from '../common/CollapsibleHeader';
import { 
  Plus, 
  Edit3, 
  X, 
  Palette, 
  Type, 
  Square,
  ArrowRight,
  Circle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { PANEL_ANIMATION } from '../../constants';
import { useGradientStore } from '../../stores/gradientStore';
import { useToolStore } from '../../stores/toolStore';
import type { InterpolationMethod, GradientType } from '../../types';

export function GradientPanel() {
  const { isOpen, setIsOpen } = useGradientStore();
  const { activeTool } = useToolStore();
  
  // Auto-open when gradient tool is selected
  React.useEffect(() => {
    if (activeTool === 'gradientfill') {
      setIsOpen(true);
    }
  }, [activeTool, setIsOpen]);
  
  // Auto-close when different tool is selected
  React.useEffect(() => {
    if (activeTool !== 'gradientfill' && isOpen) {
      setIsOpen(false);
    }
  }, [activeTool, isOpen, setIsOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div 
      className={cn(
        'fixed right-0 top-0 h-full bg-muted/20 border-l border-border z-30',
        'w-80 overflow-hidden',
        PANEL_ANIMATION.TRANSITION,
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Gradient Fill</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <GradientTypeSelector />
            <FillAreaSettings />
            <Separator />
            <GradientPropertyEditor property="character" />
            <GradientPropertyEditor property="textColor" />
            <GradientPropertyEditor property="backgroundColor" />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// Gradient type selector (Linear/Radial)
const GradientTypeSelector: React.FC = () => {
  const { definition, updateDefinition } = useGradientStore();
  
  return (
    <div className="space-y-2">
      <Label>Gradient Type</Label>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={definition.type === 'linear' ? 'default' : 'outline'}
          onClick={() => updateDefinition({ type: 'linear' })}
          className="flex items-center gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          Linear
        </Button>
        <Button
          variant={definition.type === 'radial' ? 'default' : 'outline'}
          onClick={() => updateDefinition({ type: 'radial' })}
          className="flex items-center gap-2"
        >
          <Circle className="w-4 h-4" />
          Radial
        </Button>
      </div>
    </div>
  );
};

// Fill area configuration
const FillAreaSettings: React.FC = () => {
  const { 
    contiguous, 
    matchChar, 
    matchColor, 
    matchBgColor,
    setContiguous,
    setMatchCriteria 
  } = useGradientStore();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Fill Area</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="contiguous">Contiguous</Label>
          <Switch
            id="contiguous"
            checked={contiguous}
            onCheckedChange={setContiguous}
          />
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Selects same:</Label>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="match-char" className="text-xs">Character</Label>
              <Switch
                id="match-char"
                checked={matchChar}
                onCheckedChange={(checked) => setMatchCriteria({ char: checked, color: matchColor, bgColor: matchBgColor })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="match-color" className="text-xs">Text Color</Label>
              <Switch
                id="match-color"
                checked={matchColor}
                onCheckedChange={(checked) => setMatchCriteria({ char: matchChar, color: checked, bgColor: matchBgColor })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="match-bg" className="text-xs">Background</Label>
              <Switch
                id="match-bg"
                checked={matchBgColor}
                onCheckedChange={(checked) => setMatchCriteria({ char: matchChar, color: matchColor, bgColor: checked })}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Individual property editor (Character, Text Color, Background Color)
interface GradientPropertyEditorProps {
  property: 'character' | 'textColor' | 'backgroundColor';
}

const GradientPropertyEditor: React.FC<GradientPropertyEditorProps> = ({ property }) => {
  const { definition, updateProperty, addStop, removeStop, updateStop } = useGradientStore();
  const { selectedChar, selectedColor, selectedBgColor } = useToolStore();
  
  const propertyData = definition[property];
  const [isExpanded, setIsExpanded] = useState(propertyData.enabled);
  
  const getIcon = () => {
    switch (property) {
      case 'character': return <Type className="w-4 h-4" />;
      case 'textColor': return <Palette className="w-4 h-4" />;
      case 'backgroundColor': return <Square className="w-4 h-4" />;
    }
  };
  
  const getLabel = () => {
    switch (property) {
      case 'character': return 'Character';
      case 'textColor': return 'Text Color';
      case 'backgroundColor': return 'Background Color';
    }
  };
  
  const getDefaultValue = () => {
    switch (property) {
      case 'character': return selectedChar;
      case 'textColor': return selectedColor;
      case 'backgroundColor': return selectedBgColor === 'transparent' ? '#808080' : selectedBgColor;
    }
  };
  
  React.useEffect(() => {
    setIsExpanded(propertyData.enabled);
  }, [propertyData.enabled]);
  
  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleHeader 
          isOpen={isExpanded}
          onToggle={() => setIsExpanded(!isExpanded)}
          className="px-6 py-4"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {getIcon()}
              <span className="font-medium">{getLabel()}</span>
            </div>
            <Switch
              checked={propertyData.enabled}
              onCheckedChange={(enabled) => {
                updateProperty(property, { enabled });
                if (enabled && propertyData.stops.length === 0) {
                  // Initialize with default stops
                  updateProperty(property, {
                    stops: [
                      { position: 0, value: getDefaultValue() },
                      { position: 1, value: property === 'character' ? '@' : '#FFFFFF' }
                    ]
                  });
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </CollapsibleHeader>
        
        <CollapsibleContent>
          <CardContent className="space-y-3">
            {/* Interpolation Method */}
            <div className="space-y-2">
              <Label className="text-xs">Interpolation</Label>
              <Select
                value={propertyData.interpolation}
                onValueChange={(value: InterpolationMethod) => 
                  updateProperty(property, { interpolation: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear</SelectItem>
                  <SelectItem value="constant">Constant</SelectItem>
                  <SelectItem value="bayer2x2">2x2 Bayer Dither</SelectItem>
                  <SelectItem value="bayer4x4">4x4 Bayer Dither</SelectItem>
                  <SelectItem value="noise">Noise Dither</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Gradient Stops */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Stops ({propertyData.stops.length}/8)</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addStop(property)}
                  disabled={propertyData.stops.length >= 8}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {propertyData.stops.map((stop, index) => (
                  <GradientStopEditor
                    key={index}
                    property={property}
                    stop={stop}
                    index={index}
                    onUpdate={(update) => updateStop(property, index, update)}
                    onRemove={() => removeStop(property, index)}
                    canRemove={propertyData.stops.length > 2}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

// Individual stop editor
interface GradientStopEditorProps {
  property: 'character' | 'textColor' | 'backgroundColor';
  stop: any; // GradientStop
  index: number;
  onUpdate: (update: any) => void;
  onRemove: () => void;
  canRemove: boolean;
}

const GradientStopEditor: React.FC<GradientStopEditorProps> = ({ 
  property, 
  stop, 
  index, 
  onUpdate, 
  onRemove, 
  canRemove 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  
  const handleDoubleClick = () => {
    setIsEditing(true);
  };
  
  const getDisplayValue = () => {
    if (property === 'character') {
      return stop.value;
    }
    return (
      <div 
        className="w-4 h-4 border border-border rounded"
        style={{ backgroundColor: stop.value }}
      />
    );
  };
  
  return (
    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
      <span className="text-xs text-muted-foreground w-6">#{index + 1}</span>
      
      <div 
        className="flex-1 flex items-center justify-center min-h-6 bg-background border border-border rounded cursor-pointer hover:bg-muted/50"
        onDoubleClick={handleDoubleClick}
      >
        {getDisplayValue()}
      </div>
      
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsEditing(!isEditing)}
        className="h-6 w-6 p-0"
      >
        <Edit3 className="w-3 h-3" />
      </Button>
      
      {canRemove && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onRemove}
          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
        >
          <X className="w-3 h-3" />
        </Button>
      )}
      
      {isEditing && (
        <div className="absolute inset-0 bg-background border border-border rounded p-2 z-10">
          {/* TODO: Add character picker or color picker based on property */}
          <Input
            value={stop.value}
            onChange={(e) => onUpdate({ value: e.target.value })}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                setIsEditing(false);
              }
            }}
            autoFocus
            className="h-6"
          />
        </div>
      )}
    </div>
  );
};
```

#### **8. Canvas Overlay Integration (`src/components/features/CanvasOverlay.tsx`)**
```typescript
// Add to existing CanvasOverlay component
import { GradientOverlay } from './GradientOverlay';

export const CanvasOverlay: React.FC<CanvasOverlayProps> = ({ ... }) => {
  // ... existing code
  
  return (
    <>
      {/* ... existing overlays */}
      <GradientOverlay />
    </>
  );
};
```

#### **9. Gradient Overlay Component (`src/components/features/GradientOverlay.tsx`)**
```typescript
import React from 'react';
import { useGradientStore } from '../../stores/gradientStore';
import { useCanvasContext } from '../../contexts/CanvasContext';

export const GradientOverlay: React.FC = () => {
  const { isApplying, startPoint, endPoint, definition, previewData } = useGradientStore();
  const { cellWidth, cellHeight, zoom, panOffset } = useCanvasContext();
  
  if (!isApplying) return null;
  
  const effectiveCellWidth = cellWidth * zoom;
  const effectiveCellHeight = cellHeight * zoom;
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg 
        className="w-full h-full"
        style={{ overflow: 'visible' }}
      >
        {/* Dotted line between start and end points */}
        {startPoint && endPoint && (
          <line
            x1={startPoint.x * effectiveCellWidth + panOffset.x + effectiveCellWidth / 2}
            y1={startPoint.y * effectiveCellHeight + panOffset.y + effectiveCellHeight / 2}
            x2={endPoint.x * effectiveCellWidth + panOffset.x + effectiveCellWidth / 2}
            y2={endPoint.y * effectiveCellHeight + panOffset.y + effectiveCellHeight / 2}
            stroke="white"
            strokeWidth="2"
            strokeDasharray="4 4"
            opacity="0.8"
          />
        )}
        
        {/* Start point control */}
        {startPoint && (
          <GradientControlPoint
            point={startPoint}
            type="start"
            cellWidth={effectiveCellWidth}
            cellHeight={effectiveCellHeight}
            panOffset={panOffset}
          />
        )}
        
        {/* End point control */}
        {endPoint && (
          <GradientControlPoint
            point={endPoint}
            type="end"
            cellWidth={effectiveCellWidth}
            cellHeight={effectiveCellHeight}
            panOffset={panOffset}
          />
        )}
        
        {/* Gradient stops along the line */}
        {startPoint && endPoint && (
          <GradientStopsOverlay
            startPoint={startPoint}
            endPoint={endPoint}
            definition={definition}
            cellWidth={effectiveCellWidth}
            cellHeight={effectiveCellHeight}
            panOffset={panOffset}
          />
        )}
      </svg>
      
      {/* Preview cells overlay */}
      {previewData && (
        <GradientPreviewOverlay
          previewData={previewData}
          cellWidth={effectiveCellWidth}
          cellHeight={effectiveCellHeight}
          panOffset={panOffset}
        />
      )}
    </div>
  );
};

interface GradientControlPointProps {
  point: { x: number; y: number };
  type: 'start' | 'end';
  cellWidth: number;
  cellHeight: number;
  panOffset: { x: number; y: number };
}

const GradientControlPoint: React.FC<GradientControlPointProps> = ({
  point,
  type,
  cellWidth,
  cellHeight,
  panOffset
}) => {
  const x = point.x * cellWidth + panOffset.x + cellWidth / 2;
  const y = point.y * cellHeight + panOffset.y + cellHeight / 2;
  
  return (
    <circle
      cx={x}
      cy={y}
      r="6"
      fill={type === 'start' ? '#22c55e' : '#ef4444'}
      stroke="white"
      strokeWidth="2"
      className="cursor-pointer"
    />
  );
};

interface GradientStopsOverlayProps {
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  definition: any; // GradientDefinition
  cellWidth: number;
  cellHeight: number;
  panOffset: { x: number; y: number };
}

const GradientStopsOverlay: React.FC<GradientStopsOverlayProps> = ({
  startPoint,
  endPoint,
  definition,
  cellWidth,
  cellHeight,
  panOffset
}) => {
  // Calculate positions along the gradient line for each stop
  const calculateStopPositions = () => {
    const allStops: Array<{ position: number; type: string; value: string; enabled: boolean }> = [];
    
    // Collect all stops from enabled properties
    if (definition.character.enabled) {
      definition.character.stops.forEach((stop: any) => {
        allStops.push({ ...stop, type: 'character', enabled: true });
      });
    }
    
    if (definition.textColor.enabled) {
      definition.textColor.stops.forEach((stop: any) => {
        allStops.push({ ...stop, type: 'textColor', enabled: true });
      });
    }
    
    if (definition.backgroundColor.enabled) {
      definition.backgroundColor.stops.forEach((stop: any) => {
        allStops.push({ ...stop, type: 'backgroundColor', enabled: true });
      });
    }
    
    return allStops.sort((a, b) => a.position - b.position);
  };
  
  const stops = calculateStopPositions();
  
  return (
    <>
      {stops.map((stop, index) => (
        <GradientStopMarker
          key={index}
          stop={stop}
          startPoint={startPoint}
          endPoint={endPoint}
          cellWidth={cellWidth}
          cellHeight={cellHeight}
          panOffset={panOffset}
        />
      ))}
    </>
  );
};

// Individual stop markers along the gradient line
interface GradientStopMarkerProps {
  stop: { position: number; type: string; value: string };
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  cellWidth: number;
  cellHeight: number;
  panOffset: { x: number; y: number };
}

const GradientStopMarker: React.FC<GradientStopMarkerProps> = ({
  stop,
  startPoint,
  endPoint,
  cellWidth,
  cellHeight,
  panOffset
}) => {
  // Calculate position along the line
  const lineX = startPoint.x + (endPoint.x - startPoint.x) * stop.position;
  const lineY = startPoint.y + (endPoint.y - startPoint.y) * stop.position;
  
  const x = lineX * cellWidth + panOffset.x + cellWidth / 2;
  const y = lineY * cellHeight + panOffset.y + cellHeight / 2;
  
  // Offset perpendicular to line based on type
  const lineAngle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
  const perpAngle = lineAngle + Math.PI / 2;
  
  const offsetDistance = stop.type === 'character' ? 0 : 
                        stop.type === 'textColor' ? 15 : 30;
  
  const offsetX = Math.cos(perpAngle) * offsetDistance;
  const offsetY = Math.sin(perpAngle) * offsetDistance;
  
  const finalX = x + offsetX;
  const finalY = y + offsetY;
  
  return (
    <g>
      {/* Connection line to gradient line */}
      {offsetDistance > 0 && (
        <line
          x1={x}
          y1={y}
          x2={finalX}
          y2={finalY}
          stroke="white"
          strokeWidth="1"
          opacity="0.6"
        />
      )}
      
      {/* Stop marker */}
      <rect
        x={finalX - 8}
        y={finalY - 8}
        width="16"
        height="16"
        fill={stop.type === 'character' ? '#3b82f6' :
              stop.type === 'textColor' ? '#8b5cf6' : '#f59e0b'}
        stroke="white"
        strokeWidth="1"
        rx="2"
        className="cursor-pointer"
      />
      
      {/* Stop value display */}
      <text
        x={finalX}
        y={finalY + 2}
        textAnchor="middle"
        fontSize="8"
        fill="white"
        fontFamily="monospace"
      >
        {stop.type === 'character' ? stop.value : '●'}
      </text>
    </g>
  );
};

// Preview overlay for gradient application
interface GradientPreviewOverlayProps {
  previewData: Map<string, any>; // Map<string, Cell>
  cellWidth: number;
  cellHeight: number;
  panOffset: { x: number; y: number };
}

const GradientPreviewOverlay: React.FC<GradientPreviewOverlayProps> = ({
  previewData,
  cellWidth,
  cellHeight,
  panOffset
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-80">
      {Array.from(previewData.entries()).map(([key, cell]) => {
        const [x, y] = key.split(',').map(Number);
        
        return (
          <div
            key={key}
            className="absolute font-mono flex items-center justify-center"
            style={{
              left: x * cellWidth + panOffset.x,
              top: y * cellHeight + panOffset.y,
              width: cellWidth,
              height: cellHeight,
              color: cell.color,
              backgroundColor: cell.bgColor === 'transparent' ? 'transparent' : cell.bgColor,
            }}
          >
            {cell.char}
          </div>
        );
      })}
    </div>
  );
};
```

### **Phase 5.5: Integration & Polish**

#### **10. Tool Registration & Hotkey**

**Update Tool Types (`src/types/index.ts`):**
```typescript
export type Tool = 
  | 'pencil' 
  | 'eraser' 
  | 'paintbucket' 
  | 'select' 
  | 'lasso'
  | 'magicwand'
  | 'rectangle' 
  | 'ellipse'
  | 'eyedropper'
  | 'line'
  | 'text'
  | 'brush'
  | 'gradientfill'; // NEW
```

**Update Hotkeys (`src/constants/hotkeys.ts`):**
```typescript
export const TOOL_HOTKEYS: ToolHotkey[] = [
  // ... existing hotkeys
  { tool: 'gradientfill', key: 'f', displayName: 'F', description: 'Gradient fill tool hotkey' },
];
```

**Update ToolManager (`src/components/features/ToolManager.tsx`):**
```typescript
import { GradientFillTool } from '../tools';

export const ToolManager: React.FC = () => {
  const { activeTool } = useToolStore();

  switch (activeTool) {
    // ... existing cases
    case 'gradientfill':
      return <GradientFillTool />;
    default:
      return null;
  }
};
```

**Update ToolStatusManager (`src/components/features/ToolStatusManager.tsx`):**
```typescript
import { GradientFillToolStatus } from '../tools';

// Add to switch statement
case 'gradientfill':
  return <GradientFillToolStatus />;
```

**Update ToolPalette (`src/components/features/ToolPalette.tsx`):**
```typescript
import { Blend } from 'lucide-react';

const DRAWING_TOOLS = [
  // ... existing tools
  { id: 'gradientfill', name: 'Gradient', icon: <Blend className="w-3 h-3" />, description: 'Gradient fill tool' },
];
```

#### **11. App Integration**

**Update App.tsx:**
```typescript
import { GradientPanel } from './components/features/GradientPanel';

function App() {
  return (
    <div className="app">
      {/* ... existing content */}
      
      <CanvasProvider>
        {/* ... existing content */}
        <GradientPanel />
      </CanvasProvider>
    </div>
  );
}
```

## 🎯 **Implementation Timeline**

### **Phase 5.1: Foundation (Week 1)**
- [ ] Type definitions and interfaces
- [ ] Gradient store creation and state management
- [ ] Tool store integration
- [ ] Basic gradient engine algorithms

### **Phase 5.2: Core Logic (Week 2)** ✅ COMPLETE
- [x] Gradient calculation engine
- [x] Fill area detection (contiguous/non-contiguous)
- [x] Interpolation methods (linear, constant)
- [x] Dithering algorithms (Bayer, noise)
- [x] Canvas integration components

### **Phase 5.3: Tool Integration (Week 3)** ✅ COMPLETE  
- [x] GradientFillTool component
- [x] useGradientFillTool hook  
- [x] Canvas interaction handlers
- [x] Undo/redo integration
- [x] ToolPalette integration with SwatchBook icon
- [x] App.tsx integration with GradientPanel placeholder
- [x] Tool activation and status management

### **Phase 5.4: UI Components (Week 4)** ✅ COMPLETE
- [x] GradientPanel main component with full overlay design
- [x] Property editors with comprehensive stop management (up to 8 stops per property)
- [x] Interactive gradient controls with real-time editing
- [x] Character/color picker integration with current tool values
- [x] Gradient type selection (linear/radial) with visual icons
- [x] Interpolation method controls (linear, constant, Bayer, noise)
- [x] Fill area configuration (contiguous/non-contiguous, match criteria)
- [x] Visual stop previews with color swatches and character displays
- [x] Interactive canvas overlay with gradient line visualization
- [x] Real-time gradient preview with start/end point markers
- [x] Visual stop markers positioned along gradient line
- [x] Gradient preview overlay with transparency effects

#### **Interactive Gradient Preview Implementation**

The interactive gradient preview system provides real-time visual feedback during gradient application with the following key features:

**Visual Elements:**
- **Start Point Marker**: Green circle with "START" label marking the gradient origin
- **End Point Marker**: Red circle with "END" label defining gradient terminus
- **Gradient Line**: Dashed gray line connecting start and end points
- **Stop Markers**: Color-coded squares positioned along the gradient line
  - Purple: Character property stops
  - Blue: Text color property stops  
  - Orange: Background color property stops
- **Stop Values**: Visual representation of each stop's value (character or color swatch)
- **Connection Lines**: Dashed lines connecting stops to main gradient line
- **Preview Overlay**: Semi-transparent preview of gradient application on affected cells

**Technical Architecture:**
```typescript
// Enhanced CanvasOverlay.tsx - Gradient visualization integration
const renderOverlay = useCallback(() => {
  // ... existing overlay rendering
  
  // Draw gradient fill overlay
  if (activeTool === 'gradientfill' && gradientApplying) {
    // 1. Draw start/end point markers with labels
    // 2. Draw dashed gradient line between points
    // 3. Calculate and render stop positions along line
    // 4. Apply perpendicular offset stacking for multiple properties
    // 5. Render preview cells with transparency
  }
}, [/* gradient state dependencies */]);
```

**State Integration:**
- **Gradient Store**: Provides `isApplying`, `startPoint`, `endPoint`, `definition`, `previewData`
- **Mouse Handlers**: Route clicks to `useGradientFillTool` for point placement
- **Canvas Overlay**: Renders all visual elements directly on canvas using 2D context
- **Real-time Updates**: Overlay re-renders automatically when gradient state changes

**User Workflow:**
1. Select gradient fill tool → Panel opens automatically
2. Configure gradient properties and stops
3. First canvas click → Sets start point, shows green marker
4. Second canvas click → Sets end point, shows full gradient line with stops
5. Live preview → Semi-transparent gradient preview on affected area
6. Enter/Escape → Apply or cancel gradient with visual feedback

This implementation provides professional-grade visual feedback comparable to industry-standard graphics applications while maintaining consistency with ASCII Motion's existing overlay system.

### **Phase 5.5: Polish & Integration (Week 5)**
- [ ] Tool registration and hotkey assignment
- [ ] ToolManager and ToolStatusManager updates
- [ ] ToolPalette integration
- [ ] App-level integration and testing

### **Phase 5.6: Testing & Refinement (Week 6)**
- [ ] End-to-end workflow testing
- [ ] Performance optimization
- [ ] Edge case handling
- [ ] Documentation updates

## 🧪 **Testing Checklist**

### **Core Functionality**
- [ ] Linear and radial gradients render correctly
- [ ] All interpolation methods work as expected
- [ ] Contiguous and non-contiguous fill modes work
- [ ] Matching criteria (char, color, bgColor) function properly
- [ ] Undo/redo properly restores previous state

### **Interactive Controls**
- [ ] Start/end point positioning works on first and second click
- [ ] Dotted line overlay appears between points
- [ ] Gradient stops display correctly along line
- [ ] Stop positioning respects perpendicular offset stacking
- [ ] Enter applies gradient, Escape cancels

### **UI Integration**
- [ ] Panel opens automatically when tool selected
- [ ] Panel closes when different tool selected
- [ ] All property editors expand/collapse properly
- [ ] Stop addition/removal works within 8-stop limit
- [ ] Default values initialize correctly

### **Edge Cases**
- [ ] Empty canvas areas handle gracefully
- [ ] Transparent background color handled properly
- [ ] Very short gradient lines work correctly
- [ ] Overlapping stops position correctly
- [ ] Memory management for large fill areas

## 🎨 **Design Patterns**

This implementation follows established ASCII Motion patterns:

- **Tool Architecture**: 9-step tool creation pattern with dedicated hook
- **State Management**: Zustand store with clean action interfaces
- **UI Components**: Shadcn/ui components with consistent styling
- **Panel System**: Right-slide overlay matching MediaImportPanel
- **Canvas Integration**: Context-based rendering with zoom/pan support
- **History System**: Full undo/redo integration with useAnimationHistory
- **Typography Support**: Respects canvas typography settings

The gradient fill tool will integrate seamlessly with existing architecture while providing powerful new creative capabilities for ASCII art creation.

## Contributing

Follow the component structure and Copilot instructions in `COPILOT_INSTRUCTIONS.md` for consistent code organization.
