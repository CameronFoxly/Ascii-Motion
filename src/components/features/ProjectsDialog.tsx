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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Loader2, 
  MoreVertical, 
  Folder, 
  Trash2, 
  Download, 
  Edit, 
  Upload,
  FolderOpen,
  FileText,
} from 'lucide-react';

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
    loadFromCloud,
    deleteProject,
    renameProject,
    updateDescription,
    uploadSessionFile,
  } = useCloudProject();

  const [projects, setProjects] = useState<CloudProject[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null);
  const [newDescription, setNewDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  // Load projects when dialog opens
  useEffect(() => {
    if (open) {
      loadProjectsList();
    }
  }, [open]);

  // Show error toasts
  useEffect(() => {
    if (error) {
      console.error('[ProjectsDialog] Error:', error);
    }
  }, [error]);

  const loadProjectsList = async () => {
    const data = await listProjects();
    setProjects(data);
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
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>My Cloud Projects</DialogTitle>
          <DialogDescription>
            Open, manage, and upload your projects • {projects.length}/3 projects used
          </DialogDescription>
        </DialogHeader>

        {/* Upload Button */}
        <div className="flex gap-2">
          <Label htmlFor="upload-file" className="flex-1">
            <Button
              variant="outline"
              className="w-full"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <Card key={project.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      {renamingId === project.id ? (
                        <div className="flex-1 flex gap-2">
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
                          <Button
                            size="sm"
                            onClick={() => handleRenameSubmit(project.id)}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleRenameCancel}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <CardTitle className="text-base">
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
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Folder className="h-3 w-3 mr-1" />
                      Last opened {formatDate(project.lastOpenedAt)}
                    </div>
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
                      <p className="text-sm text-muted-foreground mt-2">
                        {project.description}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground/50 mt-2 italic">
                        No description
                      </p>
                    )}
                  </CardContent>
                  <CardFooter>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
