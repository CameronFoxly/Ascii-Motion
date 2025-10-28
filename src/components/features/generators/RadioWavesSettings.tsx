/**
 * RadioWavesSettings - Settings UI for Radio Waves generator
 * 
 * Phase 2: Basic settings only (full implementation in Phase 4)
 */

import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Dice5 } from 'lucide-react';
import { useGeneratorsStore } from '../../../stores/generatorsStore';

export function RadioWavesSettings() {
  const { radioWavesSettings, updateRadioWavesSettings } = useGeneratorsStore();

  const handleSeedRandomize = () => {
    updateRadioWavesSettings({
      seed: Math.floor(Math.random() * 10000)
    });
  };

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground">
        Radio Waves Generator Settings
      </div>

      {/* Frame Count */}
      <div className="space-y-2">
        <Label className="text-xs">Frame Count</Label>
        <Input
          type="number"
          value={radioWavesSettings.frameCount}
          onChange={(e) => updateRadioWavesSettings({ frameCount: parseInt(e.target.value) || 1 })}
          min={1}
          max={500}
          className="h-8 text-xs"
        />
      </div>

      {/* Frame Rate */}
      <div className="space-y-2">
        <Label className="text-xs">Frame Rate (FPS)</Label>
        <Input
          type="number"
          value={radioWavesSettings.frameRate}
          onChange={(e) => updateRadioWavesSettings({ frameRate: parseInt(e.target.value) || 1 })}
          min={1}
          max={60}
          className="h-8 text-xs"
        />
      </div>

      {/* Seed */}
      <div className="space-y-2">
        <Label className="text-xs">Random Seed</Label>
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

      <div className="text-xs text-muted-foreground pt-2">
        More settings will be added in Phase 4
      </div>
    </div>
  );
}

