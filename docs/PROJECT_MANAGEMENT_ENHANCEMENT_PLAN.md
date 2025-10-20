# Project Management Enhancement - Implementation Plan

**Status:** 📋 Planned  
**Last Updated:** October 16, 2025  
**Feature Category:** Core Project Management  

---

## 📋 Overview

This document outlines the implementation of enhanced project management controls, including:

1. **New Project Dialog** - Clean slate project creation with configuration
2. **Project Settings Dialog** - Edit project metadata and canvas dimensions
3. **Project Metadata** - Name and description tracking throughout the app lifecycle
4. **Menu Integration** - Hamburger menu updates for easy access

---

## 🎯 Requirements

### Inline Project Name Editor (NEW - Header Component)

**Location:** Center of header bar, between ASCII logo and Import/Export buttons

**Features:**
- **Display Mode:**
  - Shows current project name as clickable text
  - Hover effect (purple highlight)
  - Tooltip: "Click to edit project name"
  
- **Edit Mode:**
  - Click to activate inline editing
  - Text input with current name pre-filled and selected
  - Check mark button (✓) to save - green color
  - X button to cancel - red color
  - Keyboard shortcuts:
    - **Enter** - Save changes
    - **Escape** - Cancel changes
  - Validation: Non-empty name required
  - Auto-focus and auto-select on edit mode

**UX Benefits:**
- ✅ Always visible - users know what project they're working on
- ✅ Quick inline editing - no need to open settings dialog
- ✅ Keyboard-friendly - Enter/Esc support
- ✅ Clear visual feedback - check/x buttons with tooltips
- ✅ Consistent with project settings dialog

### New Project Dialog

**Menu Item:**
- **Location:** Top of hamburger menu
- **Label:** "New project"
- **Icon:** `file-plus-2` (lucide-react)
- **Section:** Separate from existing items with section divider

**Dialog Features:**
- **Project name** text input (required)
- **Description** textarea (optional)
- **Canvas size** controls:
  - Width input (characters) with +/- buttons (4-200 range)
  - Height input (characters) with +/- buttons (4-100 range)
  - Default: 80x24 (standard terminal size)
- **Close/Cancel:** X button in corner + clicking outside dialog
- **Create:** Primary button that:
  - Validates inputs
  - Clears current project state
  - Initializes fresh canvas with specified dimensions
  - Creates single blank frame
  - Sets project name and description

### Project Settings Dialog

**Menu Item:**
- **Location:** Above "Keyboard Shortcuts" in hamburger menu
- **Label:** "Project settings"
- **Icon:** `gear` (lucide-react)
- **Section:** Separate with section divider

**Dialog Features:**
- **Project name** text input (editable)
- **Description** textarea (optional, editable)
- **Canvas size** controls:
  - Width input with +/- buttons (4-200 range)
  - Height input with +/- buttons (4-100 range)
  - **Warning:** Displays if resizing will crop content
- **Save:** Primary button that applies all changes
- **Cancel:** Secondary button that reverts edits
- **Close:** X button + clicking outside also cancels

**Behavior:**
- Changes affect:
  - Current canvas dimensions
  - Export metadata (name/description in .asciimtn files)
  - Cloud save metadata (if using premium features)
  - UI display (project name in dialogs, etc.)
- Canvas resize follows existing history integration
- All changes are atomic (save applies all or cancel reverts all)

---

## 🏗️ Architecture

### State Management

**New Zustand Store:** `useProjectMetadataStore`

```typescript
interface ProjectMetadataState {
  // Project metadata
  projectName: string;
  projectDescription: string;
  
  // Actions
  setProjectName: (name: string) => void;
  setProjectDescription: (description: string) => void;
  resetProject: () => void;
}
```

**Dialog State Hook:** `useProjectDialogState`

```typescript
interface ProjectDialogState {
  showNewProjectDialog: boolean;
  showProjectSettingsDialog: boolean;
  setShowNewProjectDialog: (show: boolean) => void;
  setShowProjectSettingsDialog: (show: boolean) => void;
}
```

### Component Structure

```
src/components/features/
├── InlineProjectNameEditor.tsx   # NEW - Header inline editor component
├── NewProjectDialog.tsx          # New project creation dialog
├── ProjectSettingsDialog.tsx     # Project settings editor dialog
└── HamburgerMenu.tsx            # Updated with new menu items

src/hooks/
└── useProjectDialogState.ts     # Dialog state management

src/stores/
└── projectMetadataStore.ts      # Project metadata state (shared by all components)

src/types/
└── project.ts                   # Project metadata types
```

---

## 📝 Implementation Details

### 1. Project Metadata Store

**File:** `src/stores/projectMetadataStore.ts`

