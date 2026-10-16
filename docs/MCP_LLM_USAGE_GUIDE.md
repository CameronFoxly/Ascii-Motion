# ASCII Motion MCP - LLM Best Practices Guide

This guide documents learned patterns for effectively using the ASCII Motion MCP tools. It can be exposed as an MCP Resource (`guide://llm-best-practices`) so LLMs can access it during tool invocation.

---

## 🎯 Critical Rule: Always Inspect Before Animating

Before placing ANY animated elements (circles, indicators, data flow particles), you MUST:

1. **Get the exact canvas layout** using `get_canvas_ascii` 
2. **Inspect specific regions** using `get_canvas_preview` with a region parameter
3. **Identify exact coordinates** of connection lines, boxes, and text

### Why This Matters

ASCII diagrams use box-drawing characters (`│`, `─`, `┬`, `┼`, `▼`, etc.) at specific x,y coordinates. Animated elements like data flow particles (`●`, `○`) must be placed EXACTLY on these coordinates, not approximated.

**Wrong approach:**
```
"I'll place a circle at approximately x=15, y=10 where the line should be"
```

**Correct approach:**
```
1. Call get_canvas_preview with region around the connection area
2. Find cells with char="│" or char="─" 
3. Use those exact x,y coordinates for animation
```

---

## 📍 Coordinate Discovery Workflow

### Step 1: Get Overall Layout
```json
{
  "tool": "get_canvas_ascii",
  "params": { "frameIndex": 0 }
}
```
This shows the full diagram as text. Identify areas of interest.

### Step 2: Inspect Specific Regions
```json
{
  "tool": "get_canvas_preview",
  "params": {
    "frameIndex": 0,
    "region": { "x": 10, "y": 10, "width": 40, "height": 15 },
    "maxCells": 200
  }
}
```
This returns exact cell data with coordinates:
```json
{"x": 12, "y": 11, "char": "│", "color": "#00CCFF"},
{"x": 27, "y": 12, "char": "┬", "color": "#00CCFF"},
{"x": 27, "y": 13, "char": "│", "color": "#00CCFF"}
```

### Step 3: Map the Data Flow Path
From the preview, extract coordinates for:
- **Vertical pipes**: `│` characters - data flows down these
- **Horizontal pipes**: `─` characters - data flows across these  
- **Junctions**: `┬`, `┴`, `├`, `┤`, `┼` - data merges/splits here
- **Arrows**: `▼`, `▲`, `◀`, `▶` - data direction indicators
- **Box corners**: `┌`, `┐`, `└`, `┘` - component boundaries

---

## 🔄 Frame Insertion Order

**Critical**: When using `copy_frame_and_modify` multiple times, frames are inserted at index 1 (after current frame). This means:

```
Frame 0: Base (original)
Call copy_frame_and_modify → creates Frame 1
Call copy_frame_and_modify → creates Frame 1 (pushes previous to index 2)
Call copy_frame_and_modify → creates Frame 1 (pushes previous to index 3)
...
```

**Result**: Frames end up in REVERSE order!

If you create frames for steps 1→2→3→4→5, the final order will be:
- Index 0: Base
- Index 1: Step 5 (last created)
- Index 2: Step 4
- Index 3: Step 3
- Index 4: Step 2
- Index 5: Step 1 (first created)

**Solutions:**
1. Create frames in reverse order (step 5 first, step 1 last)
2. Or accept reverse order - animation loops anyway
3. Or use `atIndex` parameter if available to insert at specific position

---

## 🎨 Animation Element Placement

### Status Indicators
Place indicators INSIDE component boxes or AT connection endpoints:

```
Good positions:
┌──────────┐
│ SERVICE  │
│  STATUS: ●   ← Inside the box, after label
└──────────┘

┌──────────┐
│ SERVICE  │ ●  ← Adjacent to box edge
└──────────┘
```

### Data Flow Particles
Place particles EXACTLY on connection characters:

```
     │         ← particle at this │ position
     ●         ← particle replaces │ temporarily
     │
     ▼
```

### Braille Loader Spinner
Use this character sequence for smooth rotation:
```
⠋ → ⠙ → ⠹ → ⠸ → ⠼ → ⠴ → ⠦ → ⠧ → ⠇ → ⠏ (loop)
```

