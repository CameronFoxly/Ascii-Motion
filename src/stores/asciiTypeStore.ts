import { create } from 'zustand';
import { FIGLET_FONTS_BY_CATEGORY, ALL_FIGLET_FONTS } from '../constants/figletFonts';
import type { AsciiTypeLayoutPreset } from '../lib/figletClient';

export interface AsciiPreviewCell {
  char: string;
  isWhitespace: boolean;
}

export type AsciiPreviewGrid = AsciiPreviewCell[][];

interface AsciiDimensions {
  width: number;
  height: number;
}

interface PreviewDragState {
  pointerStart: { x: number; y: number };
  originAtStart: { x: number; y: number };
}

interface RenderRequestMeta {
  key: string;
  id: number;
}

interface AsciiTypeStoreState {
  // Panel configuration
  isPanelOpen: boolean;
  text: string;
  selectedCategory: string;
  selectedFont: string;
  horizontalLayout: AsciiTypeLayoutPreset;
  verticalLayout: AsciiTypeLayoutPreset;
  transparentWhitespace: boolean;
  panelScrollTop: number;

  // Preview state
  previewOrigin: { x: number; y: number } | null;
  previewGrid: AsciiPreviewGrid | null;
  previewDimensions: AsciiDimensions | null;
  previewCellCount: number;
  previewVersion: number;
  isRendering: boolean;
  renderError: string | null;
  activeRenderRequest: RenderRequestMeta | null;
  lastRenderKey: string | null;
  isPreviewPlaced: boolean;
  dragState: PreviewDragState | null;
  lastPositionUpdateTimestamp: number;

  // Preview dialog state
  previewDialogOpen: boolean;
  previewDialogScrollTop: number;

  // Actions
  openPanel: () => void;
  closePanel: () => void;
  setText: (text: string) => void;
  setSelectedCategory: (category: string) => void;
  setSelectedFont: (font: string) => void;
  setHorizontalLayout: (layout: AsciiTypeLayoutPreset) => void;
  setVerticalLayout: (layout: AsciiTypeLayoutPreset) => void;
  setTransparentWhitespace: (enabled: boolean) => void;
  setPanelScrollTop: (scrollTop: number) => void;
  setPreviewOrigin: (origin: { x: number; y: number } | null) => void;
  setPreviewPlaced: (placed: boolean) => void;
  beginRender: (key: string) => number;
  completeRender: (requestId: number, lines: string[]) => void;
  failRender: (requestId: number, message: string) => void;
  clearPreview: () => void;
  startDrag: (pointerPos: { x: number; y: number }) => void;
  updateDrag: (origin: { x: number; y: number }) => void;
  endDrag: () => void;
  setPreviewDialogOpen: (open: boolean) => void;
  setPreviewDialogScrollTop: (scrollTop: number) => void;
  reset: () => void;
}

const DEFAULT_FONT = 'Standard';

const findCategoryForFont = (fontName: string): string => {
  const category = FIGLET_FONTS_BY_CATEGORY.find((group) =>
    group.fonts.some((font) => font === fontName)
  );
  return category ? category.label : FIGLET_FONTS_BY_CATEGORY[0]?.label ?? 'Outline';
};

const createPreviewGrid = (lines: string[]): { grid: AsciiPreviewGrid; dimensions: AsciiDimensions; cellCount: number } => {
  if (!lines.length) {
    return {
      grid: [],
      dimensions: { width: 0, height: 0 },
      cellCount: 0,
    };
  }

  const sanitizedLines = lines.map((line) => line.replace(/\r/g, ''));
  const width = sanitizedLines.reduce((max, line) => Math.max(max, line.length), 0);
  const height = sanitizedLines.length;

  if (width === 0 || height === 0) {
    return {
      grid: [],
      dimensions: { width: 0, height: 0 },
      cellCount: 0,
    };
  }

  const grid: AsciiPreviewGrid = sanitizedLines.map((line) => {
    const padded = line.padEnd(width, ' ');
    return Array.from(padded).map((char) => ({
      char,
      isWhitespace: char === ' ',
    }));
  });

  const cellCount = grid.reduce((count, row) => count + row.length, 0);

  return {
    grid,
    dimensions: { width, height },
    cellCount,
  };
};

let renderRequestCounter = 0;

const defaultCategory = findCategoryForFont(DEFAULT_FONT);

const DEFAULT_STATE: Omit<AsciiTypeStoreState,
  | 'openPanel'
  | 'closePanel'
  | 'setText'
  | 'setSelectedCategory'
  | 'setSelectedFont'
  | 'setHorizontalLayout'
  | 'setVerticalLayout'
  | 'setTransparentWhitespace'
  | 'setPanelScrollTop'
  | 'setPreviewOrigin'
  | 'setPreviewPlaced'
  | 'beginRender'
  | 'completeRender'
  | 'failRender'
  | 'clearPreview'
  | 'startDrag'
  | 'updateDrag'
  | 'endDrag'
  | 'setPreviewDialogOpen'
  | 'setPreviewDialogScrollTop'
  | 'reset'
