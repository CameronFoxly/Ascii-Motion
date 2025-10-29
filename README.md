# [ASCII Motion](https://ascii-motion.vercel.app)

![ASCII Motion](https://img.shields.io/badge/status-in%20development-yellow)
![License - Dual](https://img.shields.io/badge/license-MIT%20%2B%20Proprietary-blue)

A web app for creating and animating ASCII/ANSI art. 

Current deployed version:
https://ascii-motion.app

<img width="2610" height="1758" alt="Screenshot of the ASCII Motion app UI" src="https://github.com/user-attachments/assets/e2be1571-c322-4c8f-bdef-10ab01eb9a05" />
</br>


## 🎨 Current Features

- Grid-based ASCII Art Editor with full drawing toolset
- Animation Timeline for frame-by-frame editing and onion skinning
- Custom Color and Character Palettes including presets and import/export features
- Convert images or video assets to ASCII art, with fine-tuned rendering control
- Multiple Export Formats: Images (PNG, JPEG, SVG), Videos (MP4, WebM), Text files, JSON, HTML, and full session export
  
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

## 📦 Project Structure

**This is a monorepo with dual licensing:**

- **`packages/core/`** - Open source core features (MIT License)
  - Canvas editor, drawing tools, animation system
  - Export features (PNG, SVG, GIF, MP4, etc.)
  - All UI components and utilities

- **`packages/premium/`** - Premium features (Proprietary License)
  - User authentication (email-based)
  - Cloud project storage (Supabase)
  - Payment integration (future)

See [docs/MONOREPO_SETUP_GUIDE.md](docs/MONOREPO_SETUP_GUIDE.md) for details.

## 🏛️ Core App Architecture

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

This is currently maintained entirely by me, an animator and brand designer with next to no experience with building tools. This has been vibe-coded into existence using GitHub Copilot in VScode, using mostly Claude Sonnet 4, with the occasional GPT-5 when Claude gets stumped. Please forgive any messy or unusal structure or vibe-code artifacts, I'm trying my best!

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
  
- [x] High-DPI image export (PNG, JPEG, SVG) with device pixel ratio scaling and quality controls
- [x] SVG vector export with text-as-outlines, grid, background, and formatting options
- [x] Complete session export/import (.asciimtn files with custom color & character palettes)
- [x] Typography settings preservation (font size, spacing)
- [x] Export UI with format-specific dialogs
- [x] Import video/image files and convert to ASCII
</details>


<details>
<summary> ✅ Phase 4: Advanced Tools (Next) (complete...for now </summary>
  
- [x] Brush sizing and shape
- [x] Advanced color palettes beyond ANSI
- [x] Re-color brush (change colors without affecting characters)
- [x] Gradient fill tool 
- [x] Figlet text system
- [x] Draw boxes and tables with ascii characters
</details>

<details>
<summary> ✅ Phase 5: Testing and bug bashing </summary>
   
- [x] FIX ALL THE BUGS!!!
- [x] Sweeten tool set with quality of life improvements
- [x] Address accessibilty issues
</details>

<details>
<summary> 💸 Phase 6: Setup database and auth </summary>
   
- [x] Set up database for user account creation and project saving
- [ ] Version history for projects
- [ ] Set up paid tiers to cover server costs if we start getting traction????
 </details>

 <details>
<summary> 🤝 Phase 7: Community and Marketing </summary>
   
- [ ] Build a community sharing site to share and remix projects 
- [ ] Create live link sharing tools 
- [ ] Make marketing site
- [ ] Create tutorial series
- [ ] Create help and tool tip for in product on boarding
 </details>

## 📖 Documentation

- **[Product Requirements Document](./PRD.md)** - Complete feature specifications
- **[Development Guide](./DEVELOPMENT.md)** - Setup and project structure
- **[Copilot Instructions](./COPILOT_INSTRUCTIONS.md)** - Development guidelines
- **[Monorepo Setup Guide](./docs/MONOREPO_SETUP_GUIDE.md)** - Dual-license structure and migration
- **[Technical Documentation](./docs/)** - Comprehensive implementation guides, plans, and feature documentation
- **[Development Tools](./dev-tools/)** - Test scripts and debugging utilities

## 🤝 Contributing

We welcome contributions to the **open-source core** (`packages/core/`)!

### For Open Source Contributors

**What you can contribute:**
- ✅ New drawing tools and brushes
- ✅ Animation features and effects
- ✅ Export formats and converters
- ✅ UI/UX improvements
- ✅ Bug fixes and performance optimizations
- ✅ Documentation and examples

**What is proprietary:**
- ❌ Authentication system (`packages/premium/`)
- ❌ Cloud storage features
- ❌ Payment integration

### Monorepo Setup for Contributors

**Important:** This project uses a monorepo structure with a private Git submodule for premium features.

#### Project Structure
```
Ascii-Motion/               # Main repository (public)
├── packages/
│   ├── core/              # Open source (MIT) - You work here!
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── stores/
│   │   │   ├── hooks/
│   │   │   └── utils/
│   │   └── package.json
│   └── premium/           # Private submodule (Proprietary)
│       └── (not accessible to contributors)
├── src/                   # Legacy code (being migrated to core)
└── package.json           # Root workspace config
```

#### Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/cameronfoxly/Ascii-Motion.git
   cd Ascii-Motion
   npm install
   ```

2. **The `packages/premium/` folder will be empty** - This is expected! You don't need it to contribute.

3. **All your work happens in `packages/core/`:**
   ```bash
   # Core package has its own dev server
   cd packages/core
   npm run dev
   ```

4. **Development workflow:**
   - Make changes in `packages/core/src/`
   - The dev server will hot-reload your changes
   - Test thoroughly before submitting PR
   - Follow existing code patterns and TypeScript conventions

#### Import Paths

When writing code in `packages/core/`, use these import patterns:

```typescript
// ✅ Correct - Importing from core package
import { Button } from '@ascii-motion/core/components';
import { useCanvas } from '@ascii-motion/core/hooks';
import { CanvasStore } from '@ascii-motion/core/stores';

// ❌ Incorrect - Don't import from premium
import { AuthContext } from '@ascii-motion/premium/auth';
```

#### What Happens to Premium Code?

- The main app (`src/` folder) imports from both `core` and `premium`
- When you run `npm run dev` from the root, both packages are built
- **If `packages/premium/` is missing,** the app will still work but without auth/cloud features
- Your contributions to `core` are completely independent of premium features

#### Testing Your Changes

```bash
# Test from core package (recommended for contributors)
cd packages/core
npm run dev        # Opens Storybook or component sandbox
npm run test       # Run unit tests
npm run lint       # Check code style

# Test in full app (optional)
cd ../..           # Back to root
npm run dev        # Runs full app (may show warnings about missing premium)
```

#### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-tool`
3. Make your changes in `packages/core/`
4. Commit with clear messages: `git commit -m "Add gradient brush tool"`
5. Push to your fork: `git push origin feature/amazing-tool`
6. Open a Pull Request to the `main` branch

**PR Checklist:**
- [ ] Changes are only in `packages/core/` (no premium code)
- [ ] Code follows existing patterns and TypeScript conventions
- [ ] Tests pass (`npm run test`)
- [ ] No linting errors (`npm run lint`)
- [ ] Documentation updated if needed
- [ ] PR description explains what and why

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

## 📜 License

**Dual License:**

- **Core Features** (`packages/core/`) - [MIT License](LICENSE-MIT)
  - Free to use, modify, and distribute
  - No restrictions on commercial use

- **Premium Features** (`packages/premium/`) - [Proprietary License](LICENSE-PREMIUM)
  - Authentication and cloud storage
  - Unauthorized copying or distribution prohibited

See individual LICENSE files for full details.

---

Made with ❤️ for the ASCII art community
