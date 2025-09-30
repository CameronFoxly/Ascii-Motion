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

## 🚨 **CRITICAL: Tooltip Implementation Guidelines**

**When implementing tooltips in ASCII Motion, ALWAYS use Radix tooltips. NEVER use HTML `title` attributes.**

### **⚠️ TOOLTIP REQUIREMENT**
All interactive buttons and elements must use the purple Radix tooltip system for consistency and professional UX.

### **Tooltip Implementation Patterns**

#### **✅ DO: Use Radix Tooltips**
```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ✅ CORRECT - Single button with tooltip
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

// ✅ CORRECT - Multiple buttons with shared provider
<TooltipProvider>
  {items.map(item => (
    <Tooltip key={item.id}>
      <TooltipTrigger asChild>
        <Button>{item.name}</Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{item.description}</p>
      </TooltipContent>
    </Tooltip>
  ))}
</TooltipProvider>

// ✅ CORRECT - Dynamic tooltip content
<Tooltip>
  <TooltipTrigger asChild>
    <Button>{isActive ? "Unlink" : "Link"}</Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>{isActive ? "Unlink aspect ratio" : "Maintain aspect ratio"}</p>
  </TooltipContent>
</Tooltip>
```

#### **❌ DON'T: Use HTML title Attributes**
```tsx
// ❌ WRONG - HTML title creates dark grey browser tooltip
<Button title="My tooltip">Click me</Button>

// ❌ WRONG - Dual tooltips (HTML + Radix)
<Tooltip>
  <TooltipTrigger asChild>
    <Button title="Description">Click me</Button>  {/* Remove title! */}
  </TooltipTrigger>
  <TooltipContent>
    <p>Description</p>
  </TooltipContent>
</Tooltip>

// ❌ WRONG - Multiple TooltipProviders in loops
{items.map(item => (
  <TooltipProvider key={item.id}>  {/* Move outside map! */}
    <Tooltip>...</Tooltip>
  </TooltipProvider>
))}
```

### **TooltipProvider Performance Best Practices**

**Rule: Place TooltipProvider OUTSIDE loops and map functions**

```tsx
// ❌ BAD PERFORMANCE - Provider re-created for each item
const ColorGrid = () => (
  <div className="grid">
    {colors.map(color => (
      <TooltipProvider key={color.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button style={{backgroundColor: color.value}} />
          </TooltipTrigger>
          <TooltipContent><p>{color.name}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ))}
  </div>
);

// ✅ GOOD PERFORMANCE - Single provider wraps all tooltips
const ColorGrid = () => (
  <TooltipProvider>
    <div className="grid">
      {colors.map(color => (
        <Tooltip key={color.id}>
          <TooltipTrigger asChild>
            <button style={{backgroundColor: color.value}} />
          </TooltipTrigger>
          <TooltipContent><p>{color.name}</p></TooltipContent>
        </Tooltip>
      ))}
    </div>
  </TooltipProvider>
);
```

### **Accessibility Considerations**

**Use `aria-label` for screen readers, independent of tooltips:**
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button 
      aria-label="Delete item"  // Screen reader description
      variant="ghost"
    >
      <Trash className="w-3 h-3" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>Delete</p>  {/* Visual tooltip for sighted users */}
  </TooltipContent>
</Tooltip>
```

### **Common Tooltip Patterns**

**Frame navigation buttons:**
```tsx
<TooltipProvider>
  <div className="flex gap-1">
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="sm" onClick={() => goToFirst()}>
          <ChevronsLeft className="w-3 h-3" />
        </Button>
      </TooltipTrigger>
      <TooltipContent><p>First frame</p></TooltipContent>
    </Tooltip>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="sm" onClick={() => goToPrev()}>
          <ChevronLeft className="w-3 h-3" />
        </Button>
      </TooltipTrigger>
      <TooltipContent><p>Previous frame</p></TooltipContent>
    </Tooltip>
  </div>
</TooltipProvider>
```

**Alignment grid with tooltips:**
```tsx
<TooltipProvider>
  <div className="grid grid-cols-3">
    {alignmentOptions.map(({ mode, label }) => (
      <Tooltip key={mode}>
        <TooltipTrigger asChild>
          <Button onClick={() => setAlignment(mode)}>
            {/* alignment icon */}
          </Button>
        </TooltipTrigger>
        <TooltipContent><p>{label}</p></TooltipContent>
      </Tooltip>
    ))}
  </div>
</TooltipProvider>
```

### **Benefits of Following Tooltip Guidelines:**
- ✅ Consistent purple Radix UI styling throughout application
- ✅ No dual tooltip conflicts (browser tooltip + Radix tooltip)
- ✅ Better performance with proper provider placement  
- ✅ Professional user experience matching design system
- ✅ Proper accessibility with ARIA attributes

## 🎨 **Gradient Fill Tool - Advanced Features**

**Location**: `src/components/features/InteractiveGradientOverlay.tsx`, `src/stores/gradientStore.ts`

The Gradient Fill Tool provides sophisticated gradient application with interactive visual controls for manipulating gradient properties directly on the canvas.

### **Interactive Controls**:
- **Drag Controls**: Start point, end point, ellipse point (for radial), and gradient stops can all be dragged
- **Double-Click Editing**: Double-click any stop swatch to open appropriate picker:
  - **Character stops**: Opens EnhancedCharacterPicker for character selection
  - **Color stops**: Opens ColorPickerOverlay for color selection with full HSV/RGB controls
- **Live Preview**: Real-time canvas preview updates during all interactions
- **Visual Feedback**: Clear visual indicators for all interactive elements

### **Implementation Notes**:
- Stop editing state managed in `gradientStore.ts` with `editingStop`, `startEditingStop()`, `updateEditingStopValue()`, and `closeStopEditor()` methods
- `GradientStopPicker` component handles routing to appropriate picker based on stop type
- Double-click events on stops trigger `handleStopDoubleClick()` in overlay component
- All edits update gradient definition and trigger preview regeneration

## 🎨 **SVG Export Feature**

**Location**: `src/components/features/ImageExportDialog.tsx`, `src/utils/svgExportUtils.ts`, `src/utils/exportRenderer.ts`

SVG export provides scalable vector graphics output integrated into the Image export system alongside PNG and JPEG formats.

### **Export Options**:
- **Text Rendering Modes**:
  - **SVG Text Elements** (default): Uses `<text>` elements - smaller file size, requires font on viewing system
  - **Vector Outlines**: Converts characters to `<path>` elements - font-independent but larger files
- **Grid Export**: Optional grid line rendering (default: off)
- **Background Control**: Include/exclude background color (default: on)
- **Output Formatting**: Prettified (human-readable) or minified (compact) - default prettified

### **Architecture Integration**:
- **Type System**: Added `'svg'` to `ExportFormatId` type and created `SvgExportSettings` interface
- **Export Store**: SVG settings integrated into `ImageExportSettings` with default values
- **Rendering**: `ExportRenderer.exportSvg()` method generates complete SVG with proper namespaces, viewBox, and character positioning
- **File Extension**: Auto-switches to `.svg` when SVG format selected
- **File Size Estimation**: Dedicated `estimateSvgFileSize()` utility based on character count and settings

### **Implementation Notes**:
- SVG generation uses utility functions from `svgExportUtils.ts` for header, grid, and character rendering
- Character colors and backgrounds are fully preserved in vector format
- Grid uses adaptive color calculation matching canvas display
- Text-to-path conversion uses simplified canvas-based approach (note in docs suggests opentype.js for production-quality paths)
- Export dialog conditionally displays SVG-specific settings when format === 'svg'

## 🚨 **CRITICAL: Adding New Tools**
**When adding ANY new drawing tool, ALWAYS follow the 8-step componentized pattern in Section 3 below.** This maintains architectural consistency and ensures all tools work seamlessly together. Do NOT add tool logic directly to CanvasGrid or mouse handlers.

**📋 REMINDER: After implementing ANY new tool, update both COPILOT_INSTRUCTIONS.md and DEVELOPMENT.md per the protocol above.**

## 🚨 **CRITICAL: Modifying Drawing Tools & Mouse Handlers**

**⚠️ DANGER ZONE: Changes to these files can break shift+click line drawing and other core drawing functionality.**

### **Before Modifying Drawing-Related Code:**

**MANDATORY Reading**: See `DRAWING_GAP_FIX.md` for complete architecture details.

**Files That Require Extreme Caution:**
- `useCanvasDragAndDrop.ts` → Mouse move gap-filling during drag
- `useDrawingTool.ts` → Shift+click line drawing between points  
- `useCanvasMouseHandlers.ts` → Tool-specific state cleanup
- `toolStore.ts` → Pencil position persistence and tool switching

### **🔥 NON-NEGOTIABLE Rules for Drawing Changes:**

1. **NEVER add gap-filling logic to mouse down handlers** → Breaks shift+click
2. **NEVER reset pencil position on every mouse up** → Breaks line drawing
3. **ALWAYS separate drag vs click behaviors** → Different handlers entirely
4. **ALWAYS test all drawing modes** after changes → See testing checklist in DRAWING_GAP_FIX.md

### **⚠️ Architectural Separation Requirements:**
- **Gap-filling**: Only in `handleDrawingMouseMove` during active drawing
- **Shift+click**: Only in `drawAtPosition` with shift detection
- **State cleanup**: Tool-specific in mouse handlers (not blanket resets)
- **Position persistence**: Pencil-specific in toolStore

**💥 If you break shift+click functionality, you MUST fix it before proceeding with any other work.**

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
│   └── CanvasContext.tsx          # Canvas-specific state provider with typography settings
├── hooks/
│   ├── useCanvasState.ts          # Canvas state management with cell dimensions
│   ├── useCanvasMouseHandlers.ts  # Mouse interaction routing
│   ├── useCanvasSelection.ts      # Selection-specific logic
│   ├── useCanvasLassoSelection.ts # Lasso selection-specific logic
│   ├── useCanvasDragAndDrop.ts    # Drawing/rectangle tools
│   ├── useCanvasRenderer.ts       # Grid & overlay rendering with font metrics
│   ├── useHandTool.ts             # Hand tool pan functionality
│   └── useToolBehavior.ts         # Tool coordination & metadata
├── components/
│   ├── features/
│   │   ├── CanvasGrid.tsx         # Main composition component (111 lines)
│   │   ├── CanvasSettings.tsx     # Canvas controls with typography settings
│   │   ├── CanvasActionButtons.tsx # Copy/paste/undo/redo/clear buttons (relocated Sept 6)
│   │   ├── ZoomControls.tsx       # Zoom and reset view controls (78 lines)
│   │   ├── ToolManager.tsx        # Active tool component renderer (34 lines)
│   │   └── ToolStatusManager.tsx  # Tool status UI renderer (34 lines)
│   └── tools/                     # Tool-specific components
│       ├── SelectionTool.tsx      # Selection behavior & status (53 lines)
│       ├── LassoTool.tsx          # Lasso selection behavior & status (45 lines)
│       ├── DrawingTool.tsx        # Pencil/eraser logic & status (42 lines)
│       ├── PaintBucketTool.tsx    # Fill tool & status (30 lines)
│       ├── RectangleTool.tsx      # Rectangle drawing & status (30 lines)
│       ├── EyedropperTool.tsx     # Color picking & status (26 lines)
│       └── index.ts               # Tool exports
├── utils/
│   ├── fontMetrics.ts             # Font metrics and character spacing utilities (NEW)
│   └── ...
```

