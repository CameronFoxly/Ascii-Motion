# Adding Features to the Project Save System

**Date:** October 12, 2025  
**For:** ASCII Motion Developers  
**Purpose:** Guide for integrating new features with cloud project storage

---

## 📋 Overview

When you add new features to ASCII Motion (tools, effects, settings, etc.), they need to integrate with the project save system so users don't lose their work. This guide explains how to make your features persist across sessions and sync to the cloud.

---

## 🏗️ Architecture Overview

### Project Data Structure

```typescript
// Saved to Supabase 'projects' table
interface ProjectData {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  
  // Core state snapshots (JSONB columns)
  canvas_data: {
    cells: Cell[][];
    gridSize: { width: number; height: number };
    // Add your canvas-related data here
  };
  
  tool_state: {
    activeTool: Tool;
    selectedCharacter: string;
    selectedTextColor: string;
    selectedBackgroundColor: string;
    brushSettings: BrushSettings;
    // Add your tool-related data here
  };
  
  animation_state: {
    frames: Frame[];
    currentFrameIndex: number;
    // Add your animation-related data here
  };
  
  // Future: Could add more categories
  // effects_state: { ... }
  // ui_state: { ... }
}
```

### State Management Flow

```
┌─────────────────┐
│  Zustand Store  │ ← Your feature state lives here
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ useProjectSync  │ ← Gathers state for saving
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   localStorage  │ ← Immediate save (anonymous users)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Supabase     │ ← Cloud sync (authenticated users)
└─────────────────┘
```

---

## ✅ Step-by-Step: Adding a Feature to Project Save

### Example: Adding a New "Spray Tool" with Settings

#### Step 1: Add State to Appropriate Store

**File:** `src/stores/toolStore.ts`

```typescript
interface ToolState {
  // Existing state...
  activeTool: Tool;
  selectedCharacter: string;
  
  // ✅ Add your new feature state
  spraySettings: {
    density: number; // 0-100
    radius: number; // 1-10
    randomness: number; // 0-100
  };
}

// Add default values
const initialState: ToolState = {
  // Existing defaults...
  activeTool: 'pencil',
  selectedCharacter: ' ',
  
  // ✅ Add your feature defaults
  spraySettings: {
    density: 50,
    radius: 5,
    randomness: 75,
  },
};

// Add setter action
export const useToolStore = create<ToolState>()((set) => ({
  // Existing actions...
  
  // ✅ Add setter for your feature
  setSpraySettings: (settings: Partial<SpraySettings>) =>
    set((state) => ({
      spraySettings: { ...state.spraySettings, ...settings },
    })),
}));
```

#### Step 2: Update Project Sync Hook

**File:** `src/hooks/useProjectSync.ts`

```typescript
const saveToCloud = useCallback(async (projectName?: string) => {
  if (!user) return { success: false, error: 'Not authenticated' };

  // Gather current state from all stores
  const canvasState = useCanvasStore.getState();
  const animationState = useAnimationStore.getState();
  const toolState = useToolStore.getState();

  const projectData = {
    name: projectName || `Project ${new Date().toLocaleString()}`,
    canvas_data: {
      cells: canvasState.cells,
      gridSize: canvasState.gridSize,
      // Add other canvas state as needed
    },
    tool_state: {
      activeTool: toolState.activeTool,
      selectedCharacter: toolState.selectedCharacter,
      selectedTextColor: toolState.selectedTextColor,
      selectedBackgroundColor: toolState.selectedBackgroundColor,
      brushSettings: toolState.brushSettings,
      
      // ✅ Add your new feature state
      spraySettings: toolState.spraySettings,
    },
    animation_state: {
      frames: animationState.frames,
      currentFrameIndex: animationState.currentFrameIndex,
    },
  };

  // Save to Supabase...
}, [user, currentProjectId]);
```

#### Step 3: Update Project Load Function

**File:** `src/hooks/useProjectSync.ts`

