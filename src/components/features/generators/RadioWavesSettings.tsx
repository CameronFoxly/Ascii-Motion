/**
 * RadioWavesSettings - Complete settings UI for Radio Waves generator
 */

import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Slider } from '../../ui/slider';
import { Checkbox } from '../../ui/checkbox';
import { Dice5 } from 'lucide-react';
import { useGeneratorsStore } from '../../../stores/generatorsStore';
import { useCanvasStore } from '../../../stores/canvasStore';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function RadioWavesSettings() {
  const { radioWavesSettings, updateRadioWavesSettings } = useGeneratorsStore();
  const { width: canvasWidth, height: canvasHeight } = useCanvasStore();
  
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSeedRandomize = () => {
    updateRadioWavesSettings({
      seed: Math.floor(Math.random() * 10000)
    });
  };

  return (
    <div className="space-y-4">
      {/* Origin Point */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Wave Origin</Label>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">X Position</Label>
            <span className="text-xs tabular-nums">{radioWavesSettings.originX}</span>
          </div>
          <Slider
            value={radioWavesSettings.originX}
            onValueChange={(value) => updateRadioWavesSettings({ originX: value })}
            min={0}
            max={canvasWidth}
            step={1}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Y Position</Label>
            <span className="text-xs tabular-nums">{radioWavesSettings.originY}</span>
          </div>
          <Slider
            value={radioWavesSettings.originY}
            onValueChange={(value) => updateRadioWavesSettings({ originY: value })}
            min={0}
            max={canvasHeight}
            step={1}
            className="w-full"
          />
        </div>
      </div>

      {/* Wave Properties */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Wave Properties</Label>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Frequency</Label>
            <span className="text-xs tabular-nums">{radioWavesSettings.frequency.toFixed(2)}</span>
          </div>
          <Slider
            value={radioWavesSettings.frequency}
            onValueChange={(value) => updateRadioWavesSettings({ frequency: value })}
            min={0.1}
            max={5.0}
            step={0.1}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Line Thickness</Label>
            <span className="text-xs tabular-nums">{radioWavesSettings.lineThickness}</span>
          </div>
          <Slider
            value={radioWavesSettings.lineThickness}
            onValueChange={(value) => updateRadioWavesSettings({ lineThickness: value })}
            min={1}
            max={5}
            step={1}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Propagation Speed</Label>
            <span className="text-xs tabular-nums">{radioWavesSettings.propagationSpeed.toFixed(1)}</span>
          </div>
          <Slider
            value={radioWavesSettings.propagationSpeed}
            onValueChange={(value) => updateRadioWavesSettings({ propagationSpeed: value })}
            min={0.5}
            max={5.0}
            step={0.1}
            className="w-full"
          />
        </div>
      </div>

      {/* Visual Effects */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Visual Effects</Label>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="amplitudeDecay"
            checked={radioWavesSettings.amplitudeDecay}
            onCheckedChange={(checked) => updateRadioWavesSettings({ amplitudeDecay: checked as boolean })}
          />
          <Label htmlFor="amplitudeDecay" className="text-xs cursor-pointer">
            Amplitude Decay
          </Label>
        </div>
        
        {radioWavesSettings.amplitudeDecay && (
          <div className="space-y-2 pl-6">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Decay Rate</Label>
              <span className="text-xs tabular-nums">{radioWavesSettings.decayRate.toFixed(2)}</span>
            </div>
            <Slider
              value={radioWavesSettings.decayRate}
              onValueChange={(value) => updateRadioWavesSettings({ decayRate: value })}
              min={0.0}
              max={1.0}
              step={0.05}
              className="w-full"
            />
          </div>
        )}
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="useGradient"
            checked={radioWavesSettings.useGradient}
            onCheckedChange={(checked) => updateRadioWavesSettings({ useGradient: checked as boolean })}
          />
          <Label htmlFor="useGradient" className="text-xs cursor-pointer">
            Color Gradient
          </Label>
        </div>
        
        {radioWavesSettings.useGradient && (
          <div className="grid grid-cols-2 gap-2 pl-6">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Start Color</Label>
              <Input
                type="color"
                value={radioWavesSettings.gradientStartColor}
                onChange={(e) => updateRadioWavesSettings({ gradientStartColor: e.target.value })}
                className="h-8 w-full"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">End Color</Label>
              <Input
                type="color"
                value={radioWavesSettings.gradientEndColor}
                onChange={(e) => updateRadioWavesSettings({ gradientEndColor: e.target.value })}
                className="h-8 w-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Animation Settings */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Animation</Label>
        
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Frame Count</Label>
          <Input
            type="number"
            value={radioWavesSettings.frameCount}
            onChange={(e) => updateRadioWavesSettings({ frameCount: parseInt(e.target.value) || 1 })}
            min={1}
            max={500}
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Frame Rate (FPS)</Label>
          <Input
            type="number"
            value={radioWavesSettings.frameRate}
            onChange={(e) => updateRadioWavesSettings({ frameRate: parseInt(e.target.value) || 1 })}
            min={1}
            max={60}
            className="h-8 text-xs"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="loopSmoothing"
            checked={radioWavesSettings.loopSmoothingEnabled}
            onCheckedChange={(checked) => updateRadioWavesSettings({ loopSmoothingEnabled: checked as boolean })}
          />
          <Label htmlFor="loopSmoothing" className="text-xs cursor-pointer">
            Loop Smoothing
          </Label>
        </div>
      </div>

      {/* Advanced Settings */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold w-full">
          <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          Advanced
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Random Seed</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={radioWavesSettings.seed}
                onChange={(e) => updateRadioWavesSettings({ seed: parseInt(e.target.value) || 0 })}
                className="h-8 text-xs flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeedRandomize}
                className="h-8 w-8 p-0"
                title="Randomize seed"
              >
                <Dice5 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
