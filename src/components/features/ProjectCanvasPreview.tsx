/**
 * ASCII Motion - Project Canvas Preview
 * 
 * Renders a pixel-based preview of the first frame of a project
 * Similar to the timeline frame thumbnails but optimized for project cards
 */

import { useMemo } from 'react';
import type { CloudProject } from '@ascii-motion/premium';

interface ProjectCanvasPreviewProps {
  project: CloudProject;
  height?: number;
}

/**
 * Generates a canvas preview of the project's first frame
 * Width is calculated based on canvas aspect ratio to maintain proportions
 */
export const ProjectCanvasPreview: React.FC<ProjectCanvasPreviewProps> = ({
  project,
  height = 120,
}) => {
  // Calculate width based on canvas aspect ratio
  const canvasWidth = project.sessionData.canvas.width;
  const canvasHeight = project.sessionData.canvas.height;
  const aspectRatio = canvasWidth / canvasHeight;
  const width = Math.round(height * aspectRatio);

  const previewDataUrl = useMemo(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Set preview dimensions
    canvas.width = width;
    canvas.height = height;

    const canvasBgColor = project.sessionData.canvas.canvasBackgroundColor || '#1a1a1a';

    // Calculate scaling factors
    const scaleX = width / canvasWidth;
    const scaleY = height / canvasHeight;
    const cellWidth = Math.max(1, scaleX);
    const cellHeight = Math.max(1, scaleY);

    // Fill background
    ctx.fillStyle = canvasBgColor;
    ctx.fillRect(0, 0, width, height);

    // Get first frame data
    const firstFrame = project.sessionData.animation.frames[0];
    if (!firstFrame || !firstFrame.data) {
      // If no frame data, show a subtle grid pattern
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 0.5;
      const gridSpacing = 8;
      
      // Draw vertical lines
      for (let x = 0; x < width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      // Draw horizontal lines
      for (let y = 0; y < height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      return canvas.toDataURL();
    }

    // Render each cell as a colored rectangle
    for (const [key, cell] of Object.entries(firstFrame.data)) {
      const coords = key.split(',').map(Number);
      const x = coords[0];
      const y = coords[1];

      if (x >= 0 && x < canvasWidth && y >= 0 && y < canvasHeight) {
        // Calculate pixel position in preview
        const pixelX = Math.floor(x * scaleX);
        const pixelY = Math.floor(y * scaleY);

        // Use character color (foreground) primarily, fallback to background, then white
        const color = cell.color || cell.bgColor || '#ffffff';
        ctx.fillStyle = color;
        ctx.fillRect(pixelX, pixelY, Math.ceil(cellWidth), Math.ceil(cellHeight));
      }
    }

    return canvas.toDataURL();
  }, [project.sessionData, width, height, canvasWidth, canvasHeight]);

  if (!previewDataUrl) {
    return null;
  }

  return (
    <div className="w-full flex justify-center my-3">
      <img
        src={previewDataUrl}
        alt={`Preview of ${project.name}`}
        className="rounded border border-border/30"
        style={{ width, height }}
      />
    </div>
  );
};
