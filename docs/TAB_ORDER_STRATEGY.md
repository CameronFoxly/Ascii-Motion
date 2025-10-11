# Tab Order Strategy for Accessibility

## Overview
This document describes the tab order implementation for keyboard navigation throughout the ASCII Motion application.

## Tab Index Ranges

The application uses offset-based tab indices to ensure logical keyboard navigation while maintaining the required sequential order for frame duration fields.

### Index Allocation

| Range | Component | Description |
|-------|-----------|-------------|
| 1-999 | Frame Duration Fields | Sequential tab order through animation frames (frameIndex + 1) |
| 1001-1004 | Header Controls | Left-to-right: Hamburger menu, Export, Import, Theme toggle |
| 2000-2014 | Tool Palette | 15 tool buttons in visual top-to-bottom order |
| 3000+ | Other UI Elements | Reserved for future tab order assignments |

## Implementation Details

### Frame Duration Fields
- **Location**: `src/components/features/FrameThumbnail.tsx`
- **Tab Index**: `frameIndex + 1`
- **Behavior**: Allows sequential tabbing through frames (frame 0 → frame 1 → frame 2, etc.)
- **Special**: Duplicate and Delete buttons within frames have `tabIndex={-1}` to skip them

### Header Controls
- **Hamburger Menu** (`tabIndex={1001}`): Opens project file and app info menu
- **Export Button** (`tabIndex={1002}`): Opens export format dropdown  
- **Import Button** (`tabIndex={1003}`): Opens import format dropdown
- **Theme Toggle** (`tabIndex={1004}`): Switches between light and dark themes

### Tool Palette
- **Location**: `src/components/features/ToolPalette.tsx`
- **Tab Index**: `2000 + toolIndex` (calculated from position in tool array)
- **Order**: Drawing tools (9) → Selection tools (3) → Utility tools (3)
- **Behavior**: Tools are tabbable in the visual order they appear in the left panel

## Design Rationale

### Why Offset-Based Indices?

1. **Frame Priority**: Frame duration fields need sequential tab order (requirement from issue)
2. **Separation**: Using large offsets (1000, 2000) ensures no conflicts between groups
3. **Flexibility**: Leaves room for adding more elements without renumbering
4. **Visual Logic**: Tab order matches visual layout within each group

### Future Extensions

Additional UI elements can be added to the tab order using these guidelines:

- **3000-3999**: Canvas settings and controls
- **4000-4999**: Character and color pickers
- **5000-5999**: Playback and timeline controls
- **6000-6999**: Panel toggles and other navigation

## Testing Tab Order

To verify tab order works correctly:

1. Open the application
2. Press Tab repeatedly
3. Expected order:
   - First tab: Frame 1 duration field (if frames exist)
   - Continue through all frame duration fields
   - Then: Hamburger menu (header)
   - Then: Export, Import, Theme toggle (header)
   - Then: Tool buttons (left panel, top to bottom)
   - Then: Other elements in document order

## Implementation Files

- `src/components/features/HamburgerMenu.tsx`
- `src/components/features/ExportImportButtons.tsx`
- `src/components/common/ThemeToggle.tsx`
- `src/components/features/ToolPalette.tsx`
- `src/components/features/FrameThumbnail.tsx`

## Accessibility Notes

- All interactive elements have proper ARIA labels
- Tab focus is visually indicated with browser default or custom styling
- Disabled buttons are properly excluded from tab order
- Modal dialogs trap focus appropriately
