import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  const { frames } = useAnimationStore();

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
  
  // Calculate current average frame duration for initial values
  useEffect(() => {
    if (isSetDurationDialogOpen && frames.length > 0) {
      const totalDuration = frames.reduce((sum, frame) => sum + frame.duration, 0);
      const averageDuration = totalDuration / frames.length;
      setMilliseconds(Math.round(averageDuration));
      setFps(Math.round(msToFps(averageDuration) * 10) / 10); // Round to 1 decimal place
    }
  }, [isSetDurationDialogOpen, frames]);

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

  // Sync values when mode changes
  useEffect(() => {
    if (mode === 'ms') {
      setFps(Math.round(msToFps(milliseconds) * 10) / 10);
    } else {
      setMilliseconds(Math.round(fpsToMs(fps)));
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

  // Handle input changes with validation
  const handleMillisecondsChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    const clampedValue = Math.max(
      FRAME_DURATION_LIMITS.MIN_MS, 
      Math.min(FRAME_DURATION_LIMITS.MAX_MS, numValue)
    );
    setMilliseconds(clampedValue);
  };

  const handleFpsChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    const clampedValue = Math.max(
      FRAME_DURATION_LIMITS.MIN_FPS, 
      Math.min(FRAME_DURATION_LIMITS.MAX_FPS, numValue)
    );
    setFps(clampedValue);
  };

  // Apply changes
  const handleApply = () => {
    const targetDuration = mode === 'ms' ? milliseconds : fpsToMs(fps);
    setFrameDurationsWithHistory(targetDuration);
    closeSetDurationDialog();
  };

  // Calculate dialog position (lower-left corner)
  const getDialogPosition = () => {
    const dialogWidth = 400;
    const dialogHeight = 300;
    const margin = 20;
    
    return {
      bottom: margin,
      left: margin,
      width: dialogWidth,
      maxHeight: dialogHeight
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
            Set the duration for all frames in the animation. This affects playback speed.
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
                  type="number"
                  value={milliseconds}
                  onChange={(e) => handleMillisecondsChange(e.target.value)}
                  min={FRAME_DURATION_LIMITS.MIN_MS}
                  max={FRAME_DURATION_LIMITS.MAX_MS}
                  step={1}
                  className="w-full"
                />
                <div className="text-xs text-muted-foreground">
                  Range: {FRAME_DURATION_LIMITS.MIN_MS}-{FRAME_DURATION_LIMITS.MAX_MS}ms
                  {' • '}Equivalent to {Math.round(msToFps(milliseconds) * 10) / 10} FPS
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="fps" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="fps-input">Frames per Second</Label>
                <Input
                  id="fps-input"
                  type="number"
                  value={fps}
                  onChange={(e) => handleFpsChange(e.target.value)}
                  min={FRAME_DURATION_LIMITS.MIN_FPS}
                  max={FRAME_DURATION_LIMITS.MAX_FPS}
                  step={0.1}
                  className="w-full"
                />
                <div className="text-xs text-muted-foreground">
                  Range: {FRAME_DURATION_LIMITS.MIN_FPS}-{FRAME_DURATION_LIMITS.MAX_FPS} FPS
                  {' • '}Equivalent to {fpsToMs(fps)}ms per frame
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
            <strong>Note:</strong> This will set the same duration for all {frames.length} frames in your animation.
            You can undo this change if needed.
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