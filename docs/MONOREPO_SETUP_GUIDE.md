# Monorepo Structure & Dual Licensing Guide

This document explains the monorepo structure, licensing strategy, and how to work with the dual-license setup.

---

## 📂 Repository Structure

```
ascii-motion/
├── packages/
│   ├── core/                 # ✅ MIT License (Open Source)
│   │   ├── src/
│   │   │   ├── components/  # UI components (canvas, tools, timeline)
│   │   │   ├── hooks/       # React hooks
│   │   │   ├── stores/      # Zustand state management
│   │   │   ├── utils/       # Utility functions
│   │   │   └── constants/   # App constants
│   │   ├── package.json     # @ascii-motion/core
│   │   └── tsconfig.json
│   │
│   └── premium/              # ⚠️ PROPRIETARY (Closed Source)
│       ├── src/
│       │   ├── auth/        # Authentication (Supabase)
│       │   ├── cloud/       # Cloud storage & sync
│       │   └── payment/     # Payment integration (future)
│       ├── package.json     # @ascii-motion/premium
│       └── tsconfig.json
│
├── src/                      # Main application (combines core + premium)
├── LICENSE-MIT               # License for packages/core
├── LICENSE-PREMIUM           # License for packages/premium
└── package.json              # Root workspace config
```

---

## 📜 Dual Licensing Explained

### What is MIT Licensed? (Open Source)

**Location:** `packages/core/`

**You CAN:**
- ✅ Use the code commercially
- ✅ Modify and distribute
- ✅ Create derivative works
- ✅ Use in closed-source projects
- ✅ Fork and rebrand

**You MUST:**
- Include copyright notice
- Include MIT license text

**Examples:**
- Canvas rendering system
- Drawing tools (pencil, brush, eraser, fill)
- Animation timeline
- Export features (PNG, SVG, GIF, MP4)
- Color pickers and UI components

### What is Proprietary? (Closed Source)

**Location:** `packages/premium/`

**You CANNOT (without permission):**
- ❌ Copy or distribute the code
- ❌ Modify or create derivatives
- ❌ Use commercially
- ❌ Reverse engineer
- ❌ Remove proprietary notices

**Examples:**
- User authentication (sign up, login, sessions)
- Cloud project storage (Supabase integration)
- Payment processing (Stripe integration - future)
- Premium features (HD exports, collaboration - future)

---

## 🛠️ Working with the Monorepo

### Installing Dependencies

```bash
# Install all packages (root + core + premium)
npm install

# Install in specific package
npm install <package-name> -w @ascii-motion/core
npm install <package-name> -w @ascii-motion/premium
```

### Building Packages

```bash
# Build all packages
npm run build -ws

# Build specific package
npm run build -w @ascii-motion/core
npm run build -w @ascii-motion/premium

# Watch mode (development)
npm run dev -w @ascii-motion/core
npm run dev -w @ascii-motion/premium
```

### Running the Application

```bash
# Development server (from root)
npm run dev

# Production build
npm run build

# Deploy to Vercel
npm run deploy
```

### Importing from Packages

**In main application (`src/`):**

```typescript
// Import from core package
import { CanvasGrid } from '@ascii-motion/core/components/CanvasGrid';
import { useCanvasStore } from '@ascii-motion/core/stores/canvasStore';
import { drawLine } from '@ascii-motion/core/utils/drawing';

// Import from premium package
import { AuthProvider } from '@ascii-motion/premium/auth/AuthContext';
import { useProjectSync } from '@ascii-motion/premium/cloud/useProjectSync';
```

**In premium package (`packages/premium/src/`):**

```typescript
// Premium can import from core
import { useCanvasStore } from '@ascii-motion/core/stores/canvasStore';
```

**In core package (`packages/core/src/`):**

```typescript
// Core should NEVER import from premium
// ❌ import { AuthProvider } from '@ascii-motion/premium'; // WRONG!
```

---

## 🔒 License Header Requirements

### For Core Files (MIT)

Add this header to **every** file in `packages/core/src/`:

```typescript
/**
 * ASCII Motion - Open Source ASCII Art Editor
 * 
 * @license MIT
 * @copyright 2025 ASCII Motion
 * @see LICENSE-MIT for full license text
 */
```

### For Premium Files (Proprietary)

Add this header to **every** file in `packages/premium/src/`:

```typescript
/**
 * ASCII Motion - Premium Features
 * 
 * @license Proprietary
 * @copyright 2025 ASCII Motion
 * @see LICENSE-PREMIUM for full license text
 * 
 * This file is part of ASCII Motion's premium features.
 * Unauthorized copying, distribution, or use is prohibited.
 */
```

---

## 🚀 Migration Checklist

### Phase 1: Set Up Structure ✅

- [x] Create `packages/core/` directory
- [x] Create `packages/premium/` directory
- [x] Create package.json files
- [x] Create tsconfig.json files
- [x] Add workspaces to root package.json
- [x] Create LICENSE-MIT and LICENSE-PREMIUM

### Phase 2: Move Core Code

