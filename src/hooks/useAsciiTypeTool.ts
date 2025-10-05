import { useEffect, useMemo } from 'react';
import { useAsciiTypeStore } from '../stores/asciiTypeStore';
import { renderFigletText } from '../lib/figletClient';
import { useToolStore } from '../stores/toolStore';
import type { Cell } from '../types';
import { createCellKey } from '../types';

interface PreviewCanvasCell {
  cell: Cell;
  isWhitespace: boolean;
  skipApply: boolean;
}

export const useAsciiTypeTool = () => {
  const text = useAsciiTypeStore((state) => state.text);
  const selectedFont = useAsciiTypeStore((state) => state.selectedFont);
  const horizontalLayout = useAsciiTypeStore((state) => state.horizontalLayout);
  const verticalLayout = useAsciiTypeStore((state) => state.verticalLayout);
  const transparentWhitespace = useAsciiTypeStore((state) => state.transparentWhitespace);
  const previewGrid = useAsciiTypeStore((state) => state.previewGrid);
  const previewOrigin = useAsciiTypeStore((state) => state.previewOrigin);
  const previewDimensions = useAsciiTypeStore((state) => state.previewDimensions);
  const previewCellCount = useAsciiTypeStore((state) => state.previewCellCount);
  const previewVersion = useAsciiTypeStore((state) => state.previewVersion);
  const isRendering = useAsciiTypeStore((state) => state.isRendering);
  const renderError = useAsciiTypeStore((state) => state.renderError);
  const isPreviewPlaced = useAsciiTypeStore((state) => state.isPreviewPlaced);
  const previewDialogOpen = useAsciiTypeStore((state) => state.previewDialogOpen);
  const previewDialogScrollTop = useAsciiTypeStore((state) => state.previewDialogScrollTop);
  const panelScrollTop = useAsciiTypeStore((state) => state.panelScrollTop);

  const beginRender = useAsciiTypeStore((state) => state.beginRender);
  const completeRender = useAsciiTypeStore((state) => state.completeRender);
  const failRender = useAsciiTypeStore((state) => state.failRender);

  const setText = useAsciiTypeStore((state) => state.setText);
  const setSelectedFont = useAsciiTypeStore((state) => state.setSelectedFont);
  const setSelectedCategory = useAsciiTypeStore((state) => state.setSelectedCategory);
  const setHorizontalLayout = useAsciiTypeStore((state) => state.setHorizontalLayout);
  const setVerticalLayout = useAsciiTypeStore((state) => state.setVerticalLayout);
  const setTransparentWhitespace = useAsciiTypeStore((state) => state.setTransparentWhitespace);
  const setPreviewOrigin = useAsciiTypeStore((state) => state.setPreviewOrigin);
  const setPreviewPlaced = useAsciiTypeStore((state) => state.setPreviewPlaced);
  const clearPreview = useAsciiTypeStore((state) => state.clearPreview);
  const setPreviewDialogOpen = useAsciiTypeStore((state) => state.setPreviewDialogOpen);
  const setPreviewDialogScrollTop = useAsciiTypeStore((state) => state.setPreviewDialogScrollTop);
  const setPanelScrollTop = useAsciiTypeStore((state) => state.setPanelScrollTop);

  const openPanel = useAsciiTypeStore((state) => state.openPanel);
  const closePanel = useAsciiTypeStore((state) => state.closePanel);

  const selectedColor = useToolStore((state) => state.selectedColor);
  const selectedBgColor = useToolStore((state) => state.selectedBgColor);

  useEffect(() => {
    const renderKey = `${selectedFont}::${horizontalLayout}::${verticalLayout}::${text}`;
    const requestId = beginRender(renderKey);
    let cancelled = false;

    renderFigletText(text, {
      font: selectedFont,
      horizontalLayout,
      verticalLayout,
    })
      .then(({ lines }) => {
        if (!cancelled) {
          completeRender(requestId, lines);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          failRender(requestId, error instanceof Error ? error.message : String(error));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    text,
    selectedFont,
    horizontalLayout,
    verticalLayout,
    beginRender,
    completeRender,
    failRender,
  ]);

  const previewCanvasCells = useMemo(() => {
    const cells = new Map<string, PreviewCanvasCell>();

    if (!previewGrid || !previewOrigin) {
      return cells;
    }

    for (let row = 0; row < previewGrid.length; row += 1) {
      const line = previewGrid[row];
      for (let col = 0; col < line.length; col += 1) {
        const cellInfo = line[col];
        if (!cellInfo) continue;

        const canvasX = previewOrigin.x + col;
        const canvasY = previewOrigin.y + row;
        const key = createCellKey(canvasX, canvasY);
        const isWhitespace = cellInfo.isWhitespace;
        const skipApply = isWhitespace && transparentWhitespace;

        const cell: Cell = {
          char: cellInfo.char,
          color: isWhitespace ? '#FFFFFF' : selectedColor,
          bgColor: skipApply ? 'transparent' : selectedBgColor,
        };

        cells.set(key, {
          cell,
          isWhitespace,
          skipApply,
        });
      }
    }

    return cells;
  }, [
    previewGrid,
    previewOrigin,
    selectedColor,
    selectedBgColor,
    transparentWhitespace,
  ]);

  const previewBounds = useMemo(() => {
    if (!previewOrigin || !previewDimensions) {
      return null;
    }

    return {
      left: previewOrigin.x,
      top: previewOrigin.y,
      right: previewOrigin.x + previewDimensions.width - 1,
      bottom: previewOrigin.y + previewDimensions.height - 1,
    };
  }, [previewOrigin, previewDimensions]);

  return {
    // State
    text,
    selectedFont,
    horizontalLayout,
    verticalLayout,
    transparentWhitespace,
    previewGrid,
    previewOrigin,
    previewDimensions,
    previewCellCount,
    previewVersion,
    isRendering,
    renderError,
    isPreviewPlaced,
    previewDialogOpen,
    previewDialogScrollTop,
    panelScrollTop,

    // Derived
    previewCanvasCells,
    previewBounds,

    // Actions
    setText,
    setSelectedFont,
    setSelectedCategory,
    setHorizontalLayout,
    setVerticalLayout,
    setTransparentWhitespace,
    setPreviewOrigin,
    setPreviewPlaced,
    clearPreview,
    setPreviewDialogOpen,
    setPreviewDialogScrollTop,
    setPanelScrollTop,
    openPanel,
    closePanel,
  };
};
