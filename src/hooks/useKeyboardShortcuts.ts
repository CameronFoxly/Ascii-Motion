import { useEffect, useCallback } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useToolStore } from '../stores/toolStore';
import { useAnimationStore } from '../stores/animationStore';
import { useBezierStore } from '../stores/bezierStore';
import { useCanvasContext } from '../contexts/CanvasContext';
import { getToolForHotkey } from '../constants/hotkeys';
import { useZoomControls } from './useZoomControls';
import { useFrameNavigation } from './useFrameNavigation';
import { useTimelineHistory } from './useTimelineHistory';
import { useAnimationHistory } from './useAnimationHistory';
import { getContentFrameAtTime, compositeLayersAtFrame } from '../utils/layerCompositing';
import { screenToLocal, screenToLocalForLayer } from '../utils/layerTransformUtils';
import { useOptimizedPlayback } from './useOptimizedPlayback';
import { usePlaybackOnlySnapshot } from './usePlaybackOnlySnapshot';
import { usePaletteStore } from '../stores/paletteStore';
import { useCharacterPaletteStore } from '../stores/characterPaletteStore';
import { useFlipUtilities } from './useFlipUtilities';
import { useCropToSelection } from './useCropToSelection';
import { useProjectFileActions } from './useProjectFileActions';
import { useProjectDialogState } from './useProjectDialogState';
import { clearAllSelections, hasAnySelection } from './useSelectionSync';
import { useSelectionStore } from '../stores/selectionStore';
import { ANSI_COLORS } from '../constants/colors';
import type { AnyHistoryAction, CanvasHistoryAction, CanvasResizeHistoryAction, FrameId, Cell } from '../types';
import { useTimelineStore } from '../stores/timelineStore';
import type { LayerId, LayerGroupId, ContentFrameId, PropertyTrackId, KeyframeId, PropertyPath } from '../types/timeline';
import { PROPERTY_DEFINITIONS } from '../types/timeline';

type CanvasStoreState = ReturnType<typeof useCanvasStore.getState>;
type CanvasStoreForHistory = Pick<CanvasStoreState, 'setCanvasData'>;
type AnimationStoreState = ReturnType<typeof useAnimationStore.getState>;

/**
 * Helper function to process different types of history actions
 */
