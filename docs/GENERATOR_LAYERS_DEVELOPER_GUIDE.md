# Generator Layers — Developer Guide

Generators (Radio Waves, Turbulent Noise, Particle Physics, Rain Drops, Digital Rain) are
**procedural layers**. They render live every frame from their settings and keyframe tracks,
like effects and transforms do. Nothing is baked unless the user picks **Bake to frames**.

> This replaces the old preview → "Apply" workflow. These were removed: `generatorsStore`,
> `GeneratorsPanel`, `constants/generators.ts`, `utils/generators/generatorEngine.ts`, and the
> per-generator files under `utils/generators/`. The older documents
> (`GENERATORS_IMPLEMENTATION_PLAN.md`, `DIGITAL_RAIN_GENERATOR_IMPLEMENTATION.md`,
> `GENERATOR_CANVAS_PREVIEW_OPTIMIZATION.md`, `GENERATOR_PREVIEW_RACE_CONDITION_FIX.md`)
> are kept only as history.

## Data model

A generator layer is a normal `Layer` with `kind: 'generator'`, a `generator: GeneratorSource`,
and an empty `contentFrames` list. Its transforms, effects, groups, opacity and blend mode work
the same as on any other layer.

```ts
interface GeneratorSource {
  id: GeneratorSourceId;
  generatorType: string;          // registry id, e.g. 'radio-waves'
  startFrame: number;             // timeline span (replaces the old timing settings)
  durationFrames: number;
  enabled: boolean;
  settings: Record<string, unknown>;     // static values
  propertyTracks: EffectPropertyTrack[]; // keyframes (absolute frames, same type as effects)
}
```

Treat sources as **immutable**: every store action creates a new object. The runtime caches by
object identity.

Sessions are saved as version `2.2.0`. Generator layers serialize `kind` and `generator` through
`utils/generators/generatorSerialization.ts`.

## Registry (`src/registry/generatorRegistry.ts`)

Each generator lives in `src/registry/generators/<name>.ts` and is registered by
`registerAllGenerators()` (called from `main.tsx`). **Tests must call it themselves.**
Shared mapping properties (character, text and background palettes, dithering) are appended
automatically under the `Mapping` category.

Generators output **intensity** (0..1) and **coverage** into an `IntensityBuffer`.
`mapIntensityToCells` (`utils/generators/intensityMapping.ts`) turns that into ASCII cells.

There are two modes:

| Mode | Use when | Contract |
|------|----------|----------|
| `stateless` | Output is a pure function of time (waves, noise) | `render(ctx, settings, phases, out)`. Paths in `phaseProperties` are per-second speeds integrated over time, so keyframed speeds never jump. |
| `simulation` | Output depends on history (particles, rain) | `createState`, `step` (called for every frame from 0), `render`, `cloneState`. Use `frameRng(seed, frame, salt)` so randomness is deterministic. |

`ctx.dt` is `30 / fps`, so simulations tuned at 30 fps keep the same speed at any frame rate.

### Particle origin animation

Particle Physics has keyframeable **Inherit Velocity from Origin** and **Origin Velocity
Influence** controls in the Emitter category. Inheritance is off by default, preserving older
projects. When enabled, the 0–200% slider adds the origin's per-frame movement velocity to
new particles' launch velocity; 100% inherits the full movement, 0% adds none. Existing
particles retain their velocity and respond only to normal physics. A stationary origin
adds no velocity, and the first simulation frame has no previous movement to inherit
(including a burst emitted at the start).

The simulation stores the previous origin in its state and checkpoints, updating it even
when inheritance or emission is off. Displacement is divided by `ctx.dt` to match particle
speed units, keeping inheritance frame-rate independent and deterministic during seeks.

While a particle layer is selected, `ParticleOriginOverlay` shows its current emitter dot
and, when animated, a frame-spaced motion path over the generator span. It shares
`MotionPathDots` with layer transform overlays, including the yellow current-frame highlight
and easing-dependent dot spacing. Coordinates follow layer/group transforms, zoom and pan.
Like transform overlays, it hides during optimized playback and is never baked or exported.

The origin can be moved directly on the canvas. With any drawing tool (which can't draw on
procedural layers), pressing anywhere on the canvas jumps the origin to that cell and drags
it; selection, eyedropper, flip and Alt-eyedropper keep their normal behaviour, but the dot
itself can still be grabbed and dragged without jumping. `canvasPointToParticleOrigin`
inverts layer/group transforms back to layer-local cells. Edits go through
`setGeneratorValueAtFrame` (shared with the properties panel), so animated origins auto-key
at the playhead, and each drag records a single `generator_update` undo entry.

### Adding a generator

1. Create `src/registry/generators/myGenerator.ts`. Use the helpers in `propertyHelpers.ts`
   (`numberProp`, `boolProp`, `seedProp`, `defaultsFromDefinitions`, `n`, `b`).
