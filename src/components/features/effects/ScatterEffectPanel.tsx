/**
 * ScatterEffectPanel - Scatter effect controls for the Effects system
 * 
 * Provides controls for randomly scattering ASCII characters on the canvas
 * with customizable patterns and deterministic seeding.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { Slider } from '../../ui/slider';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { useEffectsStore } from '../../../stores/effectsStore';
import { useCanvasStore } from '../../../stores/canvasStore';
import { RotateCcw, Eye, EyeOff, Shuffle } from 'lucide-react';

// Debounce utility for preview updates
function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function ScatterEffectPanel() {
  const { 
    scatterSettings,
    updateScatterSettings,
    resetEffectSettings,
    isPreviewActive,
    previewEffect,
    startPreview,
    stopPreview,
    updatePreview
  } = useEffectsStore();

  const { cells } = useCanvasStore();

  const isCurrentlyPreviewing = isPreviewActive && previewEffect === 'scatter';

  // Auto-start preview when panel opens
  useEffect(() => {
    if (!isCurrentlyPreviewing) {
      startPreview('scatter');
    }
    
    // Cleanup on unmount
    return () => {
      if (isCurrentlyPreviewing) {
        stopPreview();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced preview update (300ms delay for performance)
  const debouncedUpdatePreview = useMemo(
    () => debounce(() => {
      if (isCurrentlyPreviewing) {
        updatePreview().catch(error => {
          console.error('Preview update failed:', error);
        });
      }
    }, 300),
    [isCurrentlyPreviewing, updatePreview]
  );

  // Update preview when settings change (debounced)
  useEffect(() => {
    if (isCurrentlyPreviewing) {
      debouncedUpdatePreview();
    }
  }, [scatterSettings, isCurrentlyPreviewing, debouncedUpdatePreview]);

  // Update preview when canvas data changes (e.g., frame change)
  useEffect(() => {
    if (isCurrentlyPreviewing) {
      updatePreview().catch(error => {
        console.error('Preview update after canvas change failed:', error);
      });
    }
  }, [cells, isCurrentlyPreviewing, updatePreview]);

  // Reset to default values
  const handleReset = useCallback(() => {
    resetEffectSettings('scatter');
  }, [resetEffectSettings]);

  // Toggle preview
  const handleTogglePreview = useCallback(() => {
    if (isCurrentlyPreviewing) {
      stopPreview();
    } else {
      startPreview('scatter');
    }
  }, [isCurrentlyPreviewing, startPreview, stopPreview]);

  // Handle strength slider change
  const handleStrengthChange = useCallback((value: number) => {
    updateScatterSettings({ strength: value });
  }, [updateScatterSettings]);

  // Handle scatter type change
  const handleScatterTypeChange = useCallback((value: string) => {
    updateScatterSettings({ 
      scatterType: value as 'noise' | 'bayer-2x2' | 'bayer-4x4' | 'gaussian'
    });
  }, [updateScatterSettings]);

  // Handle seed input change (limit to 4 digits: 0-9999)
  const handleSeedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 0 && value <= 9999) {
      updateScatterSettings({ seed: value });
    }
  }, [updateScatterSettings]);

  // Generate new random seed (4 digits: 0-9999)
  const handleRandomizeSeed = useCallback(() => {
    const randomSeed = Math.floor(Math.random() * 10000);
    updateScatterSettings({ seed: randomSeed });
  }, [updateScatterSettings]);

  // Check if current scatter type uses random seed
  const usesSeed = scatterSettings.scatterType === 'noise' || scatterSettings.scatterType === 'gaussian';

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
      
      {/* Scatter Controls Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Scatter Settings</Label>
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
        
        {/* Strength Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="scatter-strength" className="text-xs">
              Strength
            </Label>
            <span className="text-xs text-muted-foreground">
              {scatterSettings.strength}
            </span>
          </div>
          <Slider
            id="scatter-strength"
            min={0}
            max={100}
            step={1}
            value={scatterSettings.strength}
            onValueChange={handleStrengthChange}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>No Scatter</span>
            <span>Max (10 cells)</span>
          </div>
        </div>

        {/* Scatter Type Select */}
        <div className="space-y-2">
          <Label htmlFor="scatter-type" className="text-xs">
            Scatter Pattern
          </Label>
          <Select
            value={scatterSettings.scatterType}
            onValueChange={handleScatterTypeChange}
          >
            <SelectTrigger id="scatter-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="noise">Noise (Random Smooth)</SelectItem>
              <SelectItem value="bayer-2x2">Bayer 2×2 (Ordered Pattern)</SelectItem>
              <SelectItem value="bayer-4x4">Bayer 4×4 (Detailed Pattern)</SelectItem>
              <SelectItem value="gaussian">Gaussian (Natural Distribution)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Seed Input (only for Noise and Gaussian patterns) */}
        {usesSeed && (
          <div className="space-y-2">
            <Label htmlFor="scatter-seed" className="text-xs">
              Random Seed
            </Label>
            <div className="flex gap-2">
              <Input
                id="scatter-seed"
                type="number"
                min={0}
                max={9999}
                value={scatterSettings.seed}
                onChange={handleSeedChange}
                className="flex-1"
              />
              <Button
                onClick={handleRandomizeSeed}
                variant="outline"
                size="sm"
                className="h-9 px-3"
                title="Generate new random seed"
              >
                <Shuffle className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Seed value (0-9999) produces consistent scatter patterns
            </p>
          </div>
        )}
      </div>

      {/* Pattern Descriptions */}
      <div className="bg-muted/50 rounded p-3 text-xs space-y-2">
        <div className="font-medium">Pattern Types:</div>
        <div className="text-muted-foreground space-y-1">
          <div><strong>Noise:</strong> Smooth, random displacement (uses seed)</div>
          <div><strong>Bayer 2×2:</strong> Ordered dithering with 4-point grid (position-based)</div>
          <div><strong>Bayer 4×4:</strong> Detailed ordered pattern with 16-point grid (position-based)</div>
          <div><strong>Gaussian:</strong> Natural bell-curve distribution (uses seed)</div>
        </div>
      </div>
    </div>
  );
}
