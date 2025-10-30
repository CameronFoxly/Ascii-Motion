# Generators System - Implementation Plan

**Date:** October 27, 2025  
**Status:** 🚧 Draft – Pending Implementation Approval  
**Feature ID:** `generators`

---

## 1. Overview

The Generators system introduces a new workflow for procedurally creating pixel-based animations that seamlessly convert into ASCII frames. Generators live alongside existing effects in the right sidebar and provide:

- A collapsible "Generators" section (collapsed by default) under the right panel effects list.
- A slide-in panel matching the Media Import patterns with Animation and Mapping tabs.
- Live playback previews with looped animation by default and frame scrubbing.
- Append/overwrite workflow identical to Media Import, with explicit "Send to Canvas" confirmation.
- Deterministic randomization via user-editable seeds for all stochastic parameters.

Initial generator catalog:

1. **Radio Waves** – concentric wave propagation from a selectable origin.
2. **Turbulent Noise** – animated fractal noise field with configurable frequency/amp.
3. **Particle Physics** – particle emitter with velocity, gravity, bounce, friction.
4. **Rain Drops** – rippling raindrop interactions with interference.

---

## 2. User Experience & Flows

### 2.1 Right Panel Section
- `GeneratorsSection.tsx` mirrors `EffectsSection.tsx` but defaults closed.
- Each generator entry shows a Lucide icon, name, and description tooltip.
- Clicking an entry opens the generator panel and auto-starts preview playback.

### 2.2 Generator Panel Layout
- Reuse panel shell styles from `MediaImportPanel` (header, scroll body, footer).
- Header shows generator icon/name plus close button.
- Body contains two shadcn tabs: **Animation** (default) and **Mapping**.
- Footer includes:
  - Append vs Overwrite selector (same component as media import).
  - Loop toggle (if generator supports smoothing).
  - "Reset" (restore defaults), "Cancel", and "Apply Generator" buttons.

### 2.3 Preview Behaviour
- Always auto-play looped preview on panel open.
- Provide frame scrubber with playback controls (Play/Pause, frame index slider).
- Preview updates immediately while adjusting Animation tab parameters.
- Entering Mapping tab pauses playback and pins the current frame; applying mapping changes re-renders the pinned frame in real-time and resumes playback when returning to Animation tab.
- During long computations (>120 ms) show the existing `Spinner` overlay in the preview container.

### 2.4 Output Confirmation Flow
1. User tunes settings via Animation tab.
2. Optional adjustments in Mapping tab (character/color palettes, etc.).
3. Choose Append vs Overwrite scope.
4. Click **Apply Generator** → commit frames to animation store and close panel.
5. Cancel resets preview state without touching timeline.

---

## 3. Component & File Architecture

```
src/
├── components/
│   ├── features/
│   │   ├── GeneratorsSection.tsx          # Right panel collapsible list
│   │   ├── GeneratorsPanel.tsx            # Slide-in container + tabs
│   │   ├── generators/
│   │   │   ├── RadioWavesGenerator.tsx    # Animation tab content
│   │   │   ├── TurbulentNoiseGenerator.tsx
│   │   │   ├── ParticlePhysicsGenerator.tsx
│   │   │   ├── RainDropsGenerator.tsx
│   │   │   └── MappingTab.tsx             # Shared mapping tab wrapper
│   │   └── preview/
│   │       └── GeneratorPreviewCanvas.tsx # Canvas for pixel → ASCII preview
├── hooks/
│   ├── useGeneratorPreview.ts             # Handles playback & debounced regen
│   └── useGeneratorMapping.ts             # Reuses import mapping logic
├── stores/
│   └── generatorsStore.ts                 # Zustand store for all generator state
├── utils/
│   ├── generators/
│   │   ├── generatorRegistry.ts           # Metadata + defaults per generator
│   │   ├── generatorEngine.ts             # Common interface + dispatcher
│   │   ├── radioWavesEngine.ts            # Frame synthesis implementations
│   │   ├── turbulentNoiseEngine.ts
│   │   ├── particlePhysicsEngine.ts
│   │   └── rainDropsEngine.ts
│   └── generatorLoopUtils.ts              # Loop smoothing helpers
├── constants/
│   ├── generators.ts                      # Definitions, icons, default ranges
│   └── hotkeys.ts                         # (No change; generators share panel)
└── types/
    └── generators.ts                      # Settings interfaces & enums
```

