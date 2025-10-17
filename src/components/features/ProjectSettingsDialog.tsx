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
import { Settings } from 'lucide-react';
import { useProjectDialogState } from '../../hooks/useProjectDialogState';
import { useProjectMetadataStore } from '../../stores/projectMetadataStore';
import { useCanvasStore } from '../../stores/canvasStore';

/**
 * Project Settings Dialog
 * 
 * Edits existing project metadata:
 * - Project name
 * - Description
 * - Canvas size (with warning about data loss on resize)
 */
export function ProjectSettingsDialog() {
  const { showProjectSettingsDialog, setShowProjectSettingsDialog } = useProjectDialogState();
  const { projectName, projectDescription, setProjectName, setProjectDescription } = useProjectMetadataStore();
  const { width: canvasWidth, height: canvasHeight, setCanvasSize } = useCanvasStore();
  
  const [name, setName] = useState(projectName);
  const [description, setDescription] = useState(projectDescription);
  const [width, setWidth] = useState(canvasWidth);
  const [height, setHeight] = useState(canvasHeight);

  // Sync form with store when dialog opens
  useEffect(() => {
    if (showProjectSettingsDialog) {
      setName(projectName);
      setDescription(projectDescription);
      setWidth(canvasWidth);
      setHeight(canvasHeight);
    }
  }, [showProjectSettingsDialog, projectName, projectDescription, canvasWidth, canvasHeight]);

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a project name');
      return;
    }

    // Check if canvas size changed
    const sizeChanged = width !== canvasWidth || height !== canvasHeight;
    
    if (sizeChanged) {
      const confirmed = window.confirm(
        'Changing canvas size will crop or extend your artwork. This action cannot be undone. Continue?'
      );
      if (!confirmed) return;
    }

    // Update project metadata
    setProjectName(name.trim());
    setProjectDescription(description.trim());
    
    // Update canvas size if changed
    if (sizeChanged) {
      setCanvasSize(width, height);
    }
    
    // Close dialog
    setShowProjectSettingsDialog(false);
  };

  const handleClose = () => {
    setShowProjectSettingsDialog(false);
  };

  const handleWidthChange = (value: number) => {
    setWidth(Math.max(4, Math.min(200, value)));
  };

  const handleHeightChange = (value: number) => {
    setHeight(Math.max(4, Math.min(100, value)));
  };

  const sizeChanged = width !== canvasWidth || height !== canvasHeight;

  return (
    <Dialog open={showProjectSettingsDialog} onOpenChange={setShowProjectSettingsDialog}>
      <DialogContent className="sm:max-w-[500px] border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Project Settings
          </DialogTitle>
          <DialogDescription>
            Edit your project metadata and canvas size
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Project Name */}
          <div className="grid gap-2">
            <Label htmlFor="settings-project-name">Project name</Label>
            <Input
              id="settings-project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="settings-project-description">Description (optional)</Label>
            <Textarea
              id="settings-project-description"
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
                <Label htmlFor="settings-canvas-width" className="text-xs text-muted-foreground">
                  Width
                </Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="settings-canvas-width"
                    type="number"
                    min="4"
                    max="200"
                    value={width}
                    onChange={(e) => handleWidthChange(parseInt(e.target.value) || 4)}
                    className="text-center"
                  />
                  <div className="flex flex-col">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleWidthChange(width + 1)}
                      className="h-4 w-6 p-0 rounded-l-none rounded-br-none border-l-0 text-xs"
                    >
                      +
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleWidthChange(width - 1)}
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
                    value={height}
                    onChange={(e) => handleHeightChange(parseInt(e.target.value) || 4)}
                    className="text-center"
                  />
                  <div className="flex flex-col">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleHeightChange(height + 1)}
                      className="h-4 w-6 p-0 rounded-l-none rounded-br-none border-l-0 text-xs"
                    >
                      +
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleHeightChange(height - 1)}
                      className="h-4 w-6 p-0 rounded-l-none rounded-tr-none border-l-0 border-t-0 text-xs"
                    >
                      −
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            {sizeChanged && (
              <p className="text-sm text-yellow-600 dark:text-yellow-500">
                ⚠️ Changing canvas size will crop or extend your artwork
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
