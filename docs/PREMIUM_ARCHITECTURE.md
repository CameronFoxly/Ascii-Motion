# Premium Features Architecture

**Date:** October 13, 2025  
**Status:** Implemented

---

## Architecture Decision: UI/Logic Separation

### Decision

Premium cloud storage features use a **hybrid architecture** where:
- **Business Logic** lives in `packages/premium/` (proprietary)
- **UI Components** live in `src/components/features/` (main app)
- **Integration Hooks** live in `src/hooks/` (main app)

### Rationale

**Why NOT move UI components to premium package?**

1. **Design System Cohesion**
   - UI components use shadcn/ui from main app (`@/components/ui/*`)
   - Moving them would break imports or require duplicating the design system
   - Keeping them in main app maintains consistent UI patterns

2. **Clear Separation of Concerns**
   - Premium package = business logic, data operations, types
   - Main app = presentation layer, user interactions, styling
   - Clean boundary: logic is premium, UI is app-specific

3. **Flexibility**
   - Different apps could use the same premium backend with different UIs
   - Premium package remains UI-framework agnostic (could work with Vue, Svelte, etc.)
   - Main app owns the user experience

4. **Practical Simplicity**
   - No need to re-export or duplicate UI components
   - No complex dependency injection for design system
   - Straightforward imports: `import { useCloudProject } from '@ascii-motion/premium'`

### What's Where

#### Premium Package (`packages/premium/`)

**Core Logic:**
```
packages/premium/src/
├── auth/
│   ├── AuthContext.tsx          # Auth state management
│   ├── lib/supabase.ts          # Supabase client setup
│   └── components/              # Auth UI (SignIn, SignUp, UserMenu)
├── cloud/
│   ├── useCloudProject.ts       # Main cloud operations hook ⭐
│   ├── types.ts                 # CloudProject, SessionData types ⭐
│   └── utils/
│       └── projectSerializer.ts # Data serialization ⭐
└── index.ts                     # Public exports
```

**Exports:**
- ✅ `useCloudProject` - Hook for save/load/list/delete/rename operations
- ✅ `useAuth` - Hook for authentication state
- ✅ Types: `CloudProject`, `SessionData`, `ProjectListItem`
- ✅ Auth components: `SignInDialog`, `SignUpDialog`, `UserMenu`

#### Main App (`src/`)

**UI Layer:**
```
src/
├── components/features/
│   ├── ProjectsDialog.tsx       # 🔒 Premium-only UI
│   ├── SaveToCloudDialog.tsx    # 🔒 Premium-only UI
│   └── HamburgerMenu.tsx        # Integrates cloud options
├── hooks/
│   └── useCloudProjectActions.ts # 🔒 Premium integration hook
└── utils/
    └── exportDataCollector.ts   # App-specific data collection
```

**Premium Markers:**
- Files marked with `@premium` JSDoc tag
- Comments explain they require `@ascii-motion/premium`
- Clear architecture notes at top of each file

### Example: ProjectsDialog

**File Location:** `src/components/features/ProjectsDialog.tsx`

**Why here?**
```typescript
// Uses main app's design system
import { Dialog, Button, Card } from '@/components/ui/*';

// Uses premium business logic
import { useCloudProject } from '@ascii-motion/premium';

// Bridges both worlds
export function ProjectsDialog() {
  const { listProjects, deleteProject } = useCloudProject(); // Premium logic
  return <Dialog><Card>...</Card></Dialog>; // Main app UI
}
```

**Result:**
- UI stays consistent with rest of app
- Logic is protected in premium package
- Clear separation: `@ascii-motion/premium` for data, `@/components` for presentation

### Example: useCloudProjectActions

**File Location:** `src/hooks/useCloudProjectActions.ts`

**Why here?**
```typescript
// App-specific data format
import type { ExportDataBundle } from '../types/export';

// Premium cloud operations
import { useCloudProject, type SessionData } from '@ascii-motion/premium';

// Bridge: converts app data to premium format
export function useCloudProjectActions() {
  const { saveToCloud } = useCloudProject();
  
  const createSessionData = (data: ExportDataBundle): SessionData => {
    // Conversion logic specific to this app
    return { /* ... */ };
  };
  
  return { handleSaveToCloud: () => saveToCloud(createSessionData(data)) };
}
```

**Result:**
- Premium package doesn't need to know about `ExportDataBundle`
- Main app handles its own data format
- Clean adapter pattern

---

## Benefits of This Architecture

