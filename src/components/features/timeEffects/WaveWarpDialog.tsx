import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { DraggableDialogBar } from '@/components/common/DraggableDialogBar';
import { useTimeEffectsStore } from '@/stores/timeEffectsStore';
import { useTimeEffectsHistory } from '@/hooks/useTimeEffectsHistory';
import { useAnimationStore } from '@/stores/animationStore';
import { 
  DEFAULT_WAVE_WARP_SETTINGS, 
  WAVE_WARP_RANGES,
  DEFAULT_FRAME_RANGE_SETTINGS 
} from '@/constants/timeEffects';
import type { WaveAxis, FrameRangeSettings } from '@/types/timeEffects';
import { Eye, EyeOff } from 'lucide-react';

export const WaveWarpDialog: React.FC = () => {
  const { 
    isWaveWarpDialogOpen, 
    closeWaveWarpDialog,
    waveWarpSettings,
    updateWaveWarpSettings,
    frameRange,
    updateFrameRange,
    isPreviewActive,
    startPreview,
    stopPreview
  } = useTimeEffectsStore();
  
  const { applyWaveWarpWithHistory } = useTimeEffectsHistory();
  const { frames } = useAnimationStore();

  // Dialog state
  const [positionOffset, setPositionOffset] = useState({ x: 0, y: 0 });
  const [isDraggingDialog, setIsDraggingDialog] = useState(false);
  const [hasBeenDragged, setHasBeenDragged] = useState(false);
  const dragStartOffsetRef = useRef({ x: 0, y: 0 });
  const dialogRef = useRef<HTMLDivElement>(null);
  
  // Local frame range state (separate from effect settings)
  const [localFrameRange, setLocalFrameRange] = useState<FrameRangeSettings>(DEFAULT_FRAME_RANGE_SETTINGS);
  
  // Reset position and settings when dialog opens
  useEffect(() => {
    if (isWaveWarpDialogOpen) {
      setPositionOffset({ x: 0, y: 0 });
      setHasBeenDragged(false);
      // Reset to defaults
      updateWaveWarpSettings(DEFAULT_WAVE_WARP_SETTINGS);
      setLocalFrameRange({
        startFrame: 0,
        endFrame: Math.max(0, frames.length - 1),
        allFrames: true
      });
    }
  }, [isWaveWarpDialogOpen, frames.length, updateWaveWarpSettings]);

  // Stop preview when dialog closes
  useEffect(() => {
    if (!isWaveWarpDialogOpen && isPreviewActive) {
      stopPreview();
    }
  }, [isWaveWarpDialogOpen, isPreviewActive, stopPreview]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isWaveWarpDialogOpen) return;
      
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
  }, [isWaveWarpDialogOpen]);

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
  const handleSettingChange = (updates: Partial<typeof waveWarpSettings>) => {
    updateWaveWarpSettings(updates);
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
      startPreview('wave-warp');
    }
  };

  // Apply changes
  const handleApply = () => {
    applyWaveWarpWithHistory(waveWarpSettings, localFrameRange);
    closeWaveWarpDialog();
  };

  // Cancel and close
  const handleCancel = () => {
    if (isPreviewActive) {
      stopPreview();
    }
    closeWaveWarpDialog();
  };

  // Calculate dialog position (lower-left corner)
  const getDialogPosition = () => {
    const dialogWidth = 480;
    const dialogHeight = 600;
    const margin = 20;
    
    return {
      bottom: margin,
      left: margin,
      width: dialogWidth,
      maxHeight: dialogHeight
    };
  };

  if (!isWaveWarpDialogOpen) return null;

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
          title="Wave Warp Effect" 
          onDrag={handleDrag}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onClose={handleCancel}
        />
        
        <div className="p-6 space-y-6 max-h-[500px] overflow-y-auto">
          <div className="text-sm text-muted-foreground">
            Apply wave displacement to character content over time. Characters move in sine wave patterns.
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

          {/* Wave Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Wave Parameters</h3>
            
            {/* Axis Selection */}
            <div className="space-y-2">
              <Label htmlFor="axis-select">Wave Axis</Label>
              <Select
                value={waveWarpSettings.axis}
                onValueChange={(value: WaveAxis) => handleSettingChange({ axis: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="horizontal">Horizontal</SelectItem>
                  <SelectItem value="vertical">Vertical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Frequency */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Frequency</Label>
                <span className="text-xs text-muted-foreground">{waveWarpSettings.frequency.toFixed(1)}</span>
              </div>
              <Slider
                value={[waveWarpSettings.frequency]}
                onValueChange={([value]) => handleSettingChange({ frequency: value })}
                min={WAVE_WARP_RANGES.FREQUENCY.min}
                max={WAVE_WARP_RANGES.FREQUENCY.max}
                step={WAVE_WARP_RANGES.FREQUENCY.step}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                Range: {WAVE_WARP_RANGES.FREQUENCY.min} - {WAVE_WARP_RANGES.FREQUENCY.max}
              </div>
            </div>

            {/* Amplitude */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Amplitude</Label>
                <span className="text-xs text-muted-foreground">{waveWarpSettings.amplitude}</span>
              </div>
              <Slider
                value={[waveWarpSettings.amplitude]}
                onValueChange={([value]) => handleSettingChange({ amplitude: value })}
                min={WAVE_WARP_RANGES.AMPLITUDE.min}
                max={WAVE_WARP_RANGES.AMPLITUDE.max}
                step={WAVE_WARP_RANGES.AMPLITUDE.step}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                Range: {WAVE_WARP_RANGES.AMPLITUDE.min} - {WAVE_WARP_RANGES.AMPLITUDE.max} characters
              </div>
            </div>

            {/* Speed */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Speed</Label>
                <span className="text-xs text-muted-foreground">{waveWarpSettings.speed}ms</span>
              </div>
              <Slider
                value={[waveWarpSettings.speed]}
                onValueChange={([value]) => handleSettingChange({ speed: value })}
                min={WAVE_WARP_RANGES.SPEED.min}
                max={WAVE_WARP_RANGES.SPEED.max}
                step={WAVE_WARP_RANGES.SPEED.step}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                Range: {WAVE_WARP_RANGES.SPEED.min} - {WAVE_WARP_RANGES.SPEED.max}ms per cycle
              </div>
            </div>

            {/* Phase Offset */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Phase Offset</Label>
                <span className="text-xs text-muted-foreground">{waveWarpSettings.phase}°</span>
              </div>
              <Slider
                value={[waveWarpSettings.phase]}
                onValueChange={([value]) => handleSettingChange({ phase: value })}
                min={WAVE_WARP_RANGES.PHASE.min}
                max={WAVE_WARP_RANGES.PHASE.max}
                step={WAVE_WARP_RANGES.PHASE.step}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                Range: {WAVE_WARP_RANGES.PHASE.min} - {WAVE_WARP_RANGES.PHASE.max} degrees
              </div>
            </div>
          </div>

          {/* Frame Range Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Frame Range</h3>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="all-frames"
                checked={localFrameRange.allFrames}
                onCheckedChange={(checked) => 
                  handleFrameRangeChange({ allFrames: checked === true })
                }
              />
              <Label htmlFor="all-frames" className="text-sm">
                Apply to all frames
              </Label>
            </div>

            {!localFrameRange.allFrames && (
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
              {localFrameRange.allFrames 
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
            Apply Wave Warp
          </Button>
        </div>
      </Card>
    </div>,
    document.body
  );
};