```typescript
import { create } from 'zustand';

interface ProjectMetadataState {
  projectName: string;
  projectDescription: string;
  
  setProjectName: (name: string) => void;
  setProjectDescription: (description: string) => void;
  resetProject: () => void;
}

export const useProjectMetadataStore = create<ProjectMetadataState>((set) => ({
  projectName: 'Untitled Project',
  projectDescription: '',
  
  setProjectName: (name) => set({ projectName: name }),
  setProjectDescription: (description) => set({ projectDescription: description }),
  resetProject: () => set({ 
    projectName: 'Untitled Project', 
    projectDescription: '' 
  }),
}));
```

### 2. Dialog State Hook

**File:** `src/hooks/useProjectDialogState.ts`

```typescript
import { create } from 'zustand';

interface ProjectDialogState {
  showNewProjectDialog: boolean;
  showProjectSettingsDialog: boolean;
  setShowNewProjectDialog: (show: boolean) => void;
  setShowProjectSettingsDialog: (show: boolean) => void;
}

export const useProjectDialogState = create<ProjectDialogState>((set) => ({
  showNewProjectDialog: false,
  showProjectSettingsDialog: false,
  setShowNewProjectDialog: (show) => set({ showNewProjectDialog: show }),
  setShowProjectSettingsDialog: (show) => set({ showProjectSettingsDialog: show }),
}));
```

### 3. New Project Dialog Component

**File:** `src/components/features/NewProjectDialog.tsx`

**Key Features:**
- Project name input (text field)
- Description textarea (optional)
- Canvas size picker with +/- buttons (following `CanvasSizePicker` pattern)
- Input validation (name required, dimensions 4-200 x 4-100)
- Clean project initialization

**Implementation Pattern:**

```tsx
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { FilePlus2 } from 'lucide-react';
import { useProjectDialogState } from '../../hooks/useProjectDialogState';
import { useProjectMetadataStore } from '../../stores/projectMetadataStore';
import { useCanvasStore } from '../../stores/canvasStore';
import { useAnimationStore } from '../../stores/animationStore';
import { useToolStore } from '../../stores/toolStore';

export function NewProjectDialog() {
  const { showNewProjectDialog, setShowNewProjectDialog } = useProjectDialogState();
  const { setProjectName, setProjectDescription } = useProjectMetadataStore();
  const { setCanvasSize, clearCanvas } = useCanvasStore();
  const { resetAnimation } = useAnimationStore();
  const { clearHistory } = useToolStore();
  
  const [name, setName] = useState('Untitled Project');
  const [description, setDescription] = useState('');
  const [width, setWidth] = useState(80);
  const [height, setHeight] = useState(24);

  const handleCreate = () => {
    if (!name.trim()) {
      alert('Please enter a project name');
      return;
    }

    // Set project metadata
    setProjectName(name.trim());
    setProjectDescription(description.trim());
    
    // Initialize canvas
    setCanvasSize(width, height);
    clearCanvas();
    
    // Reset animation to single frame
    resetAnimation();
    
    // Clear undo/redo history
    clearHistory();
    
    // Close dialog
    setShowNewProjectDialog(false);
    
    // Reset form for next time
    setName('Untitled Project');
    setDescription('');
    setWidth(80);
    setHeight(24);
  };

  const handleClose = () => {
    setShowNewProjectDialog(false);
    // Reset form
    setName('Untitled Project');
    setDescription('');
    setWidth(80);
    setHeight(24);
  };

  return (
    <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
      <DialogContent className="sm:max-w-[500px] border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus2 className="h-5 w-5" />
            New Project
          </DialogTitle>
          <DialogDescription>
            Create a new ASCII Motion project with a fresh canvas
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Project Name */}
          <div className="grid gap-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="project-description">Description (optional)</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for your project"
              rows={3}
            />
          </div>

          {/* Canvas Size */}
          <div className="grid gap-2">
            <Label>Canvas size (characters)</Label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label htmlFor="canvas-width" className="text-xs text-muted-foreground">
                  Width
                </Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="canvas-width"
                    type="number"
                    min="4"
                    max="200"
                    value={width}
                    onChange={(e) => setWidth(Math.max(4, Math.min(200, parseInt(e.target.value) || 4)))}
                    className="text-center"
                  />
                  <div className="flex flex-col">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setWidth(Math.min(200, width + 1))}
                      className="h-4 w-6 p-0 rounded-l-none rounded-br-none border-l-0 text-xs"
                    >
                      +
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setWidth(Math.max(4, width - 1))}
                      className="h-4 w-6 p-0 rounded-l-none rounded-tr-none border-l-0 border-t-0 text-xs"
                    >
                      −
                    </Button>
                  </div>
                </div>
              </div>

              <span className="text-muted-foreground">×</span>

              <div className="flex-1">
                <Label htmlFor="canvas-height" className="text-xs text-muted-foreground">
                  Height
                </Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="canvas-height"
                    type="number"
                    min="4"
                    max="100"
                    value={height}
                    onChange={(e) => setHeight(Math.max(4, Math.min(100, parseInt(e.target.value) || 4)))}
                    className="text-center"
                  />
                  <div className="flex flex-col">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setHeight(Math.min(100, height + 1))}
                      className="h-4 w-6 p-0 rounded-l-none rounded-br-none border-l-0 text-xs"
                    >
                      +
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setHeight(Math.max(4, height - 1))}
                      className="h-4 w-6 p-0 rounded-l-none rounded-tr-none border-l-0 border-t-0 text-xs"
                    >
                      −
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>
            Create Project
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 4. Project Settings Dialog Component

**File:** `src/components/features/ProjectSettingsDialog.tsx`

**Key Features:**
- Editable project name and description
- Canvas size controls (with resize warning if content exists)
- Save/Cancel with proper state management
- All changes are atomic

**Implementation Pattern:**

```tsx
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { Settings, AlertTriangle } from 'lucide-react';
import { useProjectDialogState } from '../../hooks/useProjectDialogState';
import { useProjectMetadataStore } from '../../stores/projectMetadataStore';
import { useCanvasStore } from '../../stores/canvasStore';
import { useAnimationStore } from '../../stores/animationStore';
import { useToolStore } from '../../stores/toolStore';

