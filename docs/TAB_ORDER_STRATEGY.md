# Tab Order Strategy for Accessibility

## Overview
This document describes the tab order implementation for keyboard navigation throughout the ASCII Motion application.

## Tab Index Ranges

The application uses offset-based tab indices to ensure logical keyboard navigation while maintaining the required sequential order for frame duration fields.

### Index Allocation

| Range | Component | Description |
|-------|-----------|-------------|
| 1-10 | Header Controls | Left-to-right: Hamburger menu (1), Export (2), Import (3), Theme toggle (4) |
| 100-999 | Frame Duration Fields | Sequential tab order through animation frames (100 + frameIndex) |
| 1000-1999 | Tool Palette | 15 tool buttons in visual top-to-bottom order (1000+) |
| 2000-2999 | Right Panel | Character selector (2000), FG color (2001), BG color (2002), Swap (2003), Reset (2004) |
| 3000+ | Other UI Elements | Reserved for future tab order assignments |

## Implementation Details

### Header Controls (1-4)
- **Hamburger Menu** (`tabIndex={1}`): Opens project file and app info menu - **FIRST TABBABLE ELEMENT**
- **Export Button** (`tabIndex={2}`): Opens export format dropdown  
- **Import Button** (`tabIndex={3}`): Opens import format dropdown
- **Theme Toggle** (`tabIndex={4}`): Switches between light and dark themes

### Frame Duration Fields (100+)
- **Location**: `src/components/features/FrameThumbnail.tsx`
- **Tab Index**: `100 + frameIndex`
- **Behavior**: Allows sequential tabbing through frames (frame 0 → frame 1 → frame 2, etc.)
- **Special**: Duplicate and Delete buttons within frames have `tabIndex={-1}` to skip them
- **After frames**: Tab continues to tool palette, not stuck at end

### Tool Palette (1000+)
- **Location**: `src/components/features/ToolPalette.tsx`
- **Tab Index**: `1000 + toolIndex` (calculated from position in tool array)
- **Order**: Drawing tools (9) → Selection tools (3) → Utility tools (3)
- **Behavior**: Tools are tabbable in the visual order they appear in the left panel

### Right Panel (2000+)
- **Location**: Various components in right sidebar
- **Components**:
  - Character selector button: `tabIndex={2000}`
  - Foreground color button: `tabIndex={2001}`
  - Background color button: `tabIndex={2002}`
  - Swap colors button: `tabIndex={2003}`
  - Reset colors button: `tabIndex={2004}`

## Design Rationale

### Why Offset-Based Indices?

1. **Header First**: Users expect to start with header navigation (hamburger menu first)
2. **Frame Sequential**: Frame duration fields need sequential tab order (requirement from issue)
3. **Separation**: Using large offsets (100, 1000, 2000) ensures no conflicts between groups
4. **Flexibility**: Leaves room for adding more elements without renumbering
5. **Visual Logic**: Tab order matches visual layout within each group
6. **No Dead Ends**: Tab always continues to next section, never gets stuck

### Dialog Focus Management

All dialogs use Radix UI's Dialog component which provides:
- Automatic focus trapping within the dialog
- Focus returns to trigger element on close
- Natural tab order within dialog content
- ESC key to close
- Overlay click to close

Buttons within dialogs should be naturally tabbable without explicit tab indices.

## Testing Tab Order

To verify tab order works correctly:

1. Open the application
2. Press Tab - should start at **Hamburger menu** (not first frame)
3. Continue pressing Tab - expected order:
   - Header: Hamburger → Export → Import → Theme
   - Frames: Frame 0 → Frame 1 → Frame 2... (if frames exist)
   - Tools: Pencil → Eraser → Paint Bucket → ... → Flip Vertical
   - Right Panel: Character → FG Color → BG Color → Swap → Reset
   - Other elements in natural document order
4. After last frame, tab should continue to tools (not stuck)
5. Shift+Tab reverses the order correctly

## Implementation Files

- `src/components/features/HamburgerMenu.tsx` - tabIndex={1}
- `src/components/features/ExportImportButtons.tsx` - tabIndex={2, 3}
- `src/components/common/ThemeToggle.tsx` - tabIndex={4}
- `src/components/features/FrameThumbnail.tsx` - tabIndex={100 + frameIndex}
- `src/components/features/ToolPalette.tsx` - tabIndex={1000+}
- `src/components/features/ActiveStyleSection.tsx` - tabIndex={2000}
- `src/components/features/ForegroundBackgroundSelector.tsx` - tabIndex={2001-2004}

## Accessibility Notes

- All interactive elements have proper ARIA labels
- Tab focus is visually indicated with browser default or custom styling
- Disabled buttons are properly excluded from tab order
- Modal dialogs trap focus appropriately
- No tab "dead ends" - focus always progresses to next section
