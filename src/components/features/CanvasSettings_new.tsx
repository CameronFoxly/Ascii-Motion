import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Grid3X3, Palette, Type } from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';
import { useCanvasContext } from '@/contexts/CanvasContext';
import { CanvasSizePicker } from './CanvasSizePicker';
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

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTypographyPicker, setShowTypographyPicker] = useState(false);
  const [tempColor, setTempColor] = useState(canvasBackgroundColor);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const typographyPickerRef = useRef<HTMLDivElement>(null);

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
  useEffect(() => {
    setTempColor(canvasBackgroundColor);
  }, [canvasBackgroundColor]);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if click is outside color picker
      if (showColorPicker && 
          colorPickerRef.current && 
          !colorPickerRef.current.contains(target)) {
        // Also check if click is not on the portal dropdown
        const colorDropdown = document.getElementById('color-dropdown');
        if (!colorDropdown || !colorDropdown.contains(target)) {
          setShowColorPicker(false);
        }
      }
      
      // Check if click is outside typography picker
      if (showTypographyPicker && 
          typographyPickerRef.current && 
          !typographyPickerRef.current.contains(target)) {
        // Also check if click is not on the portal dropdown
        const typographyDropdown = document.getElementById('typography-dropdown');
        if (!typographyDropdown || !typographyDropdown.contains(target)) {
          setShowTypographyPicker(false);
        }
      }
    };

    if (showColorPicker || showTypographyPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColorPicker, showTypographyPicker]);

  const handleColorChange = (color: string) => {
    setTempColor(color);
    setCanvasBackgroundColor(color);
  };

  const presetColors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#808080', '#800000',
    '#008000', '#000080', '#808000', '#800080', '#008080'
  ];

  return (
    <TooltipProvider>
      <div className="flex items-center gap-3">
        {/* Canvas Size Picker */}
        <CanvasSizePicker
          width={width}
          height={height}
          onSizeChange={setCanvasSize}
        />

        <Separator orientation="vertical" className="h-6" />

        {/* Zoom Controls */}
        <ZoomControls />

        <Separator orientation="vertical" className="h-6" />

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
                className="h-6 w-6 p-0"
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
                    const position = calculatePosition(colorPickerRef.current);
                    setDropdownPosition(position);
                    setShowColorPicker(!showColorPicker);
                    setShowTypographyPicker(false);
                  }}
                  className="h-6 w-6 p-0"
                  style={{ backgroundColor: canvasBackgroundColor }}
                  aria-label="Canvas background color"
                  aria-expanded={showColorPicker}
                  aria-controls="color-dropdown"
                >
                  <Palette className="w-3 h-3" style={{ color: canvasBackgroundColor === '#FFFFFF' ? '#000000' : '#FFFFFF' }} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Canvas background color</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Typography Controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Text:</span>
          
          <div className="relative" ref={typographyPickerRef}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const position = calculatePosition(typographyPickerRef.current);
                    setDropdownPosition(position);
                    setShowTypographyPicker(!showTypographyPicker);
                    setShowColorPicker(false);
                  }}
                  className="h-6 px-2 gap-1"
                  aria-label="Typography settings"
                  aria-expanded={showTypographyPicker}
                  aria-controls="typography-dropdown"
                >
                  <Type className="w-3 h-3" />
                  <span className="text-xs">Font</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Typography settings</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Typography Picker Dropdown - Portal rendered for proper layering */}
        {showTypographyPicker && createPortal(
          <div 
            id="typography-dropdown"
            className="fixed z-[99999] p-3 bg-popover border border-border rounded-md shadow-lg"
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
                    setFontSize(16);
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

        {/* Background Color Picker Dropdown - Portal rendered for proper layering */}
        {showColorPicker && createPortal(
          <div 
            id="color-dropdown"
            className="fixed z-[99999] p-3 bg-popover border border-border rounded-md shadow-lg"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              minWidth: `${dropdownPosition.width}px`
            }}
            role="menu"
            aria-label="Background color selection menu"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-3">
              {/* Preset Colors */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Presets
                </label>
                <div className="grid grid-cols-5 gap-1">
                  {presetColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorChange(color)}
                      className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Hex Input */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Hex Color
                </label>
                <input
                  type="text"
                  value={tempColor}
                  onChange={(e) => {
                    let value = e.target.value;
                    
                    // Auto-add # if missing
                    if (value.length > 0 && !value.startsWith('#')) {
                      value = '#' + value;
                    }
                    
                    setTempColor(value);
                    
                    // Validate hex color (3 or 6 digits after #)
                    if (/^#[0-9A-Fa-f]{6}$/.test(value) || /^#[0-9A-Fa-f]{3}$/.test(value)) {
                      // Convert 3-digit hex to 6-digit
                      let fullHex = value;
                      if (value.length === 4) {
                        fullHex = '#' + value[1] + value[1] + value[2] + value[2] + value[3] + value[3];
                      }
                      handleColorChange(fullHex);
                    }
                  }}
                  onBlur={() => {
                    // Reset to current color if invalid input
                    if (!/^#[0-9A-Fa-f]{6}$/.test(tempColor) && !/^#[0-9A-Fa-f]{3}$/.test(tempColor)) {
                      setTempColor(canvasBackgroundColor);
                    }
                  }}
                  placeholder="#000000"
                  className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* HTML Color Picker */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Color Picker
                </label>
                <input
                  type="color"
                  value={canvasBackgroundColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-full h-8 border border-border rounded bg-background cursor-pointer"
                />
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </TooltipProvider>
  );
};
