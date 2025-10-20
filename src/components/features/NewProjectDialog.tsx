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
import { FilePlus2 } from 'lucide-react';
import { useProjectDialogState } from '../../hooks/useProjectDialogState';
import { useProjectMetadataStore } from '../../stores/projectMetadataStore';
import { useCanvasStore } from '../../stores/canvasStore';
import { useAnimationStore } from '../../stores/animationStore';
import { useToolStore } from '../../stores/toolStore';
import { useCloudProjectActions } from '../../hooks/useCloudProjectActions';

/**
 * New Project Dialog
 * 
 * Creates a new ASCII Motion project with:
 * - Custom project name
 * - Optional description
 * - Configurable canvas size
 * - Fresh canvas and single frame
 */
export function NewProjectDialog() {
  const { showNewProjectDialog, setShowNewProjectDialog } = useProjectDialogState();
  const { setProjectName, setProjectDescription } = useProjectMetadataStore();
  const { setCanvasSize, clearCanvas } = useCanvasStore();
  const { resetAnimation } = useAnimationStore();
  const { clearHistory } = useToolStore();
  const { clearCurrentProject } = useCloudProjectActions();
  
  const [name, setName] = useState('Untitled Project');
  const [description, setDescription] = useState('');
  const [width, setWidth] = useState(80);
  const [height, setHeight] = useState(24);

  // Reset form when dialog closes
  useEffect(() => {
    if (!showNewProjectDialog) {
      setName('Untitled Project');
      setDescription('');
      setWidth(80);
      setHeight(24);
    }
  }, [showNewProjectDialog]);

  const handleCreate = () => {
    if (!name.trim()) {
      alert('Please enter a project name');
      return;
    }

    // Set project metadata
    setProjectName(name.trim());
    setProjectDescription(description.trim());
    
    // Clear cloud project tracking (this is a new project)
    clearCurrentProject();
    
    // Initialize canvas
    setCanvasSize(width, height);
    clearCanvas();
    
    // Reset animation to single frame
    resetAnimation();
    
    // Clear undo/redo history
    clearHistory();
    
    // Close dialog
    setShowNewProjectDialog(false);
  };

  const handleClose = () => {
    setShowNewProjectDialog(false);
  };

  const handleWidthChange = (value: number) => {
    setWidth(Math.max(4, Math.min(200, value)));
  };

  const handleHeightChange = (value: number) => {
    setHeight(Math.max(4, Math.min(100, value)));
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
