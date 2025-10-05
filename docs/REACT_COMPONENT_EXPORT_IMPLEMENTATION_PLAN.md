# React Component Export Feature - Implementation Plan

**Date**: October 4, 2025  
**Feature**: React Component Export for ASCII Motion Animations  
**Integration**: New export modality in existing Export system

---

## 📋 Overview

Introduce an export format that outputs a self-contained React component capable of rendering the current ASCII Motion animation on a canvas element. The component should optionally include built-in playback controls, support TypeScript typings, and respect the canvas background color based on user choice. The export dialog must provide a manual filename field, deliver copyable usage instructions, and download either a `.jsx` or `.tsx` file.

### Key Requirements
- ✅ Manual filename input with automatic extension handling (`.jsx` / `.tsx`)
- ✅ Toggle for TypeScript vs. JavaScript output
- ✅ Toggle to include or omit playback controls within the exported component
- ✅ Toggle to include or omit the canvas background color
- ✅ Copy-friendly import/usage snippet with basic integration steps
- ✅ Component encapsulates frame data and rendering logic without external dependencies
- ✅ Downloaded file plays the animation automatically and loops by default

## ✅ Implementation Snapshot (2025-10-05)

- Added `exportReactComponent` plus helper utilities (`sanitizeReactFileName`, `toPascalCase`, `generateReactComponentCode`) inside `ExportRenderer` to produce type-safe JSX/TSX output with optional controls/background wiring.
- Dialog wiring (`ReactExportDialog`) now feeds sanitized filenames, manual usage snippet, and toggle preferences into the renderer, aligning with the plan’s state/store updates.
- Generated components default to `'use client'`, embed animation frames, and expose play/restart controls when requested while remaining dependency-free.

---

## 🏗️ Architecture Integration

### Export System Flow
```
User selects “React Component” in Export dropdown → ReactExportDialog → React export settings in Zustand store → ExportRenderer.exportReactComponent() → File download (.jsx/.tsx)
```

### Touchpoints
1. **Types** (`src/types/export.ts`)
   - Add `'react'` to `ExportFormatId`
   - Introduce `ReactExportSettings` with fields: `typescript`, `includeControls`, `includeBackground`, `componentName` (derived), `fileName`
   - Extend `ExportSettings` union and `ExportState` definition

2. **Store** (`src/stores/exportStore.ts`)
   - Provide default `ReactExportSettings` and corresponding setter `setReactSettings`
   - Ensure modal reset logic handles new format cleanly

3. **UI**
   - `ExportImportButtons.tsx`: add “React Component” option
   - `ReactExportDialog.tsx` (new): UI for settings, filename input, instructions with copy button, export trigger
   - `App.tsx`: include dialog within providers

4. **Renderer** (`src/utils/exportRenderer.ts`)
   - Implement `exportReactComponent(data, settings, filename)`
   - Generate component code string using collected animation data
   - Invoke `saveAs` with correct extension and MIME type

5. **Utilities** (if needed)
   - Filename sanitization helper (shared inside dialog)
   - Component name derivation from filename (PascalCase fallback to `AsciiMotionAnimation`)

---

## 🧱 Component Output Design

### File Structure (generated string)
```tsx
import React, { useEffect, useRef, useState } from 'react';

type Frame = {
  duration: number;
  cells: Array<{ x: number; y: number; char: string; color: string; bgColor?: string }>;
};

const frames: Frame[] = [...];

export const MyAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  // ...render + playback logic
};
```

### Rendering Strategy
- Precompute `frames` array containing only populated cells to minimize payload
- On `useEffect`, draw cells on a `<canvas>` context each frame
- Use `requestAnimationFrame` loop to handle playback; honor original frame durations
- If `includeControls` is false, omit state and controls; auto-play and loop
- If `includeBackground` is false, clear canvas to transparent each frame; otherwise fill background before drawing

### TypeScript Toggle
- When `typescript = true`: include type definitions (`Frame`, `CellData`, props typing) and use `.tsx`
- When false: omit explicit types, use `.jsx` output and `useState` default generics

### Playback Controls Toggle
- Include UI with Play/Pause button and timeline indicator
- Without controls, component plays and loops silently

### Background Toggle
- When enabled, fill canvas with exported background color each frame
- When disabled, call `clearRect` without fill for transparency

---

## ⚙️ Export Dialog Specifications (`ReactExportDialog.tsx`)

### Layout Elements
1. **Filename Input**
   - Text input with live sanitization (allow letters, numbers, hyphen, underscore)
   - Badge showing auto-selected extension (`.jsx` / `.tsx`)

