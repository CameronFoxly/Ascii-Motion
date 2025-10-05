import React from 'react';
import { useAsciiTypePlacement } from '../../hooks/useAsciiTypePlacement';
import { useAsciiTypeTool } from '../../hooks/useAsciiTypeTool';

export const AsciiTypeTool: React.FC = () => {
  useAsciiTypePlacement();
  return null;
};

export const AsciiTypeToolStatus: React.FC = () => {
  const {
    previewDimensions,
    previewCellCount,
    isPreviewPlaced,
    isRendering,
  } = useAsciiTypeTool();

  if (isRendering) {
    return <span className="text-muted-foreground">ASCII Type: Rendering preview…</span>;
  }

  if (!previewDimensions) {
    return (
      <span className="text-muted-foreground">
        ASCII Type: Enter text and pick a font to generate a preview.
      </span>
    );
  }

  if (!isPreviewPlaced) {
    return (
      <span className="text-muted-foreground">
        ASCII Type: Move the cursor to position the preview, then click to place it.
      </span>
    );
  }

  return (
    <span className="text-muted-foreground">
      ASCII Type: Preview placed ({previewDimensions.width}×{previewDimensions.height}, {previewCellCount.toLocaleString()} cells). Use Apply or Cancel in the panel.
    </span>
  );
};
