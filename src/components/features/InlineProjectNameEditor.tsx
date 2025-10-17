import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Check, X } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { useProjectMetadataStore } from '../../stores/projectMetadataStore';

/**
 * Inline Project Name Editor
 * 
 * Displays current project name in header with inline editing capability
 * - Click to edit mode
 * - Check mark to save, X to cancel
 * - Enter to save, Escape to cancel
 */
export function InlineProjectNameEditor() {
  const { projectName, setProjectName } = useProjectMetadataStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(projectName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync editValue when projectName changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(projectName);
    }
  }, [projectName, isEditing]);

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setEditValue(projectName);
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue) {
      setProjectName(trimmedValue);
      setIsEditing(false);
    } else {
      // Don't allow empty names
      setEditValue(projectName);
    }
  };

  const handleCancel = () => {
    setEditValue(projectName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 px-2 text-sm max-w-[300px]"
          placeholder="Project name"
        />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={!editValue.trim()}
                className="h-7 w-7 p-0"
              >
                <Check className="h-4 w-4 text-green-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save (Enter)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="h-7 w-7 p-0"
              >
                <X className="h-4 w-4 text-red-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cancel (Esc)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleStartEdit}
            className="text-sm font-medium text-foreground hover:text-purple-500 transition-colors cursor-pointer px-3 py-1 rounded hover:bg-accent"
          >
            {projectName}
          </button>
        </TooltipTrigger>
        <TooltipContent>Click to edit project name</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
