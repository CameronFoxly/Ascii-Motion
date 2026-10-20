# [ASCII Motion](https://ascii-motion.app)

![ASCII Motion](https://img.shields.io/badge/version-2.2.9-green)
![License - Dual](https://img.shields.io/badge/license-MIT%20%2B%20Proprietary-blue)

A web app for creating and animating ASCII/ANSI art. 

Current deployed version:
https://ascii-motion.app

See what people are making in the community gallery:
https://ascii-motion.app/community

Learn more on the landing page:
https://ascii-motion.com

Check the usage documentation at:
https://docs.ascii-motion.com

<img width="2584" height="2002" alt="Screenshot 2026-02-17 at 4 26 14 PM" src="https://github.com/user-attachments/assets/ca4923b5-b964-4bd0-923c-c5c4b07ecad2" />


## 🎨 Current Features

- **Grid-based ASCII Art Editor** with full drawing toolset (pencil, eraser, fill, rectangle, ellipse, bezier pen, text, gradient, and more)
- **Convert images or video assets to ASCII art** with fine-tuned rendering control and frame rate matching
- **Custom Color and Character Palettes** including presets and import/export
- **Apply effects** and filters to existing animations
- **Generate animations** using procedural animation tools
- **Layer-Based Timeline** with keyframe interpolation for position, scale, rotation, and anchor point
- **Multi-Layer Compositing** with z-order, visibility, solo, lock, and layer groups
- **Keyframe Animation** with cubic bezier easing editor and presets
- **Export Formats:** Images (PNG, JPEG, SVG), Videos (MP4, WebM), React Components, CLI Components (Ink, OpenTUI, BubbleTea), Text, HTML, and session files
- **Publish to community gallery** and explore what people are making
- **MCP Server** ([ascii-motion-mcp](https://www.npmjs.com/package/ascii-motion-mcp)) for AI-assisted animation creation 
  
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

This monorepo contains **three separate deployable apps**, each with its own Vercel project:

| App | Domain | Deploy From | Command |
|-----|--------|-------------|---------|
| **Main App** | `ascii-motion.app` | Root | `npm run deploy` |
| **Marketing** | `ascii-motion.com` | `packages/web/marketing` | `npx vercel --prod` |
| **Docs** | `docs.ascii-motion.com` | `packages/web/docs-site` | `npx vercel --prod` |

### Main App Deployment (Root)

The main ASCII art editor deploys with automated versioning:

<details>
  <summary>Available Deployment Commands</summary>

| Command | Version Increment | Use Case |
|---------|------------------|----------|
| `npm run deploy` | **Patch** (2.0.0 → 2.0.1) | Bug fixes, small updates |
| `npm run deploy:major` | **Minor** (2.0.1 → 2.1.0) | New features, significant improvements |
| `npm run deploy:preview` | **None** | Testing deployments, preview branches |

### Manual Version Commands

For version management without deployment:

```bash
# Increment patch version (2.0.0 → 2.0.1)
npm run version:patch

# Increment minor version (2.0.1 → 2.1.0) 
npm run version:minor

# Increment major version (2.1.0 → 3.0.0)
npm run version:major
```
</details>

### Marketing & Docs Site Deployment

These deploy **separately** from the main app using the Vercel CLI:

```bash
# Marketing site (ascii-motion.com)
cd packages/web/marketing
npx vercel --prod

# Docs site (docs.ascii-motion.com)
cd packages/web/docs-site
npx vercel --prod
```

See the README in each package for detailed deployment instructions.


## 🏗️ Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety (strict mode)
- **Vite** - Build tool and dev server
- **Tailwind CSS v3** - Styling
- **Shadcn/ui** - UI components
- **Zustand** - State management
- **Lucide React** - Icons
- **Vitest** - Testing framework

## 📦 Project Structure

**This is a monorepo with dual licensing and separate deployment targets:**

- **`packages/core/`** - Open source core features (MIT License)
  - Canvas editor, drawing tools, animation system
  - Export features (PNG, SVG, GIF, MP4, etc.)
  - All UI components and utilities

- **`packages/premium/`** - Premium features (Proprietary License)
  - User authentication (email-based)
  - Cloud project storage (Supabase)
  - Payment integration (future)
  
- **`packages/web/marketing/`** - Marketing site (Proprietary License)
  - Deploys to `ascii-motion.com`
  - Next.js 16 + React 19
  - Has its own `package.json` and Vercel project
  
- **`packages/web/docs-site/`** - Documentation site (Proprietary License)
  - Deploys to `docs.ascii-motion.com`
  - Next.js 15 + MDX
  - Has its own `package.json` and Vercel project
  
See [docs/MONOREPO_SETUP_GUIDE.md](docs/MONOREPO_SETUP_GUIDE.md) for details.

## 🏛️ Core App Architecture

```
src/
├── components/
│   ├── common/         # Shared/reusable components
│   ├── features/       # Complex functional components (canvas, import/export)
│   │   └── timeline/   # Layer list, track area, keyframe editor, ruler
│   ├── tools/          # Tool-specific components
│   └── ui/             # Shadcn UI components
├── stores/
│   ├── timelineStore.ts   # PRIMARY: layers, content frames, keyframes, groups
│   ├── canvasStore.ts     # Working canvas buffer for active layer
│   ├── animationStore.ts  # Legacy compatibility adapter
│   └── toolStore.ts       # Tools, settings, undo/redo history
├── types/
│   ├── timeline.ts        # Layer, ContentFrame, Keyframe, PropertyTrack types
│   └── easing.ts          # Cubic bezier interpolation engine
├── hooks/              # Custom React hooks
├── utils/
│   ├── layerCompositing.ts    # Multi-layer compositing with transforms
│   ├── layerTransformUtils.ts # Screen↔local coordinate conversion
│   └── sessionMigration.ts    # v1→v2 format migration
├── constants/          # App configuration
└── pages/              # Page components
```

## 📋 Development Status

This is currently maintained entirely by me, an animator and brand designer with next to no prior experience with building tools. This has been meticulously vibe-coded into existence over the last year or so, starting with GitHub Copilot in VScode and Claude Opus 4.6. More recently I've been using auto model mode in the [GitHub Copilot App](https://github.com/features/ai/github-app), and probably wont go back to a traditional IDE. Please forgive any messy or unusal structure or vibe-code artifacts, I'm trying my best!

### Upcoming features planned

I've made it through my backlog of features. Got an idea for a new feature? [Open an issue](https://github.com/CameronFoxly/Ascii-Motion/issues/new)!

## 📖 Documentation

- **[Copilot Instructions](./COPILOT_INSTRUCTIONS.md)** - Architecture overview and development guidelines
- **[Contributing Guide](./CONTRIBUTING.md)** - How to contribute
- **[Monorepo Setup Guide](./docs/MONOREPO_SETUP_GUIDE.md)** - Dual-license structure
- **[Layer Timeline Refactor Plan](./docs/LAYER_TIMELINE_REFACTOR_PLAN.md)** - v2.0.0 architecture design
- **[Technical Documentation](./docs/)** - Implementation guides and feature documentation. Each .md file was created as a planning document when that feature was worked on and may not be currently still in date, but may be useful for contributors to understand the architecture and design decisions.
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

2. **The `packages/premium/` folder will be empty** - This is expected! You don't need it to contribute. The app runs without premium features.

3. **Development:**
   ```bash
   npm run dev          # Start dev server
   npm run test:run     # Run tests (343 tests)
   npm run lint         # Check code quality
   npm run build        # Production build
   ```

4. **All source code lives in `src/`** — not in `packages/core/` (which is a shared UI component library). Your contributions go directly in `src/`.

5. **Key files to know:**
   - `src/stores/timelineStore.ts` — Primary state (layers, keyframes, timeline)
   - `src/hooks/useKeyboardShortcuts.ts` — All keyboard shortcuts and undo/redo
   - `src/components/features/ToolPalette.tsx` — Tool UI and options
   - `src/utils/exportRenderer.ts` — All export format rendering
   - `src/types/timeline.ts` — Core type definitions

#### Import Paths

When writing code in `src/`, use these import patterns:

```typescript
// Stores
import { useTimelineStore } from '../stores/timelineStore';
import { useCanvasStore } from '../stores/canvasStore';
import { useToolStore } from '../stores/toolStore';

// Utils
import { screenToLocal } from '../utils/layerTransformUtils';
import { compositeLayersAtFrame } from '../utils/layerCompositing';

// Types
import type { Layer, ContentFrame, KeyframeId } from '../types/timeline';

// UI Components
import { Button } from '../components/ui/button';
```

#### What Happens to Premium Code?

- The main app (`src/` folder) imports from both `core` and `premium`
- When you run `npm run dev` from the root, both packages are built
- **If `packages/premium/` is missing,** the app will still work but without auth/cloud features
- Your contributions to `core` are completely independent of premium features

#### Testing Your Changes

```bash
# Run the full test suite (343 tests)
npm run test:run

# Run tests in watch mode during development
npm test

# Lint check
npm run lint

# TypeScript type check
npx tsc --noEmit

# Production build verification
npm run build
```

#### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-tool`
3. Make your changes in `packages/core/`
4. Commit with clear messages: `git commit -m "Add gradient brush tool"`
5. Push to your fork: `git push origin feature/amazing-tool`
6. Open a Pull Request to the `main` branch

**PR Checklist:**
- [ ] Changes don't modify premium code (`packages/premium/`)
- [ ] Code follows existing patterns and TypeScript strict mode
- [ ] Tests pass (`npm run test:run`)
- [ ] No linting errors (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] New features include tests where applicable
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
