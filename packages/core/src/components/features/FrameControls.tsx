import React from 'react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Plus, Copy, Trash2 } from 'lucide-react';

interface FrameControlsProps {
  canAddFrame: boolean;
  canDeleteFrame: boolean;
  onAddFrame: () => void;
  onDuplicateFrame: () => void;
  onDeleteFrame: () => void;
  disabled?: boolean;
}

/**
 * Frame management controls component
 * Provides buttons for adding, duplicating, and deleting frames
 */
export const FrameControls: React.FC<FrameControlsProps> = ({
  canAddFrame,
  canDeleteFrame,
  onAddFrame,
  onDuplicateFrame,
  onDeleteFrame,
  disabled = false
}) => {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Add new frame */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              onClick={onAddFrame}
              disabled={disabled || !canAddFrame}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Frame
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add new frame (Ctrl+N)</TooltipContent>
        </Tooltip>

        {/* Duplicate current frame */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              onClick={onDuplicateFrame}
              disabled={disabled}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Duplicate
            </Button>
          </TooltipTrigger>
          <TooltipContent>Duplicate current frame (Ctrl+D)</TooltipContent>
        </Tooltip>

        {/* Delete current frame */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              onClick={onDeleteFrame}
              disabled={disabled || !canDeleteFrame}
              className="flex items-center gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete selected frames (Ctrl+Delete or Ctrl+Backspace)</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