### **Tool Architecture Reference**

**Current Tool-to-Hook Mapping:**
| Tool | Hook Used | Architecture Reason |
|------|-----------|-------------------|
| **Selection** | `useCanvasSelection` (dedicated) | Complex: Multi-state (select→move→resize), sophisticated coordinate tracking |
| **Lasso** | `useCanvasLassoSelection` (dedicated) | Complex: Freeform selection, point-in-polygon algorithms, separate state from rectangular selection |
| **Magic Wand** | `useCanvasMagicWandSelection` (dedicated) | Complex: Multi-algorithm selection (flood fill + scan), exact matching logic, contiguous/non-contiguous modes |
| **Pencil** | `useDrawingTool` (shared) | Simple: Single-click cell modification |
| **Eraser** | `useDrawingTool` (shared) | Simple: Single-click cell clearing |
| **Paint Bucket** | `useDrawingTool` (shared) | Simple: Single-click flood fill algorithm with contiguous/non-contiguous modes |
| **Eyedropper** | `useDrawingTool` (shared) | Simple: Single-click color sampling |
| **Rectangle** | `useCanvasDragAndDrop` (shared) | Interactive: Drag-based drawing with preview, aspect ratio locking |
| **Ellipse** | `useCanvasDragAndDrop` (shared) | Interactive: Drag-based drawing with preview, aspect ratio locking |
| **Hand** | `useHandTool` (dedicated) | Navigation: Pan offset management, space key override, cursor states |
| **Gradient Fill** | `useGradientFillTool` (dedicated) | Advanced fill workflow with hover-following end handle and interactive overlay |

> **Gradient fill overlay state:** `gradientStore` now tracks a `hoverEndPoint` while the user is positioning the gradient. The overlay renders against this provisional value so the end handle and stops follow the cursor until a second click commits the final end point. Always reset `hoverEndPoint` when cancelling or applying to avoid stale overlays.

**Architecture Benefits:**
- **Dedicated hooks** for complex tools maintain clear separation of concerns
- **Shared hooks** eliminate code duplication for similar tool behaviors  
- **Consistent component pattern** across all tools for UI feedback and activation

**Canvas Component Pattern:**
```tsx
// ✅ NEW PATTERN: Use CanvasProvider + Context with Typography
function App() {
  return (
    <CanvasProvider>
      <CanvasGrid className="w-full" />
    </CanvasProvider>
  );
}

// ✅ Inside canvas components, use context hooks:
function CanvasGrid() {
  const { canvasRef, cellWidth, cellHeight, fontMetrics } = useCanvasContext();
  const { statusMessage, commitMove } = useCanvasState();
  const { getGridCoordinates } = useCanvasDimensions();
  // ...
}
```

**Typography & Font Metrics Pattern (ENHANCED - Sept 6, 2025):**
```typescript
// ✅ Font metrics calculation with proper monospace aspect ratio (~0.6)
import { calculateFontMetrics, calculateCellDimensions } from '../utils/fontMetrics';

const fontMetrics = useMemo(() => {
  return calculateFontMetrics(fontSize); // Auto-calculates 0.6 aspect ratio
}, [fontSize]);

const { cellWidth, cellHeight } = useMemo(() => {
  return calculateCellDimensions(fontMetrics, { characterSpacing, lineSpacing });
}, [fontMetrics, characterSpacing, lineSpacing]);

// ✅ Canvas rendering with proper character dimensions and zoom scaling
const drawingStyles = useMemo(() => {
  const scaledFontSize = fontMetrics.fontSize * zoom;
  const scaledFontString = `${scaledFontSize}px '${fontMetrics.fontFamily}', monospace`;
  
  return {
    font: scaledFontString,
    textAlign: 'center' as CanvasTextAlign,
    textBaseline: 'middle' as CanvasTextBaseline
  };
}, [fontMetrics, zoom]);

const drawCell = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, cell: Cell) => {
  const pixelX = x * effectiveCellWidth + panOffset.x;
  const pixelY = y * effectiveCellHeight + panOffset.y;
  
  // Use scaled font with zoom support
  ctx.font = drawingStyles.font;
  ctx.textAlign = drawingStyles.textAlign;
  ctx.textBaseline = drawingStyles.textBaseline;
  
  ctx.fillText(
    cell.char, 
    pixelX + effectiveCellWidth / 2, 
    pixelY + effectiveCellHeight / 2
  );
}, [effectiveCellWidth, effectiveCellHeight, drawingStyles, panOffset]);

// ✅ Typography controls access from CanvasContext
const {
  fontSize,            // Base font size (8px to 48px, default 16px)
  characterSpacing,    // 0.5x to 2.0x character width multiplier
  lineSpacing,         // 0.8x to 2.0x line height multiplier
  setFontSize,
  setCharacterSpacing,
  setLineSpacing,
  fontMetrics,         // Computed font metrics with 0.6 aspect ratio
  cellWidth,          // Actual cell width including spacing
  cellHeight          // Actual cell height including spacing
} = useCanvasContext();
```

**Canvas Interaction Patterns:**
```typescript
// ✅ Hover Cell Tracking Pattern (Sept 5, 2025)
// Track mouse position for visual feedback on all tools except hand tool
export const useCanvasMouseHandlers = () => {
  const { setHoveredCell } = useCanvasContext();
  
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Update hovered cell for all tools except hand tool
    if (effectiveTool !== 'hand') {
      const { x, y } = getGridCoordinatesFromEvent(event);
      setHoveredCell({ x, y });
    } else {
      setHoveredCell(null); // Clear hover when using hand tool
    }
    // ... rest of mouse handling
  }, [effectiveTool, setHoveredCell, getGridCoordinatesFromEvent]);
  
  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null); // Clear hover state when mouse leaves canvas
  }, [setHoveredCell]);
};

// ✅ Hover Outline Rendering Pattern
export const useCanvasRenderer = () => {
  const { hoveredCell } = useCanvasContext();
  
  const renderCanvas = useCallback(() => {
    // ... main canvas rendering
    
    // Draw hover cell outline (after main content, before text cursor)
    if (hoveredCell && hoveredCell.x >= 0 && hoveredCell.x < width && hoveredCell.y >= 0 && hoveredCell.y < height) {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)'; // Subtle blue outline
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.strokeRect(
        hoveredCell.x * effectiveCellSize + panOffset.x,
        hoveredCell.y * effectiveCellSize + panOffset.y,
        effectiveCellSize,
        effectiveCellSize
      );
    }
  }, [/* include hoveredCell in dependencies */]);
};

// ✅ Tool Hotkey System Pattern (Sept 5, 2025)
// Centralized hotkey configuration for maintainable tool switching
export const TOOL_HOTKEYS: ToolHotkey[] = [
  { tool: 'pencil', key: 'p', displayName: 'P', description: 'Pencil tool hotkey' },
  { tool: 'eraser', key: 'e', displayName: 'E', description: 'Eraser tool hotkey' },
  { tool: 'paintbucket', key: 'g', displayName: 'G', description: 'Fill tool hotkey' },
  { tool: 'select', key: 'm', displayName: 'M', description: 'Rectangular selection hotkey' },
  { tool: 'lasso', key: 'l', displayName: 'L', description: 'Lasso selection hotkey' },
  { tool: 'magicwand', key: 'w', displayName: 'W', description: 'Magic wand selection hotkey' },
  { tool: 'eyedropper', key: 'i', displayName: 'I', description: 'Eyedropper tool hotkey' },
  { tool: 'hand', key: 'h', displayName: 'H', description: 'Hand tool hotkey' },
  { tool: 'text', key: 't', displayName: 'T', description: 'Text tool hotkey' }
  // Add new tools here with unique hotkeys
];

// ✅ Zoom Hotkey System Pattern (Sept 10, 2025)
// Canvas zoom controls with keyboard shortcuts for 20% increments
// - Plus (+) or equals (=): Zoom in (20% increments: 100% → 120% → 140% etc)
// - Minus (-): Zoom out (20% increments: 140% → 120% → 100% etc)
// - Range: 20% to 400% zoom level
// - Integrated with ZoomControls component via useZoomControls hook

// ✅ Typography System Requirements (Sept 6, 2025)
// MANDATORY: All new tools and features must respect typography settings

**Typography System Integration Checklist:**
When developing new tools or features, ensure:

1. **Use CanvasContext Typography State:**
   ```typescript
   const { 
     fontSize,           // Base font size in pixels (8px-48px, default 16px)
     characterSpacing,   // Current character spacing multiplier (0.5x-2.0x)
     lineSpacing,        // Current line spacing multiplier (0.8x-2.0x)  
     fontMetrics,        // Computed font metrics with 0.6 aspect ratio
     cellWidth,          // Actual cell width including character spacing
     cellHeight          // Actual cell height including line spacing
   } = useCanvasContext();
   ```

2. **Coordinate System Must Use Typography-Aware Dimensions:**
   ```typescript
   // ❌ DON'T: Use fixed square cells
   const pixelX = gridX * cellSize;
   const pixelY = gridY * cellSize;

   // ✅ DO: Use typography-aware cell dimensions
   const pixelX = gridX * cellWidth;
   const pixelY = gridY * cellHeight;
   ```

3. **Font Rendering Must Scale with Zoom:**
   ```typescript
   // ✅ Always use scaled font string from drawingStyles
   const drawingStyles = useMemo(() => ({
     font: `${fontMetrics.fontSize * zoom}px '${fontMetrics.fontFamily}', monospace`
   }), [fontMetrics, zoom]);
   
   ctx.font = drawingStyles.font; // Scales properly with zoom
   ```

4. **Selection Tools Must Account for Rectangular Cells:**
   - Rectangle selection: Use `cellWidth` × `cellHeight` for accurate bounds
   - Lasso selection: Account for aspect ratio in point calculations  
   - Magic wand: Consider non-square cell dimensions in flood fill
   - Move operations: Use typography-aware coordinate transforms

5. **New UI Controls Must Not Conflict with Typography Panel:**
   - Typography controls are in `CanvasSettings` dropdown
   - Action buttons moved to bottom of canvas area  
   - Ensure new controls don't overcrowd top toolbar

**Typography State Dependencies:**
```typescript
// ✅ Include typography state in useCallback dependencies
const toolFunction = useCallback(() => {
  // Tool logic using cellWidth/cellHeight
}, [cellWidth, cellHeight, characterSpacing, lineSpacing]);

