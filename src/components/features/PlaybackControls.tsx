import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Play, Pause, Square, SkipBack, SkipForward, RotateCcw } from 'lucide-react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  canPlay: boolean;
  currentFrame: number;
  totalFrames: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onToggleLoop: () => void;
  isLooping: boolean;
}

/**
 * Animation playback controls component
 * Provides play, pause, stop, navigation, and loop controls
 */
export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  canPlay,
  currentFrame,
  totalFrames,
  onPlay,
  onPause,
  onStop,
  onPrevious,
  onNext,
  onToggleLoop,
  isLooping
}) => {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg border">
        {/* Previous frame */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              onClick={onPrevious}
              disabled={isPlaying || currentFrame === 0}
              className="h-8 w-8 p-0"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Previous frame (,)</TooltipContent>
        </Tooltip>

        {/* Play/Pause */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant={isPlaying ? "default" : "outline"}
              onClick={isPlaying ? onPause : onPlay}
              disabled={!canPlay}
              className="h-8 w-8 p-0"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          </TooltipContent>
        </Tooltip>

        {/* Stop */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              onClick={onStop}
              disabled={!isPlaying}
              className="h-8 w-8 p-0"
            >
              <Square className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Stop (Esc)</TooltipContent>
        </Tooltip>

        {/* Next frame */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              onClick={onNext}
              disabled={isPlaying || currentFrame === totalFrames - 1}
              className="h-8 w-8 p-0"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Next frame (.)</TooltipContent>
        </Tooltip>

        {/* Separator */}
        <div className="w-px h-6 bg-border mx-1" />

        {/* Frame indicator */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Frame:</span>
          <Badge variant="secondary" className="text-sm min-w-[3rem] justify-center">
            {currentFrame + 1} / {totalFrames}
          </Badge>
        </div>

        {/* Loop toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant={isLooping ? "default" : "outline"}
              onClick={onToggleLoop}
              className="h-8 w-8 p-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isLooping ? 'Disable loop' : 'Enable loop'}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
