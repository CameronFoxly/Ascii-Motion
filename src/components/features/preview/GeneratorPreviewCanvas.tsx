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

import { Play, Pause } from 'lucide-react';
import { Button } from '../../ui/button';
import { Slider } from '../../ui/slider';
import { Spinner } from '../../common/Spinner';
import { useGeneratorPreview } from '../../../hooks/useGeneratorPreview';
import { useGeneratorsStore } from '../../../stores/generatorsStore';

export function GeneratorPreviewCanvas() {
  const { isGenerating } = useGeneratorsStore();
  const { 
    isPlaying, 
    currentFrame, 
    totalFrames, 
    togglePlayback, 
    scrubToFrame,
    canPlay 
  } = useGeneratorPreview();

  // TODO: Phase 4 - Actually render the RGBA frame data to canvas
  // For now, just show placeholder
  
  return (
    <div className="space-y-3">
      {/* Preview Area */}
      <div className="relative bg-muted/30 rounded border border-border aspect-video flex items-center justify-center">
        {isGenerating ? (
          <div className="flex flex-col items-center gap-2">
            <Spinner size="sm" />
            <span className="text-xs text-muted-foreground">Generating preview...</span>
          </div>
        ) : totalFrames > 0 ? (
          <div className="text-xs text-muted-foreground">
            Preview: Frame {currentFrame + 1} of {totalFrames}
          </div>
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