// ✅ Include fontMetrics in rendering dependencies  
const renderFunction = useCallback(() => {
  // Rendering logic using fontMetrics
}, [fontMetrics, zoom, /* other deps */]);
```
  { tool: 'rectangle', key: 'r', displayName: 'R', description: 'Rectangle drawing hotkey' },
  { tool: 'ellipse', key: 'o', displayName: 'O', description: 'Ellipse drawing hotkey' },
  { tool: 'text', key: 't', displayName: 'T', description: 'Text tool hotkey' },
  { tool: 'hand', key: ' ', displayName: 'Space', description: 'Hand tool (temporary while held)' },
];

// ✅ Tool Hotkey Integration Pattern - useKeyboardShortcuts.ts
export const useKeyboardShortcuts = () => {
  // Handle tool hotkeys (single key presses for tool switching)
  // Only process if no modifier keys are pressed and key is a valid tool hotkey
  if (!event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
    const targetTool = getToolForHotkey(event.key);
    if (targetTool && targetTool !== 'hand') { // Hand tool handled separately via space key
      event.preventDefault();
      console.log(`Tool hotkey: Switching to ${targetTool} via "${event.key}" key`);
      setActiveTool(targetTool);
      return;
    }
  }
};

// ✅ Tool Tooltip Enhancement Pattern - ToolPalette.tsx
import { getToolTooltipText } from '../../constants/hotkeys';

<Button
  title={getToolTooltipText(tool.id, tool.description)} // Enhanced with hotkey display
  onClick={() => setActiveTool(tool.id)}
>
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
│   ├── gridColor.ts                   # Adaptive grid color calculation (NEW)
│   └── ...
├── constants/
│   ├── hotkeys.ts                     # Tool hotkey configuration and utilities (NEW)
│   ├── colors.ts                      # Color definitions
│   └── index.ts                       # Character categories and app constants
└── lib/
```

## 🗂️ **File Organization Standards**

**⚠️ CRITICAL: All new files must be placed in appropriate directories - NEVER in root directory.**

### **📁 Directory Usage Guidelines**

#### **Root Directory** - ESSENTIAL FILES ONLY
- `README.md`, `package.json`, `LICENSE` - Standard project files
- `DEVELOPMENT.md`, `COPILOT_INSTRUCTIONS.md`, `PRD.md` - Core documentation
- Configuration files: `vite.config.ts`, `tailwind.config.js`, etc.
- **❌ NEVER place documentation, test files, or development utilities in root**

#### **`docs/` Directory** - All Implementation Documentation
- `*_IMPLEMENTATION.md` - Feature implementation analysis
- `*_PLAN.md` - Development and architecture planning documents
- `*_GUIDE.md` - Feature usage and system guides
- `PERFORMANCE_*.md` - Performance optimization documentation
- `*_TEST*.md` - Testing procedures and checklists
- **✅ CREATE: Implementation docs, architecture plans, feature guides**

#### **`dev-tools/` Directory** - Development Utilities & Tests
- `test-*.js` - Test scripts and debugging utilities
- `debug-*.js` - Development debugging tools
- `*-test.html` - UI testing pages
- `*.json` - Test data files
- **✅ CREATE: Test scripts, debugging tools, development utilities**

#### **`src/` Directory** - Application Source Code
- Follow existing component organization patterns
- Place new components in appropriate subdirectories
- **✅ CREATE: React components, hooks, stores, utilities**

### **🎯 File Creation Rules**

**When creating documentation:**
```bash
# ✅ CORRECT - Place in docs/
touch docs/NEW_FEATURE_IMPLEMENTATION.md
touch docs/PERFORMANCE_ANALYSIS.md
touch docs/TESTING_CHECKLIST.md

# ❌ WRONG - Never place in root
touch NEW_FEATURE_DOCS.md  # This clutters root directory
```

**When creating test files:**
```bash
# ✅ CORRECT - Place in dev-tools/
touch dev-tools/test-new-feature.js
touch dev-tools/debug-performance.js
touch dev-tools/ui-test.html

# ❌ WRONG - Never place in root  
touch test-something.js  # This clutters root directory
```

**When creating components:**
```bash
# ✅ CORRECT - Follow src/ organization
touch src/components/tools/NewTool.tsx
touch src/hooks/useNewFeature.ts
touch src/stores/newFeatureStore.ts
```

### **📋 File Organization Checklist**

Before creating any new file, ask:
- [ ] Is this a core project file? → Root directory (rare)
- [ ] Is this documentation? → `docs/` directory
- [ ] Is this a test or development tool? → `dev-tools/` directory  
- [ ] Is this application source code? → `src/` directory
- [ ] Does the file follow established naming conventions?
- [ ] Is there a README in the target directory explaining its purpose?

### **🔧 Maintenance Guidelines**

**Regular cleanup (monthly):**
- [ ] Review `dev-tools/` for obsolete test files
- [ ] Update `docs/README.md` when adding new documentation
- [ ] Ensure root directory remains clean and essential-only
- [ ] Verify all directories have explanatory README files

**Documentation organization:**
- [ ] Group related docs by feature or phase
- [ ] Use consistent naming: `FEATURE_IMPLEMENTATION.md`, `PHASE_X_PLAN.md`
- [ ] Link between related documents
- [ ] Keep navigation clear in `docs/README.md`

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

**🚨 CRITICAL: Tool Switching and State Management (Sept 5, 2025)**
**MANDATORY PATTERNS for Selection Tools to Prevent State Corruption:**

**Issue Discovered**: When implementing complex selection tools (like lasso), tool switching can cause state corruption if not handled properly.

**Root Cause Analysis**:
1. **useEffect Dependency Arrays**: Including `moveState` in dependency arrays can cause infinite loops or unintended commits
2. **Tool Transition Cleanup**: Switching between selection tools doesn't automatically clean up move state
3. **Immediate Commits**: React's passive effects can trigger commits before user interactions complete

**✅ REQUIRED PATTERNS for Future Selection Tools**:

```typescript
// 1. Tool switching cleanup (CanvasGrid.tsx pattern)
useEffect(() => {
  const prevTool = prevToolRef.current;
  
  // Only run cleanup when tool actually changes
  if (prevTool !== activeTool) {
    // Always commit pending moves when switching tools
    if (moveState) {
      commitMove();
    }
    
    // Clear state only when leaving selection tools entirely
    if (activeTool !== 'select' && activeTool !== 'lasso') {
      setSelectionMode('none');
      setMouseButtonDown(false);
      setPendingSelectionStart(null);
      setMoveState(null);
    }
    
    prevToolRef.current = activeTool;
  }
}, [activeTool, moveState, /* other deps but NOT moveState in array */);

// 2. Separate state management for each selection tool
// ❌ DON'T: Share selection state between tools
const sharedSelectionState = { selection: ..., moveState: ... };

// ✅ DO: Completely separate state systems
const rectangularSelection = { active: false, bounds: ..., moveState: ... };
const lassoSelection = { active: false, path: ..., selectedCells: ..., moveState: ... };

// 3. Tool-specific naming conventions to prevent conflicts
// ❌ DON'T: Generic naming that can conflict
const isPointInSelection = (x, y) => { /* conflicts between tools */ };

// ✅ DO: Tool-prefixed naming
const isPointInLassoSelection = (x, y) => { /* lasso-specific */ };
const isPointInRectangleSelection = (x, y) => { /* rectangle-specific */ };
```

**🎯 Testing Checklist for New Selection Tools**:
Before completing any selection tool implementation:
- [ ] Test tool switching during move operations (should commit and clean up)
- [ ] Test switching between selection tools (should maintain separate state)
- [ ] Verify no infinite re-renders when move state changes
- [ ] Check console for unexpected commitMove calls during interaction
- [ ] Test that visual feedback matches actual selection bounds

**🚨 Critical Testing Requirements (Lessons from Magic Wand Tool - Sept 5, 2025)**:
Post-implementation testing revealed multiple subtle bugs that only appear during real usage:
- [ ] **Move Operation**: Verify ONLY selected cells move, not all canvas cells (check `originalData` in move state)
- [ ] **Copy/Paste Integration**: Test Cmd/Ctrl+C and Cmd/Ctrl+V with new selection type
- [ ] **Delete Key Integration**: Test Delete/Backspace keys clear selection content and then clear selection state
- [ ] **Keyboard Controls**: Test Escape (cancel) and Enter (commit) during move operations  
- [ ] **Selection State After Move**: Click outside moved selection and verify no stale selection preview
- [ ] **Post-Commit Click**: After move commit, next click should create new selection, not grab empty selection
- [ ] **Clipboard Priority**: Verify paste mode prioritizes newest selection type clipboard
- [ ] **Tool Switching**: Switch away and back to tool during move operation
- [ ] **Multiple Selections**: Create selection, move it, create new selection in different area

**🔧 Selection Tool Bug Patterns to Watch For**:
```typescript
// ❌ Common Bug: Including all cells in move state
setMoveState({
  originalData: new Map(cells), // WRONG - moves everything
  // ...
});

// ✅ Correct: Only include selected cells
const originalData = new Map();
selectedCells.forEach(cellKey => {
  const cell = getCell(x, y);
  if (cell && !isEmpty(cell)) {
    originalData.set(cellKey, cell);
  }
});

// ❌ Common Bug: Incomplete move commit sequence
if (clickOutsideSelection) {
  commitMove(); // WRONG - leaves stale selection state
  return;
}

// ✅ Correct: Complete commit sequence (match lasso pattern)
if (clickOutsideSelection) {
  commitMove();
  clearSelection();           // Clear selection state
  setJustCommittedMove(true); // Prevent immediate new selection
  return;
}

// ❌ Common Bug: Frame switching loses user work
if (currentFrameIndex !== previousFrameIndex) {
  setMoveState(null); // WRONG - cancels moves instead of committing
  setFrameData(previousFrameIndex, cells); // Saves uncommitted data
}

// ✅ Correct: Commit moves before frame switching (see Animation Guidelines)
if (currentFrameIndex !== previousFrameIndex) {
  let dataToSave = new Map(cells);
  if (moveState) {
    // Commit move operation first
    dataToSave = commitMoveToCanvas(moveState, cells);
    setCanvasData(dataToSave);
    setMoveState(null);
  }
  setFrameData(previousFrameIndex, dataToSave); // Save committed data
}
```

**Debugging Commands for Selection Tool Issues**:
```typescript
// Add these debug logs to trace execution flow:
console.log('=== TOOL MOUSE DOWN START ===');
console.log('Current moveState:', moveState);
console.log('Selection active:', selection.active);
console.log('Point in selection:', isPointInSelection(x, y));

// Add stack trace to commitMove to find unexpected callers:
console.log('commitMove called from:', new Error().stack);
```

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

