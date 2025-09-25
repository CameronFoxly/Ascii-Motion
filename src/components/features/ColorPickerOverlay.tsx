// Advanced color picker overlay with improved HSV/RGB/HEX controls and interactive color wheel

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
  onColorChange?: (color: string) => void; // For real-time updates
  initialColor?: string;
  title?: string;
  showTransparentOption?: boolean; // whether to show the transparent quick-set button
  triggerRef?: React.RefObject<HTMLElement | null>; // Reference to trigger element for positioning
  anchorPosition?: 'left-slide' | 'right-slide' | 'bottom-left' | 'bottom-right' | 'gradient-panel';
}

export const ColorPickerOverlay: React.FC<ColorPickerOverlayProps> = ({
  isOpen,
  onOpenChange,
  onColorSelect,
  onColorChange,
  initialColor = '#000000',
  title = 'Color Picker',
  showTransparentOption = false,
  triggerRef,
  anchorPosition = 'left-slide'
}) => {
  const { updatePreviewColor, addRecentColor, recentColors } = usePaletteStore();
  const pickerRef = useRef<HTMLDivElement>(null);
  const previousColorRef = useRef<string | null>(null);

  // Check if initial color is transparent
  const isTransparent = initialColor === 'transparent' || initialColor === ANSI_COLORS.transparent;
  
  // Color state in different formats
  const [currentColor, setCurrentColor] = useState(initialColor);
  const [previewColor, setPreviewColor] = useState(isTransparent ? 'transparent' : initialColor);
  const [hexInput, setHexInput] = useState(isTransparent ? '' : initialColor);
  const [rgbValues, setRgbValues] = useState<RGBColor>({ r: 0, g: 0, b: 0 });
  // Initialize HSV values from the initial color
  const getInitialHSV = () => {
    if (initialColor === 'transparent' || initialColor === ANSI_COLORS.transparent) {
      return { h: 0, s: 0, v: 0 };
    }
    const hsv = hexToHsv(normalizeHexColor(initialColor));
    return hsv || { h: 120, s: 100, v: 80 }; // Default to green if parsing fails
  };
  
  const [hsvValues, setHsvValues] = useState<HSVColor>(getInitialHSV());
  const [colorWheelPosition, setColorWheelPosition] = useState({ x: 80, y: 80 }); // Center of 160px wheel
  const [valueSliderValue, setValueSliderValue] = useState(() => {
    if (initialColor === 'transparent' || initialColor === ANSI_COLORS.transparent) {
      return 0;
    }
    const hsv = hexToHsv(normalizeHexColor(initialColor));
    return hsv ? hsv.v : 80; // Default to 80% if parsing fails
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isTransparentColor, setIsTransparentColor] = useState(isTransparent);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  const colorWheelRef = useRef<HTMLDivElement>(null);
  // Ref for hex input to auto-focus on open
  const hexInputRef = useRef<HTMLInputElement | null>(null);

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
        setColorWheelPosition({ x: 80, y: 80 });
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
      
      // Mark as initialized after setting all values
      setTimeout(() => setHasInitialized(true), 0);
    } else {
      setHasInitialized(false);
    }
  }, [isOpen, initialColor]);

  // Update preview color in store
  useEffect(() => {
    updatePreviewColor(previewColor);
  }, [previewColor, updatePreviewColor]);

  // Auto-focus and select hex input when dialog opens (if not transparent)
  useEffect(() => {
    if (isOpen) {
      // Use rAF to ensure the input is mounted after dialog animation/layout
      requestAnimationFrame(() => {
        if (hexInputRef.current && !isTransparentColor) {
          hexInputRef.current.focus();
          // Select existing content for quick replacement/paste
          hexInputRef.current.select();
        }
      });
    }
  }, [isOpen, isTransparentColor]);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        triggerRef?.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onOpenChange(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onOpenChange, triggerRef]);

  // Close picker on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onOpenChange(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onOpenChange]);

  // Position calculation
  const getPickerPosition = () => {
    const pickerWidth = 400;
    const pickerHeight = 600;
    
    // Special handling for gradient panel
    if (anchorPosition === 'gradient-panel') {
      // Center the picker vertically in the viewport
      const viewportHeight = window.innerHeight;
      const top = Math.max(8, (viewportHeight - pickerHeight) / 2 + window.scrollY);
      
      // Position to the left of the gradient panel (which is 320px wide and on the right side)
      const gradientPanelWidth = 320;
      const left = window.innerWidth - gradientPanelWidth - pickerWidth - 16; // 16px gap
      
      return {
        top,
        left: Math.max(8, left), // Ensure it doesn't go off-screen
        right: 'auto'
      };
    }
    
    // For other anchor positions, we need a triggerRef
    if (!triggerRef?.current) return { top: 100, left: 100 };
    
    const triggerRect = triggerRef.current.getBoundingClientRect();
    
    // Center the picker vertically in the viewport for other cases
    const viewportHeight = window.innerHeight;
    const top = Math.max(8, (viewportHeight - pickerHeight) / 2 + window.scrollY);
    
    if (anchorPosition === 'left-slide') {
      // Slide out from the left side of the trigger, but center vertically
      let right = window.innerWidth - triggerRect.left + 8; // 8px gap from trigger
      
      return {
        top,
        right,
        left: 'auto'
      };
    } else if (anchorPosition === 'right-slide') {
      // Slide out from the right side of the trigger, but center vertically
      let left = triggerRect.right + 8; // 8px gap from trigger
      
      // Ensure picker doesn't go off-screen horizontally
      if (left + pickerWidth > window.innerWidth) {
        left = window.innerWidth - pickerWidth - 8;
      }
      
      return {
        top,
        left,
        right: 'auto'
      };
    } else {
      // Default left-slide behavior with vertical centering
      return {
        top,
        right: window.innerWidth - triggerRect.left + 8,
        left: 'auto'
      };
    }
  };

  // Trigger real-time updates when color values change
  useEffect(() => {
    // Update preview color and trigger real-time callbacks when values change
    if (hasInitialized && isOpen) {
      let newColor: string;
      if (isTransparentColor) {
        newColor = 'transparent';
      } else {
        newColor = hsvToHex(hsvValues);
      }
      
      setPreviewColor(newColor);
      
      // Trigger real-time update if callback is provided and color actually changed
      // Using ref to track changes prevents circular dependencies in useEffect deps
      // while ensuring we only fire callbacks when the color genuinely changes
      if (onColorChange && newColor !== previousColorRef.current) {
        previousColorRef.current = newColor;
        const timeoutId = setTimeout(() => {
          onColorChange(newColor);
        }, 50); // 50ms debounce to prevent excessive calls during rapid changes
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [hsvValues, isTransparentColor, hasInitialized, isOpen, onColorChange]);

  // Update color wheel position based on HSV values
  const updateColorWheelPosition = useCallback((hsv: HSVColor) => {
    const centerX = 80; // Half of 160px wheel
    const centerY = 80;
    const maxRadius = 72; // Slightly less than 80 to stay within bounds
    const angle = (hsv.h * Math.PI) / 180;
    const radius = (hsv.s / 100) * maxRadius;
    // Round to mitigate sub-pixel oscillation that can cause jitter when React recalculates layout
    const x = +(centerX + radius * Math.cos(angle)).toFixed(2);
    const y = +(centerY + radius * Math.sin(angle)).toFixed(2);
    setColorWheelPosition({ x, y });
  }, []);

  // Color update handlers
  const updateFromHex = useCallback((hex: string) => {
    const normalizedHex = normalizeHexColor(hex);
    const rgb = hexToRgb(normalizedHex);
    const hsv = hexToHsv(normalizedHex);
    
    if (rgb && hsv) {
      setPreviewColor(normalizedHex);
      setHexInput(normalizedHex);
      setRgbValues(rgb);
      setHsvValues(hsv);
      setValueSliderValue(hsv.v);
      updateColorWheelPosition(hsv);
      setIsTransparentColor(false);
      
      // Trigger real-time update
      if (onColorChange) {
        onColorChange(normalizedHex);
      }
    }
  }, [updateColorWheelPosition, onColorChange]);

  const updateFromRgb = useCallback((rgb: RGBColor) => {
    const hex = rgbToHex(rgb);
    const hsv = rgbToHsv(rgb);
    
    setPreviewColor(hex);
    setHexInput(hex);
    setHsvValues(hsv);
    setValueSliderValue(hsv.v);
    updateColorWheelPosition(hsv);
    setIsTransparentColor(false);
    
    // Trigger real-time update
    if (onColorChange) {
      onColorChange(hex);
    }
  }, [updateColorWheelPosition, onColorChange]);

  const updateFromHsv = useCallback((hsv: HSVColor, skipWheelPosition: boolean = false) => {
    const rgb = hsvToRgb(hsv);
    const hex = hsvToHex(hsv);
    setPreviewColor(hex);
    setHexInput(hex);
    setRgbValues(rgb);
    setValueSliderValue(hsv.v);
    if (!skipWheelPosition) {
      updateColorWheelPosition(hsv);
    }
    setIsTransparentColor(false);
    
    // Trigger real-time update
    if (onColorChange) {
      onColorChange(hex);
    }
  }, [updateColorWheelPosition, onColorChange]);

  // Handle hex input change with live sanitization
  const handleHexChange = (value: string) => {
    // Remove any non-hex characters and convert to uppercase
    let sanitized = value.replace(/[^#0-9A-Fa-f]/g, '').toUpperCase();
    
    // Ensure it starts with # and limit length
    if (!sanitized.startsWith('#')) {
      sanitized = '#' + sanitized.replace(/#/g, ''); // Remove any # that's not at the start
    }
    
    // Limit to 7 characters max (#FFFFFF)
    if (sanitized.length > 7) {
      sanitized = sanitized.slice(0, 7);
    }
    
    setHexInput(sanitized);
    
    // Only update color if we have a valid 6-digit hex
    if (/^#[0-9A-F]{6}$/.test(sanitized)) {
      updateFromHex(sanitized);
    }
  };

  // Handle RGB slider changes
  const handleRgbChange = (component: 'r' | 'g' | 'b', value: number) => {
    if (isTransparentColor) {
      // Wake from transparent mode
      setIsTransparentColor(false);
    }
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
    if (isTransparentColor) {
      setIsTransparentColor(false);
    }
    const roundedValue = component === 'h' ? Math.round(value * 100) / 100 : Math.round(value);
    const newHsv = { ...hsvValues, [component]: roundedValue };
    setHsvValues(newHsv);
    updateFromHsv(newHsv, component === 'v');
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
    if (isTransparentColor) {
      setIsTransparentColor(false);
    }
    const newHsv = { ...hsvValues, v: value };
    setHsvValues(newHsv);
    setValueSliderValue(value);
    updateFromHsv(newHsv, true);
  };

  // Color wheel interaction with drag support
  const handleColorWheelInteraction = (event: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    if (!colorWheelRef.current) return;
    if (isTransparentColor) {
      setIsTransparentColor(false);
    }
    
    const rect = colorWheelRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = (event.clientX - rect.left) - centerX;
    const y = (event.clientY - rect.top) - centerY;
    
    const distance = Math.sqrt(x * x + y * y);
    const maxDistance = Math.min(centerX, centerY) - 10;
    
    // Always calculate the angle for hue
    let angle = Math.atan2(y, x);
    angle = (angle * 180 / Math.PI + 360) % 360; // Convert to 0-360 degrees
    
    // Calculate saturation based on distance, but clamp to maximum when outside
    let saturation: number;
    let displayX: number;
    let displayY: number;
    
    if (distance <= maxDistance) {
      // Inside circle - normal behavior
      saturation = (distance / maxDistance) * 100;
      displayX = centerX + x;
      displayY = centerY + y;
    } else {
      // Outside circle - snap to edge with full saturation
      saturation = 100;
      
      // Calculate position on the edge of the circle
      const edgeX = Math.cos(angle * Math.PI / 180) * maxDistance;
      const edgeY = Math.sin(angle * Math.PI / 180) * maxDistance;
      displayX = centerX + edgeX;
      displayY = centerY + edgeY;
    }
    
    const newHsv = { ...hsvValues, h: angle, s: saturation };
    setHsvValues(newHsv);
    updateFromHsv(newHsv);
    
    // Update position for visual feedback
    setColorWheelPosition({ x: displayX, y: displayY });
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
    if (currentColor === 'transparent' || currentColor === ANSI_COLORS.transparent) {
      setIsTransparentColor(true);
      setPreviewColor('transparent');
      setHexInput('');
      setRgbValues({ r: 0, g: 0, b: 0 });
      setHsvValues({ h: 0, s: 0, v: 0 });
      setValueSliderValue(0);
      setColorWheelPosition({ x: 80, y: 80 });
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

  // Set preview state to transparent (without committing until confirm)
  const handleSetTransparent = () => {
    setIsTransparentColor(true);
    setPreviewColor('transparent');
    setHexInput('');
    setRgbValues({ r: 0, g: 0, b: 0 });
    setHsvValues({ h: 0, s: 0, v: 0 });
    setValueSliderValue(0);
    setColorWheelPosition({ x: 80, y: 80 });
  };

  // Create canvas-based HSV color wheel
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Generate base HSV color wheel once (at full brightness)
  const renderingRef = useRef(false);
  const baseRendered = useRef(false);
  // Cache original wheel pixel data at V=100 for brightness adjustments
  const baseImageDataRef = useRef<ImageData | null>(null);
  const lastAppliedValueRef = useRef<number | null>(null);
  const dprRef = useRef<number>(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
  
  useEffect(() => {
    if (!isOpen || !hasInitialized || baseRendered.current) return;
    
    const canvas = canvasRef.current;
    if (!canvas || renderingRef.current) return;
    
    renderingRef.current = true;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      renderingRef.current = false;
      return;
    }
      
      const logicalSize = 160; // CSS pixels
      const dpr = dprRef.current;
      const size = Math.round(logicalSize * dpr); // backing store size
      const center = size / 2;
      const radius = center - 4 * dpr; // scale border inset with DPR
      
      // Set dimensions only once to prevent layout recalculation
      if (canvas.width !== size || canvas.height !== size) {
        canvas.style.width = `${logicalSize}px`;
        canvas.style.height = `${logicalSize}px`;
        canvas.width = size;
        canvas.height = size;
      }
      
      // Enable canvas smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.setTransform(1,0,0,1,0,0); // reset
      ctx.scale(dpr, dpr); // scale drawing operations to logical pixels
      
      const imageData = ctx.createImageData(size, size); // we draw in backing pixel space manually
      const data = imageData.data;
      
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dx = x - center;
          const dy = y - center;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance <= radius) {
            // Calculate hue from angle
            let angle = Math.atan2(dy, dx);
            angle = (angle * 180 / Math.PI + 360) % 360;
            
            // Calculate saturation from distance
            const saturation = Math.min(100, (distance / radius) * 100);
            
          // Use full brightness for base canvas
          const rgb = hsvToRgb({ h: angle, s: saturation, v: 100 });            // Anti-aliasing for smooth edges
            let alpha = 255;
            if (distance > radius - 1) {
              alpha = Math.round(255 * (radius - distance));
            }
            
            const index = (y * size + x) * 4;
            data[index] = rgb.r;
            data[index + 1] = rgb.g;
            data[index + 2] = rgb.b;
            data[index + 3] = alpha;
          } else {
            // Outside circle - transparent
            const index = (y * size + x) * 4;
            data[index + 3] = 0;
          }
        }
      }
      
    ctx.putImageData(imageData, 0, 0);
    baseImageDataRef.current = imageData; // store base pixels
    baseRendered.current = true;
    lastAppliedValueRef.current = 100; // initial brightness
    renderingRef.current = false;
  }, [isOpen, hasInitialized]);
  
  // Reset base canvas when dialog closes
  useEffect(() => {
    if (!isOpen) {
      baseRendered.current = false;
    }
  }, [isOpen]);

  // Re-render brightness when V changes without shifting underlying wheel pixels
  useEffect(() => {
    if (!isOpen || !baseRendered.current) return;
    if (lastAppliedValueRef.current === valueSliderValue) return; // no change
    const canvas = canvasRef.current;
    const base = baseImageDataRef.current;
    if (!canvas || !base) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Create a copy to avoid mutating the base reference
    const copy = ctx.createImageData(base.width, base.height);
    const src = base.data;
    const dst = copy.data;
    const factor = valueSliderValue / 100; // linear scale
    for (let i = 0; i < src.length; i += 4) {
      dst[i] = Math.round(src[i] * factor);
      dst[i + 1] = Math.round(src[i + 1] * factor);
      dst[i + 2] = Math.round(src[i + 2] * factor);
      dst[i + 3] = src[i + 3]; // preserve alpha
    }
    ctx.putImageData(copy, 0, 0);
    lastAppliedValueRef.current = valueSliderValue;
  }, [valueSliderValue, isOpen]);

  if (!isOpen) return null;

  const position = getPickerPosition();

  return createPortal(
    <div
      ref={pickerRef}
      className={`fixed z-[99999] animate-in duration-200 ${
        anchorPosition === 'right-slide' ? 'slide-in-from-left-2 fade-in-0' : 
        anchorPosition === 'gradient-panel' ? 'slide-in-from-right-2 fade-in-0' : 'slide-in-from-right-2 fade-in-0'
      }`}
      style={{
        top: position.top,
        right: position.right !== 'auto' ? position.right : undefined,
        left: position.left !== 'auto' ? position.left : undefined,
        maxWidth: '400px',
        width: '400px'
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <Card className="border border-border/50 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">{/* Color Preview */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className="flex h-8 border border-border rounded overflow-hidden">
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
          <div className="space-y-1">
            <div className="flex justify-center items-start gap-4">
              {/* Color Wheel */}
              <div 
                ref={colorWheelRef}
                className="rounded-full border border-border cursor-crosshair relative select-none overflow-hidden"
                onMouseDown={handleColorWheelMouseDown}
                style={{ 
                  width: '160px',
                  height: '160px',
                  clipPath: 'circle(50% at 50% 50%)',
                  borderRadius: '50%',
                  flexShrink: 0,
                  contain: 'layout style paint',
                  willChange: 'contents',
                  transform: 'translateZ(0)' // Force hardware acceleration
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={160}
                  height={160}
                  style={{ 
                    width: '160px',
                    height: '160px',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    display: 'block',
                    backfaceVisibility: 'hidden'
                  }}
                />
                <div 
                  className="absolute w-3 h-3 bg-white border-2 border-black rounded-full transform -translate-x-1.5 -translate-y-1.5 pointer-events-none"
                  style={{
                    left: Math.round(colorWheelPosition.x),
                    top: Math.round(colorWheelPosition.y)
                  }}
                />
              </div>
              
              {/* Value Slider - Vertical */}
              <div className="flex flex-col items-center gap-2 ml-4 select-none w-12 flex-shrink-0">
                <Label className="text-xs font-medium select-none">V</Label>
                <div className="relative h-32 w-4 flex items-center justify-center select-none">
                  {/* Custom vertical slider track */}
                  <div className="absolute h-32 w-1 bg-muted rounded-full"></div>
                  {/* Slider handle */}
                  <div 
                    className="absolute w-3 h-3 bg-primary rounded-full cursor-pointer shadow-sm border border-background z-10"
                    style={{
                      top: `${((100 - valueSliderValue) / 100) * 128 - 6}px`,
                      left: '50%',
                      transform: 'translateX(-50%)'
                    }}
                    onMouseDown={(e) => {
                      // Wake from transparent mode if needed
                      if (isTransparentColor) {
                        setIsTransparentColor(false);
                      }
                      e.preventDefault(); // Prevent text selection
                      e.stopPropagation(); // Prevent track click handler
                      
                      const startY = e.clientY;
                      const startValue = valueSliderValue;
                      
                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        const deltaY = moveEvent.clientY - startY;
                        const newValue = Math.max(0, Math.min(100, startValue - (deltaY / 128) * 100));
                        handleValueSliderChange(newValue);
                      };
                      
                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  />
                  {/* Click on track to set value */}
                  <div 
                    className="absolute inset-0 cursor-pointer select-none"
                    onMouseDown={(e) => {
                      if (isTransparentColor) {
                        setIsTransparentColor(false);
                      }
                      e.preventDefault(); // Prevent text selection
                      
                      const rect = e.currentTarget.getBoundingClientRect();
                      const y = e.clientY - rect.top;
                      const newValue = Math.max(0, Math.min(100, 100 - (y / rect.height) * 100));
                      handleValueSliderChange(newValue);
                      
                      // Start dragging from track click
                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        const moveY = moveEvent.clientY - rect.top;
                        const moveValue = Math.max(0, Math.min(100, 100 - (moveY / rect.height) * 100));
                        handleValueSliderChange(moveValue);
                      };
                      
                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  />
                </div>
                <span 
                  className="text-xs text-muted-foreground inline-block text-center"
                  style={{ width: '100%', fontVariantNumeric: 'tabular-nums' }}
                >
                  {isTransparentColor ? '-' : `${Math.round(valueSliderValue)}%`}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* HSV Controls */}
          <div className="space-y-2">
            {/* Hue */}
            <div className="flex items-center gap-1.5">
                <Label className="w-3 text-xs">H</Label>
              <Slider
                value={hsvValues.h}
                onValueChange={(value) => handleHsvChange('h', value)}
                max={360}
                step={0.1}
                className="flex-1"
              />
              <Input
                value={hsvValues.h.toFixed(2)}
                onChange={(e) => handleHsvInputChange('h', e.target.value)}
                className="w-16 h-7 text-xs select-text"
              />
              <span className="text-xs text-muted-foreground w-2">°</span>
            </div>
            
            {/* Saturation */}
            <div className="flex items-center gap-1.5">
              <Label className="w-3 text-xs">S</Label>
              <Slider
                value={hsvValues.s}
                onValueChange={(value) => handleHsvChange('s', value)}
                max={100}
                step={1}
                className="flex-1"
              />
              <Input
                value={Math.round(hsvValues.s).toString()}
                onChange={(e) => handleHsvInputChange('s', e.target.value)}
                className="w-16 h-7 text-xs"
              />
              <span className="text-xs text-muted-foreground w-2">%</span>
            </div>
            
            {/* Value */}
            <div className="flex items-center gap-1.5">
              <Label className="w-3 text-xs">V</Label>
              <Slider
                value={hsvValues.v}
                onValueChange={(value) => handleHsvChange('v', value)}
                max={100}
                step={1}
                className="flex-1"
              />
              <Input
                value={Math.round(hsvValues.v).toString()}
                onChange={(e) => handleHsvInputChange('v', e.target.value)}
                className="w-16 h-7 text-xs"
              />
              <span className="text-xs text-muted-foreground w-2">%</span>
            </div>
          </div>

          <Separator />

          {/* RGB Controls */}
          <div className="space-y-2">
            {/* Red */}
            <div className="flex items-center gap-1.5">
              <Label className="w-3 text-xs">R</Label>
              <Slider
                value={rgbValues.r}
                onValueChange={(value) => handleRgbChange('r', value)}
                max={255}
                step={1}
                className="flex-1"
              />
              <Input
                value={rgbValues.r.toString()}
                onChange={(e) => handleRgbInputChange('r', e.target.value)}
                className="w-14 h-7 text-xs"
              />
            </div>
            
            {/* Green */}
            <div className="flex items-center gap-1.5">
              <Label className="w-3 text-xs">G</Label>
              <Slider
                value={rgbValues.g}
                onValueChange={(value) => handleRgbChange('g', value)}
                max={255}
                step={1}
                className="flex-1"
              />
              <Input
                value={rgbValues.g.toString()}
                onChange={(e) => handleRgbInputChange('g', e.target.value)}
                className="w-14 h-7 text-xs"
              />
            </div>
            
            {/* Blue */}
            <div className="flex items-center gap-1.5">
              <Label className="w-3 text-xs">B</Label>
              <Slider
                value={rgbValues.b}
                onValueChange={(value) => handleRgbChange('b', value)}
                max={255}
                step={1}
                className="flex-1"
              />
              <Input
                value={rgbValues.b.toString()}
                onChange={(e) => handleRgbInputChange('b', e.target.value)}
                className="w-14 h-7 text-xs"
              />
            </div>
          </div>

          <Separator />

          {/* Hex Input (and optional Transparent Button) */}
          <div className={`flex items-center ${showTransparentOption ? 'gap-2' : ''}`}>
            <Input
              ref={hexInputRef}
              value={hexInput}
              onChange={(e) => {
                if (isTransparentColor) {
                  setIsTransparentColor(false);
                }
                handleHexChange(e.target.value);
              }}
              placeholder={isTransparentColor ? 'Transparent' : '#000000'}
              className={`font-mono h-7 text-xs ${showTransparentOption ? 'flex-1' : 'w-full'}`}
            />
            {showTransparentOption && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSetTransparent}
                title="Set Transparent"
                aria-label="Set Transparent"
                className={`h-7 w-7 p-0 overflow-hidden ${isTransparentColor ? 'ring-2 ring-primary ring-offset-1' : ''}`}
              >
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
              </Button>
            )}
          </div>

          {/* Recent Colors */}
          {recentColors.length > 0 && (
            <div className="space-y-1">
              <Label className="text-sm font-medium">Recent Colors</Label>
              <div className="flex gap-1 flex-wrap">
                {recentColors.slice(0, 10).map((color, index) => (
                  <button
                    key={index}
                    className="w-5 h-5 rounded border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => handleRecentColorSelect(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}

        {/* Dialog Footer */} 
        <div className="flex justify-between pt-3">
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
        </CardContent>
      </Card>
    </div>,
    document.body
  );
};
