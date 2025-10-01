import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DraggableDialogBar } from '@/components/common/DraggableDialogBar';
import { useTimeEffectsStore } from '@/stores/timeEffectsStore';
import { useAnimationStore } from '@/stores/animationStore';
import { useAnimationHistory } from '@/hooks/useAnimationHistory';
import { ADD_FRAMES_LIMITS } from '@/constants/timeEffects';

export const AddFramesDialog: React.FC = () => {
  const { 
    isAddFramesDialogOpen, 
    closeAddFramesDialog 
  } = useTimeEffectsStore();
  
  const { frames, currentFrameIndex } = useAnimationStore();
  const { addMultipleFrames } = useAnimationHistory();

  // Dialog state
  const [positionOffset, setPositionOffset] = useState({ x: 0, y: 0 });
  const [isDraggingDialog, setIsDraggingDialog] = useState(false);
  const [hasBeenDragged, setHasBeenDragged] = useState(false);
  const dragStartOffsetRef = useRef({ x: 0, y: 0 });
  const dialogRef = useRef<HTMLDivElement>(null);
  
  // Form state
  const [frameCount, setFrameCount] = useState(1);
  const [duplicateCurrentFrame, setDuplicateCurrentFrame] = useState(true);
  
  // Reset position when dialog opens
  useEffect(() => {
    if (isAddFramesDialogOpen) {
      setPositionOffset({ x: 0, y: 0 });
      setHasBeenDragged(false);
      // Reset form to defaults
      setFrameCount(1);
      setDuplicateCurrentFrame(true);
    }
  }, [isAddFramesDialogOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isAddFramesDialogOpen) return;
      
      if (event.key === 'Escape') {
        event.preventDefault();
        closeAddFramesDialog();
      } else if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleApply();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAddFramesDialogOpen, closeAddFramesDialog]);

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
  const handleFrameCountChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    const clampedValue = Math.max(
      ADD_FRAMES_LIMITS.MIN_COUNT, 
      Math.min(ADD_FRAMES_LIMITS.MAX_COUNT, numValue)
    );
    setFrameCount(clampedValue);
  };

  // Apply changes
  const handleApply = () => {
    const sourceFrame = duplicateCurrentFrame ? frames[currentFrameIndex] : null;
    addMultipleFrames(frameCount, sourceFrame);
    closeAddFramesDialog();
  };

  // Calculate dialog position (lower-left corner)
  const getDialogPosition = () => {
    const dialogWidth = 400;
    const dialogHeight = 350;
    const margin = 8;
    
    return {
      bottom: margin,
      left: margin,
      width: dialogWidth,
      maxHeight: dialogHeight
    };
  };

  if (!isAddFramesDialogOpen) return null;

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
          title="Add Frames" 
          onDrag={handleDrag}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onClose={closeAddFramesDialog}
        />
        
        <div className="p-6 space-y-6">
          <div className="text-sm text-muted-foreground">
            Add multiple frames to your animation. New frames will be appended at the end.
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="frame-count-input">Number of frames to add</Label>
              <Input
                id="frame-count-input"
                type="number"
                value={frameCount}
                onChange={(e) => handleFrameCountChange(e.target.value)}
                min={ADD_FRAMES_LIMITS.MIN_COUNT}
                max={ADD_FRAMES_LIMITS.MAX_COUNT}
                step={1}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                Range: {ADD_FRAMES_LIMITS.MIN_COUNT}-{ADD_FRAMES_LIMITS.MAX_COUNT} frames
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="duplicate-frame"
                checked={duplicateCurrentFrame}
                onCheckedChange={(checked) => setDuplicateCurrentFrame(checked === true)}
              />
              <Label 
                htmlFor="duplicate-frame" 
                className="text-sm font-normal cursor-pointer"
              >
                Duplicate current frame content
              </Label>
            </div>
            
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded space-y-1">
              <div>
                <strong>Current frame:</strong> {currentFrameIndex + 1} of {frames.length}
              </div>
              {duplicateCurrentFrame ? (
                <div>
                  ✓ New frames will contain the same content as frame {currentFrameIndex + 1}
                </div>
              ) : (
                <div>
                  ○ New frames will be empty (transparent background)
                </div>
              )}
              <div>
                <strong>After adding:</strong> Total frames will be {frames.length + frameCount}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 p-6 pt-0">
          <Button variant="outline" onClick={closeAddFramesDialog}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Add {frameCount} Frame{frameCount !== 1 ? 's' : ''}
          </Button>
        </div>
      </Card>
    </div>,
    document.body
  );
};