**Dropdown Menu and Overlay Patterns:**
```typescript
// ✅ Good: Portal-based dropdown with proper layering
import { createPortal } from 'react-dom';

const DropdownComponent = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);

  const calculatePosition = (buttonRef: HTMLElement | null) => {
    if (!buttonRef) return { top: 0, left: 0 };
    const rect = buttonRef.getBoundingClientRect();
    return { top: rect.bottom + 4, left: rect.left };
  };

  // Portal dropdown for proper z-index layering
  return (
    <>
      <Button 
        ref={buttonRef}
        onClick={() => {
          const pos = calculatePosition(buttonRef.current);
          setPosition(pos);
          setShowDropdown(!showDropdown);
        }}
      >
        Open Dropdown
      </Button>
      
      {showDropdown && createPortal(
        <div 
          className="fixed z-[99999] bg-popover border border-border rounded-md shadow-lg"
          style={{ top: `${position.top}px`, left: `${position.left}px` }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Dropdown content */}
        </div>,
        document.body
      )}
    </>
  );
};

// ❌ Avoid: Absolute positioning within canvas containers
const BadDropdown = () => (
  <div className="relative">
    <Button>Open</Button>
    <div className="absolute top-8 left-0 z-50"> {/* Will be behind canvas */}
      Dropdown content
    </div>
  </div>
);
```

**Z-Index Management:**
- Canvas layers: `z-10` to `z-40`
- UI overlays: `z-50` to `z-[999]`
- Dropdown menus: `z-[99999]` (with portals)
- Modals: `z-[100000]+`

### **🎨 Enhanced Character Picker Pattern (Standardized Sept 29, 2025)**

**IMPORTANT: ASCII Motion now uses a standardized character picker system across all features with enhanced UI and consistent behavior.**

#### **✅ EnhancedCharacterPicker Component Features:**
- **Enhanced Visual Hierarchy**: 400px width for better breathing room (vs 320px basic version)
- **Icon Categories**: Visual category buttons with Lucide icons (Type, Hash, Grid3X3, Square, etc.)
- **8-Column Character Grid**: Improved spacing and visual clarity (vs 6-column basic version)
- **Flexible Positioning**: Supports all existing anchor positions (bottom-right, left-slide, gradient-panel, etc.)
- **Initial Value Highlighting**: Selected character is visually highlighted
- **Custom Titles**: Contextual titles like "Select Character for Palette", "Select Replacement Character"

#### **🚀 Usage Pattern for All Character Pickers:**
```typescript
import { EnhancedCharacterPicker } from './EnhancedCharacterPicker';

// ✅ Standard character picker implementation
<EnhancedCharacterPicker
  isOpen={isCharacterPickerOpen}
  onClose={() => setIsCharacterPickerOpen(false)}
  onSelectCharacter={handleCharacterSelect}
  triggerRef={characterButtonRef}
  anchorPosition="bottom-right" // or other positioning option
  initialValue={currentSelectedCharacter}
  title="Select Character"
/>
```

#### **🎯 Available Anchor Positions:**
- **`bottom-right`**: Anchor bottom-right corner above trigger (Appearance panel)
- **`left-slide`**: Default left positioning (Character palette editor)
- **`left-bottom`**: Left positioning with bottom alignment (Import media panel)
- **`left-bottom-aligned`**: Precise bottom alignment (Edit buttons)
- **`gradient-panel`**: Centered viewport positioning (Gradient fill panel)

#### **📋 Standardized Character Categories with Icons:**
| Category | Icon | Characters |
|----------|------|------------|
| **Basic Text** | `Type` | A-Z, a-z, 0-9 |
| **Punctuation** | `Minus` | .,!?;:"'()[]{}... |
| **Math/Symbols** | `Hash` | +-*/%=<>@#$&^... |
| **Lines/Borders** | `Grid3X3` | ─│┌┐└┘├┤┬┴┼... |
| **Blocks/Shading** | `Square` | █▓▒░▀▄▌▐... |
| **Arrows** | `Navigation` | ←→↑↓↖↗↘↙... |
| **Geometric** | `Triangle` | △▲▼▽◄►◀▶... |
| **Special** | `Sparkles` | ★☆♠♣♥♦※§... |

#### **🔧 Implementation Benefits:**
- **✅ Consistent UX**: All character pickers now have identical visual design and behavior
- **✅ Better Accessibility**: Enhanced visual hierarchy with icons and improved spacing
- **✅ Maintainable**: Single component eliminates code duplication across 5+ locations
- **✅ Future-Proof**: Easy to add new features or modify behavior in one place
- **✅ Professional UI**: Matches the enhanced gradient fill picker design throughout

#### **🚨 Migration Completed (Sept 29, 2025):**
- **✅ COMPLETE**: ActiveStyleSection (Appearance collapsible)
- **✅ COMPLETE**: MainCharacterPaletteSection (Character palette editor)  
- **✅ COMPLETE**: CharacterMappingSection (Import media panel)
- **✅ COMPLETE**: RemapCharactersEffectPanel (Character remapping effect)
- **✅ COMPLETE**: GradientStopPicker (Gradient fill controls)
- **✅ COMPLETE**: Old CharacterPicker component removed to eliminate tech debt

#### **🎯 Future Character Picker Requirements:**
When adding new features that need character selection:
1. **Always use EnhancedCharacterPicker** - Never create custom character selection UI
2. **Choose appropriate anchor position** based on trigger element location
3. **Provide contextual title** that describes the selection purpose
4. **Pass initialValue** to highlight currently selected character
5. **Follow established z-index patterns** for proper layering

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
- **Lasso Selection** → `useCanvasLassoSelection` (implemented: freeform selection with point-in-polygon detection)
- **Magic Wand Selection** → `useCanvasMagicWandSelection` (implemented: select same character/color with contiguous/non-contiguous modes)
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

**Common Tool Toggle Patterns:**
- `rectangleFilled: boolean` - Rectangle/ellipse filled vs hollow mode
- `paintBucketContiguous: boolean` - Paint bucket contiguous vs non-contiguous fill  
- `magicWandContiguous: boolean` - Magic wand contiguous vs non-contiguous selection

**Tool Toggle UI Pattern (ToolPalette.tsx):**
```typescript
{activeTool === 'your-tool' && (
  <Card className="bg-card/50 border-border/50">
    <CardHeader className="pb-3">
      <CardTitle className="text-sm font-medium">Your Tool Options</CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={yourToolSetting}
          onChange={(e) => setYourToolSetting(e.target.checked)}
          className="rounded border-border"
        />
        <span>Your setting description</span>
      </label>
    </CardContent>
  </Card>
)}
```

#### **Step 9: Add Tool Hotkey (MANDATORY)**
**🚨 CRITICAL: ALL new tools MUST have a hotkey assigned using the centralized hotkey system.**

**Add to `src/constants/hotkeys.ts`:**
```typescript
export const TOOL_HOTKEYS: ToolHotkey[] = [
  // ... existing hotkeys
  { tool: 'your-new-tool', key: 'y', displayName: 'Y', description: 'Your new tool hotkey' },
];
```

**Hotkey Selection Guidelines:**
- **Choose intuitive letters**: First letter of tool name preferred (P=Pencil, E=Eraser)
- **Avoid conflicts**: Check existing hotkeys and common shortcuts (avoid C, V, Z, X)
- **Single character**: Use single lowercase letters only
- **No modifiers**: Don't use Shift, Cmd, Ctrl combinations (reserved for other shortcuts)

**Examples of Good Hotkey Choices:**
```typescript
{ tool: 'pencil', key: 'p', displayName: 'P' },     // P for Pencil
{ tool: 'brush', key: 'b', displayName: 'B' },      // B for Brush  
{ tool: 'line', key: 'n', displayName: 'N' },       // N for liNe (L taken by Lasso)
{ tool: 'spray', key: 's', displayName: 'S' },      // S for Spray
```

**⚠️ Why This Is Mandatory:**
- **User Experience**: Professional tools always have hotkeys for efficiency
- **Consistency**: Maintains established interaction patterns
- **Accessibility**: Power users rely on keyboard shortcuts
- **Documentation**: Tooltips automatically show hotkeys
- **Future-Proofing**: Hotkey system is designed for easy expansion

**✅ Automatic Benefits When You Add Hotkey:**
- ✅ **Tool switching**: Single key press switches to your tool
- ✅ **Enhanced tooltips**: Tool button tooltips automatically show "(Y)"
- ✅ **Text input protection**: Hotkey automatically disabled during text tool typing
- ✅ **No conflicts**: System prevents conflicts with modifier-based shortcuts
- ✅ **Professional UX**: Matches industry standard tool behavior

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
- [ ] **Tool hotkey added to TOOL_HOTKEYS array** (MANDATORY - Step 9)
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

### **🎮 Universal Tool Hotkey System (Sept 5, 2025)**

**IMPORTANT: ASCII Motion now has a complete hotkey system for all tools with centralized, maintainable configuration.**

#### **🎯 Tool Hotkey Mappings:**
| Tool | Hotkey | Behavior |
|------|--------|----------|
| **Pencil** | `P` | Switch to pencil drawing tool |
| **Eraser** | `E` | Switch to eraser tool |
| **Fill** | `G` | Switch to paint bucket fill tool |
| **Rectangular Selection** | `M` | Switch to rectangular selection tool |
| **Lasso Selection** | `L` | Switch to lasso selection tool |
| **Magic Wand** | `W` | Switch to magic wand selection tool |
| **Eyedropper** | `I` | Switch to eyedropper tool |
| **Rectangle Drawing** | `R` | Switch to rectangle drawing tool |
| **Ellipse Drawing** | `O` | Switch to ellipse drawing tool |
| **Text Tool** | `T` | Switch to text tool |
| **Hand Tool** | `Space` | **Temporary** - Hold space to pan, release to return to previous tool |

#### **🏗️ Architecture Benefits:**
- **Centralized Configuration**: All hotkeys defined in `src/constants/hotkeys.ts`
- **Automatic Tooltip Enhancement**: Hotkeys automatically appear in tool button tooltips
- **Text Input Protection**: Hotkeys disabled during text tool typing
- **Easy Updates**: Change hotkeys in one place, updates everywhere
- **Consistent UX**: Professional tool switching behavior

#### **🔧 Implementation Pattern for Hotkey Updates:**

**Step 1: Update Hotkey Configuration** (`src/constants/hotkeys.ts`):
```typescript
export const TOOL_HOTKEYS: ToolHotkey[] = [
  { tool: 'newtool', key: 'n', displayName: 'N', description: 'New tool hotkey' },
  // ... existing hotkeys
];
```

**Step 2: Automatic Integration** - No additional code needed:
- ✅ Hotkey processing: Automatically handled in `useKeyboardShortcuts`
- ✅ Tooltip display: Automatically enhanced in `ToolPalette`
- ✅ Text input protection: Automatically respects typing state
- ✅ Keyboard shortcuts: All existing Cmd/Ctrl shortcuts preserved

#### **🚨 Critical Design Decisions:**
- **Space Key Special Behavior**: Space key activates hand tool temporarily (existing behavior preserved)
- **Single Key Activation**: All other tools use single key press to switch permanently
- **Modifier Key Respect**: Tool hotkeys only trigger without modifier keys (Cmd+P still available for project shortcuts)
- **Text Tool Protection**: All single-key hotkeys automatically disabled during text input

#### **🚨 MANDATORY: All New Tools Must Have Hotkeys**
**When implementing ANY new tool, you MUST add it to the hotkey system. No exceptions.**

