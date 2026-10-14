/**
 * Keyframe Diamond — a clickable, draggable diamond marker on a property track.
 * 
 * Part of the Layer Timeline Refactor (Phase 3)
 * See: docs/LAYER_TIMELINE_REFACTOR_PLAN.md §3.9
 */

import React, { useCallback } from 'react';
import { useTimelineStore } from '../../../stores/timelineStore';
import { useToolStore } from '../../../stores/toolStore';
import { cn } from '@/lib/utils';
import type { Keyframe, KeyframeId, LayerId, PropertyTrack, PropertyTrackId } from '../../../types/timeline';
import type { KeyframeUpdateHistoryAction, KeyframeAddHistoryAction } from '../../../types';

/** Find a track and keyframe across layers, layerGroups, and effect blocks */
function findTrackAndKeyframe(trackId: PropertyTrackId, kfId: KeyframeId) {
  const tl = useTimelineStore.getState();
  for (const layer of tl.layers) {
    const track = layer.propertyTracks.find((t) => t.id === trackId);
    if (track) {
      const kf = track.keyframes.find((k) => k.id === kfId);
      return { track, kf: kf ?? null };
    }
    for (const et of (layer.effectTracks ?? [])) {
      const ept = et.effectBlock.propertyTracks.find((t) => (t.id as string) === (trackId as string));
      if (ept) {
        const kf = ept.keyframes.find((k) => k.id === kfId);
        return { track: ept as unknown as PropertyTrack, kf: (kf ?? null) as Keyframe | null };
      }
    }
    const gpt = layer.generator?.propertyTracks.find((t) => (t.id as string) === (trackId as string));
    if (gpt) {
      const kf = gpt.keyframes.find((k) => k.id === kfId);
      return { track: gpt as unknown as PropertyTrack, kf: (kf ?? null) as Keyframe | null };
    }
  }
  for (const group of tl.layerGroups) {
    const track = group.propertyTracks.find((t) => t.id === trackId);
    if (track) {
      const kf = track.keyframes.find((k) => k.id === kfId);
      return { track, kf: kf ?? null };
    }
    for (const et of (group.effectTracks ?? [])) {
      const ept = et.effectBlock.propertyTracks.find((t) => (t.id as string) === (trackId as string));
      if (ept) {
        const kf = ept.keyframes.find((k) => k.id === kfId);
        return { track: ept as unknown as PropertyTrack, kf: (kf ?? null) as Keyframe | null };
      }
    }
  }
  for (const et of (tl.globalEffects ?? [])) {
    const ept = et.effectBlock.propertyTracks.find((t) => (t.id as string) === (trackId as string));
    if (ept) {
      const kf = ept.keyframes.find((k) => k.id === kfId);
      return { track: ept as unknown as PropertyTrack, kf: (kf ?? null) as Keyframe | null };
    }
  }
  for (const pet of (tl.postEffectTracks ?? [])) {
    const ept = pet.effectBlock.propertyTracks.find((t) => (t.id as string) === (trackId as string));
    if (ept) {
      const kf = ept.keyframes.find((k) => k.id === kfId);
      return { track: ept as unknown as PropertyTrack, kf: (kf ?? null) as Keyframe | null };
    }
  }
  return { track: null, kf: null };
}

