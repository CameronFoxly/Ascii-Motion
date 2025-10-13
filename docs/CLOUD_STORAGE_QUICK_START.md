# Cloud Storage - Quick Start Guide

## What's Built (Phase 1 - Foundation)

✅ **Complete and working:**
- TypeScript types for cloud projects
- Serialization utilities (database ↔ SessionData)
- `useCloudProject` hook with all core operations
- Premium package builds successfully
- All files properly exported

## What's Next (Phase 2 - UI Integration)

🚧 **Ready to build:**
- ProjectsDialog UI component
- Menu integration (Save/Open to Cloud)
- Cloud status indicator
- Integration with existing export/import system

## Quick Import Reference

```typescript
// In any component within the app
import { useCloudProject } from '@ascii-motion/premium';

function MyComponent() {
  const {
    // State
    loading,
    error,
    
    // Operations
    saveToCloud,
    loadFromCloud,
    listProjects,
    deleteProject,
    renameProject,
    uploadSessionFile,
    getProjectForDownload,
  } = useCloudProject();
  
  // Use the hook methods...
}
```

## Example: Save Current Project

```typescript
import { useCloudProject } from '@ascii-motion/premium';
import { exportRenderer } from '@/utils/exportRenderer';
import { useExportDataCollector } from '@/hooks/useExportDataCollector';

function SaveButton() {
  const { saveToCloud, loading, error } = useCloudProject();
  const exportData = useExportDataCollector();
  
  const handleSave = async () => {
    // Get current app state
    const sessionData = await exportRenderer.exportSessionData(exportData);
    
    // Save to cloud
    const project = await saveToCloud(sessionData, {
      name: 'My Animation',
      description: 'Optional description',
    });
    
    if (project) {
      console.log('Saved!', project.id);
    }
  };
  
  return (
    <Button onClick={handleSave} disabled={loading}>
      {loading ? 'Saving...' : 'Save to Cloud'}
    </Button>
  );
}
```

## Example: Load Project

```typescript
import { useCloudProject } from '@ascii-motion/premium';
import { SessionImporter } from '@/utils/sessionImporter';

function LoadButton({ projectId }: { projectId: string }) {
  const { loadFromCloud, loading } = useCloudProject();
  const importer = useSessionImporter(); // Your hook to get SessionImporter instance
  
  const handleLoad = async () => {
    const project = await loadFromCloud(projectId);
    
    if (project) {
      // Restore the session
      await importer.restoreSessionData(project.sessionData);
      console.log('Loaded!');
    }
  };
  
  return (
    <Button onClick={handleLoad} disabled={loading}>
      {loading ? 'Loading...' : 'Open'}
    </Button>
  );
}
```

## Example: List Projects

```typescript
import { useCloudProject } from '@ascii-motion/premium';
import { useEffect, useState } from 'react';

function ProjectList() {
  const { listProjects, loading } = useCloudProject();
  const [projects, setProjects] = useState([]);
  
  useEffect(() => {
    const loadProjects = async () => {
      const data = await listProjects();
      setProjects(data);
    };
    
    loadProjects();
  }, []);
  
  if (loading) return <div>Loading projects...</div>;
  
  return (
    <div>
      {projects.map(project => (
        <div key={project.id}>
          <h3>{project.name}</h3>
          <p>{project.frameCount} frames</p>
          <p>Last opened: {new Date(project.lastOpenedAt).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}
```

## File Locations

```
packages/premium/src/cloud/
├── types.ts                          # TypeScript interfaces
├── index.ts                          # Barrel exports
├── useCloudProject.ts                # Main hook (use this!)
├── USAGE_EXAMPLE.ts                  # Detailed examples
└── utils/
    └── projectSerializer.ts          # Serialization utilities
```

## Next Development Steps

### 1. Create ProjectsDialog (Highest Priority)

**File:** `packages/premium/src/cloud/components/ProjectsDialog.tsx`

**What it needs:**
- Dialog component using shadcn/ui
- List of projects from `listProjects()`
- Project cards with:
  - Project name
  - Thumbnail (optional for v1)
  - Frame count
  - Last modified date
  - Actions: Open, Delete, Rename, Download
- Upload `.asciimtn` button
- Loading and error states

**Estimated time:** 1-2 hours

### 2. Update HamburgerMenu (High Priority)