**Why This Is Non-Negotiable:**
- **Professional UX Standards**: Industry-standard tools always have keyboard shortcuts
- **User Efficiency**: Power users expect hotkey access to all tools
- **Architectural Consistency**: Maintains established interaction patterns  
- **Future-Proof Design**: Hotkey system is core to the tool architecture
- **Automatic Benefits**: Tool gets enhanced tooltips, text input protection, and professional behavior

**Required Steps for Every New Tool:**
1. **Add to TOOL_HOTKEYS array** in `src/constants/hotkeys.ts`
2. **Choose intuitive key**: First letter preferred, avoid conflicts with existing hotkeys
3. **Verify integration**: Tooltips automatically enhanced, tool switching works
4. **Test thoroughly**: Ensure hotkey works and doesn't conflict with text input

**❌ Do NOT:**
- Skip hotkey assignment for "simple" tools
- Use modifier keys (Shift+X, Ctrl+Y) - these are reserved
- Choose conflicting keys (check existing TOOL_HOTKEYS first)
- Implement custom hotkey logic - use the centralized system

#### **🎯 Future Hotkey Management:**
```typescript
// ✅ Easy to update hotkeys:
const TOOL_HOTKEYS = [
  { tool: 'pencil', key: 'p', displayName: 'P' },     // Change 'p' to 'd' for different hotkey
  { tool: 'eraser', key: 'e', displayName: 'E' },     // Change display name for UI
  // Add new tools with hotkeys easily
];

// ✅ Hotkeys automatically work across:
// - Tool switching in useKeyboardShortcuts
// - Tooltip enhancement in ToolPalette  
// - Text input protection system
// - Future keyboard shortcut features

// 🚨 REMINDER: All new tools MUST have hotkeys (see Step 9 in tool creation guide)
```

### **🎨 Color Management Hotkeys (Dec 28, 2024)**

**IMPORTANT: ASCII Motion now has professional color workflow hotkeys for efficient color management during drawing.**

#### **🎯 Color Hotkey Mappings:**
| Hotkey | Action | Behavior |
|--------|--------|----------|
| **X** | Swap Foreground/Background | Exchanges current foreground and background colors |
| **[** | Previous Palette Color | Navigate to previous color in active palette |
| **]** | Next Palette Color | Navigate to next color in active palette |

#### **🏗️ Implementation Architecture:**
- **Context-Aware Navigation**: `[` and `]` respect current tab (Foreground/Background) selection
- **Loop-Around Behavior**: Navigation wraps to beginning/end when reaching palette boundaries
- **Edge Case Handling**: Proper handling of transparent backgrounds and empty palettes
- **DOM Integration**: Uses DOM queries to determine active color context
- **Zustand Integration**: Leverages existing toolStore and paletteStore state management

#### **🔧 Technical Implementation Pattern:**

**Color Swap Logic**:
```typescript
const swapForegroundBackground = () => {
  const currentFg = toolStore.getState().selectedColor;
  const currentBg = toolStore.getState().selectedBgColor;
  
  // Handle transparent background edge case
  const newBg = currentFg === 'transparent' ? ANSI_COLORS[0] : currentFg;
  
  toolStore.getState().setSelectedColor(currentBg);
  toolStore.getState().setSelectedBgColor(newBg);
};
```

**Palette Navigation Logic**:
```typescript
const navigatePaletteColor = (direction: 'next' | 'prev') => {
  const { getActiveColors, selectedColorId, setSelectedColor } = usePaletteStore.getState();
  const activeColors = getActiveColors();
  
  // Context detection via DOM
  const isForegroundTab = document.querySelector('[data-tab="foreground"]')?.getAttribute('data-state') === 'active';
  
  // Calculate new index with wraparound
  const currentIndex = activeColors.findIndex(c => c.id === selectedColorId);
  const newIndex = direction === 'next' 
    ? (currentIndex + 1) % activeColors.length
    : (currentIndex - 1 + activeColors.length) % activeColors.length;
    
  const newColor = activeColors[newIndex];
  
  // Apply to appropriate color slot
  if (isForegroundTab) {
    toolStore.getState().setSelectedColor(newColor.ansi);
  } else {
    toolStore.getState().setSelectedBgColor(newColor.ansi);
  }
  
  setSelectedColor(newColor.id);
};
```

#### **🚨 Integration Guidelines:**
- **Hotkey Registration**: Added to `useKeyboardShortcuts.ts` main switch statement
- **Store Dependencies**: Imports `usePaletteStore` and `ANSI_COLORS` constant
- **Component Reuse**: Leverages existing swap logic patterns from `ForegroundBackgroundSelector.tsx`
- **Context Preservation**: Maintains current palette selection and UI state
- **Professional Standards**: Follows industry-standard color workflow patterns

#### **🎯 Usage Benefits:**
- **Workflow Efficiency**: Rapid color changes without mouse interaction
- **Professional Feel**: Matches industry-standard drawing application hotkeys
- **Context Awareness**: Smart navigation based on current UI selection
- **Edge Case Handling**: Robust behavior with transparent colors and palette boundaries

### **🔐 Keyboard Shortcut Protection for Text Input Tools**

**When creating tools that need text input (like the Text Tool), you MUST implement keyboard shortcut protection to prevent conflicts.**

#### **Text Input Tools Must Protect Against:**
- **Space Key Conflict**: Space bar normally triggers hand tool, but should type space during text input
- **Single-Key Tool Hotkeys**: Future tool shortcuts (P for pencil, E for eraser, etc.) must be disabled during typing
- **Modifier Key Preservation**: Ctrl+Z (undo), Ctrl+C (copy), etc. should still work during text input

#### **Required Implementation Pattern:**

**Step 1: Add Text State to Tool Store**
```typescript
// In src/stores/toolStore.ts
interface TextToolState {
  isTyping: boolean;
  cursorPosition: { x: number; y: number } | null;
  cursorVisible: boolean;
  textBuffer: string;
}
```

**Step 2: Protect Space Key in CanvasGrid**
```typescript
// In src/components/features/CanvasGrid.tsx
const { textToolState } = useToolStore();

// Handle Space key for temporary hand tool
// Don't override space key if text tool is actively typing
if ((event.key === ' ' || event.code === 'Space') && !textToolState.isTyping) {
  event.preventDefault();
  setSpaceKeyDown(true);
}
```

**Step 3: Protect All Non-Modifier Keys in Keyboard Shortcuts**
```typescript
// In src/hooks/useKeyboardShortcuts.ts
const handleKeyDown = useCallback((event: KeyboardEvent) => {
  // If text tool is actively typing, only allow Escape and modifier-based shortcuts
  if (textToolState.isTyping && !event.metaKey && !event.ctrlKey && event.key !== 'Escape') {
    return; // Let the text tool handle all other keys
  }
  
  // Continue with normal shortcut processing...
}, [textToolState, /* other deps */]);
```

**Step 4: Add Cursor Rendering**
```typescript
// In src/hooks/useCanvasRenderer.ts
// Add text cursor overlay after other overlays
if (textToolState.isTyping && textToolState.cursorVisible && textToolState.cursorPosition) {
  const { x, y } = textToolState.cursorPosition;
  
  if (x >= 0 && x < width && y >= 0 && y < height) {
    ctx.fillStyle = '#A855F7'; // Purple to match other overlays
    ctx.fillRect(
      x * effectiveCellSize + panOffset.x,
      y * effectiveCellSize + panOffset.y,
      effectiveCellSize,
      effectiveCellSize
    );
  }
}
```

#### **✅ Benefits of This Pattern:**
- **Future-Proof**: Automatically protects against any future single-key tool hotkeys
- **User-Friendly**: Prevents frustrating keyboard conflicts during text input  
- **Consistent**: Maintains expected behavior for modifier-based shortcuts
- **Extensible**: Pattern can be reused for any tool requiring text input

### **🎮 Selection Tool Keyboard Integration Requirements**

**Every selection tool MUST be included in global keyboard handlers for consistent UX:**

**Standard Selection Tool Keyboard Controls:**
- **Delete/Backspace**: Clear all selected cells and clear selection state
- **Cmd/Ctrl+C**: Copy selection to appropriate clipboard
- **Cmd/Ctrl+V**: Paste from appropriate clipboard (priority: magic wand → lasso → rectangular)
- **Escape**: Cancel/clear selection (handled by individual tools when active)
- **Enter**: Commit move operation (handled by individual tools when active)
- **Arrow Keys**: Move selection one cell in arrow direction (enters move mode if not already active)

**Step 1: Add to CanvasGrid Escape/Enter Handlers**
```typescript
// In src/components/features/CanvasGrid.tsx
if (event.key === 'Escape') {
  if ((selection.active && activeTool === 'select') || 
      (lassoSelection.active && activeTool === 'lasso') ||
      (magicWandSelection.active && activeTool === 'magicwand')) { // ADD NEW TOOL
    // Handle escape logic
  }
}

if (event.key === 'Enter' && moveState && 
    (activeTool === 'select' || activeTool === 'lasso' || activeTool === 'magicwand')) { // ADD NEW TOOL
  // Handle enter logic
}
```

**Step 2: Add to useKeyboardShortcuts Copy/Paste/Delete Priority**
```typescript
// In src/hooks/useKeyboardShortcuts.ts - Copy priority
if (magicWandSelection.active) {          // HIGHEST PRIORITY
  copyMagicWandSelection(cells);
} else if (lassoSelection.active) {       // MIDDLE PRIORITY  
  copyLassoSelection(cells);
} else if (selection.active) {            // LOWEST PRIORITY
  copySelection(cells);
}

// Paste mode priority  
if (hasMagicWandClipboard()) {           // HIGHEST PRIORITY
  // Handle magic wand paste
} else if (hasLassoClipboard()) {        // MIDDLE PRIORITY
  // Handle lasso paste  
} else if (hasClipboard()) {             // LOWEST PRIORITY
  // Handle rectangular paste
}

// Delete/Backspace key priority (clear selection content)
if (magicWandSelection.active) {         // HIGHEST PRIORITY
  // Clear magic wand selected cells and clear selection
} else if (lassoSelection.active) {      // MIDDLE PRIORITY
  // Clear lasso selected cells and clear selection
} else if (selection.active) {           // LOWEST PRIORITY
  // Clear rectangular selected cells and clear selection
}
```

