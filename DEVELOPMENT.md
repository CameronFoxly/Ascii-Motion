# ASCII Motion - Development Setup

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── atoms/          # Basic UI components (Button, Input, etc.)
│   ├── molecules/      # Simple combinations (ToolButton, ColorPicker, etc.)
│   ├── organisms/      # Complex components (Canvas, Timeline, ToolPalette)
│   └── templates/      # Page layouts
├── stores/             # Zustand state management
│   ├── canvasStore.ts  # Canvas data and operations
│   ├── animationStore.ts # Animation timeline and frames
│   ├── toolStore.ts    # Active tools and settings
│   └── projectStore.ts # Project management (to be created)
├── types/              # TypeScript type definitions
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── constants/          # App constants and configurations
└── lib/                # Third-party library configurations
```

## Tech Stack
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Shadcn/ui** - UI components
- **Zustand** - State management
- **Lucide React** - Icons

## Development Phases

### Phase 1: Core Editor ✅ **COMPLETE**
- [x] Project scaffolding
- [x] Basic stores (canvas, animation, tools)
- [x] Type definitions and constants
- [x] Canvas grid component
- [x] Basic drawing tools (pencil, eraser, paint bucket, select, eyedropper, rectangle)
- [x] Character palette
- [x] Color picker
- [x] Tool palette
- [x] Undo/redo functionality
- [x] Basic UI layout with sidebars
- [x] Rectangle drawing tool implementation
- [x] Fill tool (flood-fill algorithm with optimization)
- [x] Selection tool copy/paste functionality
- [x] Keyboard shortcuts (Cmd/Ctrl+C, Cmd/Ctrl+V, Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z)

## Phase 1 Features Summary

### 🎨 Drawing Tools
- **Pencil** ✏️ - Draw individual characters with selected colors
- **Eraser** 🧽 - Remove characters from cells
- **Paint Bucket** 🪣 - Flood fill connected areas with same character/color
- **Rectangle** ▭ - Draw filled or hollow rectangles
- **Eyedropper** 💧 - Pick character and colors from existing artwork

### 🎯 Selection & Editing
- **Selection Tool** ⬚ - Select rectangular areas with dual interaction modes:
  - *Click & Drag*: Start selection and drag to define area
  - *Click to Start/Finish*: Click to start, move mouse to preview, click again to complete
- **Copy/Paste** - Copy selected areas and paste them elsewhere
- **Undo/Redo** - Full history management with 50-action limit

### 🎭 Character & Color Management
- **Character Palette** - Organized character sets (Basic Text, Punctuation, Math/Symbols, Lines/Borders, Blocks/Shading, Arrows, Geometric, Special)
- **Color Picker** - Preset colors and custom color selection for text and background
- **Real-time Preview** - See changes instantly on the canvas

### ⌨️ Keyboard Shortcuts
- `Cmd/Ctrl + C` - Copy selection
- `Cmd/Ctrl + V` - Paste at selection or (0,0)
- `Cmd/Ctrl + Z` - Undo
- `Cmd/Ctrl + Shift + Z` - Redo

### 📐 Canvas Features
- **Configurable Size** - Default 80x24 (terminal size)
- **Grid-based Drawing** - Precise character placement
- **Visual Selection** - Animated selection overlay
- **Real-time Rendering** - Smooth canvas updates

### Phase 2: Animation System
- [ ] Timeline component
- [ ] Frame management
- [ ] Playback controls
- [ ] Frame thumbnails

### Phase 3: Export System
- [ ] Text export
- [ ] JSON project files
- [ ] GIF generation
- [ ] MP4 export

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## State Management

### Canvas Store (`useCanvasStore`)
- Canvas dimensions and cell data
- Drawing operations (set/get/clear cells)
- Fill tool implementation

### Animation Store (`useAnimationStore`)
- Frame management and timeline
- Playback controls
- Frame duration and ordering

### Tool Store (`useToolStore`)
- Active tool and settings
- Selection state
- Undo/redo history

## Next Steps

1. **Implement Canvas Grid**: Create a responsive grid component that displays ASCII characters
2. **Add Drawing Tools**: Implement pencil, eraser, and other basic tools
3. **Character Palette**: Build the organized character selection interface
4. **Timeline UI**: Create the frame timeline with thumbnails
5. **Export Functions**: Implement text and JSON export capabilities

## Contributing

Follow the component structure and Copilot instructions in `COPILOT_INSTRUCTIONS.md` for consistent code organization.