- Mapping UI duplicated from `MediaImportPanel.tsx` into `MappingTab.tsx` wrapper. Shared component extraction deferred.
- Preview canvas component wraps ASCII conversion pipeline similar to Media Import but sourced from generator engines.
- Reuses existing `previewStore` for canvas overlay rendering (no new preview store needed).

---

## 4. State Management

### 4.1 `generatorsStore`
```typescript
interface GeneratorUIState {
  activeTab: 'animation' | 'mapping';
  isPlaying: boolean;
  currentPreviewFrame: number;
}

interface GeneratorsState {
  isOpen: boolean;
  activeGenerator: GeneratorId | null;
  outputMode: 'overwrite' | 'append'; // Matches importStore pattern
  applyToTimeline: boolean; // Visible only for loopable gens
  loopSmoothingEnabled: boolean;
  activeSeed: number;
  uiState: GeneratorUIState;
  animationSettings: Record<GeneratorId, GeneratorSettings>;
  mappingSettings: GeneratorMappingSettings; // Mirrors import store shape
  isPreviewDirty: boolean;
  isGenerating: boolean;
  totalPreviewFrames: number;
  openGenerator: (id: GeneratorId) => void;
  closeGenerator: () => void;
  updateAnimationSettings: {
    (id: GeneratorId, updates: Partial<GeneratorSettings>): void;
  };
  updateMappingSettings: (updates: Partial<GeneratorMappingSettings>) => void;
  setOutputMode: (mode: 'overwrite' | 'append') => void;
  setLoopSmoothing: (enabled: boolean) => void;
  setSeed: (seed: number) => void;
  setActiveTab: (tab: 'animation' | 'mapping') => void;
  setPlaying: (playing: boolean) => void;
  setPreviewFrame: (frameIndex: number) => void;
  regeneratePreview: () => Promise<void>;
  applyGenerator: () => Promise<boolean>;
  resetGenerator: (id: GeneratorId) => void;
}
```
- Store persists last-used settings per generator to restore when reopened.
- Seeds are tracked per generator and passed to engines for determinism.
- UI state (tab, playback) managed within generatorsStore.

### 4.2 Preview Coordination
- `generatorsStore` manages playback state via `uiState` (no separate preview store needed).
- Hooks coordinate with existing `previewStore` to render the ASCII overlay similarly to effects preview.
- When Mapping tab activates, `generatorsStore` pauses playback and `previewStore` shows pinned frame overlay.

### 4.3 Mapping Integration
- Reuse `useImportSettings` patterns by abstracting palette + mapping logic into `useGeneratorMapping`.
- Ensure palette manager dialogs remain accessible from Mapping tab (share modals with import system).

---

## 5. Preview & Conversion Pipeline

1. Animation settings change → `generatorsStore` marks preview dirty and triggers debounced `regeneratePreview` via `useGeneratorPreview` (200 ms trailing debounce; immediate on blur).
2. `generatorEngine` produces an array of RGBA frames (all sized to match current canvas aspect ratio).
3. Frames feed into `ASCIIConverter.convertFrame`, using mapping settings mirrored from media import.
4. Converted frames store in preview state as `Map<string, Cell>` arrays.
5. `GeneratorPreviewCanvas`:
   - Renders ASCII preview overlay using `previewStore` just like effects.
   - Provides frame scrubber and play controls (loop by default).
   - Displays skeleton placeholder while `isGenerating` true.
6. Mapping tab operations run on the latest cached RGBA frame to avoid recomputing physics; only ASCII conversion reruns.

---

## 6. Generator Algorithms & Parameters

### 6.1 Shared Requirements
- Canvas bounds limited by current canvas size (width ≤ 200, height ≤ 100).
- All random influences must accept a seeded PRNG (use Mulberry32 or similar).
- Animation tab exposes duration (ms), frame rate (FPS), and explicit frame count toggle.
- When loop smoothing enabled, `generatorLoopUtils` blends final frames into initial frames for seamless looping (crossfade over last N frames, default N = 4).