export function ProjectSettingsDialog() {
  const { showProjectSettingsDialog, setShowProjectSettingsDialog } = useProjectDialogState();
  const { projectName, projectDescription, setProjectName, setProjectDescription } = useProjectMetadataStore();
  const { width, height, setCanvasSize, getCellCount } = useCanvasStore();
  const { pushCanvasResizeHistory } = useToolStore();
  const { currentFrameIndex } = useAnimationStore();
  
  const [localName, setLocalName] = useState(projectName);
  const [localDescription, setLocalDescription] = useState(projectDescription);
  const [localWidth, setLocalWidth] = useState(width);
  const [localHeight, setLocalHeight] = useState(height);

  // Sync local state when dialog opens or project metadata changes
  useEffect(() => {
    if (showProjectSettingsDialog) {
      setLocalName(projectName);
      setLocalDescription(projectDescription);
      setLocalWidth(width);
      setLocalHeight(height);
    }
  }, [showProjectSettingsDialog, projectName, projectDescription, width, height]);

  const handleSave = () => {
    if (!localName.trim()) {
      alert('Please enter a project name');
      return;
    }

    // Update project metadata
    setProjectName(localName.trim());
    setProjectDescription(localDescription.trim());
    
    // Update canvas size if changed
    if (localWidth !== width || localHeight !== height) {
      const previousCells = new Map(useCanvasStore.getState().cells);
      setCanvasSize(localWidth, localHeight);
      
      // Record in history
      pushCanvasResizeHistory(
        width,
        height,
        localWidth,
        localHeight,
        previousCells,
        currentFrameIndex
      );
    }
    
    setShowProjectSettingsDialog(false);
  };

  const handleCancel = () => {
    // Revert to original values
    setLocalName(projectName);
    setLocalDescription(projectDescription);
    setLocalWidth(width);
    setLocalHeight(height);
    setShowProjectSettingsDialog(false);
  };

  const hasChanges = 
    localName !== projectName || 
    localDescription !== projectDescription ||
    localWidth !== width ||
    localHeight !== height;

  const willCropContent = 
    (localWidth < width || localHeight < height) && 
    getCellCount() > 0;

  return (
    <Dialog open={showProjectSettingsDialog} onOpenChange={setShowProjectSettingsDialog}>
      <DialogContent className="sm:max-w-[500px] border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Project Settings
          </DialogTitle>
          <DialogDescription>
            Edit project metadata and canvas settings
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Project Name */}
          <div className="grid gap-2">
            <Label htmlFor="settings-project-name">Project name</Label>
            <Input
              id="settings-project-name"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder="Enter project name"
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="settings-project-description">Description (optional)</Label>
            <Textarea
              id="settings-project-description"
              value={localDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
              placeholder="Add a description for your project"
              rows={3}
            />
          </div>

          {/* Canvas Size Warning */}
          {willCropContent && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Reducing canvas size will crop content outside the new dimensions.
                This action can be undone.
              </AlertDescription>
            </Alert>
          )}

          {/* Canvas Size */}
          <div className="grid gap-2">
            <Label>Canvas size (characters)</Label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label htmlFor="settings-canvas-width" className="text-xs text-muted-foreground">
                  Width
                </Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="settings-canvas-width"
                    type="number"
                    min="4"
                    max="200"
                    value={localWidth}
                    onChange={(e) => setLocalWidth(Math.max(4, Math.min(200, parseInt(e.target.value) || 4)))}
                    className="text-center"
                  />
                  <div className="flex flex-col">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setLocalWidth(Math.min(200, localWidth + 1))}
                      className="h-4 w-6 p-0 rounded-l-none rounded-br-none border-l-0 text-xs"
                    >
                      +
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setLocalWidth(Math.max(4, localWidth - 1))}
                      className="h-4 w-6 p-0 rounded-l-none rounded-tr-none border-l-0 border-t-0 text-xs"
                    >
                      −
                    </Button>
                  </div>
                </div>
              </div>

              <span className="text-muted-foreground">×</span>

              <div className="flex-1">
                <Label htmlFor="settings-canvas-height" className="text-xs text-muted-foreground">
                  Height
                </Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="settings-canvas-height"
                    type="number"
                    min="4"
                    max="100"
                    value={localHeight}
                    onChange={(e) => setLocalHeight(Math.max(4, Math.min(100, parseInt(e.target.value) || 4)))}
                    className="text-center"
                  />
                  <div className="flex flex-col">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setLocalHeight(Math.min(100, localHeight + 1))}
                      className="h-4 w-6 p-0 rounded-l-none rounded-br-none border-l-0 text-xs"
                    >
                      +
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setLocalHeight(Math.max(4, localHeight - 1))}
                      className="h-4 w-6 p-0 rounded-l-none rounded-tr-none border-l-0 border-t-0 text-xs"
                    >
                      −
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 5. Create Inline Project Name Editor Component

