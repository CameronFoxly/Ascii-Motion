# Cloud Storage Implementation Plan

## Implementation Status

### ✅ Phase 1: Foundation (COMPLETE)
**Completed:** January 2025

Files created:
- `packages/premium/src/cloud/types.ts` - TypeScript interfaces
- `packages/premium/src/cloud/utils/projectSerializer.ts` - Serialization utilities
- `packages/premium/src/cloud/useCloudProject.ts` - Main cloud project hook
- `packages/premium/src/cloud/index.ts` - Barrel exports
- `packages/premium/src/cloud/USAGE_EXAMPLE.ts` - Integration guide

**Features:**
- ✅ TypeScript interfaces for CloudProject, SessionData, ProjectListItem
- ✅ Serialization utilities (serialize/deserialize projects)
- ✅ useCloudProject hook with all core operations:
  - saveToCloud() - Save/update projects
  - loadFromCloud() - Load projects with last_opened_at update
  - listProjects() - List user's projects (RLS enforced)
  - deleteProject() - Soft delete
  - renameProject() - Rename projects
  - uploadSessionFile() - Upload .asciimtn files
  - getProjectForDownload() - Get session data for download

**Next:** Phase 2 UI Integration

---

## Overview

Implement cloud project storage that integrates seamlessly with the existing `.asciimtn` session export/import system, avoiding redundancy while adding cloud sync capabilities.

## Existing System Analysis

### Current `.asciimtn` Session Format
**File:** `src/utils/exportRenderer.ts` (line 316+)

```typescript
interface SessionData {
  version: string;
  metadata?: {
    exportedAt: string;
    exportVersion: string;
    userAgent: string;
  };
  canvas: {
    width: number;
    height: number;
    canvasBackgroundColor: string;
    showGrid: boolean;
  };
  animation: {
    frames: Array<{
      id: string;
      name: string;
      duration: number;
      data: Record<string, Cell>;
    }>;
    currentFrameIndex: number;
    frameRate: number;
    looping: boolean;
  };
  tools: {
    activeTool: Tool;
    selectedCharacter: string;
    selectedColor: string;
    selectedBgColor: string;
    paintBucketContiguous: boolean;
    rectangleFilled: boolean;
  };
  ui: {
    theme: string;
    zoom: number;
    panOffset: { x: number; y: number };
    fontMetrics: FontMetrics;
  };
  typography: TypographySettings;
  palettes: PaletteState;
  characterPalettes: CharacterPaletteState;
}
```

### Database Schema (Already Created)
**File:** `packages/premium/src/auth/types/supabase.ts`

```typescript
interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  canvas_data: Json;  // Same format as SessionData
  tool_state: Json | null;
  animation_state: Json | null;
  created_at: string;
  updated_at: string;
  last_opened_at: string;
  is_published: boolean;
  deleted_at: string | null;
}
```

## Architecture Decision: Unified Storage Format

### Key Insight
The `.asciimtn` session format **IS** the canonical project format. We should:

1. ✅ **Reuse existing session export/import utilities**
2. ✅ **Store same JSON structure in Supabase `canvas_data` field**
3. ✅ **Enable .asciimtn files to be uploaded as cloud projects**
4. ✅ **Enable cloud projects to be downloaded as .asciimtn files**

### Benefits
- No duplication of serialization/deserialization logic
- Users can work offline and upload later
- Easy migration between local and cloud
- Consistent data format everywhere

## Implementation Strategy

### Phase 1: Cloud Storage Hook (`useCloudProject`)

**File:** `packages/premium/src/cloud/useCloudProject.ts`

```typescript
interface CloudProject {
  id: string;
  name: string;
  description: string | null;
  sessionData: SessionData;  // Reuse existing type!
  created_at: string;
  updated_at: string;
  last_opened_at: string;
}

export function useCloudProject() {
  // Save current session to cloud
  const saveToCloud = async (projectName: string, description?: string) => {
    // 1. Use exportDataCollector to get current state
    // 2. Format as SessionData (reuse exportRenderer.exportSession logic)
    // 3. Upsert to Supabase projects table
    // 4. Return project ID
  };
  
  // Load project from cloud
  const loadFromCloud = async (projectId: string) => {
    // 1. Fetch from Supabase
    // 2. Parse canvas_data as SessionData
    // 3. Use SessionImporter.restoreSessionData() - REUSE!
  };
  
  // List user's projects
  const listProjects = async () => {
    // Query Supabase with user_id filter (RLS handles this)
  };
  
  // Delete project
  const deleteProject = async (projectId: string) => {
    // Soft delete (set deleted_at)
  };
  
  // Upload .asciimtn file as cloud project
  const uploadSessionFile = async (file: File) => {
    // 1. Parse .asciimtn file
    // 2. Extract project name from file
    // 3. Call saveToCloud with parsed data
  };
  
  // Download cloud project as .asciimtn file
  const downloadAsSessionFile = async (projectId: string) => {
    // 1. Fetch project data
    // 2. Use exportRenderer.exportSession() - REUSE!
    // 3. Trigger download
  };
  
  return {
    saveToCloud,
    loadFromCloud,
    listProjects,
    deleteProject,
    uploadSessionFile,
    downloadAsSessionFile,
  };
}
```