```typescript
const loadFromCloud = useCallback(async (projectId: string) => {
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) throw error;

  if (data) {
    const canvasState = data.canvas_data;
    const toolState = data.tool_state;
    const animationState = data.animation_state;

    // Load canvas state
    useCanvasStore.getState().setCells(canvasState.cells);
    useCanvasStore.getState().setGridSize(canvasState.gridSize);

    // Load tool state
    useToolStore.getState().setActiveTool(toolState.activeTool);
    useToolStore.getState().setSelectedCharacter(toolState.selectedCharacter);
    
    // ✅ Load your new feature state
    if (toolState.spraySettings) {
      useToolStore.getState().setSpraySettings(toolState.spraySettings);
    }

    // Load animation state
    useAnimationStore.getState().setFrames(animationState.frames);
    useAnimationStore.getState().setCurrentFrameIndex(animationState.currentFrameIndex);

    setCurrentProjectId(projectId);
  }

  return { success: true };
}, [user]);
```

#### Step 4: Handle Defaults for Missing Data

**Important:** Old projects won't have your new feature data. Always provide defaults.

```typescript
// ✅ GOOD: Provide fallback for old projects
if (toolState.spraySettings) {
  useToolStore.getState().setSpraySettings(toolState.spraySettings);
} else {
  // Use default values from store initialization
  useToolStore.getState().setSpraySettings({
    density: 50,
    radius: 5,
    randomness: 75,
  });
}

// ❌ BAD: Don't assume data exists
useToolStore.getState().setSpraySettings(toolState.spraySettings); // May be undefined!
```

#### Step 5: Add TypeScript Types

**File:** `src/types/supabase.ts`

```typescript
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          // ... existing fields
          tool_state: {
            activeTool: string;
            selectedCharacter: string;
            brushSettings: Record<string, any>;
            
            // ✅ Add your feature type (optional for backwards compatibility)
            spraySettings?: {
              density: number;
              radius: number;
              randomness: number;
            };
          } | null;
        };
      };
    };
  };
}
```

---

## 🔄 Best Practices for Feature Integration

### 1. **Always Provide Defaults**

```typescript
// ✅ GOOD: Defensive loading
const loadedSettings = projectData.tool_state?.myNewFeature ?? DEFAULT_SETTINGS;
useMyStore.getState().setMyFeature(loadedSettings);

// ❌ BAD: Assuming data exists
useMyStore.getState().setMyFeature(projectData.tool_state.myNewFeature);
```

### 2. **Make New Fields Optional in Types**

```typescript
// ✅ GOOD: Optional for backwards compatibility
interface ToolState {
  // Existing required fields
  activeTool: Tool;
  
  // New feature (optional)
  myNewFeature?: MyFeatureSettings;
}

// ❌ BAD: Required field breaks old projects
interface ToolState {
  activeTool: Tool;
  myNewFeature: MyFeatureSettings; // Old projects don't have this!
}
```

### 3. **Version Your Data Structures (Future-Proofing)**

```typescript
// Good practice for major changes
interface ProjectData {
  version: number; // Start at 1
  canvas_data: any;
  tool_state: any;
}

// Migration helper
function migrateProjectData(data: any): ProjectData {
  if (!data.version || data.version === 1) {
    // Migrate v1 → v2
    return {
      version: 2,
      canvas_data: data.canvas_data,
      tool_state: {
        ...data.tool_state,
        newField: DEFAULT_VALUE, // Add missing fields
      },
    };
  }
  return data;
}
```

### 4. **Test Loading Old Projects**

```typescript
// Create test data mimicking old project structure
const oldProjectData = {
  canvas_data: { cells: [[]], gridSize: { width: 80, height: 40 } },
  tool_state: {
    activeTool: 'pencil',
    selectedCharacter: ' ',
    // Note: Missing your new feature!
  },
  animation_state: { frames: [], currentFrameIndex: 0 },
};

// Test that loading doesn't crash
loadFromCloud(oldProjectData);
// Should use defaults for missing features
```

### 5. **Document Breaking Changes**

