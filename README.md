# ASCII Motion

![ASCII Motion](https://img.shields.io/badge/status-in%20development-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)

A web app for creating and animating ASCII/ANSI art. 

Current deployed version:
https://ascii-motion.vercel.app

<img width="2594" height="1702" alt="Screenshot of the ASCII Motion App" src="https://github.com/user-attachments/assets/c3b54321-ffe1-42e1-a412-f425995274c5" /></br>

## 🎨 Current Features

- **Grid-based ASCII Art Editor with full drawing toolset** 
- **Animation Timeline for frame-by-frame editng and onion skinning** 
- **Custom Color and Character Palettes** - including presets and import/export features**
- **Import images or video** - Convert external assets to ASCII art, with fine tuned rendering control
- **Multiple Export Formats** - Images, Videos, Text files, and full session export. 

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

### Build
```bash
npm run build
```

## 🚀 Deployment

Deployment to Vercel with automated versioning.

<details>
  <summary>Available Deployment Commands</summary>

| Command | Version Increment | Use Case |
|---------|------------------|----------|
| `npm run deploy` | **Patch** (0.1.23 → 0.1.24) | Bug fixes, small updates, content changes |
| `npm run deploy:major` | **Minor** (0.1.23 → 0.2.0) | New features, significant improvements |
| `npm run deploy:preview` | **None** | Testing deployments, preview branches |

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
</details>


## 🏗️ Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Shadcn/ui** - UI components
- **Zustand** - State management
- **Lucide React** - Icons


## 🏛️ Architecture

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

## 📋 Development Status

This is currently maintained entirely by me, an animator and brand designer with next to no experience with building tools. This has been vibe-coded into existence using GitHub Copilot in VScode, using mostly Claude Sonnet 4, with the occaisional GPT-5 when Claude gets stumped. Please forgive any messy or unusal structure or vibe-code artifacts, I'm trying my best!

Where I'm at with the concept:
<details>
<summary> ✅ Phase 1: Foundation & Core Editor (Complete) </summary>
   
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
      
</details>

<details>
   
<summary> ✅ Phase 2: Animation System (Complete) </summary>

- [x] Timeline component with frame management
- [x] Playback controls with variable speed
- [x] Frame thumbnails with visual indicators
- [x] Onion skinning with performance caching
- [x] Animation state management and synchronization
- [x] Keyboard shortcuts (Shift+O for onion skinning, Ctrl+N for new frame, Ctrl+D for duplicate frame, Ctrl+Delete/Backspace for delete frame)
</details>

<details>
<summary> ✅ Phase 3: Export/Import System (Complete) </summary>
- [x] High-DPI PNG image export with device pixel ratio scaling
- [x] Complete session export/import (.asciimtn files)
- [x] Typography settings preservation (font size, spacing)
- [x] Professional export UI with format-specific dialogs
- [x] Robust error handling and validation
- [x] Import video/image files and convert to ascii
</details>


<details>
<summary> 📅 Phase 4: Advanced Tools (Next) </summary>
- [ ] Custom brush system with pattern creation
- [x] Advanced color palettes beyond ANSI
- [x] Re-color brush (change colors without affecting characters)
- [x] **Gradient fill tool** ✅ **COMPLETE** - Linear/radial gradients with interactive controls
- [ ] Figlet text system
- [ ] Draw boxes and tables with ascii characters
</details>

<details>
<summary> 🧪 Phase 5: Testing and bug bashing </summary>
   
- [ ] FIX ALL THE BUGS!!!
- [ ] Sweeten tool set with quality of life improvements
- [ ] Address accessibilty issues
</details>

<details>
<summary> 💸 Phase 5: Setup database and auth </summary>
   
- [ ] Set up database for user account creation and project saving
- [ ] Version history for projects
- [ ] Profit?
 </details>

## 📖 Documentation

- **[Product Requirements Document](./PRD.md)** - Complete feature specifications
- **[Development Guide](./DEVELOPMENT.md)** - Setup and project structure
- **[Copilot Instructions](./COPILOT_INSTRUCTIONS.md)** - Development guidelines
- **[Technical Documentation](./docs/)** - Comprehensive implementation guides, plans, and feature documentation
- **[Development Tools](./dev-tools/)** - Test scripts and debugging utilities

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ for the ASCII art community