**File:** `src/components/features/HamburgerMenu.tsx`

**Changes needed:**
- Add separator
- Add "Save to Cloud" menu item (show only if authenticated)
- Add "Open from Cloud" menu item (show only if authenticated)
- Keep existing "Save as File" and "Open from File"
- Open ProjectsDialog on "Open from Cloud" click

**Estimated time:** 30 minutes

### 3. Add Cloud Status Indicator (Medium Priority)

**Component:** New file or add to existing toolbar

**States to show:**
- ✅ "Saved" (green checkmark with timestamp)
- 🔄 "Saving..." (spinner)
- ☁️❌ "Offline" (cloud with slash)
- 🔒 "Not signed in" (hide or gray out)

**Estimated time:** 30 minutes

### 4. Implement Auto-Save (Lower Priority)

**File:** `packages/premium/src/cloud/useProjectAutoSave.ts`

**What it needs:**
- Debounce save (5 seconds after last change)
- Only save if authenticated
- Only save if project ID exists
- Update cloud status indicator
- Respect user preference (can disable)

**Estimated time:** 1 hour

## Testing Checklist

### Before Building UI
- [x] Premium package builds without errors
- [x] Types export correctly
- [x] Hook can be imported in main app

### After Building UI (Phase 2)
- [ ] Can click "Save to Cloud" and see project in Supabase
- [ ] Can click "Open from Cloud" and see projects list
- [ ] Can open a project and see canvas restore
- [ ] Can delete a project (soft delete)
- [ ] Can rename a project
- [ ] Can upload `.asciimtn` file as cloud project
- [ ] Can download cloud project as `.asciimtn` file
- [ ] Loading states show correctly
- [ ] Error messages display in toast

### After Auto-Save (Phase 3)
- [ ] Changes trigger auto-save after 5 seconds
- [ ] Status indicator shows "Saving..." then "Saved"
- [ ] No save when not authenticated
- [ ] Can disable auto-save in settings

## Common Pitfalls to Avoid

### 1. Don't Call Hook Conditionally
❌ **Wrong:**
```typescript
if (user) {
  const { saveToCloud } = useCloudProject(); // Error!
}
```

✅ **Correct:**
```typescript
const { saveToCloud } = useCloudProject();

if (user) {
  await saveToCloud(...);
}
```

### 2. Don't Forget to Check User State
The hook checks internally, but UI should also check:

```typescript
const { user } = useAuth();
const { saveToCloud } = useCloudProject();

// Only show button if authenticated
{user && <Button onClick={handleSave}>Save to Cloud</Button>}
```

### 3. Handle Loading States
```typescript
const { loading, saveToCloud } = useCloudProject();

<Button disabled={loading} onClick={handleSave}>
  {loading ? 'Saving...' : 'Save'}
</Button>
```

### 4. Handle Errors
```typescript
const { error, saveToCloud } = useCloudProject();

useEffect(() => {
  if (error) {
    toast.error(error);
  }
}, [error]);
```

## Architecture Notes

### Why Reuse SessionData Format?

**Decision:** Store the same `.asciimtn` format in database

**Benefits:**
1. No duplicate serialization code
2. Consistent format everywhere (local files and cloud)
3. Easy migration (upload existing `.asciimtn` files)
4. Can work offline (download as file, edit, re-upload)
5. Reuse existing `exportRenderer` and `SessionImporter`

### Database Schema

```sql
projects (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,  -- Links to auth.users
  name TEXT NOT NULL,
  description TEXT,
  canvas_data JSONB NOT NULL,  -- SessionData stored here!
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  last_opened_at TIMESTAMP,
  deleted_at TIMESTAMP  -- Soft delete
)
```

### RLS (Row Level Security)

All operations automatically filtered by user:
```typescript
.eq('user_id', user.id)
```

Plus Supabase RLS policies enforce at database level.

## Questions?

Refer to:
- **Full documentation:** `docs/CLOUD_STORAGE_FOUNDATION_COMPLETE.md`
- **Implementation plan:** `docs/CLOUD_STORAGE_IMPLEMENTATION_PLAN.md`
- **Usage examples:** `packages/premium/src/cloud/USAGE_EXAMPLE.ts`
- **Types reference:** `packages/premium/src/cloud/types.ts`

---

**Ready to build Phase 2!** 🚀
