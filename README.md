# ASCII Motion

A modern web application for creating and animating ASCII art with professional timeline controls and multiple export formats.

![ASCII Motion](https://img.shields.io/badge/status-in%20development-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)

## 🎨 Features

- **Grid-based ASCII Art Editor** - Intuitive character-by-character editing
- **Professional Animation Timeline** - Individual frame durations, no duplicate frames needed
- **Comprehensive Tool Set** - Pencil, eraser, paintbucket, selection, rectangle, eyedropper
- **Organized Character Palette** - Characters grouped by style (borders, blocks, arrows, etc.)
- **Multiple Export Formats** - Text files, JSON projects, GIF animations, MP4 videos
- **Modern Architecture** - React 18, TypeScript, Zustand state management

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
- [x] Complete drawing tool suite (pencil, eraser, paint bucket, rectangle, selection, eyedropper)
- [x] Character palette interface
- [x] Color picker
- [x] Selection and advanced editing (copy/paste with visual preview)
- [x] Undo/redo functionality
- [x] Keyboard shortcuts (Cmd/Ctrl+C, V, Z, Shift+Z)
- [x] Performance optimizations and memoization
- [x] Theme system (dark/light mode)

### 📅 Phase 2: Animation System (Planned)
- [ ] Timeline component
- [ ] Frame management
- [ ] Playback controls
- [ ] Frame thumbnails

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
