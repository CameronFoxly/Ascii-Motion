/** Project lifecycle, canvas geometry, typography and tool state. */
import { useAnimationStore } from '../../../stores/animationStore';
import { useProjectMetadataStore } from '../../../stores/projectMetadataStore';
import { useToolStore } from '../../../stores/toolStore';
import { SessionImporter } from '../../../utils/sessionImporter';
import { applyLayerCanvasCrop, applyLayerCanvasResize } from '../../../utils/canvasGeometryOps';
import type { AnchorPosition } from '../../../utils/canvasResizeUtils';
import type { Tool } from '../../../types';
import { BridgeError, invalid } from '../errors';
import type { OperationHandler } from '../runtime';
import { applyTypographyState, getTypographyState, type TypographyState } from '../state';
import { MONOSPACE_FONTS } from '../../../constants/fonts';
import { TOOL_NAMES, selectionBounds } from './document';
import { canvas, tl } from './common';
import { clearAllSelections } from '../../../hooks/useSelectionSync';

type Region = { x: number; y: number; width: number; height: number };

function projectSummary() {
  const c = canvas();
  const t = tl();
  const m = useProjectMetadataStore.getState();
  return {
    name: m.projectName,
    description: m.projectDescription,
    width: c.width,
    height: c.height,
    backgroundColor: c.canvasBackgroundColor,
    frameRate: t.config.frameRate,
    durationFrames: t.config.durationFrames,
    layerIds: t.layers.map((l) => l.id as string),
    activeLayerId: (t.view.activeLayerId as string | null) ?? null,
  };
}

export const projectHandlers: Record<string, OperationHandler> = {
  new_project: (input, ctx) => {
    const width = (input.width as number | undefined) ?? 80;
    const height = (input.height as number | undefined) ?? 24;
    const meta = useProjectMetadataStore.getState();
    meta.setProjectName(((input.name as string | undefined) ?? 'Untitled Project').trim() || 'Untitled Project');
    meta.setProjectDescription((input.description as string | undefined) ?? '');
    meta.setCurrentProjectId(null);
    const c = canvas();
    c.setCanvasSize(width, height);
    c.clearCanvas();
    useAnimationStore.getState().resetAnimation();
    if (input.backgroundColor !== undefined) c.setCanvasBackgroundColor(input.backgroundColor as string);
    if (input.frameRate !== undefined) tl().setFrameRate(input.frameRate as number, false);
    if (input.durationFrames !== undefined) tl().setDuration(input.durationFrames as number);
    clearAllSelections();
    ctx.replaceDocument();
    return projectSummary();
  },

  load_project: async (input, ctx) => {
    try {
      await SessionImporter.importSessionData(input.session);
    } catch (error) {
      throw invalid(`Could not load session: ${error instanceof Error ? error.message : String(error)}`);
    }
    useProjectMetadataStore.getState().setCurrentProjectId(null);
    clearAllSelections();
    ctx.replaceDocument();
    return projectSummary();
  },

  set_project_metadata: (input, ctx) => {
    const meta = useProjectMetadataStore.getState();
    const name = input.name as string | undefined;
    const description = input.description as string | undefined;
    if ((name === undefined || name === meta.projectName) && (description === undefined || description === meta.projectDescription)) ctx.noChange();
    if (name !== undefined) meta.setProjectName(name);
    if (description !== undefined) meta.setProjectDescription(description);
    return { name: meta.projectName, description: useProjectMetadataStore.getState().projectDescription };
  },

  resize_canvas: (input, ctx) => {
    const { width: prevW, height: prevH } = canvas();
    const width = input.width as number;
    const height = input.height as number;
    if (width === prevW && height === prevH) {
      ctx.noChange();
      return { width, height };
    }
    applyLayerCanvasResize(prevW, prevH, width, height, ((input.anchor as string | undefined) ?? 'top-left') as AnchorPosition);
    return { width: canvas().width, height: canvas().height, previousWidth: prevW, previousHeight: prevH };
  },

  crop_canvas: (input) => {
    const { width: prevW, height: prevH } = canvas();
    let region = input.region as Region | undefined;
    if (!region) {
      const bounds = selectionBounds();
      if (!bounds) throw new BridgeError('NOT_FOUND', 'Pass region or make a selection to crop to');
      region = { x: bounds.minX, y: bounds.minY, width: bounds.maxX - bounds.minX + 1, height: bounds.maxY - bounds.minY + 1 };
    }
    const minX = Math.max(0, region.x);
    const minY = Math.max(0, region.y);
    const maxX = Math.min(prevW - 1, region.x + region.width - 1);
    const maxY = Math.min(prevH - 1, region.y + region.height - 1);
    if (maxX < minX || maxY < minY) throw invalid('Crop region does not intersect the canvas');
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    if (w < 4 || h < 4) throw invalid('Cropped canvas must be at least 4×4');
    applyLayerCanvasCrop({ minX, minY, maxX, maxY });
    clearAllSelections();
    return { width: canvas().width, height: canvas().height, offsetX: minX, offsetY: minY, previousWidth: prevW, previousHeight: prevH };
  },

  set_canvas_background: (input, ctx) => {
    const color = input.color as string;
    if (canvas().canvasBackgroundColor === color) ctx.noChange();
    else canvas().setCanvasBackgroundColor(color);
    return { backgroundColor: canvas().canvasBackgroundColor };
  },

  set_typography: (input, ctx) => {
    const next = input as Partial<TypographyState>;
    if (next.fontId !== undefined && !MONOSPACE_FONTS.some((f) => f.id === next.fontId)) {
      throw invalid(`Unknown font: ${next.fontId}`, { fonts: MONOSPACE_FONTS.map((f) => f.id) });
    }
    const current = getTypographyState();
    const changed = (Object.keys(next) as Array<keyof TypographyState>).some((k) => next[k] !== current[k]);
    if (!changed) {
      ctx.noChange();
      return { typography: current };
    }
    return { typography: applyTypographyState(next) };
  },

  set_tool_state: (input) => {
    const tool = useToolStore.getState();
    if (input.tool !== undefined) {
      if (!(TOOL_NAMES as readonly string[]).includes(input.tool as string)) {
        throw invalid(`Unknown tool: ${String(input.tool)}`, { tools: TOOL_NAMES });
      }
      tool.setActiveTool(input.tool as Tool);
    }
    if (input.character !== undefined) tool.setSelectedChar(input.character as string);
    if (input.foregroundColor !== undefined) tool.setSelectedColor(input.foregroundColor as string);
    if (input.backgroundColor !== undefined) tool.setSelectedBgColor(input.backgroundColor as string);
    const s = useToolStore.getState();
    return { tool: s.activeTool, character: s.selectedChar, foregroundColor: s.selectedColor, backgroundColor: s.selectedBgColor };
  },
};