interface KeyframeDiamondProps {
  layerId: LayerId;
  trackId: PropertyTrackId;
  keyframe: Keyframe;
  pxPerFrame: number;
  scrollX: number;
  isSelected: boolean;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const KeyframeDiamond: React.FC<KeyframeDiamondProps> = ({
  layerId,
  trackId,
  keyframe,
  pxPerFrame,
  isSelected,
  onContextMenu,
}) => {
  const setEditingKeyframe = useTimelineStore((s) => s.setEditingKeyframe);
  const selectKeyframes = useTimelineStore((s) => s.selectKeyframes);
  const addKeyframesToSelection = useTimelineStore((s) => s.addKeyframesToSelection);
  const moveKeyframeDirect = useTimelineStore((s) => s.moveKeyframe);
  const setKeyframeDuplicateGhosts = useTimelineStore((s) => s.setKeyframeDuplicateGhosts);
  const clearKeyframeDuplicateGhosts = useTimelineStore((s) => s.clearKeyframeDuplicateGhosts);
  const pushToHistory = useToolStore((s) => s.pushToHistory);

  // Read ghost position for THIS keyframe from store (shared across all diamonds)
  const ghostFrame = useTimelineStore((s) => s.view.keyframeDuplicateGhosts.get(keyframe.id) ?? null);

  const left = keyframe.frame * pxPerFrame;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        addKeyframesToSelection([keyframe.id]);
      } else {
        selectKeyframes([keyframe.id]);
      }
      setEditingKeyframe(keyframe.id);
      // Clear effect/generator selection so keyframe editor takes priority
      useTimelineStore.getState().selectEffectBlock(null);
      useTimelineStore.getState().selectGeneratorLayer(null);
    },
    [keyframe.id, selectKeyframes, addKeyframesToSelection, setEditingKeyframe],
  );

  /**
   * Drag to move (or Alt+drag to duplicate) keyframes.
   * - Plain drag: moves keyframe(s) in time, records batched history on mouseUp
   * - Alt+drag: duplicates keyframe(s) to new positions, records add history on mouseUp
   * - If this keyframe is in a multi-selection, all selected keyframes move/duplicate together
   */
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();

      const startX = e.clientX;
      const isAltDrag = e.altKey;

      // Determine if this is a group operation
      const selectedIds = useTimelineStore.getState().view.selectedKeyframeIds;
      const isInSelection = selectedIds.has(keyframe.id) && selectedIds.size > 1;

      // Capture start state for all affected keyframes
      type KfEntry = { layerId: LayerId; trackId: PropertyTrackId; kfId: KeyframeId; startFrame: number; value: number; easing: Keyframe['easing'] };
      const entries: KfEntry[] = [];

      if (isInSelection) {
        const tl = useTimelineStore.getState();
        // Search layers
        for (const layer of tl.layers) {
          for (const track of layer.propertyTracks) {
            for (const kf of track.keyframes) {
              if (selectedIds.has(kf.id)) {
                entries.push({ layerId: layer.id, trackId: track.id, kfId: kf.id, startFrame: kf.frame, value: kf.value as number, easing: kf.easing });
              }
            }
          }
          // Search effect property tracks
          for (const et of (layer.effectTracks ?? [])) {
            for (const pt of et.effectBlock.propertyTracks) {
              for (const kf of pt.keyframes) {
                if (selectedIds.has(kf.id)) {
                  entries.push({ layerId: layer.id, trackId: pt.id as unknown as PropertyTrackId, kfId: kf.id as KeyframeId, startFrame: kf.frame, value: kf.value as number, easing: kf.easing });
                }
              }
            }
          }
          // Search generator property tracks
          for (const pt of (layer.generator?.propertyTracks ?? [])) {
            for (const kf of pt.keyframes) {
              if (selectedIds.has(kf.id)) {
                entries.push({ layerId: layer.id, trackId: pt.id as unknown as PropertyTrackId, kfId: kf.id as KeyframeId, startFrame: kf.frame, value: kf.value as number, easing: kf.easing });
              }
            }
          }
        }
        // Also search layerGroups
        for (const group of tl.layerGroups) {
          for (const track of group.propertyTracks) {
            for (const kf of track.keyframes) {
              if (selectedIds.has(kf.id)) {
                const proxyLayerId = group.childLayerIds[0] ?? layerId;
                entries.push({ layerId: proxyLayerId, trackId: track.id, kfId: kf.id, startFrame: kf.frame, value: kf.value as number, easing: kf.easing });
              }
            }
          }
          // Search group effect property tracks
          for (const et of (group.effectTracks ?? [])) {
            for (const pt of et.effectBlock.propertyTracks) {
              for (const kf of pt.keyframes) {
                if (selectedIds.has(kf.id)) {
                  const proxyLayerId = group.childLayerIds[0] ?? layerId;
                  entries.push({ layerId: proxyLayerId, trackId: pt.id as unknown as PropertyTrackId, kfId: kf.id as KeyframeId, startFrame: kf.frame, value: kf.value as number, easing: kf.easing });
                }
              }
            }
          }
        }
        // Search global effects
        for (const et of (tl.globalEffects ?? [])) {
          for (const pt of et.effectBlock.propertyTracks) {
            for (const kf of pt.keyframes) {
              if (selectedIds.has(kf.id)) {
                entries.push({ layerId: layerId, trackId: pt.id as unknown as PropertyTrackId, kfId: kf.id as KeyframeId, startFrame: kf.frame, value: kf.value as number, easing: kf.easing });
              }
            }
          }
        }
        // Search post effects
        for (const pet of (tl.postEffectTracks ?? [])) {
          for (const pt of pet.effectBlock.propertyTracks) {
            for (const kf of pt.keyframes) {
              if (selectedIds.has(kf.id)) {
                entries.push({ layerId: layerId, trackId: pt.id as unknown as PropertyTrackId, kfId: kf.id as KeyframeId, startFrame: kf.frame, value: kf.value as number, easing: kf.easing });
              }
            }
          }
        }
      } else {
        entries.push({ layerId, trackId, kfId: keyframe.id, startFrame: keyframe.frame, value: keyframe.value as number, easing: keyframe.easing });
      }

      // For Alt+drag (duplicate): we track the intent but create clones on mouseUp
      // after the originals have moved to their new positions. This avoids the store's
      // "replace keyframe at same frame" behavior that would overwrite the original.
      const isDuplicate = isAltDrag;

      let lastDelta = 0;
      let didMove = false;

      const onMouseMove = (me: MouseEvent) => {
        const deltaX = me.clientX - startX;
        const frameDelta = Math.round(deltaX / pxPerFrame);
        if (frameDelta === lastDelta) return;
        lastDelta = frameDelta;
        didMove = true;

        // Show ghosts at original positions for ALL affected keyframes during Alt+drag
        if (isDuplicate && frameDelta !== 0) {
          const ghosts = new Map<KeyframeId, number>();
          for (const entry of entries) {
            ghosts.set(entry.kfId, entry.startFrame);
          }
          setKeyframeDuplicateGhosts(ghosts);
        }

        // Move original keyframes (direct store call, no history during drag)
        for (const entry of entries) {
          const newFrame = Math.max(0, entry.startFrame + frameDelta);
          moveKeyframeDirect(entry.layerId, entry.trackId, entry.kfId, newFrame);
        }
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        clearKeyframeDuplicateGhosts();

        if (!didMove) return;

        if (isDuplicate) {
          // Alt+drag: the originals have already moved to new positions during drag.
          // Now create clones at the ORIGINAL positions (which are now vacant).
          // Then record history for both the clones (add) and the moves (update).

          // 1. Record history for moving the originals
          for (const entry of entries) {
            const finalFrame = Math.max(0, entry.startFrame + lastDelta);
            if (finalFrame !== entry.startFrame) {
              moveKeyframeDirect(entry.layerId, entry.trackId, entry.kfId, entry.startFrame);
              const { kf } = findTrackAndKeyframe(entry.trackId, entry.kfId);
              if (kf) {
                const oldKf = structuredClone(kf);
                moveKeyframeDirect(entry.layerId, entry.trackId, entry.kfId, finalFrame);
                const updatedKf = structuredClone({ ...kf, frame: finalFrame });
                pushToHistory({
                  type: 'keyframe_update',
                  timestamp: Date.now(),
                  description: `Move keyframe from frame ${entry.startFrame} to ${finalFrame}`,
                  data: { layerId: entry.layerId, trackId: entry.trackId, keyframeId: entry.kfId, oldValue: oldKf, newValue: updatedKf },
                } as KeyframeUpdateHistoryAction);
              }
            }
          }

          // 2. Create clones at the original positions (now that originals have moved away)
          const tl = useTimelineStore.getState();
          for (const entry of entries) {
            const newId = tl.addKeyframe(entry.layerId, entry.trackId, entry.startFrame, entry.value);
            if (newId) {
              tl.updateKeyframe(entry.layerId, entry.trackId, newId, { easing: entry.easing });
              const { kf: dupKf } = findTrackAndKeyframe(entry.trackId, newId);
              if (dupKf) {
                pushToHistory({
                  type: 'keyframe_add',
                  timestamp: Date.now(),
                  description: 'Duplicate keyframe',
                  data: { layerId: entry.layerId, trackId: entry.trackId, keyframeId: newId, keyframe: structuredClone(dupKf) },
                } as KeyframeAddHistoryAction);
              }
            }
          }
        } else {
          // Plain move — record batched history for each moved keyframe
          for (const entry of entries) {
            const finalFrame = Math.max(0, entry.startFrame + lastDelta);
            if (finalFrame !== entry.startFrame) {
              moveKeyframeDirect(entry.layerId, entry.trackId, entry.kfId, entry.startFrame);
              const { kf } = findTrackAndKeyframe(entry.trackId, entry.kfId);
              if (kf) {
                const oldKf = structuredClone(kf);
                moveKeyframeDirect(entry.layerId, entry.trackId, entry.kfId, finalFrame);
                const updatedKf = structuredClone({ ...kf, frame: finalFrame });
                pushToHistory({
                  type: 'keyframe_update',
                  timestamp: Date.now(),
                  description: `Move keyframe from frame ${entry.startFrame} to ${finalFrame}`,
                  data: { layerId: entry.layerId, trackId: entry.trackId, keyframeId: entry.kfId, oldValue: oldKf, newValue: updatedKf },
                } as KeyframeUpdateHistoryAction);
              }
            }
          }
        }
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [keyframe, layerId, trackId, pxPerFrame, moveKeyframeDirect, pushToHistory, clearKeyframeDuplicateGhosts, setKeyframeDuplicateGhosts],
  );

  return (
    <>
      {/* Ghost diamond at original position during Alt+drag */}
      {ghostFrame !== null && (
        <div
          className="absolute w-3 h-3 rotate-45 z-10 bg-yellow-500/40 border border-yellow-400/50 pointer-events-none"
          style={{ left: ghostFrame * pxPerFrame - 5, top: 5 }}
        />
      )}
      <div
        className={cn(
          'absolute w-3 h-3 rotate-45 cursor-pointer z-20',
          'hover:scale-125 transition-transform',
          isSelected ? 'bg-yellow-400 ring-1 ring-yellow-300' : 'bg-yellow-600/80',
        )}
        style={{ left: left - 5, top: 5 }}
        onClick={handleClick}
        onMouseDown={handleDragStart}
        onContextMenu={onContextMenu}
        data-keyframe="true"
        title={`Frame ${keyframe.frame}: ${keyframe.value}`}
      />
    </>
  );
};
