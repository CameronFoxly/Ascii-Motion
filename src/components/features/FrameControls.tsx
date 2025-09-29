import React from 'react';
import { Button } from '../ui/button';
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
    <div className="flex items-center gap-2">
      {/* Add new frame */}
      <Button
        size="sm"
        variant="outline"
        onClick={onAddFrame}
        disabled={disabled || !canAddFrame}
        className="flex items-center gap-2"
        title="Add new frame (Ctrl+N)"
      >
        <Plus className="h-4 w-4" />
        New Frame
      </Button>

      {/* Duplicate current frame */}
      <Button
        size="sm"
        variant="outline"
        onClick={onDuplicateFrame}
        disabled={disabled}
        className="flex items-center gap-2"
        title="Duplicate current frame (Ctrl+D)"
      >
        <Copy className="h-4 w-4" />
        Duplicate
      </Button>

      {/* Delete current frame */}
      <Button
        size="sm"
        variant="outline"
        onClick={onDeleteFrame}
        disabled={disabled || !canDeleteFrame}
        className="flex items-center gap-2 text-destructive hover:text-destructive"
        title="Delete current frame (Ctrl+Delete or Ctrl+Backspace)"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </Button>
    </div>
  );
};
