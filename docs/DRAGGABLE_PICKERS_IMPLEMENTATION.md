# Draggable Picker Dialogs Implementation Summary

## Overview
Added drag-to-reposition functionality to all character and color picker dialogs throughout ASCII Motion. Users can now click and drag the title bar of any picker to move it anywhere on the screen, improving workflow and preventing content obscuration.

## Implementation Details

### 1. New Reusable Component: DraggableDialogBar

**File**: `src/components/common/DraggableDialogBar.tsx`

**Features**:
- Provides a consistent draggable title bar for all picker dialogs
- Design matches GradientPanel and MediaImportPanel headers for consistency
- Visual feedback with grip icon and cursor changes (`grab` → `grabbing`)
- Integrated close (X) button for canceling selections
- Prevents text selection during drag
- Styled to match ASCII Motion design system
- Supports drag lifecycle callbacks for responsive UI updates

**Props**:
- `title: string` - Dialog title text
- `onDrag?: (deltaX: number, deltaY: number) => void` - Callback for drag movements
- `onDragStart?: () => void` - Callback when drag starts
- `onDragEnd?: () => void` - Callback when drag ends
- `onClose?: () => void` - Callback when X button is clicked (closes dialog and cancels selection)

**Visual Design**:
- Header styling: `text-sm font-medium` title with `p-3` padding
- Grip icon: `w-3 h-3` GripHorizontal icon
- Close button: `h-6 w-6 p-0` with `w-3 h-3` X icon
- Layout: Flex container with `justify-between` for title/close alignment

**Key Implementation Detail**: The drag lifecycle callbacks (`onDragStart`/`onDragEnd`) are used to disable CSS animations during drag, ensuring instant, responsive movement that follows the mouse cursor without lag. The `onClose` callback allows the parent component to handle dialog dismissal and selection cancellation.

### 2. Updated Components

#### ColorPickerOverlay
**File**: `src/components/features/ColorPickerOverlay.tsx`

**Changes**:
- Added `DraggableDialogBar` import and component
- Added `positionOffset`, `isDraggingDialog`, and `hasBeenDragged` state
- Added `dragStartOffsetRef` to accumulate offsets across multiple drags
- Resets position offset and drag state when dialog opens
- Applied offset to positioning calculations with proper type guards
- Replaced `CardHeader`/`CardTitle` with `DraggableDialogBar`
- Added `onClose` prop to handle X button clicks (calls `handleCancel`)
- Fixed animation lag by conditionally disabling animations during drag
- Fixed position jump bug with offset accumulation pattern

#### EnhancedCharacterPicker
**File**: `src/components/features/EnhancedCharacterPicker.tsx`

**Changes**:
- Added `DraggableDialogBar` import and component  
- Added `positionOffset`, `isDraggingDialog`, and `hasBeenDragged` state
- Added `dragStartOffsetRef` to accumulate offsets across multiple drags
- Resets position offset and drag state when dialog opens
- Applied offset to positioning calculations with proper type guards
- Replaced title `<h3>` with `DraggableDialogBar`
- Added `onClose` prop to handle X button clicks (calls `onClose` from props)
- Fixed animation lag by conditionally disabling animations during drag
- Fixed position jump bug with offset accumulation pattern

#### GradientStopPicker
**File**: `src/components/features/GradientStopPicker.tsx`

**Changes**: None required - automatically inherits drag functionality through ColorPickerOverlay and EnhancedCharacterPicker

### 3. Key Implementation Pattern

```tsx
// 1. Position offset state and drag tracking with refs for accumulation
const [positionOffset, setPositionOffset] = useState({ x: 0, y: 0 });
const [isDraggingDialog, setIsDraggingDialog] = useState(false);
const [hasBeenDragged, setHasBeenDragged] = useState(false);
const dragStartOffsetRef = useRef({ x: 0, y: 0 });

// 2. Reset on dialog open
useEffect(() => {
  if (isOpen) {
    setPositionOffset({ x: 0, y: 0 });
    setHasBeenDragged(false);
  }
}, [isOpen]);

// 3. Drag handlers with offset accumulation
const handleDrag = useCallback((deltaX: number, deltaY: number) => {
  // Add delta to the stored offset from when drag started
  setPositionOffset({
    x: dragStartOffsetRef.current.x + deltaX,
    y: dragStartOffsetRef.current.y + deltaY
  });
}, []);

const handleDragStart = useCallback(() => {
  setIsDraggingDialog(true);
  setHasBeenDragged(true); // Permanently disable entrance animations
  // Store current offset when drag starts
  dragStartOffsetRef.current = { ...positionOffset };
}, [positionOffset]);

const handleDragEnd = useCallback(() => {
  setIsDraggingDialog(false);
  // Update ref with final position
  dragStartOffsetRef.current = { ...positionOffset };
}, [positionOffset]);

// 4. Apply offset to positioning with animation control
<div
  className={`fixed z-[99999] ${
    !hasBeenDragged ? 'animate-in duration-200 slide-in-from-right-2 fade-in-0' : ''
  }`}
  style={{
    top: position.top + positionOffset.y,
    right: position.right !== 'auto' && typeof position.right === 'number' 
      ? position.right - positionOffset.x 
      : undefined,
    left: position.left !== 'auto' && typeof position.left === 'number' 
      ? position.left + positionOffset.x 
      : undefined,
    transition: isDraggingDialog ? 'none' : undefined // Disable transitions while dragging
  }}
>

// 5. Use DraggableDialogBar with lifecycle callbacks and close handler
<Card>
  <DraggableDialogBar 
    title="Dialog Title"
    onDrag={handleDrag}
    onDragStart={handleDragStart}
    onDragEnd={handleDragEnd}
    onClose={handleCancel} // or onClose for character picker
  /> 
    title={title} 
    onDrag={handleDrag}
    onDragStart={handleDragStart}
    onDragEnd={handleDragEnd}
  />
  <CardContent className="pt-3">
    {/* content */}
  </CardContent>
</Card>
```

