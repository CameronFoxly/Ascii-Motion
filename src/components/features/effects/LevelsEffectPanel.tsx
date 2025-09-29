/**
 * LevelsEffectPanel - Levels adjustment controls for the Effects system
 * 
 * Provides controls for adjusting brightness, contrast, and color levels
 * in ASCII art including input/output levels and histogram display.
 */

import { useCallback } from 'react';
import { Slider } from '../../ui/slider';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Separator } from '../../ui/separator';
import { useEffectsStore } from '../../../stores/effectsStore';
import { RotateCcw } from 'lucide-react';
import { cn } from '../../../lib/utils';

export function LevelsEffectPanel() {
  const { 
    levelsSettings,
    updateLevelsSettings,
    resetEffectSettings,
    canvasAnalysis
  } = useEffectsStore();

  // Reset to default values
  const handleReset = useCallback(() => {
    resetEffectSettings('levels');
  }, [resetEffectSettings]);

  // Handle slider value changes
  const handleShadowsInputChange = useCallback((value: number) => {
    updateLevelsSettings({ shadowsInput: value });
  }, [updateLevelsSettings]);

  const handleHighlightsInputChange = useCallback((value: number) => {
    updateLevelsSettings({ highlightsInput: value });
  }, [updateLevelsSettings]);

  const handleMidtonesInputChange = useCallback((value: number) => {
    updateLevelsSettings({ midtonesInput: value });
  }, [updateLevelsSettings]);

  const handleOutputMinChange = useCallback((value: number) => {
    updateLevelsSettings({ outputMin: value });
  }, [updateLevelsSettings]);

  const handleOutputMaxChange = useCallback((value: number) => {
    updateLevelsSettings({ outputMax: value });
  }, [updateLevelsSettings]);

  // Color analysis preview (simplified)
  const colorCount = canvasAnalysis?.uniqueColors?.length || 0;
  const brightColors = canvasAnalysis?.colorBrightnessStats?.brightColors?.length || 0;
  const darkColors = canvasAnalysis?.colorBrightnessStats?.darkColors?.length || 0;

  return (
    <div className="space-y-4">
      
      {/* Color Analysis Summary */}
      {canvasAnalysis && (
        <div className="bg-muted/50 rounded p-3 text-xs space-y-1">
          <div className="font-medium">Color Analysis:</div>
          <div className="text-muted-foreground space-y-0.5">
            <div>• {colorCount} unique colors detected</div>
            <div>• {brightColors} bright colors, {darkColors} dark colors</div>
            <div>• Fill: {Math.round(canvasAnalysis.fillPercentage)}% of canvas</div>
          </div>
        </div>
      )}
      
      {/* Input Levels Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Input Levels</Label>
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
        
        {/* Shadows Input */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <Label>Shadows</Label>
            <span className="text-muted-foreground">{levelsSettings.shadowsInput}</span>
          </div>
          <Slider
            value={levelsSettings.shadowsInput}
            onValueChange={handleShadowsInputChange}
            min={0}
            max={255}
            step={1}
            className={cn(
              "w-full",
              levelsSettings.shadowsInput !== 0 && "opacity-90"
            )}
          />
          <div className="text-xs text-muted-foreground">
            Shadows threshold - pixels darker than this become black
          </div>
        </div>
        
        {/* Mid-tones Input */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <Label>Mid-tones</Label>
            <span className="text-muted-foreground">{levelsSettings.midtonesInput.toFixed(2)}</span>
          </div>
          <Slider
            value={levelsSettings.midtonesInput}
            onValueChange={handleMidtonesInputChange}
            min={0.1}
            max={3.0}
            step={0.1}
            className={cn(
              "w-full",
              levelsSettings.midtonesInput !== 1.0 && "opacity-90"
            )}
          />
          <div className="text-xs text-muted-foreground">
            Mid-tone brightness - values &lt; 1 brighten, &gt; 1 darken
          </div>
        </div>
        
        {/* Highlights Input */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <Label>Highlights</Label>
            <span className="text-muted-foreground">{levelsSettings.highlightsInput}</span>
          </div>
          <Slider
            value={levelsSettings.highlightsInput}
            onValueChange={handleHighlightsInputChange}
            min={0}
            max={255}
            step={1}
            className={cn(
              "w-full",
              levelsSettings.highlightsInput !== 255 && "opacity-90"
            )}
          />
          <div className="text-xs text-muted-foreground">
            Highlights threshold - pixels brighter than this become white
          </div>
        </div>
      </div>
      
      <Separator />
      
      {/* Output Levels Section */}
      <div className="space-y-3">
        <Label className="text-xs font-medium">Output Levels</Label>
        
        {/* Output Minimum */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <Label>Output Minimum</Label>
            <span className="text-muted-foreground">{levelsSettings.outputMin}</span>
          </div>
          <Slider
            value={levelsSettings.outputMin}
            onValueChange={handleOutputMinChange}
            min={0}
            max={255}
            step={1}
            className={cn(
              "w-full",
              levelsSettings.outputMin !== 0 && "opacity-90"
            )}
          />
          <div className="text-xs text-muted-foreground">
            Darkest output value - prevents pure black
          </div>
        </div>
        
        {/* Output Maximum */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <Label>Output Maximum</Label>
            <span className="text-muted-foreground">{levelsSettings.outputMax}</span>
          </div>
          <Slider
            value={levelsSettings.outputMax}
            onValueChange={handleOutputMaxChange}
            min={0}
            max={255}
            step={1}
            className={cn(
              "w-full",
              levelsSettings.outputMax !== 255 && "opacity-90"
            )}
          />
          <div className="text-xs text-muted-foreground">
            Brightest output value - prevents pure white
          </div>
        </div>
      </div>
      
      {/* Preview Hint */}
      <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded p-2 text-xs">
        <div className="text-blue-800 dark:text-blue-200">
          💡 <strong>Tip:</strong> Adjust input levels to optimize the contrast range,
          then use output levels to fine-tune the final brightness.
        </div>
      </div>
      
    </div>
  );
}