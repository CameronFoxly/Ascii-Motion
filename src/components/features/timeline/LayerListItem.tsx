/**
 * Layer List Item — individual layer row with visibility, solo, lock, and name.
 * 
 * Part of the Layer Timeline Refactor (Phase 3)
 * See: docs/LAYER_TIMELINE_REFACTOR_PLAN.md §3.4
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTimelineStore } from '../../../stores/timelineStore';
import { useToolStore } from '../../../stores/toolStore';
import { useTimelineHistory } from '../../../hooks/useTimelineHistory';
import { getPropertyValueAtFrame } from '../../../utils/layerCompositing';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Lock, Unlock, ChevronRight, ChevronLeft, Trash2, Plus, X, Diamond, RectangleEllipsis } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';
import { Button } from '../../ui/button';
import { EffectTrackRow } from './EffectTrackRow';
import { useEffectBlockHistory } from '../../../hooks/useEffectBlockHistory';
import { getAllEffects, getEffect } from '../../../registry/effectRegistry';
import { evaluateEffectBlock } from '../../../utils/effectsPipeline';
import { getGenerator } from '../../../registry/generatorRegistry';
import { resolveGeneratorSettings } from '../../../utils/generators/generatorRuntime';
import { withGeneratorHistory } from '../../../utils/generators/generatorHistory';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import type { Layer, PropertyPath } from '../../../types/timeline';
import { PROPERTY_DEFINITIONS, PROPERTY_DISPLAY_ORDER } from '../../../types/timeline';

interface LayerListItemProps {
  layer: Layer;
  isActive: boolean;
  isSelected?: boolean;
  isInGroup?: boolean;
  isRenaming?: boolean;
  onStartRename?: () => void;
  onFinishRename?: () => void;
  onSelect: (e: React.MouseEvent) => void;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const LayerListItem: React.FC<LayerListItemProps> = React.memo(function LayerListItem({
  layer,
  isActive,
  isSelected,
  isInGroup,
  isRenaming,
  onStartRename,
  onFinishRename,
  onSelect,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onContextMenu,
}) {
  const setLayerVisible = useTimelineStore((s) => s.setLayerVisible);
  const setLayerSolo = useTimelineStore((s) => s.setLayerSolo);
  const setLayerLocked = useTimelineStore((s) => s.setLayerLocked);
  const setLayerSyncKeyframes = useTimelineStore((s) => s.setLayerSyncKeyframes);
  const renameLayer = useTimelineStore((s) => s.renameLayer);

  const { removeLayer, addKeyframe, removeKeyframe } = useTimelineHistory();
  const layers = useTimelineStore((s) => s.layers);
  const isExpanded = useTimelineStore((s) => s.view.expandedLayerIds.has(layer.id));
  const toggleLayerExpanded = useTimelineStore((s) => s.toggleLayerExpanded);
  const addPropertyTrack = useTimelineStore((s) => s.addPropertyTrack);
  const removePropertyTrack = useTimelineStore((s) => s.removePropertyTrack);
  const currentFrame = useTimelineStore((s) => s.view.currentFrame);
  const selectKeyframes = useTimelineStore((s) => s.selectKeyframes);
  const addKeyframesToSelection = useTimelineStore((s) => s.addKeyframesToSelection);
  const setEditingKeyframe = useTimelineStore((s) => s.setEditingKeyframe);
  const goToFrame = useTimelineStore((s) => s.goToFrame);
  const expandedEffectTrackIds = useTimelineStore((s) => s.view.expandedEffectTrackIds);
  const addEffectBlock = useTimelineStore((s) => s.addEffectBlock);
  const addEffectKeyframe = useTimelineStore((s) => s.addEffectKeyframe);
  const removeEffectKeyframe = useTimelineStore((s) => s.removeEffectKeyframe);
  const pushToHistory = useToolStore((s) => s.pushToHistory);
  const { recordAdd: recordEffectAdd } = useEffectBlockHistory();

  const moveEffectTrack = useTimelineStore((s) => s.moveEffectTrack);
  const [isEffectDragOver, setIsEffectDragOver] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(layer.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Trigger rename from external source (context menu)
  useEffect(() => {
    if (isRenaming && !isEditing) {
      setEditName(layer.name);
      setIsEditing(true);
    }
  }, [isRenaming, isEditing, layer.name]);

  const handleDoubleClick = useCallback(() => {
    setEditName(layer.name);
    setIsEditing(true);
    onStartRename?.();
  }, [layer.name, onStartRename]);

  const handleNameCommit = useCallback(() => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== layer.name) {
      renameLayer(layer.id, trimmed);
    }
    setIsEditing(false);
    onFinishRename?.();
  }, [editName, layer.id, layer.name, renameLayer, onFinishRename]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleNameCommit();
      } else if (e.key === 'Escape') {
        setIsEditing(false);
      }
    },
    [handleNameCommit],
  );

  return (
    <div
      className={cn(
        'select-none',
        isActive && 'bg-accent/50',
        isSelected && !isActive && 'bg-accent/30',
        isInGroup && 'pl-3',
        isDragOver && !isEffectDragOver && 'border-t-2 border-t-primary',
        isEffectDragOver && 'ring-1 ring-inset ring-primary bg-primary/10',
      )}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      draggable
      onDragStart={(e) => {
        // Don't drag layer when starting from an effect track row
        if ((e.target as HTMLElement).closest('[data-effect-track]')) {
          return;
        }
        e.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('application/effect-block-id')) {
          // Effect being dragged over this layer — show "onto" highlight
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'move';
          setIsEffectDragOver(true);
        } else {
          // Layer being dragged — use existing handler
          onDragOver(e);
        }
      }}
      onDragLeave={(e) => {
        setIsEffectDragOver(false);
        // Only call onDragEnd if we're leaving the element entirely
        if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
          setIsEffectDragOver(false);
        }
      }}
      onDrop={(e) => {
        if (e.dataTransfer.types.includes('application/effect-block-id')) {
          // Effect dropped on this layer
          e.preventDefault();
          e.stopPropagation();
          setIsEffectDragOver(false);
          const draggedBlockId = e.dataTransfer.getData('application/effect-block-id');
          if (draggedBlockId) {
            // Snapshot before move for undo
            const tl = useTimelineStore.getState();
            let sourceTrack: import('../../../types/effectBlock').EffectTrack | undefined;
            let sourceOwnerId: string | null = null;
            for (const l of tl.layers) {
              const t = (l.effectTracks ?? []).find((et) => (et.effectBlock.id as string) === draggedBlockId);
              if (t) { sourceTrack = t; sourceOwnerId = l.id as string; break; }
            }
            if (!sourceTrack) {
              for (const g of tl.layerGroups) {
                const t = (g.effectTracks ?? []).find((et) => (et.effectBlock.id as string) === draggedBlockId);
                if (t) { sourceTrack = t; sourceOwnerId = g.id as string; break; }
              }
            }
            if (!sourceTrack) {
              sourceTrack = tl.globalEffects.find((et) => (et.effectBlock.id as string) === draggedBlockId);
              if (sourceTrack) sourceOwnerId = null;
            }

            moveEffectTrack(
              draggedBlockId as import('../../../types/effectBlock').EffectBlockId,
              layer.id,
              0,
            );

            // Record undo history
            if (sourceTrack) {
              useToolStore.getState().pushToHistory({
                type: 'effect_block_remove', timestamp: Date.now(), description: 'Move effect to layer',
                data: {
                  ownerId: sourceOwnerId,
                  ownerType: sourceOwnerId === null ? 'global' : 'layer',
                  trackSnapshot: structuredClone(sourceTrack),
                  trackIndex: 0,
                },
              } as import('../../../types').EffectBlockRemoveHistoryAction);
            }

            // Auto-expand layer to show the effect
            if (!useTimelineStore.getState().view.expandedLayerIds.has(layer.id)) {
              useTimelineStore.getState().toggleLayerExpanded(layer.id);
            }
          }
        } else {
          onDrop();
        }
      }}
      onDragEnd={onDragEnd}
    >
    <TooltipProvider>
      <div className="flex items-center gap-0.5 px-1.5 py-1 min-h-[32px] border-b border-border/50">
        {/* Expand arrow */}
        <button
          className="p-0.5 hover:bg-muted rounded"
          onClick={(e) => {
            e.stopPropagation();
            toggleLayerExpanded(layer.id);
          }}
        >
          <ChevronRight
            className={cn(
              'w-3 h-3 transition-transform text-muted-foreground',
              isExpanded && 'rotate-90',
            )}
          />
        </button>

        {/* Visibility */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="p-0.5 hover:bg-muted rounded"
              onClick={(e) => {
                e.stopPropagation();
                setLayerVisible(layer.id, !layer.visible);
              }}
            >
              {layer.visible ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-muted-foreground/50" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {layer.visible ? 'Hide layer' : 'Show layer'}
          </TooltipContent>
        </Tooltip>

        {/* Solo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn(
                'p-0.5 hover:bg-muted rounded text-xs font-bold w-5 h-5 flex items-center justify-center',
                layer.solo ? 'text-yellow-500' : 'text-muted-foreground/50',
              )}
              onClick={(e) => {
                e.stopPropagation();
                setLayerSolo(layer.id, !layer.solo);
              }}
            >
              S
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {layer.solo ? 'Unsolo layer' : 'Solo layer'}
          </TooltipContent>
        </Tooltip>

        {/* Lock */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="p-0.5 hover:bg-muted rounded"
              onClick={(e) => {
                e.stopPropagation();
                setLayerLocked(layer.id, !layer.locked);
              }}
            >
              {layer.locked ? (
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <Unlock className="w-3.5 h-3.5 text-muted-foreground/50" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {layer.locked ? 'Unlock layer' : 'Lock layer'}
          </TooltipContent>
        </Tooltip>

        {/* Generator badge (procedural generator layers) */}
        {layer.generator && (() => {
          const GenIcon = getGenerator(layer.generator.generatorType)?.icon;
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    'p-0.5 hover:bg-muted rounded flex-shrink-0',
                    layer.generator.enabled ? 'text-teal-400' : 'text-muted-foreground/40',
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    useTimelineStore.getState().selectGeneratorLayer(layer.id);
                  }}
                >
                  {GenIcon ? <GenIcon className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Edit generator settings</TooltipContent>
            </Tooltip>
          );
        })()}

        {/* Name */}
        <div className="flex-1 min-w-0 mx-1">
          {isEditing ? (
            <input
              ref={inputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleNameCommit}
              onKeyDown={handleKeyDown}
              className="w-full text-xs bg-background border rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-ring"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className={cn(
                'text-xs truncate block',
                !layer.visible && 'text-muted-foreground/50',
              )}
              onDoubleClick={handleDoubleClick}
            >
              {layer.name}
            </span>
          )}
        </div>

        {/* Sync keyframes to frame drag toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn(
                'p-0.5 hover:bg-muted rounded flex-shrink-0',
                layer.syncKeyframesToFrames ? 'text-blue-400' : 'text-muted-foreground/40',
              )}
              onClick={(e) => {
                e.stopPropagation();
                setLayerSyncKeyframes(layer.id, !layer.syncKeyframesToFrames);
              }}
            >
              <RectangleEllipsis className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {layer.syncKeyframesToFrames
              ? 'Keyframes move with frames (click to disable)'
              : 'Sync keyframes to frame drag (click to enable)'}
          </TooltipContent>
        </Tooltip>

        {/* Delete button (only if more than 1 layer) */}
        {layers.length > 1 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  removeLayer(layer.id);
                }}
              >
                <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Delete layer</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Expanded: property track labels + Add Property menu */}
      {isExpanded && (
        <div className="ml-5">
          {[...layer.propertyTracks]
            .sort((a, b) => {
              const idxA = PROPERTY_DISPLAY_ORDER.indexOf(a.propertyPath);
              const idxB = PROPERTY_DISPLAY_ORDER.indexOf(b.propertyPath);
              return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
            })
            .map((track) => {
            const def = PROPERTY_DEFINITIONS[track.propertyPath];
            const currentValue = getPropertyValueAtFrame(layer, track.propertyPath, currentFrame);
            const existingKf = track.keyframes.find((kf) => kf.frame === currentFrame);
            return (
              <div
                key={track.id}
                className="flex items-center px-1.5 py-0.5 min-h-[24px] text-xs text-muted-foreground group/track"
              >
                <span
                  className="flex-1 truncate cursor-pointer hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    const kfIds = track.keyframes.map((kf) => kf.id);
                    if (kfIds.length === 0) return;
                    if (e.shiftKey || e.metaKey || e.ctrlKey) {
                      // Shift+click: add all keyframes on this track to selection
                      addKeyframesToSelection(kfIds);
                    } else {
                      // Plain click: select only this track's keyframes
                      selectKeyframes(kfIds);
                    }
                    // Set editing to the last keyframe
                    setEditingKeyframe(kfIds[kfIds.length - 1]);
                  }}
                >
                  {def?.displayName ?? track.propertyPath.split('.').pop()}
                </span>
                {/* Previous keyframe on this track */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="p-0.5 hover:bg-muted rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        const prev = [...track.keyframes]
                          .map((kf) => kf.frame)
                          .filter((f) => f < currentFrame)
                          .sort((a, b) => b - a)[0];
                        if (prev !== undefined) goToFrame(prev);
                      }}
                      disabled={!track.keyframes.some((kf) => kf.frame < currentFrame)}
                    >
                      <ChevronLeft className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Previous keyframe on this track</TooltipContent>
                </Tooltip>
                {/* Add/remove keyframe at current frame */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="p-0.5 hover:bg-muted rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (existingKf) {
                          removeKeyframe(layer.id, track.id, existingKf.id);
                          setEditingKeyframe(null);
                        } else {
                          const kfId = addKeyframe(layer.id, track.id, currentFrame, currentValue);
                          if (kfId) {
                            selectKeyframes([kfId]);
                            setEditingKeyframe(kfId);
                          }
                        }
                      }}
                    >
                      {existingKf ? (
                        <Diamond className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      ) : (
                        <Diamond className="w-3 h-3 text-yellow-500 hover:text-yellow-400" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {existingKf ? 'Remove keyframe at current frame' : 'Add keyframe at current frame'}
                  </TooltipContent>
                </Tooltip>
                {/* Next keyframe on this track */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="p-0.5 hover:bg-muted rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = [...track.keyframes]
                          .map((kf) => kf.frame)
                          .filter((f) => f > currentFrame)
                          .sort((a, b) => a - b)[0];
                        if (next !== undefined) goToFrame(next);
                      }}
                      disabled={!track.keyframes.some((kf) => kf.frame > currentFrame)}
                    >
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Next keyframe on this track</TooltipContent>
                </Tooltip>
                <button
                  className="p-0.5 hover:bg-muted rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePropertyTrack(layer.id, track.id);
                  }}
                >
                  <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            );
          })}

          {/* + Add Property dropdown */}
          {(() => {
            const existingPaths = new Set(layer.propertyTracks.map((t) => t.propertyPath));
            const availableProps = Object.entries(PROPERTY_DEFINITIONS).filter(
              ([path]) => !existingPaths.has(path as PropertyPath),
            );
            if (availableProps.length === 0) return null;
            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-1 px-1.5 py-0.5 min-h-[24px] text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Plus className="w-3 h-3" />
                    Add Property
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[160px]">
                  {availableProps.map(([path, def]) => (
                    <DropdownMenuItem
                      key={path}
                      onClick={() => addPropertyTrack(layer.id, path as PropertyPath)}
                    >
                      {def?.displayName ?? path}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })()}

          {/* Generator property track labels (procedural generator layers) */}
          {layer.generator && layer.generator.propertyTracks.map((pt) => {
            const source = layer.generator!;
            const propDef = getGenerator(source.generatorType)?.propertyDefinitions.find((d) => d.path === pt.propertyPath);
            const label = propDef?.displayName ?? pt.propertyPath;
            const existingKfAtFrame = pt.keyframes.find((kf) => kf.frame === currentFrame);
            const trackId = pt.id as unknown as import('../../../types/timeline').PropertyTrackId;
            return (
              <div
                key={pt.id}
                className="flex items-center px-1.5 py-0.5 min-h-[24px] text-xs text-teal-300/80 group/genprop"
              >
                <span
                  className="flex-1 truncate cursor-pointer hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    const kfIds = pt.keyframes.map((kf) => kf.id as unknown as import('../../../types/timeline').KeyframeId);
                    if (kfIds.length === 0) return;
                    if (e.shiftKey || e.metaKey || e.ctrlKey) addKeyframesToSelection(kfIds);
                    else selectKeyframes(kfIds);
                    setEditingKeyframe(kfIds[kfIds.length - 1]);
                  }}
                >
                  {label}
                </span>
                <button
                  className="p-0.5 hover:bg-muted rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    const prev = pt.keyframes.map((kf) => kf.frame).filter((f) => f < currentFrame).sort((a, b) => b - a)[0];
                    if (prev !== undefined) goToFrame(prev);
                  }}
                  disabled={!pt.keyframes.some((kf) => kf.frame < currentFrame)}
                >
                  <ChevronLeft className="w-3 h-3 text-muted-foreground" />
                </button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="p-0.5 hover:bg-muted rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (existingKfAtFrame) {
                          removeKeyframe(layer.id, trackId, existingKfAtFrame.id as unknown as import('../../../types/timeline').KeyframeId);
                          setEditingKeyframe(null);
                        } else {
                          const value = resolveGeneratorSettings(source, currentFrame)[pt.propertyPath];
                          const kfId = addKeyframe(layer.id, trackId, currentFrame, value as number);
                          if (kfId) {
                            selectKeyframes([kfId]);
                            setEditingKeyframe(kfId);
                          }
                        }
                      }}
                    >
                      {existingKfAtFrame ? (
                        <Diamond className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      ) : (
                        <Diamond className="w-3 h-3 text-yellow-500 hover:text-yellow-400" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {existingKfAtFrame ? 'Remove keyframe at current frame' : 'Add keyframe at current frame'}
                  </TooltipContent>
                </Tooltip>
                <button
                  className="p-0.5 hover:bg-muted rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = pt.keyframes.map((kf) => kf.frame).filter((f) => f > currentFrame).sort((a, b) => a - b)[0];
                    if (next !== undefined) goToFrame(next);
                  }}
                  disabled={!pt.keyframes.some((kf) => kf.frame > currentFrame)}
                >
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                </button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="p-0.5 hover:bg-muted rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        withGeneratorHistory(layer.id, `Remove ${label} animation`, () => {
                          useTimelineStore.getState().removeGeneratorPropertyTrack(layer.id, pt.id, currentFrame);
                        });
                      }}
                    >
                      <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Remove animation (keeps current value)</TooltipContent>
                </Tooltip>
              </div>
            );
          })}
        </div>
      )}

      {/* Effect track rows + Add Effect (when expanded) */}
      {isExpanded && (
        <div className="ml-5">
          {/* Existing effect tracks */}
          {(layer.effectTracks ?? []).map((track, idx) => (
            <React.Fragment key={track.id}>
              <EffectTrackRow
                track={track}
                isExpanded={expandedEffectTrackIds.has(track.effectBlock.id)}
                index={idx}
              />
              {/* Effect property track labels when expanded */}
              {expandedEffectTrackIds.has(track.effectBlock.id) && track.effectBlock.propertyTracks.map((pt) => {
                const effectEntry = getEffect(track.effectBlock.effectType);
                const propDef = effectEntry?.propertyDefinitions.find((d) => d.path === pt.propertyPath);
                const existingKfAtFrame = pt.keyframes.find((kf) => kf.frame === currentFrame);
                return (
                <div
                  key={pt.id}
                  className="flex items-center pl-6 pr-1.5 min-h-[24px] border-b border-border/30 text-[10px] text-muted-foreground group/effprop"
                >
                  <span className="flex-1 truncate">{propDef?.displayName ?? pt.propertyPath}</span>
                  <button
                    className="p-0.5 hover:bg-muted rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      const prev = [...pt.keyframes].map((kf) => kf.frame).filter((f) => f < currentFrame).sort((a, b) => b - a)[0];
                      if (prev !== undefined) goToFrame(prev);
                    }}
                    disabled={!pt.keyframes.some((kf) => kf.frame < currentFrame)}
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="p-0.5 hover:bg-muted rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (existingKfAtFrame) {
                            pushToHistory({
                              type: 'effect_keyframe_remove', timestamp: Date.now(),
                              description: `Remove ${propDef?.displayName ?? pt.propertyPath} keyframe`,
                              data: { ownerId: null, ownerType: 'layer', blockId: track.effectBlock.id as string,
                                trackId: pt.id as string, keyframe: structuredClone(existingKfAtFrame) },
                            } as import('../../../types').EffectKeyframeRemoveHistoryAction);
                            removeEffectKeyframe(track.effectBlock.id, pt.id, existingKfAtFrame.id as import('../../../types/timeline').KeyframeId);
                          } else {
                            const resolved = evaluateEffectBlock(track.effectBlock, currentFrame);
                            const kfValue = (resolved[pt.propertyPath] ?? propDef?.defaultValue ?? 0) as import('../../../types/effectBlock').EffectKeyframe['value'];
                            const kfId = addEffectKeyframe(track.effectBlock.id, pt.id, currentFrame, kfValue);
                            pushToHistory({
                              type: 'effect_keyframe_add', timestamp: Date.now(),
                              description: `Add ${propDef?.displayName ?? pt.propertyPath} keyframe`,
                              data: { ownerId: null, ownerType: 'layer', blockId: track.effectBlock.id as string,
                                trackId: pt.id as string,
                                keyframe: { id: kfId, frame: currentFrame, value: kfValue, easing: { type: 'linear' as const } } },
                            } as import('../../../types').EffectKeyframeAddHistoryAction);
                            if (kfId) {
                              selectKeyframes([kfId]);
                              setEditingKeyframe(kfId);
                            }
                          }
                        }}
                      >
                        {existingKfAtFrame ? (
                          <Diamond className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        ) : (
                          <Diamond className="w-3 h-3 text-muted-foreground/40 hover:text-yellow-400" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {existingKfAtFrame ? 'Remove keyframe at current frame' : 'Add keyframe at current frame'}
                    </TooltipContent>
                  </Tooltip>
                  <button
                    className="p-0.5 hover:bg-muted rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = [...pt.keyframes].map((kf) => kf.frame).filter((f) => f > currentFrame).sort((a, b) => a - b)[0];
                      if (next !== undefined) goToFrame(next);
                    }}
                    disabled={!pt.keyframes.some((kf) => kf.frame > currentFrame)}
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                );
              })}
            </React.Fragment>
          ))}

          {/* + Add Effect dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-1 px-1.5 py-0.5 min-h-[24px] text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <Plus className="w-3 h-3" />
                Add Effect
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[160px]">
              {getAllEffects().map((effect) => (
                <DropdownMenuItem
                  key={effect.type}
                  onClick={() => {
                    const start = currentFrame;
                    const duration = Math.max(1, useTimelineStore.getState().config.durationFrames - start);
                    const blockId = addEffectBlock(layer.id, effect.type, start, duration);
                    if (blockId) {
                      recordEffectAdd(layer.id, blockId);
                      // Auto-expand layer if not already
                      if (!useTimelineStore.getState().view.expandedLayerIds.has(layer.id)) {
                        useTimelineStore.getState().toggleLayerExpanded(layer.id);
                      }
                    }
                  }}
                >
                  <effect.icon className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  {effect.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </TooltipProvider>
    </div>
  );
});