### Phase 2: Auto-Save Hook (`useProjectAutoSave`)

**File:** `packages/premium/src/cloud/useProjectAutoSave.ts`

```typescript
export function useProjectAutoSave(projectId: string | null, enabled: boolean) {
  const exportData = useExportDataCollector();
  const { saveToCloud } = useCloudProject();
  
  useEffect(() => {
    if (!projectId || !enabled) return;
    
    // Debounced save (5 seconds after last change)
    const debouncedSave = debounce(async () => {
      if (exportData) {
        await saveToCloud(projectId, exportData);
      }
    }, 5000);
    
    debouncedSave();
    
    return () => debouncedSave.cancel();
  }, [exportData, projectId, enabled]);
}
```

### Phase 3: Projects Dialog

**File:** `packages/premium/src/cloud/components/ProjectsDialog.tsx`

```tsx
export function ProjectsDialog() {
  const { user } = useAuth();
  const { listProjects, deleteProject, loadFromCloud, uploadSessionFile } = useCloudProject();
  const [projects, setProjects] = useState([]);
  
  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>My Projects</DialogTitle>
        </DialogHeader>
        
        {/* Project List */}
        <div className="space-y-2">
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onLoad={() => loadFromCloud(project.id)}
              onDelete={() => deleteProject(project.id)}
              onDownload={() => downloadAsSessionFile(project.id)}
            />
          ))}
        </div>
        
        {/* Upload .asciimtn File */}
        <Button onClick={() => uploadSessionFile(selectedFile)}>
          Upload Session File
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

## Integration Points

### 1. Save Menu Enhancement
**File:** `src/components/features/HamburgerMenu.tsx`

Current:
- "Save Project" → Opens SessionExportDialog (.asciimtn download)

Enhanced:
- "Save to Cloud" → Opens cloud save dialog (if authenticated)
- "Save as File" → Opens SessionExportDialog (.asciimtn download)
- Show cloud status indicator (saved/saving/offline)

### 2. Open Menu Enhancement
**File:** `src/components/features/HamburgerMenu.tsx`

Current:
- "Open Project" → Opens file picker for .asciimtn

Enhanced:
- "Open from Cloud" → Opens ProjectsDialog (if authenticated)
- "Open from File" → Opens file picker for .asciimtn
- Recently opened projects list

### 3. Auto-Save Integration
**File:** `src/App.tsx` or `src/hooks/useProjectSync.ts`

```tsx
function App() {
  const { user } = useAuth();
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  
  // Auto-save to cloud if user is authenticated and has opened a cloud project
  useProjectAutoSave(currentProjectId, autoSaveEnabled && !!user);
  
  return (
    <AuthProvider>
      {/* Existing app */}
    </AuthProvider>
  );
}
```

## Data Flow Diagrams

### Scenario 1: User Creates New Project
```
1. User draws in canvas
2. User clicks "Save to Cloud"
3. useExportDataCollector() gathers current state
4. Format as SessionData (same as .asciimtn)
5. Upsert to Supabase projects table
6. Return project ID
7. Enable auto-save for this project
```

### Scenario 2: User Opens Cloud Project
```
1. User clicks "Open from Cloud"
2. ProjectsDialog lists projects from Supabase
3. User selects project
4. Fetch canvas_data from Supabase
5. Parse as SessionData
6. SessionImporter.restoreSessionData() - REUSE!
7. Set current project ID
8. Enable auto-save
```

### Scenario 3: User Uploads .asciimtn File to Cloud
```
1. User has local .asciimtn file
2. User clicks "Upload to Cloud"
3. File picker selects .asciimtn
4. Parse file as SessionData
5. Extract project name from filename
6. Save to Supabase as new project
7. User now has cloud-synced version
```

### Scenario 4: User Downloads Cloud Project as .asciimtn
```
1. User opens ProjectsDialog
2. User clicks "Download" on a project
3. Fetch project from Supabase
4. exportRenderer.exportSession() - REUSE!
5. Download as .asciimtn file
6. User can work offline
```

## Conflict Resolution

### Last-Write-Wins Strategy
- Simple and effective for single-user projects
- Use `updated_at` timestamp to detect conflicts
- Show warning if local changes are older than cloud

```typescript
async function saveWithConflictCheck(projectId: string, sessionData: SessionData) {
  const { data: project } = await supabase
    .from('projects')
    .select('updated_at')
    .eq('id', projectId)
    .single();
  
  const cloudUpdated = new Date(project.updated_at);
  const localUpdated = new Date(sessionData.metadata.exportedAt);
  
  if (cloudUpdated > localUpdated) {
    // Show conflict dialog
    const choice = await showConflictDialog({
      cloudVersion: project,
      localVersion: sessionData,
    });
    
    if (choice === 'use-cloud') {
      return loadFromCloud(projectId);
    } else if (choice === 'use-local') {
      return forceSaveToCloud(projectId, sessionData);
    } else {
      // Save as new project
      return saveToCloud(`${projectId}-copy`, sessionData);
    }
  }
  
  // No conflict, proceed
  return saveToCloud(projectId, sessionData);
}
```

## Subscription Tier Limits

### Free Tier
- Max 5 cloud projects
- Auto-save disabled (manual save only)
- No version history

### Pro Tier
- Max 100 cloud projects
- Auto-save enabled
- 10 versions per project

### Implementation
```typescript
async function canCreateProject(userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier:subscription_tiers(max_projects)')
    .eq('id', userId)
    .single();
  
  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('deleted_at', null);
  
  return count < profile.tier.max_projects;
}
```

## File Structure

```
packages/premium/src/cloud/
├── index.ts                          # Barrel export
├── useCloudProject.ts                # Main cloud operations hook
├── useProjectAutoSave.ts             # Auto-save hook
├── useProjectList.ts                 # Project listing & filtering
├── utils/
│   ├── conflictResolver.ts           # Conflict detection & resolution
│   ├── projectSerializer.ts          # SessionData <-> Database format
│   └── tierLimits.ts                 # Check subscription limits
└── components/
    ├── ProjectsDialog.tsx            # Main projects dialog
    ├── ProjectCard.tsx               # Individual project item
    ├── ProjectActions.tsx            # Actions menu (rename/delete/download)
    ├── ConflictDialog.tsx            # Conflict resolution UI
    └── CloudSaveIndicator.tsx        # Status indicator in toolbar