**File:** `src/components/features/InlineProjectNameEditor.tsx`

**Key Features:**
- Shows current project name in header (centered)
- Click to edit mode
- Check mark to save, X to cancel
- ESC key to cancel, Enter key to save
- Auto-focus on edit mode
- Validates non-empty name

**Implementation:**

```tsx
import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Check, X } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { useProjectMetadataStore } from '../../stores/projectMetadataStore';

export function InlineProjectNameEditor() {
  const { projectName, setProjectName } = useProjectMetadataStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(projectName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync editValue when projectName changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(projectName);
    }
  }, [projectName, isEditing]);

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setEditValue(projectName);
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue) {
      setProjectName(trimmedValue);
      setIsEditing(false);
    } else {
      // Don't allow empty names
      setEditValue(projectName);
    }
  };

  const handleCancel = () => {
    setEditValue(projectName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 px-2 text-sm max-w-[300px]"
          placeholder="Project name"
        />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={!editValue.trim()}
                className="h-7 w-7 p-0"
              >
                <Check className="h-4 w-4 text-green-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save (Enter)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="h-7 w-7 p-0"
              >
                <X className="h-4 w-4 text-red-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cancel (Esc)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleStartEdit}
            className="text-sm font-medium text-foreground hover:text-purple-500 transition-colors cursor-pointer px-3 py-1 rounded hover:bg-accent"
          >
            {projectName}
          </button>
        </TooltipTrigger>
        <TooltipContent>Click to edit project name</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

### 6. Update App.tsx Header to Include Inline Editor

**File:** `src/App.tsx`

**Changes:**

```tsx
// Add import
import { InlineProjectNameEditor } from './components/features/InlineProjectNameEditor';

// Update header structure:
<div className="flex gap-3 relative items-center">
  <HamburgerMenu />
  
  {/* ASCII Motion Logo */}
  <div
    className="ascii-logo ascii-logo-selectable font-mono tracking-tighter whitespace-pre"
    aria-label="ASCII Motion logo"
  >
    <span className="text-purple-500">----▗▄▖  ▗▄▄▖ ▗▄▄▖▗▄▄▄▖▗▄▄▄▖    ▗▖  ▗▖ ▗▄▖▗▄▄▄▖▗▄▄▄▖ ▗▄▖ ▗▖  ▗▖</span>
    {'\n'}
    <span className="text-purple-500">   ▐▌ ▐▌▐▌   ▐▌     ▐▌    ▐▌    ▐▛▚▖▐▌▐▌ ▐▌ ▐▌    ▐▌  ▐▌ ▐▌▐▛▚▞▜▌</span>
    {'\n'}
    <span className="text-purple-500">   ▐▛▀▜▌ ▝▀▚▖▐▌     ▐▌    ▐▌    ▐▌ ▝▜▌▐▌ ▐▌ ▐▌    ▐▌  ▐▌ ▐▌▐▌  ▐▌</span>
    {'\n'}
    <span className="text-purple-500">   ▐▌ ▐▌▗▄▄▞▘▝▚▄▄▖▗▄▄▄▖▗▄▄▄▖    ▐▌  ▐▌▝▚▄▞▘ ▐▌  ▗▄▞▘ ▝▚▄▞▘▐▌  ▐▌</span>
  </div>
  
  {/* NEW: Inline Project Name Editor (centered) */}
  <div className="flex-1 flex justify-center">
    <InlineProjectNameEditor />
  </div>
