# ASCII Type Tool Implementation Plan

## Overview
Create a new "ASCII Type" tool that lets users render Figlet fonts directly onto the canvas with live previews, a configurable side panel, and a comprehensive font discovery dialog. The feature must follow existing tool architecture (Tool Palette integration, Zustand state patterns, shadcn UI conventions, draggable dialog headers) and respect typography/grid systems already in place.

## Requirements Summary
- New drawing tool positioned next to the existing Text tool using the Lucide **type-outline** icon supplied via data URI.
- Tool hotkey assignment (proposed: `A`, pending conflict review) and full participation in `ToolManager`, `ToolStatusManager`, and `useToolBehavior` mappings.
- Gradient/Import-style side panel that opens automatically while the tool is active, with:
  - Multiline text box (5 visible rows, scrollable overflow).
  - Figlet font selector grouped by the provided `<optgroup>` taxonomy.
  - Horizontal layout select (`normal`, `narrow`, `squeezed`, `fitted`, `wide`).
  - Vertical layout select mirroring horizontal options.
  - `Transparent whitespace` toggle that leaves existing canvas content untouched for whitespace glyphs.
  - Sticky footer buttons (`Cancel`, `Apply`); Cancel reverts to Pencil, Apply commits a single undoable canvas edit.
  - Additional button "Preview all fonts" aligned next to the font dropdown.
- Live on-canvas preview with a dotted bounding box, draggable repositioning, and click-to-place anchor workflow.
- Figlet rendering respects active foreground/background colors; whitespace bypasses background application when transparency is enabled.
- Preview remains active after moves; clicking outside the box snaps to the clicked cell.
- Panel persists until manually closed (X) or when switching tools.
- "Preview all fonts" button opens a draggable dialog centered over the canvas containing:
  - Scrollable list of cards (shadcn `Card`), one per font, rendered using the user text (fallback "Text Preview").
  - Each card shows font name, rendered Figlet preview, and a "Use this font" button that sets the panel dropdown and closes the dialog.
  - Dialog close button (X) simply hides the dialog without changing the selected font or tool.

## Architecture Plan
### Tool Registration
1. Extend `Tool` union with `'asciitype'` and add entry to `TOOL_HOTKEYS`.
2. Update `ToolPalette` drawing section with a new button using a reusable `TypeOutlineIcon` component derived from the provided SVG.
3. Register components in `ToolManager`, `ToolStatusManager`, and `useToolBehavior` (cursor name, status text, interactive flags).
4. Export ASCII Type components from `src/components/tools/index.ts` following the established pattern.

### State Management
- Create `useAsciiTypeStore` (Zustand) to track:
  - Panel open state, text value, selected category & font, layout modes, transparency toggle, preview origin, drag offsets, preview cell map.
  - Async font loading status and cached Figlet font data.
  - Preview dialog visibility and scroll position.
- Persist panel settings during a session; clear preview data on apply/cancel/tool change.

### UI Components
1. **`AsciiTypePanel.tsx`** (new feature component):
   - Mirror `GradientPanel`/`MediaImportPanel` overlay behavior with `PANEL_ANIMATION` transitions.
   - Use `ScrollArea`, `Label`, `Textarea`, `Select`, `Switch`, `Button` from shadcn.
   - Sticky footer with `Cancel`/`Apply` buttons implemented via flex container anchored to bottom.
   - Incorporate "Preview all fonts" button adjacent to the font dropdown.
   - Header uses `DraggableDialogBar` conventions (icon + title + close button) or replicates panel header style depending on reuse feasibility.
2. **`AsciiTypePreviewDialog.tsx`**:
   - Reuses `DraggableDialogBar` for drag support, with `Card` components for each font.
   - Scrollable body (via `ScrollArea`) sized to comfortable viewport (e.g., 640×480 or responsive `max-h`/`max-w`).
   - Font cards render the Figlet output using current text or fallback string.
   - "Use this font" button triggers store update, closes dialog, focuses panel dropdown.
3. **`TypeOutlineIcon.tsx`** (common icon component) to embed the provided SVG.

### Data & Utilities
- Parse supplied `<select>` HTML into a typed constant `FIGLET_FONTS_BY_CATEGORY` with stable ordering.
- Add `figlet` package to dependencies and create helper module (`figletClient.ts`) to:
  - Lazily register fonts (load bundled `.flf` files or rely on figlet's built-in fonts).
  - Provide async `renderFiglet(text, font, horizontalLayout, verticalLayout)` with memoization.
- Provide utility to convert Figlet string array into canvas cell map, respecting `transparentWhitespace`.

### Canvas Integration
- **Preview Rendering**:
  - Extend `CanvasOverlay` to draw preview cells using selected colors and to render dotted bounding box (matching selection styling).
  - Use `useCanvasMouseHandlers` to manage: initial click placement, dragging inside preview bounds, click-outside snapping, and ignoring alt-key eyedropper overrides while tool is active.
- **Preview State**:
  - On text/layout/font changes, recompute preview map and bounding box dimensions via `useAsciiTypeTool` hook.
  - Clamp preview to canvas dimensions; overflow is simply truncated.
- **Apply / Cancel**:
  - `Apply` merges preview cells into the canvas using `setCell`, respecting whitespace transparency, then calls `pushCanvasHistory` once.
  - `Cancel` clears preview and returns to `pencil` tool while keeping panel inputs for next activation.

### Preview-All-Fonts Dialog Flow
1. Button press sets `previewDialogOpen = true` in store.
2. Dialog fetches (or uses cached) Figlet render per font; consider progressive rendering or virtualization if performance requires.
3. "Use this font" updates store font selection, closes dialog, and scrolls panel dropdown into view (if necessary).
4. Close button simply hides dialog, no state mutation beyond `previewDialogOpen = false`.
5. Dialog remains draggable via `DraggableDialogBar`; ensure z-index keeps it above other overlays.

### Interactions & Hotkeys
- Hotkey `A` toggles ASCII Type tool unless user is typing within inputs (respect text-input protection logic).
- Escape key inside panel should cancel preview if pressed while tool active (matching other tools) but leave panel open; document behavior.
- Ensure the preview dialog traps focus while open but allows dragging; integrate with existing focus management patterns.

### Documentation & Testing
- Update `COPILOT_INSTRUCTIONS.md` and `DEVELOPMENT.md` with ASCII Type tool guidelines, transparent whitespace rule, and preview dialog patterns.
- Add this plan file to `docs/` (done).
- After implementation, create user guide or section in docs mirroring other tool guides.
- Manual test checklist:
  - Hotkey activation and panel auto-open/close.
  - Typing before placement anchors at (0,0).
  - Click-to-place, drag-to-move, click-outside snap.
  - Transparent whitespace respects existing art.
  - Apply produces single undo step; Cancel reverts to pencil.
  - Preview dialog renders all fonts, handles fallback text, sets font on selection, and supports drag/close interactions.
  - Ensure performance is acceptable; consider lazy rendering if necessary.

### Dependencies & Follow-ups
- Add `figlet` npm package and type definitions if needed.
- Confirm licensing/attribution for bundled Figlet fonts.
- Monitor bundle size; evaluate dynamic import or worker offloading if rendering stalls.
- Future enhancements (post-MVP): search/filter in preview dialog, caching of rendered previews, favorites/pinned fonts, text size controls.
