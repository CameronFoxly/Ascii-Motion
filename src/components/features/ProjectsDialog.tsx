/**
 * ASCII Motion - PREMIUM FEATURE
 * Cloud Projects Dialog
 * 
 * Manages cloud projects - list, open, delete, rename, upload, download
 * 
 * @premium This component requires authentication and uses premium cloud storage features
 * @requires @ascii-motion/premium package
 * 
 * Architecture Note:
 * - UI Component: Lives in main app for design system cohesion
 * - Business Logic: Imported from @ascii-motion/premium (useCloudProject hook)
 * - This keeps UI components with shadcn/ui design system while logic stays in premium package
 */

import { useState, useEffect } from 'react';
import { useCloudProject } from '@ascii-motion/premium';
import type { CloudProject } from '@ascii-motion/premium';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Loader2, 
  MoreVertical, 
  Folder, 
  Trash2, 
  Download, 
  Edit, 
  Upload,
  FolderOpen,
  FileText,
  ChevronDown,
  ChevronRight,
  Undo2,
  Check,
  X,
} from 'lucide-react';
import { ProjectCanvasPreview } from './ProjectCanvasPreview';
import { UpgradeToProDialog } from './UpgradeToProDialog';
import type { UserProfile } from '@ascii-motion/premium';

interface ProjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadProject: (projectId: string, sessionData: unknown) => Promise<void>;
  onDownloadProject: (projectId: string, projectName: string, sessionData: unknown) => void;
}

