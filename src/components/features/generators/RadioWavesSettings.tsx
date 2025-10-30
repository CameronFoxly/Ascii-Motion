/**
 * RadioWavesSettings - Complete settings UI for Radio Waves generator
 */

import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Slider } from '../../ui/slider';
import { Dice5, RotateCcw } from 'lucide-react';
import { useGeneratorsStore } from '../../../stores/generatorsStore';
import { useCanvasStore } from '../../../stores/canvasStore';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { DEFAULT_RADIO_WAVES_SETTINGS } from '../../../constants/generators';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import type { WaveShape, ProfileShape } from '../../../types/generators';

export function RadioWavesSettings() {
  const { radioWavesSettings, updateRadioWavesSettings } = useGeneratorsStore();
  const { width: canvasWidth, height: canvasHeight } = useCanvasStore();
  
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSeedRandomize = () => {
    updateRadioWavesSettings({
      seed: Math.floor(Math.random() * 10000)
    });
  };

  const handleResetToDefaults = () => {
    // Reset to defaults but preserve canvas-center origin
    updateRadioWavesSettings({
      ...DEFAULT_RADIO_WAVES_SETTINGS,
      originX: Math.floor(canvasWidth / 2),
      originY: Math.floor(canvasHeight / 2),
      seed: Math.floor(Math.random() * 10000) // Keep seed random
    });
  };

  return (
    <div className="space-y-4">
      {/* Reset to Defaults Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleResetToDefaults}
        className="w-full h-8 text-xs"
      >
        <RotateCcw className="w-3 h-3 mr-2" />
        Reset to Defaults
      </Button>

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
            <Label className="text-xs text-muted-foreground">Start Thickness</Label>
            <span className="text-xs tabular-nums">{radioWavesSettings.startThickness}</span>
          </div>
          <Slider
            value={radioWavesSettings.startThickness}
            onValueChange={(value) => updateRadioWavesSettings({ startThickness: value })}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">End Thickness</Label>
            <span className="text-xs tabular-nums">{radioWavesSettings.endThickness}</span>
          </div>
          <Slider
            value={radioWavesSettings.endThickness}
            onValueChange={(value) => updateRadioWavesSettings({ endThickness: value })}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Wave Shape</Label>
          <Select
            value={radioWavesSettings.waveShape}
            onValueChange={(value: WaveShape) => updateRadioWavesSettings({ waveShape: value })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="circle">Circle</SelectItem>
              <SelectItem value="square">Square</SelectItem>
              <SelectItem value="triangle">Triangle</SelectItem>
              <SelectItem value="pentagon">Pentagon</SelectItem>
              <SelectItem value="hexagon">Hexagon</SelectItem>
              <SelectItem value="octagon">Octagon</SelectItem>
              <SelectItem value="star">Star</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Profile Shape</Label>
          <Select
            value={radioWavesSettings.profileShape}
            onValueChange={(value: ProfileShape) => updateRadioWavesSettings({ profileShape: value })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="solid">Solid</SelectItem>
              <SelectItem value="fade-out">Fade Out</SelectItem>
              <SelectItem value="fade-in">Fade In</SelectItem>
              <SelectItem value="fade-in-out">Fade In and Out</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Propagation Speed</Label>
            <span className="text-xs tabular-nums">{radioWavesSettings.propagationSpeed.toFixed(1)}</span>
          </div>
          <Slider
            value={radioWavesSettings.propagationSpeed}
            onValueChange={(value) => updateRadioWavesSettings({ propagationSpeed: value })}
            min={-2.0}
            max={2.0}
            step={0.1}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Wave Lifetime</Label>
            <span className="text-xs tabular-nums">{(radioWavesSettings.lifetime * 100).toFixed(0)}%</span>
          </div>
          <Slider
            value={radioWavesSettings.lifetime}
            onValueChange={(value) => updateRadioWavesSettings({ lifetime: value })}
            min={0.1}
            max={1.0}
            step={0.05}
            className="w-full"
          />
        </div>
        
        {/* Rotation Controls - Only show for non-circle shapes */}
        {radioWavesSettings.waveShape !== 'circle' && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Start Rotation</Label>
                <span className="text-xs tabular-nums">{radioWavesSettings.startRotation}°</span>
              </div>
              <Slider
                value={radioWavesSettings.startRotation}
                onValueChange={(value) => updateRadioWavesSettings({ startRotation: value })}
                min={0}
                max={360}
                step={1}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">End Rotation</Label>
                <span className="text-xs tabular-nums">{radioWavesSettings.endRotation}°</span>
              </div>
              <Slider
                value={radioWavesSettings.endRotation}
                onValueChange={(value) => updateRadioWavesSettings({ endRotation: value })}
                min={0}
                max={360}
                step={1}
                className="w-full"
              />
            </div>
          </>
        )}
      </div>

      {/* Visual Effects */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Visual Effects</Label>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Amplitude Decay</Label>
            <span className="text-xs tabular-nums">{radioWavesSettings.decayRate.toFixed(2)}</span>
          </div>
          <Slider
            value={radioWavesSettings.decayRate}
            onValueChange={(value) => updateRadioWavesSettings({ decayRate: value })}
            min={0.0}
            max={5.0}
            step={0.1}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
