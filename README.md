# ASCII Motion

A modern web application for creating and animating ASCII art with professional timeline controls and multiple export formats.

![ASCII Motion](https://img.shields.io/badge/status-in%20development-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)

## 🎨 Features

- **Grid-based ASCII Art Editor** - Intuitive character-by-character editing with crisp text rendering
- **Zoom & Navigation** - Zoom controls (20%-400%) with pan and reset functionality, hotkeys + and - for zoom
- **Professional Animation Timeline** - Individual frame durations, no duplicate frames needed
- **Onion Skinning** - See previous/next frames with blue/red tinting for smooth animation workflow
- **Comprehensive Tool Set** - Pencil, eraser, paintbucket, selection, rectangle, ellipse, eyedropper, hand tool
- **High-Performance Drawing** - Smooth 60fps drawing with gap-free line interpolation
- **Organized Character Palette** - Characters grouped by style (borders, blocks, arrows, etc.)
- **Multiple Export Formats** - High-DPI PNG images, complete session files (.asciimtn), with typography preservation
- **Modern Architecture** - React 18, TypeScript, Zustand state management
- **Performance Monitoring** - Real-time performance metrics and optimization tools

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
git clone https://github.com/cameronfoxly/Ascii-Motion.git
cd Ascii-Motion
npm install
```

### Development
```bash
npm run dev
```

Visit `http://localhost:5173` to see the application.

### Performance Testing
To monitor rendering performance:
1. Press **Ctrl+Shift+P** to toggle the performance overlay
2. Watch metrics while drawing:
   - **Green render times** (<16ms) = Optimal performance
   - **High FPS** (50-60) = Smooth experience
   - **Efficiency: Excellent/Good** = Well optimized
3. Test scenarios:
   - Rapid pencil drawing across canvas
   - Fast erasing with quick movements
   - Large selection operations

### Build
```bash
npm run build
```

## 🚀 Deployment

ASCII Motion is configured for seamless deployment to Vercel with automated versioning.

### Available Deployment Commands

| Command | Version Increment | Use Case |
|---------|------------------|----------|
| `npm run deploy` | **Patch** (0.1.23 → 0.1.24) | Bug fixes, small updates, content changes |
| `npm run deploy:major` | **Minor** (0.1.23 → 0.2.0) | New features, significant improvements |
| `npm run deploy:preview` | **None** | Testing deployments, preview branches |

### Deployment Workflow

Each deployment automatically:
1. **📈 Increments version number** based on deployment type
2. **📝 Collects commit messages** since last version for changelog
3. **🏗️ Runs full build** with linting and type checking
4. **🏷️ Creates git tag** for the new version
5. **🚀 Deploys to Vercel** with optimized settings
6. **✨ Updates version display** visible in the app header

### Version Display

The app displays the current version in the header next to "ASCII MOTION". Clicking the version opens a modal showing:
- Current build information (version, date, git hash)
- Complete version history with commit messages
- Professional changelog for tracking development progress

### Manual Version Commands

For version management without deployment:

```bash
# Increment patch version (0.1.23 → 0.1.24)
npm run version:patch

# Increment minor version (0.1.23 → 0.2.0) 
npm run version:minor

# Increment major version (0.2.15 → 1.0.0)
npm run version:major
```

### Export Metadata

All exported files automatically include version metadata:
- **PNG exports**: Version info embedded in image metadata
- **Video exports**: Version data in file metadata
- **Session files**: Complete version and build information
- **Text exports**: Version comment header

## 🏗️ Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Shadcn/ui** - UI components
- **Zustand** - State management
- **Lucide React** - Icons

## 📋 Development Status

### ✅ Phase 1: Foundation & Core Editor (Complete)
- [x] Project scaffolding and configuration
- [x] State management architecture (Zustand stores: canvas, animation, tools)
- [x] Type definitions and constants
- [x] UI components and styling (Tailwind CSS + shadcn/ui)
- [x] Canvas grid component with full rendering
- [x] Complete drawing tool suite (pencil, eraser, paint bucket, rectangle, ellipse, selection, eyedropper)
- [x] Zoom and navigation system (20%-400% zoom, pan controls, +/- hotkeys)
- [x] Character palette interface
- [x] Color picker
- [x] Selection and advanced editing (copy/paste with visual preview)
- [x] Undo/redo functionality
- [x] Keyboard shortcuts (Cmd/Ctrl+C, V, Z, Shift+Z, Alt for temporary eyedropper, +/- for zoom)
- [x] **High-DPI canvas rendering** - Crisp text quality on all displays
- [x] **Performance optimizations** - 60fps rendering with batched updates
- [x] **Gap-free drawing tools** - Smooth line interpolation for professional drawing
- [x] **Performance monitoring** - Real-time metrics overlay (Ctrl+Shift+P)
- [x] Theme system (dark/light mode)

### ✅ Phase 2: Animation System (Complete)
- [x] Timeline component with frame management
- [x] Playback controls with variable speed
- [x] Frame thumbnails with visual indicators
- [x] Onion skinning with performance caching
- [x] Animation state management and synchronization
- [x] Keyboard shortcuts (Shift+O for onion skinning, Ctrl+N for new frame, Ctrl+D for duplicate frame, Ctrl+Delete/Backspace for delete frame)

### ✅ Phase 3: Export/Import System (Complete)
- [x] High-DPI PNG image export with device pixel ratio scaling
- [x] Complete session export/import (.asciimtn files)
- [x] Typography settings preservation (font size, spacing)
- [x] Professional export UI with format-specific dialogs
- [x] Robust error handling and validation

### 📅 Phase 4: Advanced Tools (Next)
- [ ] Custom brush system with pattern creation
- [ ] Advanced color palettes beyond ANSI
- [ ] Re-color brush (change colors without affecting characters)
- [ ] Pattern brush (apply repeating patterns)
- [ ] Enhanced onion skinning controls

## 🏛️ Architecture

The application follows a clean component architecture with focused state management:

```
src/
├── components/
│   ├── common/         # Shared/reusable components
│   ├── features/       # Complex functional components  
│   ├── tools/          # Tool-specific components
│   └── ui/             # Shadcn UI components
├── stores/             # Zustand state management
├── types/              # TypeScript definitions
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
└── constants/          # App configuration
```

## 📖 Documentation

- **[Product Requirements Document](./PRD.md)** - Complete feature specifications
- **[Development Guide](./DEVELOPMENT.md)** - Setup and project structure
- **[Animation System Guide](./ANIMATION_SYSTEM_GUIDE.md)** - Animation architecture and implementation
- **[Onion Skinning Guide](./ONION_SKINNING_GUIDE.md)** - Complete onion skinning implementation reference
- **[Canvas Text Rendering](./CANVAS_TEXT_RENDERING.md)** - High-DPI text rendering implementation
- **[Performance Optimization](./PERFORMANCE_OPTIMIZATION_PHASE1.md)** - Render batching and optimization strategies
- **[Drawing Gap Fix](./DRAWING_GAP_FIX.md)** - Line interpolation for smooth drawing tools
- **[Copilot Instructions](./COPILOT_INSTRUCTIONS.md)** - Development guidelines

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the development guidelines in `COPILOT_INSTRUCTIONS.md`
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Vision

ASCII Motion aims to be the premier tool for creating sophisticated ASCII animations, bringing professional-grade timeline controls and export capabilities to the art of text-based graphics.

---

Made with ❤️ for the ASCII art community
