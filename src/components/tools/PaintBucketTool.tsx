import React from 'react';
import { Type } from 'lucide-react';
import { useDrawingTool } from '../../hooks/useDrawingTool';
import { useToolStore } from '../../stores/toolStore';
import { ColorSwatch } from '../common/ColorSwatch';

/**
 * Paint Bucket Tool Component
 * Handles flood fill behavior
 */
export const PaintBucketTool: React.FC = () => {
  // The paint bucket logic is handled by useDrawingTool hook
  // This component ensures the hook is active when paint bucket tool is selected
  useDrawingTool();

  return null; // No direct UI - handles behavior through hooks
};

/**
 * Paint Bucket Tool Status Component
 * Provides visual feedback about the paint bucket tool
 */
export const PaintBucketToolStatus: React.FC = () => {
  const { selectedChar, selectedColor, selectedBgColor, paintBucketContiguous } = useToolStore();

  const fillMode = paintBucketContiguous ? 'connected areas' : 'all matching';

  return (
    <span className="text-muted-foreground flex items-center gap-1.5">
      Paint Bucket: Fill {fillMode} with "{selectedChar}" <Type className="w-3 h-3 inline" /> <ColorSwatch color={selectedColor} />
      {selectedBgColor !== '#FFFFFF' && (
        <> BG: <ColorSwatch color={selectedBgColor} /></>
      )}
    </span>
  );
};
