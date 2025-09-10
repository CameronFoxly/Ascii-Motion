# ASCII Motion

A modern web application for creating and animating ASCII art with professional timeline controls and multiple export formats.

![ASCII Motion](https://img.shields.io/badge/status-in%20development-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)

## 🎨 Features

- **Grid-based ASCII Art Editor** - Intuitive character-by-character editing with crisp text rendering
- **Zoom & Navigation** - Zoom controls (25%-400%) with pan and reset functionality
- **Professional Animation Timeline** - Individual frame durations, no duplicate frames needed
- **Onion Skinning** - See previous/next frames with blue/red tinting for smooth animation workflow
- **Comprehensive Tool Set** - Pencil, eraser, paintbucket, selection, rectangle, ellipse, eyedropper, hand tool
- **High-Performance Drawing** - Smooth 60fps drawing with gap-free line interpolation
- **Organized Character Palette** - Characters grouped by style (borders, blocks, arrows, etc.)
- **Multiple Export Formats** - Text files, JSON projects, GIF animations, MP4 videos
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
- [x] Zoom and navigation system (25%-400% zoom, pan controls)
- [x] Character palette interface
- [x] Color picker
- [x] Selection and advanced editing (copy/paste with visual preview)
- [x] Undo/redo functionality
- [x] Keyboard shortcuts (Cmd/Ctrl+C, V, Z, Shift+Z, Alt for temporary eyedropper)
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
- [x] Keyboard shortcuts (Shift+O for onion skinning)

### 📅 Phase 3: Export System (Planned)
- [ ] Text file export
- [ ] JSON project files
- [ ] GIF animation generation
- [ ] MP4 video export

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
