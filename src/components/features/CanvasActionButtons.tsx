import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Clipboard, Undo2, Redo2, Trash2 } from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';
import { useToolStore } from '@/stores/toolStore';
import { useAnimationStore } from '@/stores/animationStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { useBezierStore } from '@/stores/bezierStore';
import { useKeyboardShortcuts, processHistoryAction as processSharedHistoryAction } from '@/hooks/useKeyboardShortcuts';
import type { 
  AnyHistoryAction, 
  ApplyEffectHistoryAction, 
  CanvasHistoryAction, 
  Cell, 
  DeleteFrameRangeHistoryAction,
  DuplicateFrameRangeHistoryAction,
  DeleteAllFramesHistoryAction,
  BezierCommitHistoryAction,
  BezierAddPointHistoryAction,
  BezierMovePointHistoryAction,
  BezierAdjustHandleHistoryAction,
  BezierToggleHandlesHistoryAction,
  BezierDeletePointHistoryAction,
} from '@/types';

interface ResizeHistoryAction {
  type: 'canvas_resize';
  data: {
    frameIndex: number;
    newWidth: number;
    newHeight: number;
    previousWidth: number;
    previousHeight: number;
    previousCanvasData: Map<string, Cell>;
  };
}

interface TimeEffectHistoryAction {
  type: 'apply_time_effect';
  data: {
    previousFramesData?: Array<{ frameIndex: number; data: Map<string, Cell> }>;
  };
}

