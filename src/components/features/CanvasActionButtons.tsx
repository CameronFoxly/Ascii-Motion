import React from 'react';
import { Button } from '@/components/ui/button';
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
    <div className="flex gap-1">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleCopySelection}
        disabled={!selection?.active && !lassoSelection?.active && !magicWandSelection?.active}
        title="Copy selection (Cmd/Ctrl+C)"
        className="h-6 px-2 text-xs flex items-center gap-1"
      >
        <Copy className="w-3 h-3" />
        Copy
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handlePasteSelection}
        disabled={!hasClipboard()}
        title="Paste (Cmd/Ctrl+V)"
        className="h-6 px-2 text-xs flex items-center gap-1"
      >
        <Clipboard className="w-3 h-3" />
        Paste
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleUndo}
        disabled={!canUndo()}
        title="Undo (Cmd/Ctrl+Z)"
        className="h-6 px-2 text-xs flex items-center gap-1"
      >
        <Undo2 className="w-3 h-3" />
        Undo
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleRedo}
        disabled={!canRedo()}
        title="Redo (Cmd/Ctrl+Shift+Z)"
        className="h-6 px-2 text-xs flex items-center gap-1"
      >
        <Redo2 className="w-3 h-3" />
        Redo
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={clearCanvas}
        title="Clear entire canvas"
        className="h-6 px-2 text-xs flex items-center gap-1"
      >
        <Trash2 className="w-3 h-3" />
        Clear
      </Button>
    </div>
  );
};
