/**
 * RemapColorsEffectPanel - Color remapping controls
 * 
 * Provides intuitive color remapping with automatic canvas color detection
 * and direct From/To color editing interface.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { useEffectsStore } from '../../../stores/effectsStore';
import { useCanvasStore } from '../../../stores/canvasStore';
import { ColorPickerOverlay } from '../ColorPickerOverlay';
import { RotateCcw, Eye, EyeOff, MoveRight, RotateCcwSquare } from 'lucide-react';

// Color utility functions
const hexToHsl = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  
  let h = 0;
  if (diff !== 0) {
    switch (max) {
      case r: h = ((g - b) / diff) % 6; break;
      case g: h = (b - r) / diff + 2; break;
      case b: h = (r - g) / diff + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  
  const l = (max + min) / 2;
  const s = diff === 0 ? 0 : diff / (1 - Math.abs(2 * l - 1));
  
  return [h, s, l];
};

const sortColorsByHueAndValue = (colors: string[]): string[] => {
  return colors.sort((a, b) => {
    // Handle transparent colors
    if (a === 'transparent') return 1;
    if (b === 'transparent') return -1;
    
    try {
      const [hueA, , lightA] = hexToHsl(a);
      const [hueB, , lightB] = hexToHsl(b);
      
      // Primary sort by hue
      if (Math.abs(hueA - hueB) > 1) {
        return hueA - hueB;
      }
      
      // Secondary sort by lightness (value)
      return lightA - lightB;
    } catch {
      // Fallback for invalid colors
      return a.localeCompare(b);
    }
  });
};

export function RemapColorsEffectPanel() {
  const { 
    remapColorsSettings,
    updateRemapColorsSettings,
    isPreviewActive,
    previewEffect,
    startPreview,
    stopPreview,
    updatePreview,
    getUniqueColors,
    analyzeCanvas,
    canvasAnalysis,
    isAnalyzing,
    clearAnalysisCache
  } = useEffectsStore();

  const { cells } = useCanvasStore();

  const isCurrentlyPreviewing = isPreviewActive && previewEffect === 'remap-colors';

  // Color picker state
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [colorPickerTarget, setColorPickerTarget] = useState<{ fromColor: string; triggerRef: React.RefObject<HTMLElement | null> | null }>({ fromColor: '', triggerRef: null });

  // Hex input states for direct editing
  const [hexInputs, setHexInputs] = useState<Record<string, string>>({});

  // Get all unique colors from canvas analysis, sorted by hue and value
  const allCanvasColors = useMemo(() => {
    // Only get colors if analysis is complete (not analyzing and has results)
    if (isAnalyzing || !canvasAnalysis) {
      return [];
    }
    const colors = getUniqueColors().filter(color => color !== 'transparent');
    return sortColorsByHueAndValue(colors);
  }, [getUniqueColors, isAnalyzing, canvasAnalysis]);

  // Auto-start preview when panel opens and analyze canvas
  useEffect(() => {
    // Clear cache and ensure fresh analysis every time panel opens
    clearAnalysisCache();
    analyzeCanvas();
    
    if (!isCurrentlyPreviewing) {
      startPreview('remap-colors');
    }
    
    // Cleanup on unmount
    return () => {
      if (isCurrentlyPreviewing) {
        stopPreview();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-analyze when canvas data changes (e.g., edits made outside the effect)
  useEffect(() => {
    // Clear cache and re-analyze when canvas cells change
    clearAnalysisCache();
    analyzeCanvas();
  }, [cells, clearAnalysisCache, analyzeCanvas]);

  // Initialize color mappings with identity mappings when canvas colors change
  useEffect(() => {
    // Only initialize if we have colors and analysis is complete
    if (allCanvasColors.length > 0 && !isAnalyzing) {
      const currentMappings = remapColorsSettings.colorMappings;
      const identityMappings: Record<string, string> = {};
      
      // Create identity mappings for all current canvas colors
      allCanvasColors.forEach(color => {
        // Preserve existing mapping if it exists, otherwise map to self
        identityMappings[color] = currentMappings[color] || color;
      });
      
      // Only update if the mappings have changed
      const currentKeys = Object.keys(currentMappings).sort();
      const newKeys = Object.keys(identityMappings).sort();
      const keysChanged = JSON.stringify(currentKeys) !== JSON.stringify(newKeys);
      
      if (keysChanged || Object.keys(currentMappings).length === 0) {
        updateRemapColorsSettings({
          colorMappings: identityMappings
        });
      }
    }
  }, [allCanvasColors, remapColorsSettings.colorMappings, updateRemapColorsSettings, isAnalyzing]);

  // Sync hex inputs with current mappings
  useEffect(() => {
    const currentMappings = remapColorsSettings.colorMappings;
    const newHexInputs: Record<string, string> = {};
    
    Object.entries(currentMappings).forEach(([fromColor, toColor]) => {
      newHexInputs[fromColor] = toColor;
    });
    
    setHexInputs(newHexInputs);
  }, [remapColorsSettings.colorMappings]);

  // Update preview when settings change
  useEffect(() => {
    if (isCurrentlyPreviewing) {
      updatePreview().catch(error => {
        console.error('Preview update failed:', error);
      });
    }
  }, [remapColorsSettings, isCurrentlyPreviewing, updatePreview]);

  // Update preview when canvas data changes (e.g., frame change)
  useEffect(() => {
    if (isCurrentlyPreviewing) {
      updatePreview().catch(error => {
        console.error('Preview update after canvas change failed:', error);
      });
    }
  }, [cells, isCurrentlyPreviewing, updatePreview]);

  // Toggle preview
  const handleTogglePreview = useCallback(() => {
    if (isCurrentlyPreviewing) {
      stopPreview();
    } else {
      startPreview('remap-colors');
    }
  }, [isCurrentlyPreviewing, startPreview, stopPreview]);

  // Reset all mappings to identity (colors map to themselves)
  const handleResetAllMappings = useCallback(() => {
    const identityMappings: Record<string, string> = {};
    allCanvasColors.forEach(color => {
      identityMappings[color] = color;
    });
    
    updateRemapColorsSettings({
      colorMappings: identityMappings
    });
  }, [allCanvasColors, updateRemapColorsSettings]);

  // Update a specific color mapping
  const handleColorMappingChange = useCallback((fromColor: string, toColor: string) => {
    const newMappings = {
      ...remapColorsSettings.colorMappings,
      [fromColor]: toColor
    };
    
    updateRemapColorsSettings({
      colorMappings: newMappings
    });
  }, [remapColorsSettings, updateRemapColorsSettings]);

  // Open color picker for a specific color
  const handleOpenColorPicker = useCallback((fromColor: string, _currentToColor: string, triggerRef: React.RefObject<HTMLElement | null>) => {
    setColorPickerTarget({ fromColor, triggerRef });
    setIsColorPickerOpen(true);
  }, []);

  // Handle color picker selection
  const handleColorPickerSelect = useCallback((newColor: string) => {
    if (colorPickerTarget.fromColor) {
      handleColorMappingChange(colorPickerTarget.fromColor, newColor);
      // Update hex input state
      setHexInputs(prev => ({ ...prev, [colorPickerTarget.fromColor]: newColor }));
    }
    setIsColorPickerOpen(false);
  }, [colorPickerTarget, handleColorMappingChange]);

  // Handle hex input change with sanitization
  const handleHexInputChange = useCallback((fromColor: string, value: string) => {
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
    
    // Update hex input state
    setHexInputs(prev => ({ ...prev, [fromColor]: sanitized }));
    
    // Only update color mapping if we have a valid 6-digit hex
    if (/^#[0-9A-F]{6}$/.test(sanitized)) {
      handleColorMappingChange(fromColor, sanitized);
    }
  }, [handleColorMappingChange]);

  // Reset individual color mapping
  const handleResetIndividualMapping = useCallback((fromColor: string) => {
    handleColorMappingChange(fromColor, fromColor);
    setHexInputs(prev => ({ ...prev, [fromColor]: fromColor }));
  }, [handleColorMappingChange]);

  // Get sorted color mappings
  const sortedColorMappings = useMemo(() => {
    const mappings = remapColorsSettings.colorMappings;
    const sortedColors = sortColorsByHueAndValue(Object.keys(mappings));
    return sortedColors.map(fromColor => ({
      fromColor,
      toColor: mappings[fromColor]
    }));
  }, [remapColorsSettings.colorMappings]);

  // Create refs for all color picker buttons (must be at top level)
  const colorPickerButtonRefs = useMemo(() => {
    const refs: Record<string, React.RefObject<HTMLButtonElement | null>> = {};
    sortedColorMappings.forEach(({ fromColor }) => {
      refs[fromColor] = { current: null };
    });
    return refs;
  }, [sortedColorMappings]);

  const mappingCount = Object.keys(remapColorsSettings.colorMappings).length;
  const hasIdenticalMappings = sortedColorMappings.every(({ fromColor, toColor }) => fromColor === toColor);

  return (
    <div className="space-y-4">

      {/* Live Preview Toggle */}
      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-800">
        <div className="space-y-1">
          <Label className="text-xs font-medium text-blue-900 dark:text-blue-100">Live Preview</Label>
          <div className="text-xs text-blue-700 dark:text-blue-300">
            {isCurrentlyPreviewing ? 'Changes are shown on canvas' : 'Preview is disabled'}
          </div>
        </div>
        <Button
          onClick={handleTogglePreview}
          variant={isCurrentlyPreviewing ? "default" : "outline"}
          size="sm"
          className="h-8 gap-1"
        >
          {isCurrentlyPreviewing ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {isCurrentlyPreviewing ? 'On' : 'Off'}
        </Button>
      </div>

      {/* Color Mappings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">
            Color Mappings ({mappingCount})
          </Label>
          <Button
            onClick={handleResetAllMappings}
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs gap-1"
            title="Reset all mappings to original colors"
            disabled={hasIdenticalMappings || isAnalyzing}
          >
            <RotateCcw className="w-3 h-3" />
            Reset All
          </Button>
        </div>
        
        {isAnalyzing ? (
          <div className="p-4 border border-dashed border-muted-foreground/50 rounded text-center text-xs text-muted-foreground">
            Analyzing canvas colors...
          </div>
        ) : mappingCount === 0 ? (
          <div className="p-4 border border-dashed border-muted-foreground/50 rounded text-center text-xs text-muted-foreground">
            No colors found in canvas. Add some colors to see mapping options.
          </div>
        ) : (
          <div className="space-y-1">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 text-xs font-medium text-muted-foreground pb-2">
              <div>From Color</div>
              <div></div>
              <div>To Color</div>
              <div></div>
            </div>
            
            {/* Color mapping rows */}
            {sortedColorMappings.map(({ fromColor, toColor }) => {
              const colorPickerButtonRef = colorPickerButtonRefs[fromColor];
              const currentHexInput = hexInputs[fromColor] || toColor;
              
              return (
                <div key={fromColor} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto_minmax(0,1fr)_auto] gap-0.5 items-center text-xs p-2 bg-background rounded border border-muted/30 hover:bg-muted/50 hover:border-muted/50 transition-colors">
                  {/* From Color Swatch */}
                  <button
                    className="w-6 h-6 rounded border border-muted/30 flex-shrink-0"
                    style={{ backgroundColor: fromColor }}
                    title={fromColor}
                    disabled
                  />
                  
                  {/* From Color Hex */}
                  <span className="font-mono text-[10px] text-muted-foreground truncate px-1">
                    {fromColor}
                  </span>
                  
                  {/* Arrow */}
                  <div className="flex justify-center px-1">
                    <MoveRight className="w-3 h-3 text-muted-foreground" />
                  </div>
                  
                  {/* To Color Swatch */}
                  <button
                    ref={colorPickerButtonRef}
                    onClick={() => handleOpenColorPicker(fromColor, toColor, colorPickerButtonRef)}
                    className="w-6 h-6 rounded border border-muted/30 flex-shrink-0 hover:border-muted/60 transition-colors cursor-pointer"
                    style={{ backgroundColor: toColor }}
                    title="Click to open color picker"
                  />
                  
                  {/* To Color Hex Input */}
                  <Input
                    type="text"
                    value={currentHexInput}
                    onChange={(e) => handleHexInputChange(fromColor, e.target.value)}
                    className="flex-1 h-6 text-[9px] font-mono min-w-0 mx-1 px-1"
                    placeholder="#ffffff"
                  />
                  
                  {/* Individual Reset Button */}
                  <div className="flex justify-center pl-1">
                    <Button
                      onClick={() => handleResetIndividualMapping(fromColor)}
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                      title="Reset this color mapping"
                      disabled={fromColor === toColor}
                    >
                      <RotateCcwSquare className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Color Picker Overlay */}
      <ColorPickerOverlay
        isOpen={isColorPickerOpen}
        onOpenChange={setIsColorPickerOpen}
        onColorSelect={handleColorPickerSelect}
        initialColor={colorPickerTarget.fromColor ? remapColorsSettings.colorMappings[colorPickerTarget.fromColor] || colorPickerTarget.fromColor : '#000000'}
        title="Select Target Color"
        triggerRef={colorPickerTarget.triggerRef || undefined}
        anchorPosition="bottom-left"
      />
      
    </div>
  );
}