If you change existing data structures (not just adding new ones):

```typescript
// Add to DEVELOPMENT.md
## Breaking Changes

### v2.0.0 - Tool State Restructure
- **Breaking:** `brushSettings` changed from `{ size: number }` to `{ size: number, shape: 'circle' | 'square' }`
- **Migration:** Old projects will default to `shape: 'circle'`
- **Code:** See `useProjectSync.ts` line 145
```

---

## 🗂️ Feature Categories

Organize your state by category for clarity:

### Canvas-Related Features
**Store:** `canvasStore.ts`  
**Examples:** Grid size, cell data, zoom level, pan offset

```typescript
canvas_data: {
  cells: Cell[][];
  gridSize: { width: number; height: number };
  zoom: number;
  panOffset: { x: number; y: number };
  // Add: backgroundColor, gridOpacity, etc.
}
```

### Tool-Related Features
**Store:** `toolStore.ts`  
**Examples:** Active tool, brush settings, color palette

```typescript
tool_state: {
  activeTool: Tool;
  brushSettings: BrushSettings;
  colorPalette: string[];
  // Add: spraySettings, fillSettings, etc.
}
```

### Animation-Related Features
**Store:** `animationStore.ts`  
**Examples:** Frames, playback settings, onion skinning

```typescript
animation_state: {
  frames: Frame[];
  currentFrameIndex: number;
  playbackSettings: { fps: number; loop: boolean };
  // Add: onionSkinSettings, timelineSettings, etc.
}
```

### UI Preferences (Future)
**Store:** `uiStore.ts` (create if needed)  
**Examples:** Theme, panel layout, keyboard shortcuts

```typescript
ui_state: {
  theme: 'light' | 'dark';
  panelLayout: 'default' | 'compact';
  customShortcuts: Record<string, string>;
  // Add: toolbarPosition, sidebarWidth, etc.
}
```

---

## 🧪 Testing Your Integration

### Manual Testing Checklist

- [ ] **Create project with new feature**
  - Use your new feature (e.g., set spray density to 75)
  - Save project to cloud
  - Verify data in Supabase dashboard

- [ ] **Load project with new feature**
  - Sign out, sign back in
  - Load the saved project
  - Verify feature state restored correctly

- [ ] **Load old project (without new feature)**
  - Load a project saved before your feature existed
  - Verify app doesn't crash
  - Verify defaults applied correctly

- [ ] **Auto-save works**
  - Enable auto-save
  - Change feature settings
  - Wait 30 seconds
  - Verify changes synced to cloud

- [ ] **localStorage fallback**
  - Sign out (anonymous mode)
  - Use your feature
  - Refresh page
  - Verify state persists in localStorage

### Automated Tests (Future)

```typescript
// Example test structure
describe('SprayTool Project Integration', () => {
  it('saves spray settings to project data', async () => {
    const { saveToCloud } = useProjectSync();
    
    useToolStore.getState().setSpraySettings({
      density: 80,
      radius: 7,
      randomness: 60,
    });
    
    const result = await saveToCloud('Test Project');
    expect(result.success).toBe(true);
    
    // Verify in database
    const project = await fetchProject(result.projectId);
    expect(project.tool_state.spraySettings.density).toBe(80);
  });

  it('loads spray settings from project data', async () => {
    const { loadFromCloud } = useProjectSync();
    
    await loadFromCloud('existing-project-id');
    
    const settings = useToolStore.getState().spraySettings;
    expect(settings.density).toBeDefined();
    expect(settings.radius).toBeGreaterThan(0);
  });

  it('uses defaults for old projects without spray settings', async () => {
    const { loadFromCloud } = useProjectSync();
    
    // Load project created before spray tool existed
    await loadFromCloud('old-project-id');
    
    const settings = useToolStore.getState().spraySettings;
    expect(settings.density).toBe(50); // Default value
  });
});
```

---

## 📝 Documentation Requirements

When adding a feature that integrates with project save:

### 1. Update COPILOT_INSTRUCTIONS.md

