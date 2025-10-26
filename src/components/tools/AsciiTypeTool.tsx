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
    return <span className="text-muted-foreground">Rendering preview…</span>;
  }

  if (!previewDimensions) {
    return (
      <span className="text-muted-foreground">
        Enter text and select font to preview
      </span>
    );
  }

  if (!isPreviewPlaced) {
    return (
      <span className="text-muted-foreground">
        Move cursor to position, click to place
      </span>
    );
  }

  return (
    <span className="text-muted-foreground">
      Preview placed ({previewDimensions.width}×{previewDimensions.height}, {previewCellCount.toLocaleString()} cells) - Apply or Cancel in panel
    </span>
  );
};
