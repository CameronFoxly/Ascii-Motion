import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Clipboard, Undo2, Redo2, Trash2 } from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';
import { useToolStore } from '@/stores/toolStore';
import { useAnimationStore } from '@/stores/animationStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import type { AnyHistoryAction, CanvasHistoryAction } from '@/types';

/**
 * Canvas Action Buttons Component
 * Provides copy, paste, undo, redo, and clear functionality
 * Moved from top toolbar to save space for canvas settings
 */
export const CanvasActionButtons: React.FC = () => {
  const { clearCanvas, setCanvasData, setCanvasSize } = useCanvasStore();
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
  const animationStore = useAnimationStore();
  const { copySelection: handleCopyFromKeyboard, pasteSelection: handlePasteFromKeyboard } = useKeyboardShortcuts();

  /**
   * Helper function to process different types of history actions
   * This is the same logic used by keyboard shortcuts
   */
  const processHistoryAction = useCallback((action: AnyHistoryAction, isRedo: boolean) => {
    switch (action.type) {
      case 'canvas_edit': {
        const canvasAction = action as CanvasHistoryAction;
        setCanvasData(canvasAction.data.canvasData);
        // Set current frame to match the frame this edit was made in
        animationStore.setCurrentFrame(canvasAction.data.frameIndex);
        break;
      }
      
      case 'canvas_resize': {
        const resizeAction = action as any;
        if (isRedo) {
          // Redo: Apply new size
          setCanvasSize(resizeAction.data.newWidth, resizeAction.data.newHeight);
        } else {
          // Undo: Restore previous size and data
          setCanvasSize(resizeAction.data.previousWidth, resizeAction.data.previousHeight);
          setCanvasData(resizeAction.data.previousCanvasData);
        }
        // Set current frame to match the frame this resize was made in
        animationStore.setCurrentFrame(resizeAction.data.frameIndex);
        break;
      }
        
      case 'add_frame': {
        if (isRedo) {
          // Redo: Re-add the frame
          animationStore.addFrame(action.data.frameIndex, action.data.canvasData);
        } else {
          // Undo: Remove the frame that was added
          animationStore.removeFrame(action.data.frameIndex);
          animationStore.setCurrentFrame(action.data.previousCurrentFrame);
        }
        break;
      }
        
      case 'duplicate_frame': {
        if (isRedo) {
          // Redo: Re-duplicate the frame
          animationStore.duplicateFrame(action.data.originalIndex);
        } else {
          // Undo: Remove the duplicated frame
          animationStore.removeFrame(action.data.newIndex);
          animationStore.setCurrentFrame(action.data.previousCurrentFrame);
        }
        break;
      }
        
      case 'delete_frame': {
        if (isRedo) {
          // Redo: Re-delete the frame
          animationStore.removeFrame(action.data.frameIndex);
        } else {
          // Undo: Re-add the deleted frame
          const deletedFrame = action.data.frame;
          
          // Add frame at the correct position
          animationStore.addFrame(action.data.frameIndex, deletedFrame.data);
          
          // Update the frame properties to match the deleted frame
          animationStore.updateFrameName(action.data.frameIndex, deletedFrame.name);
          animationStore.updateFrameDuration(action.data.frameIndex, deletedFrame.duration);
          
          // Restore previous current frame
          animationStore.setCurrentFrame(action.data.previousCurrentFrame);
        }
        break;
      }
        
      case 'reorder_frames': {
        if (isRedo) {
          // Redo: Re-perform the reorder
          animationStore.reorderFrames(action.data.fromIndex, action.data.toIndex);
        } else {
          // Undo: Reverse the reorder
          animationStore.reorderFrames(action.data.toIndex, action.data.fromIndex);
          animationStore.setCurrentFrame(action.data.previousCurrentFrame);
        }
        break;
      }
        
      case 'update_duration':
        if (isRedo) {
          // Redo: Apply new duration
          animationStore.updateFrameDuration(action.data.frameIndex, action.data.newDuration);
        } else {
          // Undo: Restore old duration
          animationStore.updateFrameDuration(action.data.frameIndex, action.data.oldDuration);
        }
        break;

      case 'update_name':
        if (isRedo) {
          // Redo: Apply new name
          animationStore.updateFrameName(action.data.frameIndex, action.data.newName);
        } else {
          // Undo: Restore old name
          animationStore.updateFrameName(action.data.frameIndex, action.data.oldName);
        }
        break;

      case 'navigate_frame':
        if (isRedo) {
          // Redo: Go to the new frame index
          animationStore.setCurrentFrame(action.data.newFrameIndex);
        } else {
          // Undo: Go back to the previous frame index
          animationStore.setCurrentFrame(action.data.previousFrameIndex);
        }
        break;

      case 'apply_effect': {
        const effectAction = action as any;
        if (isRedo) {
          // Redo: Re-apply the effect (not yet implemented)
          console.warn('Redo for effects is not yet implemented');
        } else {
          // Undo: Restore previous data
          if (effectAction.data.applyToTimeline) {
            // Restore all affected frames
            if (effectAction.data.previousFramesData) {
              effectAction.data.previousFramesData.forEach(({ frameIndex, data }: any) => {
                animationStore.setFrameData(frameIndex, data);
              });
            }
          } else {
            // Restore single canvas
            if (effectAction.data.previousCanvasData) {
              setCanvasData(effectAction.data.previousCanvasData);
            }
          }
        }
        break;
      }

      case 'apply_time_effect': {
        const timeEffectAction = action as any;
        if (isRedo) {
          // Redo: Re-apply the time effect (not yet implemented)
          console.warn('Redo for time effects is not yet implemented');
        } else {
          // Undo: Restore previous frame data
          if (timeEffectAction.data.previousFramesData) {
            timeEffectAction.data.previousFramesData.forEach(({ frameIndex, data }: any) => {
              animationStore.setFrameData(frameIndex, data);
            });
          }
        }
        break;
      }

      case 'set_frame_durations': {
        const durationsAction = action as any;
        if (isRedo) {
          // Redo: Re-apply the new duration to all affected frames
          durationsAction.data.affectedFrameIndices.forEach((frameIndex: number) => {
            animationStore.updateFrameDuration(frameIndex, durationsAction.data.newDuration);
          });
        } else {
          // Undo: Restore previous durations
          durationsAction.data.previousDurations.forEach(({ frameIndex, duration }: any) => {
            animationStore.updateFrameDuration(frameIndex, duration);
          });
        }
        break;
      }

      case 'delete_frame_range': {
        const deleteRangeAction = action as any;
        if (isRedo) {
          // Redo: Re-delete the frames
          animationStore.removeFrameRange(deleteRangeAction.data.frameIndices);
        } else {
          // Undo: Restore snapshot prior to deletion
          const { previousFrames, previousCurrentFrame, previousSelection } = deleteRangeAction.data;
          animationStore.replaceFrames(
            previousFrames,
            previousCurrentFrame,
            previousSelection.length > 0 ? previousSelection : undefined
          );
        }
        break;
      }

      case 'duplicate_frame_range': {
        const duplicateRangeAction = action as any;
        const {
          previousFrames,
          newFrames,
          previousSelection,
          newSelection,
          previousCurrentFrame,
          newCurrentFrame
        } = duplicateRangeAction.data;

        if (isRedo) {
          animationStore.replaceFrames(
            newFrames,
            newCurrentFrame,
            newSelection.length > 0 ? newSelection : undefined
          );
        } else {
          animationStore.replaceFrames(
            previousFrames,
            previousCurrentFrame,
            previousSelection.length > 0 ? previousSelection : undefined
          );
        }
        break;
      }

      case 'delete_all_frames': {
        const deleteAllAction = action as any;
        if (isRedo) {
          // Redo: Clear all frames again
          animationStore.clearAllFrames();
        } else {
          // Undo: Restore all deleted frames
          deleteAllAction.data.frames.forEach((frame: any, index: number) => {
            if (index === 0) {
              // Replace the default frame created by clearAllFrames
              animationStore.setFrameData(0, frame.data);
              animationStore.updateFrameName(0, frame.name);
              animationStore.updateFrameDuration(0, frame.duration);
            } else {
              // Add additional frames
              animationStore.addFrame(index, frame.data, frame.duration);
              animationStore.updateFrameName(index, frame.name);
            }
          });
          animationStore.setCurrentFrame(deleteAllAction.data.previousCurrentFrame);
        }
        break;
      }
    }
  }, [setCanvasData, setCanvasSize, animationStore]);

  const handleUndo = () => {
    if (canUndo()) {
      const undoAction = undo();
      if (undoAction) {
        processHistoryAction(undoAction, false);
      }
    }
  };

  const handleRedo = () => {
    if (canRedo()) {
      const redoAction = redo();
      if (redoAction) {
        processHistoryAction(redoAction, true);
      }
    }
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
