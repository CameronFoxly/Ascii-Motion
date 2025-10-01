// Auto-generated version file - DO NOT EDIT MANUALLY
// This file is updated by scripts/version-bump.js during deployment

export const VERSION = "0.1.27";
export const BUILD_DATE = "2025-10-01T17:36:20.349Z";
export const BUILD_HASH = "37a4771";

// Version history with commit messages
export const VERSION_HISTORY = [
  {
    "version": "0.1.27",
    "date": "2025-10-01T17:36:20.349Z",
    "commits": [
      "Fixed up time effects preview",
      "Fixed application of time effects",
      "Setup basic animation controls menu with add frames and set duration",
      "Fixed styling of drag bar for dialogs",
      "Added drag to reposition for color and character picker dialogs"
    ]
  },
  {
    "version": "0.1.26",
    "date": "2025-10-01T04:38:09.201Z",
    "commits": [
      "Added live preview to gradient when editing stops in side panel",
      "Fixed up styling for gradient panel"
    ]
  },
  {
    "version": "0.1.25",
    "date": "2025-09-30T23:46:02.640Z",
    "commits": [
      "Update disabled state in gradient",
      "Fixed gradient preivew sizing issues",
      "Cleaned up debugging statements for fonts",
      "Added outline text for SVG output",
      "Added SVG export feature!"
    ]
  },
  {
    "version": "0.1.24",
    "date": "2025-09-30T18:55:06.449Z",
    "commits": [
      "Add stop with the gradient UI overlay added",
      "Added live preview to gradient color picker",
      "Added double-click controls to edit swatch overlay in gradient tools"
    ]
  },
  {
    "version": "0.1.23",
    "date": "2025-09-30T15:49:43.478Z",
    "commits": [
      "Import panel UI cleanup...moar!",
      "Fixed layout sizing for import media panel",
      "Fixed tooltip bug on import media panel",
      "Cleaned up side panel UI layout",
      "Removed old status panel from sidenbar"
    ]
  },
  {
    "version": "0.1.22",
    "date": "2025-09-30T02:38:42.543Z",
    "commits": [
      "Enhance EnhancedCharacterPicker with Tooltip components for consistency with tooltip improvements",
      "Merge main into tooltip branch - preserve character palette improvements and tooltip enhancements",
      "Update character palette implementation",
      "Update documentation with tooltip implementation guidelines",
      "Fix tooltips in MediaImportPanel (nudge, sizing, alignment controls)",
      "Fix tooltips in ColorPicker color swatches",
      "Fix tooltips in character picker, appearance panel, and palette components",
      "Fix TooltipProvider placement to avoid multiple providers in loops",
      "Fix tooltips in ForegroundBackgroundSelector, ImportPaletteDialog, and TextColorMappingSection",
      "Fix tooltips in CharacterPicker and CharacterMappingSection",
      "Fix tooltips in dialog and control components",
      "Fix tooltips in common components and ZoomControls",
      "Initial commit: Start standardizing tooltips",
      "Initial plan"
    ]
  },
  {
    "version": "0.1.21",
    "date": "2025-09-29T20:21:24.363Z",
    "commits": [
      "Standardize character picker",
      "Update effects panel docs",
      "Update docs location"
    ]
  },
  {
    "version": "0.1.20",
    "date": "2025-09-29T07:32:45.119Z",
    "commits": [
      "Cleaned up right panel.",
      "Updated right panel layout",
      "Fixed text input bug in color remap",
      "Refactor the character remap function",
      "Fixed up color remapping effect and UI",
      "Fixed bug that prevented preview to update to active frame with effects.",
      "Fixed apply to all frames effect bug",
      "Made preview 1:1 for levels",
      "Fixed levels default",
      "Fixed deployment bugs"
    ]
  },
  {
    "version": "0.1.19",
    "date": "2025-09-29T02:56:46.562Z",
    "commits": [
      "Initial version"
    ]
  },
  {
    "version": "0.1.18",
    "date": "2025-09-29T02:55:31.686Z",
    "commits": [
      "Updated effects system docs",
      "Fixed effects panel bugs part 1",
      "Phase 6 full implementaiton",
      "Phase 6 inital commit",
      "Added basic effects scaffold",
      "Phase 1-4 effects panel development"
    ]
  },
  {
    "version": "0.1.17",
    "date": "2025-09-28T08:11:10.198Z",
    "commits": [
      "Added jpg export, palettes to session export",
      "Cleaned up HTML export styling",
      "Fixed Export dialog vertical responsiveness",
      "Fixed html export dialog sizing",
      "Prettify Json Export system",
      "Fixed text preview of gradient fill",
      "Added quantize settings to gradient linear interpoloation"
    ]
  },
  {
    "version": "0.1.16",
    "date": "2025-09-27T04:02:58.846Z",
    "commits": [
      "Added quantize settings to gradient linear interpoloation",
      "Radial fill eddits",
      "Fixed tabbing between frame durations.",
      "Added ellipse control to radial gradients",
      "Initial investigation: Tab functionality already works correctly",
      "Initial plan",
      "Radial gradient respects canvas aspect ratio",
      "Fixed 2-dimensional dithering",
      "Added dither strength to gradients",
      "Merge readme with gradient update",
      "Fixed dithering position logic for gradient",
      "Update readme",
      "Fixed syntax issue."
    ]
  },
  {
    "version": "0.1.15",
    "date": "2025-09-25T20:01:18.490Z",
    "commits": [
      "Initial version"
    ]
  },
  {
    "version": "0.1.14",
    "date": "2025-09-25T19:57:19.784Z",
    "commits": [
      "Cleaned up consol.logs",
      "Fixed more buggggzzz",
      "Fixed bugs"
    ]
  },
  {
    "version": "0.1.13",
    "date": "2025-09-25T19:45:16.838Z",
    "commits": [
      "Added dynamic character picker render,  fixed palette bugs",
      "Fixed color picker positioning",
      "Added import and export feature to character palette",
      "Fixed palette UI bugs",
      "[Copilot SWE Agent] Added character palette to main active tool side panel",
      "Fixed layout issues again.",
      "Updated UI layout",
      "Update readme",
      "Update version",
      "Merge pull request #11 from CameronFoxly/copilot/fix-80cebba6-2490-4faa-83d0-16623bf54c7d",
      "Fix canvas background color button - add bottom positioning and proper trigger ref for dropdown behavior",
      "Updated url",
      "Fix UX inconsistencies in character input focus management",
      "Implement enhanced character palette with full media import functionality",
      "Initial analysis - Planning character palette enhancement",
      "Initial plan",
      "Fix import media panel color picker positioning - align with panel edge instead of far left",
      "Fix gradient panel character picker positioning to match color picker alignment",
      "Fix color picker vertical positioning on smaller screens - center vertically while maintaining horizontal slide animation",
      "Merge branch 'main' into copilot/fix-80cebba6-2490-4faa-83d0-16623bf54c7d",
      "Final polish: enhance comments and documentation for real-time update logic",
      "Fix code review issues: remove duplicate functions and circular dependencies",
      "Add real-time color updates during picker interaction",
      "Implement color picker slide-out behavior with click-outside dismissal",
      "Initial analysis and planning for color picker layout improvements",
      "Initial plan"
    ]
  },
  {
    "version": "0.1.12",
    "date": "2025-09-25T07:58:56.689Z",
    "commits": [
      "Cleaned up more logs"
    ]
  },
  {
    "version": "0.1.11",
    "date": "2025-09-25T07:29:37.490Z",
    "commits": [
      "Clean up logs",
      "Adding link to app",
      "Update README with deployed version information",
      "Updated version control layout.",
      "Added html and json export imports",
      "Merge branch 'main' of https://github.com/cameronfoxly/Ascii-Motion",
      "Merge pull request #9 from CameronFoxly/copilot/fix-d5cd1499-b7bd-4367-a54e-c53b06c9cea9",
      "Added pixel preview of gradient",
      "Remove unused NavigateFrameHistoryAction import - fix TypeScript build error",
      "Merge pull request #7 from CameronFoxly/copilot/fix-ea41f7be-6c92-4275-84df-72aa405e82f4",
      "Improve navigation history timing - record after successful execution",
      "Implement frame navigation history tracking to fix undo bug",
      "Initial analysis of undo bug with timeline",
      "Initial plan",
      "Fixed up stops menus",
      "Address code review feedback: remove unnecessary cursor property from ASCII logo",
      "Implement UI text selection improvements - make interface text unselectable with ASCII logo exception",
      "Initial exploration and planning for UI text selection improvements",
      "Initial plan",
      "Thicker cotnrol outlines",
      "Fixed end point rendering bug for gradient",
      "Fixed exit animation for gradient panel",
      "Added animation to gradient panel entrance",
      "Fixed gradient preview visibility"
    ]
  },
  {
    "version": "0.1.10",
    "date": "2025-09-24T22:59:11.835Z",
    "commits": [
      "Merge pull request #5 from CameronFoxly/gradient-fill",
      "Fixed basic color picking.",
      "Move selection settings for gradient tool to left panel",
      "Reset defaults for gradient fill",
      "Updated gradient icon and added custom icon system",
      "Reorganized all documentation and repo structure",
      "Updated gradient fill documentation",
      "Fixed up Render bug",
      "Live preview fixed",
      "Preview mode for gradient now working",
      "Basic gradient functianality added",
      "Completed first three phases of gradient fill tool imlementation",
      "Add gradient development plan",
      "Update readme",
      "Revise README",
      "[CopilotSWE] Fix text input bug on timeline frame card",
      "Complete fix for duration input text selection - now working properly",
      "Fix frame duration input drag conflict by preventing mousedown propagation",
      "Initial analysis of timeline frame duration input tab behavior",
      "Initial plan",
      "Fixed version number"
    ]
  },
  {
    "version": "0.1.9",
    "date": "2025-09-23T07:54:12.770Z",
    "commits": [
      "Added simple txt file export",
      "Added color keyboardshortcuts",
      "Fixed character picker palette layering issue",
      "Added size readout for exported media",
      "Fixed preview timeline slider tick marks",
      "Updated loading state and slider control for video import",
      "Cleaned up import/export tooltip bug",
      "Fixed scaling bug on non-standard video sizes imported",
      "Standarized paste mode and move selection mode hotkey behavior",
      "Fixed paste placement bug while selection active"
    ]
  },
  {
    "version": "0.1.8",
    "date": "2025-09-22T23:07:51.615Z",
    "commits": [
      "Hopefully last loading screen update (for now!)"
    ]
  },
  {
    "version": "0.1.7",
    "date": "2025-09-22T23:02:20.522Z",
    "commits": [
      "Fixed loading layout issues.",
      "Fixed loader"
    ]
  },
  {
    "version": "0.1.6",
    "date": "2025-09-22T22:50:57.896Z",
    "commits": [
      "Initial version"
    ]
  },
  {
    "version": "0.1.5",
    "date": "2025-09-22T21:50:18.509Z",
    "commits": [
      "Added loading screen and app reveal.",
      "Added analytics"
    ]
  },
  {
    "version": "0.1.4",
    "date": "2025-09-22T18:22:05.625Z",
    "commits": [
      "Initial version"
    ]
  },
  {
    "version": "0.1.3",
    "date": "2025-09-22T17:13:10.574Z",
    "commits": [
      "Updated version number alignment."
    ]
  },
  {
    "version": "0.1.2",
    "date": "2025-09-22T00:17:30.072Z",
    "commits": [
      "Implement automated versioning system with clickable version display"
    ]
  },
  {
    "version": "0.1.1",
    "date": "2025-09-21T20:17:00.317Z",
    "commits": [
      "Fix deployment configuration",
      "Fixed import session bug",
      "Fixed import session bug",
      "Fixe keyboard shortcuts",
      "Set up basic pre-processing",
      "Progressive exposure",
      "Fixed layout bugs",
      "Updated some layout",
      "Fixed some layout issues",
      "Fixed last color being used, added re-ordering."
    ]
  }
];