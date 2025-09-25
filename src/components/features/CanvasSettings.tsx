import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ColorPickerOverlay } from './ColorPickerOverlay';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Grid3X3, Palette, Type } from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';
import { useCanvasContext } from '@/contexts/CanvasContext';
import { ZoomControls } from './ZoomControls';

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
          
          {/* Width controls with controls to the left */}
          <div className="flex items-center gap-1">
            <div className="flex flex-col">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const newWidth = Math.max(4, Math.min(200, width + 1));
                  setCanvasSize(newWidth, height);
                }}
                disabled={width >= 200}
                className="h-3 w-6 p-0 text-xs leading-none"
              >
                +
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const newWidth = Math.max(4, Math.min(200, width - 1));
                  setCanvasSize(newWidth, height);
                }}
                disabled={width <= 4}
                className="h-3 w-6 p-0 text-xs leading-none"
              >
                -
              </Button>
            </div>
            <input
              type="number"
              value={width}
              onChange={(e) => {
                const numValue = parseInt(e.target.value, 10);
                if (!isNaN(numValue)) {
                  const constrainedValue = Math.max(4, Math.min(200, numValue));
                  setCanvasSize(constrainedValue, height);
                }
              }}
              className="w-12 h-7 text-xs text-center border border-border rounded bg-background text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              min="4"
              max="200"
            />
          </div>

          <span className="text-xs text-muted-foreground">×</span>

          {/* Height controls with input and controls to the right */}
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={height}
              onChange={(e) => {
                const numValue = parseInt(e.target.value, 10);
                if (!isNaN(numValue)) {
                  const constrainedValue = Math.max(4, Math.min(100, numValue));
                  setCanvasSize(width, constrainedValue);
                }
              }}
              className="w-12 h-7 text-xs text-center border border-border rounded bg-background text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              min="4"
              max="100"
            />
            <div className="flex flex-col">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const newHeight = Math.max(4, Math.min(100, height + 1));
                  setCanvasSize(width, newHeight);
                }}
                disabled={height >= 100}
                className="h-3 w-6 p-0 text-xs leading-none"
              >
                +
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const newHeight = Math.max(4, Math.min(100, height - 1));
                  setCanvasSize(width, newHeight);
                }}
                disabled={height <= 4}
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