const processHistoryAction = (
  action: AnyHistoryAction,
  isRedo: boolean,
  canvasStore: CanvasStoreForHistory,
  animationStore: AnimationStoreState
) => {
  switch (action.type) {
    case 'canvas_edit': {
      const canvasAction = action as CanvasHistoryAction;
      // Determine which snapshot to apply
      // Undo -> previousCanvasData (state before edit)
      // Redo -> newCanvasData (state after edit) if available, else fallback to previousCanvasData (legacy entries)
      const targetData = isRedo
        ? (canvasAction.data.newCanvasData ?? canvasAction.data.previousCanvasData)
        : canvasAction.data.previousCanvasData;
      if (isRedo && !canvasAction.data.newCanvasData) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[history] Redo encountered legacy canvas_edit entry without newCanvasData; using previousCanvasData fallback');
        }
      }

      // Update frame data FIRST to avoid auto-save race conditions
      animationStore.setFrameData(canvasAction.data.frameIndex, targetData);

      // Ensure we're on the correct frame
      if (animationStore.currentFrameIndex !== canvasAction.data.frameIndex) {
        animationStore.setCurrentFrame(canvasAction.data.frameIndex);
      }

      // Apply to visible canvas
      canvasStore.setCanvasData(targetData);
      break;
    }
    
    case 'canvas_resize': {
      const resizeAction = action as CanvasResizeHistoryAction;
      const canvas = useCanvasStore.getState();
      
      const isCropOperation = resizeAction.data.isCropOperation === true;
      const hasLayerSnapshots = !!resizeAction.data.previousLayerSnapshots;
      
      if (isRedo) {
        canvas.setCanvasSize(resizeAction.data.newWidth, resizeAction.data.newHeight);
        
        if (hasLayerSnapshots && resizeAction.data.newLayerSnapshots) {
          // Multi-layer redo: restore all layers to post-resize state
          const tl = useTimelineStore.getState();
          
          for (const snapshot of resizeAction.data.newLayerSnapshots) {
            const layerId = snapshot.id as import('../types/timeline').LayerId;
            for (const cfSnapshot of snapshot.contentFrames) {
              tl.updateContentFrameData(layerId, cfSnapshot.id as import('../types/timeline').ContentFrameId, new Map(cfSnapshot.data));
            }
            tl.replaceStaticProperties(layerId, snapshot.staticProperties);
            if (snapshot.propertyTracks) {
              for (const trackSnapshot of snapshot.propertyTracks) {
                const trackId = trackSnapshot.id as import('../types/timeline').PropertyTrackId;
                for (const kfSnapshot of trackSnapshot.keyframes) {
                  tl.updateKeyframe(layerId, trackId, kfSnapshot.id as import('../types/timeline').KeyframeId, {
                    value: kfSnapshot.value as number,
                  });
                }
              }
            }
          }
          
          // Restore group snapshots for redo
          if (resizeAction.data.newGroupSnapshots) {
            for (const gSnapshot of resizeAction.data.newGroupSnapshots) {
              const groupId = gSnapshot.id as unknown as import('../types/timeline').LayerId;
              tl.replaceStaticProperties(groupId, gSnapshot.staticProperties);
              if (gSnapshot.propertyTracks) {
                for (const trackSnapshot of gSnapshot.propertyTracks) {
                  const trackId = trackSnapshot.id as import('../types/timeline').PropertyTrackId;
                  for (const kfSnapshot of trackSnapshot.keyframes) {
                    tl.updateKeyframe(groupId, trackId, kfSnapshot.id as import('../types/timeline').KeyframeId, {
                      value: kfSnapshot.value as number,
                    });
                  }
                }
              }
            }
          }
          
          // Reload canvas from active layer
          const activeLayerId = tl.view.activeLayerId;
          if (activeLayerId) {
            const layer = useTimelineStore.getState().layers.find(l => l.id === activeLayerId);
            if (layer) {
              const frame = tl.view.currentFrame;
              const cf = layer.contentFrames.find(c => frame >= c.startFrame && frame < c.startFrame + c.durationFrames);
              if (cf) {
                canvas.setCanvasData(new Map(cf.data));
              }
            }
          }
        } else if (isCropOperation && resizeAction.data.allFramesNewData) {
          // Legacy single-layer crop redo
          resizeAction.data.allFramesNewData.forEach((frameData: Map<string, Cell>, index: number) => {
            animationStore.setFrameData(index, frameData);
          });
          const currentFrame = animationStore.frames[resizeAction.data.frameIndex];
          if (currentFrame) {
            canvas.setCanvasData(currentFrame.data);
          }
        } else {
          const currentFrame = animationStore.frames[resizeAction.data.frameIndex];
          if (currentFrame) {
            canvas.setCanvasData(currentFrame.data);
          }
        }
      } else {
        // Undo
        canvas.setCanvasSize(resizeAction.data.previousWidth, resizeAction.data.previousHeight);
        
        if (hasLayerSnapshots && resizeAction.data.previousLayerSnapshots) {
          // Multi-layer crop undo: restore ALL layers' content frames, transforms, and keyframes
          const tl = useTimelineStore.getState();
          
          for (const snapshot of resizeAction.data.previousLayerSnapshots) {
            const layerId = snapshot.id as import('../types/timeline').LayerId;
            
            // Restore content frame data
            for (const cfSnapshot of snapshot.contentFrames) {
              tl.updateContentFrameData(layerId, cfSnapshot.id as import('../types/timeline').ContentFrameId, new Map(cfSnapshot.data));
            }
            
            // Fully replace static properties so that keys added by the crop/resize
            // (e.g. transform.position.x) are removed if they weren't present before
            tl.replaceStaticProperties(layerId, snapshot.staticProperties);
            
            // Restore keyframe values on property tracks
            if (snapshot.propertyTracks) {
              for (const trackSnapshot of snapshot.propertyTracks) {
                const trackId = trackSnapshot.id as import('../types/timeline').PropertyTrackId;
                for (const kfSnapshot of trackSnapshot.keyframes) {
                  tl.updateKeyframe(layerId, trackId, kfSnapshot.id as import('../types/timeline').KeyframeId, {
                    value: kfSnapshot.value as number,
                  });
                }
              }
            }
          }
          
          // Restore group transforms and keyframes
          if (resizeAction.data.previousGroupSnapshots) {
            for (const gSnapshot of resizeAction.data.previousGroupSnapshots) {
              const groupId = gSnapshot.id as unknown as import('../types/timeline').LayerId;
              tl.replaceStaticProperties(groupId, gSnapshot.staticProperties);
              if (gSnapshot.propertyTracks) {
                for (const trackSnapshot of gSnapshot.propertyTracks) {
                  const trackId = trackSnapshot.id as import('../types/timeline').PropertyTrackId;
                  for (const kfSnapshot of trackSnapshot.keyframes) {
                    tl.updateKeyframe(groupId, trackId, kfSnapshot.id as import('../types/timeline').KeyframeId, {
                      value: kfSnapshot.value as number,
                    });
                  }
                }
              }
            }
          }
          
          // Reload canvas from active layer
          const activeLayerId = tl.view.activeLayerId;
          if (activeLayerId) {
            const layer = useTimelineStore.getState().layers.find(l => l.id === activeLayerId);
            if (layer) {
              const frame = tl.view.currentFrame;
              const cf = layer.contentFrames.find(c => frame >= c.startFrame && frame < c.startFrame + c.durationFrames);
              if (cf) {
                canvas.setCanvasData(new Map(cf.data));
              }
            }
          }
        } else if (isCropOperation && resizeAction.data.allFramesPreviousData) {
          // Legacy single-layer crop undo
          resizeAction.data.allFramesPreviousData.forEach((frameData: Map<string, Cell>, index: number) => {
            animationStore.setFrameData(index, frameData);
          });
          canvas.setCanvasData(resizeAction.data.previousCanvasData);
        } else {
          // Simple resize undo (no crop)
          canvas.setCanvasData(resizeAction.data.previousCanvasData);
        }
      }
      
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
          canvasStore.setCanvasData(currentFrame.data);
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
          canvasStore.setCanvasData(currentFrame.data);
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
          canvasStore.setCanvasData(currentFrame.data);
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
        canvasStore.setCanvasData(deletedFrame.data);
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
        canvasStore.setCanvasData(currentFrame.data);
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
      const effectAction = action as import('../types').ApplyEffectHistoryAction;
      const tl = useTimelineStore.getState();
      
      if (isRedo) {
        if (effectAction.data.targetScope === 'all-layers' && effectAction.data.newLayerFramesData) {
          // Multi-layer redo: restore each layer's frames from stored data
          for (const { layerId, framesData } of effectAction.data.newLayerFramesData) {
            const layer = tl.layers.find(l => (l.id as string) === layerId);
            if (layer) {
              for (const { frameIndex, data } of framesData) {
                const cf = layer.contentFrames[frameIndex];
                if (cf) tl.updateContentFrameData(layer.id, cf.id, data);
              }
            }
          }
          const currentData = animationStore.getFrameData(animationStore.currentFrameIndex);
          if (currentData) canvasStore.setCanvasData(currentData);
        } else if (effectAction.data.applyToTimeline && effectAction.data.newFramesData) {
          // Single-layer timeline redo
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
          const currentData = animationStore.getFrameData(animationStore.currentFrameIndex);
          if (currentData) canvasStore.setCanvasData(currentData);
        } else if (effectAction.data.newCanvasData) {
          // Single-layer current frame redo
          canvasStore.setCanvasData(effectAction.data.newCanvasData);
        }
      } else {
        // Undo: Restore previous data
        if (effectAction.data.targetScope === 'all-layers' && effectAction.data.previousLayerFramesData) {
          // Multi-layer undo: restore each layer's frames from stored data
          for (const { layerId, framesData } of effectAction.data.previousLayerFramesData) {
            const layer = tl.layers.find(l => (l.id as string) === layerId);
            if (layer) {
              for (const { frameIndex, data } of framesData) {
                const cf = layer.contentFrames[frameIndex];
                if (cf) tl.updateContentFrameData(layer.id, cf.id, data);
              }
            }
          }
          const currentData = animationStore.getFrameData(animationStore.currentFrameIndex);
          if (currentData) canvasStore.setCanvasData(currentData);
        } else if (effectAction.data.applyToTimeline && effectAction.data.previousFramesData) {
          // Single-layer timeline undo
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
          const currentData = animationStore.getFrameData(animationStore.currentFrameIndex);
          if (currentData) canvasStore.setCanvasData(currentData);
        } else if (effectAction.data.previousCanvasData) {
          // Single-layer current frame undo
          canvasStore.setCanvasData(effectAction.data.previousCanvasData);
        }
      }
      break;
    }

    case 'apply_time_effect': {
      const timeEffectAction = action as import('../types').ApplyTimeEffectHistoryAction;
      if (isRedo) {
        // Redo: Re-apply the time effect
        console.log(`Redo: Re-applying ${timeEffectAction.data.effectType} time effect`);
        console.warn('Redo for time effects is not yet implemented - would need to re-apply effect');
      } else {
        // Undo: Restore previous frame data
        if (timeEffectAction.data.previousFramesData) {
          timeEffectAction.data.previousFramesData.forEach(({ frameIndex, data }) => {
            animationStore.setFrameData(frameIndex, data);
          });
          console.log(`✅ Undo: Restored ${timeEffectAction.data.previousFramesData.length} frames from ${timeEffectAction.data.effectType} time effect`);
        }
      }
      break;
    }

    case 'set_frame_durations': {
      const durationsAction = action as import('../types').SetFrameDurationsHistoryAction;
      if (isRedo) {
        // Redo: Re-apply the new duration to all affected frames
        durationsAction.data.affectedFrameIndices.forEach(frameIndex => {
          animationStore.updateFrameDuration(frameIndex, durationsAction.data.newDuration);
        });
        console.log(`✅ Redo: Applied duration ${durationsAction.data.newDuration}ms to ${durationsAction.data.affectedFrameIndices.length} frames`);
      } else {
        // Undo: Restore previous durations
        durationsAction.data.previousDurations.forEach(({ frameIndex, duration }) => {
          animationStore.updateFrameDuration(frameIndex, duration);
        });
        console.log(`✅ Undo: Restored durations for ${durationsAction.data.previousDurations.length} frames`);
      }
      break;
    }

    case 'delete_frame_range': {
      const deleteRangeAction = action as import('../types').DeleteFrameRangeHistoryAction;
      if (isRedo) {
        // Redo: Re-delete the frames
        animationStore.removeFrameRange(deleteRangeAction.data.frameIndices);
        console.log(`✅ Redo: Deleted ${deleteRangeAction.data.frameIndices.length} frames`);
      } else {
        // Undo: Restore snapshot prior to deletion
        const { previousFrames, previousCurrentFrame, previousSelection } = deleteRangeAction.data;

        animationStore.replaceFrames(
          previousFrames,
          previousCurrentFrame,
          previousSelection.length > 0 ? previousSelection : undefined
        );

        console.log(`✅ Undo: Restored ${deleteRangeAction.data.frames.length} deleted frames`);
      }
      break;
    }

    case 'duplicate_frame_range': {
      const duplicateRangeAction = action as import('../types').DuplicateFrameRangeHistoryAction;
      const {
        previousFrames,
        newFrames,
        previousSelection,
        newSelection,
        previousCurrentFrame,
        newCurrentFrame,
        originalFrameIndices
      } = duplicateRangeAction.data;

      if (isRedo) {
        animationStore.replaceFrames(
          newFrames,
          newCurrentFrame,
          newSelection.length > 0 ? newSelection : undefined
        );
        console.log(`🔁 Redo: Duplicated ${originalFrameIndices.length} frame(s)`);
      } else {
        animationStore.replaceFrames(
          previousFrames,
          previousCurrentFrame,
          previousSelection.length > 0 ? previousSelection : undefined
        );
        console.log(`↩️ Undo: Removed duplicated frames`);
      }
      break;
    }

    case 'delete_all_frames': {
      const deleteAllAction = action as import('../types').DeleteAllFramesHistoryAction;
      if (isRedo) {
        // Redo: Clear all frames again
        animationStore.clearAllFrames();
        console.log('✅ Redo: Cleared all frames');
      } else {
        // Undo: Restore all deleted frames
        deleteAllAction.data.frames.forEach((frame, index) => {
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
        console.log(`✅ Undo: Restored ${deleteAllAction.data.frames.length} frames`);
      }
      break;
    }

    case 'reorder_frame_range': {
      const reorderRangeAction = action as import('../types').ReorderFrameRangeHistoryAction;
      const {
        frameIndices,
        targetIndex,
        previousCurrentFrame,
        newCurrentFrame,
        movedFrameIds,
        previousSelectionFrameIds,
        newSelectionFrameIds
      } = reorderRangeAction.data;

      const findIndicesForIds = (ids: FrameId[]) => {
        const { frames } = useAnimationStore.getState();
        return ids
          .map((id) => frames.findIndex((frame) => frame.id === id))
          .filter((idx) => idx >= 0)
          .sort((a, b) => a - b);
      };

      const setSelectionByIds = (ids: FrameId[]) => {
        if (ids.length === 0) {
          useAnimationStore.setState({ selectedFrameIndices: new Set<number>() });
          return;
        }
        const indices = findIndicesForIds(ids);
        if (indices.length === 0) return;
        useAnimationStore.setState({ selectedFrameIndices: new Set(indices) });
      };

      if (isRedo) {
        const currentPositions = findIndicesForIds(movedFrameIds);
        if (currentPositions.length === movedFrameIds.length) {
          animationStore.reorderFrameRange(currentPositions, targetIndex);
        }
        setSelectionByIds(newSelectionFrameIds);
        useAnimationStore.getState().setCurrentFrameOnly(newCurrentFrame);
        console.log(`🔁 Redo: Reordered ${movedFrameIds.length} frame(s)`);
      } else {
        const currentPositions = findIndicesForIds(movedFrameIds);
        if (currentPositions.length === movedFrameIds.length) {
          const originalTarget = Math.min(...frameIndices);
          animationStore.reorderFrameRange(currentPositions, originalTarget);
        }
        setSelectionByIds(previousSelectionFrameIds);
        useAnimationStore.getState().setCurrentFrameOnly(previousCurrentFrame);
        console.log(`↩️ Undo: Restored ${movedFrameIds.length} frame(s) to original positions`);
      }
      break;
    }

    case 'import_media': {
      const importAction = action as import('../types').ImportMediaHistoryAction;
      
      if (importAction.data.mode === 'new_layer') {
        // New layer import — undo removes the layer, redo re-creates from snapshot
        const tl = useTimelineStore.getState();
        
        if (isRedo) {
          const snapshot = importAction.data.layerSnapshot;
          if (snapshot) {
            const newLayerId = tl.addLayer(importAction.data.layerName);
            if (newLayerId) {
              // Remove the default empty content frame
              const newLayer = tl.layers.find(l => l.id === newLayerId);
              if (newLayer) {
                for (const cf of [...newLayer.contentFrames]) {
                  tl.removeContentFrame(newLayerId, cf.id);
                }
              }
              // Restore content frames from snapshot
              const snapshotFrames = (snapshot as { contentFrames?: Array<{ startFrame: number; durationFrames: number; data: Record<string, { char: string; textColor: string; bgColor: string }> }> }).contentFrames;
              if (snapshotFrames) {
                for (const cf of snapshotFrames) {
                  const cellData = new Map<string, import('../types').Cell>();
                  if (cf.data) {
                    for (const [key, cell] of Object.entries(cf.data)) {
                      cellData.set(key, cell as unknown as import('../types').Cell);
                    }
                  }
                  tl.addContentFrame(newLayerId, cf.startFrame, cf.durationFrames, cellData);
                }
              }
              // Update the history action's layerId to the new one (for subsequent undo)
              importAction.data.layerId = newLayerId as string;
              console.log(`✅ Redo: Re-created imported media layer "${importAction.data.layerName}" (${importAction.data.importedFrameCount} frames)`);
            }
          }
        } else {
          // Undo: Remove the imported layer
          const layerId = importAction.data.layerId;
          if (layerId) {
            tl.removeLayer(layerId as import('../types/timeline').LayerId);
            // Restore previous active layer
            if (importAction.data.previousActiveLayerId) {
              tl.setActiveLayer(importAction.data.previousActiveLayerId as import('../types/timeline').LayerId);
            }
            console.log(`✅ Undo: Removed imported media layer "${importAction.data.layerName}"`);
          }
        }
      } else if (importAction.data.mode === 'single') {
        // Single image import - restore canvas data
        if (isRedo) {
          if (importAction.data.newCanvasData) {
            canvasStore.setCanvasData(importAction.data.newCanvasData);
            if (importAction.data.previousFrameIndex !== undefined) {
              animationStore.setCurrentFrame(importAction.data.previousFrameIndex);
            }
            console.log(`✅ Redo: Imported media to canvas`);
          }
        } else {
          if (importAction.data.previousCanvasData) {
            canvasStore.setCanvasData(importAction.data.previousCanvasData);
            if (importAction.data.previousFrameIndex !== undefined) {
              animationStore.setCurrentFrame(importAction.data.previousFrameIndex);
            }
            console.log(`✅ Undo: Restored canvas before media import`);
          }
        }
      } else {
        // Multi-frame import (overwrite or append)
        if (isRedo) {
          if (importAction.data.newFrames) {
            animationStore.replaceFrames(
              importAction.data.newFrames,
              importAction.data.newCurrentFrame || 0
            );
            console.log(`✅ Redo: Imported ${importAction.data.importedFrameCount} frame(s)`);
          }
        } else {
          if (importAction.data.previousFrames) {
            animationStore.replaceFrames(
              importAction.data.previousFrames,
              importAction.data.previousCurrentFrame || 0
            );
            console.log(`✅ Undo: Restored ${importAction.data.previousFrames.length} frame(s) before import`);
          }
        }
      }
      
      // Restore/reapply frame rate change if applicable
      if (importAction.data.previousProjectFps !== undefined && importAction.data.newProjectFps !== undefined) {
        const tl = useTimelineStore.getState();
        if (isRedo) {
          tl.setFrameRate(importAction.data.newProjectFps, false);
          console.log(`✅ Redo: Restored project frame rate to ${importAction.data.newProjectFps} fps`);
        } else {
          tl.setFrameRate(importAction.data.previousProjectFps, false);
          console.log(`✅ Undo: Restored project frame rate to ${importAction.data.previousProjectFps} fps`);
        }
      }
      break;
    }
    
    case 'apply_generator': {
      const generatorAction = action as import('../types').ApplyGeneratorHistoryAction;
      const tl = useTimelineStore.getState();
      
      if (isRedo) {
        // Redo: Re-create the generator layer from the snapshot
        const snapshot = generatorAction.data.layerSnapshot;
        if (snapshot) {
          // Add a new layer and populate it from the snapshot
          const newLayerId = tl.addLayer(generatorAction.data.layerName);
          if (newLayerId) {
            // Remove the default empty content frame
            const newLayer = tl.layers.find(l => l.id === newLayerId);
            if (newLayer) {
              for (const cf of [...newLayer.contentFrames]) {
                tl.removeContentFrame(newLayerId, cf.id);
              }
            }
            // Restore content frames from snapshot
            const snapshotFrames = (snapshot as { contentFrames?: Array<{ startFrame: number; durationFrames: number; data: Record<string, { char: string; textColor: string; bgColor: string }> }> }).contentFrames;
            if (snapshotFrames) {
              for (const cf of snapshotFrames) {
                const cellData = new Map<string, import('../types').Cell>();
                if (cf.data) {
                  for (const [key, cell] of Object.entries(cf.data)) {
                    cellData.set(key, cell as unknown as import('../types').Cell);
                  }
                }
                tl.addContentFrame(newLayerId, cf.startFrame, cf.durationFrames, cellData);
              }
            }
            console.log(`✅ Redo: Re-created ${generatorAction.data.layerName} layer (${generatorAction.data.frameCount} frames)`);
          }
        }
      } else {
        // Undo: Remove the generator layer
        const layerId = generatorAction.data.layerId;
        if (layerId) {
          tl.removeLayer(layerId as import('../types/timeline').LayerId);
          console.log(`✅ Undo: Removed ${generatorAction.data.layerName} layer`);
        }
      }
      break;
    }

    case 'bezier_commit': {
      const commitAction = action as import('../types').BezierCommitHistoryAction;
      const bezierStore = useBezierStore.getState();
      const toolStore = useToolStore.getState();
      
      if (isRedo) {
        // Redo: Restore the canvas with the committed shape
        canvasStore.setCanvasData(commitAction.data.newCanvasData);
        animationStore.setFrameData(commitAction.data.frameIndex, commitAction.data.newCanvasData);
        
        // Clear bezier editing state
        bezierStore.reset();
      } else {
        // Undo: Restore previous canvas and bezier editing state
        canvasStore.setCanvasData(commitAction.data.previousCanvasData);
        animationStore.setFrameData(commitAction.data.frameIndex, commitAction.data.previousCanvasData);
        
        // Restore bezier state (with backward-compatible defaults for shapeType/shapeBounds)
        const { selectedChar: _sc, selectedColor: _scl, selectedBgColor: _sbg, ...bezierStateForRestore } = commitAction.data.bezierState;
        bezierStore.restoreState({
          ...bezierStateForRestore,
          shapeType: bezierStateForRestore.shapeType ?? 'freeform',
          shapeBounds: bezierStateForRestore.shapeBounds ?? null,
          shapeFilled: bezierStateForRestore.shapeFilled ?? true,
          bezierFilled: bezierStateForRestore.bezierFilled ?? true,
        });
        
        // Restore tool settings (they're part of bezierState)
        toolStore.setSelectedChar(commitAction.data.bezierState.selectedChar);
        toolStore.setSelectedColor(commitAction.data.bezierState.selectedColor);
        toolStore.setSelectedBgColor(commitAction.data.bezierState.selectedBgColor);
        
        // Switch to the appropriate tool to show restored shape
        const restoredShapeType = bezierStateForRestore.shapeType ?? 'freeform';
        if (restoredShapeType === 'rectangle') {
          toolStore.setActiveTool('rectangle');
        } else if (restoredShapeType === 'ellipse') {
          toolStore.setActiveTool('ellipse');
        } else {
          toolStore.setActiveTool('beziershape');
        }
      }
      
      // Ensure we're on the correct frame
      if (animationStore.currentFrameIndex !== commitAction.data.frameIndex) {
        animationStore.setCurrentFrame(commitAction.data.frameIndex);
      }
      break;
    }

    case 'bezier_add_point': {
      const addPointAction = action as import('../types').BezierAddPointHistoryAction;
      const bezierStore = useBezierStore.getState();
      const toolStore = useToolStore.getState();
      
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
      if (toolStore.activeTool !== 'beziershape') {
        toolStore.setActiveTool('beziershape');
      }
      break;
    }

    case 'bezier_move_point': {
      const moveAction = action as import('../types').BezierMovePointHistoryAction;
      const bezierStore = useBezierStore.getState();
      const toolStore = useToolStore.getState();
      const positions = isRedo ? moveAction.data.newPositions : moveAction.data.previousPositions;
      
      // Apply all position changes
      positions.forEach(({ pointId, position }) => {
        bezierStore.updatePointPosition(pointId, position);
      });
      
      // Ensure bezier tool is active
      if (toolStore.activeTool !== 'beziershape') {
        toolStore.setActiveTool('beziershape');
      }
      break;
    }

    case 'bezier_adjust_handle': {
      const adjustAction = action as import('../types').BezierAdjustHandleHistoryAction;
      const bezierStore = useBezierStore.getState();
      const toolStore = useToolStore.getState();
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
      if (toolStore.activeTool !== 'beziershape') {
        toolStore.setActiveTool('beziershape');
      }
      break;
    }

    case 'bezier_toggle_handles': {
      const toggleAction = action as import('../types').BezierToggleHandlesHistoryAction;
      const bezierStore = useBezierStore.getState();
      const toolStore = useToolStore.getState();
      
      // Just toggle to the previous/new state
      bezierStore.togglePointHandles(toggleAction.data.pointId);
      
      // Ensure bezier tool is active
      if (toolStore.activeTool !== 'beziershape') {
        toolStore.setActiveTool('beziershape');
      }
      break;
    }

    case 'bezier_delete_point': {
      const deleteAction = action as import('../types').BezierDeletePointHistoryAction;
      const bezierStore = useBezierStore.getState();
      const toolStore = useToolStore.getState();
      
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
      if (toolStore.activeTool !== 'beziershape') {
        toolStore.setActiveTool('beziershape');
      }
      break;
    }

    case 'bezier_close_shape': {
      const bezierStore = useBezierStore.getState();
      const toolStore = useToolStore.getState();
      
      // Toggle the closed state
      bezierStore.toggleClosedShape();
      
      // Ensure bezier tool is active
      if (toolStore.activeTool !== 'beziershape') {
        toolStore.setActiveTool('beziershape');
      }
      break;
    }

    // ============================================
    // Layer/Timeline Actions (v2.0.0)
    // ============================================

    case 'layer_add': {
      const tl = useTimelineStore.getState();
      if (isRedo) {
        // Re-insert the layer at its original position
        const newLayers = [...tl.layers];
        newLayers.splice(action.data.insertIndex, 0, structuredClone(action.data.layerData));
        useTimelineStore.setState({
          layers: newLayers,
          view: { ...tl.view, activeLayerId: action.data.layerId as LayerId },
        });
      } else {
        // Remove the added layer
        const newLayers = tl.layers.filter((l) => l.id !== action.data.layerId);
        const newActive = newLayers.length > 0
          ? newLayers[Math.min(action.data.insertIndex, newLayers.length - 1)].id
          : null;
        useTimelineStore.setState({
          layers: newLayers,
          view: { ...tl.view, activeLayerId: newActive },
        });
      }
      break;
    }

    case 'layer_remove': {
      const tl = useTimelineStore.getState();
      if (isRedo) {
        // Re-remove the layer
        const newLayers = tl.layers.filter((l) => l.id !== action.data.layerId);
        const newActive = newLayers.length > 0
          ? newLayers[Math.min(action.data.index, newLayers.length - 1)].id
          : null;
        useTimelineStore.setState({
          layers: newLayers,
          view: { ...tl.view, activeLayerId: newActive },
        });
      } else {
        // Re-insert the removed layer at its original position
        const newLayers = [...tl.layers];
        newLayers.splice(action.data.index, 0, structuredClone(action.data.layerData));
        useTimelineStore.setState({
          layers: newLayers,
          view: { ...tl.view, activeLayerId: action.data.layerId as LayerId },
        });
      }
      break;
    }

    case 'layer_reorder': {
      const reorderAction = action as import('../types').LayerReorderHistoryAction;
      if (reorderAction.data.previousLayers && reorderAction.data.newLayers) {
        // Full snapshot restore (includes group membership changes)
        if (isRedo) {
          useTimelineStore.setState({ layers: reorderAction.data.newLayers, layerGroups: reorderAction.data.newGroups ?? [] });
        } else {
          useTimelineStore.setState({ layers: reorderAction.data.previousLayers, layerGroups: reorderAction.data.previousGroups ?? [] });
        }
      } else {
        // Simple index swap (legacy)
        const tl = useTimelineStore.getState();
        if (isRedo) {
          tl.reorderLayers(reorderAction.data.fromIndex, reorderAction.data.toIndex);
        } else {
          tl.reorderLayers(reorderAction.data.toIndex, reorderAction.data.fromIndex);
        }
      }
      break;
    }

    case 'layer_rename': {
      const tl = useTimelineStore.getState();
      const name = isRedo ? action.data.newName : action.data.oldName;
      tl.renameLayer(action.data.layerId as LayerId, name);
      break;
    }

    case 'layer_visibility': {
      const tl = useTimelineStore.getState();
      const visible = isRedo ? action.data.newVisible : action.data.oldVisible;
      tl.setLayerVisible(action.data.layerId as LayerId, visible);
      break;
    }

    case 'layer_opacity': {
      const tl = useTimelineStore.getState();
      const opacity = isRedo ? action.data.newOpacity : action.data.oldOpacity;
      tl.setLayerOpacity(action.data.layerId as LayerId, opacity);
      break;
    }

    case 'content_frame_add': {
      const tl = useTimelineStore.getState();
      if (isRedo) {
        // Re-add the content frame
        const layer = tl.layers.find((l) => l.id === action.data.layerId);
        if (layer) {
          const frameData = action.data.frameData;
          tl.addContentFrame(
            action.data.layerId as LayerId,
            frameData.startFrame,
            frameData.durationFrames,
            frameData.data instanceof Map ? frameData.data : new Map(Object.entries(frameData.data ?? {})),
          );
        }
      } else {
        // Remove the added content frame
        tl.removeContentFrame(
          action.data.layerId as LayerId,
          action.data.frameId as ContentFrameId,
        );
      }
      break;
    }

    case 'content_frame_remove': {
      const tl = useTimelineStore.getState();
      if (isRedo) {
        // Re-remove the content frame
        tl.removeContentFrame(
          action.data.layerId as LayerId,
          action.data.frameId as ContentFrameId,
        );
      } else {
        // Re-add the removed content frame
        const frameData = action.data.frameData;
        tl.addContentFrame(
          action.data.layerId as LayerId,
          frameData.startFrame,
          frameData.durationFrames,
          frameData.data instanceof Map ? frameData.data : new Map(Object.entries(frameData.data ?? {})),
        );
      }
      break;
    }

    case 'content_frame_timing': {
      const tl = useTimelineStore.getState();
      const timing = isRedo ? action.data.newTiming : action.data.oldTiming;
      tl.updateContentFrameTiming(
        action.data.layerId as LayerId,
        action.data.frameId as ContentFrameId,
        timing.startFrame,
        timing.durationFrames,
      );
      // Restore timeline duration if it was changed by auto-extend
      const targetDuration = isRedo ? action.data.newTimelineDuration : action.data.previousTimelineDuration;
      if (targetDuration !== undefined && tl.config.durationFrames !== targetDuration) {
        tl.setDuration(targetDuration);
      }
      break;
    }

    case 'content_frame_data': {
      const tl = useTimelineStore.getState();
      const data = isRedo ? action.data.newData : action.data.previousData;
      const mapData = data instanceof Map ? data : new Map(Object.entries(data ?? {}));
      tl.updateContentFrameData(
        action.data.layerId as LayerId,
        action.data.frameId as ContentFrameId,
        mapData as Map<string, import('../types').Cell>,
      );
      break;
    }

    case 'keyframe_add': {
      const tl = useTimelineStore.getState();
      if (isRedo) {
        // Re-add the keyframe
        tl.addKeyframe(
          action.data.layerId as LayerId,
          action.data.trackId as PropertyTrackId,
          action.data.keyframe.frame,
          action.data.keyframe.value as number,
        );
      } else {
        // Remove the added keyframe
        tl.removeKeyframe(
          action.data.layerId as LayerId,
          action.data.trackId as PropertyTrackId,
          action.data.keyframeId as KeyframeId,
        );
      }
      break;
    }

    case 'keyframe_remove': {
      const tl = useTimelineStore.getState();
      if (isRedo) {
        // Re-remove the keyframe
        tl.removeKeyframe(
          action.data.layerId as LayerId,
          action.data.trackId as PropertyTrackId,
          action.data.keyframeId as KeyframeId,
        );
      } else {
        // Re-add the removed keyframe
        tl.addKeyframe(
          action.data.layerId as LayerId,
          action.data.trackId as PropertyTrackId,
          action.data.keyframe.frame,
          action.data.keyframe.value as number,
        );
      }
      break;
    }

    case 'keyframe_update': {
      const tl = useTimelineStore.getState();
      const kf = isRedo ? action.data.newValue : action.data.oldValue;
      tl.updateKeyframe(
        action.data.layerId as LayerId,
        action.data.trackId as PropertyTrackId,
        action.data.keyframeId as KeyframeId,
        { frame: kf.frame, value: kf.value as number, easing: kf.easing },
      );
      break;
    }

    case 'property_track_add': {
      const tl = useTimelineStore.getState();
      if (isRedo) {
        // Re-add the property track
        tl.addPropertyTrack(
          action.data.layerId as LayerId,
          action.data.propertyPath as PropertyPath,
        );
      } else {
        // Remove the added property track
        tl.removePropertyTrack(
          action.data.layerId as LayerId,
          action.data.trackId as PropertyTrackId,
        );
      }
      break;
    }

    case 'property_track_remove': {
      const tl = useTimelineStore.getState();
      if (isRedo) {
        // Re-remove the property track
        tl.removePropertyTrack(
          action.data.layerId as LayerId,
          action.data.trackId as PropertyTrackId,
        );
      } else {
        // Re-add the removed property track with its keyframes
        const trackData = action.data.trackData;
        const newTrackId = tl.addPropertyTrack(
          action.data.layerId as LayerId,
          trackData.propertyPath as PropertyPath,
        );
        // Restore keyframes
        if (newTrackId && trackData.keyframes) {
          for (const kf of trackData.keyframes) {
            tl.addKeyframe(
              action.data.layerId as LayerId,
              newTrackId,
              kf.frame,
              kf.value as number,
            );
          }
        }
      }
      break;
    }

    case 'frame_rate_change': {
      const tl = useTimelineStore.getState();
      if (isRedo) {
        useTimelineStore.setState({
          config: {
            ...tl.config,
            frameRate: action.data.newFps,
            durationFrames: action.data.newDuration,
            durationMs: (action.data.newDuration / action.data.newFps) * 1000,
          },
          layers: structuredClone(action.data.newLayers),
        });
      } else {
        useTimelineStore.setState({
          config: {
            ...tl.config,
            frameRate: action.data.oldFps,
            durationFrames: action.data.oldDuration,
            durationMs: (action.data.oldDuration / action.data.oldFps) * 1000,
          },
          layers: structuredClone(action.data.oldLayers),
        });
      }
      break;
    }

    case 'static_property_change': {
      const tl = useTimelineStore.getState();
      if (isRedo) {
        tl.setStaticProperty(
          action.data.layerId as LayerId,
          action.data.propertyPath,
          action.data.newValue,
        );
      } else {
        if (action.data.oldValue !== undefined) {
          tl.setStaticProperty(
            action.data.layerId as LayerId,
            action.data.propertyPath,
            action.data.oldValue,
          );
        } else {
          // Property didn't exist before — remove it by setting to the default
          const def = PROPERTY_DEFINITIONS[action.data.propertyPath as PropertyPath];
          const defaultVal = (def?.defaultValue as number) ?? 0;
          tl.setStaticProperty(
            action.data.layerId as LayerId,
            action.data.propertyPath,
            defaultVal,
          );
        }
      }
      break;
    }

    case 'content_frame_reorder': {
      // Restore the before or after snapshot of all affected layers' content frames
      const snapshot = isRedo ? action.data.newState : action.data.previousState;
      const tl = useTimelineStore.getState();

      for (const layerSnap of snapshot) {
        const lid = layerSnap.layerId as LayerId;
        const layer = tl.layers.find((l) => l.id === lid);
        if (!layer) continue;

        // Remove all existing content frames on this layer
        for (const cf of [...layer.contentFrames]) {
          tl.removeContentFrame(lid, cf.id as ContentFrameId);
        }

        // Re-add content frames from the snapshot
        for (const cf of layerSnap.contentFrames) {
          const data = cf.data instanceof Map ? cf.data : new Map(Object.entries(cf.data ?? {}));
          tl.addContentFrame(lid, cf.startFrame, cf.durationFrames, data as Map<string, import('../types').Cell>);
        }
      }

      // Restore keyframe positions if synced keyframes were moved
      const kfSnapshot = isRedo ? action.data.newKeyframes : action.data.previousKeyframes;
      if (kfSnapshot && kfSnapshot.length > 0) {
        const tl2 = useTimelineStore.getState();
        for (const entry of kfSnapshot) {
          tl2.moveKeyframe(
            entry.layerId as LayerId,
            entry.trackId as PropertyTrackId,
            entry.keyframeId as KeyframeId,
            entry.frame,
          );
        }
      }

      // Restore timeline duration if it changed (e.g., remove blank space)
      const targetDuration = isRedo ? action.data.newTimelineDuration : action.data.previousTimelineDuration;
      if (targetDuration !== undefined) {
        useTimelineStore.getState().setDuration(targetDuration);
      }
      break;
    }

    case 'timeline_duration_change': {
      const tl = useTimelineStore.getState();
      const duration = isRedo ? action.data.newDuration : action.data.oldDuration;
      tl.setDuration(duration);
      break;
    }

    case 'trim_to_work_area': {
      const tl = useTimelineStore.getState();
      if (isRedo) {
        // Re-apply trimmed state
        useTimelineStore.setState({
          config: {
            ...tl.config,
            durationFrames: action.data.newDuration,
            durationMs: (action.data.newDuration / tl.config.frameRate) * 1000,
          },
          layers: structuredClone(action.data.newLayers),
          view: {
            ...tl.view,
            workAreaStart: 0,
            workAreaEnd: action.data.newDuration,
            workAreaEnabled: false,
            currentFrame: Math.min(tl.view.currentFrame, action.data.newDuration - 1),
          },
        });
      } else {
        // Restore pre-trim state
        useTimelineStore.setState({
          config: {
            ...tl.config,
            durationFrames: action.data.previousDuration,
            durationMs: (action.data.previousDuration / tl.config.frameRate) * 1000,
          },
          layers: structuredClone(action.data.previousLayers),
          view: {
            ...tl.view,
            workAreaStart: action.data.previousWorkAreaStart,
            workAreaEnd: action.data.previousWorkAreaEnd,
            workAreaEnabled: true,
          },
        });
      }
      break;
    }

    case 'apply_transforms': {
      const tl = useTimelineStore.getState();
      const targetLayer = isRedo ? structuredClone(action.data.newLayer) : structuredClone(action.data.previousLayer);
      const layerId = action.data.layerId as LayerId;
      useTimelineStore.setState({
        layers: tl.layers.map((l) => l.id === layerId ? targetLayer : l),
      });
      // Reload canvas if this is the active layer
      if (tl.view.activeLayerId === layerId) {
        const cf = targetLayer.contentFrames.find(
          (c: { startFrame: number; durationFrames: number }) =>
            tl.view.currentFrame >= c.startFrame && tl.view.currentFrame < c.startFrame + c.durationFrames,
        );
        if (cf) {
          const data = cf.data instanceof Map ? cf.data : new Map(Object.entries(cf.data ?? {}));
          animationStore.setFrameData(animationStore.currentFrameIndex, data as Map<string, import('../types').Cell>);
          canvasStore.setCanvasData(data as Map<string, import('../types').Cell>);
        }
      }
      break;
    }

    case 'merge_layers': {
      const mergeAction = action as import('../types').MergeLayersHistoryAction;
      const tl = useTimelineStore.getState();
      
      if (isRedo) {
        // Redo: remove the original layers, insert the merged one
        const idsToRemove = new Set(mergeAction.data.removedLayers.map(l => l.id));
        const withoutRemoved = tl.layers.filter(l => !idsToRemove.has(l.id));
        const mergedLayerRestored = {
          ...mergeAction.data.mergedLayer,
          contentFrames: mergeAction.data.mergedLayer.contentFrames.map((cf) => ({
            ...cf,
            data: cf.data instanceof Map ? cf.data : new Map(Object.entries((cf.data ?? {}) as Record<string, unknown>)),
          })),
        };
        const insertIdx = Math.min(mergeAction.data.insertIndex, withoutRemoved.length);
        const newLayers = [
          ...withoutRemoved.slice(0, insertIdx),
          mergedLayerRestored,
          ...withoutRemoved.slice(insertIdx),
        ];
        useTimelineStore.setState({
          layers: newLayers as import('../types/timeline').Layer[],
          view: { ...tl.view, activeLayerId: mergedLayerRestored.id as import('../types/timeline').LayerId },
        });
      } else {
        // Undo: remove the merged layer, restore the original layers at their indices
        const mergedId = mergeAction.data.mergedLayer.id;
        const withoutMerged = tl.layers.filter(l => (l.id as string) !== (mergedId as string));
        
        // Re-insert original layers at their original positions
        const restoredLayers = [...withoutMerged];
        const sortedEntries = mergeAction.data.removedLayers
          .map((l, i) => ({ layer: l, index: mergeAction.data.removedIndices[i] }))
          .sort((a, b) => a.index - b.index);
        
        for (const entry of sortedEntries) {
          const restored = {
            ...entry.layer,
            contentFrames: entry.layer.contentFrames.map((cf) => ({
              ...cf,
              data: cf.data instanceof Map ? cf.data : new Map(Object.entries((cf.data ?? {}) as Record<string, unknown>)),
            })),
          };
          const idx = Math.min(entry.index, restoredLayers.length);
          restoredLayers.splice(idx, 0, restored as import('../types/timeline').Layer);
        }
        
        useTimelineStore.setState({
          layers: restoredLayers,
          view: { ...tl.view, activeLayerId: sortedEntries[0]?.layer.id as import('../types/timeline').LayerId },
        });
      }
      // Sync canvas
      const updated = useTimelineStore.getState();
      const activeL = updated.layers.find(l => l.id === updated.view.activeLayerId);
      if (activeL && activeL.contentFrames.length > 0) {
        canvasStore.setCanvasData(activeL.contentFrames[0].data instanceof Map ? activeL.contentFrames[0].data : new Map());
      }
      break;
    }

    case 'create_group': {
      const groupAction = action as import('../types').CreateGroupHistoryAction;
      const tl = useTimelineStore.getState();
      if (isRedo) {
        tl.createGroup(groupAction.data.groupName, groupAction.data.layerIds.map(id => id as import('../types/timeline').LayerId));
      } else {
        tl.ungroupLayers(groupAction.data.groupId as import('../types/timeline').LayerGroupId);
      }
      break;
    }

    case 'ungroup_layers': {
      const ungroupAction = action as import('../types').UngroupLayersHistoryAction;
      const tl = useTimelineStore.getState();
      if (isRedo) {
        tl.ungroupLayers(ungroupAction.data.group.id);
      } else {
        // Re-create the group
        tl.createGroup(ungroupAction.data.group.name, ungroupAction.data.group.childLayerIds);
      }
      break;
    }
      
    case 'effect_block_add': {
      const a = action as import('../types').EffectBlockAddHistoryAction;
      if (isRedo) {
        // Re-add the effect block — restore full track from snapshot
        const ownerId = a.data.ownerType === 'global' ? null : a.data.ownerId as LayerId | LayerGroupId;
        const trackToRestore = structuredClone(a.data.trackSnapshot);
        trackToRestore.ownerId = ownerId;
        if (ownerId === null) {
          useTimelineStore.setState((s) => ({ globalEffects: [...s.globalEffects, trackToRestore] }));
        } else {
          const isLayer = useTimelineStore.getState().layers.some((l) => l.id === ownerId);
          if (isLayer) {
            useTimelineStore.setState((s) => ({ layers: s.layers.map((l) => l.id === ownerId ? { ...l, effectTracks: [...l.effectTracks, trackToRestore] } : l) }));
          } else {
            useTimelineStore.setState((s) => ({ layerGroups: s.layerGroups.map((g) => g.id === ownerId ? { ...g, effectTracks: [...(g.effectTracks ?? []), trackToRestore] } : g) }));
          }
        }
      } else {
        // Remove the added effect block
        const ownerId = a.data.ownerType === 'global' ? null : a.data.ownerId as LayerId | LayerGroupId;
        useTimelineStore.getState().removeEffectBlock(ownerId, a.data.trackSnapshot.effectBlock.id);
      }
      break;
    }

    case 'effect_block_remove': {
      const tl = useTimelineStore.getState();
      const a = action as import('../types').EffectBlockRemoveHistoryAction;
      if (isRedo) {
        // Re-remove the effect block
        const ownerId = a.data.ownerType === 'global' ? null : a.data.ownerId as LayerId | LayerGroupId;
        tl.removeEffectBlock(ownerId, a.data.trackSnapshot.effectBlock.id);
      } else {
        // Undo remove/move: first remove the block from wherever it currently is
        // (handles the case where it was moved, not just deleted)
        const blockId = a.data.trackSnapshot.effectBlock.id;
        for (const layer of tl.layers) {
          if ((layer.effectTracks ?? []).some((t) => t.effectBlock.id === blockId)) {
            tl.removeEffectBlock(layer.id, blockId);
            break;
          }
        }
        for (const group of tl.layerGroups) {
          if ((group.effectTracks ?? []).some((t) => t.effectBlock.id === blockId)) {
            tl.removeEffectBlock(group.id, blockId);
            break;
          }
        }
        if (tl.globalEffects.some((t) => t.effectBlock.id === blockId)) {
          tl.removeEffectBlock(null, blockId);
        }

        // Re-add the effect block at the original owner — restore full track from snapshot
        const ownerId = a.data.ownerType === 'global' ? null : a.data.ownerId as LayerId | LayerGroupId;
        const trackToRestore = structuredClone(a.data.trackSnapshot);
        // Fix ownerId on the restored track
        trackToRestore.ownerId = ownerId;

        if (ownerId === null) {
          useTimelineStore.setState((s) => ({
            globalEffects: [...s.globalEffects, trackToRestore],
          }));
        } else {
          const isLayer = useTimelineStore.getState().layers.some((l) => l.id === ownerId);
          if (isLayer) {
            useTimelineStore.setState((s) => ({
              layers: s.layers.map((l) =>
                l.id === ownerId ? { ...l, effectTracks: [...l.effectTracks, trackToRestore] } : l,
              ),
            }));
          } else {
            useTimelineStore.setState((s) => ({
              layerGroups: s.layerGroups.map((g) =>
                g.id === ownerId ? { ...g, effectTracks: [...(g.effectTracks ?? []), trackToRestore] } : g,
              ),
            }));
          }
        }
      }
      break;
    }

    case 'effect_block_update': {
      const a = action as import('../types').EffectBlockUpdateHistoryAction;
      const block = isRedo ? a.data.newBlock : a.data.previousBlock;
      const blockId = a.data.blockId as import("../types/effectBlock").EffectBlockId;
      const restoredBlock = structuredClone(block);

      // Directly replace the full effect block (including propertyTracks/keyframes)
      const ownerId = a.data.ownerType === 'global' ? null : a.data.ownerId as LayerId | LayerGroupId;
      const replaceBlock = (tracks: import("../types/effectBlock").EffectTrack[]) =>
        tracks.map((t) => t.effectBlock.id === blockId ? { ...t, effectBlock: restoredBlock } : t);

      if (ownerId === null) {
        useTimelineStore.setState((s) => ({ globalEffects: replaceBlock(s.globalEffects) }));
      } else {
        const isLayer = useTimelineStore.getState().layers.some((l) => l.id === ownerId);
        if (isLayer) {
          useTimelineStore.setState((s) => ({ layers: s.layers.map((l) => l.id === ownerId ? { ...l, effectTracks: replaceBlock(l.effectTracks) } : l) }));
        } else {
          useTimelineStore.setState((s) => ({ layerGroups: s.layerGroups.map((g) => g.id === ownerId ? { ...g, effectTracks: replaceBlock(g.effectTracks ?? []) } : g) }));
        }
      }
      break;
    }

    case 'effect_block_reorder': {
      const tl = useTimelineStore.getState();
      const a = action as import('../types').EffectBlockReorderHistoryAction;
      const ownerId = a.data.ownerType === 'global' ? null : a.data.ownerId as LayerId | LayerGroupId;
      if (isRedo) {
        tl.reorderEffectTracks(ownerId, a.data.fromIndex, a.data.toIndex);
      } else {
        tl.reorderEffectTracks(ownerId, a.data.toIndex, a.data.fromIndex);
      }
      break;
    }

    case 'effect_keyframe_add': {
      const tl = useTimelineStore.getState();
      const a = action as import('../types').EffectKeyframeAddHistoryAction;
      // Check if this is a post effect keyframe by searching postEffectTracks
      const isPostEffect = tl.postEffectTracks.some((pet) => (pet.effectBlock.id as string) === a.data.blockId);
      if (isPostEffect) {
        if (isRedo) {
          tl.addPostEffectKeyframe(a.data.blockId as import("../types/postEffect").PostEffectBlockId, a.data.trackId as import("../types/postEffect").PostEffectPropertyTrackId, a.data.keyframe.frame, a.data.keyframe.value as string | number | boolean);
        } else {
          tl.removePostEffectKeyframe(a.data.blockId as import("../types/postEffect").PostEffectBlockId, a.data.trackId as import("../types/postEffect").PostEffectPropertyTrackId, a.data.keyframe.id);
        }
      } else {
        if (isRedo) {
          tl.addEffectKeyframe(a.data.blockId as import("../types/effectBlock").EffectBlockId, a.data.trackId as import("../types/effectBlock").EffectPropertyTrackId, a.data.keyframe.frame, a.data.keyframe.value);
        } else {
          tl.removeEffectKeyframe(a.data.blockId as import("../types/effectBlock").EffectBlockId, a.data.trackId as import("../types/effectBlock").EffectPropertyTrackId, a.data.keyframe.id);
        }
      }
      break;
    }

    case 'effect_keyframe_remove': {
      const tl = useTimelineStore.getState();
      const a = action as import('../types').EffectKeyframeRemoveHistoryAction;
      const isPostEffect = tl.postEffectTracks.some((pet) => (pet.effectBlock.id as string) === a.data.blockId);
      if (isPostEffect) {
        if (isRedo) {
          tl.removePostEffectKeyframe(a.data.blockId as import("../types/postEffect").PostEffectBlockId, a.data.trackId as import("../types/postEffect").PostEffectPropertyTrackId, a.data.keyframe.id);
        } else {
          tl.addPostEffectKeyframe(a.data.blockId as import("../types/postEffect").PostEffectBlockId, a.data.trackId as import("../types/postEffect").PostEffectPropertyTrackId, a.data.keyframe.frame, a.data.keyframe.value as string | number | boolean);
        }
      } else {
        if (isRedo) {
          tl.removeEffectKeyframe(a.data.blockId as import("../types/effectBlock").EffectBlockId, a.data.trackId as import("../types/effectBlock").EffectPropertyTrackId, a.data.keyframe.id);
        } else {
          tl.addEffectKeyframe(a.data.blockId as import("../types/effectBlock").EffectBlockId, a.data.trackId as import("../types/effectBlock").EffectPropertyTrackId, a.data.keyframe.frame, a.data.keyframe.value);
        }
      }
      break;
    }

    case 'effect_keyframe_update': {
      const tl = useTimelineStore.getState();
      const a = action as import('../types').EffectKeyframeUpdateHistoryAction;
      const kf = isRedo ? a.data.newKeyframe : a.data.previousKeyframe;
      const isPostEffect = tl.postEffectTracks.some((pet) => (pet.effectBlock.id as string) === a.data.blockId);
      if (isPostEffect) {
        tl.updatePostEffectKeyframe(a.data.blockId as import("../types/postEffect").PostEffectBlockId, a.data.trackId as import("../types/postEffect").PostEffectPropertyTrackId, a.data.keyframeId as KeyframeId, { frame: kf.frame, value: kf.value as string | number | boolean, easing: kf.easing });
      } else {
        tl.updateEffectKeyframe(a.data.blockId as import("../types/effectBlock").EffectBlockId, a.data.trackId as import("../types/effectBlock").EffectPropertyTrackId, a.data.keyframeId as KeyframeId, { frame: kf.frame, value: kf.value, easing: kf.easing });
      }
      break;
    }

    case 'effect_bake': {
      const tl = useTimelineStore.getState();
      const a = action as import('../types').EffectBakeHistoryAction;
      if (isRedo) {
        // Re-bake: apply the effect again
        tl.bakeEffect(a.data.trackSnapshot.effectBlock.id);
      } else {
        // Undo bake: restore entire content frames arrays from snapshots

        // Build the restored layers array
        const currentLayers = useTimelineStore.getState().layers;
        const restoredLayers = currentLayers.map((layer) => {
          const snapshot = a.data.layerSnapshots.find((s) => s.layerId === (layer.id as string));
          if (!snapshot) return layer;
          // Deep clone the snapshot content frames to ensure independence
          const restoredFrames = snapshot.contentFrames.map((cf) => {
            const clonedData = new Map<string, import('../types').Cell>();
            cf.data.forEach((cell, key) => clonedData.set(key, { ...cell }));
            return { ...cf, data: clonedData };
          });
          return { ...layer, contentFrames: restoredFrames };
        });

        // Set all at once
        useTimelineStore.setState({ layers: restoredLayers });

        // Re-add the effect block — restore full track from snapshot (preserves keyframes)
        const ownerId = a.data.ownerType === 'global' ? null : a.data.ownerId as LayerId | LayerGroupId;
        const trackToRestore = structuredClone(a.data.trackSnapshot);
        trackToRestore.ownerId = ownerId;

        if (ownerId === null) {
          useTimelineStore.setState((s) => ({
            globalEffects: [...s.globalEffects, trackToRestore],
          }));
        } else {
          const isLayer = useTimelineStore.getState().layers.some((l) => l.id === ownerId);
          if (isLayer) {
            useTimelineStore.setState((s) => ({
              layers: s.layers.map((l) =>
                l.id === ownerId ? { ...l, effectTracks: [...l.effectTracks, trackToRestore] } : l,
              ),
            }));
          } else {
            useTimelineStore.setState((s) => ({
              layerGroups: s.layerGroups.map((g) =>
                g.id === ownerId ? { ...g, effectTracks: [...(g.effectTracks ?? []), trackToRestore] } : g,
              ),
            }));
          }
        }

        // Sync canvas store with restored data
        const activeLayerId = tl.view.activeLayerId;
        const restoredSnapshot = a.data.layerSnapshots.find((s) => s.layerId === (activeLayerId as string));
        if (restoredSnapshot) {
          const layer = useTimelineStore.getState().layers.find((l) => l.id === activeLayerId);
          if (layer) {
            const cf = layer.contentFrames.find((c) => tl.view.currentFrame >= c.startFrame && tl.view.currentFrame < c.startFrame + c.durationFrames);
            if (cf) {
              useCanvasStore.getState().setCanvasData(cf.data);
            }
          }
        }
      }
      break;
    }

    case 'post_effect_block_add': {
      const a = action as import('../types').PostEffectBlockAddHistoryAction;
      if (isRedo) {
        useTimelineStore.setState((s) => ({
          postEffectTracks: [...s.postEffectTracks, structuredClone(a.data.trackSnapshot)],
        }));
      } else {
        useTimelineStore.setState((s) => ({
          postEffectTracks: s.postEffectTracks.filter(
            (t) => t.effectBlock.id !== a.data.trackSnapshot.effectBlock.id,
          ),
        }));
      }
      break;
    }

    case 'post_effect_block_remove': {
      const a = action as import('../types').PostEffectBlockRemoveHistoryAction;
      if (isRedo) {
        useTimelineStore.setState((s) => ({
          postEffectTracks: s.postEffectTracks.filter(
            (t) => t.effectBlock.id !== a.data.trackSnapshot.effectBlock.id,
          ),
        }));
      } else {
        useTimelineStore.setState((s) => {
          const tracks = [...s.postEffectTracks];
          tracks.splice(a.data.trackIndex, 0, structuredClone(a.data.trackSnapshot));
          return { postEffectTracks: tracks };
        });
      }
      break;
    }

    case 'post_effect_block_update': {
      const a = action as import('../types').PostEffectBlockUpdateHistoryAction;
      const blockToApply = isRedo ? a.data.newBlock : a.data.previousBlock;
      useTimelineStore.setState((s) => ({
        postEffectTracks: s.postEffectTracks.map((t) =>
          (t.effectBlock.id as string) === a.data.blockId
            ? { ...t, effectBlock: structuredClone(blockToApply) }
            : t,
        ),
      }));
      break;
    }

    default:
      console.warn('Unknown history action type:', action);
  }
};