### 1. Clean Package Boundaries
```
┌─────────────────────────────────┐
│   Main App (Open Source)        │
│   - UI Components                │
│   - Design System                │
│   - Integration Layer            │
│                                   │
│   Imports ↓                      │
│                                   │
│   @ascii-motion/premium          │
│   - Auth Logic                   │
│   - Cloud Storage Logic          │
│   - Data Types                   │
│   - REST API Calls               │
└─────────────────────────────────┘
```

### 2. Maintainability
- **UI Changes:** Edit `src/components/features/` (no package rebuild)
- **Logic Changes:** Edit `packages/premium/src/` (rebuild package)
- **Clear ownership:** UI owned by app, logic owned by premium

### 3. Reusability
- Premium package could be used by:
  - Desktop Electron app (different UI, same logic)
  - Mobile app (different UI, same logic)
  - CLI tool (no UI, pure logic)
  - Web app with different design system

### 4. Testing
- **Unit Tests:** Test premium hooks in isolation
- **Integration Tests:** Test UI components with mocked premium hooks
- **E2E Tests:** Test full flow with real premium backend

---

## File Organization

### Premium-Only Files in Main App

All these files are clearly marked and require authentication:

**UI Components:**
- `src/components/features/ProjectsDialog.tsx` 🔒
- `src/components/features/SaveToCloudDialog.tsx` 🔒

**Integration Hooks:**
- `src/hooks/useCloudProjectActions.ts` 🔒

**Features in HamburgerMenu:**
- "Save to Cloud" menu item 🔒
- "Open from Cloud" menu item 🔒

**Markers:**
- `@premium` JSDoc tag in file header
- `@requires @ascii-motion/premium package` note
- Architecture explanation comments

### Making Files Premium-Only

When creating new premium features in main app:

1. **Add header comment:**
```typescript
/**
 * ASCII Motion - PREMIUM FEATURE
 * Component/Hook Name
 * 
 * Description...
 * 
 * @premium This component requires authentication
 * @requires @ascii-motion/premium package
 * 
 * Architecture Note:
 * - Explain why it's in main app vs premium package
 */
```

2. **Import from premium package:**
```typescript
import { useCloudProject, useAuth } from '@ascii-motion/premium';
```

3. **Guard with authentication:**
```typescript
export function PremiumComponent() {
  const { user } = useAuth();
  
  if (!user) {
    return <SignInPrompt />;
  }
  
  // Premium feature UI
}
```

---

## Migration Guide

### If You Need to Move UI to Premium Package

If you decide later to move UI components to premium package:

**1. Install UI dependencies in premium package:**
```json
// packages/premium/package.json
{
  "dependencies": {
    "@radix-ui/react-dialog": "^1.0.0",
    "lucide-react": "^0.263.0",
    // ... other shadcn/ui dependencies
  }
}
```

**2. Copy design system components:**
```bash
cp -r src/components/ui packages/premium/src/ui
```

**3. Update imports in premium components:**
```typescript
// Before (main app path alias)
import { Dialog } from '@/components/ui/dialog';

// After (relative path in premium)
import { Dialog } from '../../ui/dialog';
```

**4. Export from premium package:**
```typescript
// packages/premium/src/index.ts
export { ProjectsDialog } from './cloud/components/ProjectsDialog';
export { SaveToCloudDialog } from './cloud/components/SaveToCloudDialog';
```

**5. Update main app imports:**
```typescript
// Before
import { ProjectsDialog } from './components/features/ProjectsDialog';

// After
import { ProjectsDialog } from '@ascii-motion/premium';
```

**Trade-offs of moving:**
- ✅ Clearer premium boundary
- ✅ Could distribute as single package
- ❌ Must duplicate or bundle design system
- ❌ Premium package becomes UI-framework-specific
- ❌ More complex to maintain two UI systems

**Current decision:** Keep UI in main app for simplicity and flexibility.

---

## Related Documentation

- `SUPABASE_ARCHITECTURE.md` - REST API implementation details
- `CLOUD_STORAGE_IMPLEMENTATION_PLAN.md` - Feature implementation plan
- `AUTH_IMPLEMENTATION_PLAN.md` - Authentication setup
- `CLOUD_STORAGE_COMPLETION_SUMMARY.md` - Implementation summary

---

## Summary

**Current Architecture:**
- ✅ Premium package = business logic (proprietary)
- ✅ Main app = UI layer (uses premium features)
- ✅ Clean separation via imports: `@ascii-motion/premium`
- ✅ Files clearly marked as premium-only
- ✅ Design system stays in one place
- ✅ Flexible for future use cases

**Status:** This architecture is working well and should be maintained unless specific requirements emerge that necessitate moving UI to premium package.