```markdown
## 🎨 **Spray Tool - Feature Integration**

**Location**: `src/components/tools/SprayTool.tsx`, `src/stores/toolStore.ts`

The Spray Tool provides randomized character placement with adjustable density and radius.

### **Settings Saved to Projects:**
- **Density** (0-100): How many characters to spray per click
- **Radius** (1-10): Spray area size
- **Randomness** (0-100): Variation in character placement

### **Integration Points:**
- State: `toolStore.spraySettings`
- Save: `useProjectSync.ts` → `tool_state.spraySettings`
- Load: Defaults to `{ density: 50, radius: 5, randomness: 75 }` if not in project
```

### 2. Update Feature Guide

```markdown
# Spray Tool User Guide

## Saving Your Settings

Your spray tool preferences are automatically saved when you save a project:
- Density, radius, and randomness settings persist
- Settings restore when you load the project
- Works across devices when signed in
```

### 3. Add Migration Notes (if applicable)

```markdown
## Migration: Spray Tool Settings (v2.1.0)

**Change:** Added spray tool settings to project save system

**Impact:** Projects saved before v2.1.0 will use default spray settings

**Action Required:** None - defaults applied automatically
```

---

## 🔐 Security Considerations

### Data Validation

Always validate loaded data to prevent injection attacks:

```typescript
// ✅ GOOD: Validate before applying
const loadSpraySettings = (data: any) => {
  const density = typeof data.density === 'number' 
    ? Math.max(0, Math.min(100, data.density))
    : 50;
  
  const radius = typeof data.radius === 'number'
    ? Math.max(1, Math.min(10, data.radius))
    : 5;
  
  return { density, radius, randomness: 75 };
};

// ❌ BAD: Trust user data blindly
useToolStore.getState().setSpraySettings(loadedData.spraySettings);
```

### Size Limits

Large data structures can exceed database limits:

```typescript
// JSONB column limit in PostgreSQL: ~1GB (practical limit much smaller)

// ✅ GOOD: Reasonable size
const canvas_data = {
  cells: 80 * 40 cells, // ~3,200 cells
  // Each cell: ~50 bytes → ~160KB total
};

// ❌ BAD: Excessive size
const canvas_data = {
  cells: 1000 * 1000 cells, // 1 million cells
  // Could exceed practical limits
};
```

**Best Practice:** Compress or limit complex data structures

---

## 🚀 Quick Reference

### Adding a Simple Setting

```typescript
// 1. Add to store
interface ToolState {
  myNewSetting: number;
}

// 2. Add to save
tool_state: {
  myNewSetting: toolState.myNewSetting,
}

// 3. Add to load
if (toolState.myNewSetting !== undefined) {
  useToolStore.getState().setMyNewSetting(toolState.myNewSetting);
}
```

### Adding a Complex Feature

```typescript
// 1. Create dedicated state slice
interface MyFeatureState {
  enabled: boolean;
  settings: MyFeatureSettings;
}

// 2. Create new top-level category in project data
interface ProjectData {
  canvas_data: any;
  tool_state: any;
  animation_state: any;
  my_feature_state: MyFeatureState; // New category
}

// 3. Update database schema if needed
alter table projects add column my_feature_state jsonb;

// 4. Update save/load logic
```

---

## ❓ Common Questions

**Q: Do I need to update the database schema?**  
A: No, if you're adding data within existing JSONB columns (`canvas_data`, `tool_state`, `animation_state`). JSONB is schema-less.

**Q: What if my feature has sensitive data?**  
A: Consider encryption or storing separately with stricter RLS policies. Consult security docs.

**Q: How do I handle feature removal?**  
A: Keep loading logic for backwards compatibility, but stop saving new data. Document deprecation.

**Q: Can I add binary data (images, videos)?**  
A: No, use Supabase Storage for files. Store file URLs in project data.

---

**Questions?** See `docs/AUTH_IMPLEMENTATION_PLAN.md` for project sync architecture details.