/**
 * Custom hook for handling keyboard shortcuts
 * 
 * Frame Navigation:
 * - Comma (,) - Previous frame
 * - Period (.) - Next frame
 * 
 * Frame Management:
 * - Ctrl+N - Add new frame after current frame
 * - Ctrl+Delete - Delete current frame (if more than one frame exists)
 * 
 * Other shortcuts:
 * - Tool hotkeys (P, E, G, M, L, W, etc.)
 * - Canvas operations (Cmd/Ctrl+A, C, V, Z)
 * - Zoom (+/-, =)
 */
export const useKeyboardShortcuts = () => {
  const { cells, setCanvasData, width, height } = useCanvasStore();
  const { startPasteMode, commitPaste, pasteMode } = useCanvasContext();
  const currentFrameIndex = useAnimationStore((s) => s.currentFrameIndex);
  const frames = useAnimationStore((s) => s.frames);
  const selectedFrameIndices = useAnimationStore((s) => s.selectedFrameIndices);
  const toggleOnionSkin = useAnimationStore((s) => s.toggleOnionSkin);
  const { zoomIn, zoomOut } = useZoomControls();
  const { showSaveProjectDialog, showSaveAsDialog, showOpenProjectDialog } = useProjectFileActions();
  
  // Frame navigation and management hooks
  const { navigateNext, navigatePrevious, navigateFirst, navigateLast, canNavigate } = useFrameNavigation();
  const { addFrame, removeFrame, duplicateFrame, duplicateFrameRange, deleteFrameRange } = useAnimationHistory();

  // Playback hooks (so Space key works in both Frames and Timeline tabs)
  const { startOptimizedPlayback, stopOptimizedPlayback } = useOptimizedPlayback();
  const playbackSnapshot = usePlaybackOnlySnapshot();
  const isPlaybackActive = playbackSnapshot.isActive;
  
  // Flip utilities for Shift+H and Shift+V
  const { flipHorizontal, flipVertical } = useFlipUtilities();
  
  // Crop utility for Cmd+Shift+C / Ctrl+Shift+C
  const { canCrop, cropToSelection } = useCropToSelection();

  // Timeline layer-aware content frame operations
  const { addContentFrame, removeContentFrame, duplicateContentFrame, splitContentFrame, updateContentFrameTiming, createGroup } = useTimelineHistory();

  // Helper function to handle different types of history actions
  const handleHistoryAction = useCallback((action: AnyHistoryAction, isRedo: boolean) => {
    processHistoryAction(action, isRedo, { setCanvasData }, useAnimationStore.getState());
  }, [setCanvasData]);
  const { 
    selection, 
    lassoSelection,
    magicWandSelection,
    copySelection, 
    copyLassoSelection,
    copyMagicWandSelection,
    clearSelection,
    clearLassoSelection,
    clearMagicWandSelection,
    startSelection,
    updateSelection,
    undo,
    redo,
    canUndo,
    canRedo,
    activeTool,
    setActiveTool,
    textToolState
  } = useToolStore();

  const startPasteFromClipboard = useCallback(() => {
    const {
      activeClipboardType,
      clipboard,
      lassoClipboard,
      magicWandClipboard,
      getClipboardOriginalPosition: getRectOrigin,
      getLassoClipboardOriginalPosition: getLassoOrigin,
      getMagicWandClipboardOriginalPosition: getMagicOrigin
    } = useToolStore.getState();

    const priority: Array<'magicwand' | 'lasso' | 'rectangle'> = [];
    if (activeClipboardType) {
      priority.push(activeClipboardType);
    }
    priority.push('magicwand', 'lasso', 'rectangle');

    const seen = new Set<string>();

    const ensureStarted = (origin: { x: number; y: number } | null | undefined) => {
      const fallbackPosition = origin || { x: 0, y: 0 };
      return startPasteMode(fallbackPosition);
    };

    for (const type of priority) {
      if (seen.has(type)) {
        continue;
      }
      seen.add(type);

      switch (type) {
        case 'magicwand': {
          if (magicWandClipboard && magicWandClipboard.size > 0) {
            if (ensureStarted(getMagicOrigin())) {
              return true;
            }
          }
          break;
        }
        case 'lasso': {
          if (lassoClipboard && lassoClipboard.size > 0) {
            if (ensureStarted(getLassoOrigin())) {
              return true;
            }
          }
          break;
        }
        case 'rectangle': {
          if (clipboard && clipboard.size > 0) {
            if (ensureStarted(getRectOrigin())) {
              return true;
            }
          }
          break;
        }
      }
    }

    return false;
  }, [startPasteMode]);

  // Helper function to swap foreground/background colors
  const swapForegroundBackground = useCallback(() => {
    const { selectedColor, selectedBgColor, setSelectedColor, setSelectedBgColor } = useToolStore.getState();
    const { addRecentColor } = usePaletteStore.getState();
    
    const tempColor = selectedColor;
    
    // Handle edge case: never allow transparent as foreground color
    if (selectedBgColor === 'transparent' || selectedBgColor === ANSI_COLORS.transparent) {
      // Background becomes current foreground color
      setSelectedBgColor(tempColor);
      // Foreground stays the same (no transparent characters allowed)
    } else {
      // Normal swap
      setSelectedColor(selectedBgColor);
      setSelectedBgColor(tempColor);
    }
    
    // Add both colors to recent colors (only if they're not transparent)
    if (selectedBgColor !== 'transparent' && selectedBgColor !== ANSI_COLORS.transparent) {
      addRecentColor(selectedBgColor);
    }
    if (tempColor !== 'transparent' && tempColor !== ANSI_COLORS.transparent) {
      addRecentColor(tempColor);
    }
  }, []);

  // Helper function to navigate palette colors
  const navigatePaletteColor = useCallback((direction: 'previous' | 'next') => {
    const { getActiveColors, selectedColorId, setSelectedColor: setSelectedColorId } = usePaletteStore.getState();
    const { setSelectedColor, setSelectedBgColor } = useToolStore.getState();
    
    // Determine if we're in background tab context by checking the active tab in the ColorPicker
    // Look for the active background tab using multiple strategies
    let isBackgroundTab = false;
    
    // Strategy 1: Look for Radix UI tabs trigger with various attribute combinations
    const backgroundTabQueries = [
      'button[data-state="active"][data-value="bg"]',
      '[data-state="active"][value="bg"]', 
      'button[aria-selected="true"][value="bg"]',
      '[role="tab"][aria-selected="true"][value="bg"]',
      '[data-radix-collection-item][data-state="active"][value="bg"]'
    ];
    
    for (const query of backgroundTabQueries) {
      if (document.querySelector(query)) {
        isBackgroundTab = true;
        break;
      }
    }
    
    // Strategy 2: If no direct match, look for any tab with "BG" text content that's active
    if (!isBackgroundTab) {
      const activeTabs = document.querySelectorAll('[data-state="active"], [aria-selected="true"]');
      isBackgroundTab = Array.from(activeTabs).some(tab => 
        tab.textContent?.includes('BG') || tab.textContent?.includes('Background')
      );
    }
    
    const activeColors = getActiveColors();
    if (activeColors.length === 0) return;
    
    // Filter colors based on context (foreground = no transparent, background = include transparent)
    const availableColors = isBackgroundTab 
      ? [{ id: 'transparent', value: 'transparent', name: 'Transparent' }, ...activeColors.filter(c => c.value !== 'transparent' && c.value !== ANSI_COLORS.transparent)]
      : activeColors.filter(c => c.value !== 'transparent' && c.value !== ANSI_COLORS.transparent);
      
    if (availableColors.length === 0) return;
    
    let newIndex = 0;
    
    if (selectedColorId) {
      // Find current index
      const currentIndex = availableColors.findIndex(c => c.id === selectedColorId);
      if (currentIndex !== -1) {
        // Navigate with loop-around
        if (direction === 'next') {
          newIndex = (currentIndex + 1) % availableColors.length;
        } else {
          newIndex = currentIndex === 0 ? availableColors.length - 1 : currentIndex - 1;
        }
      }
    }
    // If no selection, default to first color (newIndex = 0)
    
    const newColor = availableColors[newIndex];
    setSelectedColorId(newColor.id);
    
    // Set the drawing color
    if (isBackgroundTab) {
      setSelectedBgColor(newColor.value);
    } else {
      setSelectedColor(newColor.value);
    }
    
    // Add to recent colors if not transparent
    if (newColor.value !== 'transparent' && newColor.value !== ANSI_COLORS.transparent) {
      const { addRecentColor } = usePaletteStore.getState();
      addRecentColor(newColor.value);
    }
  }, []);

  const adjustBrushSize = useCallback((direction: 'decrease' | 'increase') => {
    const { activeTool, brushSettings, setBrushSize } = useToolStore.getState();
    if (activeTool !== 'pencil' && activeTool !== 'eraser') {
      return;
    }

    const currentSize = brushSettings[activeTool].size;
    const delta = direction === 'increase' ? 1 : -1;
    const newSize = Math.max(1, Math.min(20, currentSize + delta));

    if (newSize !== currentSize) {
      setBrushSize(newSize, activeTool);
    }
  }, []);

  const navigateCharacterPaletteCharacters = useCallback((direction: 'previous' | 'next') => {
    const { activePalette } = useCharacterPaletteStore.getState();
    const { selectedChar, setSelectedChar } = useToolStore.getState();

    const characters = activePalette?.characters ?? [];
    if (characters.length === 0) {
      return;
    }

    const total = characters.length;
    const currentIndex = selectedChar ? characters.findIndex(char => char === selectedChar) : -1;

    let targetIndex: number;
    if (direction === 'next') {
      targetIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % total;
    } else {
      targetIndex = currentIndex === -1 ? total - 1 : (currentIndex - 1 + total) % total;
    }

    const nextCharacter = characters[targetIndex];
    if (typeof nextCharacter === 'string' && nextCharacter.length > 0) {
      setSelectedChar(nextCharacter);
    }
  }, []);

  const blockBrowserShortcut = useCallback((event: KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }
    (event as unknown as { returnValue?: boolean }).returnValue = false;
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // If any modal dialog is open, disable all keyboard shortcuts
    // Check for shadcn/ui dialogs that are actually open and visible
    const openDialogs = Array.from(document.querySelectorAll('[role="dialog"]')).filter(dialog => {
      const style = window.getComputedStyle(dialog);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    });
    
    if (openDialogs.length > 0) {
      return;
    }

    const isModifierPressed = event.metaKey || event.ctrlKey;
    const normalizedKey = typeof event.key === 'string' ? event.key.toLowerCase() : '';

    // Handle Cmd/Ctrl+Shift+S for Save As
    if (isModifierPressed && event.shiftKey && !event.altKey) {
      if (normalizedKey === 's') {
        blockBrowserShortcut(event);
        showSaveAsDialog();
        return;
      }

      // Cmd/Ctrl+Shift+C - Open canvas resize dialog
      if (normalizedKey === 'c') {
        event.preventDefault();
        useProjectDialogState.getState().setShowCanvasResizeDialog(true);
        return;
      }

      // Cmd/Ctrl+Shift+X - Crop canvas to selection
      if (normalizedKey === 'x') {
        event.preventDefault();
        if (canCrop()) {
          cropToSelection();
        }
        return;
      }
    }

    // Handle Cmd/Ctrl+S for Save and Cmd/Ctrl+O for Open
    if (isModifierPressed && !event.altKey && !event.shiftKey) {
      if (normalizedKey === 's') {
        blockBrowserShortcut(event);
        showSaveProjectDialog();
        return;
      }

      if (normalizedKey === 'o') {
        blockBrowserShortcut(event);
        showOpenProjectDialog();
        return;
      }
    }

    // If paste mode is active, let paste mode handle its own keyboard events (except Ctrl/Cmd+V to commit)
    if (pasteMode.isActive && !(isModifierPressed && normalizedKey === 'v')) {
      return;
    }

    // If any input field is focused, block specific canvas hotkeys that conflict with typing
    // But allow text editing shortcuts (Cmd+A, arrow keys, etc.) to work normally
    const activeElement = document.activeElement as HTMLElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true' ||
      activeElement.getAttribute('role') === 'textbox'
    );
    
    if (isInputFocused) {
      // Allow all modifier-based shortcuts (Cmd+A, Cmd+C, etc.) - these are text editing commands
      if (isModifierPressed) {
        return; // Let the input field handle text editing shortcuts
      }
      
      // Allow navigation keys that are essential for text editing
      const allowedKeys = [
        'Escape', 'Tab', 'Enter', 'Backspace', 'Delete',
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
        'Home', 'End', 'PageUp', 'PageDown'
      ];
      
      if (allowedKeys.includes(event.key)) {
        // For Escape, still handle our canvas logic after the input handles it
        if (event.key === 'Escape') {
          // Don't return yet - let canvas logic handle Escape below
        } else {
          return; // Let the input field handle navigation keys
        }
      } else {
        // Block tool hotkeys and other single-key shortcuts that conflict with typing
        // This includes letters (b, p, e, etc.), numbers, AND spacebar for text input
        if (event.key === 'u') console.log('[DEBUG] U blocked by focused input:', activeElement.tagName, activeElement.className);
        return;
      }
    }

    // If text tool is actively typing, only allow Escape and modifier-based shortcuts
    // This prevents conflicts with single-key tool hotkeys and the space bar
    if (textToolState.isTyping && !isModifierPressed && event.key !== 'Escape') {
      return; // Let the text tool handle all other keys
    }

    // Spacebar playback toggle — handled here so it works in both Frames and Timeline tabs
    if (!isModifierPressed && (event.key === ' ' || event.key === 'Space')) {
      event.preventDefault(); // Prevent page scroll
      if (isPlaybackActive) {
        stopOptimizedPlayback({ preserveFrameIndex: true });
      } else {
        startOptimizedPlayback();
      }
      return;
    }

    // Handle Escape key (without modifier)
    if (event.key === 'Escape') {
      // PERSISTENT SELECTION: Escape clears all selections
      // This is one of the explicit ways to deselect (along with Cmd+D and click outside with selection tool)
      if (hasAnySelection()) {
        event.preventDefault();
        clearAllSelections();
      }
      
      // Also clear timeline selection if any
      const animationStore = useAnimationStore.getState();
      if (animationStore.selectedFrameIndices.size > 1) {
        animationStore.clearSelection();
      }
      return;
    }

    // Handle Delete/Backspace key (without modifier) - Clear selected cells
    if ((event.key === 'Delete' || event.key === 'Backspace') && !isModifierPressed) {
      // Helper: clear selection cells from all visible/unlocked layers when multi-layer mode is on
      // Also records undo history for each affected layer
      const clearSelectionFromAllLayers = (cellKeys: Set<string> | string[]) => {
        const { selectionAffectsAllLayers } = useToolStore.getState();
        if (!selectionAffectsAllLayers) return;
        const tl = useTimelineStore.getState();
        const currentFrame = tl.view.currentFrame;
        const { pushToHistory } = useToolStore.getState();
        for (const layer of tl.layers) {
          if (layer.id === tl.view.activeLayerId) continue; // Active layer handled by canvas
          if (!layer.visible || layer.locked) continue;
          const cf = getContentFrameAtTime(layer, currentFrame);
          if (!cf) continue;
          const previousData = new Map(cf.data);
          const newData = new Map(cf.data);
          let changed = false;
          // Convert screen-space selection keys to this layer's local space
          // (includes group transforms if the layer is in a group)
          for (const key of cellKeys) {
            const [sx, sy] = key.split(',').map(Number);
            const local = screenToLocalForLayer(layer.id as string, sx, sy);
            const localKey = `${local.x},${local.y}`;
            if (newData.has(localKey)) {
              newData.delete(localKey);
              changed = true;
            }
          }
          if (changed) {
            tl.updateContentFrameData(layer.id, cf.id, newData);
            // Record history for this layer's content frame change
            pushToHistory({
              type: 'content_frame_data',
              timestamp: Date.now(),
              description: `Delete selection on ${layer.name}`,
              data: {
                layerId: layer.id as string,
                frameId: cf.id as string,
                previousData,
                newData: new Map(newData),
              },
            } as import('../types').ContentFrameDataHistoryAction);
          }
        }
      };

      // Check if any selection is active and clear the selected cells
      if (magicWandSelection.active && magicWandSelection.selectedCells.size > 0) {
        event.preventDefault();
        
        // Save current state for undo
  const { pushCanvasHistory, finalizeCanvasHistory } = useToolStore.getState();
  pushCanvasHistory(new Map(cells), currentFrameIndex, 'Delete magic wand selection');
        
        // Clear all selected cells (convert screen-space to local space for active layer)
        const newCells = new Map(cells);
        magicWandSelection.selectedCells.forEach(cellKey => {
          const [sx, sy] = cellKey.split(',').map(Number);
          const local = screenToLocal(sx, sy);
          newCells.delete(`${local.x},${local.y}`);
        });
  setCanvasData(newCells);
  finalizeCanvasHistory(new Map(newCells));
        
        // Clear from other layers if multi-layer mode is on
        clearSelectionFromAllLayers(magicWandSelection.selectedCells);
        
        // Clear the selection after deleting content
        clearMagicWandSelection();
        return;
      }
      
      if (lassoSelection.active && lassoSelection.selectedCells.size > 0) {
        event.preventDefault();
        
        // Save current state for undo
  const { pushCanvasHistory: pushCanvasHistory2, finalizeCanvasHistory: finalizeCanvasHistory2 } = useToolStore.getState();
  pushCanvasHistory2(new Map(cells), currentFrameIndex, 'Delete lasso selection');
        
        // Clear all selected cells (convert screen-space to local space for active layer)
        const newCells = new Map(cells);
        lassoSelection.selectedCells.forEach(cellKey => {
          const [sx, sy] = cellKey.split(',').map(Number);
          const local = screenToLocal(sx, sy);
          newCells.delete(`${local.x},${local.y}`);
        });
  setCanvasData(newCells);
  finalizeCanvasHistory2(new Map(newCells));
        
        // Clear from other layers if multi-layer mode is on
        clearSelectionFromAllLayers(lassoSelection.selectedCells);
        
        // Clear the selection after deleting content
        clearLassoSelection();
        return;
      }
      
      if (selection.active) {
        event.preventDefault();
        
        // Save current state for undo
  const { pushCanvasHistory: pushCanvasHistory3, finalizeCanvasHistory: finalizeCanvasHistory3 } = useToolStore.getState();
  pushCanvasHistory3(new Map(cells), currentFrameIndex, 'Delete rectangular selection');
        
        // Clear all cells in rectangular selection
        const newCells = new Map(cells);
        const { start, end } = selection;
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);
        
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            // Convert screen-space to local space for active layer
            const local = screenToLocal(x, y);
            newCells.delete(`${local.x},${local.y}`);
          }
        }
  setCanvasData(newCells);
  finalizeCanvasHistory3(new Map(newCells));
        
        // Clear from other layers if multi-layer mode is on
        const rectKeys = new Set<string>();
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            rectKeys.add(`${x},${y}`);
          }
        }
        clearSelectionFromAllLayers(rectKeys);
        
        // Clear the selection after deleting content
        clearSelection();
        return;
      }
    }

    const isBracketLeft = event.code === 'BracketLeft' || event.key === '[' || event.key === '{';
    const isBracketRight = event.code === 'BracketRight' || event.key === ']' || event.key === '}';

    if (isModifierPressed && !event.altKey && !event.shiftKey) {
      if (isBracketLeft) {
        event.preventDefault();
        navigateCharacterPaletteCharacters('previous');
        return;
      }

      if (isBracketRight) {
        event.preventDefault();
        navigateCharacterPaletteCharacters('next');
        return;
      }
    }

    // Handle shift-modified hotkeys (first/last frame, palette colors, flip utilities, onion skinning)
    if (event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const isShiftComma = event.key === '<' || event.code === 'Comma';
      const isShiftPeriod = event.key === '>' || event.code === 'Period';

      if (canNavigate && isShiftComma) {
        event.preventDefault();
        navigateFirst();
        return;
      }

      if (canNavigate && isShiftPeriod) {
        event.preventDefault();
        navigateLast();
        return;
      }

      if (isBracketLeft) {
        event.preventDefault();
        navigatePaletteColor('previous');
        return;
      }

      if (isBracketRight) {
        event.preventDefault();
        navigatePaletteColor('next');
        return;
      }

      // Shift+N — Add new layer
      if (event.key === 'N' || event.key === 'n') {
        event.preventDefault();
        useTimelineStore.getState().addLayer();
        return;
      }

      if (event.key === 'H' || event.key === 'h') {
        event.preventDefault();
        flipHorizontal();
        return;
      }
      if (event.key === 'V' || event.key === 'v') {
        event.preventDefault();
        flipVertical();
        return;
      }
      if (event.key === 'O' || event.key === 'o') {
        event.preventDefault();
        toggleOnionSkin();
        return;
      }
    }

    // Handle tool hotkeys (single key presses for tool switching)
    // Only process if no modifier keys are pressed and key is a valid tool hotkey
    if (!event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
      if (isBracketLeft) {
        event.preventDefault();
        adjustBrushSize('decrease');
        return;
      }

      if (isBracketRight) {
        event.preventDefault();
        adjustBrushSize('increase');
        return;
      }

      // Handle zoom hotkeys
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        zoomIn();
        return;
      }
      if (event.key === '-') {
        event.preventDefault();
        zoomOut();
        return;
      }

      // Handle timeline zoom hotkeys (1 = zoom out, 2 = zoom in)
      if (event.key === '1') {
        const tl = useTimelineStore.getState();
        if (tl.layers.length > 0) {
          event.preventDefault();
          tl.setZoom(Math.max(0.5, tl.view.zoom - 0.5));
          return;
        }
      }
      if (event.key === '2') {
        const tl = useTimelineStore.getState();
        if (tl.layers.length > 0) {
          event.preventDefault();
          tl.setZoom(Math.min(16, tl.view.zoom + 0.5));
          return;
        }
      }
      
      // Handle frame navigation shortcuts (comma and period keys)
      if (event.key === ',' && canNavigate) {
        event.preventDefault();
        navigatePrevious();
        return;
      }
      if (event.key === '.' && canNavigate) {
        event.preventDefault();
        navigateNext();
        return;
      }

      // Handle J/K — jump to previous/next visible keyframe
      if ((event.key === 'j' || event.key === 'k') && canNavigate) {
        const tl = useTimelineStore.getState();
        if (tl.layers.length > 0) {
          event.preventDefault();
          const current = tl.view.currentFrame;
          const direction = event.key === 'k' ? 1 : -1;
          const expandedIds = tl.view.expandedLayerIds;

          // Determine which groups are collapsed
          const collapsedGroupIds = new Set<string>();
          for (const g of tl.layerGroups) {
            if (g.collapsed) collapsedGroupIds.add(g.id as string);
          }

          // Collect keyframe frame numbers from visible (expanded) layers,
          // skipping layers inside collapsed groups
          const keyframeFrames = new Set<number>();
          for (const layer of tl.layers) {
            if (!expandedIds.has(layer.id)) continue;
            if (layer.parentGroupId && collapsedGroupIds.has(layer.parentGroupId as string)) continue;
            for (const track of layer.propertyTracks) {
              for (const kf of track.keyframes) {
                keyframeFrames.add(kf.frame);
              }
            }
            // Include effect keyframes from expanded effect tracks
            for (const et of (layer.effectTracks ?? [])) {
              if (!tl.view.expandedEffectTrackIds.has(et.effectBlock.id)) continue;
              for (const pt of et.effectBlock.propertyTracks) {
                for (const kf of pt.keyframes) {
                  keyframeFrames.add(kf.frame);
                }
              }
            }
          }

          // Also include keyframes from non-collapsed groups
          for (const g of tl.layerGroups) {
            if (g.collapsed) continue;
            for (const track of (g.propertyTracks ?? [])) {
              for (const kf of track.keyframes) {
                keyframeFrames.add(kf.frame);
              }
            }
            // Include group effect keyframes from expanded effect tracks
            for (const et of (g.effectTracks ?? [])) {
              if (!tl.view.expandedEffectTrackIds.has(et.effectBlock.id)) continue;
              for (const pt of et.effectBlock.propertyTracks) {
                for (const kf of pt.keyframes) {
                  keyframeFrames.add(kf.frame);
                }
              }
            }
          }

          // Include global effect keyframes from expanded effect tracks
          if (tl.view.globalEffectsExpanded) {
            for (const et of tl.globalEffects) {
              if (!tl.view.expandedEffectTrackIds.has(et.effectBlock.id)) continue;
              for (const pt of et.effectBlock.propertyTracks) {
                for (const kf of pt.keyframes) {
                  keyframeFrames.add(kf.frame);
                }
              }
            }
          }

          if (keyframeFrames.size > 0) {
            const sorted = [...keyframeFrames].sort((a, b) => a - b);
            let target: number | null = null;
            if (direction === 1) {
              target = sorted.find((f) => f > current) ?? null;
            } else {
              for (let i = sorted.length - 1; i >= 0; i--) {
                if (sorted[i] < current) { target = sorted[i]; break; }
              }
            }
            if (target !== null) {
              tl.goToFrame(target);
            } else {
              // Past the last/first keyframe — go to timeline boundary
              if (direction === 1) {
                tl.goToFrame(tl.config.durationFrames - 1);
              } else {
                tl.goToFrame(0);
              }
            }
          } else {
            // No visible keyframes — go to timeline boundary
            if (direction === 1) {
              tl.goToFrame(tl.config.durationFrames - 1);
            } else {
              tl.goToFrame(0);
            }
          }
          return;
        }
      }
      
      // Handle color hotkeys
      if (event.key === 'x') {
        // Swap foreground/background colors using existing logic
        event.preventDefault();
        swapForegroundBackground();
        return;
      }
      
      if (event.key === '[') {
        // Previous palette color
        event.preventDefault();
        navigatePaletteColor('previous');
        return;
      }
      
      if (event.key === ']') {
        // Next palette color
        event.preventDefault();
        navigatePaletteColor('next');
        return;
      }

      // Toggle show all keyframes (expand/collapse all layers with keyframes)
      if (event.key === 'u' && !event.repeat) {
        const tl = useTimelineStore.getState();
        if (tl.layers.length > 0) {
          event.preventDefault();
          // Determine if anything is currently expanded
          const hasExpandedLayers = tl.view.expandedLayerIds.size > 0;
          const hasExpandedEffects = tl.view.expandedEffectTrackIds.size > 0;
          const shouldExpand = !hasExpandedLayers && !hasExpandedEffects;
          // Use setTimeout to escape the keyboard event handler's execution context.
          setTimeout(() => {
            const current = useTimelineStore.getState();
            if (shouldExpand) {
              // Expand layers with keyframes; if none, expand all
              const withKfs = current.layers.filter((l) =>
                l.propertyTracks.some((t) => t.keyframes.length > 0) ||
                (l.effectTracks ?? []).some((et) => et.effectBlock.propertyTracks.some((pt) => pt.keyframes.length > 0))
              );
              const toExpand = withKfs.length > 0 ? withKfs : current.layers;
              current.setExpandedLayerIds(new Set(toExpand.map((l) => l.id)));
              // Also expand effect tracks that have keyframes (on layers)
              for (const layer of toExpand) {
                for (const et of (layer.effectTracks ?? [])) {
                  if (et.effectBlock.propertyTracks.some((pt) => pt.keyframes.length > 0)) {
                    if (!useTimelineStore.getState().view.expandedEffectTrackIds.has(et.effectBlock.id)) {
                      useTimelineStore.getState().toggleEffectTrackExpanded(et.effectBlock.id);
                    }
                  }
                }
              }
              // Expand global effects section if it has keyframed effects
              const globalHasKfs = current.globalEffects.some((et) =>
                et.effectBlock.propertyTracks.some((pt) => pt.keyframes.length > 0)
              );
              if (globalHasKfs || current.globalEffects.length > 0) {
                if (!useTimelineStore.getState().view.globalEffectsExpanded) {
                  useTimelineStore.getState().toggleGlobalEffectsExpanded();
                }
                // Expand individual global effect tracks with keyframes
                for (const et of current.globalEffects) {
                  if (et.effectBlock.propertyTracks.some((pt) => pt.keyframes.length > 0)) {
                    if (!useTimelineStore.getState().view.expandedEffectTrackIds.has(et.effectBlock.id)) {
                      useTimelineStore.getState().toggleEffectTrackExpanded(et.effectBlock.id);
                    }
                  }
                }
              }
              // Also expand any collapsed groups so their children are visible
              if (current.layerGroups.length > 0) {
                const hasCollapsed = current.layerGroups.some((g) => g.collapsed);
                if (hasCollapsed) {
                  useTimelineStore.setState({
                    layerGroups: current.layerGroups.map((g) =>
                      g.collapsed ? { ...g, collapsed: false } : g
                    ),
                  });
                }
                // Expand group effect tracks with keyframes
                for (const group of current.layerGroups) {
                  for (const et of (group.effectTracks ?? [])) {
                    if (et.effectBlock.propertyTracks.some((pt) => pt.keyframes.length > 0)) {
                      if (!useTimelineStore.getState().view.expandedEffectTrackIds.has(et.effectBlock.id)) {
                        useTimelineStore.getState().toggleEffectTrackExpanded(et.effectBlock.id);
                      }
                    }
                  }
                }
              }
            } else {
              // Collapse all (layers, effect tracks, and global effects)
              current.setExpandedLayerIds(new Set());
              // Collapse all expanded effect tracks
              const expandedEffects = new Set(current.view.expandedEffectTrackIds);
              for (const blockId of expandedEffects) {
                current.toggleEffectTrackExpanded(blockId);
              }
              // Collapse global effects section
              if (current.view.globalEffectsExpanded) {
                current.toggleGlobalEffectsExpanded();
              }
            }
          }, 0);
          return;
        }
      }
      
      const targetTool = getToolForHotkey(event.key);
      if (targetTool) {
        event.preventDefault();
        setActiveTool(targetTool);
        return;
      }
    }

    // Check for modifier keys (Cmd on Mac, Ctrl on Windows/Linux)
    if (!isModifierPressed) return;

    // Handle Ctrl+Arrow Left/Right: jump to next/previous visible keyframe
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      const tl = useTimelineStore.getState();
      if (tl.layers.length > 0) {
        event.preventDefault();
        const current = tl.view.currentFrame;
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const expandedIds = tl.view.expandedLayerIds;

        // Collect all keyframe frame numbers from expanded (visible) layers
        const keyframeFrames = new Set<number>();
        for (const layer of tl.layers) {
          if (!expandedIds.has(layer.id)) continue; // skip collapsed layers
          for (const track of layer.propertyTracks) {
            for (const kf of track.keyframes) {
              keyframeFrames.add(kf.frame);
            }
          }
          // Include effect keyframes from expanded effect tracks
          for (const et of (layer.effectTracks ?? [])) {
            if (!tl.view.expandedEffectTrackIds.has(et.effectBlock.id)) continue;
            for (const pt of et.effectBlock.propertyTracks) {
              for (const kf of pt.keyframes) {
                keyframeFrames.add(kf.frame);
              }
            }
          }
        }

        // Include global effect keyframes
        if (tl.view.globalEffectsExpanded) {
          for (const et of tl.globalEffects) {
            if (!tl.view.expandedEffectTrackIds.has(et.effectBlock.id)) continue;
            for (const pt of et.effectBlock.propertyTracks) {
              for (const kf of pt.keyframes) {
                keyframeFrames.add(kf.frame);
              }
            }
          }
        }

        if (keyframeFrames.size > 0) {
          const sorted = [...keyframeFrames].sort((a, b) => a - b);
          let target: number | null = null;
          if (direction === 1) {
            // Next keyframe after current
            target = sorted.find((f) => f > current) ?? null;
          } else {
            // Previous keyframe before current
            for (let i = sorted.length - 1; i >= 0; i--) {
              if (sorted[i] < current) { target = sorted[i]; break; }
            }
          }
          if (target !== null) {
            tl.goToFrame(target);
          }
        }
        return;
      }
    }
    
    // Handle Ctrl+Delete or Ctrl+Backspace for frame deletion (before the switch statement)
    if ((event.key === 'Delete' || event.key === 'Backspace') && isModifierPressed) {
      event.preventDefault();

      // Layer mode: delete content frame block
      const tl = useTimelineStore.getState();
      if (tl.layers.length > 0) {
        const activeLayerId = tl.view.activeLayerId;
        const activeLayer = tl.layers.find((l) => l.id === activeLayerId) ?? tl.layers[0];
        if (activeLayer) {
          const selectedIds = tl.view.selectedContentFrameIds;
          if (selectedIds.size > 0) {
            for (const cfId of selectedIds) {
              removeContentFrame(activeLayer.id, cfId);
            }
            tl.clearContentFrameSelection();
          } else {
            const cf = getContentFrameAtTime(activeLayer, tl.view.currentFrame);
            if (cf) removeContentFrame(activeLayer.id, cf.id);
          }
        }
        return;
      }

      // Legacy mode
      if (frames.length > 1) {
        const selectedFrames = Array.from(selectedFrameIndices).sort((a, b) => a - b);
        if (selectedFrames.length > 1) {
          deleteFrameRange(selectedFrames);
        } else {
          removeFrame(currentFrameIndex);
        }
      }
      return;
    }

    switch (normalizedKey) {
      case 'g': {
        // Cmd/Ctrl+G = Group selected layers
        if (!event.shiftKey) {
          event.preventDefault();
          const tl = useTimelineStore.getState();
          const selectedIds = Array.from(tl.view.selectedLayerIds);
          if (selectedIds.length >= 2) {
            // Check none are already in a group
            const allFree = selectedIds.every(id => {
              const l = tl.layers.find(layer => layer.id === id);
              return l && !l.parentGroupId;
            });
            if (allFree) {
              createGroup('Group', selectedIds);
            }
          }
        }
        break;
      }

      case 'n': {
        // Ctrl+N = Add new frame block at playhead
        if (!event.shiftKey) {
          event.preventDefault();
          const tl = useTimelineStore.getState();
          if (tl.layers.length > 0) {
            const activeLayerId = tl.view.activeLayerId;
            const activeLayer = tl.layers.find((l) => l.id === activeLayerId) ?? tl.layers[0];
            if (activeLayer) {
              addContentFrame(activeLayer.id, tl.view.currentFrame, 1);
            }
          } else {
            addFrame(currentFrameIndex + 1);
          }
        }
        break;
      }
        
      case 'd': {
        // Cmd/Ctrl+D = Deselect (if selection) or Duplicate frame block
        if (!event.shiftKey) {
          event.preventDefault();
          
          if (hasAnySelection()) {
            clearAllSelections();
          } else {
            const tl = useTimelineStore.getState();
            if (tl.layers.length > 0) {
              const activeLayerId = tl.view.activeLayerId;
              const activeLayer = tl.layers.find((l) => l.id === activeLayerId) ?? tl.layers[0];
              if (activeLayer) {
                const selectedIds = tl.view.selectedContentFrameIds;
                if (selectedIds.size > 0) {
                  for (const cfId of selectedIds) {
                    const cf = activeLayer.contentFrames.find((c) => c.id === cfId);
                    if (cf) duplicateContentFrame(activeLayer.id, cf.id);
                  }
                } else {
                  const cf = getContentFrameAtTime(activeLayer, tl.view.currentFrame);
                  if (cf) duplicateContentFrame(activeLayer.id, cf.id);
                }
              }
            } else {
              const selectedFrames = Array.from(selectedFrameIndices).sort((a, b) => a - b);
              if (selectedFrames.length > 1) {
                duplicateFrameRange(selectedFrames);
              } else {
                duplicateFrame(currentFrameIndex);
              }
            }
          }
        }
        break;
      }

      case 'x': {
        // Ctrl+X = Split frame block at playhead (layer mode)
        if (!event.shiftKey) {
          const tl = useTimelineStore.getState();
          if (tl.layers.length > 0) {
            event.preventDefault();
            const activeLayerId = tl.view.activeLayerId;
            const activeLayer = tl.layers.find((l) => l.id === activeLayerId) ?? tl.layers[0];
            if (activeLayer) {
              const cf = getContentFrameAtTime(activeLayer, tl.view.currentFrame);
              if (cf && tl.view.currentFrame > cf.startFrame) {
                splitContentFrame(activeLayer.id, cf.id, tl.view.currentFrame);
              }
            }
          }
          // In non-layer mode, don't prevent default (allows native cut)
        }
        break;
      }

      case ',': {
        // Ctrl+, = Set selected frame start to playhead
        if (!event.shiftKey) {
          const tl = useTimelineStore.getState();
          if (tl.layers.length > 0) {
            event.preventDefault();
            const activeLayerId = tl.view.activeLayerId;
            const activeLayer = tl.layers.find((l) => l.id === activeLayerId) ?? tl.layers[0];
            if (activeLayer && tl.view.selectedContentFrameIds.size === 1) {
              const cfId = [...tl.view.selectedContentFrameIds][0];
              const cf = activeLayer.contentFrames.find((c) => c.id === cfId);
              if (cf) {
                const cfEnd = cf.startFrame + cf.durationFrames;
                const newStart = Math.min(tl.view.currentFrame, cfEnd - 1);
                updateContentFrameTiming(activeLayer.id, cf.id, newStart, cfEnd - newStart);
              }
            }
          }
        }
        break;
      }

      case '.': {
        // Ctrl+. = Set selected frame end to playhead
        if (!event.shiftKey) {
          const tl = useTimelineStore.getState();
          if (tl.layers.length > 0) {
            event.preventDefault();
            const activeLayerId = tl.view.activeLayerId;
            const activeLayer = tl.layers.find((l) => l.id === activeLayerId) ?? tl.layers[0];
            if (activeLayer && tl.view.selectedContentFrameIds.size === 1) {
              const cfId = [...tl.view.selectedContentFrameIds][0];
              const cf = activeLayer.contentFrames.find((c) => c.id === cfId);
              if (cf) {
                const newEnd = Math.max(tl.view.currentFrame + 1, cf.startFrame + 1);
                updateContentFrameTiming(activeLayer.id, cf.id, cf.startFrame, newEnd - cf.startFrame);
              }
            }
          }
        }
        break;
      }

        
      case 'a':
        // Select All - activate selection tool and select entire canvas
        event.preventDefault();
        
        // Switch to selection tool if not already active
        if (activeTool !== 'select') {
          setActiveTool('select');
        }
        
        // Clear any existing selections
        clearSelection();
        clearLassoSelection();
        clearMagicWandSelection();
        
        // Create a selection that covers the entire canvas
        // Canvas coordinates go from 0,0 to width-1,height-1
        startSelection(0, 0);
        updateSelection(width - 1, height - 1);
        break;
        
      case 'c':
        // Copy selection (prioritize magic wand, then lasso, then rectangular)
        // When "All Layers" is on, copy from composited view instead of active layer
        {
          const { selectionAffectsAllLayers } = useToolStore.getState();
          let copySource = cells;
          if (selectionAffectsAllLayers) {
            // Get composited cells from all visible layers
            const tl = useTimelineStore.getState();
            if (tl.layers.length > 0) {
              const canvasWidth = useCanvasStore.getState().width;
              const canvasHeight = useCanvasStore.getState().height;
              copySource = compositeLayersAtFrame(tl.layers, tl.view.currentFrame, canvasWidth, canvasHeight, undefined, false, tl.layerGroups);
            }
          }
          if (magicWandSelection.active) {
            event.preventDefault();
            copyMagicWandSelection(copySource, selectionAffectsAllLayers);
          } else if (lassoSelection.active) {
            event.preventDefault();
            copyLassoSelection(copySource, selectionAffectsAllLayers);
          } else if (selection.active) {
            event.preventDefault();
            copySelection(copySource, selectionAffectsAllLayers);
          }
        }
        break;
        
      case 'v':
        // Enhanced paste with preview mode
        event.preventDefault();
        
        // If already in paste mode, commit the paste
        if (pasteMode.isActive) {
          const pastedData = commitPaste();
          if (pastedData) {
            // Save current state for undo
            const { pushCanvasHistory, finalizeCanvasHistory } = useToolStore.getState();
            pushCanvasHistory(new Map(cells), currentFrameIndex, 'Paste lasso selection');
            
            // Merge pasted data with current canvas
            const newCells = new Map(cells);
            pastedData.forEach((cell, key) => {
              newCells.set(key, cell);
            });
            
            setCanvasData(newCells);
            finalizeCanvasHistory(new Map(newCells));
          }
        } else {
          startPasteFromClipboard();
        }
        break;
        
      case 'z':
        // Undo/Redo with enhanced history support
        if (event.shiftKey) {
          // Shift+Cmd+Z = Redo
          if (canRedo()) {
            event.preventDefault();
            const redoAction = redo();
            if (redoAction) {
              // Set flag to prevent auto-save during history processing
              useToolStore.setState({ isProcessingHistory: true });
              try {
                handleHistoryAction(redoAction, true);
              } finally {
                useToolStore.setState({ isProcessingHistory: false });
              }
            }
          }
        } else {
          // Cmd+Z = Undo
          if (canUndo()) {
            event.preventDefault();
            const undoAction = undo();
            if (undoAction) {
              // Set flag to prevent auto-save during history processing
              useToolStore.setState({ isProcessingHistory: true });
              try {
                handleHistoryAction(undoAction, false);
              } finally {
                useToolStore.setState({ isProcessingHistory: false });
              }
            }
          }
        }
        break;
    }
  }, [
    cells,
    width,
    height,
    selection,
    lassoSelection,
    magicWandSelection,
    copySelection,
    copyLassoSelection,
    copyMagicWandSelection,
    clearSelection,
    clearLassoSelection,
    clearMagicWandSelection,
    startSelection,
    updateSelection,
    setCanvasData,
    undo,
    redo,
    canUndo,
    canRedo,
    handleHistoryAction,
    commitPaste,
    pasteMode,
    startPasteFromClipboard,
    textToolState,
    activeTool,
    setActiveTool,
    swapForegroundBackground,
    adjustBrushSize,
    toggleOnionSkin,
    currentFrameIndex,
    frames,
    selectedFrameIndices,
    zoomIn,
    zoomOut,
    navigateNext,
    navigatePrevious,
    navigateFirst,
    navigateLast,
    navigatePaletteColor,
    navigateCharacterPaletteCharacters,
    canNavigate,
    addFrame,
    removeFrame,
    duplicateFrame,
    duplicateFrameRange,
    deleteFrameRange,
    flipHorizontal,
    flipVertical,
    canCrop,
    cropToSelection,
    showSaveProjectDialog,
    showSaveAsDialog,
    showOpenProjectDialog,
    blockBrowserShortcut,
    isPlaybackActive,
    startOptimizedPlayback,
    stopOptimizedPlayback,
    addContentFrame,
    removeContentFrame,
    duplicateContentFrame,
    splitContentFrame,
    updateContentFrameTiming,
    createGroup,
  ]);

  const handleShortcutKeyPress = useCallback((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey) {
      const normalizedKey = typeof event.key === 'string' ? event.key.toLowerCase() : '';
      if (normalizedKey === 's' || normalizedKey === 'o') {
        blockBrowserShortcut(event);
      }
    }
  }, [blockBrowserShortcut]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keypress', handleShortcutKeyPress, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keypress', handleShortcutKeyPress, true);
    };
  }, [handleKeyDown, handleShortcutKeyPress]);

  return {
    // Expose functions for UI buttons
    copySelection: () => {
      // Use global selection store for cross-tool selection support
      const globalSelection = useSelectionStore.getState();
      if (globalSelection.isActive && globalSelection.selectedCells.size > 0) {
        // Copy from global selection (handles combined cross-tool selections)
        globalSelection.copySelection(cells);
        return;
      }
      
      // Fallback to tool-specific copy for backward compatibility
      if (magicWandSelection.active) {
        copyMagicWandSelection(cells);
      } else if (lassoSelection.active) {
        copyLassoSelection(cells);
      } else if (selection.active) {
        copySelection(cells);
      }
    },
    pasteSelection: () => {
      // If already in paste mode, commit the paste
      if (pasteMode.isActive) {
        const pastedData = commitPaste();
        if (pastedData) {
          const { pushCanvasHistory, finalizeCanvasHistory } = useToolStore.getState();
          pushCanvasHistory(new Map(cells), currentFrameIndex, 'Paste selection');
          const newCells = new Map(cells);
          pastedData.forEach((cell, key) => {
            newCells.set(key, cell);
          });
          setCanvasData(newCells);
          finalizeCanvasHistory(new Map(newCells));
        }
      } else {
        startPasteFromClipboard();
      }
    }
  };
};
