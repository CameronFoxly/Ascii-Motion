import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAnimationStore } from '../../stores/animationStore';
import { useCanvasStore } from '../../stores/canvasStore';
import { useAnimationPlayback } from '../../hooks/useAnimationPlayback';
import { useOptimizedPlayback } from '../../hooks/useOptimizedPlayback';
import { useFrameNavigation } from '../../hooks/useFrameNavigation';
import { useAnimationHistory } from '../../hooks/useAnimationHistory';
import { useTimeEffectsStore } from '../../stores/timeEffectsStore';
import { FrameThumbnail } from './FrameThumbnail';
import { PlaybackControls } from './PlaybackControls';
import { FrameControls } from './FrameControls';
import { OnionSkinControls } from './OnionSkinControls';
import { TimelineZoomControl } from './TimelineZoomControl';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { Menu, Clock, Plus, Zap } from 'lucide-react';
import { MAX_LIMITS } from '../../constants';

const AUTO_SCROLL_EDGE_RATIO = 0.1; // 10% edge band for auto-scrolling
const AUTO_SCROLL_MIN_SPEED = 30; // px per second at edge boundary
const AUTO_SCROLL_MAX_SPEED = 840; // px per second when cursor touches edge

/**
 * Main animation timeline component
 * Combines frame thumbnails, playback controls, and frame management
 */
