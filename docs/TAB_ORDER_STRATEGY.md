# Tab Order Strategy for Accessibility

## Overview
This document describes the tab order implementation for keyboard navigation throughout the ASCII Motion application.

## Tab Index Ranges

The application uses a minimal explicit tab index strategy to ensure header and frames come first, then all other elements follow natural DOM order.

### Index Allocation

| Range | Component | Description |
|-------|-----------|-------------|
| 1-4 | Header Controls | Left-to-right: Hamburger menu (1), Export (2), Import (3), Theme toggle (4) |
| 11-999 | Frame Duration Fields | Sequential tab order through animation frames (11 + frameIndex) |
| 0 (default) | All Other Elements | Tools, panels, dialogs, collapsible headers - all use natural DOM order |

## Implementation Details

### Header Controls (1-4)
- **Hamburger Menu** (`tabIndex={1}`): Opens project file and app info menu - **FIRST TABBABLE ELEMENT**
- **Export Button** (`tabIndex={2}`): Opens export format dropdown  
- **Import Button** (`tabIndex={3}`): Opens import format dropdown
- **Theme Toggle** (`tabIndex={4}`): Switches between light and dark themes

### Frame Duration Fields (11+)
- **Location**: `src/components/features/FrameThumbnail.tsx`
- **Tab Index**: `11 + frameIndex`
- **Behavior**: Allows sequential tabbing through frames after header
- **Special**: Duplicate and Delete buttons within frames have `tabIndex={-1}` to skip them
- **After frames**: Tab continues to all other elements in natural DOM order

### Everything Else (tabIndex=0, default)
All other interactive elements use the browser's default tab order (tabIndex=0), which means they appear in DOM order AFTER the explicitly numbered elements:

- **Tool Palette**: All tool buttons tabbable in DOM order
- **Canvas Settings**: Grid toggle, size inputs, zoom controls
- **Right Panel**: Character selector, color picker, all buttons
- **Collapsible Headers**: All collapsible section headers
- **Dialog Buttons**: All buttons in dialogs (SessionExport, Import, etc.)
- **Side Panel Buttons**: GradientPanel, MediaImportPanel, EffectsPanel buttons
- **Playback Controls**: Play, pause, navigation buttons
- **Panel Toggles**: Left, right, bottom panel toggle buttons

## Design Rationale

### Why Minimal Explicit Tab Indices?

1. **Header First**: Users expect to start navigation from the top (hamburger menu)
2. **Frame Sequential**: Frame duration fields need sequential tab order (requirement from issue)
3. **Natural Order for Everything Else**: Using tabIndex=0 (default) for all other elements ensures:
   - No conflicts or "dead zones" in tab order
   - Easy maintenance - new buttons automatically work
   - Follows HTML best practices
   - Dialog and panel buttons are naturally accessible
   - No need to manage complex numbering schemes

### Tab Order Flow

According to HTML spec, tab order is:
1. Elements with positive tabIndex, in numerical order (1, 2, 3, 4, 11, 12, 13...)
2. Elements with tabIndex=0 or no tabIndex, in DOM order

This means:
1. **Tab 1-4**: Header controls (explicit)
2. **Tab 11+**: Frame duration fields (explicit, sequential)
3. **Tab onwards**: Everything else in natural DOM order (tools, panels, dialogs, etc.)

### Dialog Focus Management

All dialogs use Radix UI Dialog component which provides:
- Automatic focus trapping within the dialog
- Focus returns to trigger element on close
- Natural tab order within dialog content (tabIndex=0)
- ESC key to close
- Overlay click to close

Since dialog buttons use tabIndex=0, they appear in natural DOM order within the dialog and are fully accessible.

### Side Panel Focus Management

Side panels (GradientPanel, MediaImportPanel, etc.) render as overlays with:
- Natural tab order for all buttons (tabIndex=0)
- Collapsible headers fully tabbable
- All action buttons (Apply, Cancel, Close) accessible
- Content in natural DOM order

## Testing Tab Order

To verify tab order works correctly:

1. Open the application
2. Press Tab - should start at **Hamburger menu** (not first frame)
3. Continue pressing Tab - expected order:
   - Header: Hamburger (1) → Export (2) → Import (3) → Theme (4)
   - Frames: Frame 0 (11) → Frame 1 (12) → Frame 2 (13)... (if frames exist)
   - Tools: Pencil → Eraser → ... (natural DOM order)
   - Right Panel: Character selector, color controls, etc. (natural DOM order)
   - Other elements: Canvas settings, playback controls, etc. (natural DOM order)
4. Open a dialog - all buttons should be tabbable in natural order
5. Open a side panel - all buttons should be tabbable in natural order
6. Expand/collapse sections - headers should be tabbable
7. After last element, tab wraps to Hamburger menu
8. Shift+Tab reverses the order correctly

## Implementation Files

- `src/components/features/HamburgerMenu.tsx` - tabIndex={1}
- `src/components/features/ExportImportButtons.tsx` - tabIndex={2, 3}
- `src/components/common/ThemeToggle.tsx` - tabIndex={4}
- `src/components/features/FrameThumbnail.tsx` - tabIndex={11 + frameIndex}
- All other components use default tabIndex (0) for natural DOM order

## Accessibility Notes

- All interactive elements have proper ARIA labels
- Tab focus is visually indicated with browser default or custom styling
- Disabled buttons are properly excluded from tab order
- Modal dialogs trap focus appropriately
- No tab "dead ends" - focus always progresses naturally
- Collapsible headers are fully keyboard accessible
- All dialog and panel buttons are tabbable
