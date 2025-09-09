import React, { useState, useMemo } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import type { Frame } from '../../types';
import { X, Copy } from 'lucide-react';
import { useCanvasStore } from '../../stores/canvasStore';

interface FrameThumbnailProps {
  frame: Frame;
  frameIndex: number;
  isSelected: boolean;
  canvasWidth: number;
  canvasHeight: number;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDurationChange: (duration: number) => void;
  isDragging?: boolean;
  dragHandleProps?: any;
  // Onion skin props
  isOnionSkinPrevious?: boolean;
  isOnionSkinNext?: boolean;
  onionSkinDistance?: number;
}

/**
 * Individual frame thumbnail component with ASCII preview
 * Renders a miniaturized version of the frame's ASCII art
 */
export const FrameThumbnail: React.FC<FrameThumbnailProps> = ({
  frame,
  frameIndex,
  isSelected,
  canvasWidth,
  canvasHeight,
  onSelect,
  onDuplicate,
  onDelete,
  onDurationChange,
  isDragging = false,
  dragHandleProps,
  isOnionSkinPrevious = false,
  isOnionSkinNext = false,
  onionSkinDistance = 0
}) => {
  // Local state for duration input to allow free typing
  const [durationInput, setDurationInput] = useState(frame.duration.toString());
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  
  // Get canvas background color from store
  const { canvasBackgroundColor } = useCanvasStore();
  
  // Update local input when frame duration changes externally
  React.useEffect(() => {
    if (!isEditingDuration) {
      setDurationInput(frame.duration.toString());
    }
  }, [frame.duration, isEditingDuration]);

  // Generate pixel-based thumbnail canvas
  const thumbnailCanvas = useMemo(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Set thumbnail dimensions (keep it small but readable)
    const thumbnailWidth = 120;
    const thumbnailHeight = 60;
    canvas.width = thumbnailWidth;
    canvas.height = thumbnailHeight;

    // Calculate scaling factors
    const scaleX = thumbnailWidth / canvasWidth;
    const scaleY = thumbnailHeight / canvasHeight;
    const cellWidth = Math.max(1, scaleX);
    const cellHeight = Math.max(1, scaleY);

    // Use canvas background color instead of hardcoded color
    ctx.fillStyle = canvasBackgroundColor || '#1a1a1a';
    ctx.fillRect(0, 0, thumbnailWidth, thumbnailHeight);

    // If frame is empty, show a subtle grid pattern
    if (frame.data.size === 0) {
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 0.5;
      const gridSpacing = 8;
      
      // Draw vertical lines
      for (let x = 0; x < thumbnailWidth; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, thumbnailHeight);
        ctx.stroke();
      }
      
      // Draw horizontal lines
      for (let y = 0; y < thumbnailHeight; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(thumbnailWidth, y);
        ctx.stroke();
      }
      
      return canvas.toDataURL();
    }

    // Render each cell as a colored rectangle
    for (const [key, cell] of frame.data) {
      const coords = key.split(',').map(Number);
      const x = coords[0];
      const y = coords[1];

      if (x >= 0 && x < canvasWidth && y >= 0 && y < canvasHeight) {
        // Calculate pixel position in thumbnail
        const pixelX = Math.floor(x * scaleX);
        const pixelY = Math.floor(y * scaleY);

        // Use character color (foreground) primarily, fallback to background, then white
        const color = cell.color || cell.bgColor || '#ffffff';
        ctx.fillStyle = color;
        ctx.fillRect(pixelX, pixelY, Math.ceil(cellWidth), Math.ceil(cellHeight));
      }
    }

    return canvas.toDataURL();
  }, [frame.data, canvasWidth, canvasHeight, canvasBackgroundColor]);

  // Handle duration input change (allow free typing)
  const handleDurationInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDurationInput(event.target.value);
  };

  // Handle duration input focus (start editing)
  const handleDurationFocus = () => {
    setIsEditingDuration(true);
  };

  // Handle duration input blur (validate and commit)
  const handleDurationBlur = () => {
    setIsEditingDuration(false);
    const parsedDuration = parseInt(durationInput);
    
    if (isNaN(parsedDuration) || parsedDuration < 50) {
      // Invalid input, reset to minimum and update store
      setDurationInput('50');
      onDurationChange(50);
    } else if (parsedDuration > 10000) {
      // Exceeds maximum, clamp and update store
      setDurationInput('10000');
      onDurationChange(10000);
    } else {
      // Valid input, update store
      onDurationChange(parsedDuration);
    }
  };

  // Handle Enter key to commit changes
  const handleDurationKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur(); // Trigger blur event
    }
  };

  // Calculate onion skin border styling
  const getOnionSkinBorderStyle = () => {
    if (isOnionSkinPrevious) {
      return 'border-blue-500/60 bg-blue-50/20';
    }
    if (isOnionSkinNext) {
      return 'border-red-500/60 bg-red-50/20';
    }
    return '';
  };

  return (
    <Card
      className={`
        relative flex-shrink-0 w-36 h-36 max-w-36 max-h-36 p-2 cursor-pointer transition-all select-none overflow-hidden
        ${isSelected 
          ? 'border-white bg-white/5' 
          : isOnionSkinPrevious || isOnionSkinNext
            ? getOnionSkinBorderStyle()
            : 'border-border hover:border-primary/50'
        }
        ${isDragging ? 'opacity-50 scale-95' : ''}
      `}
      onClick={onSelect}
      {...dragHandleProps}
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        ...dragHandleProps?.style
      }}
    >
      {/* Frame number and controls */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-xs px-1 py-0">
            {frameIndex + 1}
          </Badge>
          
          {/* Onion skin distance indicator */}
          {(isOnionSkinPrevious || isOnionSkinNext) && onionSkinDistance > 0 && (
            <Badge 
              variant="outline" 
              className={`text-xs px-1 py-0 ${
                isOnionSkinPrevious 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-red-500 text-red-600'
              }`}
            >
              -{onionSkinDistance}
            </Badge>
          )}
        </div>
        
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-5 w-5 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
          >
            <Copy className="h-3 w-3" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-5 w-5 p-0 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Frame preview */}
      <div className="flex-1 mb-1 overflow-hidden">
        <div className="bg-muted/30 p-1 rounded border h-full flex items-center justify-center">
          {thumbnailCanvas ? (
            <img 
              src={thumbnailCanvas} 
              alt={`Frame ${frameIndex} preview`}
              className="max-w-full max-h-full object-contain rounded-sm"
              style={{ imageRendering: 'pixelated' }}
            />
          ) : (
            <div className="text-muted-foreground italic text-center text-xs">
              Empty
            </div>
          )}
        </div>
      </div>

      {/* Duration control */}
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={durationInput}
          onChange={handleDurationInputChange}
          onFocus={handleDurationFocus}
          onBlur={handleDurationBlur}
          onKeyDown={handleDurationKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-xs px-1 py-0.5 border border-border rounded w-12 bg-background"
          min="50"
          max="10000"
          step="10"
        />
        <span className="text-xs text-muted-foreground">ms</span>
      </div>
    </Card>
  );
};
