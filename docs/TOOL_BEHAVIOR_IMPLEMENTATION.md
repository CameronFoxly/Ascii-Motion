# Tool Behavior Settings - Implementation Summary

## Overview
Added toggle options for all drawing tools and the eyedropper to selectively affect character selection, character color, and background color. This allows for more flexible and precise editing capabilities.

## Features Implemented

### Drawing Tool Toggles
- **Character Toggle**: When enabled, drawing tools change the character at the target position
- **Text Color Toggle**: When enabled, drawing tools change the text color at the target position  
- **Background Color Toggle**: When enabled, drawing tools change the background color at the target position

### Eyedropper Tool Toggles
- **Character Toggle**: When enabled, eyedropper picks up the character from the target cell
- **Text Color Toggle**: When enabled, eyedropper picks up the text color from the target cell
- **Background Color Toggle**: When enabled, eyedropper picks up the background color from the target cell

### Behavior
- When any toggle is disabled, the tool preserves the existing value for that property
- All toggles are enabled by default to maintain backward compatibility
- Settings apply to all drawing tools: pencil, eraser, paintbucket, rectangle, ellipse, and text tool

## User Interface
- Added tool behavior toggles to the existing tool options pattern in the ToolPalette
- Drawing tool toggles appear only when relevant tools are selected (pencil, eraser, paintbucket, rectangle, ellipse, text)
- Eyedropper toggles appear only when the eyedropper tool is selected
- Uses the same Switch/Label pattern as existing tool options (contiguous, filled)
- Integrated seamlessly into the collapsible tool options section

## Technical Implementation

### Store Changes (`toolStore.ts`)
- Added 6 new boolean state properties for the toggles
- Added corresponding setter functions
- Modified `pickFromCell` to respect eyedropper toggles

### Drawing Tools (`useDrawingTool.ts`)
- Created `createCellWithToggles` helper function
- Updated all drawing operations (pencil, paintbucket, rectangle, ellipse) to use the helper
- Preserves existing cell properties when toggles are disabled

### Text Tool (`useTextTool.ts`)
- Created `createTextCellWithToggles` helper function
- Updated character insertion, deletion, and paste operations
- Maintains proper text editing behavior while respecting toggles

#### Free typing and text-box editing

A single-cell click retains free typing: characters are written immediately, Enter
starts a new line, and Escape finishes typing without discarding it.

Dragging a text box starts an uncommitted editing session. Type or paste text,
click or drag within the box to position the caret or select text, and use arrow
keys, Home/End, Backspace, and Delete to edit. Enter inserts a line break;
Cmd+Enter (Ctrl+Enter on Windows/Linux) or the check button commits, and Escape or the cancel button discards the
draft. Switching tools also commits. Clicking outside the box leaves it open.

Corner handles resize the text box and reflow its contents without transforming
the layer. Text wraps by words (long words wrap by characters), and the box grows
vertically as needed, including beyond the canvas without changing canvas size.
Floating left, center, and right alignment buttons follow its bottom-right corner
and move above it when there is not enough viewport space below.
Commit/cancel use the same green/red circular controls as the bezier pen tool.

Foreground and background colors are stored per character when typing or pasting,
and are preserved through editing, wrapping, resizing, alignment, and commit.
Changing the main color picker with a text selection recolors only the selected
characters; without a selection, it changes colors for subsequent input only.
Background colors also apply to spaces.

Frame navigation and layer selection leave the draft uncommitted and editable.
Commit bakes ordinary cells into the currently selected content layer at the
current playhead, preserving existing cells outside the text. In a timeline gap,
it creates a one-frame content block. Each commit is one layer-addressed undo/redo
operation; cancel does not modify canvas data or history. Locked layers, locked
groups, generator layers, and playback reject commits with a notification and
retain the draft.

### UI Component (`ToolPalette.tsx`)
- Integrated toggles into existing tool options pattern
- Conditional display based on active tool
- Follows the same Switch/Label styling as existing options

## Use Cases

### Selective Character Editing
- Disable character toggle to only change colors without affecting characters
- Useful for adding color highlights to existing ASCII art

### Color-Only Changes  
- Disable character toggle, enable color toggles
- Perfect for colorizing existing line art

### Character-Only Changes
- Enable character toggle, disable color toggles  
- Useful for changing symbols while preserving color schemes

### Selective Eyedropper Sampling
- Pick only specific properties from target cells
- Prevents accidental overwriting of carefully chosen colors or characters

## Files Modified
1. `src/stores/toolStore.ts` - Added toggle state and actions
2. `src/hooks/useDrawingTool.ts` - Updated drawing operations
3. `src/hooks/useTextTool.ts` - Updated text operations  
4. `src/components/features/ToolPalette.tsx` - Added toggles to tool options
5. `src/App.tsx` - Removed separate component import

## Compatibility
- All changes are backward compatible
- Default behavior remains unchanged (all toggles enabled)
- No breaking changes to existing functionality

## Testing
- Application compiles without errors
- All TypeScript types are properly defined
- UI integrates seamlessly with existing design
- Tool behavior can be tested in the running application