Unicode values:
- `⠋` = \u280b
- `⠙` = \u2819
- `⠹` = \u2839
- `⠸` = \u2838
- `⠼` = \u283c
- `⠴` = \u2834
- `⠦` = \u2826
- `⠧` = \u2827
- `⠇` = \u2807
- `⠏` = \u280f

---

## 🎭 Color Coding Conventions

Use consistent colors to convey meaning:

| Color | Hex | Meaning |
|-------|-----|---------|
| Cyan | `#00FFFF` | Data in transit / flowing |
| Green | `#00FF00` | Active / OK / Ready |
| Yellow | `#FFFF00` | Processing / Working |
| Orange | `#FF6600` | Receiving data / Attention |
| Magenta | `#FF00FF` | Data at key junction |
| Gray | `#444444` | Inactive / Standby / Dimmed |
| White | `#FFFFFF` | Neutral / Default |

---

## 🔧 Tool Activation

Tools are organized into categories that may need activation:

| Category | Activation Tool | Tools Included |
|----------|-----------------|----------------|
| Canvas editing | `activate_canvas_editing_tools` | set_cell, get_cell, clear_cell, get_canvas_ascii, get_canvas_preview, paste_ascii_block, fill_region |
| Animation | `activate_animation_editing_tools` | add_frame, copy_frame_and_modify, delete_frame, list_frames, set_frame_duration, duplicate_frame |
| Project | `activate_project_management_tools` | new_project, save_project, load_project, get_project_info |
| Selection | `activate_selection_tools` | select_rectangle, select_by_color, clear_selection |
| Colors | `activate_color_management_tools` | batch_recolor, get_color_stats |
| Canvas resize | `activate_canvas_summary_and_resizing` | resize_canvas, get_canvas_summary |

If a tool returns "disabled", call the appropriate activation function.

---

## 📝 Complete Animation Workflow Example

### Task: Create a technical diagram with animated data flow

```
Step 1: Create project
  → new_project(name="My Diagram", width=60, height=30)

Step 2: Draw the diagram
  → paste_ascii_block(text="...", x=0, y=0, color="#00CCFF")

Step 3: Inspect the layout
  → get_canvas_ascii() 
  → Review the output, identify connection line areas

Step 4: Get exact coordinates
  → get_canvas_preview(region={x:10, y:10, width:40, height:15})
  → Note coordinates of │, ─, ┬, ▼ characters

Step 5: Add base indicators  
  → set_cell(x=17, y=29, char="●", color="#00FF00")  // Use exact coords!
  → set_cell(x=30, y=19, char="⠋", color="#FFFF00")  // Braille loader

Step 6: Create animation frames (in reverse order for correct playback)
  → copy_frame_and_modify(sourceIndex=0, name="Final", modifications=[...])
  → copy_frame_and_modify(sourceIndex=0, name="Step 3", modifications=[...])
  → copy_frame_and_modify(sourceIndex=0, name="Step 2", modifications=[...])
  → copy_frame_and_modify(sourceIndex=0, name="Step 1", modifications=[...])

Step 7: Verify
  → describe_animation()
  → list_frames()
```

---

## ⚠️ Common Mistakes to Avoid

1. **Guessing coordinates** - Always inspect first
2. **Placing elements off the connection lines** - They look disconnected
3. **Forgetting frame order reversal** - Animation plays backwards
4. **Using wrong braille sequence** - Spinner looks jerky
5. **Not activating tool categories** - Tools fail silently
6. **Placing indicators in empty space** - Should be inside/adjacent to boxes
7. **Inconsistent colors** - Confuses the visual meaning
8. **Not checking cell contents before modifying** - May overwrite important characters

---

## 🔗 Exposing This as an MCP Resource

To make this guide available to LLMs during tool invocation, add it as an MCP resource:

```typescript
// In the MCP server's resource registration:
server.registerResource({
  uri: "guide://llm-best-practices",
  name: "LLM Usage Best Practices",
  description: "Learned patterns and best practices for effectively using ASCII Motion MCP tools",
  mimeType: "text/markdown",
  async read() {
    // Return this document's contents
    return {
      contents: [{
        uri: "guide://llm-best-practices",
        mimeType: "text/markdown",
        text: LLM_BEST_PRACTICES_GUIDE  // The content of this file
      }]
    };
  }
});
```

LLMs can then request this resource before starting complex tasks:
```json
{
  "method": "resources/read",
  "params": { "uri": "guide://llm-best-practices" }
}
```

