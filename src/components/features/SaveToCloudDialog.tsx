/**
 * ASCII Motion - PREMIUM FEATURE
 * Save to Cloud Dialog
 * 
 * Simple dialog for saving projects to the cloud
 * 
 * @premium This component requires authentication and uses premium cloud storage features
 * @requires @ascii-motion/premium package
 * 
 * Architecture Note:
 * - UI Component: Lives in main app for design system cohesion
 * - Business Logic: Imported from @ascii-motion/premium and useCloudProjectActions hook
 * - This keeps UI components with shadcn/ui design system while logic stays in premium package
 */

import { useState, useEffect } from 'react';
import { useAuth, useCloudProject } from '@ascii-motion/premium';
import type { UserProfile } from '@ascii-motion/premium';
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
import { Loader2, Cloud, CloudUpload } from 'lucide-react';
import { UpgradeToProDialog } from './UpgradeToProDialog';

interface SaveToCloudDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveToCloudDialog({ open, onOpenChange }: SaveToCloudDialogProps) {
  const { user } = useAuth();
  const exportData = useExportDataCollector();
  const { handleSaveToCloud, currentProjectName, currentProjectId } = useCloudProjectActions();
  const { getUserProfile, listProjects } = useCloudProject();
  
  const [projectName, setProjectName] = useState(currentProjectName);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [projectCount, setProjectCount] = useState(0);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Load user profile and project count when dialog opens
  useEffect(() => {
    if (open && user) {
      const loadData = async () => {
        const [profile, projects] = await Promise.all([
          getUserProfile(),
          listProjects(),
        ]);
        setUserProfile(profile);
        setProjectCount(projects.length);
      };
      loadData();
    }
  }, [open, user, getUserProfile, listProjects]);

  const handleSave = async () => {
    console.log('[SaveToCloudDialog] Save button clicked');
    
    if (!projectName.trim()) {
      console.warn('[SaveToCloudDialog] Project name is empty');
      alert('Please enter a project name');
      return;
    }

    // Check if this is a new project (not updating existing)
    const isNewProject = !currentProjectId;
    
    // Check project limit for new projects only
    if (isNewProject && userProfile?.subscriptionTier) {
      const maxProjects = userProfile.subscriptionTier.maxProjects;
      const canCreate = maxProjects === -1 || projectCount < maxProjects;
      
      if (!canCreate) {
        console.log('[SaveToCloudDialog] Project limit reached, showing upgrade dialog');
        onOpenChange(false); // Close save dialog
        setShowUpgradeDialog(true); // Show upgrade dialog
        return;
      }
    }

    console.log('[SaveToCloudDialog] Starting save...', {
      projectName: projectName.trim(),
      description: description.trim(),
      hasExportData: !!exportData,
      isNewProject,
    });

    setSaving(true);
    try {
      // Add name and description to export data
      const dataWithMetadata = {
        ...exportData,
        name: projectName.trim(),
        description: description.trim() || undefined,
      };
      
      const project = await handleSaveToCloud(
        dataWithMetadata,
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
      <DialogContent className="sm:max-w-[425px] border-border/50">
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
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CloudUpload className="h-4 w-4 mr-1.5" />
                Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Upgrade to Pro Dialog */}
      <UpgradeToProDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        onManageProjects={() => {
          setShowUpgradeDialog(false);
          // Could optionally open projects dialog here
        }}
        currentProjects={projectCount}
        maxProjects={userProfile?.subscriptionTier?.maxProjects === -1 ? 3 : userProfile?.subscriptionTier?.maxProjects || 3}
      />
    </Dialog>
  );
}