**Step 3: Add Arrow Key Movement Handlers to CanvasGrid**
```typescript
// In src/components/features/CanvasGrid.tsx
if ((event.key === 'ArrowUp' || event.key === 'ArrowDown' || 
     event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
  // Only handle arrow keys when a selection tool is active and has an active selection
  if ((activeTool === 'select' && selection.active) || 
      (activeTool === 'lasso' && lassoSelection.active) ||
      (activeTool === 'magicwand' && magicWandSelection.active)) {
    event.preventDefault();
    event.stopPropagation();
    
    // Calculate arrow direction offset
    const arrowOffset = {
      x: event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0,
      y: event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0
    };
    
    // Call the arrow movement handler
    handleArrowKeyMovement(arrowOffset);
  }
}

// Arrow movement handler implementation
const handleArrowKeyMovement = (arrowOffset: { x: number; y: number }) => {
  // Determine which selection is active and handle accordingly
  if (activeTool === 'select' && selection.active) {
    handleRectangularSelectionArrowMovement(arrowOffset);
  } else if (activeTool === 'lasso' && lassoSelection.active) {
    handleLassoSelectionArrowMovement(arrowOffset);
  } else if (activeTool === 'magicwand' && magicWandSelection.active) {
    handleMagicWandSelectionArrowMovement(arrowOffset);
  }
};
```

**Arrow Key Movement Architecture Benefits:**
- **✅ COMPLETE**: All selection tools support arrow key movement with identical behavior
- **✅ COMPLETE**: Arrow keys automatically enter move mode if not already active
- **✅ COMPLETE**: Multiple arrow presses accumulate offset for precise positioning
- **✅ COMPLETE**: Selection remains active during movement until committed/cancelled
- **✅ COMPLETE**: Professional workflow that matches industry-standard selection tool behavior
- **✅ COMPLETE**: Seamless mouse interaction - no jumping when clicking after arrow-initiated moves

#### **🎯 Arrow Key Implementation Status (September 10, 2025):**
- **✅ COMPLETE**: Rectangular selection tool arrow key movement
- **✅ COMPLETE**: Lasso selection tool arrow key movement  
- **✅ COMPLETE**: Magic wand selection tool arrow key movement
- **✅ COMPLETE**: Fixed stale closure bug in keyboard event handlers
- **✅ COMPLETE**: Fixed mouse movement interference during arrow-initiated move mode
- **✅ COMPLETE**: Fixed first-click position jumping after arrow key movement

#### **✅ Why This Matters (Magic Wand Bug Discovery - Sept 5, 2025):**
- **Missing keyboard integration** led to Escape/Enter not working for move operations
- **Incomplete clipboard priority** broke copy/paste workflow
- **Selection tool consistency** requires identical keyboard behavior across all tools

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
    gridLineColor: calculateAdaptiveGridColor(canvasBackgroundColor), // ✅ NEW: Adaptive grid opacity
    textAlign: 'center' as CanvasTextAlign,
    textBaseline: 'middle' as CanvasTextBaseline,
    defaultTextColor: '#000000',
    defaultBgColor: '#FFFFFF'
  }), [cellSize, canvasBackgroundColor]); // ✅ NEW: Added canvasBackgroundColor dependency

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

**✅ Grid Color Optimization (IMPLEMENTED):**
```typescript
// ✅ Step 5.2: Adaptive grid color with dynamic opacity - COMPLETED
import { calculateAdaptiveGridColor } from '../utils/gridColor';

// Grid color automatically adapts to background for optimal visibility
const drawingStyles = useMemo(() => ({
  font: scaledFontString,
  gridLineColor: calculateAdaptiveGridColor(canvasBackgroundColor, theme), // Theme-aware calculation
  gridLineWidth: 1,
  textAlign: 'center' as CanvasTextAlign,
  textBaseline: 'middle' as CanvasTextBaseline,
  defaultTextColor: '#FFFFFF',
  defaultBgColor: '#000000'
}), [fontMetrics, zoom, canvasBackgroundColor, theme]);

// Grid color utility provides luminance-based contrast calculation:
// - Pure black/white: Full opacity for crisp appearance
// - Transparent backgrounds: Theme-aware colors (white lines in dark mode, black in light)
// - Colored backgrounds: 0.12-0.25 opacity range based on saturation
// - Light backgrounds: Dark grid lines with adaptive opacity  
// - Dark backgrounds: Light grid lines with adaptive opacity
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

**Frame Synchronization with Move Commit Pattern:**
```typescript
// ✅ CORRECT: Commit move operations before frame switching
const useFrameSynchronization = (moveState, setMoveState) => {
  useEffect(() => {
    if (currentFrameIndex !== previousFrameIndex) {
      let currentCellsToSave = new Map(cells);
      
      // Commit pending moves to preserve user work
      if (moveState) {
        const totalOffset = {
          x: moveState.baseOffset.x + moveState.currentOffset.x,
          y: moveState.baseOffset.y + moveState.currentOffset.y
        };
        
        const newCells = new Map(cells);
        moveState.originalData.forEach((_, key) => newCells.delete(key));
        moveState.originalData.forEach((cell, key) => {
          const [origX, origY] = key.split(',').map(Number);
          const newX = origX + totalOffset.x;
          const newY = origY + totalOffset.y;
          if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
            newCells.set(`${newX},${newY}`, cell);
          }
        });
        
        // Save committed data, not original canvas data
        currentCellsToSave = newCells;
        setCanvasData(newCells);

**🚨 CRITICAL: Frame Operation Race Condition Prevention (Updated Sept 8, 2025)**

**Frame Synchronization Guards Pattern:**
```typescript
// ✅ MANDATORY: Use operation flags to prevent race conditions
const useFrameSynchronization = () => {
  const { isDeletingFrame, isDraggingFrame, isAddingFrame } = useAnimationStore();
  
  useEffect(() => {
    // 🚨 GUARD CONDITION: Never save during frame operations
    if (isDeletingFrame || isDraggingFrame || isAddingFrame) {
      return; // Skip auto-save to prevent data corruption
    }
    
    // Normal synchronization logic only when safe
    if (shouldSave && frameChanged) {
      saveCanvasToFrame();
    }
  }, [frameIndex, cells, isDeletingFrame, isDraggingFrame, isAddingFrame]);
};

// ✅ FRAME OPERATION PATTERN: Set flags during operations
const deleteFrame = (index: number) => {
  set({ isDeletingFrame: true });
  
  // Perform atomic frame deletion
  set((state) => ({
    frames: state.frames.filter((_, i) => i !== index),
    currentFrameIndex: Math.min(state.currentFrameIndex, newLength - 1)
  }));
  
  // Reset flag after operation completes
  setTimeout(() => set({ isDeletingFrame: false }), 0);
};
```

**⚠️ Race Condition Symptoms:**
- Frame deletion shows wrong remaining frames ([1,2,3,4] → delete 3 → [1,2,3] instead of [1,2,4])
- Canvas data from wrong frame appears after operations
- Frame reordering corrupts animation sequence
- Undo/redo restores incorrect frame data

**🔧 Required Implementation Pattern:**
1. **Add operation flags to store** (`isDeletingFrame`, `isDraggingFrame`, etc.)
2. **Guard useFrameSynchronization** with flag checks
3. **Set flags before operations**, reset after completion  
4. **Use atomic state updates** for frame array modifications
5. **Timeout-based flag resets** to handle async completion
        setMoveState(null);
      }
      
      // Save committed changes to frame before switching
      setFrameData(previousFrameIndex, currentCellsToSave);
      loadFrameToCanvas(currentFrameIndex);
    }
  }, [currentFrameIndex, moveState]);
};

// ❌ WRONG: Lose user work by not committing moves
if (currentFrameIndex !== previousFrameIndex) {
  setMoveState(null); // Cancels move instead of committing
  setFrameData(previousFrameIndex, cells); // Saves uncommitted state
}
```

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

## Current Architecture Status (Enhanced September 27, 2025):
🚨 **LATEST**: HTML Export Canvas Presentation Refresh (Sept 28, 2025)

**HTML Export Canvas Presentation Refresh (Sept 28, 2025):**
- ✅ **True Canvas Outline**: Exported pages now wrap frames in a dedicated `.animation-stage` sized via CSS variables so the grey border reflects the full canvas dimensions—no more phantom 20px placeholder box in the top-left corner
- ✅ **Stacked Layout Flow**: Controls and metadata now sit inside an `.animation-shell` column beneath the stage, ensuring skinny viewports never overlap playback buttons with the animation surface
- ✅ **Robust Runtime**: The inlined player reconstructs frames inside `#animationCanvas`, uses guarded timeouts, and starts playback immediately while still letting the first Play/Pause click respond correctly
- ✅ **Flicker-Free Playback**: Frame toggling now keeps one layer visible at all times using display swaps (no opacity fades) so animation runs without flashing between frames
- ✅ **Playback UI Parity**: Control bar mirrors the in-app timeline—skip, play/pause, stop, next, loop toggle, and frame badge—using embedded Lucide SVGs so exports stay completely self-contained
- ✅ **Styling Cleanup**: New dark-friendly styling, focus states, and pointer-safe frame overlays keep the export accessible while mirroring the app’s typography
- ✅ **Icon Fidelity**: Inline SVGs match Lucide’s published 2px stroke geometry exactly, ensuring perfect parity even without the React icon runtime
- ✅ **Stable Frame Badge**: Numeric readout pads digits and uses tabular numerals within a fixed pill so the control bar never jitters when frame counts change
- ✅ **Simplified Controls**: Pause button removed—play disables while playback is active, stop is the sole interrupt, and the guarded timers ensure the "click but still running" race never resurfaces

🚨 **PREVIOUS**: Export Dialog Responsive Layout Standard (Sept 28, 2025)

**Export Dialog Responsive Layout Standard (Sept 28, 2025):**
- ✅ **Sticky Structure**: All export dialogs now share a `DialogContent` scaffold with `p-0`, `max-h-[80vh]`, and sticky header/footer sections for consistent behavior on short viewports
- ✅ **Scroll-Safe Inputs**: Filename inputs (and progress indicators when present) live in a sticky top block so users can edit filenames without losing context while scrolling through settings
- ✅ **Scrollable Settings**: Format-specific controls sit inside a `flex-1 overflow-y-auto px-6 py-4 space-y-4` container to provide independent scrolling without clipping action buttons
- ✅ **Persistent Actions**: Export/cancel buttons reside in a sticky bottom bar with `border-t` framing to prevent accidental scroll-away and to align with the HTML dialog pattern
- ✅ **Disabled-State Consistency**: Interactive controls respect the shared `isExporting` flag, preventing mid-export edits and ensuring UI feedback remains consistent across formats

🚨 **EARLIER**: JSON Export Pretty-Print Overhaul (Sept 27, 2025)

**JSON Export Pretty-Print Overhaul (Sept 27, 2025):**
- ✅ **Human-Readable Frames**: Pretty-printed exports now emit `content` as an array of per-line strings for easy inspection, while retaining `contentString` for compatibility tooling
- ✅ **Compact Color Blocks**: Foreground/background color maps are serialized as single-line JSON strings when pretty print is enabled to keep files concise
- ✅ **Importer Compatibility**: JSON importer accepts both legacy string content and new array formats, and automatically parses stringified color payloads
- ✅ **Non-Pretty Exports Unchanged**: Compact export mode continues to produce the original schema for automated pipelines

