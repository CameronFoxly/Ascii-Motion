import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DraggableDialogBar } from '@/components/common/DraggableDialogBar';
import { useTimeEffectsStore } from '@/stores/timeEffectsStore';
import { useTimeEffectsHistory } from '@/hooks/useTimeEffectsHistory';
import { useAnimationStore } from '@/stores/animationStore';
import { 
  DEFAULT_WIGGLE_SETTINGS, 
  WIGGLE_RANGES
} from '@/constants/timeEffects';
import type { WiggleMode, FrameRangeSettings } from '@/types/timeEffects';
import { Eye, EyeOff, Waves, Zap } from 'lucide-react';

export const WiggleDialog: React.FC = () => {
  const { 
    isWiggleDialogOpen, 
    closeWiggleDialog,
    wiggleSettings,
    updateWiggleSettings,
    updateFrameRange,
    isPreviewActive,
    startPreview,
    stopPreview,
    updatePreview
  } = useTimeEffectsStore();
  
  const { applyWiggleWithHistory } = useTimeEffectsHistory();
  const { frames, currentFrameIndex } = useAnimationStore();

  // Dialog state
  const [positionOffset, setPositionOffset] = useState({ x: 0, y: 0 });
  const [isDraggingDialog, setIsDraggingDialog] = useState(false);
  const [hasBeenDragged, setHasBeenDragged] = useState(false);
  const dragStartOffsetRef = useRef({ x: 0, y: 0 });
  const dialogRef = useRef<HTMLDivElement>(null);
  
  // Local frame range state
  const [localFrameRange, setLocalFrameRange] = useState<FrameRangeSettings>({
    applyToAll: true,
    startFrame: 0,
    endFrame: 0
  });
  
  // Reset position and settings when dialog opens
  useEffect(() => {
    if (isWiggleDialogOpen) {
      setPositionOffset({ x: 0, y: 0 });
      setHasBeenDragged(false);
      // Reset to defaults
      updateWiggleSettings(DEFAULT_WIGGLE_SETTINGS);
      setLocalFrameRange({
        startFrame: 0,
        endFrame: Math.max(0, frames.length - 1),
        applyToAll: true
      });
      
      // Auto-start preview (default to on) - temporarily disabled for debugging
      // setTimeout(() => {
      //   if (!isPreviewActive) {
      //     startPreview('wiggle');
      //   }
      // }, 100); // Small delay to ensure dialog is fully mounted
    }
  }, [isWiggleDialogOpen, frames.length, updateWiggleSettings, isPreviewActive, startPreview]);

  // Stop preview when dialog closes
  useEffect(() => {
    if (!isWiggleDialogOpen && isPreviewActive) {
      stopPreview();
    }
  }, [isWiggleDialogOpen, isPreviewActive, stopPreview]);

  // Update preview when current frame changes
  useEffect(() => {
    if (isWiggleDialogOpen && isPreviewActive) {
      updatePreview();
    }
  }, [currentFrameIndex, isWiggleDialogOpen, isPreviewActive, updatePreview]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isWiggleDialogOpen) return;
      
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCancel();
      } else if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleApply();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isWiggleDialogOpen]);

  // Dragging handlers
  const handleDrag = useCallback((deltaX: number, deltaY: number) => {
    setPositionOffset({
      x: dragStartOffsetRef.current.x + deltaX,
      y: dragStartOffsetRef.current.y + deltaY
    });
  }, []);
  
  const handleDragStart = useCallback(() => {
    setIsDraggingDialog(true);
    setHasBeenDragged(true);
    dragStartOffsetRef.current = { ...positionOffset };
  }, [positionOffset]);
  
  const handleDragEnd = useCallback(() => {
    setIsDraggingDialog(false);
    dragStartOffsetRef.current = { ...positionOffset };
  }, [positionOffset]);

  // Handle settings changes with preview update
  const handleSettingChange = (updates: Partial<typeof wiggleSettings>) => {
    updateWiggleSettings(updates);
    if (isPreviewActive) {
      // Preview updates automatically through store
    }
  };

  // Handle frame range changes
  const handleFrameRangeChange = (updates: Partial<FrameRangeSettings>) => {
    const newRange = { ...localFrameRange, ...updates };
    setLocalFrameRange(newRange);
    updateFrameRange(newRange);
  };

  // Toggle preview
  const handlePreviewToggle = () => {
    if (isPreviewActive) {
      stopPreview();
    } else {
      startPreview('wiggle');
    }
  };

  // Apply changes
  const handleApply = async () => {
    // Update the frame range in store before applying
    updateFrameRange(localFrameRange);
    const success = await applyWiggleWithHistory();
    if (success) {
      closeWiggleDialog();
    }
  };

  // Cancel and close
  const handleCancel = () => {
    if (isPreviewActive) {
      stopPreview();
    }
    closeWiggleDialog();
  };

  // Generate new random seed
  const generateNewSeed = () => {
    const newSeed = Math.floor(Math.random() * 10000);
    handleSettingChange({ noiseSeed: newSeed });
  };

  // Calculate dialog position (lower-left corner, offset from WaveWarp)
  const getDialogPosition = () => {
    const dialogWidth = 520;
    const dialogHeight = 700;
    const margin = 8;
    
    return {
      bottom: margin,
      left: margin + 500, // Offset from WaveWarp dialog
      width: dialogWidth,
      maxHeight: dialogHeight
    };
  };

  // Check if current mode is wave-based or noise-based
  const isWaveMode = wiggleSettings.mode === 'horizontal-wave' || wiggleSettings.mode === 'vertical-wave';
  const isNoiseMode = wiggleSettings.mode === 'noise';

  if (!isWiggleDialogOpen) return null;

  const position = getDialogPosition();

  return createPortal(
    <div
      ref={dialogRef}
      className={`fixed z-[99999] ${
        !hasBeenDragged ? 'animate-in duration-200 slide-in-from-bottom-4 fade-in-0' : ''
      }`}
      style={{
        bottom: position.bottom - positionOffset.y,
        left: position.left + positionOffset.x,
        width: position.width,
        maxHeight: position.maxHeight,
        transition: isDraggingDialog ? 'none' : undefined
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <Card className="border border-border/50 shadow-lg">
        <DraggableDialogBar 
          title="Wiggle Effect" 
          onDrag={handleDrag}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onClose={handleCancel}
        />
        
        <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
          <div className="text-sm text-muted-foreground">
            Apply wiggle displacement to all characters together. Choose from wave patterns or noise-based motion.
          </div>
          
          {/* Live Preview Toggle */}
          <div className="flex items-center justify-between p-3 border border-border/50 rounded-lg bg-muted/20">
            <div className="flex items-center gap-2">
              {isPreviewActive ? (
                <Eye className="h-4 w-4 text-primary" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">Live Preview</span>
            </div>
            <Button
              variant={isPreviewActive ? "default" : "outline"}
              size="sm"
              onClick={handlePreviewToggle}
            >
              {isPreviewActive ? 'Stop' : 'Start'}
            </Button>
          </div>

          {/* Mode Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Wiggle Mode</h3>
            
            <Select
              value={wiggleSettings.mode}
              onValueChange={(value: WiggleMode) => handleSettingChange({ mode: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="horizontal-wave">
                  <div className="flex items-center gap-2">
                    <Waves className="h-4 w-4" />
                    <span>Horizontal Wave</span>
                  </div>
                </SelectItem>
                <SelectItem value="vertical-wave">
                  <div className="flex items-center gap-2">
                    <Waves className="h-4 w-4 rotate-90" />
                    <span>Vertical Wave</span>
                  </div>
                </SelectItem>
                <SelectItem value="noise">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    <span>Perlin Noise</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
              {isWaveMode && "Wave modes create smooth sine wave motion in the selected direction."}
              {isNoiseMode && "Noise mode creates organic, random-like motion using Perlin noise."}
            </div>
          </div>

          {/* Dynamic Settings based on Mode */}
          <Tabs value={isWaveMode ? "wave" : "noise"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="wave" disabled={!isWaveMode}>
                <Waves className="h-4 w-4 mr-2" />
                Wave Settings
              </TabsTrigger>
              <TabsTrigger value="noise" disabled={!isNoiseMode}>
                <Zap className="h-4 w-4 mr-2" />
                Noise Settings
              </TabsTrigger>
            </TabsList>

            {/* Wave Settings Tab */}
            <TabsContent value="wave" className="space-y-4 mt-4">
              <h4 className="text-sm font-medium">Wave Parameters</h4>
              
              {/* Wave Frequency */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Frequency</Label>
                  <span className="text-xs text-muted-foreground">{wiggleSettings.waveFrequency.toFixed(1)}</span>
                </div>
                <Slider
                  value={wiggleSettings.waveFrequency}
                  onValueChange={(value) => handleSettingChange({ waveFrequency: value })}
                  min={WIGGLE_RANGES.WAVE_FREQUENCY.min}
                  max={WIGGLE_RANGES.WAVE_FREQUENCY.max}
                  step={WIGGLE_RANGES.WAVE_FREQUENCY.step}
                  className="w-full"
                />
                <div className="text-xs text-muted-foreground">
                  Range: {WIGGLE_RANGES.WAVE_FREQUENCY.min} - {WIGGLE_RANGES.WAVE_FREQUENCY.max}
                </div>
              </div>

              {/* Wave Amplitude */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Amplitude</Label>
                  <span className="text-xs text-muted-foreground">{wiggleSettings.waveAmplitude}</span>
                </div>
                <Slider
                  value={wiggleSettings.waveAmplitude}
                  onValueChange={(value) => handleSettingChange({ waveAmplitude: value })}
                  min={WIGGLE_RANGES.WAVE_AMPLITUDE.min}
                  max={WIGGLE_RANGES.WAVE_AMPLITUDE.max}
                  step={WIGGLE_RANGES.WAVE_AMPLITUDE.step}
                  className="w-full"
                />
                <div className="text-xs text-muted-foreground">
                  Range: {WIGGLE_RANGES.WAVE_AMPLITUDE.min} - {WIGGLE_RANGES.WAVE_AMPLITUDE.max} characters
                </div>
              </div>

              {/* Wave Speed */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Speed</Label>
                  <span className="text-xs text-muted-foreground">{wiggleSettings.waveSpeed}ms</span>
                </div>
                <Slider
                  value={wiggleSettings.waveSpeed}
                  onValueChange={(value) => handleSettingChange({ waveSpeed: value })}
                  min={WIGGLE_RANGES.WAVE_SPEED.min}
                  max={WIGGLE_RANGES.WAVE_SPEED.max}
                  step={WIGGLE_RANGES.WAVE_SPEED.step}
                  className="w-full"
                />
                <div className="text-xs text-muted-foreground">
                  Range: {WIGGLE_RANGES.WAVE_SPEED.min} - {WIGGLE_RANGES.WAVE_SPEED.max}ms per cycle
                </div>
              </div>
            </TabsContent>

            {/* Noise Settings Tab */}
            <TabsContent value="noise" className="space-y-4 mt-4">
              <h4 className="text-sm font-medium">Perlin Noise Parameters</h4>
              
              {/* Noise Octaves */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Octaves (Detail)</Label>
                  <span className="text-xs text-muted-foreground">{wiggleSettings.noiseOctaves}</span>
                </div>
                <Slider
                  value={wiggleSettings.noiseOctaves}
                  onValueChange={(value) => handleSettingChange({ noiseOctaves: Math.round(value) })}
                  min={WIGGLE_RANGES.NOISE_OCTAVES.min}
                  max={WIGGLE_RANGES.NOISE_OCTAVES.max}
                  step={WIGGLE_RANGES.NOISE_OCTAVES.step}
                  className="w-full"
                />
                <div className="text-xs text-muted-foreground">
                  Range: {WIGGLE_RANGES.NOISE_OCTAVES.min} - {WIGGLE_RANGES.NOISE_OCTAVES.max} layers
                </div>
              </div>

              {/* Noise Frequency */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Frequency (Scale)</Label>
                  <span className="text-xs text-muted-foreground">{wiggleSettings.noiseFrequency.toFixed(3)}</span>
                </div>
                <Slider
                  value={wiggleSettings.noiseFrequency}
                  onValueChange={(value) => handleSettingChange({ noiseFrequency: value })}
                  min={WIGGLE_RANGES.NOISE_FREQUENCY.min}
                  max={WIGGLE_RANGES.NOISE_FREQUENCY.max}
                  step={WIGGLE_RANGES.NOISE_FREQUENCY.step}
                  className="w-full"
                />
                <div className="text-xs text-muted-foreground">
                  Range: {WIGGLE_RANGES.NOISE_FREQUENCY.min} - {WIGGLE_RANGES.NOISE_FREQUENCY.max}
                </div>
              </div>

              {/* Noise Amplitude */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Amplitude</Label>
                  <span className="text-xs text-muted-foreground">{wiggleSettings.noiseAmplitude}</span>
                </div>
                <Slider
                  value={wiggleSettings.noiseAmplitude}
                  onValueChange={(value) => handleSettingChange({ noiseAmplitude: value })}
                  min={WIGGLE_RANGES.NOISE_AMPLITUDE.min}
                  max={WIGGLE_RANGES.NOISE_AMPLITUDE.max}
                  step={WIGGLE_RANGES.NOISE_AMPLITUDE.step}
                  className="w-full"
                />
                <div className="text-xs text-muted-foreground">
                  Range: {WIGGLE_RANGES.NOISE_AMPLITUDE.min} - {WIGGLE_RANGES.NOISE_AMPLITUDE.max} characters
                </div>
              </div>

              {/* Noise Seed */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Random Seed</Label>
                  <Button variant="outline" size="sm" onClick={generateNewSeed}>
                    New Seed
                  </Button>
                </div>
                <Input
                  type="number"
                  value={wiggleSettings.noiseSeed}
                  onChange={(e) => handleSettingChange({ noiseSeed: parseInt(e.target.value) || 0 })}
                  min={WIGGLE_RANGES.NOISE_SEED.min}
                  max={WIGGLE_RANGES.NOISE_SEED.max}
                  className="w-full"
                />
                <div className="text-xs text-muted-foreground">
                  Range: {WIGGLE_RANGES.NOISE_SEED.min} - {WIGGLE_RANGES.NOISE_SEED.max}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Frame Range Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Frame Range</h3>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="all-frames"
                checked={localFrameRange.applyToAll}
                onCheckedChange={(checked) => 
                  handleFrameRangeChange({ applyToAll: checked === true })
                }
              />
              <Label htmlFor="all-frames" className="text-sm">
                Apply to all frames
              </Label>
            </div>

            {!localFrameRange.applyToAll && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-frame">Start Frame</Label>
                  <Input
                    id="start-frame"
                    type="number"
                    value={localFrameRange.startFrame + 1}
                    onChange={(e) => handleFrameRangeChange({ 
                      startFrame: Math.max(0, parseInt(e.target.value) - 1 || 0)
                    })}
                    min={1}
                    max={frames.length}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-frame">End Frame</Label>
                  <Input
                    id="end-frame"
                    type="number"
                    value={localFrameRange.endFrame + 1}
                    onChange={(e) => handleFrameRangeChange({ 
                      endFrame: Math.min(frames.length - 1, parseInt(e.target.value) - 1 || frames.length - 1)
                    })}
                    min={1}
                    max={frames.length}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
              {localFrameRange.applyToAll 
                ? `Will apply to all ${frames.length} frames`
                : `Will apply to frames ${localFrameRange.startFrame + 1} - ${localFrameRange.endFrame + 1} (${localFrameRange.endFrame - localFrameRange.startFrame + 1} frames)`
              }
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 p-6 pt-0">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply Wiggle
          </Button>
        </div>
      </Card>
    </div>,
    document.body
  );
};