import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Grid3X3, Palette } from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';
import { CanvasSizePicker } from './CanvasSizePicker';

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

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [tempColor, setTempColor] = useState(canvasBackgroundColor);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Sync tempColor with actual background color
  useEffect(() => {
    setTempColor(canvasBackgroundColor);
  }, [canvasBackgroundColor]);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColorPicker]);

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
    <div className="flex items-center gap-4">
      {/* Canvas Size Picker */}
      <CanvasSizePicker
        width={width}
        height={height}
        onSizeChange={setCanvasSize}
      />

      {/* Grid Toggle */}
      <Button
        variant={showGrid ? "default" : "outline"}
        size="sm"
        onClick={toggleGrid}
        title={showGrid ? "Hide grid" : "Show grid"}
        className="h-7 px-3 flex items-center gap-2"
      >
        <Grid3X3 className="w-3 h-3" />
        <span className="text-xs">Grid</span>
      </Button>

      {/* Canvas Background Color */}
      <div className="relative" ref={colorPickerRef}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowColorPicker(!showColorPicker)}
          title="Canvas background color"
          className="h-7 px-3 flex items-center gap-2"
        >
          <div 
            className="w-3 h-3 rounded border border-border" 
            style={{ backgroundColor: canvasBackgroundColor }}
          />
          <Palette className="w-3 h-3" />
          <span className="text-xs">Background</span>
        </Button>

        {/* Color Picker Dropdown */}
        {showColorPicker && (
          <div className="absolute top-8 left-0 z-50 p-3 bg-popover border border-border rounded-md shadow-lg">
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
          </div>
        )}
      </div>
    </div>
  );
};