> = {
  isPanelOpen: false,
  text: '',
  selectedCategory: defaultCategory,
  selectedFont: DEFAULT_FONT,
  horizontalLayout: 'normal',
  verticalLayout: 'normal',
  transparentWhitespace: true,
  panelScrollTop: 0,
  previewOrigin: null,
  previewGrid: null,
  previewDimensions: null,
  previewCellCount: 0,
  previewVersion: 0,
  isRendering: false,
  renderError: null,
  activeRenderRequest: null,
  lastRenderKey: null,
  isPreviewPlaced: false,
  dragState: null,
  lastPositionUpdateTimestamp: 0,
  previewDialogOpen: false,
  previewDialogScrollTop: 0,
};

export const useAsciiTypeStore = create<AsciiTypeStoreState>((set, get) => ({
  ...DEFAULT_STATE,

  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),

  setText: (text: string) => set({ text }),

  setSelectedCategory: (category: string) => {
    const nextCategory = FIGLET_FONTS_BY_CATEGORY.find((group) => group.label === category);
    if (!nextCategory) {
      console.warn(`Unknown Figlet font category: ${category}`);
      return;
    }

    set((state) => {
      if (nextCategory.fonts.includes(state.selectedFont)) {
        return { selectedCategory: category };
      }

      // Default to first font in category when switching categories without a matching font
      const fallbackFont = nextCategory.fonts[0] ?? state.selectedFont;

      return {
        selectedCategory: category,
        selectedFont: fallbackFont,
      };
    });
  },

  setSelectedFont: (font: string) => {
    if (!ALL_FIGLET_FONTS.includes(font)) {
      console.warn(`Unknown Figlet font: ${font}`);
      return;
    }

    const category = findCategoryForFont(font);
    set({ selectedFont: font, selectedCategory: category });
  },

  setHorizontalLayout: (layout: AsciiTypeLayoutPreset) => {
    set({ horizontalLayout: layout });
  },

  setVerticalLayout: (layout: AsciiTypeLayoutPreset) => {
    set({ verticalLayout: layout });
  },

  setTransparentWhitespace: (enabled: boolean) => {
    set({ transparentWhitespace: enabled });
  },

  setPanelScrollTop: (scrollTop: number) => {
    set((state) => (state.panelScrollTop === scrollTop ? state : { panelScrollTop: scrollTop }));
  },

  setPreviewOrigin: (origin: { x: number; y: number } | null) => {
    set({ previewOrigin: origin });
  },

  setPreviewPlaced: (placed: boolean) => {
    set({ 
      isPreviewPlaced: placed,
      lastPositionUpdateTimestamp: placed ? Date.now() : 0,
    });
  },

  beginRender: (key: string) => {
    const requestId = ++renderRequestCounter;
    set({
      isRendering: true,
      renderError: null,
      activeRenderRequest: { key, id: requestId },
      lastRenderKey: key,
    });
    return requestId;
  },

  completeRender: (requestId: number, lines: string[]) => {
    set((state) => {
      if (!state.activeRenderRequest || state.activeRenderRequest.id !== requestId) {
        return state;
      }

      const { grid, dimensions, cellCount } = createPreviewGrid(lines);
      const hasContent = grid.length > 0 && dimensions.width > 0 && dimensions.height > 0;

      return {
        previewGrid: hasContent ? grid : null,
        previewDimensions: hasContent ? dimensions : null,
        previewCellCount: hasContent ? cellCount : 0,
        previewVersion: state.previewVersion + 1,
        isRendering: false,
        renderError: null,
        activeRenderRequest: null,
        previewOrigin: hasContent
          ? state.previewOrigin ?? { x: 0, y: 0 }
          : state.previewOrigin,
        isPreviewPlaced: state.isPreviewPlaced && hasContent,
      };
    });
  },

  failRender: (requestId: number, message: string) => {
    set((state) => {
      if (!state.activeRenderRequest || state.activeRenderRequest.id !== requestId) {
        return state;
      }

      return {
        isRendering: false,
        renderError: message,
        activeRenderRequest: null,
      };
    });
  },

  clearPreview: () => {
    set({
      previewGrid: null,
      previewDimensions: null,
      previewCellCount: 0,
      previewVersion: get().previewVersion + 1,
      previewOrigin: null,
      isPreviewPlaced: false,
      dragState: null,
    });
  },

  startDrag: (pointerPos: { x: number; y: number }) => {
    const { previewOrigin } = get();
    if (!previewOrigin) return;

    set({
      dragState: {
        pointerStart: pointerPos,
        originAtStart: previewOrigin,
      },
    });
  },

  updateDrag: (origin: { x: number; y: number }) => {
    if (!get().dragState) return;
    set({ previewOrigin: origin });
  },

  endDrag: () => {
    set({ 
      dragState: null,
      lastPositionUpdateTimestamp: Date.now(),
    });
  },

  setPreviewDialogOpen: (open: boolean) => set({ previewDialogOpen: open }),

  setPreviewDialogScrollTop: (scrollTop: number) => set({ previewDialogScrollTop: scrollTop }),

  reset: () => set({ ...DEFAULT_STATE }),
}));