- [ ] Move `src/components/` to `packages/core/src/components/`
- [ ] Move `src/hooks/` to `packages/core/src/hooks/`
- [ ] Move `src/stores/` to `packages/core/src/stores/`
- [ ] Move `src/utils/` to `packages/core/src/utils/`
- [ ] Move `src/constants/` to `packages/core/src/constants/`
- [ ] Add MIT license headers to all moved files
- [ ] Create `packages/core/src/index.ts` with exports

### Phase 3: Create Premium Package

- [ ] Create `packages/premium/src/auth/` directory
- [ ] Create `packages/premium/src/cloud/` directory
- [ ] Create `packages/premium/src/payment/` directory (empty for now)
- [ ] Add Proprietary license headers
- [ ] Create `packages/premium/src/index.ts` with exports

### Phase 4: Update Main App

- [ ] Update imports in `src/` to use `@ascii-motion/core`
- [ ] Update imports to use `@ascii-motion/premium` (when ready)
- [ ] Update Vite config for path aliases
- [ ] Test build and dev server

### Phase 5: Validation

- [ ] Run `npm install` successfully
- [ ] Run `npm run build` successfully
- [ ] Run `npm run dev` successfully
- [ ] Verify all imports resolve correctly
- [ ] Test license header automation (see below)

---

## 🤖 Automated License Header Checking

Create a script to verify all files have proper license headers:

**File:** `scripts/check-licenses.js`

```javascript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MIT_HEADER = '@license MIT';
const PROPRIETARY_HEADER = '@license Proprietary';

const checkDirectory = (dir, expectedLicense) => {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  const errors = [];

  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      errors.push(...checkDirectory(fullPath, expectedLicense));
    } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const first500 = content.substring(0, 500);
      
      if (!first500.includes(expectedLicense)) {
        errors.push(`Missing ${expectedLicense} header: ${fullPath}`);
      }
    }
  }
  
  return errors;
};

const coreErrors = checkDirectory(
  path.join(__dirname, '../packages/core/src'),
  MIT_HEADER
);

const premiumErrors = checkDirectory(
  path.join(__dirname, '../packages/premium/src'),
  PROPRIETARY_HEADER
);

const allErrors = [...coreErrors, ...premiumErrors];

if (allErrors.length > 0) {
  console.error('❌ License header errors found:\n');
  allErrors.forEach(err => console.error(`  - ${err}`));
  process.exit(1);
} else {
  console.log('✅ All files have proper license headers!');
}
```

**Add to package.json:**

```json
{
  "scripts": {
    "check-licenses": "node scripts/check-licenses.js",
    "precommit": "npm run check-licenses"
  }
}
```

---

## 🔄 Git Workflow

### Branches

- `main` - Production code (includes core + premium)
- `develop` - Development branch
- `feature/*` - Feature branches

### Commit Messages

```bash
# For core changes
git commit -m "feat(core): Add polygon tool"

# For premium changes
git commit -m "feat(premium): Add cloud sync"

# For both
git commit -m "feat: Update project save system (core + premium)"
```

### .gitignore Updates

Ensure these are ignored:

```
# Environment variables (premium secrets)
.env.local
.env.production

# Build outputs
packages/*/dist

# Dependencies
node_modules

# Premium config (if sensitive)
packages/premium/.env*
```

---

## 📦 Publishing Strategy

### Core Package (MIT)

**Option 1: Publish to npm (public)**

```bash
cd packages/core
npm publish --access public
```

**Option 2: Keep in monorepo only**

Use `workspace:*` protocol in package.json dependencies.

### Premium Package (Proprietary)

**Never publish to public npm.**

Options:
- Keep in private monorepo
- Use private npm registry (GitHub Packages, Verdaccio)
- Bundle directly into main app

---

## 🎯 Best Practices

### DO ✅

- Always add license headers to new files
- Keep core package dependencies minimal
- Document public APIs in core package
- Use feature flags to conditionally enable premium features
- Test with premium features disabled (open-source mode)

### DON'T ❌

- Don't import premium code in core package
- Don't commit secrets to Git (use .env.local)
- Don't expose premium APIs in core exports
- Don't mix MIT and Proprietary code in same file
- Don't hardcode feature flags (use environment variables)

---

## 🆘 Troubleshooting

### "Cannot find module '@ascii-motion/core'"

**Solution:**

```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### "TypeScript cannot find type declarations"

**Solution:**

```bash
# Build packages first
npm run build -w @ascii-motion/core
npm run build -w @ascii-motion/premium
```

### "Circular dependency detected"

**Problem:** Premium imports core, core imports premium.

**Solution:** Remove imports from core to premium. Core should be standalone.

### "License header missing" errors

**Solution:**

```bash
# Run license check
npm run check-licenses

# Manually add headers to reported files
```

---

## 📞 Questions?

See also:
- `docs/OPEN_SOURCE_SECURITY_STRATEGY.md` - Security and licensing strategy
- `docs/AUTH_IMPLEMENTATION_PLAN.md` - Authentication implementation
- `docs/ADDING_FEATURES_TO_PROJECT_SYSTEM.md` - Feature development guide

For licensing questions, contact: contact@ascii-motion.com