export const AnimationTimeline: React.FC = () => {
  const { width: canvasWidth, height: canvasHeight } = useCanvasStore();
  const {
    frames,
    currentFrameIndex,
    selectedFrameIndices,
    isPlaying,
    looping,
    onionSkin,
    timelineZoom,
    setLooping,
    setDraggingFrame,
    selectFrameRange,
    clearSelection,
    isFrameSelected
  } = useAnimationStore();

  // Helper to get selected frame indices as sorted array
  const getSelectedFrames = useCallback(() => {
    return Array.from(selectedFrameIndices).sort((a, b) => a - b);
  }, [selectedFrameIndices]);

  // Use history-enabled animation actions
  const {
    addFrame,
    removeFrame,
    duplicateFrame,
    duplicateFrameRange,
    updateFrameDuration,
    reorderFrames,
    deleteFrameRange,
    reorderFrameRange
  } = useAnimationHistory();

  const {
    canPlay
  } = useAnimationPlayback();

  const {
    startOptimizedPlayback,
    stopOptimizedPlayback
  } = useOptimizedPlayback();

  const {
    navigateToFrame,
    navigateNext,
    navigatePrevious,
    navigateFirst,
    navigateLast
  } = useFrameNavigation();

  // Optimized playback is now the default - track when it's active
  const [isOptimizedPlaybackActive, setIsOptimizedPlaybackActive] = useState(false);
  


  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const autoScrollFrameRef = useRef<number | null>(null);
  const autoScrollLastTimeRef = useRef<number | null>(null);
  const autoScrollVelocityRef = useRef<number>(0);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollFrameRef.current !== null) {
      cancelAnimationFrame(autoScrollFrameRef.current);
    }
    autoScrollFrameRef.current = null;
    autoScrollLastTimeRef.current = null;
    autoScrollVelocityRef.current = 0;
  }, []);

  const stepAutoScroll = useCallback((timestamp: number) => {
    const container = scrollContainerRef.current;
    if (!container) {
      stopAutoScroll();
      return;
    }

    if (autoScrollVelocityRef.current === 0) {
      stopAutoScroll();
      return;
    }

    const lastTimestamp = autoScrollLastTimeRef.current ?? timestamp;
    const deltaSeconds = (timestamp - lastTimestamp) / 1000;
    autoScrollLastTimeRef.current = timestamp;

    if (deltaSeconds > 0) {
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (maxScroll <= 0) {
        stopAutoScroll();
        return;
      }

      const nextScroll = container.scrollLeft + autoScrollVelocityRef.current * deltaSeconds;
      const clampedScroll = Math.max(0, Math.min(maxScroll, nextScroll));
      const hitBoundary = (
        (clampedScroll === 0 && autoScrollVelocityRef.current < 0) ||
        (clampedScroll === maxScroll && autoScrollVelocityRef.current > 0)
      );

      container.scrollLeft = clampedScroll;

      if (hitBoundary) {
        autoScrollVelocityRef.current = 0;
      }
    }

    if (autoScrollVelocityRef.current !== 0) {
      autoScrollFrameRef.current = requestAnimationFrame(stepAutoScroll);
    } else {
      stopAutoScroll();
    }
  }, [stopAutoScroll]);

  const startAutoScroll = useCallback(() => {
    if (autoScrollFrameRef.current === null) {
      autoScrollLastTimeRef.current = null;
      autoScrollFrameRef.current = requestAnimationFrame(stepAutoScroll);
    }
  }, [stepAutoScroll]);

  const updateAutoScrollFromEvent = useCallback((event: React.DragEvent) => {
    if (!scrollContainerRef.current || draggedIndex === null) {
      if (autoScrollVelocityRef.current !== 0) {
        stopAutoScroll();
      }
      return;
    }

    const container = scrollContainerRef.current;
    const rect = container.getBoundingClientRect();
    const threshold = rect.width * AUTO_SCROLL_EDGE_RATIO;
    const maxScroll = container.scrollWidth - container.clientWidth;

    let velocity = 0;

    if (threshold > 0) {
      const { clientX } = event;

      if (clientX < rect.left + threshold) {
        const distance = rect.left + threshold - clientX;
        const intensity = Math.min(1, distance / threshold);
        velocity = -(
          AUTO_SCROLL_MIN_SPEED +
          intensity * (AUTO_SCROLL_MAX_SPEED - AUTO_SCROLL_MIN_SPEED)
        );
      } else if (clientX > rect.right - threshold) {
        const distance = clientX - (rect.right - threshold);
        const intensity = Math.min(1, distance / threshold);
        velocity = AUTO_SCROLL_MIN_SPEED +
          intensity * (AUTO_SCROLL_MAX_SPEED - AUTO_SCROLL_MIN_SPEED);
      }
    }

    if (
      maxScroll <= 0 ||
      (velocity < 0 && container.scrollLeft <= 0) ||
      (velocity > 0 && container.scrollLeft >= maxScroll)
    ) {
      velocity = 0;
    }

    if (velocity === 0) {
      if (autoScrollVelocityRef.current !== 0) {
        stopAutoScroll();
      }
      return;
    }

    autoScrollVelocityRef.current = velocity;
    startAutoScroll();
  }, [draggedIndex, startAutoScroll, stopAutoScroll]);

  useEffect(() => {
    return () => {
      stopAutoScroll();
    };
  }, [stopAutoScroll]);

  const updateDropTargetIndex = useCallback((targetIndex: number) => {
    if (draggedIndex === null) return;

    const clampedIndex = Math.max(0, Math.min(frames.length, targetIndex));

    if (clampedIndex === draggedIndex) {
      return;
    }

    if (
      (draggedIndex < clampedIndex && clampedIndex === draggedIndex + 1) ||
      (draggedIndex > clampedIndex && clampedIndex === draggedIndex)
    ) {
      return;
    }

    if (clampedIndex !== dragOverIndex) {
      setDragOverIndex(clampedIndex);
    }
  }, [draggedIndex, dragOverIndex, frames.length]);

  // Start playback (using optimized rendering by default)
  const handleStartPlayback = useCallback(() => {
    setIsOptimizedPlaybackActive(true);
    startOptimizedPlayback();
  }, [startOptimizedPlayback]);

  const handlePausePlayback = useCallback(() => {
    setIsOptimizedPlaybackActive(false);
    stopOptimizedPlayback();
  }, [stopOptimizedPlayback]);

  const handleStopPlayback = useCallback(() => {
    setIsOptimizedPlaybackActive(false);
    stopOptimizedPlayback();
  }, [stopOptimizedPlayback]);

  // Handle keyboard shortcuts for playback (moved from useAnimationPlayback to support optimized playback)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }

      // Block spacebar if text tool actively typing
      const toolStore = require('@/stores/toolStore'); // dynamic to avoid import cycles
      const { activeTool, textToolState } = toolStore.useToolStore.getState();
      const isTypingInTextTool = activeTool === 'text' && textToolState.isTyping;

      switch (event.key) {
        case ' ': // Spacebar for play/pause (primary modern value)
        case 'Space': // Some browsers/environments (legacy) provide 'Space'
          // Ensure we don't hijack typing in text tool
          if (isTypingInTextTool) return;
          // Also guard against focused inputs (already filtered above) & allow default when modifier pressed
          if (event.metaKey || event.ctrlKey || event.altKey) return;
          event.preventDefault(); // Prevent page scroll
          if (isOptimizedPlaybackActive) {
            handlePausePlayback();
          } else {
            handleStartPlayback();
          }
          break;
        case 'Escape': // Escape to stop
          event.preventDefault();
          if (isOptimizedPlaybackActive) {
            handleStopPlayback();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOptimizedPlaybackActive, handleStartPlayback, handlePausePlayback, handleStopPlayback]);

  // Handle drag start
  const handleDragStart = useCallback((event: React.DragEvent, index: number) => {
    if (isPlaying) return; // Don't allow reordering during playback
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', index.toString());
    setDraggedIndex(index);
    setDraggingFrame(true); // Set global drag state
  }, [isPlaying, setDraggingFrame]);

  // Handle drag over
  const handleDragOver = useCallback((event: React.DragEvent, index: number) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex === null || draggedIndex === index) return;
    
    // Determine if we're closer to the left or right edge of the frame
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX;
    const centerX = rect.left + rect.width / 2;
    
    let targetIndex: number;
    
    // If dragging to the right half, show indicator after this frame
    if (x > centerX) {
      targetIndex = index + 1;
    } else {
      targetIndex = index;
    }
    
    updateDropTargetIndex(targetIndex);
    updateAutoScrollFromEvent(event);
  }, [draggedIndex, updateDropTargetIndex, updateAutoScrollFromEvent]);

  // Handle drag enter
  const handleDragEnter = useCallback((event: React.DragEvent, index: number) => {
    event.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      // Clear any existing drag over index first
      setDragOverIndex(null);
      
      updateDropTargetIndex(index);
      updateAutoScrollFromEvent(event);
    }
  }, [draggedIndex, updateDropTargetIndex, updateAutoScrollFromEvent]);

  // Handle drag leave - simplified to do nothing, let dragEnter handle clearing
  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    // Don't clear dragOverIndex here - let dragEnter handle it
  }, []);

  const handleIndicatorDragOver = useCallback((event: React.DragEvent, targetIndex: number) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    updateDropTargetIndex(targetIndex);
    updateAutoScrollFromEvent(event);
  }, [updateDropTargetIndex, updateAutoScrollFromEvent]);

  const handleIndicatorDragEnter = useCallback((event: React.DragEvent, targetIndex: number) => {
    event.preventDefault();
    updateDropTargetIndex(targetIndex);
    updateAutoScrollFromEvent(event);
  }, [updateDropTargetIndex, updateAutoScrollFromEvent]);

  // Handle drop
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const dragIndex = parseInt(event.dataTransfer.getData('text/plain'));
    
    if (!isNaN(dragIndex) && dragOverIndex !== null) {
      // Validate indices - dragOverIndex can be frames.length for "append to end"
      if (dragIndex >= 0 && dragIndex < frames.length && 
          dragOverIndex >= 0 && dragOverIndex <= frames.length &&
          dragIndex !== dragOverIndex) {
        
        const selectedFrames = getSelectedFrames();
        
        // Check if we're dragging a selected frame and there are multiple selections
        if (selectedFrames.length > 1 && selectedFrames.includes(dragIndex)) {
          // Batch reorder all selected frames
          reorderFrameRange(selectedFrames, dragOverIndex);
        } else {
          // Single frame reorder
          let targetIndex = dragOverIndex;
          
          // Adjust target index when moving forward (except for end drops)
          if (dragOverIndex < frames.length && dragIndex < dragOverIndex) {
            targetIndex = dragOverIndex - 1;
          }
          
          reorderFrames(dragIndex, targetIndex);
        }
      }
    }
    
    stopAutoScroll();

    // Clean up drag state with delay to prevent race conditions
    setTimeout(() => {
      setDraggedIndex(null);
      setDragOverIndex(null);
    }, 100);
  }, [dragOverIndex, reorderFrames, reorderFrameRange, frames.length, getSelectedFrames, stopAutoScroll]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    // Clean up drag state with delay to prevent race conditions
    stopAutoScroll();

    setTimeout(() => {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setDraggingFrame(false); // Clear global drag state
    }, 100);
  }, [setDraggingFrame, stopAutoScroll]);

  const renderDropZone = useCallback((targetIndex: number, key: string) => {
    if (draggedIndex === null) {
      return <span key={key} className="w-0" aria-hidden="true" />;
    }

    const isActive = dragOverIndex === targetIndex;

    return (
      <div
        key={key}
        className="relative flex-shrink-0 self-stretch"
        style={{ width: 0 }}
        aria-hidden="true"
      >
        <div
          className="pointer-events-auto absolute inset-y-0 left-1/2 -translate-x-1/2 w-12 flex items-center justify-center"
          onDragOver={(e) => handleIndicatorDragOver(e, targetIndex)}
          onDragEnter={(e) => handleIndicatorDragEnter(e, targetIndex)}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div
            className={`h-[90%] rounded-full transition-all duration-150 ease-out ${isActive ? 'w-1.5 bg-primary shadow-lg animate-pulse animate-in fade-in' : 'w-px bg-transparent'}`}
          />
        </div>
      </div>
    );
  }, [draggedIndex, dragOverIndex, handleIndicatorDragOver, handleIndicatorDragEnter, handleDragLeave, handleDrop]);

  // Handle frame selection (modified to support shift-click range selection)
  const handleFrameSelect = useCallback((frameIndex: number, event: React.MouseEvent) => {
    if (isPlaying) return;
    
    if (event.shiftKey) {
      // Shift+Click: Extend selection to span existing selection bounds and clicked frame
      const selected = getSelectedFrames();
      const currentMin = selected.length > 0 ? selected[0] : currentFrameIndex;
      const currentMax = selected.length > 0 ? selected[selected.length - 1] : currentFrameIndex;
      const newMin = Math.min(currentMin, frameIndex);
      const newMax = Math.max(currentMax, frameIndex);
      selectFrameRange(newMin, newMax);

      // Update current frame WITHOUT clearing the extended selection
      const { setCurrentFrameOnly } = useAnimationStore.getState();
      setCurrentFrameOnly(frameIndex);
    } else {
      // Normal click: Navigate (this will clear selection automatically)
      navigateToFrame(frameIndex);
    }
  }, [isPlaying, currentFrameIndex, selectFrameRange, navigateToFrame, getSelectedFrames]);

  // Handle adding new frame
  const handleAddFrame = useCallback(() => {
    if (frames.length < MAX_LIMITS.FRAME_COUNT) {
      addFrame(currentFrameIndex + 1);
    }
  }, [addFrame, frames.length, currentFrameIndex]);

  // Helper function to determine onion skin status for a frame
  const getOnionSkinStatus = useCallback((frameIndex: number) => {
    if (!onionSkin.enabled) {
      return {
        isOnionSkinPrevious: false,
        isOnionSkinNext: false,
        onionSkinDistance: 0
      };
    }

    const distance = frameIndex - currentFrameIndex;
    
    if (distance < 0 && Math.abs(distance) <= onionSkin.previousFrames) {
      // This is a previous frame within onion skin range
      return {
        isOnionSkinPrevious: true,
        isOnionSkinNext: false,
        onionSkinDistance: Math.abs(distance)
      };
    } else if (distance > 0 && distance <= onionSkin.nextFrames) {
      // This is a next frame within onion skin range
      return {
        isOnionSkinPrevious: false,
        isOnionSkinNext: true,
        onionSkinDistance: distance
      };
    }

    return {
      isOnionSkinPrevious: false,
      isOnionSkinNext: false,
      onionSkinDistance: 0
    };
  }, [onionSkin.enabled, onionSkin.previousFrames, onionSkin.nextFrames, currentFrameIndex]);

  // Handle duplicating current frame
  const handleDuplicateFrame = useCallback(() => {
    const selected = getSelectedFrames();
    if (selected.length > 1) {
      if (frames.length + selected.length > MAX_LIMITS.FRAME_COUNT) {
        return;
      }
      duplicateFrameRange(selected);
      return;
    }

    if (frames.length < MAX_LIMITS.FRAME_COUNT) {
      duplicateFrame(currentFrameIndex);
    }
  }, [frames.length, currentFrameIndex, getSelectedFrames, duplicateFrame, duplicateFrameRange]);

  // Handle deleting current/selected frames from toolbar
  const handleDeleteFrame = useCallback(() => {
    if (frames.length <= 1) return;

    const selectedFrames = getSelectedFrames();

    if (selectedFrames.length > 1) {
      deleteFrameRange(selectedFrames);
    } else {
      removeFrame(currentFrameIndex);
    }
  }, [frames.length, getSelectedFrames, deleteFrameRange, removeFrame, currentFrameIndex]);

  // Handle individual frame duplicate
  const handleFrameDuplicate = useCallback((frameIndex: number) => {
    if (frames.length >= MAX_LIMITS.FRAME_COUNT) return;

    const selected = getSelectedFrames();
    if (selected.length > 1 && selected.includes(frameIndex)) {
      if (frames.length + selected.length > MAX_LIMITS.FRAME_COUNT) {
        return;
      }
      duplicateFrameRange(selected);
      return;
    }

    duplicateFrame(frameIndex);
  }, [frames.length, getSelectedFrames, duplicateFrame, duplicateFrameRange]);

  // Handle individual frame delete
  const handleFrameDelete = useCallback((frameIndex: number) => {
    if (frames.length <= 1) return;
    
    const selectedFrames = getSelectedFrames();
    
    // If multiple frames are selected and the clicked frame is in the selection, delete all selected
    if (selectedFrames.length > 1 && selectedFrames.includes(frameIndex)) {
      // Batch delete all selected frames
      deleteFrameRange(selectedFrames);
    } else {
      // Single frame delete
      removeFrame(frameIndex);
    }
  }, [frames.length, getSelectedFrames, deleteFrameRange, removeFrame]);

  // Handle frame duration change
  const handleFrameDurationChange = useCallback((frameIndex: number, duration: number) => {
    updateFrameDuration(frameIndex, duration);
  }, [updateFrameDuration]);

  // Calculate total animation duration
  const totalDuration = frames.reduce((total, frame) => total + frame.duration, 0);

  return (
    <Card className="border-border/50">
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AnimationControlsMenu />
            <CardTitle className="text-sm font-medium">Animation Timeline</CardTitle>
          </div>
          <div className="text-xs text-muted-foreground">
            {frames.length} frame{frames.length !== 1 ? 's' : ''} • {(totalDuration / 1000).toFixed(1)}s
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 p-2 pt-0 overflow-hidden">
        {/* Combined Controls Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Frame Controls - Left Side */}
          <FrameControls
            canAddFrame={frames.length < MAX_LIMITS.FRAME_COUNT}
            canDeleteFrame={frames.length > 1}
            onAddFrame={handleAddFrame}
            onDuplicateFrame={handleDuplicateFrame}
            onDeleteFrame={handleDeleteFrame}
            disabled={isPlaying}
          />

          {/* Playback Controls - Center */}
          <PlaybackControls
            isPlaying={isOptimizedPlaybackActive}
            canPlay={canPlay}
            currentFrame={currentFrameIndex}
            totalFrames={frames.length}
            onPlay={handleStartPlayback}
            onPause={handlePausePlayback}
            onStop={handleStopPlayback}
            onPrevious={navigatePrevious}
            onNext={navigateNext}
            onFirst={navigateFirst}
            onLast={navigateLast}
            onToggleLoop={() => setLooping(!looping)}
            isLooping={looping}
          />

          {/* Onion Skin Controls - Right Side */}
          <OnionSkinControls />
        </div>

        {/* Frame Timeline */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-muted-foreground">Frames</h4>
            <TimelineZoomControl />
          </div>
          <div className="w-full overflow-x-auto" ref={scrollContainerRef}>
            <div 
              className="flex gap-1" 
              style={{ 
                minWidth: 'max-content',
                userSelect: 'none', // Prevent text selection
                WebkitUserSelect: 'none' // Webkit browsers
              }}
              onDragOver={updateAutoScrollFromEvent}
              onClick={(e) => {
                // Clear selection when clicking empty timeline area
                if (e.target === e.currentTarget) {
                  clearSelection();
                }
              }}
            >
              {renderDropZone(0, 'drop-zone-0')}
              {frames.map((frame, index) => (
                <React.Fragment key={frame.id}>
                  <FrameThumbnail
                    frame={frame}
                    frameIndex={index}
                    isActive={index === currentFrameIndex}
                    isSelected={isFrameSelected(index)}
                    canvasWidth={canvasWidth}
                    canvasHeight={canvasHeight}
                    scaleZoom={timelineZoom}
                    onSelect={(e) => handleFrameSelect(index, e)}
                    onDuplicate={() => handleFrameDuplicate(index)}
                    onDelete={() => handleFrameDelete(index)}
                    onDurationChange={(duration) => handleFrameDurationChange(index, duration)}
                    isDragging={draggedIndex === index}
                    {...getOnionSkinStatus(index)}
                    dragHandleProps={{
                      draggable: !isPlaying,
                      onDragStart: (e: React.DragEvent) => handleDragStart(e, index),
                      onDragOver: (e: React.DragEvent) => handleDragOver(e, index),
                      onDragEnter: (e: React.DragEvent) => handleDragEnter(e, index),
                      onDragLeave: handleDragLeave,
                      onDrop: handleDrop,
                      onDragEnd: handleDragEnd
                    }}
                  />
                  {renderDropZone(index + 1, `drop-zone-${index + 1}`)}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Animation Controls Menu Component
 * 
 * Provides hamburger menu with time-based effects and animation controls
 */
const AnimationControlsMenu: React.FC = () => {
  const { 
    openSetDurationDialog,
    openAddFramesDialog,
    openWaveWarpDialog,
    openWiggleDialog
  } = useTimeEffectsStore();

  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 hover:bg-accent"
              >
                <Menu className="h-3.5 w-3.5" />
                <span className="sr-only">Animation controls</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Animation controls</p>
          </TooltipContent>
        </Tooltip>
        
        <DropdownMenuContent 
          align="start" 
          side="top"
          className="w-56 border-border/50"
        >
          <DropdownMenuItem onClick={openSetDurationDialog}>
            <Clock className="mr-2 h-4 w-4" />
            <span>Set all frame durations</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={openAddFramesDialog}>
            <Plus className="mr-2 h-4 w-4" />
            <span>Add multiple frames</span>
          </DropdownMenuItem>
          
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Zap className="mr-2 h-4 w-4" />
              <span>Animated FX</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="border-border/50">
              <DropdownMenuItem onClick={openWaveWarpDialog}>
                <span>Wave warp</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openWiggleDialog}>
                <span>Wiggle</span>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
};
