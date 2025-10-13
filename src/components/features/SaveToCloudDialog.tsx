/**
 * ASCII Motion
 * Save to Cloud Dialog
 * 
 * Simple dialog for saving projects to the cloud
 */

import { useState } from 'react';
import { useAuth } from '@ascii-motion/premium';
import { useCloudProjectActions } from '../../hooks/useCloudProjectActions';
import { useExportDataCollector } from '../../utils/exportDataCollector';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Loader2, Cloud } from 'lucide-react';

interface SaveToCloudDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveToCloudDialog({ open, onOpenChange }: SaveToCloudDialogProps) {
  const { user } = useAuth();
  const exportData = useExportDataCollector();
  const { handleSaveToCloud, currentProjectName } = useCloudProjectActions();
  
  const [projectName, setProjectName] = useState(currentProjectName);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    console.log('[SaveToCloudDialog] Save button clicked');
    
    if (!projectName.trim()) {
      console.warn('[SaveToCloudDialog] Project name is empty');
      alert('Please enter a project name');
      return;
    }

    console.log('[SaveToCloudDialog] Starting save...', {
      projectName: projectName.trim(),
      description: description.trim(),
      hasExportData: !!exportData,
    });

    setSaving(true);
    try {
      const project = await handleSaveToCloud(
        exportData,
        projectName.trim(),
        description.trim() || undefined
      );

      if (project) {
        console.log('[SaveToCloudDialog] ✓ Save successful, closing dialog');
        onOpenChange(false);
        setProjectName(currentProjectName);
        setDescription('');
      } else {
        console.error('[SaveToCloudDialog] ✗ Save returned null');
      }
    } catch (err) {
      console.error('[SaveToCloudDialog] ✗ Save exception:', err);
    } finally {
      setSaving(false);
      console.log('[SaveToCloudDialog] Save process complete');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Save to Cloud
          </DialogTitle>
          <DialogDescription>
            Save your project to the cloud for access from any device
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="My Animation"
              disabled={saving}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of your project..."
              rows={3}
              disabled={saving}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Cloud className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
