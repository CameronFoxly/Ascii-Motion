// Advanced color picker overlay with improved HSV/RGB/HEX controls and interactive color wheel

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Pipette, RotateCcw, Check, X } from 'lucide-react';
import { usePaletteStore } from '../../stores/paletteStore';
import type { HSVColor, RGBColor } from '../../types/palette';
import { 
  hexToRgb, 
  rgbToHex, 
  hexToHsv, 
  hsvToHex, 
  hsvToRgb, 
  rgbToHsv,
  normalizeHexColor
} from '../../utils/colorConversion';
import { ANSI_COLORS } from '../../constants/colors';

interface ColorPickerOverlayProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onColorSelect: (color: string) => void;
  initialColor?: string;
  title?: string;
}

export const ColorPickerOverlay: React.FC<ColorPickerOverlayProps> = ({
  isOpen,
  onOpenChange,
  onColorSelect,
  initialColor = '#000000',
  title = 'Color Picker'
}) => {
  const { updatePreviewColor, addRecentColor, recentColors } = usePaletteStore();
  
  // Check if initial color is transparent
  const isTransparent = initialColor === 'transparent' || initialColor === ANSI_COLORS.transparent;
  
  // Color state in different formats
  const [currentColor, setCurrentColor] = useState(initialColor);
  const [previewColor, setPreviewColor] = useState(isTransparent ? 'transparent' : initialColor);
  const [hexInput, setHexInput] = useState(isTransparent ? '' : initialColor);
  const [rgbValues, setRgbValues] = useState<RGBColor>({ r: 0, g: 0, b: 0 });
  const [hsvValues, setHsvValues] = useState<HSVColor>({ h: 0, s: 0, v: 0 });
  const [colorWheelPosition, setColorWheelPosition] = useState({ x: 64, y: 64 }); // Center of 128px wheel
  const [valueSliderValue, setValueSliderValue] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransparentColor, setIsTransparentColor] = useState(isTransparent);
  
  const colorWheelRef = useRef<HTMLDivElement>(null);

  // Initialize color values when dialog opens or initial color changes
  useEffect(() => {
    if (isOpen) {
      const transparent = initialColor === 'transparent' || initialColor === ANSI_COLORS.transparent;
      setIsTransparentColor(transparent);
      
      if (transparent) {
        // Handle transparent color
        setCurrentColor('transparent');
        setPreviewColor('transparent');
        setHexInput('');
        setRgbValues({ r: 0, g: 0, b: 0 });
        setHsvValues({ h: 0, s: 0, v: 0 });
        setValueSliderValue(0);
        setColorWheelPosition({ x: 64, y: 64 });
      } else {
        // Handle normal color
        const color = normalizeHexColor(initialColor);
        setCurrentColor(color);
        setPreviewColor(color);
        setHexInput(color);
        
        const rgb = hexToRgb(color);
        const hsv = hexToHsv(color);
        
        if (rgb) setRgbValues(rgb);
        if (hsv) {
          setHsvValues(hsv);
          setValueSliderValue(hsv.v);
          updateColorWheelPosition(hsv);
        }
      }
    }
  }, [isOpen, initialColor]);

  // Update preview color in store
  useEffect(() => {
    updatePreviewColor(previewColor);
  }, [previewColor, updatePreviewColor]);

  // Update color wheel position based on HSV values
  const updateColorWheelPosition = useCallback((hsv: HSVColor) => {
    const centerX = 64; // Half of 128px wheel
    const centerY = 64;
    const maxRadius = 54; // Slightly less than 64 to stay within bounds
    
    const angle = (hsv.h * Math.PI) / 180;
    const radius = (hsv.s / 100) * maxRadius;
    
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    setColorWheelPosition({ x, y });
  }, []);

  // Color update handlers
  const updateFromHex = useCallback((hex: string) => {
    const normalizedHex = normalizeHexColor(hex);
    const rgb = hexToRgb(normalizedHex);
    const hsv = hexToHsv(normalizedHex);
    
    if (rgb && hsv) {
      setPreviewColor(normalizedHex);
      setRgbValues(rgb);
      setHsvValues(hsv);
      setValueSliderValue(hsv.v);
      updateColorWheelPosition(hsv);
      setIsTransparentColor(false);
    }
  }, [updateColorWheelPosition]);

  const updateFromRgb = useCallback((rgb: RGBColor) => {
    const hex = rgbToHex(rgb);
    const hsv = rgbToHsv(rgb);
    
    setPreviewColor(hex);
    setHexInput(hex);
    setHsvValues(hsv);
    setValueSliderValue(hsv.v);
    updateColorWheelPosition(hsv);
    setIsTransparentColor(false);
  }, [updateColorWheelPosition]);

  const updateFromHsv = useCallback((hsv: HSVColor) => {
    const rgb = hsvToRgb(hsv);
    const hex = hsvToHex(hsv);
    
    setPreviewColor(hex);
    setHexInput(hex);
    setRgbValues(rgb);
    setValueSliderValue(hsv.v);
    updateColorWheelPosition(hsv);
    setIsTransparentColor(false);
  }, [updateColorWheelPosition]);

  // Handle hex input change
  const handleHexChange = (value: string) => {
    setHexInput(value);
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      updateFromHex(value);
    }
  };

  // Handle RGB slider changes
  const handleRgbChange = (component: 'r' | 'g' | 'b', value: number) => {
    const newRgb = { ...rgbValues, [component]: Math.round(value) };
    setRgbValues(newRgb);
    updateFromRgb(newRgb);
  };

  // Handle RGB input changes
  const handleRgbInputChange = (component: 'r' | 'g' | 'b', value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 255) {
      handleRgbChange(component, numValue);
    }
  };

  // Handle HSV slider changes
  const handleHsvChange = (component: 'h' | 's' | 'v', value: number) => {
    const roundedValue = component === 'h' ? Math.round(value * 100) / 100 : Math.round(value);
    const newHsv = { ...hsvValues, [component]: roundedValue };
    setHsvValues(newHsv);
    updateFromHsv(newHsv);
  };

  // Handle HSV input changes
  const handleHsvInputChange = (component: 'h' | 's' | 'v', value: string) => {
    const numValue = parseFloat(value);
    const maxValues = { h: 360, s: 100, v: 100 };
    if (!isNaN(numValue) && numValue >= 0 && numValue <= maxValues[component]) {
      handleHsvChange(component, numValue);
    }
  };

  // Handle value slider change (affects the entire color wheel brightness)
  const handleValueSliderChange = (value: number) => {
    const newHsv = { ...hsvValues, v: value };
    setHsvValues(newHsv);
    setValueSliderValue(value);
    updateFromHsv(newHsv);
  };

  // Color wheel interaction with drag support
  const handleColorWheelInteraction = (event: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    if (!colorWheelRef.current) return;
    
    const rect = colorWheelRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = (event.clientX - rect.left) - centerX;
    const y = (event.clientY - rect.top) - centerY;
    
    const distance = Math.sqrt(x * x + y * y);
    const maxDistance = Math.min(centerX, centerY) - 10;
    
    if (distance <= maxDistance) {
      let angle = Math.atan2(y, x);
      angle = (angle * 180 / Math.PI + 360) % 360; // Convert to 0-360 degrees
      
      const saturation = Math.min(100, (distance / maxDistance) * 100);
      
      const newHsv = { ...hsvValues, h: angle, s: saturation };
      setHsvValues(newHsv);
      updateFromHsv(newHsv);
      
      // Update position for visual feedback
      const displayX = centerX + x;
      const displayY = centerY + y;
      setColorWheelPosition({ x: displayX, y: displayY });
    }
  };

  const handleColorWheelMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleColorWheelInteraction(event);
  };

  // Mouse move handler for dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (event: MouseEvent) => {
      handleColorWheelInteraction(event);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Eyedropper functionality
  const handleEyedropper = async () => {
    if ('EyeDropper' in window) {
      try {
        // @ts-expect-error - EyeDropper API is experimental
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        updateFromHex(result.sRGBHex);
      } catch {
        // Eyedropper cancelled or not supported
      }
    }
  };

  // Recent color selection
  const handleRecentColorSelect = (color: string) => {
    updateFromHex(color);
  };

  // Reset to current color
  const handleReset = () => {
    if (currentColor === 'transparent' || currentColor === ANSI_COLORS.transparent) {
      setIsTransparentColor(true);
      setPreviewColor('transparent');
      setHexInput('');
      setRgbValues({ r: 0, g: 0, b: 0 });
      setHsvValues({ h: 0, s: 0, v: 0 });
      setValueSliderValue(0);
      setColorWheelPosition({ x: 64, y: 64 });
    } else {
      updateFromHex(currentColor);
    }
  };

  // Confirm color selection
  const handleConfirm = () => {
    addRecentColor(previewColor);
    onColorSelect(previewColor);
    onOpenChange(false);
  };

  // Cancel selection
  const handleCancel = () => {
    onOpenChange(false);
  };

  // Create radial gradient for saturation in color wheel
  const createColorWheelStyle = () => {
    const lightness = 50 + (valueSliderValue - 50) * 0.5; // Adjust lightness based on value
    return {
      background: `conic-gradient(
        hsl(0, 100%, ${lightness}%),
        hsl(60, 100%, ${lightness}%),
        hsl(120, 100%, ${lightness}%),
        hsl(180, 100%, ${lightness}%),
        hsl(240, 100%, ${lightness}%),
        hsl(300, 100%, ${lightness}%),
        hsl(0, 100%, ${lightness}%)
      ), radial-gradient(circle, transparent 0%, rgba(255,255,255,0.8) 70%)`
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Color Preview */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label className="text-sm font-medium">Preview</Label>
              <div className="flex h-12 border border-border rounded overflow-hidden">
                {/* Current Color */}
                <div className="flex-1 relative">
                  {(currentColor === 'transparent' || currentColor === ANSI_COLORS.transparent) ? (
                    <div className="w-full h-full relative bg-white">
                      <div 
                        className="absolute inset-0"
                        style={{
                          backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                          backgroundSize: '8px 8px',
                          backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
                        }}
                      />
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
                        <line x1="4" y1="44" x2="44" y2="4" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                  ) : (
                    <div 
                      className="w-full h-full"
                      style={{ backgroundColor: currentColor }}
                      title="Current Color"
                    />
                  )}
                </div>
                
                {/* Preview Color */}
                <div className="flex-1 relative border-l border-border">
                  {(previewColor === 'transparent' || isTransparentColor) ? (
                    <div className="w-full h-full relative bg-white">
                      <div 
                        className="absolute inset-0"
                        style={{
                          backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                          backgroundSize: '8px 8px',
                          backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
                        }}
                      />
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
                        <line x1="4" y1="44" x2="44" y2="4" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                  ) : (
                    <div 
                      className="w-full h-full"
                      style={{ backgroundColor: previewColor }}
                      title="New Color"
                    />
                  )}
                </div>
              </div>
            </div>
            
            {/* Eyedropper Button */}
            {'EyeDropper' in window && (
              <Button
                size="sm"
                variant="outline" 
                onClick={handleEyedropper}
                className="h-8 w-8 p-0"
              >
                <Pipette className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Color Wheel and Value Slider */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Color Wheel</Label>
            <div className="flex justify-center items-center gap-4">
              {/* Color Wheel */}
              <div 
                ref={colorWheelRef}
                className="w-32 h-32 rounded-full border border-border cursor-crosshair relative select-none"
                style={createColorWheelStyle()}
                onMouseDown={handleColorWheelMouseDown}
              >
                <div 
                  className="absolute w-3 h-3 bg-white border-2 border-black rounded-full transform -translate-x-1.5 -translate-y-1.5 pointer-events-none"
                  style={{
                    left: colorWheelPosition.x,
                    top: colorWheelPosition.y
                  }}
                />
              </div>
              
              {/* Value Slider */}
              <div className="flex flex-col items-center gap-2">
                <Label className="text-xs font-medium">V</Label>
                <div className="w-6 flex flex-col items-center">
                  <input
                    type="range"
                    value={valueSliderValue}
                    onChange={(e) => handleValueSliderChange(parseFloat(e.target.value))}
                    max={100}
                    step={1}
                    className="h-32 w-2 bg-muted rounded-lg appearance-none cursor-pointer transform -rotate-90 origin-center"
                    style={{ writingMode: 'bt-lr' } as any}
                    disabled={isTransparentColor}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {isTransparentColor ? '-' : `${Math.round(valueSliderValue)}%`}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* HSV Controls */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">HSV</Label>
            
            {/* Hue */}
            <div className="flex items-center gap-2">
              <Label className="w-4 text-xs">H</Label>
              <Slider
                value={isTransparentColor ? 0 : hsvValues.h}
                onValueChange={(value) => handleHsvChange('h', value)}
                max={360}
                step={0.1}
                className="flex-1"
                disabled={isTransparentColor}
              />
              <Input
                value={isTransparentColor ? '-' : hsvValues.h.toFixed(2)}
                onChange={(e) => handleHsvInputChange('h', e.target.value)}
                className="w-20 h-8 text-xs"
                disabled={isTransparentColor}
              />
              <span className="text-xs text-muted-foreground">°</span>
            </div>
            
            {/* Saturation */}
            <div className="flex items-center gap-2">
              <Label className="w-4 text-xs">S</Label>
              <Slider
                value={isTransparentColor ? 0 : hsvValues.s}
                onValueChange={(value) => handleHsvChange('s', value)}
                max={100}
                step={1}
                className="flex-1"
                disabled={isTransparentColor}
              />
              <Input
                value={isTransparentColor ? '-' : Math.round(hsvValues.s).toString()}
                onChange={(e) => handleHsvInputChange('s', e.target.value)}
                className="w-20 h-8 text-xs"
                disabled={isTransparentColor}
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
            
            {/* Value */}
            <div className="flex items-center gap-2">
              <Label className="w-4 text-xs">V</Label>
              <Slider
                value={isTransparentColor ? 0 : hsvValues.v}
                onValueChange={(value) => handleHsvChange('v', value)}
                max={100}
                step={1}
                className="flex-1"
                disabled={isTransparentColor}
              />
              <Input
                value={isTransparentColor ? '-' : Math.round(hsvValues.v).toString()}
                onChange={(e) => handleHsvInputChange('v', e.target.value)}
                className="w-20 h-8 text-xs"
                disabled={isTransparentColor}
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>

          <Separator />

          {/* RGB Controls */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">RGB</Label>
            
            {/* Red */}
            <div className="flex items-center gap-2">
              <Label className="w-4 text-xs">R</Label>
              <Slider
                value={isTransparentColor ? 0 : rgbValues.r}
                onValueChange={(value) => handleRgbChange('r', value)}
                max={255}
                step={1}
                className="flex-1"
                disabled={isTransparentColor}
              />
              <Input
                value={isTransparentColor ? '-' : rgbValues.r.toString()}
                onChange={(e) => handleRgbInputChange('r', e.target.value)}
                className="w-16 h-8 text-xs"
                disabled={isTransparentColor}
              />
            </div>
            
            {/* Green */}
            <div className="flex items-center gap-2">
              <Label className="w-4 text-xs">G</Label>
              <Slider
                value={isTransparentColor ? 0 : rgbValues.g}
                onValueChange={(value) => handleRgbChange('g', value)}
                max={255}
                step={1}
                className="flex-1"
                disabled={isTransparentColor}
              />
              <Input
                value={isTransparentColor ? '-' : rgbValues.g.toString()}
                onChange={(e) => handleRgbInputChange('g', e.target.value)}
                className="w-16 h-8 text-xs"
                disabled={isTransparentColor}
              />
            </div>
            
            {/* Blue */}
            <div className="flex items-center gap-2">
              <Label className="w-4 text-xs">B</Label>
              <Slider
                value={isTransparentColor ? 0 : rgbValues.b}
                onValueChange={(value) => handleRgbChange('b', value)}
                max={255}
                step={1}
                className="flex-1"
                disabled={isTransparentColor}
              />
              <Input
                value={isTransparentColor ? '-' : rgbValues.b.toString()}
                onChange={(e) => handleRgbInputChange('b', e.target.value)}
                className="w-16 h-8 text-xs"
                disabled={isTransparentColor}
              />
            </div>
          </div>

          <Separator />

          {/* Hex Input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Hex</Label>
            <Input
              value={isTransparentColor ? '-' : hexInput}
              onChange={(e) => handleHexChange(e.target.value)}
              placeholder={isTransparentColor ? "Transparent" : "#000000"}
              className="font-mono"
              disabled={isTransparentColor}
            />
          </div>

          {/* Recent Colors */}
          {recentColors.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Recent Colors</Label>
              <div className="flex gap-1 flex-wrap">
                {recentColors.slice(0, 10).map((color, index) => (
                  <button
                    key={index}
                    className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => handleRecentColorSelect(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dialog Footer */} 
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleReset}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            
            <Button
              onClick={handleConfirm}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              OK
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
