# OpenTUI Test CLI

Test harness for ASCII Motion OpenTUI component exports.

> **Note:** OpenTUI is designed for [Bun](https://bun.sh). Install Bun first: `curl -fsSL https://bun.sh/install | bash`

## Setup

```bash
bun install
```

Run `bun run test` to verify that an exported animation renders and plays.

## Usage

1. Export an animation from ASCII Motion using **"OpenTUI Component"** export
2. Copy the exported `.tsx` file into the `src/` directory
3. Update `src/cli.tsx`:
   - Update the import statement
   - Replace the component with your exported component
4. Run the animation:

```bash
bun run dev
```

## Component Props

Exported components accept these props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `hasDarkBackground` | `boolean` | `true` | Use dark theme colors |
| `autoPlay` | `boolean` | `true` | Start playing automatically |
| `loop` | `boolean` | varies | Loop the animation |
| `onReady` | `(api) => void` | - | Callback with playback controls |

## Playback API

If the component was exported with "Include playback controls API" enabled:

```tsx
import { AsciiMotionTui } from './ascii-motion-tui';

createRoot(renderer).render(
  <AsciiMotionTui
    onReady={(api) => {
      // Control playback programmatically
      api.play();
      api.pause();
      api.restart();
    }}
  />
);
```

## Theme Customization

Exported components include color theme dictionaries:

**ANSI mode:**
```tsx
const THEME_DARK = { cyan: 'cyan', magenta: 'magenta', ... };
const THEME_LIGHT = { cyan: 'blue', magenta: 'red', ... };
```

**Hex mode:**
```tsx
const COLORS_DARK = { c0: '#00ffff', c1: '#ff00ff', ... };
const COLORS_LIGHT = { c0: '#006666', c1: '#660066', ... };
```

Edit these dictionaries in your exported component to customize colors for each background type.

## Dependencies

- `@opentui/core` - Core OpenTUI renderer
- `@opentui/react` - React bindings for OpenTUI
- `react` - React library

## Links

- [OpenTUI Documentation](https://opentui.com)
- [ASCII Motion](https://ascii-motion.app)