---

## 📚 Additional Resources

- `project://state` - Current project state snapshot
- `project://canvas` - Current frame canvas data
- `project://frames` - Frame list with metadata
- `project://ascii` - Plain text ASCII preview
- `guide://llm-best-practices` - This document (when implemented)

---

## ✨ Post Effects MCP Commands

Post effects are GPU-accelerated (WebGL) shader effects applied as a final render pass. Use these commands to manage post effects programmatically.

### `add_post_effect`
Add a new post effect to the timeline.

```json
{
  "type": "add_post_effect",
  "postEffectType": "blur",
  "startFrame": 0,
  "durationFrames": 60,
  "settings": { "radius": 10 }
}
```

Available types: `chromatic-aberration`, `screen-distortion`, `glow`, `blur`

### `remove_post_effect`
Remove a post effect by block ID.

```json
{
  "type": "remove_post_effect",
  "blockId": "<block-id>"
}
```

### `update_post_effect`
Update settings, timing, or enabled state of a post effect.

```json
{
  "type": "update_post_effect",
  "blockId": "<block-id>",
  "settings": { "radius": 20, "intensity": 0.8 },
  "startFrame": 5,
  "durationFrames": 50,
  "enabled": true
}
```

### `set_post_effect_keyframe`
Set a keyframe on a post effect property.

```json
{
  "type": "set_post_effect_keyframe",
  "blockId": "<block-id>",
  "propertyPath": "radius",
  "frame": 30,
  "value": 25
}
```

### `remove_post_effect_keyframe`
Remove a keyframe from a post effect property.

```json
{
  "type": "remove_post_effect_keyframe",
  "blockId": "<block-id>",
  "propertyPath": "radius",
  "frame": 30
}
```

### `list_post_effects`
List all registered post effect types and their properties.

```json
{
  "type": "list_post_effects"
}
```

### `get_post_effect_presets`
Get default presets for all post effect types.

```json
{
  "type": "get_post_effect_presets"
}
```

### Post Effects in State Snapshots

When post effects exist, the `state_snapshot` message includes a `postEffects` array:

```json
{
  "type": "state_snapshot",
  "postEffects": [
    {
      "blockId": "peb-abc123",
      "type": "blur",
      "enabled": true,
      "startFrame": 0,
      "durationFrames": 60,
      "settings": { "radius": 10 }
    }
  ]
}
```

---

## 🌀 Procedural Generator Layers

Generator layers render their content every frame from a generator algorithm plus keyframeable settings (Radio Waves, Turbulent Noise, Particle Physics, Rain Drops, Digital Rain, Animated Text). They have no content frames until baked.

All generator commands use the acknowledged `command_request` → `command_result` channel. Every mutating command records **one** in-app undo entry and fails with a descriptive `error` for an unknown layer, a non-generator layer, an unknown generator type, an unknown property path, or an invalid value. Older app builds reply `Unsupported browser command: <type>`.

Successful results include `applied.currentFrameIndex` and, where relevant:

| Field | Meaning |
|-------|---------|
| `layerId` | Target generator layer |
| `generator` | Full serialized generator source **after** the change: `{ id, generatorType, startFrame, durationFrames, enabled, settings, propertyTracks: [{ id, propertyPath, keyframes: [{ id, frame, value, easing }], loopKeyframes }] }` (omitted after bake) |
| `layer` | Layer serialized like `state_snapshot.layers[]` (add and bake) |
| `trackId` / `keyframeIds` | Track and keyframe ids from `set_generator_keyframes` (ids in input order) |
| `generatorCatalog` | Result of `get_generator_catalog` |
| `resolvedSettings` | Result of `get_generator_state` |
| `generatorFrames` | Result of `render_generator_frames` |

### Recommended workflow

1. `get_generator_catalog` to discover types, property paths, value types, ranges, options and visibility rules.
2. `add_generator_layer` with the initial `settings`.
3. Animate with `set_generator_keyframes` (or `set_generator_property` at a `frame`).
4. Verify with `render_generator_frames` (plain-text preview) or `get_generator_state`.
5. Only `bake_generator_layer` when hand-editing the output is required — baking is permanent apart from undo.

