/**
 * Non-React snapshot of the CanvasContext typography/view state.
 *
 * Typography (font, size, spacing) lives in React state inside CanvasProvider, but some
 * export paths run outside React (Ctrl+S silent cloud save, MCP exports) and use
 * `ExportDataCollector.collect()`. CanvasProvider publishes its state here so those paths
 * export the same font settings the user sees on the canvas.
 */

import type { FontMetrics } from '../utils/fontMetrics';
import { calculateFontMetrics, DEFAULT_SPACING } from '../utils/fontMetrics';
import { DEFAULT_FONT_ID, getFontStack } from '../constants/fonts';

export interface CanvasTypographySnapshot {
  fontMetrics: FontMetrics;
  fontSize: number;
  characterSpacing: number;
  lineSpacing: number;
  selectedFontId: string;
  actualFont: string | null;
  zoom: number;
  panOffset: { x: number; y: number };
}

const DEFAULT_FONT_SIZE = 18;

const createDefaultSnapshot = (): CanvasTypographySnapshot => ({
  fontMetrics: calculateFontMetrics(DEFAULT_FONT_SIZE, getFontStack(DEFAULT_FONT_ID)),
  fontSize: DEFAULT_FONT_SIZE,
  characterSpacing: DEFAULT_SPACING.characterSpacing,
  lineSpacing: DEFAULT_SPACING.lineSpacing,
  selectedFontId: DEFAULT_FONT_ID,
  actualFont: null,
  zoom: 1,
  panOffset: { x: 0, y: 0 },
});

let snapshot: CanvasTypographySnapshot = createDefaultSnapshot();

export const getCanvasTypographySnapshot = (): CanvasTypographySnapshot => snapshot;

export const setCanvasTypographySnapshot = (next: CanvasTypographySnapshot): void => {
  snapshot = next;
};

export const resetCanvasTypographySnapshot = (): void => {
  snapshot = createDefaultSnapshot();
};