### 6.2 Radio Waves
**Parameters**
- Origin (x, y) within canvas bounds (UI: drag handle on preview + numeric inputs).
- Frequency (waves per second) – min 0.1, max 5.
- Line thickness (pixel radius) – min 1, max 5.
- Propagation speed (characters per frame) – min 0.5, max 5.
- Amplitude decay toggle + rate (falls off with distance).
- Gradient colors optional: start/end color for wave ring (converted through mapping).

**Rendering**
- For each frame, compute radius = speed * frameIndex.
- Render ring as soft-edged band matching thickness → generate grayscale intensity map (0-1) that ASCII converter translates.
- Decay fades amplitude over time.
- Loop smoothing ensures radius at final frame aligns with initial frame.

### 6.3 Turbulent Noise
**Parameters**
- Noise type selector: Perlin, Simplex, Worley.
- Base frequency (0.1 – 8.0), amplitude (0 – 1).
- Octaves (1 – 6), persistence, lacunarity.
- Evolution speed (scrolls noise over time) and offset vector (x/y phase).
- Loop toggle available; smoothing ensures phase wrap-around.
- Defaults mirror After Effects: frequency 1.0, amplitude 0.5, octaves 3, persistence 0.5, lacunarity 2.0.

**Rendering**
- Generate grayscale noise texture per frame via seeded noise functions.
- Evolution speed shifts noise space per frame (e.g., z-axis increment).
- For loop smoothing, ensure total phase shift across frames equals integer multiples of base period.

### 6.4 Particle Physics
**Parameters**
- Origin (x, y) within canvas.
- Particle count (1 – 1000) with size, lifespan (frames), and size randomness toggle with range slider.
- Velocity magnitude with direction angle and randomness scalar.
- Gravity scalar (positive downward) and drag/friction.
- Edge bounce toggle with bounciness (restitution) and friction.
- Seed ensures deterministic spawn order.
- No loop toggle (particles free-running).

**Rendering**
- Simulate particles per frame using Euler integration.
- Remove particles beyond lifespan; optionally respawn if needed to fill timeline (respect seed).
- For ASCII conversion, render particle footprint as filled circle (size) with brightness falloff.
- Provide preview spinner if simulation >120 ms for initial run.

### 6.5 Rain Drops
**Parameters**
- Drop frequency (per second) with randomness.
- Ripple speed, radius growth rate, amplitude decay.
- Drop size base + randomness toggle.
- Interference enabled (waves add when overlapping).
- Loop smoothing ensures first/last frames align by adjusting spawn schedule.

**Rendering**
- For each spawn event, create expanding ripple (Gaussian falloff).
- Combine ripples via additive synthesis with clamped amplitude.
- Smoothing algorithm ensures total ripple field consistent at start & end by precomputing spawn timeline for full loop duration.

---

## 7. Random Seed Handling
- Each generator exposes a "Seed" numeric input with dice button to randomize.
- `generatorsStore` stores seeds per generator and persists across sessions within the current browser session (using same persistence strategy as existing stores if applicable).
- Seed value passed into PRNG used by engines to ensure reproducibility.
- When regenerating preview, same seed yields identical output unless user changes value.

---

## 8. Animation Output & Timeline Integration
- After ASCII frames generated, `applyGenerator` handles two modes:
  - **Append**: Append frames to current animation timeline using `animationStore.importFramesAppend` with generated duration metadata.
  - **Overwrite**: Replace frames starting from current frame using `animationStore.importFramesOverwrite` (replicates Media Import behavior).
- For overwrite, prompt confirm if generated frame count differs from target range.
- After commit, push history entry with action metadata (`type: 'apply_generator'`).
- Generated frames include metadata (seed, generator id, settings snapshot) stored in history for potential undo/redo and future regeneration.

### 8.1 History Integration
Following the pattern established in `MEDIA_IMPORT_HISTORY_INTEGRATION.md`:

**Type Definition** (`src/types/index.ts`):
```typescript
export type HistoryActionType = 
  | 'canvas_edit'
  // ... existing types
  | 'apply_generator';  // NEW

export interface ApplyGeneratorHistoryAction extends HistoryAction {
  type: 'apply_generator';
  data: {
    generatorId: GeneratorId;
    generatorSettings: GeneratorSettings;
    mappingSettings: GeneratorMappingSettings;
    seed: number;
    outputMode: 'overwrite' | 'append';
    
    // Snapshot data for undo/redo
    previousFrames: Frame[];
    previousCurrentFrame: number;
    newFrames: Frame[];
    newCurrentFrame: number;
    generatedFrameCount: number;
  };
}

// Add to union type
export type AnyHistoryAction = 
  | CanvasHistoryAction
  // ... existing types
  | ApplyGeneratorHistoryAction;
```

**History Processing** (`src/hooks/useKeyboardShortcuts.ts`):
```typescript
case 'apply_generator': {
  const generatorAction = action as ApplyGeneratorHistoryAction;
  
  if (isRedo) {
    animationStore.replaceFrames(
      generatorAction.data.newFrames,
      generatorAction.data.newCurrentFrame
    );
  } else {
    animationStore.replaceFrames(
      generatorAction.data.previousFrames,
      generatorAction.data.previousCurrentFrame
    );
  }
  break;
}
```

**Implementation in `applyGenerator`**:
```typescript
// Before applying
const previousFrames = cloneFrames(frames);
const previousCurrentFrame = currentFrameIndex;

// Apply generator output
if (outputMode === 'overwrite') {
  importFramesOverwrite(generatedFrames, currentFrameIndex);
} else {
  importFramesAppend(generatedFrames);
}

// After applying
const newFrames = cloneFrames(useAnimationStore.getState().frames);
const newCurrentFrame = useAnimationStore.getState().currentFrameIndex;

// Record history
const historyAction: ApplyGeneratorHistoryAction = {
  type: 'apply_generator',
  timestamp: Date.now(),
  description: `Apply ${generatorId} generator (${generatedFrames.length} frames)`,
  data: {
    generatorId,
    generatorSettings: { ...animationSettings[generatorId] },
    mappingSettings: { ...mappingSettings },
    seed: activeSeed,
    outputMode,
    previousFrames,
    previousCurrentFrame,
    newFrames,
    newCurrentFrame,
    generatedFrameCount: generatedFrames.length
  }
};
pushToHistory(historyAction);
```

---

## 9. Performance & Loading Strategy
- Enforce canvas dimension limits (max 200×100) and frame count limit inherited from `MAX_LIMITS.FRAME_COUNT`.
- Target generation time <200 ms for default settings. For heavier tasks (e.g., 1000 particles), display inline spinner overlay and disable controls until complete.
- Use Web Workers? Not required for MVP but engines structured to allow offloading later (function signatures pure and serializable).
- Debounce parameter changes and reuse cached frames when only mapping tweaks occur.

---

## 10. Accessibility & Styling
- Follow shadcn patterns for buttons, switches, sliders, tabs.
- Tooltips implemented with Radix `Tooltip` components; no `title` attributes.
- Keyboard navigation: ensure focus order matches existing panels, with arrow keys for frame scrubber.
- Provide textual feedback for loop smoothing availability (Particles hide toggle).
- Preview canvas labelled for screen readers with generator name and frame status.

---

## 11. Implementation Steps

### Phase 1 – Foundation ✅ **COMPLETE** (October 28, 2025)
1. ✅ Add generator definitions (`constants/generators.ts`) with Lucide icon names.
2. ✅ Implement `GeneratorsSection.tsx` and integrate into right sidebar next to effects.
3. ✅ Scaffold `generatorsStore.ts` with panel open/close logic and default settings per generator.
4. ✅ Create `GeneratorsPanel.tsx` shell with tabs and footer actions (no preview yet).

**Files Created:**
- `src/types/generators.ts` - Complete type definitions for all generators
- `src/constants/generators.ts` - Generator metadata, icons, and default settings
- `src/stores/generatorsStore.ts` - Full state management (placeholder preview generation)
- `src/components/features/GeneratorsSection.tsx` - Right panel collapsible section
- `src/components/features/GeneratorsPanel.tsx` - Slide-in panel with Animation/Mapping tabs

**Files Modified:**
- `src/components/features/ColorPicker.tsx` - Added GeneratorsSection and GeneratorsPanel

