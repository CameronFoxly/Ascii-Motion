/**
 * TurbulentNoiseSettings - Complete settings UI for Turbulent Noise generator
 */

import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Slider } from '../../ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Dice5, RotateCcw } from 'lucide-react';
import { useGeneratorsStore } from '../../../stores/generatorsStore';
import { DEFAULT_TURBULENT_NOISE_SETTINGS } from '../../../constants/generators';
import type { NoiseType } from '../../../types/generators';

export function TurbulentNoiseSettings() {
  const { turbulentNoiseSettings, updateTurbulentNoiseSettings } = useGeneratorsStore();

  const handleSeedRandomize = () => {
    updateTurbulentNoiseSettings({
      seed: Math.floor(Math.random() * 10000)
    });
  };

  const handleResetToDefaults = () => {
    updateTurbulentNoiseSettings({
      ...DEFAULT_TURBULENT_NOISE_SETTINGS,
      seed: Math.floor(Math.random() * 10000)
    });
  };

  return (
    <div className="space-y-4">
      {/* Reset to Defaults */}
      <Button 
        variant="outline" 
        onClick={handleResetToDefaults}
        className="w-full h-8 text-xs"
      >
        <RotateCcw className="mr-1.5 h-3 w-3" />
        Reset to Defaults
      </Button>
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
      </div>

      {/* Visual Adjustments */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Visual Adjustments</Label>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Brightness</Label>
            <span className="text-xs tabular-nums">{turbulentNoiseSettings.brightness.toFixed(2)}</span>
          </div>
          <Slider
            value={turbulentNoiseSettings.brightness}
            onValueChange={(value) => updateTurbulentNoiseSettings({ brightness: value })}
            min={-1.0}
            max={1.0}
            step={0.05}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Contrast</Label>
            <span className="text-xs tabular-nums">{turbulentNoiseSettings.contrast.toFixed(2)}</span>
          </div>
          <Slider
            value={turbulentNoiseSettings.contrast}
            onValueChange={(value) => updateTurbulentNoiseSettings({ contrast: value })}
            min={0.0}
            max={4.0}
            step={0.05}
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
      </div>
    </div>
  );
}
