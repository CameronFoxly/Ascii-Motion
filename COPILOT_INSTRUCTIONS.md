# ASCII Motion - Copilot Development Instructions

## Project Overview

ASCII Motion is a React + TypeScript web application for creating and animating ASCII art with a professional layer-based timeline system. The app uses a compositing architecture where multiple layers are rendered with keyframe-interpolated transforms (position, scale, rotation, anchor point).

**Tech stack:** Vite, React 19, Zustand, Shadcn/ui, Tailwind CSS v3, TypeScript strict mode.

**Version:** 2.1.0 (Shaders — GPU Post-Processing Effects)

**MCP Server:** The companion `ascii-motion-mcp` package (separate repo) provides an MCP server for AI-assisted creation. It mirrors the app's tool/layer/keyframe API via WebSocket. When adding new tools or features, update the MCP server's tools and state model accordingly. See `ascii-motion-mcp/src/tools/` and `ascii-motion-mcp/src/state.ts`.

---

## Critical Rules

### Security & Documentation

**Documentation locations (two directories based on sensitivity):**
```
Does this doc mention...
├─ Database/Supabase? → packages/premium/docs/
├─ Authentication?    → packages/premium/docs/
├─ Cloud storage?     → packages/premium/docs/
├─ Subscriptions?     → packages/premium/docs/
├─ Payments/Stripe?   → packages/premium/docs/
├─ Security policies? → packages/premium/docs/
└─ None of the above? → docs/
When in doubt?        → packages/premium/docs/
```

**NEVER include in any documentation:** Real API keys, database credentials, Supabase project IDs, service role keys, Stripe secret keys, real user data. Always use placeholders:
```bash
VITE_SUPABASE_URL=https://YOUR_SUPABASE_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Get project IDs dynamically via MCP tools**, never hardcode from memory:
```typescript
const projects = await mcp_supabase_list_projects();
const projectId = projects[0].id;
```

**Edge Function deployment:** Always use Supabase MCP tools, NOT the CLI (CLI requires interactive browser auth). Location: `packages/premium/supabase/functions/`

**If you accidentally commit sensitive IDs:** `npx tsx packages/premium/scripts/sanitize-project-ids.ts`

### Never Modify Subscription Tiers

**Do NOT change any user's subscription tier unless explicitly instructed by the project owner.**
```sql
-- ❌ FORBIDDEN without explicit permission
UPDATE profiles SET subscription_tier_id = 'admin-tier-id' WHERE id = 'some-user-id';

-- ✅ ONLY with explicit permission and confirmed user ID
UPDATE profiles SET subscription_tier_id = 'admin-tier-id' WHERE id = 'user-id-they-explicitly-provided';
```
If testing tier features: ask which account, get explicit user ID, confirm before executing.

### No Automatic Commits or Deployments

Do not commit or deploy automatically. All changes must be manually reviewed before committing. Only commit or deploy when explicitly asked. Never run a production deployment from a feature branch.

### Main App Production Deployments

The production version history is generated during deployment and must always match the code being shipped.

- Deploy the main app only from a clean checkout of the latest merged `origin/main`.
- Run `npm run deploy` from the repository root for normal production releases. Use `npm run deploy:major` only when a minor version increment is explicitly intended.
- **Never run `vercel --prod` or `vercel deploy --prod` directly for the main app.** Those commands bypass `scripts/version-bump.js` and leave the live Version History, build date, and build hash stale.
- Before deploying, use `vercel project ls` and `vercel inspect https://ascii-motion.app` to confirm the existing `ascii-motion` project and production alias. If Vercel attempts to create or link a different project, stop and remove that accidental project before continuing.
- After deployment, verify that `https://ascii-motion.app` is READY and returns HTTP 200, then confirm the live UI or compiled asset shows the new `VERSION`, `BUILD_DATE`, `BUILD_HASH`, and release-history commits.
- Direct `vercel --prod` remains appropriate for the separately deployed marketing and docs projects only, from their documented package directories.

