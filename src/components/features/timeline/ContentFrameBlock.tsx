/**
 * Content Frame Block — a selectable, draggable, resizable block representing
 * a content frame on the timeline.
 *
 * Supports:
 *  - Click to select (and activate layer)
 *  - Shift+click to multi-select
 *  - Drag to reorder within or across layers with ghost + drop indicator
 *  - Edge-drag to resize
 *
 * Part of the Layer Timeline Refactor (Phase 3)
 * See: docs/LAYER_TIMELINE_REFACTOR_PLAN.md §3.8
 */

import React, { useCallback, useRef } from 'react';
import { useTimelineStore } from '../../../stores/timelineStore';
import { useTimelineHistory } from '../../../hooks/useTimelineHistory';
import { useToolStore } from '../../../stores/toolStore';
import { cn } from '@/lib/utils';
import type { ContentFrame, ContentFrameId, LayerId, PropertyTrackId, KeyframeId } from '../../../types/timeline';
import type { ContentFrameReorderHistoryAction } from '../../../types';

interface ContentFrameBlockProps {
  layerId: LayerId;
  contentFrame: ContentFrame;
  pxPerFrame: number;
  scrollX: number;
  onContextMenu?: (e: React.MouseEvent, cfId: ContentFrameId, layerId: LayerId) => void;
}

const DRAG_THRESHOLD = 4;

