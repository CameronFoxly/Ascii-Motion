/**
 * DigitalRainSettings - Complete settings UI for Digital Rain (Matrix) generator
 */

import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Slider } from '../../ui/slider';
import { Checkbox } from '../../ui/checkbox';
import { Dice5, RotateCcw } from 'lucide-react';
import { useGeneratorsStore } from '../../../stores/generatorsStore';
import { DEFAULT_DIGITAL_RAIN_SETTINGS } from '../../../constants/generators';

export function DigitalRainSettings() {
  const { digitalRainSettings, updateDigitalRainSettings } = useGeneratorsStore();

  const handleSeedRandomize = () => {
    updateDigitalRainSettings({
      seed: Math.floor(Math.random() * 10000)
    });
  };

  const handleResetToDefaults = () => {
    updateDigitalRainSettings({
      ...DEFAULT_DIGITAL_RAIN_SETTINGS,
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

      {/* Trail Properties */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Trail Properties</Label>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Trail Length (characters)</Label>
            <span className="text-xs tabular-nums">{digitalRainSettings.trailLength}</span>
          </div>
          <Slider
            value={digitalRainSettings.trailLength}
            onValueChange={(value) => updateDigitalRainSettings({ trailLength: value })}
            min={1}
            max={50}
            step={1}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Length Randomness</Label>
            <span className="text-xs tabular-nums">{Math.round(digitalRainSettings.trailLengthRandomness * 100)}%</span>
          </div>
          <Slider
            value={digitalRainSettings.trailLengthRandomness}
            onValueChange={(value) => updateDigitalRainSettings({ trailLengthRandomness: value })}
            min={0.0}
            max={1.0}
            step={0.01}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Fade Amount</Label>
            <span className="text-xs tabular-nums">{Math.round(digitalRainSettings.fadeAmount * 100)}%</span>
          </div>
          <Slider
            value={digitalRainSettings.fadeAmount}
            onValueChange={(value) => updateDigitalRainSettings({ fadeAmount: value })}
            min={0.0}
            max={1.0}
            step={0.01}
            className="w-full"
          />
          <p className="text-[10px] text-muted-foreground">
            Percentage of trail that fades from white to black
          </p>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Trail Width (pixels)</Label>
            <span className="text-xs tabular-nums">{digitalRainSettings.trailWidth}</span>
          </div>
          <Slider
            value={digitalRainSettings.trailWidth}
            onValueChange={(value) => updateDigitalRainSettings({ trailWidth: value })}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Checkbox
            id="width-randomness"
            checked={digitalRainSettings.widthRandomness}
            onCheckedChange={(checked) => 
              updateDigitalRainSettings({ widthRandomness: checked === true })
            }
          />
          <Label 
            htmlFor="width-randomness" 
            className="text-xs text-muted-foreground cursor-pointer"
          >
            Variable Width per Trail
          </Label>
        </div>
        
        {digitalRainSettings.widthRandomness && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Min Width</Label>
              <Input
                type="number"
                value={digitalRainSettings.widthMin}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value >= 1 && value <= digitalRainSettings.widthMax) {
                    updateDigitalRainSettings({ widthMin: value });
                  }
                }}
                min={1}
                max={10}
                className="h-8 text-xs"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Max Width</Label>
              <Input
                type="number"
                value={digitalRainSettings.widthMax}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value >= digitalRainSettings.widthMin && value <= 10) {
                    updateDigitalRainSettings({ widthMax: value });
                  }
                }}
                min={1}
                max={10}
                className="h-8 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Spawn Properties */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Spawn Rate</Label>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Frequency (trails/sec)</Label>
            <span className="text-xs tabular-nums">{digitalRainSettings.frequency}</span>
          </div>
          <Slider
            value={digitalRainSettings.frequency}
            onValueChange={(value) => updateDigitalRainSettings({ frequency: value })}
            min={1}
            max={20}
            step={1}
            className="w-full"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Checkbox
            id="pre-run"
            checked={digitalRainSettings.preRun}
            onCheckedChange={(checked) => 
              updateDigitalRainSettings({ preRun: checked === true })
            }
          />
          <Label 
            htmlFor="pre-run" 
            className="text-xs text-muted-foreground cursor-pointer"
          >
            Pre-Run (start with trails already falling)
          </Label>
        </div>
      </div>

      {/* Movement Properties */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Movement</Label>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Speed (chars/frame)</Label>
            <span className="text-xs tabular-nums">{digitalRainSettings.speed.toFixed(1)}</span>
          </div>
          <Slider
            value={digitalRainSettings.speed}
            onValueChange={(value) => updateDigitalRainSettings({ speed: value })}
            min={0.1}
            max={5.0}
            step={0.1}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Speed Randomness</Label>
            <span className="text-xs tabular-nums">{Math.round(digitalRainSettings.speedRandomness * 100)}%</span>
          </div>
          <Slider
            value={digitalRainSettings.speedRandomness}
            onValueChange={(value) => updateDigitalRainSettings({ speedRandomness: value })}
            min={0.0}
            max={1.0}
            step={0.01}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Direction Angle</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => updateDigitalRainSettings({ directionAngle: 180 })}
              >
                Reset
              </Button>
              <span className="text-xs tabular-nums">{digitalRainSettings.directionAngle}°</span>
            </div>
          </div>
          <Slider
            value={digitalRainSettings.directionAngle}
            onValueChange={(value) => updateDigitalRainSettings({ directionAngle: value })}
            min={0}
            max={360}
            step={1}
            className="w-full"
          />
          <p className="text-[10px] text-muted-foreground">
            Compass: 0°=up, 90°=right, 180°=down, 270°=left
          </p>
        </div>
      </div>

      {/* Noise Properties */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Noise Overlay</Label>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Noise Amount</Label>
            <span className="text-xs tabular-nums">{digitalRainSettings.noiseAmount}</span>
          </div>
          <Slider
            value={digitalRainSettings.noiseAmount}
            onValueChange={(value) => updateDigitalRainSettings({ noiseAmount: value })}
            min={0}
            max={200}
            step={1}
            className="w-full"
          />
          <p className="text-[10px] text-muted-foreground">
            Brightness variation strength (higher values create extreme effects)
          </p>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Noise Scale</Label>
            <span className="text-xs tabular-nums">{digitalRainSettings.noiseScale.toFixed(2)}</span>
          </div>
          <Slider
            value={digitalRainSettings.noiseScale}
            onValueChange={(value) => updateDigitalRainSettings({ noiseScale: value })}
            min={0.01}
            max={2.0}
            step={0.01}
            className="w-full"
          />
          <p className="text-[10px] text-muted-foreground">
            Detail level of noise pattern (lower = larger features, higher = finer details)
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Checkbox
            id="animated-noise"
            checked={digitalRainSettings.animatedNoise}
            onCheckedChange={(checked) => 
              updateDigitalRainSettings({ animatedNoise: checked === true })
            }
          />
          <Label 
            htmlFor="animated-noise" 
            className="text-xs text-muted-foreground cursor-pointer"
          >
            Animated Noise (evolves over time)
          </Label>
        </div>
        
        {digitalRainSettings.animatedNoise && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Noise Speed</Label>
              <span className="text-xs tabular-nums">{digitalRainSettings.noiseSpeed}</span>
            </div>
            <Slider
              value={digitalRainSettings.noiseSpeed}
              onValueChange={(value) => updateDigitalRainSettings({ noiseSpeed: value })}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
            <p className="text-[10px] text-muted-foreground">
              Evolution rate of noise pattern
            </p>
          </div>
        )}
      </div>

      {/* Random Seed */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Random Seed</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            value={digitalRainSettings.seed}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (!isNaN(value)) {
                updateDigitalRainSettings({ seed: value });
              }
            }}
            className="h-8 text-xs flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeedRandomize}
            className="h-8 px-2"
          >
            <Dice5 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Same seed produces identical animations
        </p>
      </div>
    </div>
  );
}
