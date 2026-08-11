// Auto-generated version file - DO NOT EDIT MANUALLY
// This file is updated by scripts/version-bump.js during deployment

export const VERSION = "2.2.0";
export const BUILD_DATE = "2026-08-11T18:27:15.292Z";
export const BUILD_HASH = "79e0117";

// Version history with commit messages
export const VERSION_HISTORY = [
  {
    "version": "2.2.0",
    "date": "2026-08-11T18:27:15.292Z",
    "commits": [
      "Merge pull request #157 from CameronFoxly/cameronfoxly-atomic-browser-navigation",
      "Merge pull request #156 from CameronFoxly/cameronfoxly-browser-mcp-acknowledgements",
      "test: cover timeline-frame batch acknowledgement",
      "fix: make MCP frame navigation atomic",
      "fix: report batch timeline position",
      "fix: preserve MCP duration and load state",
      "feat: acknowledge browser MCP commands",
      "Preserve media import preview frame on setting edits (#147)",
      "chore(deps-dev): bump js-yaml from 4.1.1 to 4.2.0 (#143)",
      "chore(deps): bump esbuild, @vitejs/plugin-react and vite (#142)",
      "fix: unbreak production build and deploy after tooling bumps",
      "chore(deps): bump esbuild, @vitejs/plugin-react, tsx and vite (#140)",
      "Fix blank/uneditable frame after splitting a content frame (#139)",
      "chore(deps): bump shell-quote in /dev-tools/opentui-test-cli (#138)",
      "chore(deps): bump ws from 8.19.0 to 8.21.0 in /dev-tools/ink-test-cli (#137)",
      "chore(deps): bump ws in /dev-tools/opentui-test-cli (#136)",
      "chore(deps-dev): bump vitest from 4.0.18 to 4.1.0 (#132)",
      "chore(deps): bump react-router and react-router-dom (#133)",
      "chore(deps-dev): bump hono from 4.12.18 to 4.12.23 (#135)",
      "chore(deps): bump ws from 8.18.3 to 8.21.0 (#134)",
      "chore(deps-dev): bump qs from 6.15.0 to 6.15.2 (#131)",
      "fix: remove unused timelineConfig variable"
    ]
  },
  {
    "version": "2.1.8",
    "date": "2026-05-12T19:05:36.647Z",
    "commits": [
      "feat: add image sequence export and improve SVG compatibility (#130)",
      "chore(deps-dev): bump fast-uri from 3.1.0 to 3.1.2 (#129)",
      "chore(deps-dev): bump hono from 4.12.14 to 4.12.18 (#128)",
      "chore(deps): bump postcss in /dev-tools/react-export-test (#127)",
      "chore(deps): bump ip-address and express-rate-limit (#126)",
      "chore(deps-dev): bump postcss from 8.5.6 to 8.5.14 (#125)",
      "Update version flags"
    ]
  },
  {
    "version": "2.1.7",
    "date": "2026-05-06T21:02:21.175Z",
    "commits": [
      "fix: resolve is_admin type mismatch in layer limit registration"
    ]
  },
  {
    "version": "2.1.6",
    "date": "2026-05-06T20:57:05.755Z",
    "commits": [
      "feat: wire up unlimited layers for pro/admin accounts (#124)"
    ]
  },
  {
    "version": "2.1.5",
    "date": "2026-05-06T18:41:41.431Z",
    "commits": [
      "feat: update premium submodule - mentions, quote-replies, notification fix (#122)"
    ]
  },
  {
    "version": "2.1.4",
    "date": "2026-05-06T18:37:42.680Z",
    "commits": [
      "fix: add missing MCP post-effect types to fix tsc build",
      "fix: prefix unused video param to fix tsc build",
      "feat: Image Trace overlay for tracing reference images/videos (#120)",
      "Merge pull request #119 from CameronFoxly/dependabot/npm_and_yarn/hono-4.12.14",
      "Merge pull request #118 from CameronFoxly/dependabot/npm_and_yarn/dompurify-3.4.0",
      "chore(deps-dev): bump hono from 4.12.12 to 4.12.14",
      "chore(deps): bump dompurify from 3.3.2 to 3.4.0",
      "Update flags",
      "Fixed outdated typescript reference to baseURL"
    ]
  },
  {
    "version": "2.1.3",
    "date": "2026-04-14T19:04:28.035Z",
    "commits": [
      "Merge pull request #117 from CameronFoxly/cameronfoxly/fix-typography-menu-alignment",
      "Add Menlo as a selectable font option",
      "Fix fallback font reporting to detect actual monospace default",
      "Rewrite font detection to use FontFace local() probing",
      "Fix false-positive font detection for system fonts",
      "Mark retro fonts as bundled and register in font loader",
      "Fix typography menu right-aligning with trigger button"
    ]
  },
  {
    "version": "2.1.2",
    "date": "2026-04-14T17:45:25.286Z",
    "commits": [
      "chore: update premium submodule to include preview data fix",
      "Merge pull request #116 from CameronFoxly/cameronfoxly/fix-my-projects-dialog-bugs",
      "fix: my projects dialog button disabled state and timestamp bugs",
      "Merge pull request #115 from CameronFoxly/cameronfoxly/add-discord-link-about-dialog",
      "Add Discord server link to About dialog"
    ]
  },
  {
    "version": "2.1.1",
    "date": "2026-04-13T19:16:03.738Z",
    "commits": [
      "Merge pull request #113 from CameronFoxly/cameronfoxly/fix-frame-rename-dialog-click",
      "Fix: move useTimelineHistory call before handleRenameSubmit",
      "Fix: close context menu when rename dialog opens, add undo history",
      "Merge pull request #112 from CameronFoxly/cameronfoxly/fix-taper-controls-rect-ellipse",
      "Merge pull request #114 from CameronFoxly/cameronfoxly/fix-ascii-box-auto-apply-on-tool-switch",
      "fix: auto-apply ASCII box work when switching tools instead of discarding",
      "Fix: rename dialog clicks closing the dialog immediately",
      "Add taper controls to rectangle and ellipse tool settings",
      "chore: set version to 2.1.0 (Shaders major release)"
    ]
  },
  {
    "version": "2.0.19",
    "date": "2026-04-10T04:47:06.644Z",
    "commits": [
      "docs: add Shaders documentation to docs site (web submodule update)"
    ]
  },
  {
    "version": "2.0.18",
    "date": "2026-04-10T02:22:11.002Z",
    "commits": [
      "fix: remaining TS errors + update submodule pointers to feature/shaders"
    ]
  },
  {
    "version": "2.0.17",
    "date": "2026-04-10T02:21:09.384Z",
    "commits": [
      "fix: resolve 12 TypeScript compilation errors"
    ]
  },
  {
    "version": "2.0.16",
    "date": "2026-04-10T02:17:52.301Z",
    "commits": [
      "Merge pull request #107 from CameronFoxly/cameronfoxly/post-effects-system",
      "chore: bump version to 2.1.0 (Shaders release)",
      "chore: clean up debug logging, prepare for merge",
      "fix: pass postEffectTracks to preview regeneration on save/update",
      "fix: resolve TS errors in gallery shader pipeline",
      "fix: apply shaders to publish preview snapshot",
      "feat: gallery shader integration + developer guide update",
      "fix: .asciimtn import now restores shader (post effect) tracks",
      "test: update react-export-test to shader-test-02 with fixed runtime",
      "fix: shader export runtime missing snapshot texture and u_bgColor",
      "test: add shader export component to react-export-test harness",
      "ui: use standard Radix tooltips in Effects, Generators, and Shaders sections",
      "ui: change pixelate default pixel size from 8 to 3",
      "feat: add Pixelate shader effect + update developer guide",
      "fix: glow compositing breaks when not first in shader stack",
      "fix: distortion fills out-of-bounds pixels with canvas background color",
      "ui: remove animate property from screen distortion, wave always animates",
      "ui: screen distortion intensity step from 0.01 to 0.1",
      "ui: update glow defaults to intensity:2, radius:48, threshold:0",
      "feat: glow color mode (source/gradient), intensity up to 10, uncap radius",
      "ui: glow threshold and color shift step to 0.1, fix mangled blendMode property",
      "ui: glow intensity step to 0.1, radius max to 200",
      "fix: increase radial blur quality to 129 samples (64 per side)",
      "ui: change blur center X/Y drag step from 0.01 to 0.1",
      "Merge pull request #106 from CameronFoxly/dependabot/npm_and_yarn/hono-4.12.12",
      "Merge pull request #105 from CameronFoxly/dependabot/npm_and_yarn/dev-tools/react-export-test/vite-6.4.2",
      "fix: shader program cache was returning programs from wrong GL context",
      "fix: use readPixels+putImageData for shader export readback",
      "fix: PNG export empty when shaders applied",
      "fix: clicking effect block clears shader panel selection",
      "fix: remove stray comment closing that caused esbuild parse error",
      "feat: embed WebGL shader pipeline in React and HTML exports",
      "ui: replace emoji with lucide Info icon in export dialogs",
      "fix: export shader scaling, PNG output, and SVG toggle",
      "fix: color picker positioning and radial blur rotation",
      "feat: overhaul glow and blur shaders",
      "fix: shader overlay refreshes on all canvas state changes",
      "fix: screen distortion type selector and animate toggle",
      "ui: rename \"Post Effects\" to \"Shaders\" and restyle timeline",
      "feat: add drag-to-reorder for post effect tracks",
      "fix: add full undo/redo support for all post effect actions",
      "fix: post effect keyframe copy/paste and multi-select drag",
      "fix: integrate post effects into optimized playback loop",
      "fix: post effects missing from playback and exports",
      "fix: match PostEffectPropertiesPanel UI to EffectPropertiesPanel patterns",
      "Fix post effect keyframes to have full parity with global effect keyframes",
      "Fix three post effects timeline integration bugs",
      "fix: flip Y when uploading Canvas2D to WebGL texture",
      "fix: post effects overlay DPI scaling, zoom sync, and live updates",
      "feat: add Post Effects system with WebGL shader pipeline",
      "chore(deps-dev): bump hono from 4.12.7 to 4.12.12",
      "chore(deps-dev): bump vite in /dev-tools/react-export-test",
      "Merge pull request #104 from CameronFoxly/dependabot/npm_and_yarn/vite-7.3.2",
      "chore(deps-dev): bump vite from 7.2.4 to 7.3.2",
      "Merge pull request #103 from CameronFoxly/dependabot/npm_and_yarn/dev-tools/react-export-test/picomatch-4.0.4",
      "chore(deps): bump picomatch in /dev-tools/react-export-test",
      "Merge pull request #102 from CameronFoxly/dependabot/npm_and_yarn/multi-580a7c2f10",
      "Merge pull request #101 from CameronFoxly/dependabot/npm_and_yarn/yaml-2.8.3",
      "Merge pull request #100 from CameronFoxly/dependabot/npm_and_yarn/multi-bf05dc1ecf",
      "chore(deps): bump brace-expansion",
      "chore(deps): bump yaml from 2.8.1 to 2.8.3",
      "chore(deps): bump picomatch",
      "chore: bump version to v2.0.15"
    ]
  },
  {
    "version": "2.0.15",
    "date": "2026-03-31T22:34:50.336Z",
    "commits": [
      "fix: update premium submodule for disk I/O optimization",
      "Merge pull request #98 from CameronFoxly/dependabot/npm_and_yarn/flatted-3.4.2",
      "Update flags",
      "chore(deps-dev): bump flatted from 3.4.1 to 3.4.2"
    ]
  },
  {
    "version": "2.0.14",
    "date": "2026-03-23T23:09:47.470Z",
    "commits": [
      "Merge pull request #97 from CameronFoxly/remove-300-frame-import-cap",
      "Remove 300 frame cap on video imports",
      "Merge pull request #95 from CameronFoxly/dependabot/npm_and_yarn/undici-7.24.4",
      "chore(deps): bump undici from 7.20.0 to 7.24.4"
    ]
  },
  {
    "version": "2.0.13",
    "date": "2026-03-16T03:23:57.993Z",
    "commits": [
      "Merge pull request #94 from CameronFoxly/fix/mcp-canvas-snapshot-stale-data",
      "fix: flush canvas to timeline before MCP state snapshot and export"
    ]
  },
  {
    "version": "2.0.12",
    "date": "2026-03-13T19:27:58.960Z",
    "commits": [
      "Initial version"
    ]
  },
  {
    "version": "2.0.11",
    "date": "2026-03-13T19:25:47.806Z",
    "commits": [
      "fix: add export_request to MCPServerMessage type"
    ]
  },
  {
    "version": "2.0.10",
    "date": "2026-03-13T19:24:21.190Z",
    "commits": [
      "Update version flags",
      "feat: browser-delegated export via MCP and effect sync handlers"
    ]
  },
  {
    "version": "2.0.9",
    "date": "2026-03-13T17:12:43.307Z",
    "commits": [
      "Merge pull request #90 from CameronFoxly/video-export-default-1x",
      "Merge pull request #93 from CameronFoxly/fix/decouple-premium-from-core",
      "fix: use iterative sanitization to prevent nested tag bypass",
      "fix: decouple premium subdirectory from core app build",
      "Change video export resolution default from 2x to 1x",
      "Update tests to match new effects system",
      "Update flags",
      "chore: update web submodule (next.js security fix)",
      "fix: resolve remaining audit vulnerabilities (ajv, diff, express-rate-limit)",
      "fix: update next.js to 16.1.6 to address CVE-2026-23864",
      "Merge pull request #89 from CameronFoxly/update-docs-timeline-effects",
      "Update flags",
      "Update flags",
      "chore: update package-lock.json for workspace resolution",
      "docs: update web submodule for timeline & effects docs refresh",
      "Merge pull request #88 from CameronFoxly/dependabot/npm_and_yarn/hono-4.12.7",
      "chore(deps-dev): bump hono from 4.12.5 to 4.12.7",
      "Update flags"
    ]
  },
  {
    "version": "2.0.8",
    "date": "2026-03-11T22:19:46.546Z",
    "commits": [
      "Initial version"
    ]
  },
  {
    "version": "2.0.7",
    "date": "2026-03-11T22:16:18.016Z",
    "commits": [
      "Merge pull request #87 from CameronFoxly/feat/cloud-projects-loading-ux",
      "fix: address PR review feedback",
      "Merge remote-tracking branch 'origin/main' into feat/cloud-projects-loading-ux",
      "chore: update premium submodule (preview load order fix)",
      "fix: preserve cached sessionData during background refresh",
      "feat: lazy-load project previews with spinner",
      "Merge pull request #86 from CameronFoxly/feat/motion-trails-effect",
      "Merge remote-tracking branch 'origin/main' into feat/motion-trails-effect",
      "perf: show placeholder preview when sessionData not loaded",
      "Merge pull request #85 from CameronFoxly/fix/effects-keyframe-operations",
      "fix: support group/global screen-space effects + color swatch UI",
      "fix: use interpolated value when adding effect keyframes",
      "fix: wrap global effects tooltip in TooltipProvider",
      "fix: keep skeleton cards visible until fetch completes",
      "fix: global effects diamond button and paste routing for effect tracks",
      "feat: add Motion Trails screen-space effect",
      "feat: improve cloud projects loading UX with skeleton cards and cache",
      "fix: effects keyframe add/delete/paste via timeline UI",
      "fix: use SessionEffectTrackV2 type for globalEffects in session format",
      "feat: procedural effects system v2.1.0",
      "fix: rename bakeEffectBlock to bakeEffectIntoFrames in tests",
      "docs: mark all procedural effects tasks as completed",
      "Fixed export systems to support new effects system",
      "Fixed export to manage",
      "Cleaned up lint errors",
      "Clean up old effects system and bump version number",
      "Fine tune UI",
      "Fixed layout issues",
      "Fixed keyframe navigation and wiggle effects",
      "Fixed wave warp application",
      "Fixed up wave warp effect.",
      "Fine tuned scatter effect",
      "Fixed effect undo race conditions",
      "Fixed up color remap UI",
      "Fine tuned hue saturation controls",
      "Added reset button for effects with undo",
      "fix: undo restores full effect track with keyframes from snapshot",
      "feat: drag effects onto groups with drop highlight and undo support",
      "fix: bake undo deep clones all layer snapshots including cell objects",
      "fix: bake undo restores original content by capturing canvas state",
      "fix: bake effect properly clones frames and syncs canvas store",
      "fix: bake undo now restores full content frames arrays per layer",
      "feat: bake/apply effect with frame splitting, keyframe evaluation, and undo",
      "fix: undo effect move removes from target before re-adding to source",
      "fix: undo history for all effect drag-to-layer and drag-to-global operations",
      "fix: drop effects onto layers with highlight, not between layers",
      "fix: effect drag conflicts, duplication bug, undo for reorder/move",
      "feat: drag-to-reorder effect tracks and cross-owner drag-and-drop",
      "fix: panel switching on layer click, global KF editor, paste keyframes for effects",
      "fix: all effect property edits now record undo history",
      "feat: keyframe indicator dots on collapsed effect tracks and global effects",
      "fix: U hotkey and auto-expand for global/group effect tracks",
      "fix: global effects track now subscribes to store directly, auto-expands reliably",
      "fix: auto-expand layer/global when adding effects from any location",
      "fix: auto-expand global effects track when adding an effect",
      "fix: effect block drag/resize undo history, global effects collapse alignment",
      "feat: comprehensive undo/redo for all effect operations",
      "fix: copy/paste keyframes works for effect property tracks",
      "fix: render group effect keyframes on timeline, fix left/right panel alignment",
      "fix: apply group effects to child layers during compositing",
      "feat: always show global effects track, add group effect tracks",
      "feat: Figma-style drag-to-scrub on all timeline panel numeric inputs",
      "fix: indent Add Effect button to match Add Property",
      "fix: auto-key behavior for effect properties with existing keyframes",
      "fix: auto-expand layer and effect track when adding keyframes",
      "fix: effect track UI indent and Add Effect button styling",
      "fix: use app color picker, remove manual mapping add",
      "feat: auto-detect canvas colors/chars and palette-based remapping",
      "feat: inline mapping editor UI for remap color/character effects",
      "fix: U hotkey toggle and keyframe/effect panel switching",
      "fix: alt-drag duplicate and multi-select drag for effect keyframes",
      "fix: marquee selection includes effect keyframes, track context menus",
      "fix: effect keyframe drag, context menu, cursor, and U hotkey",
      "feat: full keyframe feature parity for effect property keyframes",
      "fix: render effect keyframe diamonds on timeline",
      "fix: add keyframe diamond buttons to effect properties panel",
      "feat: Phase 8 — test suite for procedural effects",
      "feat: Phase 7 — session serialization & migration",
      "feat: Phase 6 — effect properties panel & sidebar update",
      "feat: Phase 5 — timeline UI for effect tracks & blocks",
      "feat: Phase 4 — compositing pipeline integration",
      "feat: Phase 3 — store integration for effect tracks",
      "feat: Phase 2 — effect registry entries & processing pipeline",
      "feat: Phase 1 — effect block type system & registry",
      "Merge pull request #84 from CameronFoxly/dependabot/npm_and_yarn/dompurify-3.3.2",
      "Bump dompurify from 3.3.0 to 3.3.2",
      "Merge pull request #82 from CameronFoxly/dependabot/npm_and_yarn/hono-4.12.5",
      "Merge pull request #83 from CameronFoxly/dependabot/npm_and_yarn/hono/node-server-1.19.11",
      "Fixed bug with fill matching by color only",
      "Bump @hono/node-server from 1.19.9 to 1.19.11",
      "Bump hono from 4.12.2 to 4.12.5"
    ]
  },
  {
    "version": "2.0.6",
    "date": "2026-03-08T05:50:33.330Z",
    "commits": [
      "Initial version"
    ]
  },
  {
    "version": "2.0.5",
    "date": "2026-03-08T04:08:41.113Z",
    "commits": [
      "Merge pull request #81 from CameronFoxly/vector-rect-ellipse-tools",
      "Fixed bug with bezier lines",
      "Braille characters to import media automap settings",
      "Added braille mode to autofill",
      "Merge remote-tracking branch 'origin/main' into vector-rect-ellipse-tools",
      "Fixed bugs with irregular corners.",
      "Fixed bug and added fille option for filled or unfilled",
      "Merge pull request #80 from CameronFoxly/add-braille-chars",
      "feat: update rectangle and ellipse tools to use bezier vector engine",
      "Add Braille characters (U+2800-U+28FF) to Misc section in character picker",
      "Update version in readme",
      "Fixed some build errors after deploy"
    ]
  },
  {
    "version": "2.0.4",
    "date": "2026-03-01T23:53:23.774Z",
    "commits": [
      "Merge pull request #79 from CameronFoxly/feature/auto-mode-character-mapping",
      "Added line art mode to bezier tool.",
      "Fine tuned line art and auto mode settings",
      "Added line art character mapping setting",
      "Set up auto mode for ascii conversion",
      "Merge pull request #78 from CameronFoxly/dependabot/npm_and_yarn/rollup-4.59.0",
      "Bump rollup from 4.50.0 to 4.59.0",
      "Merge pull request #77 from CameronFoxly/dependabot/npm_and_yarn/dev-tools/react-export-test/rollup-4.59.0",
      "Bump rollup from 4.57.1 to 4.59.0 in /dev-tools/react-export-test",
      "Merge pull request #75 from CameronFoxly/dependabot/npm_and_yarn/multi-f5f34deeac",
      "Bump minimatch",
      "Merge pull request #72 from CameronFoxly/alert-autofix-2",
      "Merge pull request #73 from CameronFoxly/dependabot/npm_and_yarn/hono-4.12.2",
      "Bump hono from 4.11.9 to 4.12.2",
      "Potential fix for code scanning alert no. 2: Insecure randomness",
      "Update development plan in Readme",
      "Bump version number",
      "Merge pull request #71 from CameronFoxly/timeline-bugbash"
    ]
  },
  {
    "version": "2.0.3",
    "date": "2026-03-01T23:50:03.911Z",
    "commits": [
      "Merge pull request #79 from CameronFoxly/feature/auto-mode-character-mapping",
      "Added line art mode to bezier tool.",
      "Fine tuned line art and auto mode settings",
      "Added line art character mapping setting",
      "Set up auto mode for ascii conversion",
      "Merge pull request #78 from CameronFoxly/dependabot/npm_and_yarn/rollup-4.59.0",
      "Bump rollup from 4.50.0 to 4.59.0",
      "Merge pull request #77 from CameronFoxly/dependabot/npm_and_yarn/dev-tools/react-export-test/rollup-4.59.0",
      "Bump rollup from 4.57.1 to 4.59.0 in /dev-tools/react-export-test",
      "Merge pull request #75 from CameronFoxly/dependabot/npm_and_yarn/multi-f5f34deeac",
      "Bump minimatch",
      "Merge pull request #72 from CameronFoxly/alert-autofix-2",
      "Merge pull request #73 from CameronFoxly/dependabot/npm_and_yarn/hono-4.12.2",
      "Bump hono from 4.11.9 to 4.12.2",
      "Potential fix for code scanning alert no. 2: Insecure randomness",
      "Update development plan in Readme",
      "Bump version number",
      "Merge pull request #71 from CameronFoxly/timeline-bugbash",
      "Update flags and version after deploy"
    ]
  },
  {
    "version": "2.0.2",
    "date": "2026-02-24T05:58:13.035Z",
    "commits": [
      "Initial version"
    ]
  },
  {
    "version": "2.0.1",
    "date": "2026-02-24T05:56:10.571Z",
    "commits": [
      "Version update"
    ]
  },
  {
    "version": "2.0.0",
    "date": "2026-02-17T20:19:36.000Z",
    "commits": [
      "Layer-based timeline system with keyframe interpolation",
      "Multi-layer compositing with z-order, visibility, solo, lock",
      "Layer groups with cascading transforms",
      "Keyframe animation for position, scale, rotation, anchor point",
      "Cubic bezier easing editor with presets",
      "Layer transform tool with bounding box handles",
      "Content frames with draggable timing on timeline",
      "Property tracks with keyframe diamonds and marquee selection",
      "Frame rate controls with presets and custom values",
      "Work area with trim-to-range",
      "Session format v2.0.0 with automatic v1 migration",
      "Media import: New Layer mode with video frame rate matching",
      "Export optimizations: frame deduplication, color dictionaries, compact formats",
      "Video export: Auto fps mode from project settings",
      "Multi-layer crop with transform and keyframe preservation",
      "Multi-layer selection: delete, copy, move across layers",
      "Onion skinning: current layer and all layers modes",
      "Layer drag-and-drop reorder with group support",
      "Resizable timeline panel with ruler, playhead, and zoom",
      "MCP server v2.0.0 with 17 layer tools",
      "UI restructure: tool options header bar, 2-column tool panel, canvas zoom footer"
    ]
  },
  {
    "version": "0.2.64",
    "date": "2026-02-02T00:20:39.755Z",
    "commits": [
      "docs: update MCP setup instructions for VS Code",
      "Update web commit",
      "Added mcp guide",
      "Update duplicating frame data tool",
      "Fix: use projectName instead of name in MCP state sync",
      "Add browser-to-MCP state sync: send full state on connect",
      "Add WebSocket localhost to CSP for MCP connection",
      "Merge MCP-exposure: Add MCP client integration for live AI-powered editing",
      "Update web submodule with MCP docs",
      "Updated docs",
      "Added MCP dialog and status bar",
      "feat: add MCP browser client module for live sync",
      "Added MCP plan",
      "Merge pull request #61 from CameronFoxly/dependabot/npm_and_yarn/multi-b4fe5e61b3",
      "Bump react-router and react-router-dom"
    ]
  },
  {
    "version": "0.2.63",
    "date": "2026-01-27T05:18:49.318Z",
    "commits": [
      "Fix remap color effect with palette bug",
      "Update version flags"
    ]
  },
  {
    "version": "0.2.62",
    "date": "2026-01-26T22:31:57.959Z",
    "commits": [
      "Merge pull request #60 from CameronFoxly/import-transparency-bug",
      "Fixed the video transperency controls in the media import tool",
      "Refactor selection tool to limit drawing and effects to current selection"
    ]
  },
  {
    "version": "0.2.61",
    "date": "2026-01-25T23:27:13.331Z",
    "commits": [
      "Fixed cross frame selection persistance issues",
      "Fixed selection and shape drawing tool conflict",
      "Fine tuned new selection tool system",
      "Initial persistent selection added",
      "Added implementaiton plan",
      "Update packages"
    ]
  },
  {
    "version": "0.2.60",
    "date": "2026-01-25T02:12:59.070Z",
    "commits": [
      "Update character palette with new UI characters",
      "Merge pull request #58 from CameronFoxly/canvas-resize",
      "Added canvas resize feature",
      "Merge pull request #57 from CameronFoxly/bug-bashing",
      "Fixed ascii tool undo history",
      "Updated default to overwrite",
      "FIxed framerate bug",
      "Fixed ascii type",
      "More cli test",
      "CLi tests"
    ]
  },
  {
    "version": "0.2.59",
    "date": "2026-01-19T20:13:11.370Z",
    "commits": [
      "Added link to docs"
    ]
  },
  {
    "version": "0.2.58",
    "date": "2026-01-19T20:09:26.770Z",
    "commits": [
      "Fixed up color for exports",
      "Merge pull request #56 from CameronFoxly/feature/bubbletea-export"
    ]
  },
  {
    "version": "0.2.57",
    "date": "2026-01-19T18:42:20.674Z",
    "commits": [
      "Updated go export functions to bubbletea exprot",
      "feat(bubbletea): dual color dictionaries with hasDarkBackground runtime selection",
      "Updated dialog layout",
      "feat: add Bubbletea (Go) CLI export format",
      "Merge pull request #55 from CameronFoxly/openTUI-export",
      "Added openTUI export",
      "Added Ink export dev tools for testing output",
      "Merge pull request #54 from CameronFoxly/ink-export",
      "Add Ink exporting",
      "Updated gradient tool to respect current state of any cel if that gradient property is disabled",
      "Fix gradient application"
    ]
  },
  {
    "version": "0.2.56",
    "date": "2026-01-19T16:48:46.952Z",
    "commits": [
      "Updated gradient tool to respect current state of any cel if that gradient property is disabled",
      "Fix gradient application",
      "Merge pull request #52 from CameronFoxly/dependabot/npm_and_yarn/qs-6.14.1",
      "Bump qs from 6.14.0 to 6.14.1",
      "Updated welcome dialog",
      "chore: update premium submodule with Stripe docs update",
      "fix: Add VisuallyHidden description to dialog for a11y",
      "fix: Add VisuallyHidden description to dialog for a11y",
      "fix: Add Stripe domains to CSP and fix dialog a11y warning",
      "fix: Add aria-describedby to dialog to suppress a11y warning",
      "fix: Remove unused import causing build failure",
      "Update submodules to main with Stripe payment integration",
      "Added alerts for premium account downgrades",
      "Remove welcome dialog if coming to page from upgrade flow",
      "Added upgrade flow for creating pro accounts",
      "New flags",
      "Update flags",
      "Update instructions for working with supabase",
      "Added C64 palette"
    ]
  },
  {
    "version": "0.2.55",
    "date": "2025-12-03T23:05:35.936Z",
    "commits": [
      "Updated vulnerable react/nextjs packages"
    ]
  },
  {
    "version": "0.2.54",
    "date": "2025-12-03T22:53:34.986Z",
    "commits": [
      "Update docs for adding custom fonts",
      "Fixed up false negative on c4d font"
    ]
  },
  {
    "version": "0.2.53",
    "date": "2025-12-02T23:10:47.769Z",
    "commits": [
      "Added c64 font"
    ]
  },
  {
    "version": "0.2.52",
    "date": "2025-12-02T22:59:46.518Z",
    "commits": [
      "Update readme with updated deploy scripts"
    ]
  },
  {
    "version": "0.2.51",
    "date": "2025-12-02T17:57:42.410Z",
    "commits": [
      "Initial version"
    ]
  },
  {
    "version": "0.2.50",
    "date": "2025-12-02T17:02:49.932Z",
    "commits": [
      "update docs",
      "Update licence",
      "Updated flag",
      "Removed lint report artifact",
      "Update flags",
      "docs: Update marketing site implementation plan to reflect shipped status",
      "🚀 Ship Marketing Site (#49)"
    ]
  },
  {
    "version": "0.2.49",
    "date": "2025-11-21T18:36:47.277Z",
    "commits": [
      "Bump version to 0.2.48",
      "Merge pull request #48 from CameronFoxly/dependabot/npm_and_yarn/js-yaml-4.1.1",
      "Merge pull request #47 from CameronFoxly/dependabot/npm_and_yarn/vite-7.2.4",
      "Merge pull request #46 from CameronFoxly/dependabot/npm_and_yarn/glob-10.5.0",
      "Merge pull request #45 from CameronFoxly/alert-autofix-1",
      "Bump js-yaml from 4.1.0 to 4.1.1",
      "Bump vite from 7.1.7 to 7.2.4",
      "Bump glob from 10.4.5 to 10.5.0",
      "Potential fix for code scanning alert no. 1: Incomplete URL substring sanitization"
    ]
  },
  {
    "version": "0.2.48",
    "date": "2025-11-21T06:46:28.402Z",
    "commits": [
      "Fixed community gallery's font rendering so that font choice is repsected",
      "Fixed typography mismatch during playback bug",
      "Fixed scrollbar safari bugs"
    ]
  },
  {
    "version": "0.2.47",
    "date": "2025-11-20T19:58:54.867Z",
    "commits": [
      "Patched safari text bug defaulting to monaco",
      "Updated color remap effect to include map with palette functonality"
    ]
  },
  {
    "version": "0.2.46",
    "date": "2025-11-20T08:27:22.285Z",
    "commits": [
      "Cleaned up some lint errors",
      "Updated remap color effect to use palettes",
      "feat(effects): Add Reset button to Palette tab",
      "feat(effects): Implement complete Use Palette tab UI",
      "feat(effects): Add tab structure for palette-based color remapping",
      "feat(effects): Add palette-based color remapping infrastructure",
      "Fixed tooltip bug",
      "Added gutter to sidepanels to prevent layout shift for scrollbars",
      "Fix horizontal scrollbar layout shift in timeline with padding approach",
      "Add scrollbar-gutter CSS to prevent layout shift in panels",
      "Initial analysis and planning",
      "Initial plan",
      "Removed old artifacts",
      "Update version"
    ]
  },
  {
    "version": "0.2.45",
    "date": "2025-11-18T20:42:32.866Z",
    "commits": [
      "Fix palette issue for bezier tools"
    ]
  },
  {
    "version": "0.2.44",
    "date": "2025-11-18T19:39:07.735Z",
    "commits": [
      "Update falg",
      "Added project restore tools for admins",
      "Added performance plan ideas to docs",
      "FIxed the dev mode performance monitor with ctrl+shift+m"
    ]
  },
  {
    "version": "0.2.43",
    "date": "2025-11-18T04:49:10.189Z",
    "commits": [
      "Added monaspace and Geist mono to font stack"
    ]
  },
  {
    "version": "0.2.42",
    "date": "2025-11-17T21:13:47.740Z",
    "commits": [
      "Cleaned up lint errors",
      "Cleaned up some build errors"
    ]
  },
  {
    "version": "0.2.41",
    "date": "2025-11-17T20:31:57.220Z",
    "commits": [
      "Initial version"
    ]
  },
  {
    "version": "0.2.40",
    "date": "2025-11-17T20:28:02.604Z",
    "commits": [
      "Fixed up some performance issues."
    ]
  },
  {
    "version": "0.2.39",
    "date": "2025-11-17T19:54:03.378Z",
    "commits": [
      "Fixed up gradient UI a bit",
      "Added crop functionality to selection tools",
      "Add toast notification for minimum canvas size validation on crop",
      "Merge pull request #41 from CameronFoxly/copilot/add-space-to-character-picker",
      "Fix crop canvas bugs: clear selection, single undo step for all frames, simplified button UI",
      "Fix Tooltip error by wrapping in TooltipProvider",
      "Add comprehensive documentation for crop canvas to selection feature",
      "Add tests for crop canvas to selection utility functions",
      "Add custom character input field to character picker",
      "Implement crop canvas to selection feature for all selection tools",
      "Initial plan",
      "Add space character to Basic Text tab in character picker",
      "Initial plan"
    ]
  },
  {
    "version": "0.2.38",
    "date": "2025-11-17T05:47:47.784Z",
    "commits": [
      "Added the bezier tool v1",
      "Update flags",
      "Merge pull request #40 from CameronFoxly/bezier-tool",
      "Updated menus",
      "updated fonts and UI overlay buttons",
      "Added more to autofills",
      "FIxed first point issue with a hacky workaround that remounts component between shapes",
      "Added bezier actions to history",
      "updated block character map",
      "Perfermance cleanup, reduce re-renders on hoverstate",
      "Fixed icons",
      "Line width hotkeys fixed up",
      "Line width added",
      "cleaned up bezier handles",
      "Remapped smart ansi character choices",
      "Fixed up auto fill blocks",
      "Apply on tool change",
      "Added color palette to bezier tool",
      "Click outside to commit",
      "Added click to drag whole shape function",
      "UI style refining",
      "Added escape and enter behavior to line mode",
      "Lint error clean up",
      "Update bezier docs",
      "Fixed shape repeat issue.",
      "Persist settings between sessions.",
      "Added status bar messages to bezier tool",
      "Fine tune bezier handles",
      "Added ascii preview in phase 4",
      "Phase 3 polish of bezier overlay",
      "Phase 2 and 3 first draft",
      "Phase 1 of adding bezier tool",
      "Add comprehensive bezier shape tool implementation plan with multiple autofill palettes"
    ]
  },
  {
    "version": "0.2.37",
    "date": "2025-11-14T04:47:05.288Z",
    "commits": [
      "Tightened up SVG export dialog"
    ]
  },
  {
    "version": "0.2.36",
    "date": "2025-11-13T20:22:32.452Z",
    "commits": [
      "Fixed erasure overlay styling",
      "Updated brush preview on ctrl toggle for eraser",
      "Added ctrl click for eraser toggle"
    ]
  },
  {
    "version": "0.2.35",
    "date": "2025-11-13T19:24:23.520Z",
    "commits": [
      "Fixed logo animation and layout for welcome dialog and header"
    ]
  },
  {
    "version": "0.2.34",
    "date": "2025-11-13T18:47:22.947Z",
    "commits": [
      "Fixed header and added animation to logo"
    ]
  },
  {
    "version": "0.2.33",
    "date": "2025-11-13T16:34:26.046Z",
    "commits": [
      "Update view counter in gallery",
      "Updated flag",
      "Merge branch 'main' of https://github.com/cameronfoxly/Ascii-Motion",
      "Update Phase 7 tasks to completed status",
      "Update version",
      "Update README with community gallery info"
    ]
  },
  {
    "version": "0.2.32",
    "date": "2025-11-12T08:11:47.669Z",
    "commits": [
      "Added community gallery to welcome dialog."
    ]
  },
  {
    "version": "0.2.31",
    "date": "2025-11-12T05:51:34.433Z",
    "commits": [
      "Fixed OG image bug"
    ]
  },
  {
    "version": "0.2.30",
    "date": "2025-11-12T02:21:41.177Z",
    "commits": [
      "Initial version"
    ]
  },
  {
    "version": "0.2.29",
    "date": "2025-11-12T01:11:17.268Z",
    "commits": [
      "Update OG images"
    ]
  },
  {
    "version": "0.2.28",
    "date": "2025-11-12T01:08:23.043Z",
    "commits": [
      "Initial version"
    ]
  },
  {
    "version": "0.2.27",
    "date": "2025-11-11T22:22:30.140Z",
    "commits": [
      "Improved canvas brush responsiveness"
    ]
  },
  {
    "version": "0.2.26",
    "date": "2025-11-11T22:06:18.097Z",
    "commits": [
      "Improved canvas response speed",
      "Fixed cursor placement",
      "Update flag",
      "Fixed multiple auth checks"
    ]
  },
  {
    "version": "0.2.25",
    "date": "2025-11-11T17:20:58.278Z",
    "commits": [
      "Initial version"
    ]
  },
  {
    "version": "0.2.24",
    "date": "2025-11-11T16:36:42.234Z",
    "commits": [
      "update flag",
      "gzip for project upload",
      "Update version",
      "Update versions",
      "chore: Update premium submodule to merged main (performance fixes)",
      "chore: Update premium submodule (database performance fixes)",
      "Update flag",
      "feat: Community Gallery Feature - Phase 12 Production Release"
    ]
  },
  {
    "version": "0.2.23",
    "date": "2025-11-10T19:47:27.167Z",
    "commits": [
      "Update versions",
      "chore: Update premium submodule to merged main (performance fixes)",
      "chore: Update premium submodule (database performance fixes)",
      "Update flag",
      "feat: Community Gallery Feature - Phase 12 Production Release",
      "hotfix: Update premium submodule with additional null safety fixes",
      "Merge hotfix: Defensive null checks for ProjectsDialog",
      "hotfix: Add defensive null checks for sessionData in ProjectsDialog"
    ]
  },
  {
    "version": "0.2.22",
    "date": "2025-11-10T18:58:21.095Z",
    "commits": [
      "chore: Update premium submodule to merged main (performance fixes)",
      "chore: Update premium submodule (database performance fixes)",
      "Update flag",
      "feat: Community Gallery Feature - Phase 12 Production Release",
      "hotfix: Update premium submodule with additional null safety fixes",
      "Merge hotfix: Defensive null checks for ProjectsDialog",
      "hotfix: Add defensive null checks for sessionData in ProjectsDialog",
      "feat(community): Phase 0 - Add feature flag system for community showcase",
      "Update version num"
    ]
  },
  {
    "version": "0.2.21",
    "date": "2025-10-31T19:37:04.030Z",
    "commits": [
      "Fixed up import media panel bugs",
      "Fixed aspect ratio bug in import media",
      "Fixed lint errors",
      "Fixed up some palette inconsistencies",
      "Fixed up some color palette bugs",
      "Added new preset palettes"
    ]
  },
  {
    "version": "0.2.20",
    "date": "2025-10-31T17:30:51.446Z",
    "commits": [
      "Fine tune matrix effect",
      "Added digital rain generator",
      "Remove auto deployments from vercel"
    ]
  },
  {
    "version": "0.2.19",
    "date": "2025-10-30T23:05:36.991Z",
    "commits": [
      "Added generators to welcome message",
      "Merge pull request #33 from CameronFoxly/generators",
      "Merge pull request #32 from davidmwilliams/patch-1",
      "Update README.md",
      "Merge pull request #31 from CameronFoxly/Font-system"
    ]
  },
  {
    "version": "0.2.18",
    "date": "2025-10-30T22:52:36.949Z",
    "commits": [
      "Fixed up UI some more",
      "Fixed up UI",
      "Fine tuned raindrops",
      "More fine tuning of partcile physics sytem",
      "Fixed mapping for particle system",
      "Fine tune particle physics",
      "Fine tune noise dithering",
      "Added character dithering",
      "Set up noise effects with dithering",
      "REmove loop smoothing features",
      "Fine tuned radio wave generator",
      "Cleared out old console logs",
      "Updated preview aspect ratio",
      "Fixed framerate issues",
      "Tightened up canvas preview conditions",
      "Add docs about race condition bug",
      "Fixed live preview",
      "Got basic canvas application working",
      "Set up basic generator for step 4",
      "Phase 3 complete",
      "Phase 2 of generators implemented",
      "Phase 1 of generators plan implemented!",
      "Created plan for generators"
    ]
  },
  {
    "version": "0.2.17",
    "date": "2025-10-28T04:22:02.967Z",
    "commits": [
      "Updated OG image"
    ]
  },
  {
    "version": "0.2.16",
    "date": "2025-10-26T20:57:14.473Z",
    "commits": [
      "Initial version"
    ]
  },
  {
    "version": "0.2.15",
    "date": "2025-10-26T20:56:37.046Z",
    "commits": [
      "Dealt with layout bugs in status bar",
      "Fixed up status bar formatting",
      "Tightened up vertical spacing on tool palette",
      "Fine tune brush prevew popover",
      "Switched brush preview UI",
      "Fixed fill tool layout"
    ]
  },
  {
    "version": "0.2.14",
    "date": "2025-10-24T16:15:40.331Z",
    "commits": [
      "Switched logo to courior for universal support",
      "Removed inconsolata and robotomono as system fonts"
    ]
  },
  {
    "version": "0.2.13",
    "date": "2025-10-24T15:22:01.412Z",
    "commits": [
      "More log cleanup",
      "fixed typography menyu layout and cleaned up console logs",
      "Update docs",
      "Added bundled fonts",
      "Fixed font dedection system bugs",
      "Added font detection system",
      "Font 2 of font system complete",
      "Phase one complete of font system",
      "Setup plan for fonts"
    ]
  },
  {
    "version": "0.2.12",
    "date": "2025-10-23T15:31:53.590Z",
    "commits": [
      "Update premium package with fixed type definitions"
    ]
  },
  {
    "version": "0.2.11",
    "date": "2025-10-23T05:27:06.839Z",
    "commits": [
      "fixed text sanitation on react export dialog",
      "Fixed fill tool select/affect same bug",
      "Update premium package",
      "Fixed lint error backlog",
      "Fixed canvas color picker live preview and keyboard shortcuts"
    ]
  },
  {
    "version": "0.2.10",
    "date": "2025-10-21T18:01:43.169Z",
    "commits": [
      "Removed uneccessary logging",
      "Add cloud storage tab to welcome screen"
    ]
  },
  {
    "version": "0.2.9",
    "date": "2025-10-21T17:03:06.680Z",
    "commits": [
      "Fixed mobile welcome again!"
    ]
  },
  {
    "version": "0.2.8",
    "date": "2025-10-21T16:56:59.454Z",
    "commits": [
      "Fixed mobile welcome screen.",
      "Improved mobile dialog."
    ]
  },
  {
    "version": "0.2.7",
    "date": "2025-10-21T16:52:26.433Z",
    "commits": [
      "Fixed deploy errors"
    ]
  },
  {
    "version": "0.2.6",
    "date": "2025-10-21T16:47:01.093Z",
    "commits": [
      "Initial version"
    ]
  },
  {
    "version": "0.2.5",
    "date": "2025-10-21T16:45:08.484Z",
    "commits": [
      "Added mobile welcome dialog."
    ]
  },
  {
    "version": "0.2.4",
    "date": "2025-10-21T16:34:17.597Z",
    "commits": [
      "Fixed scrollbar position",
      "Adde welcome screen"
    ]
  },
  {
    "version": "0.2.3",
    "date": "2025-10-21T08:28:13.375Z",
    "commits": [
      "Added welcome screen to app",
      "Added welcome dialog to hamburger menu.",
      "Update descriptions in dialog again",
      "Update descirptions  in welcome screen",
      "Updated dialog witih all vimeo videos",
      "Fix import bug with new security settings",
      "Fixed vimeo playback and updated docs",
      "Add credentialless attribute to Vimeo iframe for Chrome COEP compatibility"
    ]
  },
  {
    "version": "0.2.2",
    "date": "2025-10-21T05:39:12.221Z",
    "commits": [
      "Fix CSP: Add unpkg.com to connect-src for FFmpeg WASM loading",
      "Disable automatic Vercel deployments - use manual deploys only",
      "Fix CSP to allow FFmpeg CDN and workers",
      "Add Vimeo support to welcome dialog, configure COEP for production testing",
      "Setup reough welcome dialog"
    ]
  },
  {
    "version": "0.2.1",
    "date": "2025-10-20T15:35:18.877Z",
    "commits": [
      "Added speed insights"
    ]
  },
  {
    "version": "0.2.0",
    "date": "2025-10-20T07:42:20.994Z",
    "commits": [
      "Adding the Auth system to main",
      "Update readme",
      "Update readme",
      "Update premium package",
      "Added basic account settings dialog",
      "Cleaned up a bunch of debugging logs",
      "Added toast component for notifications",
      "Fixed up project metadata sync issues",
      "Update subpackage",
      "Fix eyeball error on password field with password manager overlay",
      "Recognize password reset flow correctly",
      "Fixed aria warnings about dialog descriptions for acccessibility",
      "Removed thick white borders!",
      "Added validation to input fields for security sake",
      "Update big white outlines on stuff",
      "Cleaned up dialogs.",
      "Updated section divider inconsistencies",
      "Fixed inconsistent UI dialog outlines",
      "Fixed a few lint errors",
      "More UI nudging",
      "More UI sweetening",
      "Fixed up project management UI",
      "Improved project management system and standardized metadata.",
      "Update menus",
      "Updated trash functionality",
      "Update package ref",
      "Restructured docs",
      "Added figma workflow notes for later",
      "Tightened up projects dialog some more.",
      "Added trash and perm delete functions",
      "Updated cloud projects design",
      "Consolidated export functions and added description to .asciimtn files",
      "Fixed up save to cloud dialog",
      "Fixed up header buttons",
      "Reduced duplication in core directory, added docs around duplicating shared components",
      "Latest package update for premium directory",
      "More docs and reorganize UI and logic seperation",
      "Updated docs and projects dialog",
      "Added supabase architecture docs",
      "Fixed persisted session bug, but still broken cloud save",
      "Update cloud storage docs",
      "Updated docs wth auth setup",
      "docs(auth): Add session persistence fix documentation",
      "fix(auth): Improve session persistence and loading state",
      "refactor(auth): Update premium submodule - secure signup behavior",
      "debug(auth): Update premium submodule with signup debugging",
      "fix(auth): Update premium submodule with better signup error handling",
      "docs: Add comprehensive build fixes documentation",
      "fix(build): Fix TypeScript build errors in monorepo packages",
      "docs: Add comprehensive authentication testing guide",
      "feat(auth): Integrate authentication into main app",
      "feat(auth): Update premium submodule with auth UI components",
      "feat(auth): Update premium submodule - AuthContext complete",
      "Setup supabase migration",
      "feat(auth): Update premium submodule with Supabase client",
      "docs: Complete monorepo documentation and Git submodule setup",
      "Add premium package as private Git submodule",
      "Added monorepo plan",
      "Initial plan created for auth",
      "Update readme again",
      "Update README",
      "Cleanup keyboard shortcut dialog, added search",
      "Address UI feedback: remove parentheticals, grey section titles, improve spacing",
      "Improve text handling in shortcut items to prevent overflow",
      "Add search bar and 2-column layout to keyboard shortcuts dialog",
      "Initial plan for keyboard shortcuts dialog improvements",
      "Initial plan"
    ]
  },
  {
    "version": "0.1.45",
    "date": "2025-10-12T04:53:05.922Z",
    "commits": [
      "Add re-apply latest effect feature",
      "Fixed build errors.",
      "Implement redo functionality for apply_effect actions",
      "Merge pull request #24 from CameronFoxly/copilot/improve-tabbing-experience",
      "Fix: Make all dialog and panel buttons tabbable with natural DOM order",
      "Polish code based on final review feedback",
      "Refactor reapplyLatestEffect to reduce code duplication",
      "Add re-apply latest effect functionality",
      "Initial plan for re-apply latest effect feature",
      "Initial plan",
      "Fix: Allow Tab key to navigate between frame duration fields",
      "Fix tab order: header first, frames sequential, add right panel tabs",
      "Add tab order documentation",
      "Add tab order to header and tool buttons",
      "Initial plan"
    ]
  },
  {
    "version": "0.1.44",
    "date": "2025-10-11T23:27:24.970Z",
    "commits": [
      "Added back in playback UI visual feedback, removed stop UI button",
      "Fixed playback hotkey issue",
      "Fixed deployment-stopping lint errors."
    ]
  },
  {
    "version": "0.1.43",
    "date": "2025-10-11T08:16:32.498Z",
    "commits": [
      "Initial version"
    ]
  },
  {
    "version": "0.1.42",
    "date": "2025-10-11T08:14:09.351Z",
    "commits": [
      "Fixed hotkey issues with typing tool",
      "Fixed up Undo Bugs",
      "Fied undo buttons.",
      "Added transparency to the video import feature",
      "Added dithering to import panel, and fixed some bugs there",
      "Fixed import undo history adding",
      "Fixed import MP4box error",
      "Fixed first frame bug on imports.",
      "Final tweaks for scatter",
      "Fine tune scatter effect controls",
      "Set up the scatter effect",
      "Fixed bug - importing session and new frames conflict between thumbnail and actual data"
    ]
  },
  {
    "version": "0.1.41",
    "date": "2025-10-10T23:47:40.981Z",
    "commits": [
      "Updated docs on playback optimization",
      "More console logs!",
      "Cleaned up old console logs",
      "Fixed the more frames playback bottleneck issue",
      "Set up optimized playback",
      "Added animation playback optimization plan",
      "Updated copilot instructions to include lint error prevention [facepalm]",
      "Remaining lint errors around hooks warnings",
      "Cleared out the rest of the ANY errors",
      "More lint errors, regretting all my life choices.",
      "A bunch of Any lint errors",
      "Moar lint errors...",
      "FIxed more lint error debt",
      "Removed duplicat color picker component",
      "Easy win lint errors resolved.",
      "Fixed logo layout in header",
      "Fixed bug when user was not on frame one while opening session file",
      "Change canvas size layout",
      "Update canvas size controls to allow for pixel editing"
    ]
  },
  {
    "version": "0.1.40",
    "date": "2025-10-10T19:52:28.502Z",
    "commits": [
      "Updated docs on playback optimization",
      "More console logs!",
      "Cleaned up old console logs",
      "Fixed the more frames playback bottleneck issue",
      "Set up optimized playback",
      "Added animation playback optimization plan",
      "Updated copilot instructions to include lint error prevention [facepalm]",
      "Remaining lint errors around hooks warnings",
      "Cleared out the rest of the ANY errors",
      "More lint errors, regretting all my life choices.",
      "A bunch of Any lint errors",
      "Moar lint errors...",
      "FIxed more lint error debt",
      "Removed duplicat color picker component",
      "Easy win lint errors resolved.",
      "Fixed logo layout in header",
      "Fixed bug when user was not on frame one while opening session file",
      "Change canvas size layout",
      "Update canvas size controls to allow for pixel editing"
    ]
  },
  {
    "version": "0.1.39",
    "date": "2025-10-08T20:11:36.606Z",
    "commits": [
      "Fixed bug when user was not on frame one while opening session file",
      "Change canvas size layout",
      "Update canvas size controls to allow for pixel editing",
      "Added playback fps readout",
      "Allowed setting duaration to 60fps"
    ]
  },
  {
    "version": "0.1.38",
    "date": "2025-10-06T06:04:59.580Z",
    "commits": [
      "Fixed some typsecript errors",
      "Fix time effect defaults"
    ]
  },
  {
    "version": "0.1.37",
    "date": "2025-10-06T05:54:45.732Z",
    "commits": [
      "Added brush preview to line drawing",
      "Updated fill and gradient hotkeys",
      "Fixed exit states for box drawing tool.",
      "Cleaned up Ascii Box UI",
      "Added gap filling and smoothing to free drawing ascii boxes",
      "Fixed shift click box drawing behavior",
      "Set up ascii box drawing system, but still needs some bug bashing",
      "FIrst 7 steps of ascii box drawing tool",
      "Solved some linting error debt"
    ]
  },
  {
    "version": "0.1.36",
    "date": "2025-10-05T19:32:55.113Z",
    "commits": [
      "Made font preview sections collapsabled",
      "Fixed pull down styling"
    ]
  },
  {
    "version": "0.1.35",
    "date": "2025-10-05T16:38:01.844Z",
    "commits": [
      "Fixed text autofocus in ascii text",
      "TIghtened preview box spacing",
      "Fixed preview box resizing issue",
      "Fixed overflow in ascii text preview box",
      "Added Ascii Text tool with Figlet fonts",
      "Added React component export",
      "Added first and last frame playback controls",
      "Added hotkeys for save and open project",
      "Added brush sizing to eraser",
      "Updated hotkeys for switching brush size, character or colors"
    ]
  },
  {
    "version": "0.1.34",
    "date": "2025-10-05T15:19:39.551Z",
    "commits": [
      "Fixed overflow in ascii text preview box",
      "Added Ascii Text tool with Figlet fonts",
      "Added React component export",
      "Added first and last frame playback controls",
      "Added hotkeys for save and open project",
      "Added brush sizing to eraser",
      "Updated hotkeys for switching brush size, character or colors",
      "Update SEO content"
    ]
  },
  {
    "version": "0.1.33",
    "date": "2025-10-04T15:33:50.859Z",
    "commits": [
      "Initial version"
    ]
  },
  {
    "version": "0.1.32",
    "date": "2025-10-04T05:05:53.607Z",
    "commits": [
      "Added autoscroll when dragging on timeline",
      "Decreased visual height of drop indicator.",
      "Increased size of drag and drop frame reordering hotzone",
      "Updated multiframe documentation and multiframe duration set",
      "Added multiframe duplicaiton",
      "Fixed batch move undo bugs",
      "Fixed frame re-order bug",
      "Fixed frame delete undo bug",
      "Initial rough multiframe selection added",
      "Update versions"
    ]
  },
  {
    "version": "0.1.31",
    "date": "2025-10-03T07:18:28.773Z",
    "commits": [
      "Added about section",
      "Added main hamburger menu",
      "Fixed onion skin and duplicate frame hotkeys",
      "Fixed circle draw tool",
      "Fixed lasso styling",
      "Fixed selection copy and paste issues",
      "Cleaned up visual styling of selection tool overlays",
      "Set up add and remove alt and shift tools for selection",
      "Fixed flipping selection bugs",
      "Add brush preview overlay to canvas",
      "Update readme"
    ]
  },
  {
    "version": "0.1.30",
    "date": "2025-10-02T07:21:20.989Z",
    "commits": [
      "Cleaned up brush preview UI",
      "Fixed brush size artifact",
      "Fixed smoothing bug with new brushes",
      "Fixed brush shape",
      "Added brush size tool",
      "Added filp tools"
    ]
  },
  {
    "version": "0.1.29",
    "date": "2025-10-02T05:58:45.858Z",
    "commits": [
      "Persist gradient settings between sessions",
      "Fixed colors picker not cancelling properly",
      "Fix import panel setting persistence between sessions.",
      "Update version"
    ]
  },
  {
    "version": "0.1.28",
    "date": "2025-10-01T22:08:48.609Z",
    "commits": [
      "Fixed text sanitation rules",
      "Fixed dialog placement for time effects"
    ]
  },
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