</div>
```

**Visual Layout:**
```
[Hamburger] [ASCII Motion Logo]     [Project Name]     [Import] [Export] [Theme]
```

### 7. Update HamburgerMenu

**File:** `src/components/features/HamburgerMenu.tsx`

**Changes:**

```tsx
// Add imports
import { FilePlus2, Settings } from 'lucide-react';
import { useProjectDialogState } from '../../hooks/useProjectDialogState';

// In component:
const { 
  setShowNewProjectDialog,
  setShowProjectSettingsDialog,
} = useProjectDialogState();

// Menu structure:
<MenubarContent align="start" className="border-border/50">
  {/* NEW: New Project (at top) */}
  <MenubarItem onClick={() => setShowNewProjectDialog(true)} className="cursor-pointer">
    <FilePlus2 className="mr-2 h-4 w-4" />
    <span>New Project</span>
  </MenubarItem>
  
  <MenubarSeparator />
  
  {/* Existing cloud items if authenticated */}
  {user && (
    <>
      <MenubarItem onClick={() => setShowSaveToCloudDialog(true)} className="cursor-pointer">
        <CloudUpload className="mr-2 h-4 w-4" />
        <span>Save Project</span>
      </MenubarItem>
      
      <MenubarItem onClick={() => setShowProjectsDialog(true)} className="cursor-pointer">
        <CloudDownload className="mr-2 h-4 w-4" />
        <span>Open Project</span>
      </MenubarItem>
      
      <MenubarSeparator />
    </>
  )}
  
  {/* NEW: Project Settings (above Keyboard Shortcuts) */}
  <MenubarItem onClick={() => setShowProjectSettingsDialog(true)} className="cursor-pointer">
    <Settings className="mr-2 h-4 w-4" />
    <span>Project Settings</span>
  </MenubarItem>
  
  <MenubarSeparator />
  
  {/* Existing items */}
  <MenubarItem onClick={() => setShowKeyboardShortcuts(true)} className="cursor-pointer">
    <Keyboard className="mr-2 h-4 w-4" />
    <span>Keyboard Shortcuts</span>
  </MenubarItem>
  
  <MenubarItem onClick={() => setShowAboutDialog(true)} className="cursor-pointer">
    <Info className="mr-2 h-4 w-4" />
    <span>About</span>
  </MenubarItem>
</MenubarContent>
```

### 6. Update Export Data Collector

**File:** `src/utils/exportDataCollector.ts`

**⚠️ CRITICAL: This ensures ALL export dialogs get project metadata automatically**

**Changes:**

```typescript
// Import project metadata store
import { useProjectMetadataStore } from '../stores/projectMetadataStore';

// In useExportDataCollector hook:
export const useExportDataCollector = (): ExportDataBundle => {
  // Get project metadata (SINGLE SOURCE OF TRUTH)
  const { projectName, projectDescription } = useProjectMetadataStore();
  
  // ... existing code ...
  
  return {
    // Add project metadata at collection time
    // This ensures ALL exports (image, video, session, HTML, JSON, React, cloud)
    // automatically include the current project name and description
    name: projectName,
    description: projectDescription || undefined,
    
    // ... existing fields ...
  };
};
```

**Benefits:**
- ✅ **Single source of truth** - All exports use same metadata
- ✅ **No manual overrides needed** - Dialogs don't need to add name/description
- ✅ **Consistent across formats** - PNG, MP4, .asciimtn, cloud saves all match
- ✅ **Auto-updates** - Change project name once, all exports reflect it

### 7. Clean Up Export Dialogs (Remove Manual Metadata Injection)

**⚠️ IMPORTANT: Remove redundant metadata assignment now that exportDataCollector handles it**

**Files to Update:**

1. **`src/components/features/SessionExportDialog.tsx`**

```typescript
// BEFORE (redundant):
const dataWithMetadata = {
  ...exportData,
  name: filename.trim(),
  description: description.trim() || undefined,
};
await renderer.exportSession(dataWithMetadata, sessionSettings, filename);

// AFTER (clean - exportData already has metadata):
await renderer.exportSession(exportData, sessionSettings, filename);
```

2. **`src/components/features/SaveToCloudDialog.tsx`**

```typescript
// BEFORE (redundant):
const dataWithMetadata = {
  ...exportData,
  name: projectName.trim(),
  description: description.trim() || undefined,
};
const project = await handleSaveToCloud(dataWithMetadata, projectName.trim(), description.trim() || undefined);

