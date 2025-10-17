/**
 * ASCII Motion - PREMIUM FEATURE
 * Upgrade to Pro Dialog
 * 
 * Shows when users hit their free tier project limit
 * Explains Pro benefits and provides path to upgrade (coming soon) or manage projects
 * 
 * @premium Part of cloud storage feature set
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, FolderOpen } from 'lucide-react';

interface UpgradeToProDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onManageProjects: () => void;
  currentProjects: number;
  maxProjects: number;
}

export function UpgradeToProDialog({
  open,
  onOpenChange,
  onManageProjects,
  currentProjects,
  maxProjects,
}: UpgradeToProDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] border-border/50">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <DialogTitle>Upgrade to Pro</DialogTitle>
              <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
            </div>
          </div>
          <DialogDescription className="pt-2">
            You've reached your free storage limit
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="text-sm text-muted-foreground">
            You have <span className="font-semibold text-foreground">{currentProjects}/{maxProjects} projects</span> in your free tier.
          </div>

          <div className="rounded-lg border border-border/50 bg-muted/50 p-4 space-y-2">
            <h4 className="font-semibold text-sm">Pro will include:</h4>
            <ul className="text-sm space-y-1.5 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-purple-500">✓</span>
                <span>Unlimited cloud projects</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500">✓</span>
                <span>Access to trash & restore deleted projects</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500">✓</span>
                <span>Version history</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500">✓</span>
                <span>Priority support</span>
              </li>
            </ul>
          </div>

          <p className="text-sm text-muted-foreground">
            To create a new project, please delete an existing project or upgrade to Pro for unlimited storage.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              onManageProjects();
              onOpenChange(false);
            }}
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            Manage Projects
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
