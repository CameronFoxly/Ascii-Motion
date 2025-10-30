/**
 * PlaceholderGeneratorSettings - Generic settings component for generators
 * Phase 2: Shows basic frame/seed controls (full implementation in Phase 4)
 */

import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Dice5 } from 'lucide-react';

interface PlaceholderGeneratorSettingsProps {
  name: string;
  frameCount: number;
  frameRate: number;
  seed: number;
  onUpdateSettings: (updates: { frameCount?: number; frameRate?: number; seed?: number }) => void;
}

export function PlaceholderGeneratorSettings({
  name,
  frameCount,
  frameRate,
  seed,
  onUpdateSettings
}: PlaceholderGeneratorSettingsProps) {
  const handleSeedRandomize = () => {
    onUpdateSettings({ seed: Math.floor(Math.random() * 10000) });
  };

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground">
        {name} Generator Settings
      </div>

      {/* Frame Count */}
      <div className="space-y-2">
        <Label className="text-xs">Frame Count</Label>
        <Input
          type="number"
          value={frameCount}
          onChange={(e) => onUpdateSettings({ frameCount: parseInt(e.target.value) || 1 })}
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
          value={frameRate}
          onChange={(e) => onUpdateSettings({ frameRate: parseInt(e.target.value) || 1 })}
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
            value={seed}
            onChange={(e) => onUpdateSettings({ seed: parseInt(e.target.value) || 0 })}
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