// AFTER (clean - exportData already has metadata):
const project = await handleSaveToCloud(exportData, projectName.trim(), description.trim() || undefined);
```

**Why This Matters:**
- Prevents confusion about where metadata comes from
- Ensures UI displays match actual export metadata
- Reduces code duplication
- Makes project name/description changes instant across all exports

### 8. Update Export Dialog UIs to Show Project Metadata

**⚠️ ENHANCEMENT: Display current project name in export dialogs**

**Files to Consider:**

1. **`SessionExportDialog.tsx`** - Consider pre-filling filename from `exportData.name`
2. **`SaveToCloudDialog.tsx`** - Already uses `currentProjectName` ✓
3. **Other export dialogs** - Could show "Exporting: [Project Name]" in description

**Example Enhancement:**

```typescript
// SessionExportDialog.tsx
const [filename, setFilename] = useState(exportData?.name || 'ascii-motion-project');
const [description, setDescription] = useState(exportData?.description || '');

// Show current project name in dialog description
<DialogDescription>
  Exporting project: <strong>{exportData?.name}</strong>
</DialogDescription>
```

### 9. Update App.tsx to Render Dialogs

**File:** `src/App.tsx`

**Changes:**

```tsx
// Add imports
import { NewProjectDialog } from './components/features/NewProjectDialog';
import { ProjectSettingsDialog } from './components/features/ProjectSettingsDialog';

// Add dialog components (inside CanvasProvider)
<NewProjectDialog />
<ProjectSettingsDialog />
```

### 10. Update Animation Store for Reset

**File:** `src/stores/animationStore.ts`

**Add reset method:**

```typescript
interface AnimationActions {
  // ... existing actions ...
  resetAnimation: () => void;
}

// In store implementation:
resetAnimation: () => set((state) => {
  const newFrame: Frame = {
    id: generateId() as FrameId,
    name: 'Frame 1',
    duration: 100,
    data: new Map(),
  };
  
  return {
    frames: [newFrame],
    currentFrameIndex: 0,
    isPlaying: false,
  };
}),
```

### 11. Add Clear History to Tool Store

**File:** `src/stores/toolStore.ts`

**Add method if not exists:**

```typescript
interface ToolActions {
  // ... existing actions ...
  clearHistory: () => void;
}

// In store:
clearHistory: () => set({ 
  history: [], 
  historyIndex: -1 
}),
```

---

## 🔄 Data Flow

### New Project Creation Flow

```
User clicks "New Project" in menu
  → NewProjectDialog opens
  → User enters name, description, canvas size
  → User clicks "Create Project"
    → Validate inputs
    → Set project metadata (name, description)
    → Set canvas size
    → Clear canvas cells
    → Reset animation (single blank frame)
    → Clear undo/redo history
    → Close dialog
```

### Project Settings Edit Flow

```
User clicks "Project Settings" in menu
  → ProjectSettingsDialog opens
  → Dialog loads current values
  → User edits name, description, or canvas size
  → User clicks "Save Changes"
    → Validate inputs
    → Update project metadata
    → Update canvas size (with history if changed)
    → Close dialog
```

### Export Integration Flow

```
User exports project (any format)
  → exportDataCollector gathers data
    → Automatically includes projectName from projectMetadataStore
    → Automatically includes projectDescription from projectMetadataStore
  → Export dialog receives pre-populated exportData
  → Export file contains metadata (PNG EXIF, MP4 tags, .asciimtn, etc.)
  → Cloud save includes metadata
  → Session file includes metadata
  → HTML export includes metadata in <head> tags
  → JSON export includes metadata object
