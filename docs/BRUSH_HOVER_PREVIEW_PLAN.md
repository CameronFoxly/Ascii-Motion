# Brush Hover Preview Implementation Plan

## Overview
Add a canvas hover preview system that displays the brush pattern (size and shape) at the cursor position when the pencil tool is active. This preview should integrate with the existing `CanvasOverlay` system and be extensible for future tool-specific hover modes.

## Current Architecture Analysis

### Existing Systems
1. **CanvasContext** (`src/contexts/CanvasContext.tsx`)
   - Already tracks `hoveredCell: { x: number; y: number } | null`
   - Provides `setHoveredCell()` action
   - **Currently tracked but NOT rendered**

2. **CanvasOverlay** (`src/components/features/CanvasOverlay.tsx`)
   - Renders multiple overlay types:
     - Selection rectangles (rectangular selection tool)
     - Lasso selection outlines
     - Line preview (shift+click with pencil)
     - Paste preview
     - Gradient application guides
   - Uses canvas 2D context for rendering
   - Already has dependency on `activeTool` from toolStore

3. **Mouse Tracking**
   - `handleMouseMove` in CanvasGrid updates cursor position
   - Grid coordinate calculation already in place
   - No current hover cell visualization

4. **Brush System**
   - `brushSize` and `brushShape` in toolStore
   - `calculateBrushCells()` utility function in `brushUtils.ts`
   - Cell aspect ratio already handled

## Implementation Plan

### Phase 1: State Management (Minimal Changes)
**Goal**: Add brush hover preview state without breaking existing functionality

#### 1.1 Add Hover Preview State to CanvasContext
**File**: `src/contexts/CanvasContext.tsx`

```typescript
// Add to CanvasContextValue interface
hoverPreview: {
  active: boolean;
  mode: 'none' | 'brush' | 'rectangle' | 'ellipse' | 'line'; // Extensible for future tools
  cells: Array<{ x: number; y: number }>;
};

// Add action
setHoverPreview: (preview: { 
  active: boolean; 
  mode: 'none' | 'brush' | 'rectangle' | 'ellipse' | 'line';
  cells: Array<{ x: number; y: number }>;
}) => void;
```

**Rationale**: 
- Keeps hover state centralized in CanvasContext (where `hoveredCell` already lives)
- `mode` field makes it extensible for other tools (rectangle preview, ellipse preview, etc.)
- Generic `cells` array works for any tool pattern

#### 1.2 Initialize State
```typescript
const [hoverPreview, setHoverPreview] = useState<{
  active: boolean;
  mode: 'none' | 'brush' | 'rectangle' | 'ellipse' | 'line';
  cells: Array<{ x: number; y: number }>;
}>({
  active: false,
  mode: 'none',
  cells: []
});
```

### Phase 2: Hover Preview Calculation Hook
**Goal**: Create reusable hook for calculating tool-specific hover patterns

#### 2.1 Create New Hook: `useHoverPreview.ts`
**File**: `src/hooks/useHoverPreview.ts`

```typescript
/**
 * Hook for calculating hover preview patterns for different tools
 * Returns the cells that should be highlighted based on:
 * - Active tool
 * - Tool settings (brush size/shape, rectangle filled, etc.)
 * - Current hover position
 */
export const useHoverPreview = () => {
  const { activeTool, brushSize, brushShape } = useToolStore();
  const { hoveredCell, fontMetrics, setHoverPreview } = useCanvasContext();
  
  useEffect(() => {
    if (!hoveredCell) {
      // Clear preview when mouse leaves canvas
      setHoverPreview({ active: false, mode: 'none', cells: [] });
      return;
    }
    
    // Calculate preview based on active tool
    switch (activeTool) {
      case 'pencil': {
        const brushCells = calculateBrushCells(
          hoveredCell.x,
          hoveredCell.y,
          brushSize,
          brushShape,
          fontMetrics.aspectRatio
        );
        setHoverPreview({
          active: true,
          mode: 'brush',
          cells: brushCells
        });
        break;
      }
      
      // Future extensibility examples:
      // case 'rectangle':
      // case 'ellipse':
      // case 'line':
      //   // Calculate pattern for other tools
      
      default:
        // No hover preview for other tools
        setHoverPreview({ active: false, mode: 'none', cells: [] });
    }
  }, [hoveredCell, activeTool, brushSize, brushShape, fontMetrics.aspectRatio]);
};
```