**Status:** All Phase 1 tasks complete. Generators section appears in right panel (collapsed by default). Clicking a generator opens the panel with Animation/Mapping tabs and output mode controls. Preview generation returns placeholder frames.

### Phase 2 – Preview Infrastructure
1. Build `generatorEngine.ts` interface and registry dispatch.
2. Implement `useGeneratorPreview` hook (debounced regeneration + playback control wiring).
3. Create `GeneratorPreviewCanvas.tsx` with playback controls and spinner overlay.
4. Wire panel to trigger preview generation on open/setting changes.

### Phase 3 – Mapping Integration
1. Duplicate mapping UI sections from `MediaImportPanel.tsx` into `MappingTab.tsx` component.
2. Wire mapping settings to `generatorsStore.mappingSettings` (mirrors import store structure).
3. Implement Mapping tab behavior: pause playback on tab enter, apply palettes with live preview, resume on return to Animation tab.
4. Verify palette manager dialogs are accessible and state-compatible.
5. **Note**: Shared component extraction deferred to future refactor to avoid blocking generator implementation.

### Phase 4 – Generator Algorithms
1. Implement radio waves engine with loop smoothing support.
2. Implement turbulent noise engine (Perlin, Simplex, Worley) + After Effects defaults.
3. Implement particle physics engine with size/lifespan/friction/bounce.
4. Implement rain drop engine with interference and loop smoothing.
5. Add unit tests or snapshot tests for deterministic outputs given seed.

### Phase 5 – Timeline Integration & History System
1. Implement `applyGenerator` method with append/overwrite mode handling.
2. Add `ApplyGeneratorHistoryAction` type definition to `src/types/index.ts`.
3. Update `processHistoryAction` in `src/hooks/useKeyboardShortcuts.ts` with `apply_generator` case.
4. Integrate history recording in `applyGenerator` (capture before/after snapshots using `cloneFrames`).
5. Test undo/redo functionality with both append and overwrite modes.
6. Persist seeds and settings via session storage (matching existing store persistence patterns).

### Phase 6 – QA & Docs
1. Manual test matrix covering all generators, append/overwrite modes, mapping adjustments, loop smoothing, seeds, playback controls.
2. Performance smoke tests at canvas limits (200×100, 60 FPS, 10-second duration).
3. Update documentation (`DEVELOPMENT.md`, `COPILOT_INSTRUCTIONS.md`) after implementation per policy.
4. Confirm lint passes and add targeted automated tests where feasible.

---

## 12. Risks & Mitigations
- **Performance spikes** with high particle counts → enforce upper bounds, show spinner when over budget.
- **Preview/cache desync** if mapping state diverges → centralize mapping state and reuse ASCII converter pipeline from import system.
- **Loop smoothing artifacts** → allow user to disable smoothing when not desired (toggle), provide preview to validate.
- **UI duplication divergence** → accepted for MVP; mapping UI duplicated from `MediaImportPanel.tsx` into `MappingTab.tsx`. Future refactor will extract shared components into `src/components/shared/mapping/` directory.

---

## 13. Plan Review & Approval

**Review Completed:** October 27, 2025  
**Reviewer:** Claude (validated against ASCII Motion architecture)  
**Status:** ✅ **Approved for Implementation**

### Key Decisions
1. **Output Mode Field:** `outputMode: 'overwrite' | 'append'` (distinct from import terminology)
2. **Preview Architecture:** Single `generatorsStore` + existing `previewStore` (no separate preview store)
3. **Mapping UI Strategy:** Duplicate from `MediaImportPanel.tsx` initially, refactor to shared components in future
4. **History Action Type:** `'apply_generator'` with full before/after snapshots
5. **Primary Action Button:** "Apply Generator"

### Corrections Applied
- Replaced all `appendMode` references with `outputMode`
- Consolidated preview state management into `generatorsStore.uiState`
- Added explicit history integration section (8.1) following `MEDIA_IMPORT_HISTORY_INTEGRATION.md` pattern
- Updated Phase 3 and Phase 5 to reflect UI duplication strategy and complete history implementation
- Clarified UI state shape in `generatorsStore` interface

---

**Next Step:** Proceed with Phase 1 implementation.
