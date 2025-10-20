# Shared UI Components Pattern

**Last Updated:** October 13, 2025  
**Status:** Active Pattern

---

## Overview

ASCII Motion uses a **shared UI component library** pattern to allow the premium package (private repository) to use the same shadcn/ui components as the main application without creating a dependency on the main app code.

## Architecture

```
ascii-motion/
├── src/                                    # Main Application (MIT License)
│   ├── components/ui/                      # ← Primary UI components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   └── ... (all shadcn/ui components)
│   └── lib/
│       └── utils.ts                        # ← cn() utility function
│
└── packages/
    ├── core/                               # Shared UI Library (MIT License)
    │   └── src/
    │       ├── components/ui/              # ← Copies of UI components
    │       │   ├── button.tsx
    │       │   ├── dialog.tsx
    │       │   └── ... (same as src/)
    │       ├── lib/
    │       │   └── utils.ts                # ← Copy of cn() utility
    │       └── index.ts                    # Barrel exports
    │
    └── premium/                            # Premium Features (Proprietary)
        └── src/
            └── auth/components/
                └── SignInDialog.tsx        # Imports from @ascii-motion/core
```

## Why This Pattern?

### Problem
The premium package (private Git submodule) needs to use UI components (buttons, dialogs, inputs, etc.) but cannot import directly from the main app's `/src` folder due to package boundaries.

### Solution
`packages/core` acts as a **shared component library** containing only:
- UI components from `/src/components/ui`
- The `cn()` utility from `/src/lib/utils.ts`

### Benefits
1. **Clean imports**: Premium code imports `@ascii-motion/core/components` 
2. **No duplication of logic**: Only UI presentation layer is duplicated
3. **Minimal maintenance**: Only ~25 small UI component files need syncing
4. **MIT licensed**: UI components remain open source

---

## When to Update Both Locations

### Scenario 1: Adding a New shadcn/ui Component

**Example:** Adding a new `command` component

1. **Add to main app:**
   ```bash
   npx shadcn@latest add command
   # Creates: src/components/ui/command.tsx
   ```

2. **Copy to core package:**
   ```bash
   cp src/components/ui/command.tsx packages/core/src/components/ui/
   ```

3. **Add export:**
   ```typescript
   // packages/core/src/components/index.ts
   export * from './ui/command';
   ```

### Scenario 2: Modifying an Existing UI Component

**Example:** Customizing button variants

1. **Edit main app version:**
   ```bash
   # Edit: src/components/ui/button.tsx
   ```

2. **Copy to core package:**
   ```bash
   cp src/components/ui/button.tsx packages/core/src/components/ui/
   ```

3. **No export changes needed** (already exported)

### Scenario 3: Updating the cn() Utility

1. **Edit main app version:**
   ```bash
   # Edit: src/lib/utils.ts
   ```

2. **Copy to core package:**
   ```bash
   cp src/lib/utils.ts packages/core/src/lib/
   ```

---

## Import Patterns

### Main App (src/)
```typescript
// Import from local ui folder
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
```

### Premium Package (packages/premium/)
```typescript
// Import from shared core package
import { Button } from '@ascii-motion/core/components';
import { Dialog } from '@ascii-motion/core/components';

// Or with destructuring
import {
  Button,
  Dialog,
  Input,
  Label,
} from '@ascii-motion/core/components';
```

---

## What NOT to Put in packages/core

**Only UI components and utilities belong in core.** The following should NOT be duplicated:

❌ **Business Logic**
- Stores (Zustand)
- Hooks (custom hooks)
- Contexts (React contexts)
- Utils (non-UI utilities)

❌ **Application Code**
- Features
- Tools
- Canvas logic
- Animation logic

✅ **Only Include**
- shadcn/ui components (`components/ui/*`)
- The `cn()` utility (`lib/utils.ts`)

---

## Maintenance Checklist

### When Adding shadcn/ui Components
- [ ] Run `npx shadcn@latest add <component>`
- [ ] Copy from `src/components/ui/` to `packages/core/src/components/ui/`
- [ ] Add export to `packages/core/src/components/index.ts`
- [ ] Verify import works in premium package

### When Customizing UI Components
- [ ] Edit `src/components/ui/<component>.tsx`
- [ ] Copy to `packages/core/src/components/ui/<component>.tsx`
- [ ] Test in both main app and premium package

### Periodic Sync Check
Run this command to compare files:
```bash
diff -r src/components/ui packages/core/src/components/ui
diff src/lib/utils.ts packages/core/src/lib/utils.ts
```

If differences are found, determine which version is correct and sync accordingly.

---

## FAQ

### Q: Why not just make premium import from src/?
**A:** Package boundaries - premium is a separate npm workspace and cannot import from parent directories without breaking the package structure.

### Q: Isn't this duplication bad?
**A:** Minimal duplication of ~25 small presentational components (2-3KB each) is acceptable trade-off for:
- Clean architecture
- Package independence  
- Clear licensing boundaries

### Q: Can we automate the syncing?
**A:** Possible future enhancement - a script could watch for changes and auto-copy. For now, manual copying on the rare occasion we add/modify UI components is manageable.

### Q: What if the files get out of sync?
**A:** Run the diff commands above to detect discrepancies. Premium package build errors will also alert you if core components are outdated.

---

## Current Components in Core Package

As of October 13, 2025:

- alert.tsx
- badge.tsx
- button.tsx
- card.tsx
- checkbox.tsx
- collapsible.tsx
- dialog.tsx
- dropdown-menu.tsx
- input.tsx
- label.tsx
- menubar.tsx
- popover.tsx
- progress.tsx
- scroll-area.tsx
- select.tsx
- separator.tsx
- sheet.tsx
- slider.tsx
- switch.tsx
- tabs.tsx
- textarea.tsx
- toggle.tsx
- tooltip.tsx

Plus: `lib/utils.ts` with the `cn()` function
