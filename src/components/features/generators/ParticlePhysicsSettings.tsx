/**
 * ParticlePhysicsSettings - Complete settings UI for Particle Physics generator
 */

import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Slider } from '../../ui/slider';
import { Checkbox } from '../../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Dice5 } from 'lucide-react';
import { useGeneratorsStore } from '../../../stores/generatorsStore';
import { useCanvasStore } from '../../../stores/canvasStore';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function ParticlePhysicsSettings() {
  const { particlePhysicsSettings, updateParticlePhysicsSettings } = useGeneratorsStore();
  const { width: canvasWidth, height: canvasHeight } = useCanvasStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSeedRandomize = () => {
    updateParticlePhysicsSettings({
      seed: Math.floor(Math.random() * 10000)
    });
  };

  return (
    <div className="space-y-4">
      {/* Emitter Properties */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Emitter</Label>
        
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Shape</Label>
          <Select 
            value={particlePhysicsSettings.emitterShape} 
            onValueChange={(value: 'point' | 'vertical-line' | 'horizontal-line' | 'square' | 'circle') => 
              updateParticlePhysicsSettings({ emitterShape: value })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="point" className="text-xs">Point</SelectItem>
              <SelectItem value="vertical-line" className="text-xs">Vertical Line</SelectItem>
              <SelectItem value="horizontal-line" className="text-xs">Horizontal Line</SelectItem>
              <SelectItem value="square" className="text-xs">Square</SelectItem>
              <SelectItem value="circle" className="text-xs">Circle</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {particlePhysicsSettings.emitterShape !== 'point' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Size</Label>
              <span className="text-xs tabular-nums">{particlePhysicsSettings.emitterSize}</span>
            </div>
            <Slider
              value={particlePhysicsSettings.emitterSize}
              onValueChange={(value) => updateParticlePhysicsSettings({ emitterSize: value })}
              min={1}
              max={Math.max(canvasWidth, canvasHeight)}
              step={1}
              className="w-full"
            />
          </div>
        )}
        
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Mode</Label>
          <Select 
            value={particlePhysicsSettings.emitterMode} 
            onValueChange={(value: 'continuous' | 'burst') => 
              updateParticlePhysicsSettings({ emitterMode: value })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="continuous" className="text-xs">Continuous</SelectItem>
              <SelectItem value="burst" className="text-xs">Burst</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">X Position</Label>
            <span className="text-xs tabular-nums">{particlePhysicsSettings.originX}</span>
          </div>
          <Slider
            value={particlePhysicsSettings.originX}
            onValueChange={(value) => updateParticlePhysicsSettings({ originX: value })}
            min={0}
            max={canvasWidth}
            step={1}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Y Position</Label>
            <span className="text-xs tabular-nums">{particlePhysicsSettings.originY}</span>
          </div>
          <Slider
            value={particlePhysicsSettings.originY}
            onValueChange={(value) => updateParticlePhysicsSettings({ originY: value })}
            min={0}
            max={canvasHeight}
            step={1}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Particle Count</Label>
            <span className="text-xs tabular-nums">{particlePhysicsSettings.particleCount}</span>
          </div>
          <Slider
            value={particlePhysicsSettings.particleCount}
            onValueChange={(value) => updateParticlePhysicsSettings({ particleCount: Math.round(value) })}
            min={1}
            max={500}
            step={10}
            className="w-full"
          />
        </div>
      </div>

      {/* Particle Properties */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Particle Properties</Label>
        
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Shape</Label>
          <Select 
            value={particlePhysicsSettings.particleShape} 
            onValueChange={(value: 'circle' | 'square' | 'cloudlet') => 
              updateParticlePhysicsSettings({ particleShape: value })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="circle" className="text-xs">Circle</SelectItem>
              <SelectItem value="square" className="text-xs">Square</SelectItem>
              <SelectItem value="cloudlet" className="text-xs">Cloudlet</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Size</Label>
            <span className="text-xs tabular-nums">{particlePhysicsSettings.particleSize}</span>
          </div>
          <Slider
            value={particlePhysicsSettings.particleSize}
            onValueChange={(value) => updateParticlePhysicsSettings({ particleSize: value })}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="particleSizeRandomness"
            checked={particlePhysicsSettings.particleSizeRandomness}
            onCheckedChange={(checked) => updateParticlePhysicsSettings({ particleSizeRandomness: checked as boolean })}
          />
          <Label htmlFor="particleSizeRandomness" className="text-xs cursor-pointer">
            Size Randomness
          </Label>
        </div>
        
        {particlePhysicsSettings.particleSizeRandomness && (
          <div className="grid grid-cols-2 gap-2 pl-6">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Min Size</Label>
              <Input
                type="number"
                value={particlePhysicsSettings.particleSizeMin}
                onChange={(e) => updateParticlePhysicsSettings({ particleSizeMin: parseInt(e.target.value) || 1 })}
                min={1}
                max={10}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Max Size</Label>
              <Input
                type="number"
                value={particlePhysicsSettings.particleSizeMax}
                onChange={(e) => updateParticlePhysicsSettings({ particleSizeMax: parseInt(e.target.value) || 1 })}
                min={1}
                max={10}
                className="h-8 text-xs"
              />
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Start Size</Label>
            <span className="text-xs tabular-nums">{Math.round(particlePhysicsSettings.startSizeMultiplier * 100)}%</span>
          </div>
          <Slider
            value={particlePhysicsSettings.startSizeMultiplier}
            onValueChange={(value) => updateParticlePhysicsSettings({ startSizeMultiplier: value })}
            min={0.0}
            max={2.0}
            step={0.05}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">End Size</Label>
            <span className="text-xs tabular-nums">{Math.round(particlePhysicsSettings.endSizeMultiplier * 100)}%</span>
          </div>
          <Slider
            value={particlePhysicsSettings.endSizeMultiplier}
            onValueChange={(value) => updateParticlePhysicsSettings({ endSizeMultiplier: value })}
            min={0.0}
            max={2.0}
            step={0.05}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Start Opacity</Label>
            <span className="text-xs tabular-nums">{Math.round(particlePhysicsSettings.startOpacity * 100)}%</span>
          </div>
          <Slider
            value={particlePhysicsSettings.startOpacity}
            onValueChange={(value) => updateParticlePhysicsSettings({ startOpacity: value })}
            min={0.0}
            max={1.0}
            step={0.05}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">End Opacity</Label>
            <span className="text-xs tabular-nums">{Math.round(particlePhysicsSettings.endOpacity * 100)}%</span>
          </div>
          <Slider
            value={particlePhysicsSettings.endOpacity}
            onValueChange={(value) => updateParticlePhysicsSettings({ endOpacity: value })}
            min={0.0}
            max={1.0}
            step={0.05}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Lifespan (frames)</Label>
          <Input
            type="number"
            value={particlePhysicsSettings.lifespan}
            onChange={(e) => updateParticlePhysicsSettings({ lifespan: parseInt(e.target.value) || 1 })}
            min={1}
            max={500}
            className="h-8 text-xs"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="lifespanRandomness"
            checked={particlePhysicsSettings.lifespanRandomness}
            onCheckedChange={(checked) => updateParticlePhysicsSettings({ lifespanRandomness: checked as boolean })}
          />
          <Label htmlFor="lifespanRandomness" className="text-xs cursor-pointer">
            Lifespan Randomness
          </Label>
        </div>
        
        {particlePhysicsSettings.lifespanRandomness && (
          <div className="space-y-2 pl-6">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Variation Amount</Label>
              <span className="text-xs tabular-nums">{Math.round(particlePhysicsSettings.lifespanRandomnessAmount * 100)}%</span>
            </div>
            <Slider
              value={particlePhysicsSettings.lifespanRandomnessAmount}
              onValueChange={(value) => updateParticlePhysicsSettings({ lifespanRandomnessAmount: value })}
              min={0.0}
              max={1.0}
              step={0.05}
              className="w-full"
            />
          </div>
        )}
      </div>

      {/* Velocity */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Velocity</Label>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Magnitude (Speed)</Label>
            <span className="text-xs tabular-nums">{particlePhysicsSettings.velocityMagnitude.toFixed(1)}</span>
          </div>
          <Slider
            value={particlePhysicsSettings.velocityMagnitude}
            onValueChange={(value) => updateParticlePhysicsSettings({ velocityMagnitude: value })}
            min={0.1}
            max={10.0}
            step={0.1}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Angle (degrees)</Label>
            <span className="text-xs tabular-nums">{particlePhysicsSettings.velocityAngle}°</span>
          </div>
          <Slider
            value={particlePhysicsSettings.velocityAngle}
            onValueChange={(value) => updateParticlePhysicsSettings({ velocityAngle: value })}
            min={0}
            max={360}
            step={1}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Angle Randomness</Label>
            <span className="text-xs tabular-nums">{Math.round(particlePhysicsSettings.velocityAngleRandomness * 100)}%</span>
          </div>
          <Slider
            value={particlePhysicsSettings.velocityAngleRandomness}
            onValueChange={(value) => updateParticlePhysicsSettings({ velocityAngleRandomness: value })}
            min={0.0}
            max={1.0}
            step={0.05}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Speed Randomness</Label>
            <span className="text-xs tabular-nums">{Math.round(particlePhysicsSettings.velocitySpeedRandomness * 100)}%</span>
          </div>
          <Slider
            value={particlePhysicsSettings.velocitySpeedRandomness}
            onValueChange={(value) => updateParticlePhysicsSettings({ velocitySpeedRandomness: value })}
            min={0.0}
            max={1.0}
            step={0.05}
            className="w-full"
          />
        </div>
      </div>

      {/* Physics */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Physics</Label>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Gravity</Label>
            <span className="text-xs tabular-nums">{particlePhysicsSettings.gravity.toFixed(2)}</span>
          </div>
          <Slider
            value={particlePhysicsSettings.gravity}
            onValueChange={(value) => updateParticlePhysicsSettings({ gravity: value })}
            min={-2.0}
            max={2.0}
            step={0.05}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Drag (Air Resistance)</Label>
            <span className="text-xs tabular-nums">{particlePhysicsSettings.drag.toFixed(2)}</span>
          </div>
          <Slider
            value={particlePhysicsSettings.drag}
            onValueChange={(value) => updateParticlePhysicsSettings({ drag: value })}
            min={0.0}
            max={1.0}
            step={0.01}
            className="w-full"
          />
        </div>
      </div>

      {/* Turbulence Field */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Turbulence Field</Label>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="turbulenceEnabled"
            checked={particlePhysicsSettings.turbulenceEnabled}
            onCheckedChange={(checked) => updateParticlePhysicsSettings({ turbulenceEnabled: checked as boolean })}
          />
          <Label htmlFor="turbulenceEnabled" className="text-xs cursor-pointer">
            Enable Turbulence
          </Label>
        </div>
        
        {particlePhysicsSettings.turbulenceEnabled && (
          <>
            <div className="space-y-2 pl-6">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Frequency</Label>
                <span className="text-xs tabular-nums">{particlePhysicsSettings.turbulenceFrequency.toFixed(1)}</span>
              </div>
              <Slider
                value={particlePhysicsSettings.turbulenceFrequency}
                onValueChange={(value) => updateParticlePhysicsSettings({ turbulenceFrequency: value })}
                min={0.1}
                max={10.0}
                step={0.1}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2 pl-6">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Affects Position</Label>
                <span className="text-xs tabular-nums">{particlePhysicsSettings.turbulenceAffectsPosition.toFixed(1)}</span>
              </div>
              <Slider
                value={particlePhysicsSettings.turbulenceAffectsPosition}
                onValueChange={(value) => updateParticlePhysicsSettings({ turbulenceAffectsPosition: value })}
                min={0.0}
                max={10.0}
                step={0.1}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2 pl-6">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Affects Scale</Label>
                <span className="text-xs tabular-nums">{particlePhysicsSettings.turbulenceAffectsScale.toFixed(1)}</span>
              </div>
              <Slider
                value={particlePhysicsSettings.turbulenceAffectsScale}
                onValueChange={(value) => updateParticlePhysicsSettings({ turbulenceAffectsScale: value })}
                min={0.0}
                max={2.0}
                step={0.1}
                className="w-full"
              />
            </div>
          </>
        )}
      </div>

      {/* Collisions */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Collisions</Label>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="edgeBounce"
            checked={particlePhysicsSettings.edgeBounce}
            onCheckedChange={(checked) => updateParticlePhysicsSettings({ edgeBounce: checked as boolean })}
          />
          <Label htmlFor="edgeBounce" className="text-xs cursor-pointer">
            Bounce Off Edges
          </Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="selfCollisions"
            checked={particlePhysicsSettings.selfCollisions}
            onCheckedChange={(checked) => updateParticlePhysicsSettings({ selfCollisions: checked as boolean })}
          />
          <Label htmlFor="selfCollisions" className="text-xs cursor-pointer">
            Self Collisions
          </Label>
        </div>
        
        {particlePhysicsSettings.edgeBounce && (
          <>
            <div className="space-y-2 pl-6">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Bounciness</Label>
                <span className="text-xs tabular-nums">{particlePhysicsSettings.bounciness.toFixed(2)}</span>
              </div>
              <Slider
                value={particlePhysicsSettings.bounciness}
                onValueChange={(value) => updateParticlePhysicsSettings({ bounciness: value })}
                min={0.0}
                max={1.0}
                step={0.05}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2 pl-6">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Edge Friction</Label>
                <span className="text-xs tabular-nums">{particlePhysicsSettings.edgeFriction.toFixed(2)}</span>
              </div>
              <Slider
                value={particlePhysicsSettings.edgeFriction}
                onValueChange={(value) => updateParticlePhysicsSettings({ edgeFriction: value })}
                min={0.0}
                max={1.0}
                step={0.05}
                className="w-full"
              />
            </div>
          </>
        )}
      </div>

      {/* Animation Settings */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Animation</Label>
        
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Frame Count</Label>
          <Input
            type="number"
            value={particlePhysicsSettings.frameCount}
            onChange={(e) => updateParticlePhysicsSettings({ frameCount: parseInt(e.target.value) || 1 })}
            min={1}
            max={500}
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Frame Rate (FPS)</Label>
          <Input
            type="number"
            value={particlePhysicsSettings.frameRate}
            onChange={(e) => updateParticlePhysicsSettings({ frameRate: parseInt(e.target.value) || 1 })}
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
                value={particlePhysicsSettings.seed}
                onChange={(e) => updateParticlePhysicsSettings({ seed: parseInt(e.target.value) || 0 })}
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