2. Add it to `registerAllGenerators()` in `src/registry/generators/index.ts`.
3. Add the type to `GeneratorId` in `src/types/generators.ts`.
4. Add it to the `GENERATOR_TYPES` list in `src/__tests__/generators.test.ts`. The shared tests
   then cover determinism, random access versus sequential playback, and animation.

## Runtime (`src/utils/generators/generatorRuntime.ts`)

`renderGeneratorFrame(source, frame, width, height)`:

- resolves settings in this order: defaults, then static `settings`, then keyframe tracks
  (`resolveGeneratorSettings`);
- for stateless generators, uses cached prefix sums of the phase properties;
- for simulation generators, uses a checkpoint every 8 frames plus a forward cursor, so
  sequential playback costs one step per frame and scrubbing replays at most 8 steps from the
  nearest checkpoint;
- keeps an LRU cache of the last 48 rendered frames per source.

`compositeLayersAtFrame` calls `getGeneratorLayerCells` for generator layers. Everything after
that point (transforms, effects, post effects, export, playback precompute, merge visible) is
shared with content layers.

At 200×100, measured costs are about 0.1–7 ms per frame during sequential playback and about
1–9 ms for a cold render at frame 300.

## Store (`timelineStore`)

These actions are wrapped for undo by `utils/generators/generatorHistory.ts`
(`withGeneratorHistory`, `addGeneratorLayerWithHistory`, `bakeGeneratorLayerWithHistory`):

- `addGeneratorLayer`, `setGeneratorSource`, `updateGeneratorSettings`, `updateGeneratorTiming`
- `toggleGeneratorEnabled`, `resetGeneratorSettings`, `randomizeGeneratorSeed`
- `addGeneratorPropertyTrack`, `removeGeneratorPropertyTrack`
- `add`/`remove`/`updateGeneratorKeyframe`
- `selectGeneratorLayer`, `bakeGeneratorLayer`

Selection is UI state and does not add history. Source edits, property-track changes,
keyframe edits (including easing, looping, paste and duplication), timing and baking
are undoable through both keyboard shortcuts and canvas action buttons. Numeric
scrubs record one before/after snapshot per drag rather than one entry per mouse move.

The generic keyframe actions (`addKeyframe`, `moveKeyframe`, `updateKeyframe`, `removeKeyframe`)
also find generator tracks. That is how the shared keyframe diamonds, marquee selection, easing
editor and keyframe editor panel work on them.

These rules protect the procedural model:

- `addContentFrame` returns `null` for generator layers, and drawing is blocked with a toast.
- `flattenLayer` ignores generator layers. `mergeVisible` and `trimToWorkArea` handle them
  (merge renders every frame of the span; trim clips the span and keyframes).
- `bakeGeneratorLayer` renders each frame and merges identical neighbouring frames. The layer
  keeps its id, transforms and effects.

## UI

- **Creation:** `GeneratorsSection` (right panel) adds a generator layer spanning the timeline.
- **Timeline:** `GeneratorBlock` shows the span; drag moves it with its keyframes, and the edges
  trim it. Generator property tracks appear under the layer with the same diamonds, navigation
  and context menu as effect tracks. The context menu `generator` kind offers edit, enable,
  randomize seed, reset, and bake.
- **Properties:** `GeneratorPropertiesPanel` edits settings by category. The diamond next to each
  property adds or removes a keyframe at the current frame, creating the track if needed.

### Palette mapping and reusable editors

All generators select character palettes with `mapping.characterPaletteId`, just as text
and background mappings select color palettes. Palette buttons open `PaletteEditorDialog`,
which embeds the existing character/color mapping editors in palette-only mode. Creation,
editing, ordering, management, import/export, and nested pickers remain available without
changing media-import mapping settings.

The reusable dialog takes `open`, `onOpenChange`, `kind: 'character' | 'color'`, `paletteId`,
`onPaletteChange`, and an optional `title`. The consumer owns palette selection; the dialog
edits the shared library. Editing a preset creates a custom copy. Custom-library mutations
inside the dialog record `palette_edit` history; generator palette selections use normal
generator history and auto-keying.

The dialog is non-modal: it has no dimming overlay, ignores outside clicks (close with Escape,
the X button, or Done), and can be dragged by its title bar so the canvas stays visible and
updates live while palettes are edited.
`mapping.reverseCharacterIndex`, `mapping.reverseTextColorIndex`, and
`mapping.reverseBackgroundColorIndex` are boolean, hold-interpolated properties shown only
for **by-index** mapping. They reverse the lookup order, not the intensity, and never mutate
the shared palette. Palette selections are also hold-interpolated and keyframeable.

Character/color library changes invalidate mapped output and trigger recompositing, while
retaining simulation checkpoints. New generators use the `minimal-ascii` character palette.
For compatibility, old settings retain their inline `mapping.characterSet` (including its
keyframes) until a character palette is selected. Opening the legacy character editor
selects an equivalent existing palette or creates one from those characters.
