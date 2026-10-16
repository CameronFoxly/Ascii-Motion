/**
 * Document state capture/restore for bridge mutations.
 *
 * A bridge mutation snapshots the persisted document before and after it runs
 * and records a single `document_snapshot` history entry so Cmd/Ctrl+Z in the
 * app (and the `undo` operation) reverts the whole operation atomically.
 */
import type { Cell } from '../../types';
import {
  getCanvasTypographyController,
  getCanvasTypographySnapshot,
  setCanvasTypographySnapshot,
} from '../../stores/canvasTypographySnapshot';
import { calculateFontMetrics } from '../../utils/fontMetrics';
import { getFontStack } from '../../constants/fonts';
import { useCanvasStore } from '../../stores/canvasStore';
import { notifyCanvasReloaded } from '../frameNavigation';
import { useTimelineStore } from '../../stores/timelineStore';
import { useProjectMetadataStore } from '../../stores/projectMetadataStore';
import { usePaletteStore } from '../../stores/paletteStore';
import { useCharacterPaletteStore } from '../../stores/characterPaletteStore';
import { getContentFrameAtTime } from '../../utils/layerCompositing';

export interface DocumentState {
  timeline: {
    config: ReturnType<typeof useTimelineStore.getState>['config'];
    layers: ReturnType<typeof useTimelineStore.getState>['layers'];
    layerGroups: ReturnType<typeof useTimelineStore.getState>['layerGroups'];
    globalEffects: ReturnType<typeof useTimelineStore.getState>['globalEffects'];
    postEffectTracks: ReturnType<typeof useTimelineStore.getState>['postEffectTracks'];
    workArea: { start: number; end: number; enabled: boolean };
    looping: boolean;
    activeLayerId: string | null;
    currentFrame: number;
  };
  canvas: { width: number; height: number; background: string };
  project: { name: string; description: string };
  palettes: {
    color: { customPalettes: unknown[]; activePaletteId: string };
    character: { customPalettes: unknown[]; activePaletteId: string };
  };
  typography: TypographyState;
}

export interface TypographyState {
  fontId: string;
  fontSize: number;
  characterSpacing: number;
  lineSpacing: number;
}

export function getTypographyState(): TypographyState {
  const t = getCanvasTypographySnapshot();
  return { fontId: t.selectedFontId, fontSize: t.fontSize, characterSpacing: t.characterSpacing, lineSpacing: t.lineSpacing };
}

/**
 * Apply typography through the mounted CanvasProvider (same React state as the
 * UI) and update the non-React snapshot immediately so reads are consistent.
 */
export function applyTypographyState(next: Partial<TypographyState>): TypographyState {
  const current = getCanvasTypographySnapshot();
  const merged = { ...getTypographyState(), ...next };
  const controller = getCanvasTypographyController();
  if (controller) {
    if (next.fontId !== undefined && next.fontId !== current.selectedFontId) controller.setSelectedFontId(merged.fontId);
    if (next.fontSize !== undefined && next.fontSize !== current.fontSize) controller.setFontSize(merged.fontSize);
    if (next.characterSpacing !== undefined && next.characterSpacing !== current.characterSpacing) controller.setCharacterSpacing(merged.characterSpacing);
    if (next.lineSpacing !== undefined && next.lineSpacing !== current.lineSpacing) controller.setLineSpacing(merged.lineSpacing);
  }
  setCanvasTypographySnapshot({
    ...current,
    selectedFontId: merged.fontId,
    fontSize: merged.fontSize,
    characterSpacing: merged.characterSpacing,
    lineSpacing: merged.lineSpacing,
    fontMetrics: calculateFontMetrics(merged.fontSize, getFontStack(merged.fontId)),
  });
  return merged;
}

export function captureDocumentState(): DocumentState {
  const t = useTimelineStore.getState();
  const c = useCanvasStore.getState();
  const m = useProjectMetadataStore.getState();
  const p = usePaletteStore.getState();
  const cp = useCharacterPaletteStore.getState();
  const view = t.view;
  return structuredClone({
    timeline: {
      config: t.config,
      layers: t.layers,
      layerGroups: t.layerGroups,
      globalEffects: t.globalEffects,
      postEffectTracks: t.postEffectTracks,
      workArea: {
        start: view.workAreaStart,
        end: view.workAreaEnd,
        enabled: view.workAreaEnabled,
      },
      looping: t.view.looping,
      activeLayerId: (t.view.activeLayerId as string | null) ?? null,
      currentFrame: t.view.currentFrame,
    },
    canvas: { width: c.width, height: c.height, background: c.canvasBackgroundColor },
    project: { name: m.projectName, description: m.projectDescription },
    palettes: {
      color: { customPalettes: p.customPalettes as unknown[], activePaletteId: p.activePaletteId },
      character: { customPalettes: cp.customPalettes as unknown[], activePaletteId: cp.activePalette?.id ?? '' },
    },
    typography: getTypographyState(),
  } satisfies DocumentState);
}