### Tailwind CSS v3 Requirement

**NEVER upgrade to Tailwind CSS v4+** — it breaks Shadcn component styling.
- Required: Tailwind CSS v3.4.x
- PostCSS config must use `tailwindcss: {}`, NOT `@tailwindcss/postcss: {}`

### Security Headers (COEP/COOP)

FFmpeg requires `SharedArrayBuffer`, which mandates:
- `Cross-Origin-Embedder-Policy: credentialless`
- `Cross-Origin-Opener-Policy: same-origin`

Production config is in `vercel.json`. Development does NOT set COEP headers (allows Vimeo/YouTube iframes).

CSP must include `https://unpkg.com` in both `script-src` AND `connect-src` for FFmpeg WASM loading. `media-src blob:` is required for import previews.

Chrome iframes need `credentialless` attribute: `{...({ credentialless: 'true' } as any)}`

### Code Quality

- Run `npm run lint` after every code change — zero warnings required
- Run `npm test:run` after changes to verify all tests pass (343 tests across 10 files)
- Fix `react-hooks/exhaustive-deps` warnings immediately
- Use Radix tooltips, never HTML `title` attributes
- Use shadcn component variants, don't override with custom classes
- Scope custom CSS — avoid universal selectors that affect shadcn components

### Testing

**Infrastructure:** Vitest + jsdom + @testing-library/react

**Commands:**
- `npm test` — watch mode (development)
- `npm run test:run` — single run (CI / verification)
- `npm run test:coverage` — with v8 coverage report

**Existing test files** (in `src/__tests__/`):
- `timelineStore.test.ts` (58 tests) — layer CRUD, content frames, keyframes, config
- `easing.test.ts` (27 tests) — cubic bezier solver, interpolation, presets
- `sessionMigration.test.ts` (29 tests) — v1→v2 migration, validation, repair
- `useTimelineHistory.test.ts` (16 tests) — undo/redo wrappers
- `layerCompositing.test.ts` (40 tests) — visibility, solo, transforms, gaps
- `layerLimits.test.ts` (23 tests) — tier enforcement, limit checks
- `canvasStoreLayerSync.test.ts` (15 tests) — dirty tracking, sync patterns
- `phase5ExportMigration.test.ts` (24 tests) — export round-trip, format validation
- `phase6Integration.test.ts` (19 tests) — adapter wiring, multi-layer behavior
- `timelineUI.test.ts` (92 tests) — timecode, ticks, easing presets, store state

**When writing new tests:**
- Store tests: import store directly, call `createNewProject()` in `beforeEach`, assert with `getState()`
- Hook tests: use `renderHook` from `@testing-library/react`, mock dependencies with `vi.mock()`
- Pure function tests: import directly, test boundary conditions
- Name tests descriptively: `'addLayer inserts above active layer'` not `'test addLayer'`

**When to add tests:**
- New store actions or utility functions — always
- Bug fixes — add a regression test that would have caught the bug
- Complex logic (interpolation, compositing, migration) — comprehensive coverage
- UI components — test interaction logic via hook tests, not DOM rendering

---

## Architecture Overview

### Core Stores (Zustand)

| Store | Purpose |
|-------|---------|
| **`useTimelineStore`** | PRIMARY: Layers, content frames, keyframes, property tracks, groups, timeline config, playback |
| `useCanvasStore` | Working buffer for the active layer's current content frame |
| `useAnimationStore` | **Compatibility adapter** over `timelineStore` — do NOT use for new code |
| `useToolStore` | Active tool, settings, drawing state, undo/redo history |
| `useProjectMetadataStore` | Project name, description |
| `useImportStore` | Media import workflow |
| `useExportStore` | Export dialog state |
| `useGeneratorsStore` | Generator definitions and output |
| `usePaletteStore` | Color palettes |
| `useCharacterPaletteStore` | Character palettes and mapping |
| `useBezierStore` | Bezier pen tool state |
| `usePreviewStore` | Preview overlay for effects/generators |

