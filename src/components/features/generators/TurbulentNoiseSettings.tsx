/**
 * TurbulentNoiseSettings - Complete settings UI for Turbulent Noise generator
 */

import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Slider } from '../../ui/slider';
import { Checkbox } from '../../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Dice5 } from 'lucide-react';
import { useGeneratorsStore } from '../../../stores/generatorsStore';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { NoiseType } from '../../../types/generators';

export function TurbulentNoiseSettings() {
  const { turbulentNoiseSettings, updateTurbulentNoiseSettings } = useGeneratorsStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSeedRandomize = () => {
    updateTurbulentNoiseSettings({
      seed: Math.floor(Math.random() * 10000)
    });
  };

  return (
    <div className="space-y-4">
      {/* Noise Type */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Noise Type</Label>
        <Select
          value={turbulentNoiseSettings.noiseType}
          onValueChange={(value) => updateTurbulentNoiseSettings({ noiseType: value as NoiseType })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="perlin">Perlin Noise</SelectItem>
            <SelectItem value="simplex">Simplex Noise</SelectItem>
            <SelectItem value="worley">Worley (Cellular) Noise</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Noise Properties */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Noise Properties</Label>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Base Frequency</Label>
            <span className="text-xs tabular-nums">{turbulentNoiseSettings.baseFrequency.toFixed(1)}</span>
          </div>
          <Slider
            value={turbulentNoiseSettings.baseFrequency}
            onValueChange={(value) => updateTurbulentNoiseSettings({ baseFrequency: value })}
            min={0.1}
            max={8.0}
            step={0.1}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Amplitude</Label>
            <span className="text-xs tabular-nums">{turbulentNoiseSettings.amplitude.toFixed(2)}</span>
          </div>
          <Slider
            value={turbulentNoiseSettings.amplitude}
            onValueChange={(value) => updateTurbulentNoiseSettings({ amplitude: value })}
            min={0.0}
            max={1.0}
            step={0.05}
            className="w-full"
          />
        </div>
      </div>

      {/* Fractal Properties */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Fractal Properties</Label>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Octaves</Label>
            <span className="text-xs tabular-nums">{turbulentNoiseSettings.octaves}</span>
          </div>
          <Slider
            value={turbulentNoiseSettings.octaves}
            onValueChange={(value) => updateTurbulentNoiseSettings({ octaves: Math.round(value) })}
            min={1}
            max={6}
            step={1}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Persistence</Label>
            <span className="text-xs tabular-nums">{turbulentNoiseSettings.persistence.toFixed(2)}</span>
          </div>
          <Slider
            value={turbulentNoiseSettings.persistence}
            onValueChange={(value) => updateTurbulentNoiseSettings({ persistence: value })}
            min={0.0}
            max={1.0}
            step={0.05}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Lacunarity</Label>
            <span className="text-xs tabular-nums">{turbulentNoiseSettings.lacunarity.toFixed(2)}</span>
          </div>
          <Slider
            value={turbulentNoiseSettings.lacunarity}
            onValueChange={(value) => updateTurbulentNoiseSettings({ lacunarity: value })}
            min={1.0}
            max={4.0}
            step={0.1}
            className="w-full"
          />
        </div>
      </div>

      {/* Evolution */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Evolution</Label>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Evolution Speed</Label>
            <span className="text-xs tabular-nums">{turbulentNoiseSettings.evolutionSpeed.toFixed(1)}</span>
          </div>
          <Slider
            value={turbulentNoiseSettings.evolutionSpeed}
            onValueChange={(value) => updateTurbulentNoiseSettings({ evolutionSpeed: value })}
            min={0.1}
            max={10.0}
            step={0.1}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Offset X</Label>
            <span className="text-xs tabular-nums">{turbulentNoiseSettings.offsetX.toFixed(1)}</span>
          </div>
          <Slider
            value={turbulentNoiseSettings.offsetX}
            onValueChange={(value) => updateTurbulentNoiseSettings({ offsetX: value })}
            min={-100}
            max={100}
            step={1}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Offset Y</Label>
            <span className="text-xs tabular-nums">{turbulentNoiseSettings.offsetY.toFixed(1)}</span>
          </div>
          <Slider
            value={turbulentNoiseSettings.offsetY}
            onValueChange={(value) => updateTurbulentNoiseSettings({ offsetY: value })}
            min={-100}
            max={100}
            step={1}
            className="w-full"
          />
        </div>
      </div>

      {/* Animation Settings */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Animation</Label>
        
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Frame Count</Label>
          <Input
            type="number"
            value={turbulentNoiseSettings.frameCount}
            onChange={(e) => updateTurbulentNoiseSettings({ frameCount: parseInt(e.target.value) || 1 })}
            min={1}
            max={500}
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Frame Rate (FPS)</Label>
          <Input
            type="number"
            value={turbulentNoiseSettings.frameRate}
            onChange={(e) => updateTurbulentNoiseSettings({ frameRate: parseInt(e.target.value) || 1 })}
            min={1}
            max={60}
            className="h-8 text-xs"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="loopSmoothing"
            checked={turbulentNoiseSettings.loopSmoothingEnabled}
            onCheckedChange={(checked) => updateTurbulentNoiseSettings({ loopSmoothingEnabled: checked as boolean })}
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
                value={turbulentNoiseSettings.seed}
                onChange={(e) => updateTurbulentNoiseSettings({ seed: parseInt(e.target.value) || 0 })}
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