### `get_generator_catalog`
Non-mutating. Returns `applied.generatorCatalog[]`: `{ type, name, description, mode, properties, defaultSettings, initialSettings }`. Each property includes `path, displayName, category, valueType, defaultValue, interpolation, min, max, step, unit, control, options, visibleWhen, visibleWhenAll`. `initialSettings` are what a new layer gets on the current canvas (e.g. centered positions).

### `add_generator_layer`
```json
{ "type": "add_generator_layer", "generatorType": "turbulent-noise", "name": "Clouds", "startFrame": 0, "durationFrames": 48, "settings": { "baseFrequency": 0.2 } }
```
The layer is inserted above the active layer and becomes active. `durationFrames` defaults to the rest of the timeline; the timeline grows to fit. Returns `layerId`, `layer`, `generator`.

### `update_generator_layer`
```json
{ "type": "update_generator_layer", "layerId": "<id>", "settings": { "speed": 2 }, "startFrame": 12, "durationFrames": 24, "shiftKeyframes": true, "enabled": true, "name": "Storm" }
```
`settings` is a shallow merge into the static values (keyframed properties still follow their tracks). `shiftKeyframes` (default `false`) moves all keyframes by the start-frame delta.

### `set_generator_property`
```json
{ "type": "set_generator_property", "layerId": "<id>", "propertyPath": "baseFrequency", "value": 0.4, "frame": 10 }
```
Behaves like editing in the properties panel at `frame` (default: playhead): updates the keyframe at that frame, adds a keyframe if the property is already animated, otherwise sets the static value.

Animated Text specials:
- `typewriter.units` (`percent` ↔ `index`) converts the existing start/end values and keyframes.
- Setting `effect` to `typewriter` also keyframes `typewriter.end` 0 → 100 across the span (unless End is already keyed). Pass `"applyEffectDefaults": false` to skip.

### `set_generator_keyframes`
```json
{
  "type": "set_generator_keyframes", "layerId": "<id>", "propertyPath": "baseFrequency",
  "keyframes": [ { "frame": 0, "value": 0.1, "easing": "ease-in-out" }, { "frame": 24, "value": 0.6 } ],
  "replace": false, "loop": true
}
```
Creates the track if needed. A keyframe at an existing frame replaces it. `replace: true` clears the track first. `easing` is a preset (`linear`, `hold`, `ease-in`, `ease-out`, `ease-in-out`, `ease-out-back`, `ease-in-back`, `bounce`) or `{ "type": "custom", "x1", "y1", "x2", "y2" }`. `loop` toggles keyframe looping. Only paths listed in the catalog `properties` are keyframeable.

### `remove_generator_keyframes`
```json
{ "type": "remove_generator_keyframes", "layerId": "<id>", "propertyPath": "baseFrequency", "frames": [24] }
```
Match by `frames` and/or `keyframeIds`, or pass `"clearTrack": true`. When the track is cleared (or every keyframe is removed) the value at `frame` (default: playhead) becomes the static setting.

### `reset_generator` / `randomize_generator_seed`
```json
{ "type": "reset_generator", "layerId": "<id>" }
{ "type": "randomize_generator_seed", "layerId": "<id>", "frame": 0 }
```
Reset restores defaults and removes all keyframes (seed kept). Randomize sets a new seed (keyed at `frame` if `seed` is animated); generators without a seed return an error.

### `get_generator_state`
```json
{ "type": "get_generator_state", "layerId": "<id>", "frame": 12 }
```
Non-mutating. `applied.resolvedSettings` holds every setting evaluated at `frame` (defaults ← static ← keyframes).

### `render_generator_frames`
```json
{ "type": "render_generator_frames", "layerId": "<id>", "frames": [0, 12, 24], "includeCells": false }
```
Non-mutating, max 60 frames. Renders the generator source only (no layer transforms, opacity or effects). Each entry: `{ frame, inRange, text, cellCount, cells? }` where `text` is one string per canvas row with spaces for empty cells, and `cells` (when requested) is `[{ x, y, char, color, bgColor }]`.

### `bake_generator_layer`
```json
{ "type": "bake_generator_layer", "layerId": "<id>" }
```
Converts the layer into regular content frames (identical consecutive frames are merged). Returns `layerId` and the baked `layer`; no `generator`.

### Generators in State Snapshots

Generator layers appear in `state_snapshot.layers[]` with `"kind": "generator"` and a `generator` object in the same serialized shape as `applied.generator`, and an empty `contentFrames` array.