2. **Settings Card**
   - TypeScript Switch (`typescript`)
   - Playback Controls Switch (`includeControls`)
   - Include Background Switch (`includeBackground`)

3. **Import Instructions Card**
   - Display dynamic component name and file name
   - Provide copy button for snippet:
     ```tsx
     import MyAnimation from './MyAnimation';

     function App() {
       return <MyAnimation />;
     }
     ```
   - Bullet list describing required steps (download → place file → import)

4. **Export Summary**
   - Frame count, canvas size, total duration

5. **Actions**
   - Cancel and Export buttons (mirroring other dialogs)

### Dialog Behavior
- Disabled state during export with spinner feedback
- Validation: require non-empty filename; show inline hint if sanitized value is empty
- Reset settings when modal closes (via store reset)

---

## 🔄 ExportRenderer Implementation Plan

1. **Frame Compression**
   - Iterate current frame data map to gather non-empty cells with coordinates and colors
   - Build `frames` array capturing `duration` and `cells`

2. **Code Generation**
   - Template string with placeholders for:
     - Component name
     - Frame data JSON (`JSON.stringify` with indentation)
     - Canvas dimensions, typography metrics (font size, spacing), background color
     - TypeScript-specific code (conditional blocks)
     - Optional controls markup and logic

3. **Animation Loop**
   - Use `requestAnimationFrame` to advance frame timer
   - On each frame draw, clear/fill canvas, render backgrounds, draw characters with `fillText`
   - Honor `frame.duration` based on export data (ms)
   - Loop to first frame after final frame

4. **Download**
   - Determine extension based on `typescript`
   - Create `Blob` with `type: 'text/plain;charset=utf-8'`
   - Call `saveAs(blob, fileNameWithExtension)`

5. **Error Handling**
   - Wrap generation in try/catch; surface user-friendly error messages

---

## 📌 Implementation Steps

1. **Types & Store**
   - Update `ExportFormatId`, `ExportSettings`, `ExportState`
   - Create `ReactExportSettings`
   - Add defaults and setter in `exportStore`

2. **UI Wiring**
   - Add menu option in `ExportImportButtons`
   - Create `ReactExportDialog.tsx` using shadcn components
   - Register dialog in `App.tsx`

3. **Renderer Logic**
   - Implement `exportReactComponent`
   - Add helper functions within renderer (e.g., `generateReactComponentCode`)

4. **Instructions & Copy Utilities**
   - Implement copy-to-clipboard with feedback similar to palette export dialogs

5. **Manual Filename Support**
   - Sanitize input (allow letters, numbers, hyphen, underscore)
   - Derive component name via PascalCase conversion

6. **Testing**
   - Manual export scenarios: TypeScript/JS variants, controls on/off, background on/off
   - Validate downloaded file renders in a CRA/Vite sandbox

7. **Documentation Updates**
   - `COPILOT_INSTRUCTIONS.md`: add new export guidelines and triggers
   - `DEVELOPMENT.md`: note new export format and default behavior
   - `docs/README.md`: link to this plan and summarize feature

---

## ✅ Testing & Validation Checklist
- [ ] Export TypeScript component, import into sample React TS app, verify animation and controls
- [ ] Export JavaScript component, import into React JS app, verify playback
- [ ] Background toggle respects transparent canvas when disabled
- [ ] Controls toggle hides UI and auto-plays animation
- [ ] Filename sanitization prevents invalid characters and preserves user intent
- [ ] Instructions copy button places snippet on clipboard
- [ ] `npm run build` succeeds after changes

---

## 📚 Documentation Updates
- `COPILOT_INSTRUCTIONS.md` → Add React export requirements to documentation protocol and export system summaries
- `DEVELOPMENT.md` → Mention availability of React component export and its configuration options
- `docs/README.md` → Reference this implementation plan
- Consider brief user-facing mention in main `README.md` if scope allows

---

## 🧾 Definition of Done
- All code paths implemented and passing TypeScript compile/build
- Dialog UX matches established shadcn patterns
- Exported components run without modification in React 18 apps
- Documentation updates merged
- Plan updated/annotated with any deviations (if necessary)
- Verification checklist executed with notes recorded in PR/commit message

---

## 🔍 Open Questions
- Should component expose props for overriding playback speed or auto-play? *(Default: no, keep minimal)*
- Do we need a preview inside the dialog? *(Out of scope for first iteration)*
- Should we enable custom component names separate from filename? *(Derived from filename for now; revisit if needed)*