### Data Flow

```
timelineStore (layers, content frames, keyframes)
    ↓
useFrameSynchronization (syncs active layer ↔ canvasStore)
    ↓
canvasStore (working buffer — drawing tools write here)
    ↓
useCompositedCanvas (composites all layers for rendering)
    ↓
useCanvasRenderer (draws to canvas element)
```

### Key Files

| File | Purpose |
|------|---------|
| `src/stores/timelineStore.ts` | Layer/keyframe/timeline state (~2200 lines) |
| `src/stores/animationStore.ts` | Legacy API adapter (~650 lines) |
| `src/utils/layerCompositing.ts` | Multi-layer compositing with inverse-mapping transforms |
| `src/utils/layerTransformUtils.ts` | `screenToLocal()`, `localToScreen()`, `screenToLocalForLayer()` |
| `src/hooks/useCompositedCanvas.ts` | Composites all visible layers for rendering |
| `src/hooks/useFrameSynchronization.ts` | Canvas ↔ timeline sync, layer switching, auto-save |
| `src/utils/sessionMigration.ts` | v1→v2 session format migration |
| `src/types/timeline.ts` | Layer, ContentFrame, Keyframe, PropertyTrack types |
| `src/types/easing.ts` | Cubic bezier easing with Newton-Raphson solver |

### Coordinate System

```
Mouse events → screen space → drawing tools call screenToLocal() → canvasStore (local space)
    → compositing forward-transforms → rendered output (screen space)
```

- Drawing tools: call `screenToLocal()` before `setCell()` to convert screen coords to layer-local
- Selection masks: stay in screen space
- Compositing: forward-transforms local content to screen space per layer
- Crop: shifts position transforms by canvas origin offset; does NOT re-key content data
- Export: `compositeLayersAtFrame()` produces screen-space output for all formats

### Layer System

**Content Frames** replace the old v1 frame model:
```typescript
interface ContentFrame {
  id: ContentFrameId;
  startFrame: number;      // Position on timeline
  durationFrames: number;  // Duration in frames
  data: Map<string, Cell>; // ASCII cell data in local space
}
```

**Keyframe interpolation** for position, scale, rotation, anchor point using cubic bezier easing. Property tracks store keyframes per-layer. Groups compose transforms additively with child layers.

