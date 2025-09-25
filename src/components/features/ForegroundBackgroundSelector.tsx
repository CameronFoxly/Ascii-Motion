// Photoshop-style foreground/background color selector with large clickable squares

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RotateCcw, Palette, Type, MoveDiagonal2 } from 'lucide-react';
import { useToolStore } from '../../stores/toolStore';
import { usePaletteStore } from '../../stores/paletteStore';
import { ANSI_COLORS } from '../../constants/colors';

interface ForegroundBackgroundSelectorProps {
  onOpenColorPicker: (mode: 'foreground' | 'background', currentColor: string, triggerRef?: React.RefObject<HTMLElement | null>) => void;
  className?: string;
}

export const ForegroundBackgroundSelector: React.FC<ForegroundBackgroundSelectorProps> = ({
  onOpenColorPicker,
  className = ''
}) => {
  const { selectedColor, selectedBgColor, setSelectedColor, setSelectedBgColor } = useToolStore();
  const { addRecentColor } = usePaletteStore();

  // Refs to track trigger elements for positioning
  const foregroundButtonRef = useRef<HTMLButtonElement>(null);
  const backgroundButtonRef = useRef<HTMLButtonElement>(null);

  // Handle color square clicks
  const handleForegroundClick = () => {
    onOpenColorPicker('foreground', selectedColor, foregroundButtonRef);
  };

  const handleBackgroundClick = () => {
    onOpenColorPicker('background', selectedBgColor, backgroundButtonRef);
  };

  // Handle swapping foreground/background colors
  const handleSwapColors = () => {
    const tempColor = selectedColor;
    
    // Handle edge case: never allow transparent as foreground color
    if (selectedBgColor === 'transparent' || selectedBgColor === ANSI_COLORS.transparent) {
      // Background becomes current foreground color
      setSelectedBgColor(tempColor);
      // Foreground stays the same (no transparent characters allowed)
      // setSelectedColor remains unchanged
    } else {
      // Normal swap
      setSelectedColor(selectedBgColor);
      setSelectedBgColor(tempColor);
    }
    
    // Add both colors to recent colors (only if they're not transparent)
    if (selectedBgColor !== 'transparent' && selectedBgColor !== ANSI_COLORS.transparent) {
      addRecentColor(selectedBgColor);
    }
    if (tempColor !== 'transparent' && tempColor !== ANSI_COLORS.transparent) {
      addRecentColor(tempColor);
    }
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
          {/* Color squares container - positioned to show both squares with corner overlap */}
          <div className="relative w-12 h-12">
            {/* Background color square (positioned bottom-right) */}
            <div className="absolute bottom-0 right-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    ref={backgroundButtonRef}
                    className="w-8 h-8 rounded border-2 border-border hover:border-primary transition-colors shadow-sm relative overflow-hidden"
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
                        viewBox="0 0 32 32"
                        style={{ pointerEvents: 'none' }}
                      >
                        <line
                          x1="2"
                          y1="30"
                          x2="30"
                          y2="2"
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
            </div>

            {/* Foreground color square (positioned top-left, overlapping corner) */}
            <div className="absolute top-0 left-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    ref={foregroundButtonRef}
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
                  <MoveDiagonal2 className="h-3 w-3" />
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