interface DurationHistoryAction {
  type: 'set_frame_durations';
  data: {
    affectedFrameIndices: number[];
    newDuration: number;
    previousDurations: Array<{ frameIndex: number; duration: number }>;
  };
}

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
    canRedo,
    activeTool,
    setActiveTool,
    setSelectedChar,
    setSelectedColor,
    setSelectedBgColor,
  } = useToolStore();
  // PERF FIX: Don't subscribe reactively — animationStore is only used inside
  // event handler callbacks (processHistoryAction). Reading from getState()
  // avoids re-rendering this 666-line component on every frame navigation.
  const getAnimationStore = useAnimationStore.getState;
  const bezierStore = useBezierStore();
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
        getAnimationStore().setFrameData(canvasAction.data.frameIndex, targetData);

        // Switch to frame if needed
        if (getAnimationStore().currentFrameIndex !== canvasAction.data.frameIndex) {
          getAnimationStore().setCurrentFrame(canvasAction.data.frameIndex);
        }

        // Reflect on visible canvas
        setCanvasData(targetData);
        break;
      }
      
      case 'canvas_resize': {
        const resizeAction = action as ResizeHistoryAction;
        if (isRedo) {
          // Redo: Apply new size
          setCanvasSize(resizeAction.data.newWidth, resizeAction.data.newHeight);
        } else {
          // Undo: Restore previous size and data
          setCanvasSize(resizeAction.data.previousWidth, resizeAction.data.previousHeight);
          setCanvasData(resizeAction.data.previousCanvasData);
        }
        // Set current frame to match the frame this resize was made in
        getAnimationStore().setCurrentFrame(resizeAction.data.frameIndex);
        break;
      }
        
      case 'add_frame': {
        if (isRedo) {
          // Redo: Re-add the frame with full properties
          const frame = action.data.frame;
          getAnimationStore().addFrame(action.data.frameIndex, frame.data, frame.duration);
          getAnimationStore().updateFrameName(action.data.frameIndex, frame.name);
          // Canvas will sync automatically since addFrame sets current frame
        } else {
          // Undo: Remove the frame that was added
          getAnimationStore().removeFrame(action.data.frameIndex);
          getAnimationStore().setCurrentFrame(action.data.previousCurrentFrame);
          // After removing frame and switching to previous frame, 
          // sync canvas with the frame we switched to
          const currentFrame = getAnimationStore().frames[action.data.previousCurrentFrame];
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
          getAnimationStore().addFrame(action.data.newIndex, frame.data, frame.duration);
          getAnimationStore().updateFrameName(action.data.newIndex, frame.name);
          // Canvas will sync automatically since addFrame sets current frame
        } else {
          // Undo: Remove the duplicated frame
          getAnimationStore().removeFrame(action.data.newIndex);
          getAnimationStore().setCurrentFrame(action.data.previousCurrentFrame);
          // Sync canvas with the frame we switched to
          const currentFrame = getAnimationStore().frames[action.data.previousCurrentFrame];
          if (currentFrame) {
            setCanvasData(currentFrame.data);
          }
        }
        break;
      }
        
      case 'delete_frame': {
        if (isRedo) {
          // Redo: Re-delete the frame
          getAnimationStore().removeFrame(action.data.frameIndex);
          // After deletion, sync canvas with the new current frame
          const newCurrentIndex = Math.min(action.data.frameIndex, getAnimationStore().frames.length - 1);
          const currentFrame = getAnimationStore().frames[newCurrentIndex];
          if (currentFrame) {
            setCanvasData(currentFrame.data);
          }
        } else {
          // Undo: Re-add the deleted frame
          const deletedFrame = action.data.frame;
          
          // Add frame at the correct position
          getAnimationStore().addFrame(action.data.frameIndex, deletedFrame.data, deletedFrame.duration);
          
          // Update the frame properties to match the deleted frame
          getAnimationStore().updateFrameName(action.data.frameIndex, deletedFrame.name);
          
          // Restore previous current frame
          getAnimationStore().setCurrentFrame(action.data.previousCurrentFrame);
          // Sync canvas with the restored frame
          setCanvasData(deletedFrame.data);
        }
        break;
      }
        
      case 'reorder_frames': {
        if (isRedo) {
          // Redo: Re-perform the reorder
          getAnimationStore().reorderFrames(action.data.fromIndex, action.data.toIndex);
        } else {
          // Undo: Reverse the reorder
          getAnimationStore().reorderFrames(action.data.toIndex, action.data.fromIndex);
          getAnimationStore().setCurrentFrame(action.data.previousCurrentFrame);
        }
        // Sync canvas after reorder to ensure we're showing the right frame
        const currentFrame = getAnimationStore().frames[getAnimationStore().currentFrameIndex];
        if (currentFrame) {
          setCanvasData(currentFrame.data);
        }
        break;
      }
        
      case 'update_duration':
        if (isRedo) {
          // Redo: Apply new duration
          getAnimationStore().updateFrameDuration(action.data.frameIndex, action.data.newDuration);
        } else {
          // Undo: Restore old duration
          getAnimationStore().updateFrameDuration(action.data.frameIndex, action.data.oldDuration);
        }
        break;

      case 'update_name':
        if (isRedo) {
          // Redo: Apply new name
          getAnimationStore().updateFrameName(action.data.frameIndex, action.data.newName);
        } else {
          // Undo: Restore old name
          getAnimationStore().updateFrameName(action.data.frameIndex, action.data.oldName);
        }
        break;

      case 'navigate_frame':
        if (isRedo) {
          // Redo: Go to the new frame index
          getAnimationStore().setCurrentFrame(action.data.newFrameIndex);
        } else {
          // Undo: Go back to the previous frame index
          getAnimationStore().setCurrentFrame(action.data.previousFrameIndex);
        }
        break;

      case 'apply_effect': {
        const effectAction = action as ApplyEffectHistoryAction;
        const tl = useTimelineStore.getState();
        
        if (isRedo) {
          if (effectAction.data.targetScope === 'all-layers' && effectAction.data.newLayerFramesData) {
            for (const { layerId, framesData } of effectAction.data.newLayerFramesData) {
              const layer = tl.layers.find(l => (l.id as string) === layerId);
              if (layer) {
                for (const { frameIndex, data } of framesData) {
                  const cf = layer.contentFrames[frameIndex];
                  if (cf) tl.updateContentFrameData(layer.id, cf.id, data);
                }
              }
            }
            const currentData = getAnimationStore().getFrameData(getAnimationStore().currentFrameIndex);
            if (currentData) setCanvasData(currentData);
          } else if (effectAction.data.applyToTimeline && effectAction.data.newFramesData) {
            const targetLayerId = effectAction.data.affectedLayerIds?.[0];
            const targetLayer = targetLayerId
              ? tl.layers.find(l => (l.id as string) === targetLayerId)
              : tl.layers.find(l => l.id === tl.view.activeLayerId);
            if (targetLayer) {
              effectAction.data.newFramesData.forEach(({ frameIndex, data }) => {
                const cf = targetLayer.contentFrames[frameIndex];
                if (cf) tl.updateContentFrameData(targetLayer.id, cf.id, data);
              });
            }
            const currentData = getAnimationStore().getFrameData(getAnimationStore().currentFrameIndex);
            if (currentData) setCanvasData(currentData);
          } else if (effectAction.data.newCanvasData) {
            setCanvasData(effectAction.data.newCanvasData);
          }
        } else {
          if (effectAction.data.targetScope === 'all-layers' && effectAction.data.previousLayerFramesData) {
            for (const { layerId, framesData } of effectAction.data.previousLayerFramesData) {
              const layer = tl.layers.find(l => (l.id as string) === layerId);
              if (layer) {
                for (const { frameIndex, data } of framesData) {
                  const cf = layer.contentFrames[frameIndex];
                  if (cf) tl.updateContentFrameData(layer.id, cf.id, data);
                }
              }
            }
            const currentData = getAnimationStore().getFrameData(getAnimationStore().currentFrameIndex);
            if (currentData) setCanvasData(currentData);
          } else if (effectAction.data.applyToTimeline && effectAction.data.previousFramesData) {
            const targetLayerId = effectAction.data.affectedLayerIds?.[0];
            const targetLayer = targetLayerId
              ? tl.layers.find(l => (l.id as string) === targetLayerId)
              : tl.layers.find(l => l.id === tl.view.activeLayerId);
            if (targetLayer) {
              effectAction.data.previousFramesData.forEach(({ frameIndex, data }) => {
                const cf = targetLayer.contentFrames[frameIndex];
                if (cf) tl.updateContentFrameData(targetLayer.id, cf.id, data);
              });
            }
            const currentData = getAnimationStore().getFrameData(getAnimationStore().currentFrameIndex);
            if (currentData) setCanvasData(currentData);
          } else if (effectAction.data.previousCanvasData) {
            setCanvasData(effectAction.data.previousCanvasData);
          }
        }
        break;
      }

      case 'apply_time_effect': {
        const timeEffectAction = action as TimeEffectHistoryAction;
        if (isRedo) {
          // Redo: Re-apply the time effect (not yet implemented)
          console.warn('Redo for time effects is not yet implemented');
        } else {
          // Undo: Restore previous frame data
          if (timeEffectAction.data.previousFramesData) {
            timeEffectAction.data.previousFramesData.forEach(({ frameIndex, data }) => {
              getAnimationStore().setFrameData(frameIndex, data);
            });
          }
        }
        break;
      }

      case 'set_frame_durations': {
        const durationsAction = action as DurationHistoryAction;
        if (isRedo) {
          // Redo: Re-apply the new duration to all affected frames
          durationsAction.data.affectedFrameIndices.forEach((frameIndex: number) => {
            getAnimationStore().updateFrameDuration(frameIndex, durationsAction.data.newDuration);
          });
        } else {
          // Undo: Restore previous durations
          durationsAction.data.previousDurations.forEach(({ frameIndex, duration }) => {
            getAnimationStore().updateFrameDuration(frameIndex, duration);
          });
        }
        break;
      }

      case 'delete_frame_range': {
        const deleteRangeAction = action as DeleteFrameRangeHistoryAction;
        if (isRedo) {
          // Redo: Re-delete the frames
          getAnimationStore().removeFrameRange(deleteRangeAction.data.frameIndices);
        } else {
          // Undo: Restore snapshot prior to deletion
          const { previousFrames, previousCurrentFrame, previousSelection } = deleteRangeAction.data;
          getAnimationStore().replaceFrames(
            previousFrames,
            previousCurrentFrame,
            previousSelection.length > 0 ? previousSelection : undefined
          );
        }
        break;
      }

      case 'duplicate_frame_range': {
        const duplicateRangeAction = action as DuplicateFrameRangeHistoryAction;
        const {
          previousFrames,
          newFrames,
          previousSelection,
          newSelection,
          previousCurrentFrame,
          newCurrentFrame
        } = duplicateRangeAction.data;

        if (isRedo) {
          getAnimationStore().replaceFrames(
            newFrames,
            newCurrentFrame,
            newSelection.length > 0 ? newSelection : undefined
          );
        } else {
          getAnimationStore().replaceFrames(
            previousFrames,
            previousCurrentFrame,
            previousSelection.length > 0 ? previousSelection : undefined
          );
        }
        break;
      }

      case 'delete_all_frames': {
        const deleteAllAction = action as DeleteAllFramesHistoryAction;
        if (isRedo) {
          // Redo: Clear all frames again
          getAnimationStore().clearAllFrames();
        } else {
          // Undo: Restore all deleted frames
          deleteAllAction.data.frames.forEach((frame, index) => {
            if (index === 0) {
              // Replace the default frame created by clearAllFrames
              getAnimationStore().setFrameData(0, frame.data);
              getAnimationStore().updateFrameName(0, frame.name);
              getAnimationStore().updateFrameDuration(0, frame.duration);
            } else {
              // Add additional frames
              getAnimationStore().addFrame(index, frame.data, frame.duration);
              getAnimationStore().updateFrameName(index, frame.name);
            }
          });
          getAnimationStore().setCurrentFrame(deleteAllAction.data.previousCurrentFrame);
        }
        break;
      }

      case 'bezier_commit': {
        const bezierAction = action as BezierCommitHistoryAction;
        if (isRedo) {
          // Redo: Re-apply bezier shape to canvas
          setCanvasData(bezierAction.data.newCanvasData);
          getAnimationStore().setFrameData(bezierAction.data.frameIndex, bezierAction.data.newCanvasData);
          if (getAnimationStore().currentFrameIndex !== bezierAction.data.frameIndex) {
            getAnimationStore().setCurrentFrame(bezierAction.data.frameIndex);
          }
        } else {
          // Undo: Restore canvas AND bezier editing state
          // First restore canvas
          setCanvasData(bezierAction.data.previousCanvasData);
          getAnimationStore().setFrameData(bezierAction.data.frameIndex, bezierAction.data.previousCanvasData);
          if (getAnimationStore().currentFrameIndex !== bezierAction.data.frameIndex) {
            getAnimationStore().setCurrentFrame(bezierAction.data.frameIndex);
          }
          
          // Then restore bezier tool state so user can continue editing
          bezierStore.restoreState(bezierAction.data.bezierState);
          
          // Restore character/color settings from when shape was committed
          setSelectedChar(bezierAction.data.bezierState.selectedChar);
          setSelectedColor(bezierAction.data.bezierState.selectedColor);
          setSelectedBgColor(bezierAction.data.bezierState.selectedBgColor);
          
          // Switch to bezier tool to show restored shape
          setActiveTool('beziershape');
        }
        break;
      }

      case 'bezier_add_point': {
        const addPointAction = action as BezierAddPointHistoryAction;
        if (isRedo) {
          // Redo: Re-add the point
          bezierStore.addAnchorPoint(
            addPointAction.data.position.x,
            addPointAction.data.position.y,
            addPointAction.data.withHandles
          );
        } else {
          // Undo: Remove the point
          bezierStore.removePoint(addPointAction.data.pointId);
        }
        // Ensure bezier tool is active
        if (activeTool !== 'beziershape') {
          setActiveTool('beziershape');
        }
        break;
      }

      case 'bezier_move_point': {
        const moveAction = action as BezierMovePointHistoryAction;
        const positions = isRedo ? moveAction.data.newPositions : moveAction.data.previousPositions;
        
        // Apply all position changes
        positions.forEach(({ pointId, position }) => {
          bezierStore.updatePointPosition(pointId, position);
        });
        
        // Ensure bezier tool is active
        if (activeTool !== 'beziershape') {
          setActiveTool('beziershape');
        }
        break;
      }

      case 'bezier_adjust_handle': {
        const adjustAction = action as BezierAdjustHandleHistoryAction;
        const handle = isRedo ? adjustAction.data.newHandle : adjustAction.data.previousHandle;
        const oppositeHandle = isRedo 
          ? adjustAction.data.newOppositeHandle 
          : adjustAction.data.previousOppositeHandle;
        const wasSymmetric = isRedo 
          ? adjustAction.data.newSymmetric 
          : adjustAction.data.previousSymmetric;
        
        // Update the handle
        bezierStore.updateHandle(
          adjustAction.data.pointId,
          adjustAction.data.handleType,
          handle
        );
        
        // If opposite handle changed (symmetry was involved), update it too
        if (oppositeHandle) {
          const oppositeType = adjustAction.data.handleType === 'out' ? 'in' : 'out';
          bezierStore.updateHandle(
            adjustAction.data.pointId,
            oppositeType,
            oppositeHandle
          );
        }
        
        // Restore symmetry state
        if (!wasSymmetric) {
          bezierStore.breakHandleSymmetry(adjustAction.data.pointId);
        }
        
        // Ensure bezier tool is active
        if (activeTool !== 'beziershape') {
          setActiveTool('beziershape');
        }
        break;
      }

      case 'bezier_toggle_handles': {
        const toggleAction = action as BezierToggleHandlesHistoryAction;
        // Just toggle to the previous/new state
        bezierStore.togglePointHandles(toggleAction.data.pointId);
        
        // Ensure bezier tool is active
        if (activeTool !== 'beziershape') {
          setActiveTool('beziershape');
        }
        break;
      }

      case 'bezier_delete_point': {
        const deleteAction = action as BezierDeletePointHistoryAction;
        if (isRedo) {
          // Redo: Delete the point again
          bezierStore.removePoint(deleteAction.data.point.id);
        } else {
          // Undo: Re-insert the point at its original position
          bezierStore.insertPointOnSegment(
            deleteAction.data.pointIndex > 0 ? deleteAction.data.pointIndex - 1 : 0,
            deleteAction.data.point.position,
            0.5 // t value doesn't matter for restore
          );
          
          // NOTE: insertPointOnSegment creates a new point with a new ID,
          // so the exact point structure may differ slightly. This is acceptable
          // for undo/redo as the visual result is the same.
        }
        
        // Ensure bezier tool is active
        if (activeTool !== 'beziershape') {
          setActiveTool('beziershape');
        }
        break;
      }

      case 'bezier_close_shape': {
        // Toggle the closed state
        bezierStore.toggleClosedShape();
        
        // Ensure bezier tool is active
        if (activeTool !== 'beziershape') {
          setActiveTool('beziershape');
        }
        break;
      }
      default:
        processSharedHistoryAction(action, isRedo, { setCanvasData }, getAnimationStore());
    }
  }, [setCanvasData, setCanvasSize, bezierStore, setActiveTool, setSelectedChar, setSelectedColor, setSelectedBgColor, activeTool, getAnimationStore]);

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