**Gradient Fill Quantization Controls (Sept 26, 2025):**
- ✅ **Quantize Slider**: Linear interpolation now has a 1–10 step slider plus an ∞ setting for fully smooth blends
- ✅ **Unified Behavior**: Characters, text color, and background gradients all respect quantize steps when interpolation is linear
- ✅ **Engine Support**: `sampleGradientProperty` snaps linear interpolation to discrete levels while preserving existing dithering modes
- ✅ **UI Integration**: Gradient panel includes a shadcn-aligned slider mirroring the dithering control UX
- ✅ **Safe Defaults**: Gradient definitions default to `'infinite'` to retain smooth gradients on legacy projects

- ✅ **Image Export (PNG & JPEG)**: High-DPI image export with device pixel ratio scaling and adjustable JPEG quality
- ✅ **Session Export/Import**: Complete project state preservation with `.asciimtn` files, including custom color + character palettes, mapping preferences, and recent color history
- ✅ **Typography Integration**: Font size, character spacing, and line spacing properly captured and restored
- ✅ **Canvas Content Loading**: Session import correctly loads current frame content to canvas
- ✅ **Export Renderer**: Unified `ExportRenderer` class with high-quality canvas rendering
- ✅ **Session Importer**: Complete `SessionImporter` with typography callbacks for context integration
- ✅ **Export Data Collector**: Comprehensive data collection for all export formats
- ✅ **Professional UI**: Dropdown-based export interface with format-specific dialogs
- ✅ **Error Handling**: Robust validation and error handling throughout export/import pipeline
- ✅ **TypeScript Integration**: Complete type definitions for all export formats and settings

**OS Clipboard Integration Complete** (Sept 10, 2025):
- ✅ **Transparent Copy Operation**: Cmd/Ctrl+C now copies to both internal clipboard AND OS clipboard
- ✅ **All Selection Types Supported**: Rectangular, lasso, and magic wand selections export to OS clipboard
- ✅ **Smart Text Formatting**: Empty cells become spaces only when needed, trailing spaces cropped
- ✅ **Cross-Platform Compatibility**: Uses Clipboard API with graceful fallback for older browsers
- ✅ **Preserved Functionality**: All existing copy/paste behavior remains unchanged
- ✅ **Professional Integration**: Users can now paste ASCII art directly into text editors, terminals, and other applications

**Select All Feature Complete** (Sept 10, 2025):
- ✅ **Cmd/Ctrl+A Select All**: Activates rectangular selection tool and selects entire canvas
- ✅ **Professional UX**: Industry-standard "Select All" behavior with automatic tool switching
- ✅ **Seamless Integration**: Works with existing copy/paste/move workflow
- ✅ **Maintainable Pattern**: Follows established selection tool architecture patterns

**Arrow Key Movement for All Selection Tools Complete** (Sept 10, 2025):
- ✅ **Arrow Key Movement**: All selection tools (rectangular, lasso, magic wand) support arrow key movement
- ✅ **Move Mode Integration**: Arrow keys automatically enter move mode without requiring mouse click first  
- ✅ **Seamless Mouse Interaction**: Fixed position jumping when clicking after arrow-initiated movement
- ✅ **Professional UX**: Industry-standard keyboard navigation matching professional graphics software
- ✅ **Enhanced History System**: Unified timeline for canvas and animation actions with frame operation synchronization
- ✅ **Animation Undo/Redo**: Add frame, duplicate, delete, reorder, duration/name changes fully supported
- ✅ **useAnimationHistory Hook**: Clean API for history-enabled animation operations  
- ✅ **Frame Synchronization Guards**: Race condition prevention with operation flags (isDeletingFrame, isDraggingFrame)
- ✅ **Professional Workflow**: Industry-standard undo/redo behavior across all operations without data corruption
- ✅ Canvas Context & State extracted (Step 1 complete)  
- ✅ Mouse Interaction Logic extracted to Hooks (Step 2 complete)
- ✅ Rendering split into focused hook (Step 3 complete)
- ✅ Tool-specific components (Step 4 complete)
- ✅ Performance Optimizations - Memoization (Step 5.1 complete)
- ✅ **Enhanced Paste Functionality with Visual Preview** (Sept 3, 2025)
- ✅ **Ellipse Tool Implementation** - Complete drag-based ellipse drawing tool (Sept 3, 2025)
- ✅ **Shift Key Aspect Ratio Locking** - Rectangle and ellipse tools support Shift for squares/circles (Sept 3, 2025)
- ✅ **Enhanced Pencil Tool** - Shift+click line drawing with Bresenham algorithm (Sept 3, 2025)
- ✅ **Lasso Selection Tool** - Complete freeform selection with precise center-based detection (Sept 4-5, 2025)
- ✅ **Text Tool** - Complete text input with blinking cursor, word-based undo, and keyboard shortcut protection (Sept 5, 2025)
- ✅ **Magic Wand Selection** - Content-aware selection with contiguous/non-contiguous modes (Sept 5, 2025)
- ✅ **Paint Bucket Contiguous Toggle** - Enhanced fill tool with contiguous/non-contiguous mode selection (Sept 5, 2025)
- ✅ **Cell Hover Outline** - Universal hover feedback for all tools except hand tool (Sept 5, 2025)
- ✅ **Dropdown Layering System** - Portal-based dropdown menus with proper z-index hierarchy (Sept 6, 2025)

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

**Dropdown Layering System - September 6, 2025**:
- ✅ **Portal-based Rendering**: Typography and background color dropdowns use React portals for proper layering
- ✅ **Z-Index Hierarchy**: Established clear z-index system (canvas: z-10-40, UI: z-50-999, dropdowns: z-99999+)
- ✅ **Dynamic Positioning**: Dropdowns calculate position relative to trigger buttons with proper spacing
- ✅ **Click-Outside Detection**: Enhanced click handling prevents accidental closure during dropdown interaction
- ✅ **Event Propagation Control**: stopPropagation() on dropdown content prevents unwanted event bubbling
- ✅ **Accessibility Enhancements**: Added proper ARIA labels, expanded states, and controls relationships
- ✅ **Development Guidelines**: Documented best practices in both DEVELOPMENT.md and COPILOT_INSTRUCTIONS.md

**Step 4 Completion - Tool Components**:
- CanvasGrid.tsx maintained at ~111 lines (pure composition)
- Created 5 tool-specific components with status UI (181 lines total)
- Created ToolManager and ToolStatusManager for composition (68 lines total)
- Created useToolBehavior hook for tool coordination (109 lines)
- Enhanced user experience with rich, tool-specific status messages

**Final Architecture Achievements**:
- Total CanvasGrid reduction: 501 → 111 lines (~78% reduction)
- 10+ specialized hooks created for canvas functionality (including performance, text input, lasso selection)
- 8+ tool components created for extensible tool system
- Complete separation of concerns: state, interaction, rendering, tools, performance
- Pattern established for easy addition of new tools (8-step guide)
- Keyboard shortcut protection system for text input tools
- Performance optimizations support large grids (200x100+ cells)
- Advanced selection tools (rectangular, lasso) with move functionality
- Text input tool with cursor rendering and conflict-free operation
- Ready for Steps 5.2-5.3 and Phase 2: Animation System
**When Working with Canvas Components (Post Step 5.1):**
1. **Use CanvasProvider** - Wrap canvas components in context
2. **Use established hooks** - `useCanvasContext()`, `useCanvasState()`, `useMemoizedGrid()`, etc.
3. **Don't add useState to CanvasGrid** - Extract to context or hooks instead
4. **Include Zustand dependencies** - Add reactive store data (like `cells`) to useCallback/useMemo deps
5. **Use performance tools** - Import and use performance measurement utilities in development
6. **Follow memoization patterns** - Use React.memo, useMemo, useCallback for expensive operations
7. **Follow tool component pattern** - Use the 8-step guide above for ALL new tools
8. **Implement keyboard protection** - For text input tools, use the keyboard shortcut protection pattern
9. **Test large grids** - Use PerformanceMonitor to validate performance on 200x100+ grids
10. **Follow the pattern** - Reference existing refactored code for consistency
11. **Check DEVELOPMENT.md** - Always review current step status before changes
12. **📋 UPDATE DOCS** - Complete documentation protocol after ANY architectural change

**🚨 STOP: Before finishing ANY canvas work, have you updated the documentation?**

---

## **UI Layout & Typography Guidelines (Sept 6, 2025)**

### **Current Layout Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│ Header: ASCII Motion + Theme Toggle                        │
├─────────────────────────────────────────────────────────────┤
│ Left Sidebar    │ Center Canvas Area  │ Right Sidebar       │
│ - Tools (11)    │ ┌─────────────────┐ │ - Status Info       │
│ - Characters    │ │ Canvas Settings │ │ - Canvas Info       │
│ - Colors        │ │ (Centered)      │ │ - Animation Info    │
│                 │ ├─────────────────┤ │ - Current Tool      │
│                 │ │                 │ │ - Character Info    │
│                 │ │ Canvas Grid     │ │                     │
│                 │ │                 │ │                     │
│                 │ │                 │ │                     │
│                 │ ├─────────────────┤ │                     │
│                 │ │ Grid: 80×26     │ │                     │
│                 │ │ [Action Buttons]│ │                     │
│                 │ │ Status: Ready   │ │                     │
│                 │ └─────────────────┘ │                     │
├─────────────────────────────────────────────────────────────┤
│ Timeline Footer: Coming Soon                               │
└─────────────────────────────────────────────────────────────┘
```

### **Typography Controls Location:**
- **CanvasSettings Toolbar**: Typography button with dropdown panel
- **Controls Available**: Character Spacing (0.5x-2.0x), Line Spacing (0.8x-2.0x), Reset button
- **UI Priority**: Typography controls have dedicated space in centered toolbar

### **Action Buttons Relocation (Sept 6, 2025):**
- **Previous Location**: Top toolbar (caused crowding with typography controls)
- **New Location**: Below canvas grid, replacing simple grid size readout  
- **Benefits**: More space for canvas settings, better visual hierarchy
- **Components**: CanvasActionButtons.tsx handles Copy/Paste/Undo/Redo/Clear

### **Layout Guidelines for New Features:**
1. **Top Toolbar Space**: Reserved for canvas settings (size, zoom, grid, typography, background)
2. **Bottom Canvas Area**: Action buttons + grid info + tool status
3. **Left Sidebar**: Tools, character palette, color palette
4. **Right Sidebar**: Read-only status information and statistics
5. **Typography Priority**: Always ensure typography controls remain accessible

### **UI Constraint Requirements:**
- **Never crowd top toolbar** - Move action buttons to bottom if needed
- **Respect typography space** - New controls must not conflict with typography dropdown
- **Maintain responsive design** - Test at different window sizes
- **Follow shadcn patterns** - Use consistent button sizes and spacing
- **Compact bottom area** - Use smaller buttons (`h-6`, `text-xs`) for canvas footer

---

## 📋 **Architectural Decisions Log**

### **Paint Bucket Contiguous/Non-Contiguous Toggle Enhancement (Sept 5, 2025)**
**Decision**: Add contiguous/non-contiguous mode toggle to paint bucket tool following established patterns
**Goal**: Provide users with both connected-area fill and global matching fill capabilities
**Pattern**: Follow magic wand tool toggle pattern for UI consistency

**Implementation Architecture**:
- **Enhanced fillArea Function**: Modified to accept optional `contiguous` parameter with dual algorithms
- **Tool Store Integration**: Added `paintBucketContiguous: boolean` state with default `true`
- **UI Pattern Consistency**: Used same Card/checkbox pattern as rectangle filled and magic wand contiguous toggles
- **Hook Integration**: useDrawingTool passes contiguous setting from tool store to fillArea function

**Algorithm Design**:
```typescript
// Contiguous Mode (default): Original flood fill with 4-directional expansion
const toFill: { x: number; y: number }[] = [{ x: startX, y: startY }];
// Queue-based neighbor checking with visited set

