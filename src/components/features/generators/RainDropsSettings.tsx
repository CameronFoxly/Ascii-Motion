/**
 * RainDropsSettings - Complete settings UI for Rain Drops generator
 */

import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Slider } from '../../ui/slider';
import { Checkbox } from '../../ui/checkbox';
import { Dice5 } from 'lucide-react';
import { useGeneratorsStore } from '../../../stores/generatorsStore';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function RainDropsSettings() {
  const { rainDropsSettings, updateRainDropsSettings } = useGeneratorsStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSeedRandomize = () => {
    updateRainDropsSettings({
      seed: Math.floor(Math.random() * 10000)
    });
  };

  return (
    <div className="space-y-4">
      {/* Drop Spawn Properties */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Drop Spawning</Label>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Drop Frequency (per second)</Label>
            <span className="text-xs tabular-nums">{rainDropsSettings.dropFrequency.toFixed(1)}</span>
          </div>
          <Slider
            value={rainDropsSettings.dropFrequency}
            onValueChange={(value) => updateRainDropsSettings({ dropFrequency: value })}
            min={0.1}
            max={10.0}
            step={0.1}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Frequency Randomness</Label>
            <span className="text-xs tabular-nums">{rainDropsSettings.dropFrequencyRandomness.toFixed(2)}</span>
          </div>
          <Slider
            value={rainDropsSettings.dropFrequencyRandomness}
            onValueChange={(value) => updateRainDropsSettings({ dropFrequencyRandomness: value })}
            min={0.0}
            max={1.0}
            step={0.05}
            className="w-full"
          />
        </div>
      </div>

      {/* Ripple Properties */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Ripple Properties</Label>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Expansion Speed</Label>
            <span className="text-xs tabular-nums">{rainDropsSettings.rippleSpeed.toFixed(1)}</span>
          </div>
          <Slider
            value={rainDropsSettings.rippleSpeed}
            onValueChange={(value) => updateRainDropsSettings({ rippleSpeed: value })}
            min={0.1}
            max={10.0}
            step={0.1}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Max Radius</Label>
            <span className="text-xs tabular-nums">{rainDropsSettings.rippleRadiusMax.toFixed(1)}</span>
          </div>
          <Slider
            value={rainDropsSettings.rippleRadiusMax}
            onValueChange={(value) => updateRainDropsSettings({ rippleRadiusMax: value })}
            min={5.0}
            max={100.0}
            step={1.0}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Initial Amplitude</Label>
            <span className="text-xs tabular-nums">{rainDropsSettings.rippleAmplitude.toFixed(2)}</span>
          </div>
          <Slider
            value={rainDropsSettings.rippleAmplitude}
            onValueChange={(value) => updateRainDropsSettings({ rippleAmplitude: value })}
            min={0.1}
            max={2.0}
            step={0.1}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Amplitude Decay</Label>
            <span className="text-xs tabular-nums">{rainDropsSettings.rippleDecay.toFixed(3)}</span>
          </div>
          <Slider
            value={rainDropsSettings.rippleDecay}
            onValueChange={(value) => updateRainDropsSettings({ rippleDecay: value })}
            min={0.001}
            max={0.1}
            step={0.001}
            className="w-full"
          />
        </div>
      </div>

      {/* Drop Size Properties */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Drop Size</Label>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Base Size</Label>
            <span className="text-xs tabular-nums">{rainDropsSettings.dropSizeBase}</span>
          </div>
          <Slider
            value={rainDropsSettings.dropSizeBase}
            onValueChange={(value) => updateRainDropsSettings({ dropSizeBase: Math.round(value) })}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="dropSizeRandomness"
            checked={rainDropsSettings.dropSizeRandomness}
            onCheckedChange={(checked) => updateRainDropsSettings({ dropSizeRandomness: checked as boolean })}
          />
          <Label htmlFor="dropSizeRandomness" className="text-xs cursor-pointer">
            Size Randomness
          </Label>
        </div>
        
        {rainDropsSettings.dropSizeRandomness && (
          <div className="grid grid-cols-2 gap-2 pl-6">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Min Size</Label>
              <Input
                type="number"
                value={rainDropsSettings.dropSizeMin}
                onChange={(e) => updateRainDropsSettings({ dropSizeMin: parseInt(e.target.value) || 1 })}
                min={1}
                max={10}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Max Size</Label>
              <Input
                type="number"
                value={rainDropsSettings.dropSizeMax}
                onChange={(e) => updateRainDropsSettings({ dropSizeMax: parseInt(e.target.value) || 1 })}
                min={1}
                max={10}
                className="h-8 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Wave Interaction */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Wave Interaction</Label>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="interferenceEnabled"
            checked={rainDropsSettings.interferenceEnabled}
            onCheckedChange={(checked) => updateRainDropsSettings({ interferenceEnabled: checked as boolean })}
          />
          <Label htmlFor="interferenceEnabled" className="text-xs cursor-pointer">
            Enable Interference (overlapping ripples combine)
          </Label>
        </div>
      </div>

      {/* Animation Settings */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Animation</Label>
        
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Frame Count</Label>
          <Input
            type="number"
            value={rainDropsSettings.frameCount}
            onChange={(e) => updateRainDropsSettings({ frameCount: parseInt(e.target.value) || 1 })}
            min={1}
            max={500}
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Frame Rate (FPS)</Label>
          <Input
            type="number"
            value={rainDropsSettings.frameRate}
            onChange={(e) => updateRainDropsSettings({ frameRate: parseInt(e.target.value) || 1 })}
            min={1}
            max={60}
            className="h-8 text-xs"
          />
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
                value={rainDropsSettings.seed}
                onChange={(e) => updateRainDropsSettings({ seed: parseInt(e.target.value) || 0 })}
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