export function ProjectsDialog({
  open,
  onOpenChange,
  onLoadProject,
  onDownloadProject,
}: ProjectsDialogProps) {
  const {
    loading,
    error,
    listProjects,
    listDeletedProjects,
    loadFromCloud,
    deleteProject,
    restoreProject,
    permanentlyDeleteProject,
    renameProject,
    updateDescription,
    uploadSessionFile,
    getUserProfile,
  } = useCloudProject();

  const [projects, setProjects] = useState<CloudProject[]>([]);
  const [deletedProjects, setDeletedProjects] = useState<CloudProject[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null);
  const [newDescription, setNewDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [trashExpanded, setTrashExpanded] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Load projects when dialog opens
  useEffect(() => {
    if (open) {
      loadProjectsList();
    }
  }, [open]);

  // Reset dialog state when closed
  useEffect(() => {
    if (!open) {
      // Collapse trash
      setTrashExpanded(false);
      // Cancel any edit operations
      setRenamingId(null);
      setNewName('');
      setEditingDescriptionId(null);
      setNewDescription('');
    }
  }, [open]);

  // Show error toasts
  useEffect(() => {
    if (error) {
      console.error('[ProjectsDialog] Error:', error);
    }
  }, [error]);

  const loadProjectsList = async () => {
    const [activeData, deletedData, profile] = await Promise.all([
      listProjects(),
      listDeletedProjects(),
      getUserProfile(),
    ]);
    
    // Sort active projects by most recently opened first
    const sortedActive = activeData.sort((a, b) => 
      new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime()
    );
    
    setProjects(sortedActive);
    setDeletedProjects(deletedData);
    setUserProfile(profile);
  };

  // Check if user can create more projects
  const canCreateProject = () => {
    if (!userProfile?.subscriptionTier) return true; // Allow if no tier info
    const maxProjects = userProfile.subscriptionTier.maxProjects;
    return maxProjects === -1 || projects.length < maxProjects;
  };

  // Get project limit info
  const getProjectLimit = () => {
    if (!userProfile?.subscriptionTier) return { current: projects.length, max: 3 };
    const maxProjects = userProfile.subscriptionTier.maxProjects;
    return {
      current: projects.length,
      max: maxProjects === -1 ? Infinity : maxProjects,
    };
  };

  // Check if user is on pro tier
  const isProUser = () => {
    return userProfile?.subscriptionTier?.name === 'pro';
  };

  const handleOpenProject = async (project: CloudProject) => {
    try {
      const cloudProject = await loadFromCloud(project.id);
      if (cloudProject) {
        await onLoadProject(project.id, cloudProject.sessionData);
        onOpenChange(false);
        console.log(`[ProjectsDialog] Opened "${project.name}"`);
      }
    } catch (err) {
      console.error('[ProjectsDialog] Load failed:', err);
    }
  };

  const handleDeleteProject = async (project: CloudProject) => {
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) {
      return;
    }

    const success = await deleteProject(project.id);
    if (success) {
      console.log(`[ProjectsDialog] Deleted "${project.name}"`);
      await loadProjectsList();
    }
  };

  const handleRenameStart = (project: CloudProject) => {
    setRenamingId(project.id);
    setNewName(project.name);
  };

  const handleRenameSubmit = async (projectId: string) => {
    if (!newName.trim()) {
      console.error('[ProjectsDialog] Project name cannot be empty');
      return;
    }

    const success = await renameProject(projectId, newName.trim());
    if (success) {
      console.log('[ProjectsDialog] Project renamed');
      setRenamingId(null);
      await loadProjectsList();
    }
  };

  const handleRenameCancel = () => {
    setRenamingId(null);
    setNewName('');
  };

  const handleEditDescriptionStart = (project: CloudProject) => {
    setEditingDescriptionId(project.id);
    setNewDescription(project.description || '');
  };

  const handleEditDescriptionSubmit = async (projectId: string) => {
    const success = await updateDescription(projectId, newDescription.trim());
    if (success) {
      console.log('[ProjectsDialog] Description updated');
      setEditingDescriptionId(null);
      await loadProjectsList();
    }
  };

  const handleEditDescriptionCancel = () => {
    setEditingDescriptionId(null);
    setNewDescription('');
  };

  const handleRestoreProject = async (project: CloudProject) => {
    const success = await restoreProject(project.id);
    if (success) {
      console.log(`[ProjectsDialog] Restored "${project.name}"`);
      await loadProjectsList();
    }
  };

  const handlePermanentlyDeleteProject = async (project: CloudProject) => {
    if (!confirm(`Permanently delete "${project.name}"?\n\nThis action cannot be undone. The project will be removed from the database immediately.`)) {
      return;
    }

    const success = await permanentlyDeleteProject(project.id);
    if (success) {
      console.log(`[ProjectsDialog] Permanently deleted "${project.name}"`);
      await loadProjectsList();
    }
  };

  const handleDownloadProject = async (project: CloudProject) => {
    try {
      const cloudProject = await loadFromCloud(project.id);
      if (cloudProject) {
        onDownloadProject(project.id, project.name, cloudProject.sessionData);
        console.log(`[ProjectsDialog] Downloaded "${project.name}"`);
      }
    } catch (err) {
      console.error('[ProjectsDialog] Download failed:', err);
    }
  };

  const handleUploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.asciimtn')) {
      console.error('[ProjectsDialog] Please select a .asciimtn file');
      return;
    }

    // Check project limit before uploading
    if (!canCreateProject()) {
      console.log('[ProjectsDialog] Project limit reached, showing upgrade dialog');
      setShowUpgradeDialog(true);
      event.target.value = ''; // Reset file input
      return;
    }

    setUploading(true);
    try {
      const project = await uploadSessionFile(file);
      if (project) {
        console.log(`[ProjectsDialog] Uploaded "${project.name}"`);
        await loadProjectsList();
      }
    } catch (err) {
      console.error('[ProjectsDialog] Upload failed:', err);
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col border-border/50">
        <DialogHeader>
          <DialogTitle>My Projects</DialogTitle>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Open, manage, and upload your projects • {getProjectLimit().current}/{getProjectLimit().max === Infinity ? '∞' : getProjectLimit().max} projects used
            </p>
            {!isProUser() && (
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Badge variant="secondary">Coming Soon</Badge>
                <span>Upgrade to Pro for unlimited storage</span>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Upload Button */}
        <div className="flex gap-2">
          <Label htmlFor="upload-file">
            <Button
              variant="outline"
              disabled={uploading || loading}
              asChild
            >
              <span>
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload .asciimtn File
                  </>
                )}
              </span>
            </Button>
          </Label>
          <Input
            id="upload-file"
            type="file"
            accept=".asciimtn"
            className="hidden"
            onChange={handleUploadFile}
          />
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading && projects.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No projects yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Upload a .asciimtn file or save your current work to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Card key={project.id} className="relative border-border/50 flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      {renamingId === project.id ? (
                        <div className="flex-1 flex gap-2 items-center">
                          <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleRenameSubmit(project.id);
                              } else if (e.key === 'Escape') {
                                handleRenameCancel();
                              }
                            }}
                            autoFocus
                            className="h-8"
                          />
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  onClick={() => handleRenameSubmit(project.id)}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Save</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 shrink-0"
                                  onClick={handleRenameCancel}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Cancel</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <CardTitle 
                              className="text-base cursor-pointer hover:text-primary transition-colors line-clamp-3"
                              onClick={() => handleRenameStart(project)}
                              title="Click to rename"
                            >
                              {project.name}
                            </CardTitle>
                            <CardDescription>
                              {project.sessionData.animation.frames.length} frame{project.sessionData.animation.frames.length !== 1 ? 's' : ''}
                            </CardDescription>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleRenameStart(project)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditDescriptionStart(project)}>
                                <FileText className="h-4 w-4 mr-2" />
                                Edit Description
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadProject(project)}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteProject(project)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Canvas Preview */}
                    <ProjectCanvasPreview project={project} />
                    
                    {/* Last Opened */}
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Folder className="h-3 w-3 mr-1" />
                      Last opened {formatDate(project.lastOpenedAt)}
                    </div>
                    
                    {/* Description */}
                    {editingDescriptionId === project.id ? (
                      <div className="mt-2 space-y-2">
                        <Textarea
                          value={newDescription}
                          onChange={(e) => setNewDescription(e.target.value)}
                          placeholder="Enter description..."
                          rows={2}
                          autoFocus
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleEditDescriptionSubmit(project.id)}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleEditDescriptionCancel}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : project.description ? (
                      <div 
                        className="text-sm text-muted-foreground mt-2 max-h-[4.5rem] overflow-y-auto cursor-pointer hover:text-primary/80 transition-colors"
                        onClick={() => handleEditDescriptionStart(project)}
                        title="Click to edit description"
                      >
                        {project.description}
                      </div>
                    ) : (
                      <p 
                        className="text-sm text-muted-foreground/50 mt-2 italic cursor-pointer hover:text-muted-foreground transition-colors"
                        onClick={() => handleEditDescriptionStart(project)}
                        title="Click to add description"
                      >
                        No description
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="mt-auto">
                    <Button
                      className="w-full"
                      onClick={() => handleOpenProject(project)}
                      disabled={loading}
                    >
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Open
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          {/* Trash Section - Visible to all users */}
          <div className="mt-6 border-t border-border/50 pt-4">
            <button
              onClick={() => setTrashExpanded(!trashExpanded)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              {trashExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Trash2 className="h-4 w-4" />
              <span>Trash {isProUser() && deletedProjects.length > 0 && `(${deletedProjects.length})`}</span>
            </button>
            
            {trashExpanded && (
              <div className="mt-4 space-y-4">
                {isProUser() ? (
                  // Pro users: Show deleted projects or empty state
                  deletedProjects.length > 0 ? (
                    <>
                      <p className="text-xs text-muted-foreground italic">
                        Items in trash removed permanently after 30 days
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {deletedProjects.map((project) => (
                          <Card key={project.id} className="relative border-border/50 opacity-60 flex flex-col">
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-base line-clamp-3">
                                    {project.name}
                                  </CardTitle>
                                  <CardDescription>
                                    {project.sessionData.animation.frames.length} frame{project.sessionData.animation.frames.length !== 1 ? 's' : ''}
                                  </CardDescription>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              {/* Canvas Preview */}
                              <ProjectCanvasPreview project={project} />
                              
                              {/* Deleted Date */}
                              <div className="flex items-center text-xs text-muted-foreground">
                                <Trash2 className="h-3 w-3 mr-1" />
                                Deleted {formatDate(project.updatedAt)}
                              </div>
                              
                              {/* Description (read-only) */}
                              {project.description && (
                                <div className="text-sm text-muted-foreground mt-2 max-h-[4.5rem] overflow-y-auto">
                                  {project.description}
                                </div>
                              )}
                            </CardContent>
                            <CardFooter className="flex flex-col gap-2 mt-auto">
                              <Button
                                className="w-full"
                                variant="outline"
                                onClick={() => handleRestoreProject(project)}
                                disabled={loading}
                              >
                                <Undo2 className="h-4 w-4 mr-2" />
                                Restore
                              </Button>
                              <Button
                                className="w-full"
                                variant="destructive"
                                onClick={() => handlePermanentlyDeleteProject(project)}
                                disabled={loading}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Permanently Delete
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Trash2 className="h-12 w-12 text-muted-foreground mb-2 opacity-50" />
                      <p className="text-sm text-muted-foreground">Trash is empty</p>
                    </div>
                  )
                ) : (
                  // Free users: Show upgrade message
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Trash2 className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                    <p className="text-sm font-medium text-foreground mb-1">
                      Restoring deleted files from trash
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      Available to Pro users
                    </p>
                    <Badge variant="secondary">Coming Soon</Badge>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Upgrade to Pro Dialog */}
      <UpgradeToProDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        onManageProjects={() => {
          // Dialog is already open, just close upgrade dialog
        }}
        currentProjects={getProjectLimit().current}
        maxProjects={getProjectLimit().max === Infinity ? 3 : getProjectLimit().max}
      />
    </Dialog>
  );
}
