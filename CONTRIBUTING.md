# Contributing to ASCII Motion

Thank you for your interest in contributing to ASCII Motion! We welcome contributions to the **open-source core** of the project.

## 🎯 What Can I Contribute?

### ✅ Accepted Contributions (MIT License)

**Drawing Tools & Features:**
- New drawing tools (spray, line, polygon, etc.)
- Tool improvements (brush smoothing, better fill algorithm)
- Effect additions (blur, sharpen, dithering patterns)

**Animation Features:**
- Timeline improvements
- Onion skinning enhancements
- Frame interpolation

**Export Features:**
- New export formats
- Export quality improvements
- Batch export capabilities

**UI/UX:**
- Component improvements
- Accessibility enhancements
- Keyboard shortcuts
- Color picker improvements

**Performance:**
- Rendering optimizations
- Memory usage improvements
- Large canvas handling

**Documentation:**
- Code documentation
- User guides
- Tutorial content

### ❌ Not Accepted (Proprietary)

These features are closed-source and not accepting external contributions:

- Authentication system
- Cloud storage integration
- Payment processing
- User account management
- Premium feature gating

## 🚀 Getting Started

1. **Fork the repository**

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Ascii-Motion.git
   cd Ascii-Motion
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Create a feature branch:**
   ```bash
   git checkout -b feature/my-new-tool
   ```

5. **Make your changes in `src/`** (not `packages/core/` — that's a shared UI library)

6. **Add license header to new files:**
   ```typescript
   /**
    * ASCII Motion - Open Source ASCII Art Editor
    * 
    * @license MIT
    * @copyright 2025 ASCII Motion
    * @see LICENSE-MIT for full license text
    */
   ```

7. **Test your changes:**
   ```bash
   npm run dev          # Manual testing
   npm run test:run     # Run test suite (343 tests)
   npm run lint         # Code quality check
   npm run build        # Production build
   ```

8. **Commit and push:**
   ```bash
   git add .
   git commit -m "feat: Add polygon drawing tool"
   git push origin feature/my-new-tool
   ```

9. **Open a Pull Request**

## 📝 Coding Guidelines

### File Organization

- Place new tools in `src/components/tools/`
- Place new hooks in `src/hooks/`
- Place utilities in `src/utils/`
- Place store additions in `src/stores/`
- Follow the **9-step tool creation pattern** in [COPILOT_INSTRUCTIONS.md](./COPILOT_INSTRUCTIONS.md)

### TypeScript

- Use strict TypeScript (no `any` types)
- Export all public APIs
- Document complex functions with JSDoc comments

### Code Style

- Use functional components with hooks
- Follow existing naming conventions
- Use Zustand for state management
- Use Tailwind CSS for styling

### Example: Adding a New Tool

```typescript
/**
 * ASCII Motion - Open Source ASCII Art Editor
 * 
 * @license MIT
 * @copyright 2025 ASCII Motion
 * @see LICENSE-MIT for full license text
 */

import { useCanvasStore } from '../../stores/canvasStore';
import { useToolStore } from '../../stores/toolStore';
import { screenToLocal } from '../../utils/layerTransformUtils';

export function MyNewTool() {
  const { cells, setCells } = useCanvasStore();
  const { selectedColor } = useToolStore();

  const handleClick = (x: number, y: number) => {
    // Your tool logic here
  };

  return (
    <button onClick={() => handleClick(0, 0)}>
      My Tool
    </button>
  );
}
```

## 🧪 Testing

Before submitting a PR:

- [ ] Run `npm run test:run` - All tests pass
- [ ] Run `npm run lint` - Zero warnings
- [ ] Run `npm run dev` - Verify no console errors
- [ ] Run `npm run build` - Production build succeeds
- [ ] Test your feature manually
- [ ] Test with multiple layers (if animation/drawing related)
- [ ] Add tests for new store actions or utility functions
- [ ] Verify exports still work
- [ ] Classify MCP impact and, if changed, run `npm run mcp:contract` + `npm run test:mcp` (see below)

## 🤖 MCP Parity

The [ascii-motion-mcp](https://github.com/CameronFoxly/ascii-motion-mcp) server controls the app through a typed bridge contract owned by this repo. Every user-facing authoring, animation, import/export or project change must be classified as **none**, **supported** (existing operations), **changed/new**, or **excluded** (with a reason) in `src/mcp/contract/coverage.ts`. Follow the workflow in [`docs/MCP_BRIDGE_CONTRACT.md`](docs/MCP_BRIDGE_CONTRACT.md); CI fails on stale generated artifacts or unclassified tools/export formats. If the contract hash changes, open a companion MCP PR.

## 📋 Pull Request Guidelines

### PR Title Format

Use conventional commits:

- `feat: Add spray tool`
- `fix: Correct fill algorithm overflow`
- `docs: Update tool documentation`
- `refactor: Simplify canvas rendering`
- `perf: Optimize animation playback`

### PR Description

Include:

1. **What** - What does this PR do?
2. **Why** - Why is this change needed?
3. **How** - How does it work?
4. **Testing** - How did you test it?
5. **Screenshots** - For UI changes (optional but helpful)
6. **MCP impact** - none / supported / changed-new / excluded, plus companion MCP or docs PR links

### Example PR Description

```markdown
## Add Polygon Drawing Tool

### What
Adds a polygon tool that lets users draw multi-point shapes.

### Why
Users requested a polygon tool for creating geometric ASCII art.

### How
- Click to add points
- Double-click or press Enter to close the polygon
- Uses line drawing algorithm between points

### Testing
- [x] Tested with 3-10 point polygons
- [x] Tested closing polygon
- [x] Tested with different colors
- [x] Tested undo/redo
- [x] Verified exports work

### Screenshots
[Include screenshot of polygon tool in action]
```

## 🔍 Code Review Process

1. **Automated Checks** - Must pass:
   - License header check
   - TypeScript compilation
   - Linting

2. **Manual Review** - Maintainers will check:
   - Code quality
   - Consistency with existing code
   - Feature completeness
   - Documentation

3. **Feedback** - We'll provide constructive feedback

4. **Merge** - Once approved, your PR will be merged!

## 🎉 Recognition

Contributors will be:
- Listed in release notes
- Credited in documentation
- Added to contributors list

## ❓ Questions?

- Open an issue for questions
- Check existing documentation
- See [docs/](./docs/) for technical guides

## 📜 License Agreement

By contributing, you agree that your contributions will be licensed under the MIT License (for `packages/core/` code).

---

Thank you for contributing to ASCII Motion! 🎨