```

## Migration Path

### Phase 1: Foundation (Today)
- [x] Database schema created
- [x] Authentication working
- [ ] useCloudProject hook
- [ ] Basic save/load functionality

### Phase 2: UI Integration (Next)
- [ ] ProjectsDialog component
- [ ] Menu integration (Save/Open)
- [ ] Upload .asciimtn files
- [ ] Download as .asciimtn

### Phase 3: Auto-Save (Later)
- [ ] useProjectAutoSave hook
- [ ] Cloud status indicator
- [ ] Conflict resolution
- [ ] Offline support

### Phase 4: Advanced Features (Future)
- [ ] Project versioning
- [ ] Collaborative editing
- [ ] Project sharing/publishing
- [ ] Project templates

## Testing Plan

1. **Save to Cloud**
   - Create new project
   - Save to cloud
   - Verify in Supabase dashboard
   - Check RLS (can't see other users' projects)

2. **Load from Cloud**
   - Open ProjectsDialog
   - Select project
   - Verify all state restored (frames, tools, palettes)

3. **Upload .asciimtn**
   - Export local project as .asciimtn
   - Upload to cloud
   - Verify same as direct save

4. **Download as .asciimtn**
   - Open cloud project
   - Download as .asciimtn
   - Import file
   - Verify identical to cloud version

5. **Auto-Save**
   - Open cloud project
   - Make changes
   - Wait 5 seconds
   - Verify auto-save indicator
   - Refresh page, verify changes persisted

6. **Conflict Resolution**
   - Open project on two devices
   - Make different changes
   - Attempt to save from both
   - Verify conflict dialog appears
   - Test all resolution options

## Success Criteria

- [ ] Users can save current session to cloud
- [ ] Users can load projects from cloud
- [ ] .asciimtn files can be uploaded as cloud projects
- [ ] Cloud projects can be downloaded as .asciimtn files
- [ ] Auto-save works reliably (when enabled)
- [ ] Conflicts are detected and handled gracefully
- [ ] Subscription tier limits are enforced
- [ ] RLS policies protect user data
- [ ] No redundant code with existing session system
- [ ] Works seamlessly offline (local files) and online (cloud sync)
