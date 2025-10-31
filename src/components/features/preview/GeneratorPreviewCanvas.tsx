/**
 * GeneratorPreviewCanvas - Preview component for generator frames with playback controls
 * 
 * Features:
 * - Play/Pause button
 * - Frame scrubber slider
 * - Frame counter display
 * - Spinner overlay during generation
 * - Canvas rendering of current preview frame
 */

import { useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from '../../ui/button';
import { Slider } from '../../ui/slider';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Spinner } from '../../common/Spinner';
import { useGeneratorsStore } from '../../../stores/generatorsStore';

interface GeneratorPreviewCanvasProps {
  isPlaying: boolean;
  currentFrame: number;
  totalFrames: number;
  togglePlayback: () => void;
  scrubToFrame: (frameIndex: number) => void;
  canPlay: boolean;
}

export function GeneratorPreviewCanvas({
  isPlaying,
  currentFrame,
  totalFrames,
  togglePlayback,
  scrubToFrame,
  canPlay
}: GeneratorPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { 
    isGenerating, 
    previewFrames,
    activeGenerator,
    radioWavesSettings,
    updateRadioWavesSettings,
    turbulentNoiseSettings,
    updateTurbulentNoiseSettings,
    particlePhysicsSettings,
    updateParticlePhysicsSettings,
    rainDropsSettings,
    updateRainDropsSettings,
    digitalRainSettings,
    updateDigitalRainSettings
  } = useGeneratorsStore();

  // Get current generator settings
  const currentSettings = activeGenerator === 'radio-waves' ? radioWavesSettings
    : activeGenerator === 'turbulent-noise' ? turbulentNoiseSettings
    : activeGenerator === 'particle-physics' ? particlePhysicsSettings
    : activeGenerator === 'rain-drops' ? rainDropsSettings
    : digitalRainSettings;

  const updateCurrentSettings = activeGenerator === 'radio-waves' ? updateRadioWavesSettings
    : activeGenerator === 'turbulent-noise' ? updateTurbulentNoiseSettings
    : activeGenerator === 'particle-physics' ? updateParticlePhysicsSettings
    : activeGenerator === 'rain-drops' ? updateRainDropsSettings
    : updateDigitalRainSettings;

  // Render current preview frame to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || totalFrames === 0 || !previewFrames[currentFrame]) {
      return;
    }

    const frame = previewFrames[currentFrame];
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match frame
    canvas.width = frame.width;
    canvas.height = frame.height;

    // Create ImageData from frame data
    const imageData = new ImageData(
      new Uint8ClampedArray(frame.data),
      frame.width,
      frame.height
    );

    // Draw to canvas
    ctx.putImageData(imageData, 0, 0);
  }, [currentFrame, totalFrames, previewFrames]);
  
  return (
    <div className="space-y-3">
      {/* Preview Area */}
      <div className="relative bg-muted/30 rounded border border-border aspect-video flex items-center justify-center overflow-hidden w-full">
        {isGenerating ? (
          <div className="flex flex-col items-center gap-2">
            <Spinner size="sm" />
            <span className="text-xs text-muted-foreground">Generating preview...</span>
          </div>
        ) : totalFrames > 0 ? (
          <canvas 
            ref={canvasRef}
            style={{ 
              imageRendering: 'pixelated',
              transform: 'scaleX(0.6)', // Match CELL_ASPECT_RATIO to compress width
              transformOrigin: 'center',
              backgroundColor: 'black',
              // Compensate for the scaleX transform by making width larger
              maxWidth: '166.67%', // 100% / 0.6 to compensate for scaleX
              maxHeight: '100%',
              width: 'auto',
              height: '100%'
            }}
          />
        ) : (
          <div className="text-xs text-muted-foreground">
            No preview available
          </div>
        )}
      </div>

      {/* Playback Controls */}
      {totalFrames > 0 && (
        <div className="space-y-2">
          {/* Play/Pause and Frame Counter */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={togglePlayback}
              disabled={!canPlay || isGenerating}
              className="h-7 w-7 p-0"
            >
              {isPlaying ? (
                <Pause className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3" />
              )}
            </Button>
            
            <span className="text-xs text-muted-foreground">
              Frame {currentFrame + 1} / {totalFrames}
            </span>
          </div>

          {/* Frame Scrubber */}
          <div className="flex items-center gap-2">
            <Slider
              value={currentFrame}
              onValueChange={(value) => scrubToFrame(value)}
              min={0}
              max={Math.max(0, totalFrames - 1)}
              step={1}
              disabled={isGenerating || totalFrames === 0}
              className="flex-1"
            />
          </div>
        </div>
      )}

      {/* Frame Count and Frame Rate Controls */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Frame Count</Label>
          <Input
            type="number"
            value={currentSettings.frameCount}
            onChange={(e) => updateCurrentSettings({ frameCount: parseInt(e.target.value) || 1 })}
            min={1}
            max={500}
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Frame Rate (FPS)</Label>
          <Input
            type="number"
            value={currentSettings.frameRate}
            onChange={(e) => updateCurrentSettings({ frameRate: parseInt(e.target.value) || 1 })}
            min={1}
            max={60}
            className="h-8 text-xs"
          />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />
    </div>
  );
}