**Rationale**:
- Separates hover calculation logic from rendering
- Automatically updates when brush settings change
- Easy to extend with new tool modes
- Respects when mouse leaves canvas

### Phase 3: Rendering in CanvasOverlay
**Goal**: Add hover preview rendering without affecting existing overlays

#### 3.1 Update CanvasOverlay Component
**File**: `src/components/features/CanvasOverlay.tsx`

**Changes**:
1. Import `hoverPreview` from CanvasContext
2. Add hover preview rendering in `renderOverlay()` callback
3. Add to dependency array

```typescript
// Add to destructuring
const { hoverPreview } = useCanvasContext();

// Add in renderOverlay() - AFTER all other overlays
// This ensures hover preview is on top but doesn't interfere

// Draw hover preview (for brush and other tools)
if (hoverPreview.active && hoverPreview.cells.length > 0) {
  // Visual style based on mode
  const getPreviewStyle = (mode: string) => {
    switch (mode) {
      case 'brush':
        return {
          fillStyle: 'rgba(168, 85, 247, 0.15)', // Subtle purple
          strokeStyle: 'rgba(168, 85, 247, 0.5)',
          lineWidth: 1
        };
      // Future modes can have different styles
      case 'rectangle':
      case 'ellipse':
        return {
          fillStyle: 'rgba(59, 130, 246, 0.15)', // Blue
          strokeStyle: 'rgba(59, 130, 246, 0.5)',
          lineWidth: 1
        };
      default:
        return {
          fillStyle: 'rgba(255, 255, 255, 0.1)',
          strokeStyle: 'rgba(255, 255, 255, 0.3)',
          lineWidth: 1
        };
    }
  };
  
  const style = getPreviewStyle(hoverPreview.mode);
  ctx.fillStyle = style.fillStyle;
  ctx.strokeStyle = style.strokeStyle;
  ctx.lineWidth = style.lineWidth;
  
  hoverPreview.cells.forEach(({ x, y }) => {
    // Fill cell
    ctx.fillRect(
      x * effectiveCellWidth + panOffset.x,
      y * effectiveCellHeight + panOffset.y,
      effectiveCellWidth,
      effectiveCellHeight
    );
    
    // Outline cell for better visibility
    ctx.strokeRect(
      x * effectiveCellWidth + panOffset.x,
      y * effectiveCellHeight + panOffset.y,
      effectiveCellWidth,
      effectiveCellHeight
    );
  });
}

// Update dependency array
}, [...existing deps, hoverPreview]);
```

