import React, { useCallback, useRef } from 'react';
import { useAnimationStore } from '../../stores/animationStore';
import { useCanvasStore } from '../../stores/canvasStore';
import { useAnimationPlayback } from '../../hooks/useAnimationPlayback';
import { useFrameNavigation } from '../../hooks/useFrameNavigation';
import { FrameThumbnail } from './FrameThumbnail';
import { PlaybackControls } from './PlaybackControls';
import { FrameControls } from './FrameControls';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { MAX_LIMITS } from '../../constants';

/**
 * Main animation timeline component
 * Combines frame thumbnails, playback controls, and frame management
 */
export const AnimationTimeline: React.FC = () => {
  const { width: canvasWidth, height: canvasHeight } = useCanvasStore();
  const {
    frames,
    currentFrameIndex,
    isPlaying,
    looping,
    addFrame,
    removeFrame,
    duplicateFrame,
    updateFrameDuration,
    reorderFrames,
    setLooping,
    goToFrame
  } = useAnimationStore();

  const {
    startPlayback,
    pausePlayback,
    stopPlayback,
    canPlay
  } = useAnimationPlayback();

  const {
    navigateToFrame,
    navigateNext,
    navigatePrevious
  } = useFrameNavigation();

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Handle frame selection
  const handleFrameSelect = useCallback((frameIndex: number) => {
    if (!isPlaying) {
      navigateToFrame(frameIndex);
    }
  }, [isPlaying, navigateToFrame]);

  // Handle adding new frame
  const handleAddFrame = useCallback(() => {
    if (frames.length < MAX_LIMITS.FRAME_COUNT) {
      addFrame(currentFrameIndex + 1);
    }
  }, [frames.length, currentFrameIndex, addFrame]);

  // Handle duplicating current frame
  const handleDuplicateFrame = useCallback(() => {
    if (frames.length < MAX_LIMITS.FRAME_COUNT) {
      duplicateFrame(currentFrameIndex);
    }
  }, [frames.length, currentFrameIndex, duplicateFrame]);

  // Handle deleting current frame
  const handleDeleteFrame = useCallback(() => {
    if (frames.length > 1) {
      removeFrame(currentFrameIndex);
    }
  }, [frames.length, currentFrameIndex, removeFrame]);

  // Handle individual frame duplicate
  const handleFrameDuplicate = useCallback((frameIndex: number) => {
    if (frames.length < MAX_LIMITS.FRAME_COUNT) {
      duplicateFrame(frameIndex);
    }
  }, [frames.length, duplicateFrame]);

  // Handle individual frame delete
  const handleFrameDelete = useCallback((frameIndex: number) => {
    if (frames.length > 1) {
      removeFrame(frameIndex);
    }
  }, [frames.length, removeFrame]);

  // Handle frame duration change
  const handleFrameDurationChange = useCallback((frameIndex: number, duration: number) => {
    updateFrameDuration(frameIndex, duration);
  }, [updateFrameDuration]);

  // Calculate total animation duration
  const totalDuration = frames.reduce((total, frame) => total + frame.duration, 0);

  return (
    <Card className="">
      <CardHeader className="pb-2 py-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Animation Timeline</CardTitle>
          <div className="text-xs text-muted-foreground">
            {frames.length} frame{frames.length !== 1 ? 's' : ''} • {(totalDuration / 1000).toFixed(1)}s
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 p-3">
        {/* Combined Controls Row */}
        <div className="flex items-center justify-between">
          {/* Playback Controls - Left Side */}
          <PlaybackControls
            isPlaying={isPlaying}
            canPlay={canPlay}
            currentFrame={currentFrameIndex}
            totalFrames={frames.length}
            onPlay={startPlayback}
            onPause={pausePlayback}
            onStop={stopPlayback}
            onPrevious={navigatePrevious}
            onNext={navigateNext}
            onToggleLoop={() => setLooping(!looping)}
            isLooping={looping}
          />

          {/* Frame Controls - Right Side */}
          <div className="flex items-center gap-4">
            <FrameControls
              canAddFrame={frames.length < MAX_LIMITS.FRAME_COUNT}
              canDeleteFrame={frames.length > 1}
              onAddFrame={handleAddFrame}
              onDuplicateFrame={handleDuplicateFrame}
              onDeleteFrame={handleDeleteFrame}
              disabled={isPlaying}
            />
            <div className="text-xs text-muted-foreground">
              {frames.length}/{MAX_LIMITS.FRAME_COUNT}
            </div>
          </div>
        </div>

        {/* Frame Timeline */}
        <div className="space-y-1">
          <h4 className="text-xs font-medium text-muted-foreground">Frames</h4>
          <div className="w-full overflow-x-auto" ref={scrollAreaRef}>
            <div className="flex gap-2 pb-1" style={{ minWidth: 'max-content' }}>
              {frames.map((frame, index) => (
                <FrameThumbnail
                  key={frame.id}
                  frame={frame}
                  frameIndex={index}
                  isSelected={index === currentFrameIndex}
                  canvasWidth={canvasWidth}
                  canvasHeight={canvasHeight}
                  onSelect={() => handleFrameSelect(index)}
                  onDuplicate={() => handleFrameDuplicate(index)}
                  onDelete={() => handleFrameDelete(index)}
                  onDurationChange={(duration) => handleFrameDurationChange(index, duration)}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
