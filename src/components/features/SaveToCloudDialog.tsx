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
import { useAuth, useCloudProject, validateProjectName, validateProjectDescription, sanitizeString } from '@ascii-motion/premium';
import type { UserProfile } from '@ascii-motion/premium';
import { useCloudProjectActions } from '../../hooks/useCloudProjectActions';
import { useExportDataCollector } from '../../utils/exportDataCollector';
import { useProjectMetadataStore } from '../../stores/projectMetadataStore';
import { useCloudDialogState } from '../../hooks/useCloudDialogState';
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
  const { handleSaveToCloud } = useCloudProjectActions();
  const { getUserProfile, listProjects } = useCloudProject();
  const { projectName: storedProjectName, projectDescription: storedProjectDescription, currentProjectId } = useProjectMetadataStore();
  const { setShowProjectsDialog, saveAsMode, setSaveAsMode } = useCloudDialogState();
  
  const [projectName, setProjectName] = useState(storedProjectName);
  const [description, setDescription] = useState(storedProjectDescription);
  const [saving, setSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [projectCount, setProjectCount] = useState(0);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  // Sync with projectMetadataStore when dialog opens
  useEffect(() => {
    if (open) {
      setProjectName(storedProjectName);
      setDescription(storedProjectDescription);
    } else {
      // Reset saveAsMode when dialog closes
      setSaveAsMode(false);
    }
  }, [open, storedProjectName, storedProjectDescription, setSaveAsMode]);

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
    
    // Clear previous errors
    setNameError(null);
    setDescriptionError(null);
    
    // Sanitize inputs
    const sanitizedName = sanitizeString(projectName);
    const sanitizedDescription = sanitizeString(description);
    
    // Validate project name
    const nameValidation = validateProjectName(sanitizedName);
    if (!nameValidation.valid) {
      console.warn('[SaveToCloudDialog] Project name validation failed:', nameValidation.error);
      setNameError(nameValidation.error || 'Invalid project name');
      return;
    }
    
    // Validate description
    const descValidation = validateProjectDescription(sanitizedDescription);
    if (!descValidation.valid) {
      console.warn('[SaveToCloudDialog] Description validation failed:', descValidation.error);
      setDescriptionError(descValidation.error || 'Invalid description');
      return;
    }

    // Check if this is a new project
    // saveAsMode=true forces creation of new project even if currentProjectId exists
    const isNewProject = saveAsMode || !currentProjectId;
    
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
      projectName: sanitizedName,
      description: sanitizedDescription,
      hasExportData: !!exportData,
      isNewProject,
      saveAsMode,
    });

    setSaving(true);
    try {
      // Export data already contains project metadata from projectMetadataStore
      // No need to manually inject name/description into export data
      // But we still pass them as separate parameters for cloud storage metadata
      
      // For "Save As", we need to temporarily clear currentProjectId to force new project creation
      // We'll do this by passing a flag or by modifying the hook
      const project = await handleSaveToCloud(
        exportData,
        sanitizedName,
        sanitizedDescription || undefined,
        saveAsMode // Pass saveAsMode to force new project creation
      );

      if (project) {
        console.log('[SaveToCloudDialog] ✓ Save successful, closing dialog');
        onOpenChange(false);
        setProjectName(storedProjectName);
        setDescription(storedProjectDescription);
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
            {saveAsMode ? 'Save As...' : 'Save to Cloud'}
          </DialogTitle>
          <DialogDescription>
            Save your project to the cloud for access from any device
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">
              Project Name
              <span className="text-xs text-muted-foreground ml-2">
                ({projectName.length}/100)
              </span>
            </Label>
            <Input
              id="name"
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                setNameError(null); // Clear error on change
              }}
              placeholder="My Animation"
              disabled={saving}
              className={nameError ? 'border-destructive' : ''}
            />
            {nameError && (
              <p className="text-sm text-destructive">{nameError}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">
              Description (Optional)
              <span className="text-xs text-muted-foreground ml-2">
                ({description.length}/500)
              </span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setDescriptionError(null); // Clear error on change
              }}
              placeholder="A brief description of your project..."
              rows={3}
              disabled={saving}
              className={descriptionError ? 'border-destructive' : ''}
            />
            {descriptionError && (
              <p className="text-sm text-destructive">{descriptionError}</p>
            )}
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
          onOpenChange(false);
          setShowProjectsDialog(true);
        }}
        currentProjects={projectCount}
        maxProjects={userProfile?.subscriptionTier?.maxProjects === -1 ? 3 : userProfile?.subscriptionTier?.maxProjects || 3}
      />
    </Dialog>
  );
}
