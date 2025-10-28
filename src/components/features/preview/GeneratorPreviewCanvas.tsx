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
import { Spinner } from '../../common/Spinner';
import { useGeneratorPreview } from '../../../hooks/useGeneratorPreview';
import { useGeneratorsStore } from '../../../stores/generatorsStore';

export function GeneratorPreviewCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isGenerating, previewFrames } = useGeneratorsStore();
  const { 
    isPlaying, 
    currentFrame, 
    totalFrames, 
    togglePlayback, 
    scrubToFrame,
    canPlay 
  } = useGeneratorPreview();

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
            style={{ imageRendering: 'pixelated' }}
            className="w-full h-full object-contain"
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
    </div>
  );
}