**Session format v2.0.0** preserves full layer structure. v1 files auto-migrate on import via `migrateV1ToV2()`.

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Header: Tool Options Bar | Canvas Size/Display | Theme      │
├─────────────────────────────────────────────────────────────┤
│ Tool Panel  │ Canvas (composited layers)  │ Right Sidebar   │
│ (84px,      │ + Zoom Controls Footer      │ Layer Properties │
│  2-col)     │                             │ or Keyframe Edit │
├─────────────────────────────────────────────────────────────┤
│ Timeline Panel (resizable)                                  │
│ Layer List (w-52) │ Ruler + Tracks + Keyframes              │
│ Footer: Work Area │ Onion Skin │ Zoom + Frame Timeline      │
└─────────────────────────────────────────────────────────────┘
```

**Z-Index hierarchy:** Canvas z-10–z-40, UI overlays z-50–z-999, Dropdowns/pickers z-[99999], Modals z-[100000]+

---

## Adding New Tools (9-Step Pattern)

Every new tool must follow this pattern for architectural consistency:

1. **Update Tool type** in `src/types/index.ts` — add to `Tool` union
2. **Create tool component** in `src/components/tools/YourTool.tsx` — behavior + status
3. **Export from index** in `src/components/tools/index.ts`
4. **Update `useToolBehavior.ts`** — display name, cursor, component names
5. **Update `ToolManager.tsx`** — render your tool component
6. **Update `ToolStatusManager.tsx`** — render your status component
7. **Implement tool logic** — use existing hooks (`useDrawingTool`, `useCanvasDragAndDrop`) or create a new dedicated hook
8. **Add tool store settings** if needed in `src/stores/toolStore.ts`
9. **Add hotkey** in `src/constants/hotkeys.ts` (MANDATORY) + update `KeyboardShortcutsDialog.tsx`
10. **Add MCP tool** in `ascii-motion-mcp/src/tools/` — expose the new tool's functionality for AI-assisted workflows, update state model if needed

**Hook selection:** Simple click tools → `useDrawingTool`. Drag tools → `useCanvasDragAndDrop`. Complex multi-state tools → create dedicated hook.

**Drawing tools must call `screenToLocal()`** before writing to `canvasStore` to handle layer transforms.

---

## Import System

- **Media import** supports "New Layer" mode (default) — creates a named layer from the source file
- **Video frame rate matching** — option to update project fps to match imported video, or keep project fps
- **Session import** auto-detects v1/v2 format and migrates v1 files
- **Import guard:** `animationStore.setImportingSession(true)` must be set before import to block auto-save race conditions in `useFrameSynchronization`
- **Layer-switch sync bug prevention:** The flush guard in `useFrameSynchronization` checks `!isImportingSession` to prevent writing empty canvas data to a newly-loaded layer whose ID matches the default layer

## Export System

All exports composite layers via `compositeLayersAtFrame()`:
- **React:** Compact array cells `[x,y,"char",colorIdx,bgIdx?]` + color dictionary + frame deduplication (~75% size reduction)
- **CLI (Ink, OpenTUI, BubbleTea):** Human-readable content rows + color dictionary + frame deduplication for identical consecutive frames
- **Video:** "Auto" fps mode uses project frame rate; 1:1 frame mapping (each animation frame = 1 video frame)
- **Session:** v2.0.0 format preserving full layer structure, keyframes, transforms
- **Crop:** Operates across all layers — shifts position transforms by crop offset, preserves keyframes

---

## File Organization

- **Root:** Essential project files only (README, package.json, configs)
- **`docs/`** — Public implementation docs, guides, plans
- **`packages/premium/docs/`** — Secure docs (auth, database, payments, subscriptions)
- **`dev-tools/`** — Test scripts, debugging tools, test projects
- **`src/components/ui/`** — Shadcn components (must sync to `packages/core/src/components/ui/`)

When adding/modifying Shadcn components, copy to `packages/core/` for the premium package.

---

## Key Patterns

### Undo/Redo
All undoable operations push to `toolStore.pushToHistory()` with typed `HistoryAction` objects. The handler in `useKeyboardShortcuts.ts` processes undo/redo for all action types. For drag operations, batch to a single undo (capture start values on mouseDown, push history on mouseUp).

### Layer-Aware Operations
When implementing features that read/write cell data:
- Reading cells for display: use `useCompositedCanvas` (composited view)
- Reading cells for the active layer: use `canvasStore.cells` (local space)
- Writing cells: use `canvasStore.setCell()` after `screenToLocal()` transform
- Multi-layer operations (crop, effects): iterate `timelineStore.layers` and handle each layer's transform separately

### Frame Synchronization
`useFrameSynchronization` handles the bidirectional sync between `canvasStore` and `timelineStore`:
- **Layer switch:** flush canvas to old layer's content frame, load new layer's content frame
- **Frame navigation:** same flush/load cycle
- **Auto-save:** debounced subscription writes canvas changes back to the active content frame
- **Guards:** `isImportingSession`, `isLoadingFrameRef`, `isPlaying`, `isDraggingFrame` prevent corruption

### Selection Tools
All selection tools must integrate with global keyboard handlers:
- Delete/Backspace: clear selected cells
- Cmd/Ctrl+C/V: copy/paste with clipboard priority (magic wand > lasso > rectangular)
- Arrow keys: move selection
- Escape: cancel/clear selection
- Enter: commit move operation
