import React from 'react';
import { PlaybackControls } from './PlaybackControls';
import { useAnimationStore } from '../../stores/animationStore';
import { useAnimationPlayback } from '../../hooks/useAnimationPlayback';
import { useFrameNavigation } from '../../hooks/useFrameNavigation';

interface PlaybackOverlayProps {
  isVisible: boolean;
}

/**
 * Floating playback controls overlay for when timeline is collapsed
 * Slides in from bottom of canvas when timeline panel is collapsed
 */
export const PlaybackOverlay: React.FC<PlaybackOverlayProps> = ({ isVisible }) => {
  const {
    frames,
    currentFrameIndex,
    isPlaying,
    looping,
    setLooping
  } = useAnimationStore();

  const {
    startPlayback,
    pausePlayback,
    stopPlayback,
    canPlay
  } = useAnimationPlayback();

  const {
    navigateNext,
    navigatePrevious
  } = useFrameNavigation();

  return (
    <div 
      className={`
        absolute bottom-12 left-1/2 transform -translate-x-1/2 
        transition-all ease-out z-10
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}
      `}
      style={{
        transitionDuration: '300ms',
        transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' // ease-out curve
      }}
    >
      <div className="bg-background/95 backdrop-blur-md border border-border/50 rounded-lg shadow-lg p-1">
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
      </div>
    </div>
  );
};