// Non-contiguous Mode: Complete canvas scan for exact matches
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    // Check character + color + background color equality
  }
}
```

**Files Modified**:
- `src/types/index.ts` - Added paintBucketContiguous to ToolState interface
- `src/stores/toolStore.ts` - Added state and action for paint bucket toggle
- `src/stores/canvasStore.ts` - Enhanced fillArea with contiguous parameter and dual algorithms
- `src/hooks/useDrawingTool.ts` - Updated to pass contiguous setting to fillArea
- `src/components/tools/PaintBucketTool.tsx` - Enhanced status to show current mode
- `src/components/features/ToolPalette.tsx` - Added toggle UI below paint bucket button

**User Experience Benefits**:
- **Backwards Compatibility**: Default contiguous mode preserves existing behavior
- **Professional Feel**: Matches expectations from other graphics applications
- **Clear Feedback**: Status messages indicate "connected areas" vs "all matching cells"
- **UI Consistency**: Same toggle pattern as other tool options

**Pattern Established**: This creates a reusable pattern for tool mode toggles that can be applied to future tools requiring similar dual-mode functionality.

### **Typography System & UI Layout Enhancement (Sept 6, 2025)**
**Decision**: Implement monospace character aspect ratio (~0.6) with user-adjustable spacing controls
**Goal**: Provide realistic terminal-like ASCII art rendering with proper character proportions
**UI Impact**: Reorganize layout to accommodate typography controls without crowding interface

**Core Typography Implementation**:
- **Font Metrics System**: `src/utils/fontMetrics.ts` - Calculates monospace aspect ratio, character/line spacing
- **Grid Color System**: `src/utils/gridColor.ts` - Adaptive grid opacity based on background color luminance
- **Context Integration**: Enhanced `CanvasContext` with typography state (characterSpacing, lineSpacing, fontMetrics)
- **Renderer Updates**: `useCanvasRenderer` now uses rectangular cells with zoom-scaled fonts and adaptive grid colors
- **Coordinate System**: All tools updated to use `cellWidth` × `cellHeight` instead of square `cellSize`

**Typography Controls**:
```typescript
// User Controls Added to CanvasSettings
characterSpacing: 0.5x - 2.0x  // Character width multiplier (tracking)
lineSpacing: 0.8x - 2.0x       // Line height multiplier (leading)  
fontMetrics: {                 // Computed automatically
  fontSize: number,            // Base font size (from cellSize)
  fontFamily: 'Courier New',   // Monospace font
  aspectRatio: 0.6            // Character width/height ratio
}
```

**Grid Color System**:
```typescript
// Adaptive grid color calculation in utils/gridColor.ts
calculateAdaptiveGridColor(backgroundColor: string): string

// Color calculation algorithm:
// 1. Parse hex color to RGB and calculate luminance
// 2. Determine grid line color (dark/light) based on background luminance  
// 3. Adjust opacity based on color saturation for optimal visibility
// 4. Special handling for pure black/white (full opacity for crispness)

// Examples:
calculateAdaptiveGridColor('#000000') // → '#333333' (full opacity dark gray)
calculateAdaptiveGridColor('#ffffff') // → '#E5E7EB' (full opacity light gray)  
calculateAdaptiveGridColor('transparent') // → 'rgba(0, 0, 0, 0.2)' (visible on transparent backgrounds)
calculateAdaptiveGridColor('#ff0000') // → 'rgba(255, 255, 255, 0.18)' (adaptive opacity)
calculateAdaptiveGridColor('#800080') // → 'rgba(255, 255, 255, 0.15)' (adaptive opacity)
```

**UI Layout Reorganization**:
- **Problem**: Top toolbar crowded with canvas settings + action buttons + typography controls
- **Solution**: Moved Copy/Paste/Undo/Redo/Clear buttons from top toolbar to bottom of canvas area
- **New Component**: `CanvasActionButtons.tsx` - Compact buttons with `h-6` sizing for canvas footer
- **Result**: Typography controls have dedicated space in centered top toolbar

**Architecture Changes**:
- **Typography-Aware Coordinate System**: All tools now use `cellWidth`/`cellHeight` from context
- **Zoom Integration**: Font scaling properly respects zoom level (fixed font size × zoom)
- **Selection Tools Updated**: Rectangle, lasso, magic wand account for non-square cell dimensions
- **Rendering Optimization**: Memoized font calculations with zoom dependency

**Files Modified**:
- `src/utils/fontMetrics.ts` - NEW: Font metrics calculation utilities
- `src/utils/gridColor.ts` - NEW: Adaptive grid color calculation utilities
- `src/utils/clipboardUtils.ts` - NEW: OS clipboard integration utilities (Sept 10, 2025)
- `src/contexts/CanvasContext.tsx` - Added typography state and computed cell dimensions
- `src/hooks/useCanvasRenderer.ts` - Updated for rectangular cells, zoom-scaled fonts, and adaptive grid colors
- `src/components/features/CanvasSettings.tsx` - Added typography controls dropdown
- `src/components/features/CanvasActionButtons.tsx` - NEW: Relocated action buttons
- `src/components/features/CanvasGrid.tsx` - Updated layout to include action buttons
- `src/stores/toolStore.ts` - Enhanced copy functions with OS clipboard integration (Sept 10, 2025)
- `src/App.tsx` - Simplified top toolbar, removed action buttons

**User Experience Benefits**:
- **Realistic ASCII Art**: Character aspect ratio matches terminal/editor rendering
- **Customizable Spacing**: Fine-tune character tracking and line spacing for different art styles
- **Adaptive Grid Visibility**: Grid automatically adjusts opacity for optimal visibility on any background color
- **Reduced Visual Noise**: Grid provides guidance without overwhelming content on colored backgrounds
- **Professional Layout**: Clean, uncluttered interface with logical control grouping
- **Preserved Functionality**: All tools work correctly with rectangular cell system

**Pattern Established**: Typography system provides foundation for future text-rendering features while maintaining clean UI organization patterns.

### **Lasso Selection Algorithm Precision Fix (Sept 5, 2025)**
**Decision**: Switch from multi-criteria cell selection to center-based selection for lasso tool
**Issue**: Lasso selection was over-selecting cells outside the drawn path due to aggressive selection criteria
**Root Cause**: Original algorithm selected cells if ANY corner was inside polygon OR if polygon edge intersected cell boundary

**Solution Implemented**:
- **Removed corner-based selection**: No longer selects cells just because a corner touches the lasso
- **Removed edge intersection**: No longer selects cells just because lasso line grazes the boundary
- **Center-based selection only**: Cells selected if and only if their center point (x+0.5, y+0.5) is inside the polygon
- **Maintained smoothing**: Kept 0.2 tolerance for smooth visual paths without affecting selection accuracy

**Files Modified**:
- `src/utils/polygon.ts` - Simplified `getCellsInPolygon` function from 37 lines to 20 lines
- Removed unused helper functions: `polygonIntersectsCell`, `lineIntersectsLine`

**Pattern Established**:
```typescript
// ✅ Precise Center-Based Selection
export function getCellsInPolygon(polygon: Point[], width: number, height: number): Set<string> {
  const selectedCells = new Set<string>();
  
  // Find bounding box to limit search area
  const minX = Math.max(0, Math.floor(Math.min(...polygon.map(p => p.x))));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(...polygon.map(p => p.x))));
  const minY = Math.max(0, Math.floor(Math.min(...polygon.map(p => p.y))));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(...polygon.map(p => p.y))));

  // Check each cell in bounding box
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      // Only check if cell center is inside polygon for precise selection
      const cellCenter = { x: x + 0.5, y: y + 0.5 };
      
      if (isPointInPolygon(cellCenter, polygon)) {
        selectedCells.add(`${x},${y}`);
      }
    }
  }

  return selectedCells;
}
```

**User Experience Benefits**:
- **Predictable Selection**: Only cells whose centers are enclosed get selected
- **Visual Accuracy**: Selection exactly matches what user intended to select
- **No Over-Selection**: Eliminates cells being selected when lasso just touches edges
- **Maintained Smoothness**: Visual path remains smooth while selection is precise

**Technical Benefits**:
- **Simplified Algorithm**: Reduced complexity from 3 selection criteria to 1
- **Better Performance**: Fewer calculations per cell (no corner/edge intersection checks)
- **Code Maintainability**: Cleaner, more focused selection logic
- **Debugging Friendly**: Single clear criterion makes issues easier to trace

**Lesson Learned**: Sometimes precision issues aren't about smoothing or tolerances, but about the fundamental algorithm being too aggressive. Center-based selection provides the right balance of precision and user predictability for grid-based selection tools.

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

---

## 🚀 Quick Reference: Dropdown Implementation

When implementing dropdowns/overlays that need to appear above canvas content:

```typescript
// Template: Portal-based dropdown with proper layering
import { createPortal } from 'react-dom';

const DropdownComponent = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);

  const calculatePosition = (buttonRef: HTMLElement | null) => {
    if (!buttonRef) return { top: 0, left: 0 };
    const rect = buttonRef.getBoundingClientRect();
    return { top: rect.bottom + 4, left: rect.left };
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (showDropdown && buttonRef.current && !buttonRef.current.contains(target)) {
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

  return (
    <>
      <Button 
        ref={buttonRef}
        onClick={() => {
          const pos = calculatePosition(buttonRef.current);
          setPosition(pos);
          setShowDropdown(!showDropdown);
        }}
      >
        Trigger
      </Button>
      
      {showDropdown && createPortal(
        <div 
          id="dropdown-id"
          className="fixed z-[99999] bg-popover border border-border rounded-md shadow-lg"
          style={{ top: `${position.top}px`, left: `${position.left}px` }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Content */}
        </div>,
        document.body
      )}
    </>
  );
};
```

**Z-Index Hierarchy**:
- Canvas: `z-10` to `z-40`
- UI overlays: `z-50` to `z-[999]`
- Dropdowns: `z-[99999]` (with portals)
- Modals: `z-[100000]+`

### Quick Documentation Health Check:
Ask yourself:
- Do the patterns in COPILOT_INSTRUCTIONS.md match the actual code?
- Would a new contributor be confused by any instructions?
- Are there conflicting patterns mentioned?
- Do all code examples reflect current best practices?

**🎯 Goal**: Documentation should always be the source of truth for current architecture.
