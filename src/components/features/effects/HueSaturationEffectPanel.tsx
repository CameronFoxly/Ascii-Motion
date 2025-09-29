/**
 * HueSaturationEffectPanel - Hue & Saturation adjustment controls
 * 
 * Provides controls for adjusting hue, saturation, and lightness
 * of ASCII art colors with optional color range targeting.
 */

import { useCallback, useEffect } from 'react';
import { Slider } from '../../ui/slider';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { useEffectsStore } from '../../../stores/effectsStore';
import { RotateCcw, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../../lib/utils';

export function HueSaturationEffectPanel() {
  const { 
    hueSaturationSettings,
    updateHueSaturationSettings,
    resetEffectSettings,
    canvasAnalysis,
    isPreviewActive,
    previewEffect,
    startPreview,
    stopPreview,
    updatePreview
  } = useEffectsStore();

  const isCurrentlyPreviewing = isPreviewActive && previewEffect === 'hue-saturation';

  // Auto-start preview when panel opens
  useEffect(() => {
    if (!isCurrentlyPreviewing) {
      startPreview('hue-saturation');
    }
    
    // Cleanup on unmount
    return () => {
      if (isCurrentlyPreviewing) {
        stopPreview();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update preview when settings change
  useEffect(() => {
    if (isCurrentlyPreviewing) {
      updatePreview().catch(error => {
        console.error('Preview update failed:', error);
      });
    }
  }, [hueSaturationSettings, isCurrentlyPreviewing, updatePreview]);

  // Reset to default values
  const handleReset = useCallback(() => {
    resetEffectSettings('hue-saturation');
  }, [resetEffectSettings]);

  // Toggle preview
  const handleTogglePreview = useCallback(() => {
    if (isCurrentlyPreviewing) {
      stopPreview();
    } else {
      startPreview('hue-saturation');
    }
  }, [isCurrentlyPreviewing, startPreview, stopPreview]);

  // Handle slider changes
  const handleHueChange = useCallback((value: number) => {
    updateHueSaturationSettings({ hue: value });
  }, [updateHueSaturationSettings]);

  const handleSaturationChange = useCallback((value: number) => {
    updateHueSaturationSettings({ saturation: value });
  }, [updateHueSaturationSettings]);

  const handleLightnessChange = useCallback((value: number) => {
    updateHueSaturationSettings({ lightness: value });
  }, [updateHueSaturationSettings]);

  // Color analysis preview
  const colorCount = canvasAnalysis?.uniqueColors?.length || 0;

  return (
    <div className="space-y-4">
      
      {/* Color Analysis Summary */}
      {canvasAnalysis && (
        <div className="bg-muted/50 rounded p-3 text-xs space-y-1">
          <div className="font-medium">Color Analysis:</div>
          <div className="text-muted-foreground">
            {colorCount} unique colors will be adjusted
          </div>
        </div>
      )}
      
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
      
      {/* Hue, Saturation, Lightness Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Color Adjustments</Label>
          <Button
            onClick={handleReset}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            title="Reset to defaults"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>
        
        {/* Hue Shift */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <Label>Hue</Label>
            <span className="text-muted-foreground">{hueSaturationSettings.hue}°</span>
          </div>
          <Slider
            value={hueSaturationSettings.hue}
            onValueChange={handleHueChange}
            min={-180}
            max={180}
            step={1}
            className={cn(
              "w-full",
              hueSaturationSettings.hue !== 0 && "opacity-90"
            )}
          />
          <div className="text-xs text-muted-foreground">
            Rotate hue around the color wheel (-180° to +180°)
          </div>
        </div>
        
        {/* Saturation */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <Label>Saturation</Label>
            <span className="text-muted-foreground">{hueSaturationSettings.saturation > 0 ? '+' : ''}{hueSaturationSettings.saturation}%</span>
          </div>
          <Slider
            value={hueSaturationSettings.saturation}
            onValueChange={handleSaturationChange}
            min={-100}
            max={100}
            step={5}
            className={cn(
              "w-full",
              hueSaturationSettings.saturation !== 0 && "opacity-90"
            )}
          />
          <div className="text-xs text-muted-foreground">
            Increase or decrease color intensity (-100% to +100%)
          </div>
        </div>
        
        {/* Lightness */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <Label>Lightness</Label>
            <span className="text-muted-foreground">{hueSaturationSettings.lightness > 0 ? '+' : ''}{hueSaturationSettings.lightness}%</span>
          </div>
          <Slider
            value={hueSaturationSettings.lightness}
            onValueChange={handleLightnessChange}
            min={-100}
            max={100}
            step={5}
            className={cn(
              "w-full",
              hueSaturationSettings.lightness !== 0 && "opacity-90"
            )}
          />
          <div className="text-xs text-muted-foreground">
            Shift brightness up or down (-100% to +100%)
          </div>
        </div>
      </div>
      
      {/* Preview Hint */}
      <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded p-2 text-xs">
        <div className="text-blue-800 dark:text-blue-200">
          💡 <strong>Tip:</strong> Use hue shift to change color themes,
          adjust saturation to make colors more or less vivid.
        </div>
      </div>
      
    </div>
  );
}