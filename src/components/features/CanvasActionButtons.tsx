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
        // Determine correct snapshot based on undo/redo direction
        const targetData = isRedo
          ? (canvasAction.data.newCanvasData ?? canvasAction.data.previousCanvasData)
          : canvasAction.data.previousCanvasData;
        if (isRedo && !canvasAction.data.newCanvasData && process.env.NODE_ENV !== 'production') {
          console.warn('[history] Redo encountered legacy canvas_edit entry without newCanvasData; using previousCanvasData fallback');
        }

        // Update frame store first to avoid auto-save races
        animationStore.setFrameData(canvasAction.data.frameIndex, targetData);

        // Switch to frame if needed
        if (animationStore.currentFrameIndex !== canvasAction.data.frameIndex) {
          animationStore.setCurrentFrame(canvasAction.data.frameIndex);
        }

        // Reflect on visible canvas
        setCanvasData(targetData);
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
          // Redo: Re-add the frame with full properties
          const frame = action.data.frame;
          animationStore.addFrame(action.data.frameIndex, frame.data, frame.duration);
          animationStore.updateFrameName(action.data.frameIndex, frame.name);
          // Canvas will sync automatically since addFrame sets current frame
        } else {
          // Undo: Remove the frame that was added
          animationStore.removeFrame(action.data.frameIndex);
          animationStore.setCurrentFrame(action.data.previousCurrentFrame);
          // After removing frame and switching to previous frame, 
          // sync canvas with the frame we switched to
          const currentFrame = animationStore.frames[action.data.previousCurrentFrame];
          if (currentFrame) {
            setCanvasData(currentFrame.data);
          }
        }
        break;
      }
        
      case 'duplicate_frame': {
        if (isRedo) {
          // Redo: Re-add the duplicated frame using the stored frame data
          const frame = action.data.frame;
          animationStore.addFrame(action.data.newIndex, frame.data, frame.duration);
          animationStore.updateFrameName(action.data.newIndex, frame.name);
          // Canvas will sync automatically since addFrame sets current frame
        } else {
          // Undo: Remove the duplicated frame
          animationStore.removeFrame(action.data.newIndex);
          animationStore.setCurrentFrame(action.data.previousCurrentFrame);
          // Sync canvas with the frame we switched to
          const currentFrame = animationStore.frames[action.data.previousCurrentFrame];
          if (currentFrame) {
            setCanvasData(currentFrame.data);
          }
        }
        break;
      }
        
      case 'delete_frame': {
        if (isRedo) {
          // Redo: Re-delete the frame
          animationStore.removeFrame(action.data.frameIndex);
          // After deletion, sync canvas with the new current frame
          const newCurrentIndex = Math.min(action.data.frameIndex, animationStore.frames.length - 1);
          const currentFrame = animationStore.frames[newCurrentIndex];
          if (currentFrame) {
            setCanvasData(currentFrame.data);
          }
        } else {
          // Undo: Re-add the deleted frame
          const deletedFrame = action.data.frame;
          
          // Add frame at the correct position
          animationStore.addFrame(action.data.frameIndex, deletedFrame.data, deletedFrame.duration);
          
          // Update the frame properties to match the deleted frame
          animationStore.updateFrameName(action.data.frameIndex, deletedFrame.name);
          
          // Restore previous current frame
          animationStore.setCurrentFrame(action.data.previousCurrentFrame);
          // Sync canvas with the restored frame
          setCanvasData(deletedFrame.data);
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
        // Sync canvas after reorder to ensure we're showing the right frame
        const currentFrame = animationStore.frames[animationStore.currentFrameIndex];
        if (currentFrame) {
          setCanvasData(currentFrame.data);
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
        // Set flag to prevent auto-save during history processing
        useToolStore.setState({ isProcessingHistory: true });
        
        try {
          processHistoryAction(undoAction, false);
        } finally {
          // Clear flag after a small delay to ensure all effects have settled
          setTimeout(() => {
            useToolStore.setState({ isProcessingHistory: false });
          }, 200);
        }
      }
    }
  };

  const handleRedo = () => {
    if (canRedo()) {
      const redoAction = redo();
      if (redoAction) {
        // Set flag to prevent auto-save during history processing
        useToolStore.setState({ isProcessingHistory: true });
        
        try {
          processHistoryAction(redoAction, true);
        } finally {
          // Clear flag after a small delay to ensure all effects have settled
          setTimeout(() => {
            useToolStore.setState({ isProcessingHistory: false });
          }, 200);
        }
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