export const ContentFrameBlock: React.FC<ContentFrameBlockProps> = React.memo(function ContentFrameBlock({
  layerId,
  contentFrame,
  pxPerFrame,
  onContextMenu,
}) {
  const updateContentFrameTiming = useTimelineStore((s) => s.updateContentFrameTiming);
  const { updateContentFrameTiming: updateTimingHistory } = useTimelineHistory();
  const pushToHistory = useToolStore((s) => s.pushToHistory);
  const activeLayerId = useTimelineStore((s) => s.view.activeLayerId);
  const selectedIds = useTimelineStore((s) => s.view.selectedContentFrameIds);
  const selectContentFrames = useTimelineStore((s) => s.selectContentFrames);
  const addContentFramesToSelection = useTimelineStore((s) => s.addContentFramesToSelection);
  const toggleContentFrameSelected = useTimelineStore((s) => s.toggleContentFrameSelected);
  const setActiveLayer = useTimelineStore((s) => s.setActiveLayer);
  const setContentFrameDragPreview = useTimelineStore((s) => s.setContentFrameDragPreview);

  const isActive = layerId === activeLayerId;
  const isSelected = selectedIds.has(contentFrame.id);
  const dragPreview = useTimelineStore((s) => s.view.contentFrameDragPreview);
  const isDragging = dragPreview?.frameId === contentFrame.id;

  const left = contentFrame.startFrame * pxPerFrame;
  const width = Math.max(contentFrame.durationFrames * pxPerFrame, 4);
  const blockRef = useRef<HTMLDivElement>(null);

  // ── Helpers ──

  const getTargetLayerId = (clientY: number): LayerId => {
    const els = document.querySelectorAll<HTMLElement>('[data-layer-id]');
    for (const el of els) {
      const rect = el.getBoundingClientRect();
      if (clientY >= rect.top && clientY < rect.bottom) {
        const hovered = el.dataset.layerId as LayerId;
        // Content frames can't be dropped onto procedural generator layers
        const isGenerator = useTimelineStore.getState().layers.some((l) => l.id === hovered && l.kind === 'generator');
        return isGenerator ? layerId : hovered;
      }
    }
    return layerId;
  };

  const getOtherFrames = (tgtLayerId: LayerId) => {
    const tl = useTimelineStore.getState();
    const layer = tl.layers.find((l) => l.id === tgtLayerId);
    if (!layer) return [];
    return [...layer.contentFrames]
      .filter((cf) => cf.id !== contentFrame.id)
      .sort((a, b) => a.startFrame - b.startFrame);
  };

  const getDropTarget = (mouseLeftFrame: number, otherFrames: ContentFrame[]) => {
    const duration = contentFrame.durationFrames;
    const centerFrame = mouseLeftFrame + duration / 2;
    const roundedStart = Math.max(0, Math.round(mouseLeftFrame));

    const overFrame = otherFrames.find(
      (cf) => centerFrame >= cf.startFrame && centerFrame < cf.startFrame + cf.durationFrames,
    );

    if (!overFrame) {
      return { targetStart: roundedStart, slotFrame: roundedStart };
    }

    const leftBoundary = overFrame.startFrame;
    const rightBoundary = overFrame.startFrame + overFrame.durationFrames;
    const distLeft = Math.abs(mouseLeftFrame - leftBoundary);
    const distRight = Math.abs(mouseLeftFrame - rightBoundary);

    return distLeft <= distRight
      ? { targetStart: leftBoundary, slotFrame: leftBoundary }
      : { targetStart: rightBoundary, slotFrame: rightBoundary };
  };

  // ── Main handler: click / shift-click / drag ──

  /** Snapshot a layer's content frames for undo history */
  const snapshotLayerFrames = (lid: LayerId) => {
    const layer = useTimelineStore.getState().layers.find((l) => l.id === lid);
    if (!layer) return { layerId: lid, contentFrames: [] };
    return {
      layerId: lid,
      contentFrames: layer.contentFrames.map((cf) => ({
        id: cf.id,
        startFrame: cf.startFrame,
        durationFrames: cf.durationFrames,
        name: cf.name,
        data: new Map(cf.data),
      })),
    };
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();

      const startX = e.clientX;
      const startY = e.clientY;
      const origStart = contentFrame.startFrame;
      const duration = contentFrame.durationFrames;
      const isAltDuplicate = e.altKey;
      let didDrag = false;
      let beforeSnapshot: ReturnType<typeof snapshotLayerFrames>[] | null = null;
      // For keyframe sync: capture original frame starts and keyframes within each frame
      const syncedKeyframesBefore: { trackId: string; keyframeId: string; frame: number; cfId: string; cfOrigStart: number }[] = [];
      let keyframeSnapshotBefore: { layerId: string; trackId: string; keyframeId: string; frame: number }[] = [];
      // For Alt+drag duplicate: capture original positions/data of all affected frames
      let altDupEntries: { layerId: LayerId; startFrame: number; durationFrames: number; data: Map<string, import('../../../types').Cell> }[] = [];

      const onMouseMove = (me: MouseEvent) => {
        const dx = me.clientX - startX;
        const dy = me.clientY - startY;
        if (!didDrag && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) {
          return;
        }
        if (!didDrag) {
          // Capture snapshot of ALL layers BEFORE any reordering
          const allLayers = useTimelineStore.getState().layers;
          beforeSnapshot = allLayers.map((l) => snapshotLayerFrames(l.id));
          didDrag = true;

          // Capture synced keyframes if the layer has sync enabled
          const srcLayer = allLayers.find((l) => l.id === layerId);
          if (srcLayer?.syncKeyframesToFrames) {
            const selectedIds = useTimelineStore.getState().view.selectedContentFrameIds;
            const isGroupDrag = selectedIds.has(contentFrame.id) && selectedIds.size > 1;
            const framesToSync = isGroupDrag
              ? srcLayer.contentFrames.filter((cf) => selectedIds.has(cf.id))
              : [contentFrame];

            // Snapshot ALL keyframe positions on this layer (for history)
            keyframeSnapshotBefore = srcLayer.propertyTracks.flatMap((t) =>
              t.keyframes.map((kf) => ({ layerId: layerId as string, trackId: t.id as string, keyframeId: kf.id as string, frame: kf.frame })),
            );

            // Identify keyframes within each frame's time range
            for (const cf of framesToSync) {
              for (const track of srcLayer.propertyTracks) {
                for (const kf of track.keyframes) {
                  if (kf.frame >= cf.startFrame && kf.frame < cf.startFrame + cf.durationFrames) {
                    syncedKeyframesBefore.push({
                      trackId: track.id as string,
                      keyframeId: kf.id as string,
                      frame: kf.frame,
                      cfId: cf.id as string,
                      cfOrigStart: cf.startFrame,
                    });
                  }
                }
              }
            }
          }

          // For Alt+drag: capture original data of all frames that will move
          if (isAltDuplicate) {
            const selectedIds = useTimelineStore.getState().view.selectedContentFrameIds;
            const isGroupDrag = selectedIds.has(contentFrame.id) && selectedIds.size > 1;
            if (isGroupDrag) {
              const layer = allLayers.find((l) => l.id === layerId);
              if (layer) {
                const selected = layer.contentFrames.filter((cf) => selectedIds.has(cf.id));
                altDupEntries = selected.map((cf) => ({
                  layerId,
                  startFrame: cf.startFrame,
                  durationFrames: cf.durationFrames,
                  data: new Map(cf.data),
                }));
              }
            } else {
              altDupEntries = [{
                layerId,
                startFrame: origStart,
                durationFrames: duration,
                data: new Map(contentFrame.data),
              }];
            }
          }
        }

        // Check if we're dragging a multi-selection group
        const selectedIds = useTimelineStore.getState().view.selectedContentFrameIds;
        const isGroupDrag = selectedIds.has(contentFrame.id) && selectedIds.size > 1;

        const tgtLayerId = getTargetLayerId(me.clientY);
        const others = getOtherFrames(tgtLayerId);
        const mouseLeftFrame = origStart + dx / pxPerFrame;
        const { slotFrame } = getDropTarget(mouseLeftFrame, others);

        // For group drag, show ghost spanning from first to last selected frame (including gaps)
        let ghostWidth = duration * pxPerFrame;
        if (isGroupDrag) {
          const layer = useTimelineStore.getState().layers.find((l) => l.id === layerId);
          if (layer) {
            const selectedFrames = layer.contentFrames
              .filter((cf) => selectedIds.has(cf.id))
              .sort((a, b) => a.startFrame - b.startFrame);
            const firstStart = selectedFrames[0].startFrame;
            const lastEnd = selectedFrames[selectedFrames.length - 1].startFrame + selectedFrames[selectedFrames.length - 1].durationFrames;
            ghostWidth = (lastEnd - firstStart) * pxPerFrame;
          }
        }

        setContentFrameDragPreview({
          sourceLayerId: layerId,
          targetLayerId: tgtLayerId,
          frameId: contentFrame.id,
          ghostLeftPx: Math.max(0, slotFrame * pxPerFrame),
          ghostWidthPx: ghostWidth,
          slotFrame,
        });
      };

      const onMouseUp = (me: MouseEvent) => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        const preview = useTimelineStore.getState().view.contentFrameDragPreview;
        setContentFrameDragPreview(null);

        if (!didDrag) {
          // Click (no drag): select frame without moving playhead
          if (layerId !== activeLayerId) setActiveLayer(layerId);

          if (me.metaKey || me.ctrlKey) {
            // Cmd/Ctrl+click: toggle individual frame in/out of selection
            toggleContentFrameSelected(contentFrame.id);
          } else if (me.shiftKey) {
            // Shift+click: range select all frames between last-selected and this one
            const tl = useTimelineStore.getState();
            const layer = tl.layers.find((l) => l.id === layerId);
            if (layer) {
              const currentSelection = tl.view.selectedContentFrameIds;
              const sorted = [...layer.contentFrames].sort((a, b) => a.startFrame - b.startFrame);

              if (currentSelection.size === 0) {
                selectContentFrames([contentFrame.id]);
              } else {
                // Find the anchor: earliest or latest selected frame
                const selectedFrames = sorted.filter((cf) => currentSelection.has(cf.id));
                const anchorIdx = sorted.indexOf(selectedFrames[0]);
                const clickedIdx = sorted.findIndex((cf) => cf.id === contentFrame.id);
                const lo = Math.min(anchorIdx, clickedIdx);
                const hi = Math.max(anchorIdx, clickedIdx);
                const rangeIds = sorted.slice(lo, hi + 1).map((cf) => cf.id);
                addContentFramesToSelection(rangeIds);
              }
            }
          } else {
            // Plain click: select only this frame
            selectContentFrames([contentFrame.id]);
          }
          return;
        }

        if (!preview) return;

        const tgtLayerId = preview.targetLayerId;
        const dx = me.clientX - startX;
        const mouseLeftFrame = origStart + dx / pxPerFrame;

        // Check if this is a group drag (multiple selected frames)
        const selectedIds = useTimelineStore.getState().view.selectedContentFrameIds;
        const isGroupDrag = selectedIds.has(contentFrame.id) && selectedIds.size > 1;
        const tl = useTimelineStore.getState();
        const currentLayer = tl.layers.find((l) => l.id === layerId);
        if (!currentLayer) return;

        if (isGroupDrag && tgtLayerId === layerId) {
          // ── Multi-select group move (same layer) ──
          // Compute delta from the dragged frame's original position
          const others = getOtherFrames(tgtLayerId);
          const { targetStart } = getDropTarget(mouseLeftFrame, others);
          const delta = targetStart - origStart;
          if (delta === 0) return;

          // Get all selected frames sorted by position
          const selectedFrames = currentLayer.contentFrames
            .filter((cf) => selectedIds.has(cf.id))
            .sort((a, b) => a.startFrame - b.startFrame);

          // Build simulation: move all selected frames by delta, keep others in place
          const selectedIdSet = new Set(selectedFrames.map((cf) => cf.id));
          const sim = currentLayer.contentFrames.map((cf) =>
            selectedIdSet.has(cf.id)
              ? { ...cf, startFrame: Math.max(0, cf.startFrame + delta) }
              : { ...cf },
          );

          // Sort with selected frames winning ties (so they push non-selected)
          sim.sort((a, b) => {
            if (a.startFrame !== b.startFrame) return a.startFrame - b.startFrame;
            if (selectedIdSet.has(a.id) && !selectedIdSet.has(b.id)) return -1;
            if (!selectedIdSet.has(a.id) && selectedIdSet.has(b.id)) return 1;
            return 0;
          });

          // Resolve overlaps
          for (let i = 1; i < sim.length; i++) {
            const prevEnd = sim[i - 1].startFrame + sim[i - 1].durationFrames;
            if (sim[i].startFrame < prevEnd) {
              sim[i] = { ...sim[i], startFrame: prevEnd };
            }
          }

          // Park all selected frames at safe temp positions
          const simMaxEnd = Math.max(...sim.map((cf) => cf.startFrame + cf.durationFrames));
          let tempOffset = 0;
          for (const sf of selectedFrames) {
            updateContentFrameTiming(layerId, sf.id, simMaxEnd + tempOffset, sf.durationFrames);
            tempOffset += sf.durationFrames;
          }

          // Move non-selected frames to their planned positions (right-to-left)
          const nonSelected = sim
            .filter((cf) => !selectedIdSet.has(cf.id))
            .sort((a, b) => b.startFrame - a.startFrame);
          for (const planned of nonSelected) {
            const current = useTimelineStore.getState().layers
              .find((l) => l.id === layerId)?.contentFrames.find((cf) => cf.id === planned.id);
            if (current && current.startFrame !== planned.startFrame) {
              updateContentFrameTiming(layerId, planned.id, planned.startFrame, planned.durationFrames);
            }
          }

          // Place selected frames at their final positions
          for (const planned of sim.filter((cf) => selectedIdSet.has(cf.id))) {
            updateContentFrameTiming(layerId, planned.id, planned.startFrame, planned.durationFrames);
          }
        } else if (tgtLayerId !== layerId) {
          // ── Cross-layer move ──
          const others = getOtherFrames(tgtLayerId);
          const { targetStart } = getDropTarget(mouseLeftFrame, others);

          if (isGroupDrag) {
            // Multi-select cross-layer move: move all selected frames
            const selectedFrames = currentLayer.contentFrames
              .filter((cf) => selectedIds.has(cf.id))
              .sort((a, b) => a.startFrame - b.startFrame);

            const firstStart = selectedFrames[0].startFrame;

            // Remove all selected frames from source layer, then add to target
            // Process in reverse to avoid index shifts
            for (const sf of [...selectedFrames].reverse()) {
              tl.removeContentFrame(layerId, sf.id);
            }

            // Add each frame to target layer, preserving relative positions
            for (const sf of selectedFrames) {
              const relativeOffset = sf.startFrame - firstStart;
              tl.addContentFrame(tgtLayerId, targetStart + relativeOffset, sf.durationFrames, new Map(sf.data));
            }
          } else {
            // Single frame cross-layer move
            tl.removeContentFrame(layerId, contentFrame.id);
            tl.addContentFrame(tgtLayerId, targetStart, duration, new Map(contentFrame.data));
          }

          // Resolve overlaps on target layer
          const updatedTarget = useTimelineStore.getState().layers.find((l) => l.id === tgtLayerId);
          if (updatedTarget) {
            const sorted = [...updatedTarget.contentFrames].sort((a, b) => a.startFrame - b.startFrame);
            for (let i = 1; i < sorted.length; i++) {
              const prevEnd = sorted[i - 1].startFrame + sorted[i - 1].durationFrames;
              if (sorted[i].startFrame < prevEnd) {
                updateContentFrameTiming(tgtLayerId, sorted[i].id, prevEnd, sorted[i].durationFrames);
                sorted[i] = { ...sorted[i], startFrame: prevEnd };
              }
            }
          }
          setActiveLayer(tgtLayerId);
        } else {
          // ── Same-layer reorder (single frame) ──
          const others = getOtherFrames(tgtLayerId);
          const { targetStart } = getDropTarget(mouseLeftFrame, others);
          if (targetStart === origStart) return;

          const draggedId = contentFrame.id;
          const sim = currentLayer.contentFrames.map((cf) =>
            cf.id === draggedId ? { ...cf, startFrame: targetStart } : { ...cf },
          );
          sim.sort((a, b) => {
            if (a.startFrame !== b.startFrame) return a.startFrame - b.startFrame;
            if (a.id === draggedId) return -1;
            if (b.id === draggedId) return 1;
            return 0;
          });
          for (let i = 1; i < sim.length; i++) {
            const prevEnd = sim[i - 1].startFrame + sim[i - 1].durationFrames;
            if (sim[i].startFrame < prevEnd) {
              sim[i] = { ...sim[i], startFrame: prevEnd };
            }
          }

          const simMaxEnd = Math.max(...sim.map((cf) => cf.startFrame + cf.durationFrames));
          if (simMaxEnd !== origStart) {
            updateContentFrameTiming(layerId, contentFrame.id, simMaxEnd, duration);
          }

          const nonDragged = sim.filter((cf) => cf.id !== contentFrame.id).sort((a, b) => b.startFrame - a.startFrame);
          for (const planned of nonDragged) {
            const current = useTimelineStore.getState().layers.find((l) => l.id === layerId)?.contentFrames.find((cf) => cf.id === planned.id);
            if (current && current.startFrame !== planned.startFrame) {
              updateContentFrameTiming(layerId, planned.id, planned.startFrame, planned.durationFrames);
            }
          }

          updateContentFrameTiming(layerId, contentFrame.id, targetStart, duration);
        }

        // Alt+drag: create duplicates at the ORIGINAL positions now that the
        // originals have moved to their new positions (same pattern as keyframe Alt+drag)
        if (isAltDuplicate && altDupEntries.length > 0) {
          const tl = useTimelineStore.getState();
          for (const entry of altDupEntries) {
            tl.addContentFrame(
              entry.layerId,
              entry.startFrame,
              entry.durationFrames,
              new Map(entry.data),
            );
          }
        }

        // Sync keyframes: move keyframes that were within dragged frames by the same delta
        if (syncedKeyframesBefore.length > 0) {
          const tl = useTimelineStore.getState();
          const currentLayer = tl.layers.find((l) => l.id === layerId);
          if (currentLayer) {
            for (const entry of syncedKeyframesBefore) {
              // Find the content frame that this keyframe belonged to and its new position
              const cf = currentLayer.contentFrames.find((c) => (c.id as string) === entry.cfId);
              if (!cf) continue;
              const delta = cf.startFrame - entry.cfOrigStart;
              if (delta === 0) continue;
              const newFrame = Math.max(0, entry.frame + delta);
              tl.moveKeyframe(layerId, entry.trackId as PropertyTrackId, entry.keyframeId as KeyframeId, newFrame);
            }
          }
        }

        // Record history for the entire drag-reorder (+ optional duplicate + keyframe sync) operation
        if (beforeSnapshot) {
          const allLayers = useTimelineStore.getState().layers;
          const afterSnapshot = allLayers.map((l) => snapshotLayerFrames(l.id));

          // Capture keyframe positions after sync
          let keyframeSnapshotAfter: { layerId: string; trackId: string; keyframeId: string; frame: number }[] | undefined;
          if (keyframeSnapshotBefore.length > 0) {
            const srcLayer = allLayers.find((l) => l.id === layerId);
            if (srcLayer) {
              keyframeSnapshotAfter = srcLayer.propertyTracks.flatMap((t) =>
                t.keyframes.map((kf) => ({ layerId: layerId as string, trackId: t.id as string, keyframeId: kf.id as string, frame: kf.frame })),
              );
            }
          }

          const historyAction: ContentFrameReorderHistoryAction = {
            type: 'content_frame_reorder',
            timestamp: Date.now(),
            description: 'Reorder content frames',
            data: {
              previousState: beforeSnapshot,
              newState: afterSnapshot,
              previousKeyframes: keyframeSnapshotBefore.length > 0 ? keyframeSnapshotBefore : undefined,
              newKeyframes: keyframeSnapshotAfter,
            },
          };
          pushToHistory(historyAction);
        }
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getDropTarget, getOtherFrames, getTargetLayerId are stable helpers reading from store.getState()
    [contentFrame, layerId, pxPerFrame, updateContentFrameTiming, activeLayerId, setActiveLayer, selectContentFrames, addContentFramesToSelection, toggleContentFrameSelected, setContentFrameDragPreview, pushToHistory],
  );

  // ── Resize handlers ──

  const handleResizeRight = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const origStart = contentFrame.startFrame;
    const origDuration = contentFrame.durationFrames;
    const origTimelineDuration = useTimelineStore.getState().config.durationFrames;
    let lastDuration = origDuration;
    const onMouseMove = (me: MouseEvent) => {
      const newDuration = Math.max(1, origDuration + Math.round((me.clientX - startX) / pxPerFrame));
      if (newDuration !== lastDuration) {
        // Auto-extend timeline if resize pushes past end
        useTimelineStore.getState().ensureTimelineContains(origStart + newDuration - 1);
        updateContentFrameTiming(layerId, contentFrame.id, origStart, newDuration);
        lastDuration = newDuration;
      }
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      // Record history if timing actually changed
      if (lastDuration !== origDuration) {
        // Revert frame timing AND timeline duration to original, then re-apply via history wrapper
        // This ensures the history action captures the correct previousTimelineDuration
        updateContentFrameTiming(layerId, contentFrame.id, origStart, origDuration);
        useTimelineStore.getState().setDuration(origTimelineDuration);
        updateTimingHistory(layerId, contentFrame.id, origStart, lastDuration);
      }
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [contentFrame, layerId, pxPerFrame, updateContentFrameTiming, updateTimingHistory]);

  const handleResizeLeft = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const origStart = contentFrame.startFrame;
    const origDuration = contentFrame.durationFrames;
    const endFrame = origStart + origDuration;
    let lastStart = origStart;
    let lastDuration = origDuration;
    const onMouseMove = (me: MouseEvent) => {
      const newStart = Math.max(0, Math.min(endFrame - 1, origStart + Math.round((me.clientX - startX) / pxPerFrame)));
      const newDuration = endFrame - newStart;
      if (newStart !== lastStart || newDuration !== lastDuration) {
        updateContentFrameTiming(layerId, contentFrame.id, newStart, newDuration);
        lastStart = newStart;
        lastDuration = newDuration;
      }
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      // Record history if timing actually changed
      if (lastStart !== origStart || lastDuration !== origDuration) {
        // Revert to original, then re-apply via history wrapper
        updateContentFrameTiming(layerId, contentFrame.id, origStart, origDuration);
        updateTimingHistory(layerId, contentFrame.id, lastStart, lastDuration);
      }
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [contentFrame, layerId, pxPerFrame, updateContentFrameTiming, updateTimingHistory]);

  const cellCount = contentFrame.data.size;

  return (
    <div
      ref={blockRef}
      className={cn(
        'absolute top-1 h-[24px] rounded border cursor-move',
        isDragging && 'opacity-30',
        contentFrame.hidden
          ? isSelected
            ? 'bg-muted-foreground/20 border-muted-foreground/40'
            : 'bg-transparent border-muted-foreground/20 border-dashed'
          : isSelected
            ? 'bg-purple-500/30 border-purple-500/70 ring-1 ring-purple-500/40'
            : isActive
              ? 'bg-primary/30 border-primary/60'
              : 'bg-muted-foreground/15 border-muted-foreground/30',
      )}
      style={{
        left,
        width,
        ...(contentFrame.labelColor && !contentFrame.hidden ? {
          backgroundColor: `${contentFrame.labelColor}25`,
          borderColor: `${contentFrame.labelColor}${isSelected ? 'B0' : '60'}`,
        } : {}),
      }}
      onMouseDown={handleMouseDown}
      onContextMenu={onContextMenu ? (e: React.MouseEvent) => onContextMenu(e, contentFrame.id, layerId) : undefined}
      data-content-frame="true"
    >
      <div className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-primary/30 rounded-l" onMouseDown={handleResizeLeft} />
      {width > 30 && (
        <div className="px-2 text-[10px] truncate leading-[24px] text-foreground/70 pointer-events-none">
          {contentFrame.name}
          {cellCount > 0 && <span className="ml-1 text-muted-foreground">({cellCount})</span>}
        </div>
      )}
      <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-primary/30 rounded-r" onMouseDown={handleResizeRight} />
    </div>
  );
});
