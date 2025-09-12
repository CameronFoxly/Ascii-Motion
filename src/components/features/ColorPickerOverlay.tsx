// Advanced color picker overlay with HSV/RGB/HEX controls and color wheel

import React, { useState, useCallback, useEffect } from 'react';
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
  
  // Color state in different formats
  const [currentColor, setCurrentColor] = useState(initialColor);
  const [previewColor, setPreviewColor] = useState(initialColor);
  const [hexInput, setHexInput] = useState(initialColor);
  const [rgbValues, setRgbValues] = useState<RGBColor>({ r: 0, g: 0, b: 0 });
  const [hsvValues, setHsvValues] = useState<HSVColor>({ h: 0, s: 0, v: 0 });
  const [colorWheelPosition, setColorWheelPosition] = useState({ x: 0, y: 0 });

  // Initialize color values when dialog opens or initial color changes
  useEffect(() => {
    if (isOpen) {
      const color = normalizeHexColor(initialColor);
      setCurrentColor(color);
      setPreviewColor(color);
      setHexInput(color);
      
      const rgb = hexToRgb(color);
      const hsv = hexToHsv(color);
      
      if (rgb) setRgbValues(rgb);
      if (hsv) setHsvValues(hsv);
    }
  }, [isOpen, initialColor]);

  // Update preview color in store
  useEffect(() => {
    updatePreviewColor(previewColor);
  }, [previewColor, updatePreviewColor]);

  // Color update handlers
  const updateFromHex = useCallback((hex: string) => {
    const normalizedHex = normalizeHexColor(hex);
    const rgb = hexToRgb(normalizedHex);
    const hsv = hexToHsv(normalizedHex);
    
    if (rgb && hsv) {
      setPreviewColor(normalizedHex);
      setRgbValues(rgb);
      setHsvValues(hsv);
    }
  }, []);

  const updateFromRgb = useCallback((rgb: RGBColor) => {
    const hex = rgbToHex(rgb);
    const hsv = rgbToHsv(rgb);
    
    setPreviewColor(hex);
    setHexInput(hex);
    setHsvValues(hsv);
  }, []);

  const updateFromHsv = useCallback((hsv: HSVColor) => {
    const rgb = hsvToRgb(hsv);
    const hex = hsvToHex(hsv);
    
    setPreviewColor(hex);
    setHexInput(hex);
    setRgbValues(rgb);
  }, []);

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

  // Handle HSV slider changes
  const handleHsvChange = (component: 'h' | 's' | 'v', value: number) => {
    const newHsv = { ...hsvValues, [component]: Math.round(value) };
    setHsvValues(newHsv);
    updateFromHsv(newHsv);
  };

  // Color wheel interaction (simplified implementation)
  const handleColorWheelClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = event.clientX - rect.left - centerX;
    const y = event.clientY - rect.top - centerY;
    
    const distance = Math.sqrt(x * x + y * y);
    const maxDistance = Math.min(centerX, centerY) - 10;
    
    if (distance <= maxDistance) {
      const angle = Math.atan2(y, x);
      const hue = ((angle * 180 / Math.PI) + 360) % 360;
      const saturation = Math.min(100, (distance / maxDistance) * 100);
      
      const newHsv = { ...hsvValues, h: hue, s: saturation };
      setHsvValues(newHsv);
      updateFromHsv(newHsv);
      setColorWheelPosition({ x: x + centerX, y: y + centerY });
    }
  };

  // Eyedropper functionality (simplified - would need browser API)
  const handleEyedropper = async () => {
    if ('EyeDropper' in window) {
      try {
        // @ts-ignore - EyeDropper API is experimental
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        updateFromHex(result.sRGBHex);
      } catch (error) {
        console.log('Eyedropper cancelled or not supported');
      }
    }
  };

  // Recent color selection
  const handleRecentColorSelect = (color: string) => {
    updateFromHex(color);
  };

  // Reset to current color
  const handleReset = () => {
    updateFromHex(currentColor);
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
              <div className="flex h-12 border border-border rounded">
                <div 
                  className="flex-1 rounded-l"
                  style={{ backgroundColor: currentColor }}
                  title="Current Color"
                />
                <div 
                  className="flex-1 rounded-r border-l border-border"
                  style={{ backgroundColor: previewColor }}
                  title="New Color"
                />
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

          {/* Color Wheel */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Color Wheel</Label>
            <div className="flex justify-center">
              <div 
                className="w-32 h-32 rounded-full border border-border cursor-crosshair relative"
                style={{
                  background: `conic-gradient(
                    hsl(0, 100%, ${100 - hsvValues.v / 2}%),
                    hsl(60, 100%, ${100 - hsvValues.v / 2}%),
                    hsl(120, 100%, ${100 - hsvValues.v / 2}%),
                    hsl(180, 100%, ${100 - hsvValues.v / 2}%),
                    hsl(240, 100%, ${100 - hsvValues.v / 2}%),
                    hsl(300, 100%, ${100 - hsvValues.v / 2}%),
                    hsl(0, 100%, ${100 - hsvValues.v / 2}%)
                  )`
                }}
                onClick={handleColorWheelClick}
              >
                <div 
                  className="absolute w-2 h-2 bg-white border border-black rounded-full transform -translate-x-1 -translate-y-1"
                  style={{
                    left: colorWheelPosition.x,
                    top: colorWheelPosition.y
                  }}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* HSV Controls */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">HSV</Label>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="w-4 text-xs">H</Label>
                <Slider
                  value={hsvValues.h}
                  onValueChange={(value) => handleHsvChange('h', value)}
                  max={360}
                  step={1}
                  className="flex-1"
                />
                <span className="w-8 text-xs text-right">{hsvValues.h}°</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Label className="w-4 text-xs">S</Label>
                <Slider
                  value={hsvValues.s}
                  onValueChange={(value) => handleHsvChange('s', value)}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="w-8 text-xs text-right">{hsvValues.s}%</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Label className="w-4 text-xs">V</Label>
                <Slider
                  value={hsvValues.v}
                  onValueChange={(value) => handleHsvChange('v', value)}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="w-8 text-xs text-right">{hsvValues.v}%</span>
              </div>
            </div>
          </div>

          {/* RGB Controls */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">RGB</Label>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="w-4 text-xs">R</Label>
                <Slider
                  value={rgbValues.r}
                  onValueChange={(value) => handleRgbChange('r', value)}
                  max={255}
                  step={1}
                  className="flex-1"
                />
                <span className="w-8 text-xs text-right">{rgbValues.r}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Label className="w-4 text-xs">G</Label>
                <Slider
                  value={rgbValues.g}
                  onValueChange={(value) => handleRgbChange('g', value)}
                  max={255}
                  step={1}
                  className="flex-1"
                />
                <span className="w-8 text-xs text-right">{rgbValues.g}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Label className="w-4 text-xs">B</Label>
                <Slider
                  value={rgbValues.b}
                  onValueChange={(value) => handleRgbChange('b', value)}
                  max={255}
                  step={1}
                  className="flex-1"
                />
                <span className="w-8 text-xs text-right">{rgbValues.b}</span>
              </div>
            </div>
          </div>

          {/* Hex Input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Hex</Label>
            <Input
              value={hexInput}
              onChange={(e) => handleHexChange(e.target.value)}
              placeholder="#000000"
              className="font-mono"
            />
          </div>

          {/* Recent Colors */}
          {recentColors.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Recent Colors</Label>
              <div className="flex flex-wrap gap-1">
                {recentColors.slice(0, 8).map((color, index) => (
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

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                OK
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