**Performance Optimization**: Animations are conditionally disabled during drag operations to ensure instant, responsive movement. The dialog follows the mouse cursor without any lag or transition delays.

## Z-Index Layering

All picker dialogs use `z-[99999]` to ensure they render above all other content:

- **Canvas layers**: `z-10` to `z-40`
- **UI overlays**: `z-50` to `z-[999]`
- **Shadcn Dialogs**: `z-50`
- **Picker dialogs**: `z-[99999]` ✨ (always on top)

This ensures pickers remain accessible and visible after repositioning.

## User Experience Benefits

1. **Improved Workflow**: Users can move pickers away from content they're editing
2. **Small Screen Support**: Better experience on devices with limited screen space
3. **Consistent Behavior**: All pickers have the same drag interaction pattern
4. **Position Reset**: Dialogs always return to original trigger position when reopened (no position persistence)
5. **Visual Feedback**: Clear indication of draggable area with grip icon and cursor changes

## Documentation Updates

### UI_COMPONENTS_DESIGN_SYSTEM.md
Added comprehensive section on DraggableDialogBar including:
- Component purpose and location
- Usage patterns and code examples
- Integration pattern with position offset
- List of all implementations
- Benefits and design decisions

### COPILOT_INSTRUCTIONS.md
Added new section "Draggable Picker Dialogs - Best Practices" including:
- Implementation pattern and requirements
- Z-index layering guidelines
- Standard code example
- List of existing implementations
- Benefits of draggable pickers

## Testing Checklist

✅ **Functionality**:
- [ ] ColorPickerOverlay can be dragged by title bar
- [ ] EnhancedCharacterPicker can be dragged by title bar
- [ ] GradientStopPicker character selection can be dragged
- [ ] GradientStopPicker color selection can be dragged
- [ ] Position resets when closing and reopening picker
- [ ] Drag works smoothly without lag

✅ **Visual**:
- [ ] Cursor changes to grab/grabbing appropriately
- [ ] Grip icon is visible and clear
- [ ] Title bar styling matches design system
- [ ] No text selection occurs during drag

✅ **Edge Cases**:
- [ ] Pickers don't get stuck off-screen
- [ ] Works correctly on small screens
- [ ] Works with different anchor positions
- [ ] Multiple pickers can be dragged independently

✅ **Layering**:
- [ ] Pickers always render above canvas
- [ ] Pickers render above all UI panels
- [ ] Pickers render above shadcn dialogs

## Future Enhancements (Optional)

- **Position Memory**: Could add localStorage persistence if users want pickers to remember last position
- **Snap to Edges**: Could add edge snapping for alignment
- **Minimize/Maximize**: Could add minimize functionality to title bar
- **Multi-monitor Support**: Could add constraints to prevent off-screen positioning

## Migration Notes

No breaking changes - all existing picker functionality preserved:
- Trigger positioning still works as before
- All anchor positions supported (gradient-panel, left-slide, etc.)
- Color/character selection unchanged
- All existing props and callbacks maintained

## Files Modified

1. ✅ `src/components/common/DraggableDialogBar.tsx` (created)
2. ✅ `src/components/features/ColorPickerOverlay.tsx` (updated)
3. ✅ `src/components/features/EnhancedCharacterPicker.tsx` (updated)
4. ✅ `docs/UI_COMPONENTS_DESIGN_SYSTEM.md` (updated)
5. ✅ `COPILOT_INSTRUCTIONS.md` (updated)

## Compilation Status

✅ **No errors** - All TypeScript compilation checks pass
