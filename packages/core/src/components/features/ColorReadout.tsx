/**
 * ColorReadout - Display current foreground and background color values
 */

import React from 'react';
import { Type, Palette } from 'lucide-react';
import { useToolStore } from '../../stores/toolStore';
import { ANSI_COLORS } from '../../constants/colors';

interface ColorReadoutProps {
  className?: string;
}

export const ColorReadout: React.FC<ColorReadoutProps> = ({ className = '' }) => {
  const { selectedColor, selectedBgColor } = useToolStore();

  // Determine if background is transparent for special styling
  const isBackgroundTransparent = selectedBgColor === 'transparent' || selectedBgColor === ANSI_COLORS.transparent;

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center gap-2 text-xs">
        <Type className="w-3 h-3 text-muted-foreground" />
        <span className="font-medium">Foreground:</span>
        <span className="font-mono text-muted-foreground">{selectedColor}</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <Palette className="w-3 h-3 text-muted-foreground" />
        <span className="font-medium">Background:</span>
        <span className="font-mono text-muted-foreground">
          {isBackgroundTransparent ? 'transparent' : selectedBgColor}
        </span>
      </div>
    </div>
  );
};