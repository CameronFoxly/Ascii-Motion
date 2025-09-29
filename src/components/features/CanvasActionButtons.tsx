import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Copy, Clipboard, Undo2, Redo2, Trash2 } from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';
import { useToolStore } from '@/stores/toolStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

/**
 * Canvas Action Buttons Component
 * Provides copy, paste, undo, redo, and clear functionality
 * Moved from top toolbar to save space for canvas settings
 */
export const CanvasActionButtons: React.FC = () => {
  const { clearCanvas } = useCanvasStore();
  const { 
    selection, 
    lassoSelection,
    magicWandSelection,
    hasClipboard,
    undo, 
    redo, 
    canUndo, 
    canRedo
  } = useToolStore();
  const { copySelection: handleCopyFromKeyboard, pasteSelection: handlePasteFromKeyboard } = useKeyboardShortcuts();

  const handleUndo = () => {
    undo();
  };

  const handleRedo = () => {
    redo();
  };

  const handleCopySelection = () => {
    // Use the keyboard shortcut handler which includes both internal and OS clipboard copy
    handleCopyFromKeyboard();
  };

  const handlePasteSelection = () => {
    // Use the keyboard shortcut handler for consistency
    handlePasteFromKeyboard();
  };

  return (
    <TooltipProvider>
      <div className="flex gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopySelection}
              disabled={!selection?.active && !lassoSelection?.active && !magicWandSelection?.active}
              className="h-6 px-2 text-xs flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              Copy
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Copy selection (Cmd/Ctrl+C)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePasteSelection}
              disabled={!hasClipboard()}
              className="h-6 px-2 text-xs flex items-center gap-1"
            >
              <Clipboard className="w-3 h-3" />
              Paste
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Paste (Cmd/Ctrl+V)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleUndo}
              disabled={!canUndo()}
              className="h-6 px-2 text-xs flex items-center gap-1"
            >
              <Undo2 className="w-3 h-3" />
              Undo
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Undo (Cmd/Ctrl+Z)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRedo}
              disabled={!canRedo()}
              className="h-6 px-2 text-xs flex items-center gap-1"
            >
              <Redo2 className="w-3 h-3" />
              Redo
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Redo (Cmd/Ctrl+Shift+Z)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearCanvas}
              className="h-6 px-2 text-xs flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Clear entire canvas</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
