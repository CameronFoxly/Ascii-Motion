// Photoshop-style foreground/background color selector with large clickable squares

import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RotateCcw, Palette, Type } from 'lucide-react';
import { useToolStore } from '../../stores/toolStore';
import { usePaletteStore } from '../../stores/paletteStore';
import { ANSI_COLORS } from '../../constants/colors';

interface ForegroundBackgroundSelectorProps {
  onOpenColorPicker: (mode: 'foreground' | 'background', currentColor: string) => void;
  className?: string;
}

export const ForegroundBackgroundSelector: React.FC<ForegroundBackgroundSelectorProps> = ({
  onOpenColorPicker,
  className = ''
}) => {
  const { selectedColor, selectedBgColor, setSelectedColor, setSelectedBgColor } = useToolStore();
  const { addRecentColor } = usePaletteStore();

  // Handle color square clicks
  const handleForegroundClick = () => {
    onOpenColorPicker('foreground', selectedColor);
  };

  const handleBackgroundClick = () => {
    onOpenColorPicker('background', selectedBgColor);
  };

  // Handle swapping foreground/background colors
  const handleSwapColors = () => {
    const tempColor = selectedColor;
    setSelectedColor(selectedBgColor);
    setSelectedBgColor(tempColor);
    
    // Add both colors to recent colors
    addRecentColor(selectedBgColor);
    addRecentColor(tempColor);
  };

  // Handle reset to default colors
  const handleResetColors = () => {
    setSelectedColor(ANSI_COLORS.white);
    setSelectedBgColor(ANSI_COLORS.transparent);
    
    addRecentColor(ANSI_COLORS.white);
    addRecentColor(ANSI_COLORS.transparent);
  };

  // Determine if background is transparent for special styling
  const isBackgroundTransparent = selectedBgColor === 'transparent' || selectedBgColor === ANSI_COLORS.transparent;

  return (
    <TooltipProvider>
      <div className={`space-y-3 ${className}`}>
        {/* Main color selector area */}
        <div className="flex items-center gap-3">
          {/* Large color squares */}
          <div className="relative">
            {/* Background color square (larger, behind) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="w-12 h-12 rounded border-2 border-border hover:border-primary transition-colors shadow-sm relative overflow-hidden"
                  style={{ 
                    backgroundColor: isBackgroundTransparent ? '#ffffff' : selectedBgColor,
                    backgroundImage: isBackgroundTransparent 
                      ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                      : 'none',
                    backgroundSize: isBackgroundTransparent ? '8px 8px' : 'auto',
                    backgroundPosition: isBackgroundTransparent ? '0 0, 0 4px, 4px -4px, -4px 0px' : 'auto'
                  }}
                  onClick={handleBackgroundClick}
                  title="Background Color"
                >
                  {isBackgroundTransparent && (
                    <svg
                      className="absolute inset-0 w-full h-full"
                      viewBox="0 0 48 48"
                      style={{ pointerEvents: 'none' }}
                    >
                      <line
                        x1="4"
                        y1="44"
                        x2="44"
                        y2="4"
                        stroke="#dc2626"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                  
                  {/* Background label */}
                  <div className="absolute -bottom-1 -right-1">
                    <div className="bg-background border border-border rounded-full p-0.5">
                      <Palette className="w-2.5 h-2.5 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Background Color: {isBackgroundTransparent ? 'Transparent' : selectedBgColor}</p>
                <p className="text-xs text-muted-foreground">Click to edit</p>
              </TooltipContent>
            </Tooltip>

            {/* Foreground color square (smaller, in front) */}
            <div className="absolute -top-2 -left-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="w-8 h-8 rounded border-2 border-background shadow-md hover:border-primary transition-colors ring-1 ring-border"
                    style={{ backgroundColor: selectedColor }}
                    onClick={handleForegroundClick}
                    title="Foreground Color"
                  >
                    {/* Foreground label */}
                    <div className="absolute -bottom-0.5 -right-0.5">
                      <div className="bg-background border border-border rounded-full p-0.5">
                        <Type className="w-2 h-2 text-muted-foreground" />
                      </div>
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Foreground Color: {selectedColor}</p>
                  <p className="text-xs text-muted-foreground">Click to edit</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-1">
            {/* Swap colors button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 w-6 p-0"
                  onClick={handleSwapColors}
                >
                  <div className="flex items-center justify-center">
                    <div className="w-2 h-2 bg-foreground rounded-sm transform rotate-45"></div>
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Swap Foreground/Background</p>
                <p className="text-xs text-muted-foreground">Exchange the two colors</p>
              </TooltipContent>
            </Tooltip>

            {/* Reset to defaults button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 w-6 p-0"
                  onClick={handleResetColors}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reset to Defaults</p>
                <p className="text-xs text-muted-foreground">White foreground, transparent background</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Color values display */}
        <div className="space-y-1">
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
      </div>
    </TooltipProvider>
  );
};