export function restoreDocumentState(state: DocumentState): void {
  const s = structuredClone(state);
  const layerIds = new Set(s.timeline.layers.map((l) => l.id as string));
  const activeLayerId = s.timeline.activeLayerId && layerIds.has(s.timeline.activeLayerId)
    ? s.timeline.activeLayerId
    : (s.timeline.layers[0]?.id as string | undefined) ?? null;

  useTimelineStore.setState((prev) => ({
    config: s.timeline.config,
    layers: s.timeline.layers,
    layerGroups: s.timeline.layerGroups,
    globalEffects: s.timeline.globalEffects,
    postEffectTracks: s.timeline.postEffectTracks,
    view: {
      ...prev.view,
      looping: s.timeline.looping,
      activeLayerId: activeLayerId as typeof prev.view.activeLayerId,
      currentFrame: Math.min(Math.max(0, s.timeline.currentFrame), Math.max(0, s.timeline.config.durationFrames - 1)),
      workAreaStart: s.timeline.workArea.start,
      workAreaEnd: s.timeline.workArea.end,
      workAreaEnabled: s.timeline.workArea.enabled,
    },
  }));

  const canvas = useCanvasStore.getState();
  if (canvas.width !== s.canvas.width || canvas.height !== s.canvas.height) {
    canvas.setCanvasSize(s.canvas.width, s.canvas.height);
  }
  if (canvas.canvasBackgroundColor !== s.canvas.background) {
    canvas.setCanvasBackgroundColor(s.canvas.background);
  }

  const meta = useProjectMetadataStore.getState();
  meta.setProjectName(s.project.name);
  meta.setProjectDescription(s.project.description);

  usePaletteStore.setState({
    customPalettes: s.palettes.color.customPalettes as ReturnType<typeof usePaletteStore.getState>['customPalettes'],
    activePaletteId: s.palettes.color.activePaletteId,
  });
  const cp = useCharacterPaletteStore.getState();
  const customCharacterPalettes = s.palettes.character.customPalettes as ReturnType<typeof useCharacterPaletteStore.getState>['customPalettes'];
  const activeCharacter = [...cp.availablePalettes, ...customCharacterPalettes].find((pal) => pal.id === s.palettes.character.activePaletteId);
  useCharacterPaletteStore.setState({
    customPalettes: customCharacterPalettes,
    ...(activeCharacter ? { activePalette: activeCharacter } : {}),
  });

  if (s.typography) {
    const t = getTypographyState();
    if (t.fontId !== s.typography.fontId || t.fontSize !== s.typography.fontSize ||
      t.characterSpacing !== s.typography.characterSpacing || t.lineSpacing !== s.typography.lineSpacing) {
      applyTypographyState(s.typography);
    }
  }

  syncCanvasFromTimeline();
}

function cellMapsEqual(a: Map<string, Cell>, b: Map<string, Cell>): boolean {
  if (a.size !== b.size) return false;
  for (const [key, cell] of a) {
    const other = b.get(key);
    if (!other || other.char !== cell.char || other.color !== cell.color || other.bgColor !== cell.bgColor) return false;
  }
  return true;
}

/**
 * Write unsaved canvas edits into the active content frame (the canvas →
 * timeline sync is debounced). No-op when nothing changed, so reads never
 * bump the document revision.
 */
export function flushCanvasToTimeline(): void {
  const timeline = useTimelineStore.getState();
  if (timeline.layers.length === 0) return;
  const activeLayer = timeline.layers.find((l) => l.id === timeline.view.activeLayerId) ?? timeline.layers[0];
  if (!activeLayer || activeLayer.kind === 'generator') return;
  const canvas = useCanvasStore.getState();
  if (canvas.activeLayerId && canvas.activeLayerId !== activeLayer.id) return;
  const cf = getContentFrameAtTime(activeLayer, timeline.view.currentFrame);
  if (!cf) return;
  if (cellMapsEqual(cf.data, canvas.cells)) return;
  timeline.updateContentFrameData(activeLayer.id, cf.id, new Map(canvas.cells));
}

/** Load the active layer's content frame at the playhead into the canvas store. */
export function syncCanvasFromTimeline(): void {
  const timeline = useTimelineStore.getState();
  const activeLayer = timeline.layers.find((layer) => layer.id === timeline.view.activeLayerId) ?? timeline.layers[0];
  if (activeLayer && timeline.view.activeLayerId !== activeLayer.id) {
    timeline.setActiveLayer(activeLayer.id);
  }
  const activeFrame = activeLayer ? getContentFrameAtTime(activeLayer, timeline.view.currentFrame) : null;
  const canvas = useCanvasStore.getState();
  canvas.setActiveLayerId(activeLayer?.id ?? null);
  canvas.setCanvasData(activeFrame ? new Map(activeFrame.data) : new Map<string, Cell>());
  canvas.setDirty(false);
  notifyCanvasReloaded();
}
