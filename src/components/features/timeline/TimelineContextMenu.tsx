/**
 * Timeline Context Menu — reusable right-click menu for timeline elements.
 *
 * Renders a positioned dropdown-style menu at the mouse position,
 * with items tailored to the clicked element type:
 *  - Content frame: delete, split, copy, paste, hide/show, duplicate
 *  - Empty track: paste, new frame
 *  - Property track: add keyframe, paste keyframe
 *  - Keyframe: delete, copy
 *
 * Uses the same Shadcn dropdown-menu styling for visual consistency.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTimelineStore } from '../../../stores/timelineStore';
import { useTimelineHistory } from '../../../hooks/useTimelineHistory';
import { useToolStore } from '../../../stores/toolStore';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import {
  Trash2,
  Scissors,
  Copy,
  ClipboardPaste,
  Eye,
  EyeOff,
  CopyPlus,
  Plus,
  Diamond,
  ArrowLeftToLine,
  Pencil,
  Tag,
  ChevronRight,
  XCircle,
  Dices,
  RotateCcw,
  Layers,
} from 'lucide-react';
import type { LayerId, ContentFrameId, PropertyTrackId, KeyframeId } from '../../../types/timeline';
import { getPropertyValueAtFrame, getGroupPropertyValue } from '../../../utils/layerCompositing';
import { evaluateEffectBlock } from '../../../utils/effectsPipeline';
import { resolveGeneratorSettings } from '../../../utils/generators/generatorRuntime';
import { withGeneratorHistory, bakeGeneratorLayerWithHistory, recordGeneratorChange } from '../../../utils/generators/generatorHistory';
import type { GeneratorSource } from '../../../types/generatorLayer';
import type { ContentFrameReorderHistoryAction } from '../../../types';

// ============================================
// TYPES
// ============================================

export type TimelineContextMenuType =
  | { kind: 'frame'; layerId: LayerId; frameIds: ContentFrameId[]; clickFrame: number }
  | { kind: 'empty-track'; layerId: LayerId; clickFrame: number }
  | { kind: 'property-track'; layerId: LayerId; trackId: PropertyTrackId; clickFrame: number }
  | { kind: 'keyframe'; layerId: LayerId; trackId: PropertyTrackId; keyframeIds: KeyframeId[] }
  | { kind: 'generator'; layerId: LayerId };

export interface TimelineContextMenuState {
  x: number;
  y: number;
  context: TimelineContextMenuType;
}

interface Props {
  menu: TimelineContextMenuState;
  onClose: () => void;
}

// ============================================
// MENU ITEM COMPONENT
// ============================================

const MenuItem: React.FC<{
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}> = ({ icon, label, onClick, disabled, destructive }) => (
  <button
    className={cn(
      'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
      disabled
        ? 'text-muted-foreground/50 cursor-not-allowed'
        : destructive
          ? 'text-destructive hover:bg-destructive/10 focus:bg-destructive/10'
          : 'hover:bg-accent focus:bg-accent',
    )}
    onClick={(e) => {
      e.stopPropagation();
      if (!disabled) onClick();
    }}
    disabled={disabled}
  >
    {icon}
    {label}
  </button>
);

const MenuSeparator: React.FC = () => <div className="h-px bg-border my-1" />;

// Label color options for frame blocks
const LABEL_COLORS = [
  { name: 'Red', color: '#EF4444', bg: 'rgba(239,68,68,0.25)' },
  { name: 'Orange', color: '#F97316', bg: 'rgba(249,115,22,0.25)' },
  { name: 'Yellow', color: '#EAB308', bg: 'rgba(234,179,8,0.25)' },
  { name: 'Green', color: '#22C55E', bg: 'rgba(34,197,94,0.25)' },
  { name: 'Blue', color: '#3B82F6', bg: 'rgba(59,130,246,0.25)' },
  { name: 'Purple', color: '#A855F7', bg: 'rgba(168,85,247,0.25)' },
  { name: 'Pink', color: '#EC4899', bg: 'rgba(236,72,153,0.25)' },
  { name: 'Cyan', color: '#06B6D4', bg: 'rgba(6,182,212,0.25)' },
] as const;

/** Submenu that opens to the right with label color swatches — click to toggle */
const LabelSubMenu: React.FC<{
  layerId: LayerId;
  frameIds: ContentFrameId[];
  onClose: () => void;
}> = ({ layerId, frameIds, onClose }) => {
  const [open, setOpen] = useState(false);
  const setLabel = useTimelineStore((s) => s.setContentFrameLabel);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="relative">
      <button
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus:bg-accent"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
      >
        <Tag className="w-4 h-4" />
        <span className="flex-1 text-left">Label</span>
        <ChevronRight className={cn('w-3 h-3 text-muted-foreground transition-transform', open && 'rotate-90')} />
      </button>
      {open && (
        <>
          {/* Invisible bridge to prevent hover deadzone between menu and submenu */}
          <div className="absolute left-full top-0 w-3 h-full" />
          <div className="absolute left-full top-0 ml-2 min-w-[140px] rounded-md border border-border bg-popover p-1 shadow-lg z-10">
            {LABEL_COLORS.map((lc) => (
              <button
                key={lc.name}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setLabel(layerId, frameIds, lc.color);
                  onClose();
                }}
              >
                <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: lc.color }} />
                {lc.name}
              </button>
            ))}
            <div className="h-px bg-border my-1" />
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation();
                setLabel(layerId, frameIds, undefined);
                onClose();
              }}
            >
              <XCircle className="w-3 h-3" />
              Clear label
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const TimelineContextMenu: React.FC<Props> = ({ menu, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  const layers = useTimelineStore((s) => s.layers);
  const currentFrame = useTimelineStore((s) => s.view.currentFrame);
  const copiedFrames = useTimelineStore((s) => s.copiedFrames);
  const copiedKeyframes = useTimelineStore((s) => s.copiedKeyframes);
  const pushToHistory = useToolStore((s) => s.pushToHistory);

  // Rename dialog state
  const [renameState, setRenameState] = useState<{ layerId: LayerId; frameId: ContentFrameId; currentName: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const {
    removeContentFrame,
    splitContentFrame,
    duplicateContentFrame,
    addContentFrame,
    addKeyframe,
    removeKeyframe,
    removeBlankSpace,
    renameContentFrame: renameContentFrameHistory,
  } = useTimelineHistory();

  const handleRenameOpen = useCallback((layerId: LayerId, frameId: ContentFrameId, currentName: string) => {
    setRenameState({ layerId, frameId, currentName });
    setRenameValue(currentName);
    // Don't close the context menu yet — dialog will handle that
  }, []);

  const handleRenameSubmit = useCallback(() => {
    if (renameState && renameValue.trim()) {
      renameContentFrameHistory(renameState.layerId, renameState.frameId, renameValue.trim());
    }
    setRenameState(null);
    onClose();
  }, [renameState, renameValue, onClose, renameContentFrameHistory]);

  // Close on click outside or Escape
  useEffect(() => {
    let initialized = false;
    const handleClickOutside = (e: MouseEvent) => {
      if (!initialized) return;
      // When the rename dialog is open, don't close on clicks outside the
      // context menu — the dialog is rendered in a portal outside menuRef
      // and its clicks would otherwise be treated as "outside" clicks.
      if (renameState !== null) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Use capture phase so we catch events even when stopPropagation is called.
    // Delay initialization by a frame to skip the opening right-click event.
    requestAnimationFrame(() => {
      initialized = true;
    });
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('contextmenu', handleClickOutside, true);
    document.addEventListener('keydown', handleEscape, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('contextmenu', handleClickOutside, true);
      document.removeEventListener('keydown', handleEscape, true);
    };
  }, [onClose, renameState]);

  // Auto-position: prevent clipping at window edges
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const el = menuRef.current;
    if (rect.right > window.innerWidth - 8) {
      el.style.left = `${menu.x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight - 8) {
      el.style.top = `${menu.y - rect.height}px`;
    }
  }, [menu.x, menu.y]);

  /** Snapshot all layers' content frames for undo history */
  const snapshotAllLayers = useCallback(() => {
    return useTimelineStore.getState().layers.map((l) => ({
      layerId: l.id as string,
      contentFrames: l.contentFrames.map((cf) => ({
        id: cf.id as string,
        startFrame: cf.startFrame,
        durationFrames: cf.durationFrames,
        name: cf.name,
        data: new Map(cf.data),
      })),
    }));
  }, []);

  /** Paste content frames with undo history */
  const pasteFramesWithHistory = useCallback((layerId: LayerId, atFrame: number) => {
    const before = snapshotAllLayers();
    useTimelineStore.getState().pasteContentFrames(layerId, atFrame);
    const after = snapshotAllLayers();
    const historyAction: ContentFrameReorderHistoryAction = {
      type: 'content_frame_reorder',
      timestamp: Date.now(),
      description: 'Paste content frames',
      data: { previousState: before, newState: after },
    };
    pushToHistory(historyAction);
  }, [snapshotAllLayers, pushToHistory]);

  /** Paste keyframes with undo history */
  const pasteKeyframesWithHistory = useCallback((layerId: LayerId, trackId: PropertyTrackId, atFrame: number) => {
    const copiedKfs = useTimelineStore.getState().copiedKeyframes;
    if (!copiedKfs || copiedKfs.length === 0) return;

    const tl = useTimelineStore.getState();
    const layers = tl.layers;

    // Find target track — search layers, groups, and effect tracks
    let targetPropertyPath: string | undefined;
    const targetLayer = layers.find((l) => l.id === layerId);
    if (targetLayer) {
      const track = targetLayer.propertyTracks.find((t) => t.id === trackId);
      if (track) targetPropertyPath = track.propertyPath;
      // Search layer effect property tracks
      if (!targetPropertyPath) {
        for (const et of (targetLayer.effectTracks ?? [])) {
          const pt = et.effectBlock.propertyTracks.find((t) => (t.id as string) === (trackId as string));
          if (pt) { targetPropertyPath = pt.propertyPath; break; }
        }
      }
      // Search generator property tracks
      if (!targetPropertyPath) {
        const gpt = targetLayer.generator?.propertyTracks.find((t) => (t.id as string) === (trackId as string));
        if (gpt) targetPropertyPath = gpt.propertyPath;
      }
    }
    if (!targetPropertyPath) {
      for (const group of tl.layerGroups) {
        const track = group.propertyTracks.find((t) => t.id === trackId);
        if (track) { targetPropertyPath = track.propertyPath; break; }
        // Search group effect property tracks
        for (const et of (group.effectTracks ?? [])) {
          const pt = et.effectBlock.propertyTracks.find((t) => (t.id as string) === (trackId as string));
          if (pt) { targetPropertyPath = pt.propertyPath; break; }
        }
        if (targetPropertyPath) break;
      }
    }
    // Search global effects
    if (!targetPropertyPath) {
      for (const et of (tl.globalEffects ?? [])) {
        const pt = et.effectBlock.propertyTracks.find((t) => (t.id as string) === (trackId as string));
        if (pt) { targetPropertyPath = pt.propertyPath; break; }
      }
    }
    // Search post effects
    if (!targetPropertyPath) {
      for (const pet of (tl.postEffectTracks ?? [])) {
        const pt = pet.effectBlock.propertyTracks.find((t) => (t.id as string) === (trackId as string));
        if (pt) { targetPropertyPath = pt.propertyPath; break; }
      }
    }
    if (!targetPropertyPath) return;

    const copiedPaths = [...new Set(copiedKfs.map((kf) => kf.propertyPath))];
    const targetMatchesCopied = copiedPaths.includes(targetPropertyPath);
    const maxLayerIndex = Math.max(...copiedKfs.map((kf) => kf.layerIndex ?? 0));
    const isMultiLayer = maxLayerIndex > 0;
    const generatorSnapshots = new Map<LayerId, GeneratorSource>();

    for (const entry of copiedKfs) {
      let destLayerId = layerId;
      let destTrackId = trackId;

      if (isMultiLayer && targetMatchesCopied) {
        // Multi-layer: match original layer IDs, fall back to index offset
        const sourceLayerIds = [...new Set(copiedKfs.map((kf) => kf.sourceLayerId))];
        const allSourceExist = sourceLayerIds.every((id) => layers.some((l) => (l.id as string) === id));

        const destLayer = allSourceExist
          ? layers.find((l) => (l.id as string) === entry.sourceLayerId)
          : (() => {
              const targetLayerIdx = layers.findIndex((l) => l.id === layerId);
              const idx = targetLayerIdx + (entry.layerIndex ?? 0);
              return idx >= 0 && idx < layers.length ? layers[idx] : undefined;
            })();
        if (!destLayer) continue;
        destLayerId = destLayer.id;
        const destTrack = destLayer.propertyTracks.find((t) => t.propertyPath === entry.propertyPath)
          ?? destLayer.generator?.propertyTracks.find((t) => t.propertyPath === entry.propertyPath);
        if (!destTrack) continue;
        destTrackId = destTrack.id as PropertyTrackId;
      } else if (targetMatchesCopied) {
        // Single-layer multi-track: route to matching property
        // Search layers, groups, and effect property tracks for matching track
        let destTrackId2: typeof trackId | undefined;
        if (targetLayer) {
          const dt = targetLayer.propertyTracks.find((t) => t.propertyPath === entry.propertyPath);
          if (dt) destTrackId2 = dt.id;
          // Search layer effect property tracks
          if (!destTrackId2) {
            for (const et of (targetLayer.effectTracks ?? [])) {
              const pt = et.effectBlock.propertyTracks.find((t) => t.propertyPath === entry.propertyPath);
              if (pt) { destTrackId2 = pt.id as unknown as typeof trackId; break; }
            }
          }
          // Search generator property tracks
          if (!destTrackId2) {
            const gpt = targetLayer.generator?.propertyTracks.find((t) => t.propertyPath === entry.propertyPath);
            if (gpt) destTrackId2 = gpt.id as unknown as typeof trackId;
          }
        }
        if (!destTrackId2) {
          for (const g of useTimelineStore.getState().layerGroups) {
            const dt = g.propertyTracks.find((t) => t.propertyPath === entry.propertyPath);
            if (dt) { destTrackId2 = dt.id; break; }
            // Search group effect property tracks
            for (const et of (g.effectTracks ?? [])) {
              const pt = et.effectBlock.propertyTracks.find((t) => t.propertyPath === entry.propertyPath);
              if (pt) { destTrackId2 = pt.id as unknown as typeof trackId; break; }
            }
            if (destTrackId2) break;
          }
        }
        // Search global effects
        if (!destTrackId2) {
          for (const et of (useTimelineStore.getState().globalEffects ?? [])) {
            const pt = et.effectBlock.propertyTracks.find((t) => t.propertyPath === entry.propertyPath);
            if (pt) { destTrackId2 = pt.id as unknown as typeof trackId; break; }
          }
        }
        // Search post effects
        if (!destTrackId2) {
          for (const pet of (useTimelineStore.getState().postEffectTracks ?? [])) {
            const pt = pet.effectBlock.propertyTracks.find((t) => t.propertyPath === entry.propertyPath);
            if (pt) { destTrackId2 = pt.id as unknown as typeof trackId; break; }
          }
        }
        if (!destTrackId2) continue;
        destTrackId = destTrackId2;
      } else {
        // Unmatched: only paste trackIndex 0 from layerIndex 0
        if (entry.trackIndex !== 0 || entry.layerIndex !== 0) continue;
      }

      const targetFrame = atFrame + entry.frameOffset;

      const generator = useTimelineStore.getState().getLayer(destLayerId)?.generator;
      const generatorTrack = generator?.propertyTracks.find((pt) => pt.id as string === destTrackId as string);
      if (generator && generatorTrack) {
        if (!generatorSnapshots.has(destLayerId)) generatorSnapshots.set(destLayerId, generator);
        const kfId = tl.addGeneratorKeyframe(destLayerId, generatorTrack.id, targetFrame, entry.value);
        if (kfId) tl.updateGeneratorKeyframe(destLayerId, generatorTrack.id, kfId, { easing: entry.easing });
        continue;
      }

      // Check if destination is a post effect track
      let pastedViaPostEffect = false;
      for (const pet of (useTimelineStore.getState().postEffectTracks ?? [])) {
        const pt = pet.effectBlock.propertyTracks.find((t) => (t.id as string) === (destTrackId as string));
        if (pt) {
          const kfId = useTimelineStore.getState().addPostEffectKeyframe(pet.effectBlock.id, pt.id, targetFrame, entry.value);
          if (kfId) {
            useTimelineStore.getState().updatePostEffectKeyframe(pet.effectBlock.id, pt.id, kfId, { easing: entry.easing });
          }
          pastedViaPostEffect = true;
          break;
        }
      }
      if (!pastedViaPostEffect) {
        const kfId = addKeyframe(destLayerId, destTrackId, targetFrame, entry.value);
        if (kfId) {
          useTimelineStore.getState().updateKeyframe(destLayerId, destTrackId, kfId, { easing: entry.easing });
        }
      }
    }
    for (const [generatorLayerId, source] of generatorSnapshots) {
      recordGeneratorChange(generatorLayerId, 'Paste generator keyframes', source);
    }
  }, [addKeyframe]);

  const act = useCallback(
    (fn: () => void) => {
      fn();
      onClose();
    },
    [onClose],
  );

  // ── Render items based on context ──

  const renderItems = () => {
    const ctx = menu.context;

    switch (ctx.kind) {
      case 'frame': {
        const layer = layers.find((l) => l.id === ctx.layerId);
        if (!layer) return null;
        const frameIds = ctx.frameIds;
        const isMulti = frameIds.length > 1;
        const label = isMulti ? 'frames' : 'frame';

        // Determine hide/show state from last selected frame
        const lastCf = layer.contentFrames.find((cf) => cf.id === frameIds[frameIds.length - 1]);
        const allHidden = lastCf?.hidden ?? false;

        // Can split? Only if single frame and playhead is inside it
        const canSplit = frameIds.length === 1 && (() => {
          const cf = layer.contentFrames.find((c) => c.id === frameIds[0]);
          return cf ? currentFrame > cf.startFrame && currentFrame < cf.startFrame + cf.durationFrames : false;
        })();

        return (
          <>
            <MenuItem
              icon={<Copy className="w-4 h-4" />}
              label={`Copy ${label}`}
              onClick={() => act(() => {
                useTimelineStore.getState().copyContentFrames(ctx.layerId, frameIds);
              })}
            />
            <MenuItem
              icon={<ClipboardPaste className="w-4 h-4" />}
              label="Paste at playhead"
              onClick={() => act(() => {
                pasteFramesWithHistory(ctx.layerId, currentFrame);
              })}
              disabled={!copiedFrames}
            />
            <MenuItem
              icon={<ClipboardPaste className="w-4 h-4" />}
              label="Paste frame here"
              onClick={() => act(() => {
                pasteFramesWithHistory(ctx.layerId, ctx.clickFrame);
              })}
              disabled={!copiedFrames}
            />
            <MenuItem
              icon={<CopyPlus className="w-4 h-4" />}
              label={`Duplicate ${label}`}
              onClick={() => act(() => {
                for (const fid of frameIds) {
                  duplicateContentFrame(ctx.layerId, fid);
                }
              })}
            />
            <MenuSeparator />
            <MenuItem
              icon={<Scissors className="w-4 h-4" />}
              label="Split at playhead"
              onClick={() => act(() => {
                splitContentFrame(ctx.layerId, frameIds[0], currentFrame);
              })}
              disabled={!canSplit}
            />
            <MenuItem
              icon={allHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              label={allHidden ? `Show ${label}` : `Hide ${label}`}
              onClick={() => act(() => {
                useTimelineStore.getState().toggleContentFrameHidden(ctx.layerId, frameIds, !allHidden);
              })}
            />
            {!isMulti && (
              <MenuItem
                icon={<Pencil className="w-4 h-4" />}
                label="Rename"
                onClick={() => {
                  const cf = layer.contentFrames.find((c) => c.id === frameIds[0]);
                  handleRenameOpen(ctx.layerId, frameIds[0], cf?.name ?? '');
                }}
              />
            )}
            <LabelSubMenu layerId={ctx.layerId} frameIds={frameIds} onClose={onClose} />
            <MenuSeparator />
            <MenuItem
              icon={<Trash2 className="w-4 h-4" />}
              label={`Delete ${label}`}
              onClick={() => act(() => {
                for (const fid of frameIds) {
                  removeContentFrame(ctx.layerId, fid);
                }
                useTimelineStore.getState().clearContentFrameSelection();
              })}
              destructive
            />
          </>
        );
      }

      case 'empty-track': {
        return (
          <>
            <MenuItem
              icon={<Plus className="w-4 h-4" />}
              label="New frame here"
              onClick={() => act(() => {
                addContentFrame(ctx.layerId, ctx.clickFrame, 1);
              })}
            />
            <MenuItem
              icon={<ClipboardPaste className="w-4 h-4" />}
              label="Paste frame at playhead"
              onClick={() => act(() => {
                pasteFramesWithHistory(ctx.layerId, currentFrame);
              })}
              disabled={!copiedFrames}
            />
            <MenuSeparator />
            <MenuItem
              icon={<ArrowLeftToLine className="w-4 h-4" />}
              label="Remove blank space"
              onClick={() => act(() => {
                removeBlankSpace(ctx.layerId, ctx.clickFrame);
              })}
            />
          </>
        );
      }

      case 'property-track': {
        return (
          <>
            <MenuItem
              icon={<Diamond className="w-4 h-4" />}
              label="Add keyframe here"
              onClick={() => act(() => {
                // Search layers first, then groups
                const layer = layers.find((l) => l.id === ctx.layerId);
                if (layer) {
                  const track = layer.propertyTracks.find((t) => t.id === ctx.trackId);
                  if (track) {
                    const currentValue = getPropertyValueAtFrame(layer, track.propertyPath, ctx.clickFrame);
                    addKeyframe(ctx.layerId, ctx.trackId, ctx.clickFrame, currentValue);
                    return;
                  }
                  const gpt = layer.generator?.propertyTracks.find((t) => (t.id as string) === (ctx.trackId as string));
                  if (gpt && layer.generator) {
                    const currentValue = resolveGeneratorSettings(layer.generator, ctx.clickFrame)[gpt.propertyPath];
                    addKeyframe(ctx.layerId, ctx.trackId, ctx.clickFrame, currentValue as number);
                    return;
                  }
                }
                // Fall back to groups
                const tl = useTimelineStore.getState();
                for (const group of tl.layerGroups) {
                  const track = group.propertyTracks.find((t) => t.id === ctx.trackId);
                  if (track) {
                    const currentValue = getGroupPropertyValue(group, track.propertyPath, ctx.clickFrame);
                    addKeyframe(ctx.layerId, ctx.trackId, ctx.clickFrame, currentValue);
                    return;
                  }
                }
                // Fall back to effect property tracks (layers, groups, global)
                const { addEffectKeyframe } = tl;
                const allSources = [
                  ...layers.flatMap((l) => (l.effectTracks ?? []).map((et) => et)),
                  ...tl.layerGroups.flatMap((g) => (g.effectTracks ?? []).map((et) => et)),
                  ...(tl.globalEffects ?? []),
                ];
                for (const et of allSources) {
                  const pt = et.effectBlock.propertyTracks.find((t) => (t.id as string) === (ctx.trackId as string));
                  if (pt) {
                    const resolved = evaluateEffectBlock(et.effectBlock, ctx.clickFrame);
                    const currentValue = (resolved[pt.propertyPath] ?? 0) as import('../../../types/effectBlock').EffectKeyframe['value'];
                    addEffectKeyframe(et.effectBlock.id, pt.id, ctx.clickFrame, currentValue);
                    return;
                  }
                }
              })}
            />
            <MenuItem
              icon={<ClipboardPaste className="w-4 h-4" />}
              label="Paste keyframe here"
              onClick={() => act(() => {
                pasteKeyframesWithHistory(ctx.layerId, ctx.trackId, ctx.clickFrame);
              })}
              disabled={!copiedKeyframes}
            />
          </>
        );
      }

      case 'generator': {
        const layer = layers.find((l) => l.id === ctx.layerId);
        const source = layer?.generator;
        if (!source) return null;
        const tl = useTimelineStore.getState();
        return (
          <>
            <MenuItem
              icon={<Pencil className="w-4 h-4" />}
              label="Edit generator"
              onClick={() => act(() => tl.selectGeneratorLayer(ctx.layerId))}
            />
            <MenuItem
              icon={source.enabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              label={source.enabled ? 'Disable generator' : 'Enable generator'}
              onClick={() => act(() => withGeneratorHistory(
                ctx.layerId,
                source.enabled ? 'Disable generator' : 'Enable generator',
                () => tl.toggleGeneratorEnabled(ctx.layerId),
              ))}
            />
            {'seed' in source.settings && (
              <MenuItem
                icon={<Dices className="w-4 h-4" />}
                label="Randomize seed"
                onClick={() => act(() => withGeneratorHistory(ctx.layerId, 'Randomize seed', () => {
                  tl.randomizeGeneratorSeed(ctx.layerId, currentFrame);
                }))}
              />
            )}
            <MenuItem
              icon={<RotateCcw className="w-4 h-4" />}
              label="Reset settings"
              onClick={() => act(() => withGeneratorHistory(ctx.layerId, 'Reset generator', () => {
                tl.resetGeneratorSettings(ctx.layerId);
              }))}
            />
            <MenuSeparator />
            <MenuItem
              icon={<Layers className="w-4 h-4" />}
              label="Bake to frames"
              onClick={() => act(() => bakeGeneratorLayerWithHistory(ctx.layerId))}
            />
          </>
        );
      }

      case 'keyframe': {
        const isMulti = ctx.keyframeIds.length > 1;
        const label = isMulti ? 'keyframes' : 'keyframe';

        return (
          <>
            <MenuItem
              icon={<Copy className="w-4 h-4" />}
              label={`Copy ${label}`}
              onClick={() => act(() => {
                useTimelineStore.getState().copyKeyframes(ctx.keyframeIds);
              })}
            />
            <MenuSeparator />
            <MenuItem
              icon={<Trash2 className="w-4 h-4" />}
              label={`Delete ${label}`}
              onClick={() => act(() => {
                for (const kfId of ctx.keyframeIds) {
                  // Try layer/group property tracks first
                  const layer = layers.find((l) => l.id === ctx.layerId);
                  const layerTrack = layer?.propertyTracks.find((pt) => pt.id === ctx.trackId);
                  if (layerTrack || layer?.generator?.propertyTracks.some((pt) => (pt.id as string) === (ctx.trackId as string))) {
                    removeKeyframe(ctx.layerId, ctx.trackId, kfId);
                    continue;
                  }
                  const tl = useTimelineStore.getState();
                  const groupTrack = tl.layerGroups.some((g) => g.propertyTracks.some((pt) => pt.id === ctx.trackId));
                  if (groupTrack) {
                    removeKeyframe(ctx.layerId, ctx.trackId, kfId);
                    continue;
                  }
                  // Fall back to effect property tracks
                  const allSources = [
                    ...layers.flatMap((l) => (l.effectTracks ?? []).map((et) => et)),
                    ...tl.layerGroups.flatMap((g) => (g.effectTracks ?? []).map((et) => et)),
                    ...(tl.globalEffects ?? []),
                  ];
                  let found = false;
                  for (const et of allSources) {
                    const pt = et.effectBlock.propertyTracks.find((t) => (t.id as string) === (ctx.trackId as string));
                    if (pt) {
                      tl.removeEffectKeyframe(et.effectBlock.id, pt.id, kfId);
                      found = true;
                      break;
                    }
                  }
                  // Fall back to post effect tracks
                  if (!found) {
                    for (const pet of (tl.postEffectTracks ?? [])) {
                      const pt = pet.effectBlock.propertyTracks.find((t) => (t.id as string) === (ctx.trackId as string));
                      if (pt) {
                        tl.removePostEffectKeyframe(
                          pet.effectBlock.id,
                          pt.id as import('../../../types/postEffect').PostEffectPropertyTrackId,
                          kfId,
                        );
                        break;
                      }
                    }
                  }
                }
                useTimelineStore.getState().clearKeyframeSelection();
              })}
              destructive
            />
          </>
        );
      }
    }
  };

  return (
    <>
      {renameState === null && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[99999] min-w-[180px] rounded-md border border-border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95"
          style={{ left: menu.x, top: menu.y }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {renderItems()}
        </div>,
        document.body,
      )}

      {/* Rename Dialog */}
      <Dialog
        open={renameState !== null}
        onOpenChange={(open) => { if (!open) { setRenameState(null); onClose(); } }}
      >
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle>Rename Frame</DialogTitle>
          </DialogHeader>
          <Input
            ref={renameInputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(); }}
            placeholder="Frame name"
            autoFocus
            className="mt-2"
          />
          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => { setRenameState(null); onClose(); }}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleRenameSubmit} disabled={!renameValue.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
