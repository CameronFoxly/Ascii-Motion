/**
 * LayerContextMenu — right-click context menu for layer list items.
 *
 * Uses the same custom portal-based pattern as TimelineContextMenu
 * for visual consistency. Appears when right-clicking a layer row.
 *
 * Actions:
 *  - Rename, Duplicate, Delete
 *  - Merge Down, Merge Visible, Flatten Transforms
 *  - Create Group, Ungroup
 *  - Toggle visibility, solo, lock
 *
 * Part of the Layer Timeline Refactor (Phase 7)
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTimelineStore } from '../../../stores/timelineStore';
import { useTimelineHistory } from '../../../hooks/useTimelineHistory';
import {
  Trash2,
  Copy,
  Pencil,
  Eye,
  Merge,
  Group,
  Ungroup,
} from 'lucide-react';
import type { LayerId } from '../../../types/timeline';
import { MenuItem, MenuSeparator } from './ContextMenuItem';

// ============================================
// TYPES
// ============================================

export interface LayerContextMenuState {
  x: number;
  y: number;
  layerId: LayerId;
}

interface Props {
  menu: LayerContextMenuState;
  onClose: () => void;
  onStartRename: (layerId: LayerId) => void;
}

// ============================================
// CONTEXT MENU COMPONENT
// ============================================

export const LayerContextMenu: React.FC<Props> = ({ menu, onClose, onStartRename }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  const layers = useTimelineStore((s) => s.layers);
  const selectedLayerIds = useTimelineStore((s) => s.view.selectedLayerIds);
  const layerGroups = useTimelineStore((s) => s.layerGroups);
  const {
    removeLayer,
    duplicateLayer,
    mergeDown,
    mergeVisible,
    createGroup,
    ungroupLayers,
  } = useTimelineHistory();

  const layer = layers.find((l) => l.id === menu.layerId);
  const layerIndex = layer ? layers.indexOf(layer) : -1;

  // Close on click outside
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      onClose();
    }
  }, [onClose]);

  // Close on Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClickOutside, handleKeyDown]);

  // Position adjustment to stay in viewport
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (rect.right > vw) {
      menuRef.current.style.left = `${Math.max(4, vw - rect.width - 4)}px`;
    }
    if (rect.bottom > vh) {
      menuRef.current.style.top = `${Math.max(4, vh - rect.height - 4)}px`;
    }
  }, []);

  if (!layer) return null;

  const canMergeDown = layerIndex > 0;
  const visibleCount = layers.filter((l) => l.visible).length;
  const canMergeVisible = visibleCount >= 2;
  const canDelete = layers.length > 1;

  const parentGroup = layer.parentGroupId
    ? layerGroups.find((g) => g.id === layer.parentGroupId)
    : null;

  const handleAction = (fn: () => void) => {
    fn();
    onClose();
  };

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[99999] min-w-[180px] rounded-md border border-border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95"
      style={{ left: menu.x, top: menu.y }}
    >
      {/* Layer identity */}
      <MenuItem
        icon={<Pencil className="w-3.5 h-3.5" />}
        label="Rename"
        onClick={() => handleAction(() => onStartRename(menu.layerId))}
      />
      <MenuItem
        icon={<Copy className="w-3.5 h-3.5" />}
        label="Duplicate Layer"
        onClick={() => handleAction(() => duplicateLayer(menu.layerId))}
      />
      <MenuItem
        icon={<Trash2 className="w-3.5 h-3.5" />}
        label="Delete Layer"
        onClick={() => handleAction(() => removeLayer(menu.layerId))}
        disabled={!canDelete}
        destructive
      />

      <MenuSeparator />

      {/* Merge / Flatten */}
      <MenuItem
        icon={<Merge className="w-3.5 h-3.5" />}
        label="Merge Down"
        onClick={() => handleAction(() => mergeDown(menu.layerId))}
        disabled={!canMergeDown}
      />
      <MenuItem
        icon={<Eye className="w-3.5 h-3.5" />}
        label="Merge Visible"
        onClick={() => handleAction(() => mergeVisible())}
        disabled={!canMergeVisible}
      />

      <MenuSeparator />

      {/* Group operations */}
      {!parentGroup && (() => {
        // Use selected layers if multiple are selected, otherwise active + below
        const groupCandidateIds = selectedLayerIds.size >= 2
          ? Array.from(selectedLayerIds)
          : layerIndex > 0
            ? [layers[layerIndex - 1].id as string, menu.layerId as string]
            : [];
        const canGroup = groupCandidateIds.length >= 2 &&
          groupCandidateIds.every(id => !layers.find(l => (l.id as string) === id)?.parentGroupId);

        return canGroup ? (
          <MenuItem
            icon={<Group className="w-3.5 h-3.5" />}
            label={`Create Group (${groupCandidateIds.length} layers)`}
            onClick={() => handleAction(() => {
              createGroup('Group', groupCandidateIds as import('../../../types/timeline').LayerId[]);
            })}
          />
        ) : null;
      })()}
      {parentGroup && (
        <MenuItem
          icon={<Ungroup className="w-3.5 h-3.5" />}
          label={`Ungroup "${parentGroup.name}"`}
          onClick={() => handleAction(() => ungroupLayers(parentGroup.id))}
        />
      )}
    </div>,
    document.body,
  );
};
