# Architecture Decision: Premium UI Components Location

**Date:** October 13, 2025  
**Decision:** Keep premium UI components in main app, not premium package

---

## TL;DR

**Question:** Should `ProjectsDialog.tsx`, `SaveToCloudDialog.tsx`, and `useCloudProjectActions.ts` be in the premium package since they're premium-only features?

**Answer:** **No.** They should stay in the main app for these reasons:

1. **Design System Cohesion** - They use shadcn/ui components from main app (`@/components/ui/*`)
2. **Clear Separation** - Premium package = business logic, Main app = UI layer
3. **Flexibility** - Premium package stays UI-framework agnostic
4. **Simplicity** - No need to duplicate design system or complicate imports

---

## What Goes Where

### Premium Package (`packages/premium/`)
**Contains:** Business logic, data operations, types, REST API calls

```typescript
// ✅ Export these
export { useCloudProject } from './cloud/useCloudProject';
export { useAuth } from './auth/AuthContext';
export type { CloudProject, SessionData } from './cloud/types';
```

### Main App (`src/`)
**Contains:** UI components, integration hooks, app-specific logic

```typescript
// 🔒 Premium-only but stays in main app
// ProjectsDialog.tsx
import { useCloudProject } from '@ascii-motion/premium'; // Logic from premium
import { Dialog, Card } from '@/components/ui/*'; // UI from main app
```

---

## File Markers

All premium-only files in main app are marked with:

```typescript
/**
 * ASCII Motion - PREMIUM FEATURE
 * Component Name
 * 
 * @premium This component requires authentication
 * @requires @ascii-motion/premium package
 * 
 * Architecture Note:
 * - UI Component: Lives in main app for design system cohesion
 * - Business Logic: Imported from @ascii-motion/premium
 */
```

---

## Affected Files

**Main App (Premium-Only UI):**
- ✅ `src/components/features/ProjectsDialog.tsx` - Marked as premium
- ✅ `src/components/features/SaveToCloudDialog.tsx` - Marked as premium
- ✅ `src/hooks/useCloudProjectActions.ts` - Marked as premium

**Premium Package (Logic):**
- ✅ `packages/premium/src/cloud/useCloudProject.ts` - Core operations
- ✅ `packages/premium/src/cloud/types.ts` - Data types
- ✅ `packages/premium/src/auth/AuthContext.tsx` - Auth logic

---

## Benefits

✅ **Simple imports** - No design system duplication  
✅ **Clear boundaries** - Logic vs UI separation  
✅ **Maintainable** - UI changes don't require package rebuilds  
✅ **Flexible** - Premium logic could support different UIs  

---

## See Also

- `PREMIUM_ARCHITECTURE.md` - Full architecture explanation
- `SUPABASE_ARCHITECTURE.md` - REST API implementation
- `CLOUD_STORAGE_COMPLETION_SUMMARY.md` - Feature summary