```

**Key Point:** Project metadata flows **automatically** from store → collector → all exports, with NO manual intervention needed in export dialogs.

---

## 🎨 UI/UX Considerations

### Visual Design

- **Header Layout:** Balanced 3-section layout (Hamburger+Logo | Project Name | Import+Export+Theme)
- **Inline Editor:** Clean, minimal design - looks like text until interacted with
- **Edit Mode:** Clear visual distinction with input border and action buttons
- **Color Coding:** Green check (save) / Red X (cancel) for clear intent
- **Consistent Input Pattern:** Canvas size inputs follow `MediaImportPanel` pattern with +/- buttons
- **Validation Feedback:** Clear error messages for invalid inputs
- **Warning Alerts:** Show destructive action warnings (canvas resize cropping)
- **Disabled States:** Save button disabled when no changes made or invalid input
- **Loading States:** Consider adding loading indicator for operations

### Accessibility

- **Header Focus:** Inline editor accessible via click and keyboard navigation
- **Focus Management:** Auto-focus on project name input when entering edit mode
- **Keyboard Shortcuts:**
  - **Enter:** Save changes (inline editor & dialogs)
  - **Escape:** Cancel changes (inline editor & dialogs)
  - **Tab:** Navigate between fields in dialogs
- **ARIA Labels:** Proper labels for all inputs and buttons
- **Tooltips:** Descriptive tooltips for inline editor actions
- **Screen Readers:** Proper announcement of edit mode changes

### User Feedback

- **Always Visible:** Project name always visible in header
- **Quick Edit:** One click to edit, Enter/Esc to confirm/cancel
- **Visual Feedback:** Hover states, focus states, button color coding
- **Success:** Dialog closes smoothly after successful operations
- **Errors:** Alert dialogs for validation failures (empty names)
- **Warnings:** Alert component for destructive actions (canvas resize)
- **State Persistence:** Form resets after successful creation, preserves on cancel
- **Sync Feedback:** Changes in one place (inline/settings/new) reflect everywhere instantly

---

## 🧪 Testing Checklist

### Inline Project Name Editor

- [ ] Displays current project name in header (centered)
- [ ] Hover effect shows it's clickable
- [ ] Tooltip appears on hover
- [ ] Click enters edit mode
- [ ] Input auto-focuses and selects text
- [ ] Check button saves changes
- [ ] X button cancels changes
- [ ] Enter key saves changes
- [ ] Escape key cancels changes
- [ ] Validation prevents empty names
- [ ] Changes sync with project settings dialog
- [ ] Changes sync with export dialogs
- [ ] Changes appear in all future exports
- [ ] Visual feedback (green check, red X)
- [ ] Tooltips on action buttons

### New Project Dialog

- [ ] Dialog opens from hamburger menu
- [ ] Project name is required (validation)
- [ ] Description is optional
- [ ] Canvas size respects min/max bounds (4-200 x 4-100)
- [ ] +/- buttons work correctly
- [ ] Direct input works with validation
- [ ] Create button initializes clean project
- [ ] Cancel button closes without changes
- [ ] X button closes without changes
- [ ] Clicking outside closes without changes
- [ ] Form resets after successful creation
- [ ] Created project name appears in header inline editor

### Project Settings Dialog

- [ ] Dialog opens from hamburger menu
- [ ] Current values load correctly
- [ ] Project name is required (validation)
- [ ] Description is optional
- [ ] Canvas size respects min/max bounds
- [ ] Warning shows when resize will crop
- [ ] Save button disabled when no changes
- [ ] Save applies all changes atomically
- [ ] Canvas resize integrates with history
- [ ] Cancel reverts all changes
- [ ] X button cancels changes
- [ ] Clicking outside cancels changes

### Integration

- [ ] Project metadata appears in ALL export formats automatically:
  - [ ] PNG exports (EXIF metadata)
  - [ ] JPEG exports (EXIF metadata)
  - [ ] SVG exports (metadata tags)
  - [ ] MP4/WebM video exports (metadata tags)
  - [ ] Session files (.asciimtn)
  - [ ] JSON exports (metadata object)
  - [ ] HTML exports (meta tags)
  - [ ] React component exports (comments)
  - [ ] Text exports (header comment)
  - [ ] Cloud saves (database fields)
- [ ] Changing project name in settings updates ALL future exports
- [ ] Export dialog filename suggestions use project name
- [ ] SessionExportDialog no longer manually adds metadata
- [ ] SaveToCloudDialog no longer manually adds metadata
- [ ] Multiple projects can be created
- [ ] Settings persist across sessions (when saved)
- [ ] Undo/redo works after canvas resize from settings
- [ ] No console errors or warnings
- [ ] No memory leaks from dialogs

### Edge Cases

- [ ] Empty project name handling
- [ ] Very long project names (truncation/overflow)
- [ ] Very long descriptions (textarea scrolling)
- [ ] Canvas resize to same dimensions (no-op)
- [ ] Canvas resize while playing animation
- [ ] Rapid dialog open/close cycles
- [ ] Multiple dialog instances (should not happen)

---

## 📦 Files to Create/Modify

### New Files

```
src/stores/projectMetadataStore.ts                 # Zustand store for project metadata
src/hooks/useProjectDialogState.ts                # Dialog state management
src/components/features/InlineProjectNameEditor.tsx  # NEW - Header inline editor
src/components/features/NewProjectDialog.tsx      # New project creation dialog
src/components/features/ProjectSettingsDialog.tsx # Project settings editor
docs/PROJECT_MANAGEMENT_ENHANCEMENT_PLAN.md (this file)
```

### Modified Files (Core Implementation)

```
src/components/features/HamburgerMenu.tsx         # Add menu items
src/utils/exportDataCollector.ts                  # ⚠️ CRITICAL - Single source of truth for metadata
src/App.tsx                                        # Add header inline editor + render dialogs
src/stores/animationStore.ts                      # Add resetAnimation method
src/stores/toolStore.ts                            # Verify clearHistory exists
```

### Modified Files (Cleanup - Remove Manual Metadata Injection)

```
src/components/features/SessionExportDialog.tsx ⚠️ Remove manual name/description override
src/components/features/SaveToCloudDialog.tsx ⚠️ Remove manual name/description override
```

### Files That Automatically Benefit (No Changes Needed)

```
src/components/features/ImageExportDialog.tsx ✓ Metadata flows automatically
src/components/features/VideoExportDialog.tsx ✓ Metadata flows automatically
src/components/features/HtmlExportDialog.tsx ✓ Metadata flows automatically
src/components/features/JsonExportDialog.tsx ✓ Metadata flows automatically
src/components/features/TextExportDialog.tsx ✓ Metadata flows automatically
src/components/features/ReactExportDialog.tsx ✓ Metadata flows automatically
```

---

## 🚀 Implementation Steps

### Phase 1: Foundation (30 min)

1. ✅ Create `projectMetadataStore.ts`
2. ✅ Create `useProjectDialogState.ts`
3. ✅ Update `animationStore.ts` (add resetAnimation)
4. ✅ Update `toolStore.ts` (verify clearHistory)

### Phase 2: Inline Project Name Editor (30 min)

5. ✅ Create `InlineProjectNameEditor.tsx`
6. ✅ Implement display mode with hover
7. ✅ Implement edit mode with input
8. ✅ Add check/cancel buttons
9. ✅ Add keyboard shortcuts (Enter/Esc)
10. ✅ Add validation and auto-focus
11. ✅ Update `App.tsx` header layout

### Phase 3: New Project Dialog (45 min)

12. ✅ Create `NewProjectDialog.tsx`
13. ✅ Implement project name input
14. ✅ Implement description textarea
15. ✅ Implement canvas size controls
16. ✅ Implement create/cancel logic
17. ✅ Add validation

### Phase 4: Project Settings Dialog (45 min)

18. ✅ Create `ProjectSettingsDialog.tsx`
19. ✅ Implement editable metadata fields
20. ✅ Implement canvas size controls
21. ✅ Add resize warning
22. ✅ Implement save/cancel logic

### Phase 5: Menu Integration (20 min)

23. ✅ Update `HamburgerMenu.tsx`
24. ✅ Add "New Project" menu item
25. ✅ Add "Project Settings" menu item
26. ✅ Add section dividers

### Phase 6: Export Integration (30 min) ⚠️ CRITICAL FOR METADATA

27. ✅ Update `exportDataCollector.ts` to include project metadata
28. ✅ **Clean up `SessionExportDialog.tsx`** - Remove manual metadata injection
29. ✅ **Clean up `SaveToCloudDialog.tsx`** - Remove manual metadata injection
30. ✅ Update `App.tsx` to render new dialogs
31. ✅ Test that ALL export formats include metadata
32. ✅ Verify metadata changes propagate instantly

### Phase 7: Testing & Polish (45 min)

33. ✅ Test inline editor:
   - Click to edit functionality
   - Check/cancel buttons work
   - Enter/Esc keyboard shortcuts
   - Validation prevents empty names
   - Changes sync with dialogs
34. ✅ Test all export formats receive metadata:
   - Session file (.asciimtn)
   - Cloud saves
   - Image exports (PNG/JPEG/SVG)
   - Video exports (MP4/WebM)
   - HTML/JSON/Text exports
35. ✅ Test project name changes reflect everywhere:
   - Header inline editor
   - Export dialogs
   - Project settings dialog
   - All export file metadata
36. ✅ Edge case testing
37. ✅ UI/UX polish
38. ✅ Documentation updates

**Total Estimated Time:** ~4 hours (increased for inline editor + comprehensive testing)

---

## 📚 Related Documentation

- [`COPILOT_INSTRUCTIONS.md`](../COPILOT_INSTRUCTIONS.md) - Project guidelines
- [`DEVELOPMENT.md`](../DEVELOPMENT.md) - Development workflow
- [`docs/DIALOG_COMPONENT_AUDIT.md`](./DIALOG_COMPONENT_AUDIT.md) - Dialog patterns
- [`packages/premium/docs/CLOUD_STORAGE_*.md`](../packages/premium/docs/) - Cloud integration

---

## 🎯 Success Criteria

- ✅ Header displays current project name prominently
- ✅ Users can quick-edit project name inline from header
- ✅ Users can create new projects with custom names and canvas sizes
- ✅ Users can edit full project metadata via settings dialog
- ✅ All three editing methods (inline, settings dialog, new project) stay synchronized
- ✅ Project metadata appears in all export formats automatically
- ✅ Changes to project name reflect instantly everywhere
- ✅ UI follows established design patterns
- ✅ Keyboard shortcuts work (Enter/Esc)
- ✅ No regressions in existing functionality
- ✅ All tests pass
- ✅ Zero lint warnings

---

**Last Updated:** October 16, 2025  
**Implementation Status:** 📋 Ready for Development
