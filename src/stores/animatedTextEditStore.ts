/**
 * On-canvas editing state for Animated Text generator layers.
 *
 * While editing, the runtime renders the layer's full text without its
 * animation effect so the user can see what they type.
 */

import { create } from 'zustand';
import type { LayerId } from '../types/timeline';
import type { GeneratorSource } from '../types/generatorLayer';
import { setGeneratorEditPreview } from '../utils/generators/generatorRuntime';
import { useTimelineStore } from './timelineStore';
import { recordGeneratorChange } from '../utils/generators/generatorHistory';

interface AnimatedTextEditState {
  editingLayerId: LayerId | null;
  /** Source snapshot from when editing started, for a single undo entry */
  sourceBefore: GeneratorSource | null;
  /** Select all text when the editor mounts (e.g. right after creation) */
  selectAllOnStart: boolean;
  startEditing: (layerId: LayerId, options?: { selectAll?: boolean }) => void;
  stopEditing: () => void;
}

export const useAnimatedTextEditStore = create<AnimatedTextEditState>((set, get) => ({
  editingLayerId: null,
  sourceBefore: null,
  selectAllOnStart: false,
  startEditing: (layerId, options) => {
    if (get().editingLayerId === layerId) return;
    if (get().editingLayerId) get().stopEditing();
    const source = useTimelineStore.getState().layers.find((l) => l.id === layerId)?.generator ?? null;
    if (!source) return;
    setGeneratorEditPreview(source.id);
    set({ editingLayerId: layerId, sourceBefore: source, selectAllOnStart: options?.selectAll ?? false });
  },
  stopEditing: () => {
    const { editingLayerId, sourceBefore } = get();
    if (!editingLayerId) return;
    setGeneratorEditPreview(null);
    set({ editingLayerId: null, sourceBefore: null, selectAllOnStart: false });
    if (sourceBefore) recordGeneratorChange(editingLayerId, 'Edit text', sourceBefore);
  },
}));
