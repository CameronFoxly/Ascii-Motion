import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DraggableDialogBar } from '@/components/common/DraggableDialogBar';
import { useTimeEffectsStore } from '@/stores/timeEffectsStore';
import { useTimeEffectsHistory } from '@/hooks/useTimeEffectsHistory';
import { useAnimationStore } from '@/stores/animationStore';
import { fpsToMs, msToFps } from '@/utils/timeEffectsProcessing';
import { FRAME_DURATION_LIMITS } from '@/constants/timeEffects';
import type { FrameDurationMode } from '@/types/timeEffects';

export const SetFrameDurationDialog: React.FC = () => {
  const { 
    isSetDurationDialogOpen, 
    closeSetDurationDialog 
  } = useTimeEffectsStore();
  
  const { setFrameDurationsWithHistory } = useTimeEffectsHistory();
  const { frames, selectedFrameIndices } = useAnimationStore();

  const selectedIndices = useMemo(() => {
    return Array.from(selectedFrameIndices).sort((a, b) => a - b);
  }, [selectedFrameIndices]);

  const hasMultiSelection = selectedIndices.length > 1;
  const targetIndices = useMemo(() => {
    if (hasMultiSelection) {
      return selectedIndices;
    }
    return frames.map((_, index) => index);
  }, [hasMultiSelection, selectedIndices, frames]);

  // Dialog state
  const [positionOffset, setPositionOffset] = useState({ x: 0, y: 0 });
  const [isDraggingDialog, setIsDraggingDialog] = useState(false);
  const [hasBeenDragged, setHasBeenDragged] = useState(false);
  const dragStartOffsetRef = useRef({ x: 0, y: 0 });
  const dialogRef = useRef<HTMLDivElement>(null);
  
  // Form state
  const [mode, setMode] = useState<FrameDurationMode>('ms');
  const [milliseconds, setMilliseconds] = useState(100);
  const [fps, setFps] = useState(10);
  
  // Input text state (allows empty/partial input while typing)
  const [msInputValue, setMsInputValue] = useState('100');
  const [fpsInputValue, setFpsInputValue] = useState('10');
  
  // Calculate current average frame duration for initial values
  useEffect(() => {
    if (isSetDurationDialogOpen && targetIndices.length > 0) {
      const totalDuration = targetIndices.reduce((sum, frameIndex) => {
        const frame = frames[frameIndex];
        return frame ? sum + frame.duration : sum;
      }, 0);
      const averageDuration = totalDuration / targetIndices.length;
      const roundedMs = Math.round(averageDuration);
      const roundedFps = Math.round(msToFps(averageDuration));
      setMilliseconds(roundedMs);
      setFps(roundedFps);
      setMsInputValue(roundedMs.toString());
      setFpsInputValue(roundedFps.toString());
    }
  }, [isSetDurationDialogOpen, frames, targetIndices]);

  // Reset position when dialog opens
  useEffect(() => {
    if (isSetDurationDialogOpen) {
      setPositionOffset({ x: 0, y: 0 });
      setHasBeenDragged(false);
    }
  }, [isSetDurationDialogOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isSetDurationDialogOpen) return;
      
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSetDurationDialog();
      } else if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleApply();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSetDurationDialogOpen, closeSetDurationDialog]);

  // Sync display values when mode changes (not input values - those stay as user typed)
  useEffect(() => {
    if (mode === 'ms') {
      const roundedFps = Math.round(msToFps(milliseconds));
      setFps(roundedFps);
    } else {
      const roundedMs = Math.round(fpsToMs(fps));
      setMilliseconds(roundedMs);
    }
  }, [mode, milliseconds, fps]);

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

  // Handle input changes - allow typing without validation
  const handleMillisecondsChange = (value: string) => {
    // Allow empty string or numbers only (no decimals)
    if (value === '' || /^\d+$/.test(value)) {
      setMsInputValue(value);
      // Only update milliseconds state if valid number
      if (value !== '') {
        const numValue = parseInt(value, 10);
        setMilliseconds(numValue);
      }
    }
  };

  const handleMillisecondsBlur = () => {
    // Validate and clamp on blur
    if (msInputValue === '') {
      const defaultValue = FRAME_DURATION_LIMITS.MIN_MS;
      setMsInputValue(defaultValue.toString());
      setMilliseconds(defaultValue);
    } else {
      const numValue = parseInt(msInputValue, 10);
      const clampedValue = Math.max(
        FRAME_DURATION_LIMITS.MIN_MS,
        Math.min(FRAME_DURATION_LIMITS.MAX_MS, numValue)
      );
      setMsInputValue(clampedValue.toString());
      setMilliseconds(clampedValue);
    }
  };

  const handleFpsChange = (value: string) => {
    // Allow empty string or numbers only (no decimals)
    if (value === '' || /^\d+$/.test(value)) {
      setFpsInputValue(value);
      // Only update fps state if valid number
      if (value !== '') {
        const numValue = parseInt(value, 10);
        setFps(numValue);
      }
    }
  };

  const handleFpsBlur = () => {
    // Validate and clamp on blur
    if (fpsInputValue === '') {
      const defaultValue = FRAME_DURATION_LIMITS.MIN_FPS;
      setFpsInputValue(defaultValue.toString());
      setFps(defaultValue);
    } else {
      const numValue = parseInt(fpsInputValue, 10);
      const clampedValue = Math.max(
        FRAME_DURATION_LIMITS.MIN_FPS,
        Math.min(FRAME_DURATION_LIMITS.MAX_FPS, numValue)
      );
      setFpsInputValue(clampedValue.toString());
      setFps(clampedValue);
    }
  };

  // Apply changes
  const handleApply = () => {
  const targetDuration = mode === 'ms' ? milliseconds : fpsToMs(fps);
  setFrameDurationsWithHistory(targetDuration, targetIndices);
  };

  // Calculate dialog position (lower-left corner)
  const getDialogPosition = () => {
    const dialogWidth = 400;
    const margin = 8;
    
    // Calculate maxHeight to ensure dialog fits on screen
    const viewportHeight = window.innerHeight;
    const maxHeight = viewportHeight - (margin * 2);
    
    return {
      bottom: margin,
      left: margin,
      width: dialogWidth,
      maxHeight: `${maxHeight}px`
    };
  };

  if (!isSetDurationDialogOpen) return null;

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
          title="Set Frame Duration" 
          onDrag={handleDrag}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onClose={closeSetDurationDialog}
        />
        
        <div className="p-6 space-y-6">
          <div className="text-sm text-muted-foreground">
            {hasMultiSelection ? (
              <>
                Set the duration for the <strong>{targetIndices.length}</strong> selected frame
                {targetIndices.length === 1 ? '' : 's'}. This leaves unselected frames untouched.
              </>
            ) : (
              <>Set the duration for all {frames.length} frames in the animation. This affects playback speed.</>
            )}
          </div>
          
          <Tabs value={mode} onValueChange={(value) => setMode(value as FrameDurationMode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ms">Milliseconds</TabsTrigger>
              <TabsTrigger value="fps">FPS</TabsTrigger>
            </TabsList>
            
            <TabsContent value="ms" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="ms-input">Duration (ms)</Label>
                <Input
                  id="ms-input"
                  type="text"
                  inputMode="numeric"
                  value={msInputValue}
                  onChange={(e) => handleMillisecondsChange(e.target.value)}
                  onBlur={handleMillisecondsBlur}
                  className="w-full"
                />
                <div className="text-xs text-muted-foreground">
                  Range: {FRAME_DURATION_LIMITS.MIN_MS}-{FRAME_DURATION_LIMITS.MAX_MS}ms
                  {milliseconds > 0 && (
                    <> {' • '}Equivalent to {Math.round(msToFps(milliseconds))} FPS</>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="fps" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="fps-input">Frames per Second</Label>
                <Input
                  id="fps-input"
                  type="text"
                  inputMode="numeric"
                  value={fpsInputValue}
                  onChange={(e) => handleFpsChange(e.target.value)}
                  onBlur={handleFpsBlur}
                  className="w-full"
                />
                <div className="text-xs text-muted-foreground">
                  Range: {FRAME_DURATION_LIMITS.MIN_FPS}-{FRAME_DURATION_LIMITS.MAX_FPS} FPS
                  {fps > 0 && (
                    <> {' • '}Equivalent to {fpsToMs(fps)}ms per frame</>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
            {hasMultiSelection ? (
              <>
                <strong>Note:</strong> Only the {targetIndices.length} selected frame
                {targetIndices.length === 1 ? '' : 's'} will be updated. Undo restores previous durations and the selection highlight.
              </>
            ) : (
              <>
                <strong>Note:</strong> This will set the same duration for all {frames.length} frames in your animation.
                You can undo this change if needed.
              </>
            )}
          </div>
        </div>
        
        <div className="flex justify-end gap-2 p-6 pt-0">
          <Button variant="outline" onClick={closeSetDurationDialog}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply
          </Button>
        </div>
      </Card>
    </div>,
    document.body
  );
};