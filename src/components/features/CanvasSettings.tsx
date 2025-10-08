import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ColorPickerOverlay } from './ColorPickerOverlay';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Grid3X3, Palette, Type } from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';
import { useCanvasContext } from '@/contexts/CanvasContext';
import { ZoomControls } from './ZoomControls';
import { useToolStore } from '@/stores/toolStore';
import { useAnimationStore } from '@/stores/animationStore';
import { 
  charactersToPixels, 
  validatePixelInput,
  type PixelDimensions 
} from '@/utils/canvasSizeConversion';

export const CanvasSettings: React.FC = () => {
  const { 
    width, 
    height, 
    canvasBackgroundColor, 
    showGrid, 
    setCanvasSize, 
    setCanvasBackgroundColor, 
    toggleGrid 
  } = useCanvasStore();

  const {
    characterSpacing,
    lineSpacing,
    fontSize,
    setCharacterSpacing,
    setLineSpacing,
    setFontSize
  } = useCanvasContext();

  const { pushCanvasResizeHistory } = useToolStore();
  const { currentFrameIndex } = useAnimationStore();

  // Canvas size mode state ('characters' or 'pixels')
  const [sizeMode, setSizeMode] = useState<'characters' | 'pixels'>('characters');

  // Local state for input values to allow editing before validation
  const [widthInput, setWidthInput] = useState(width.toString());
  const [heightInput, setHeightInput] = useState(height.toString());

  // Calculate pixel dimensions using typography settings
  const pixelDimensions = useMemo((): PixelDimensions => {
    return charactersToPixels(
      { width, height },
      { fontSize, characterSpacing, lineSpacing }
    );
  }, [width, height, fontSize, characterSpacing, lineSpacing]);

  // Update local input state when canvas dimensions or mode changes
  useEffect(() => {
    if (sizeMode === 'characters') {
      setWidthInput(width.toString());
      setHeightInput(height.toString());
    } else {
      setWidthInput(pixelDimensions.width.toString());
      setHeightInput(pixelDimensions.height.toString());
    }
  }, [width, height, sizeMode, pixelDimensions]);

  // Handler for mode toggle
  const handleModeToggle = () => {
    const newMode = sizeMode === 'characters' ? 'pixels' : 'characters';
    setSizeMode(newMode);
  };

  // Unified size change handler that supports both modes and history
  const handleSizeChange = (newWidth: number, newHeight: number) => {
    const previousWidth = width;
    const previousHeight = height;
    const previousCells = new Map(useCanvasStore.getState().cells);
    
    // Apply the resize
    setCanvasSize(newWidth, newHeight);
    
    // Record in history if dimensions actually changed
    if (previousWidth !== newWidth || previousHeight !== newHeight) {
      pushCanvasResizeHistory(
        previousWidth,
        previousHeight,
        newWidth,
        newHeight,
        previousCells,
        currentFrameIndex
      );
    }
  };

  // Handlers for character mode
  const handleCharacterWidthChange = (value: string) => {
    setWidthInput(value);
  };

  const handleCharacterWidthBlur = () => {
    const numValue = parseInt(widthInput, 10);
    if (isNaN(numValue) || widthInput === '') {
      setWidthInput(width.toString());
    } else {
      const constrainedValue = Math.max(4, Math.min(200, numValue));
      handleSizeChange(constrainedValue, height);
    }
  };

  const handleCharacterHeightChange = (value: string) => {
    setHeightInput(value);
  };

  const handleCharacterHeightBlur = () => {
    const numValue = parseInt(heightInput, 10);
    if (isNaN(numValue) || heightInput === '') {
      setHeightInput(height.toString());
    } else {
      const constrainedValue = Math.max(4, Math.min(100, numValue));
      handleSizeChange(width, constrainedValue);
    }
  };

  // Handlers for pixel mode
  const handlePixelWidthChange = (value: string) => {
    setWidthInput(value);
  };

  const handlePixelWidthBlur = () => {
    const numValue = parseInt(widthInput, 10);
    if (isNaN(numValue) || widthInput === '') {
      setWidthInput(pixelDimensions.width.toString());
    } else {
      const validatedChars = validatePixelInput(
        { width: numValue, height: pixelDimensions.height },
        { fontSize, characterSpacing, lineSpacing }
      );
      handleSizeChange(validatedChars.width, validatedChars.height);
    }
  };

  const handlePixelHeightChange = (value: string) => {
    setHeightInput(value);
  };

  const handlePixelHeightBlur = () => {
    const numValue = parseInt(heightInput, 10);
    if (isNaN(numValue) || heightInput === '') {
      setHeightInput(pixelDimensions.height.toString());
    } else {
      const validatedChars = validatePixelInput(
        { width: pixelDimensions.width, height: numValue },
        { fontSize, characterSpacing, lineSpacing }
      );
      handleSizeChange(validatedChars.width, validatedChars.height);
    }
  };

  // Unified key down handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  // +/- button handlers that work in both modes
  const adjustWidth = (delta: number) => {
    if (sizeMode === 'characters') {
      const newWidth = Math.max(4, Math.min(200, width + delta));
      handleSizeChange(newWidth, height);
    } else {
      // In pixel mode, adjust by one character worth of pixels
      const baseCharWidth = fontSize * 0.6 * characterSpacing;
      const pixelDelta = Math.round(baseCharWidth * delta);
      const newPixelWidth = pixelDimensions.width + pixelDelta;
      const validatedChars = validatePixelInput(
        { width: newPixelWidth, height: pixelDimensions.height },
        { fontSize, characterSpacing, lineSpacing }
      );
      handleSizeChange(validatedChars.width, validatedChars.height);
    }
  };

  const adjustHeight = (delta: number) => {
    if (sizeMode === 'characters') {
      const newHeight = Math.max(4, Math.min(100, height + delta));
      handleSizeChange(width, newHeight);
    } else {
      // In pixel mode, adjust by one character worth of pixels
      const baseCharHeight = fontSize * lineSpacing;
      const pixelDelta = Math.round(baseCharHeight * delta);
      const newPixelHeight = pixelDimensions.height + pixelDelta;
      const validatedChars = validatePixelInput(
        { width: pixelDimensions.width, height: newPixelHeight },
        { fontSize, characterSpacing, lineSpacing }
      );
      handleSizeChange(validatedChars.width, validatedChars.height);
    }
  };

  // Replace inline dropdown picker with modal overlay reuse
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTypographyPicker, setShowTypographyPicker] = useState(false);
  // (Removed old dropdown animation state)
  const [typographyPickerAnimationClass, setTypographyPickerAnimationClass] = useState('');
  // Temp color state removed; modal handles confirmation
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const typographyPickerRef = useRef<HTMLDivElement>(null);
  const colorPickerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typographyPickerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate dropdown position
  const calculatePosition = (buttonRef: HTMLDivElement | null) => {
    if (!buttonRef) return { top: 0, left: 0, width: 200 };
    
    const rect = buttonRef.getBoundingClientRect();
    return {
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(200, rect.width)
    };
  };

  // Sync tempColor with actual background color
  // (Removed tempColor sync effect)

  // Close typography picker when clicking outside (color picker overlay handles its own dialog focus trapping)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Check if click is outside typography picker
      if (showTypographyPicker && 
          typographyPickerRef.current && 
          !typographyPickerRef.current.contains(target)) {
        // Also check if click is not on the portal dropdown
        const typographyDropdown = document.getElementById('typography-dropdown');
        if (!typographyDropdown || !typographyDropdown.contains(target)) {
          closeTypographyPicker();
        }
      }
    };

    if (showTypographyPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTypographyPicker]);

  // Reset dropdown states when layout might be changing (e.g., window resize)
  useEffect(() => {
    const handleLayoutChange = () => {
      closeColorPicker();
      closeTypographyPicker();
    };

    window.addEventListener('resize', handleLayoutChange);
    return () => window.removeEventListener('resize', handleLayoutChange);
  }, []);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (colorPickerTimeoutRef.current) {
        clearTimeout(colorPickerTimeoutRef.current);
      }
      if (typographyPickerTimeoutRef.current) {
        clearTimeout(typographyPickerTimeoutRef.current);
      }
    };
  }, []);

  // Animated show/hide functions for color picker
  const showColorPickerAnimated = () => {
    setShowColorPicker(true);
  };

  const closeColorPicker = () => {
    setShowColorPicker(false);
  };

  // Animated show/hide functions for typography picker
  const showTypographyPickerAnimated = () => {
    if (typographyPickerTimeoutRef.current) {
      clearTimeout(typographyPickerTimeoutRef.current);
    }
    setShowTypographyPicker(true);
    setTypographyPickerAnimationClass('dropdown-enter');
  };

  const closeTypographyPicker = () => {
    if (!showTypographyPicker) return;
    
    setTypographyPickerAnimationClass('dropdown-exit');
    typographyPickerTimeoutRef.current = setTimeout(() => {
      setShowTypographyPicker(false);
      setTypographyPickerAnimationClass('');
    }, 100); // Match faster exit animation duration
  };

  const handleColorChange = (color: string) => {
    setCanvasBackgroundColor(color);
  };

  // Removed preset color array (presets no longer shown in advanced dialog)

  return (
    <TooltipProvider>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between w-full gap-3">
        {/* Left Section - Canvas Size Controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Canvas size:</span>
          
          {/* Mode Toggle Button with Tooltip */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleModeToggle}
                className="h-7 px-2 text-xs min-w-[36px]"
              >
                {sizeMode === 'characters' ? 'char' : 'px'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {sizeMode === 'characters' 
                ? 'Characters (click to switch to pixels)'
                : 'Pixels (click to switch to characters)'
              }
            </TooltipContent>
          </Tooltip>
          
          {/* Width controls with controls to the left */}
          <div className="flex items-center gap-1">
            <div className="flex flex-col">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => adjustWidth(1)}
                disabled={sizeMode === 'characters' ? width >= 200 : false}
                className="h-3 w-6 p-0 text-xs leading-none"
              >
                +
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => adjustWidth(-1)}
                disabled={sizeMode === 'characters' ? width <= 4 : false}
                className="h-3 w-6 p-0 text-xs leading-none"
              >
                -
              </Button>
            </div>
            <input
              type="number"
              value={widthInput}
              onChange={(e) => sizeMode === 'characters' ? handleCharacterWidthChange(e.target.value) : handlePixelWidthChange(e.target.value)}
              onBlur={sizeMode === 'characters' ? handleCharacterWidthBlur : handlePixelWidthBlur}
              onKeyDown={handleKeyDown}
              className="w-12 h-7 text-xs text-center border border-border rounded bg-background text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              min={sizeMode === 'characters' ? "4" : "1"}
              max={sizeMode === 'characters' ? "200" : undefined}
            />
          </div>

          <span className="text-xs text-muted-foreground">×</span>

          {/* Height controls with input and controls to the right */}
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={heightInput}
              onChange={(e) => sizeMode === 'characters' ? handleCharacterHeightChange(e.target.value) : handlePixelHeightChange(e.target.value)}
              onBlur={sizeMode === 'characters' ? handleCharacterHeightBlur : handlePixelHeightBlur}
              onKeyDown={handleKeyDown}
              className="w-12 h-7 text-xs text-center border border-border rounded bg-background text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              min={sizeMode === 'characters' ? "4" : "1"}
              max={sizeMode === 'characters' ? "100" : undefined}
            />
            <div className="flex flex-col">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => adjustHeight(1)}
                disabled={sizeMode === 'characters' ? height >= 100 : false}
                className="h-3 w-6 p-0 text-xs leading-none"
              >
                +
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => adjustHeight(-1)}
                disabled={sizeMode === 'characters' ? height <= 4 : false}
                className="h-3 w-6 p-0 text-xs leading-none"
              >
                -
              </Button>
            </div>
          </div>
        </div>

        {/* Right Section - Display, Text, and Zoom Controls */}
        <div className="flex items-center gap-3">
          {/* Display Controls */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Display:</span>
            
            {/* Grid Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showGrid ? "default" : "outline"}
                  size="sm"
                  onClick={toggleGrid}
                  className="h-6 w-6 p-0 leading-none flex items-center justify-center [&_svg]:w-3 [&_svg]:h-3"
                >
                  <Grid3X3 className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{showGrid ? "Hide grid" : "Show grid"}</p>
              </TooltipContent>
            </Tooltip>

            {/* Background Color Picker */}
            <div className="relative" ref={colorPickerRef}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      closeTypographyPicker();
                      showColorPickerAnimated();
                    }}
                    className={`h-6 w-6 p-0 leading-none flex items-center justify-center relative overflow-hidden ${canvasBackgroundColor === 'transparent' ? 'border-2' : ''}`}
                    aria-label="Canvas background color"
                    aria-expanded={showColorPicker}
                    aria-controls="color-dropdown"
                  >
                    {canvasBackgroundColor === 'transparent' ? (
                      // Match structure/metrics of other buttons: use an inner span with inset background & diagonal
                      <span className="flex items-center justify-center w-full h-full">
                        <span className="relative block w-full h-full rounded overflow-hidden">
                          <span
                            className="absolute inset-0 rounded"
                            style={{
                              backgroundColor: '#ffffff',
                              backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                              backgroundSize: '8px 8px',
                              backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
                            }}
                          />
                          <svg
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            viewBox="0 0 32 32"
                            preserveAspectRatio="xMidYMid meet"
                          >
                            {/* Slash to match palette panel (bottom-left to top-right) */}
                            <line x1="2" y1="30" x2="30" y2="2" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </span>
                      </span>
                    ) : (
                      <div className="flex items-center justify-center w-full h-full" style={{ backgroundColor: canvasBackgroundColor }}>
                        <Palette className="w-3 h-3" style={{ color: canvasBackgroundColor === '#FFFFFF' ? '#000000' : '#FFFFFF' }} />
                      </div>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Canvas background color</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Typography Controls */}
            <div className="relative" ref={typographyPickerRef}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (showTypographyPicker) {
                        closeTypographyPicker();
                      } else {
                        const position = calculatePosition(typographyPickerRef.current);
                        setDropdownPosition(position);
                        closeColorPicker(); // Close other dropdown first
                        showTypographyPickerAnimated();
                      }
                    }}
                    className="h-6 w-6 p-0 leading-none flex items-center justify-center [&_svg]:w-3 [&_svg]:h-3"
                    aria-label="Typography settings"
                    aria-expanded={showTypographyPicker}
                    aria-controls="typography-dropdown"
                  >
                    <Type className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Typography settings</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Zoom Controls - kept exactly as is */}
          <ZoomControls />
  </div>        {/* Typography Picker Dropdown - Portal rendered for proper layering */}
        {showTypographyPicker && dropdownPosition.top > 0 && createPortal(
          <div 
            id="typography-dropdown"
            className={`fixed z-[99999] p-3 bg-popover border border-border rounded-md shadow-lg ${typographyPickerAnimationClass}`}
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              minWidth: `${dropdownPosition.width}px`
            }}
            role="menu"
            aria-label="Typography settings menu"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              {/* Text Size */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Text Size: {fontSize}px
                </label>
                <input
                  type="range"
                  min="8"
                  max="48"
                  step="1"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>8px</span>
                  <span>24px</span>
                  <span>48px</span>
                </div>
              </div>

              {/* Character Spacing */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Character Spacing: {characterSpacing.toFixed(2)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={characterSpacing}
                  onChange={(e) => setCharacterSpacing(parseFloat(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0.5x</span>
                  <span>1.0x</span>
                  <span>2.0x</span>
                </div>
              </div>

              {/* Line Spacing */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Line Spacing: {lineSpacing.toFixed(2)}x
                </label>
                <input
                  type="range"
                  min="0.8"
                  max="2.0"
                  step="0.05"
                  value={lineSpacing}
                  onChange={(e) => setLineSpacing(parseFloat(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0.8x</span>
                  <span>1.0x</span>
                  <span>2.0x</span>
                </div>
              </div>

              {/* Reset Button */}
              <div className="pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFontSize(18);
                    setCharacterSpacing(1.0);
                    setLineSpacing(1.0);
                  }}
                  className="w-full h-7 text-xs"
                >
                  Reset to Default
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Background Color Picker Modal (full replacement) */}
        <ColorPickerOverlay
          isOpen={showColorPicker}
          onOpenChange={(open) => {
            setShowColorPicker(open);
          }}
          onColorSelect={(color) => {
            handleColorChange(color);
          }}
          initialColor={canvasBackgroundColor}
          title="Edit Canvas Background Color"
          showTransparentOption
          triggerRef={colorPickerRef}
          anchorPosition="bottom-left"
        />
      </div>
    </TooltipProvider>
  );
};
