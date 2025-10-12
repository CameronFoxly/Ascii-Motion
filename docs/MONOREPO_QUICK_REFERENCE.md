# Monorepo Quick Reference Card

**ASCII Motion Dual-License Monorepo**  
*Keep this handy while developing!*

---

## 📦 Package Structure

```
packages/
├── core/          ✅ MIT License (Open Source)
└── premium/       ⚠️  PROPRIETARY (Closed Source)
```

---

## 🔑 Key Commands

### Install & Build
```bash
npm install                  # Install all packages
npm run build:packages       # Build core + premium
npm run build:core           # Build only core
npm run build:premium        # Build only premium
npm run dev                  # Start dev server
```

### Quality Checks
```bash
npm run check-licenses       # Verify license headers
npm run lint                 # Run linter
npm run build                # Full production build
```

### Migration
```bash
node scripts/migrate-to-monorepo.js    # Interactive migration guide
```

---

## 📝 License Headers

### Core Package (MIT)
```typescript
/**
 * ASCII Motion - Open Source ASCII Art Editor
 * 
 * @license MIT
 * @copyright 2025 ASCII Motion
 * @see LICENSE-MIT for full license text
 */
```

### Premium Package (Proprietary)
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

## 📥 Import Patterns

### In Main App (`src/`)
```typescript
// Core imports
import { CanvasGrid } from '@ascii-motion/core/components/CanvasGrid';
import { useCanvasStore } from '@ascii-motion/core/stores/canvasStore';

// Premium imports
import { AuthProvider } from '@ascii-motion/premium/auth/AuthContext';
import { useProjectSync } from '@ascii-motion/premium/cloud/useProjectSync';
```

### In Premium Package
```typescript
// ✅ Premium CAN import from core
import { useCanvasStore } from '@ascii-motion/core/stores/canvasStore';
```

### In Core Package
```typescript
// ❌ Core CANNOT import from premium
// Never do this:
// import { AuthProvider } from '@ascii-motion/premium';
```

---

## 🚫 What Goes Where

### Core Package (`packages/core/`)
- ✅ Drawing tools
- ✅ Canvas components
- ✅ Animation system
- ✅ Export features
- ✅ UI components
- ✅ Stores (Zustand)
- ✅ Utilities

### Premium Package (`packages/premium/`)
- ⚠️  Authentication
- ⚠️  Cloud storage
- ⚠️  Payment integration
- ⚠️  User account features

---

## 🔒 Security Checklist

### Before Every Commit
- [ ] Run `npm run check-licenses`
- [ ] No `.env.local` in Git
- [ ] No Supabase service keys in code
- [ ] License headers on new files
- [ ] No premium code in core package

### Environment Variables
```bash
# ✅ SAFE (can be public)
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY

# ❌ NEVER IN FRONTEND
SUPABASE_SERVICE_ROLE_KEY
```

---

## 📂 File Locations

### Documentation
- `docs/MONOREPO_SETUP_GUIDE.md` - Complete guide
- `docs/AUTH_IMPLEMENTATION_PLAN.md` - Auth guide
- `docs/OPEN_SOURCE_SECURITY_STRATEGY.md` - Security
- `CONTRIBUTING.md` - How to contribute

### Scripts
- `scripts/check-licenses.js` - License verification
- `scripts/migrate-to-monorepo.js` - Migration helper

### Config Files
- `.env.example` - Environment template
- `LICENSE-MIT` - Open source license
- `LICENSE-PREMIUM` - Proprietary license

---

## 🐛 Troubleshooting

### "Cannot find module '@ascii-motion/core'"
```bash
rm -rf node_modules
npm install
npm run build:packages
```

### "License header missing"
```bash
npm run check-licenses  # Find missing headers
# Add appropriate header from above
```

### "Circular dependency"
```bash
# Check: Did core import from premium?
# Solution: Remove the import (not allowed)
```

### Build fails
```bash
# Clean everything
rm -rf node_modules packages/*/dist
npm install
npm run build:packages
```

---

## 🎯 Common Tasks

### Adding a New Core Feature
1. Create file in `packages/core/src/`
2. Add MIT license header
3. Export from appropriate index.ts
4. Build: `npm run build:core`
5. Import in main app

### Adding a Premium Feature
1. Create file in `packages/premium/src/`
2. Add Proprietary license header
3. Export from appropriate index.ts
4. Build: `npm run build:premium`
5. Import in main app

### Updating Dependencies
```bash
# Core package
npm install <package> -w @ascii-motion/core

# Premium package
npm install <package> -w @ascii-motion/premium

# Root (dev dependencies)
npm install <package> -D
```

---

## 📊 Package Info

| Package | License | Public | Location |
|---------|---------|--------|----------|
| `@ascii-motion/core` | MIT | ✅ Yes | `packages/core/` |
| `@ascii-motion/premium` | Proprietary | ❌ No | `packages/premium/` |

---

## 🔗 Quick Links

- Main App: `/src`
- Core Package: `/packages/core/src`
- Premium Package: `/packages/premium/src`
- Docs: `/docs`
- Scripts: `/scripts`

---

**Print this and keep it by your desk! 📋**

For full details, see: `docs/MONOREPO_SETUP_GUIDE.md`