**Rationale**:
- Renders after all other overlays (won't obscure selections, paste previews, etc.)
- Different visual styles per mode for clarity
- Subtle opacity to not distract from actual content
- Works with zoom and pan already built into overlay system

### Phase 4: Integration
**Goal**: Wire everything together cleanly

#### 4.1 Add Hook to CanvasGrid
**File**: `src/components/features/CanvasGrid.tsx`

```typescript
// Import and call the hook
import { useHoverPreview } from '../../hooks/useHoverPreview';

export const CanvasGrid: React.FC = () => {
  // ... existing code ...
  
  // Add hover preview calculation
  useHoverPreview();
  
  // ... rest of component ...
}
```

**Rationale**:
- CanvasGrid is where mouse events are handled
- Hook automatically manages preview state
- No changes to existing event handlers needed

#### 4.2 Update hoveredCell Tracking
**File**: `src/components/features/CanvasGrid.tsx`

Ensure `setHoveredCell` is called in:
- `handleMouseMove` - update on move
- `handleMouseLeave` - clear on leave

```typescript
const handleMouseLeave = () => {
  setHoveredCell(null); // This will trigger hover preview cleanup
};
```

### Phase 5: Visual Polish & Edge Cases

#### 5.1 Performance Optimization
- Hover preview only recalculates when necessary (handled by useEffect deps)
- Canvas overlay already uses requestAnimationFrame for smooth rendering
- No additional optimization needed initially

#### 5.2 Visual Refinement
- Test opacity levels for different backgrounds
- Ensure visibility on both light and dark canvas backgrounds
- Consider theme integration (use theme colors?)

#### 5.3 Edge Cases to Handle
1. **Drawing Mode Active**: Don't show hover preview while actively drawing
   - Check `isDrawing` state
   - Disable preview when `isDrawing === true`

2. **Other Tool Modes**: Preserve existing behavior
   - Selection tools: No hover preview (keep current behavior)
   - Eyedropper: No preview needed
   - Text tool: No preview needed
   - Paint bucket: Could add fill area preview (future enhancement)

3. **Brush Size Changes**: Preview updates automatically (via useEffect deps)

4. **Tool Changes**: Preview clears when switching away from pencil

## Future Extensibility

### Adding New Tool Hover Modes

To add hover preview for another tool (e.g., rectangle, ellipse):

1. **Add mode to type**: Update mode union type in CanvasContext
2. **Add calculation**: Add case in `useHoverPreview` hook
3. **Add styling**: Add style case in `getPreviewStyle()` function

**Example - Rectangle Tool Preview**:
```typescript
case 'rectangle':
  if (rectangleStartPoint && hoveredCell) {
    const cells = calculateRectangleCells(
      rectangleStartPoint,
      hoveredCell,
      rectangleFilled
    );
    setHoverPreview({
      active: true,
      mode: 'rectangle',
      cells: cells
    });
  }
  break;
```

### Potential Future Enhancements
1. **Paint Bucket Preview**: Show which cells would be filled
2. **Line Tool Preview**: Show line path from start point to cursor
3. **Selection Preview**: Show selection bounds before creating
4. **Smart Preview**: Hide preview when certain UI overlays are active
5. **Customizable Colors**: User preference for preview color/opacity

## Testing Plan

### Manual Testing Checklist
- [ ] Brush preview appears when pencil tool is selected
- [ ] Preview follows mouse cursor smoothly
- [ ] Preview updates when brush size changes
- [ ] Preview updates when brush shape changes
- [ ] Preview clears when switching to another tool
- [ ] Preview clears when mouse leaves canvas
- [ ] Preview doesn't interfere with drawing operations
- [ ] Preview doesn't block selection overlays
- [ ] Preview doesn't block paste preview
- [ ] Preview doesn't block line preview (shift+click)
- [ ] Preview works correctly with zoom
- [ ] Preview works correctly with pan
- [ ] Preview respects cell aspect ratio

### Regression Testing
- [ ] All existing overlay types still render correctly
- [ ] Selection tools work normally
- [ ] Paste mode works normally
- [ ] Gradient tool works normally
- [ ] Line preview (shift+click) works normally
- [ ] Other drawing tools work normally

## Implementation Checklist

### Step-by-step Implementation Order
1. [ ] Add `hoverPreview` state to CanvasContext
2. [ ] Create `useHoverPreview` hook with brush mode
3. [ ] Add hover preview rendering to CanvasOverlay
4. [ ] Integrate hook in CanvasGrid
5. [ ] Test with different brush sizes
6. [ ] Test with different brush shapes
7. [ ] Test tool switching behavior
8. [ ] Test mouse leave behavior
9. [ ] Add visual refinements
10. [ ] Document usage for future tool additions

## Breaking Changes
**None expected** - This is a pure addition:
- No changes to existing tool behavior
- No changes to existing overlay rendering
- No changes to existing state management
- All changes are additive

## Files to Modify

1. **`src/contexts/CanvasContext.tsx`** - Add hoverPreview state
2. **`src/hooks/useHoverPreview.ts`** - New file, preview calculation
3. **`src/components/features/CanvasOverlay.tsx`** - Add preview rendering
4. **`src/components/features/CanvasGrid.tsx`** - Integrate hook
5. **`docs/BRUSH_HOVER_PREVIEW_PLAN.md`** - This document

## Estimated Complexity
- **Low Risk**: Additive changes only, no modifications to existing logic
- **Medium Complexity**: Requires understanding of overlay system
- **High Value**: Significantly improves user experience with brush tool

## Summary
This plan provides a clean, extensible architecture for tool hover previews that:
- ✅ Doesn't break any existing functionality
- ✅ Integrates naturally with existing overlay system
- ✅ Is easily extensible for future tool modes
- ✅ Follows established patterns in the codebase
- ✅ Provides clear separation of concerns
- ✅ Minimal performance impact
