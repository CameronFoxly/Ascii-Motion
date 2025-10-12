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
  isActive: boolean;      // Is this the active frame (displayed on canvas)?
  isSelected: boolean;    // Is this frame in the selection?
  canvasWidth: number;
  canvasHeight: number;
  scaleZoom?: number; // Timeline zoom scaling (0.5 to 1.0)
  onSelect: (event: React.MouseEvent) => void; // Now passes event for shift-click detection
  onDuplicate: () => void;
  onDelete: () => void;
  onDurationChange: (duration: number) => void;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
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
  isActive,
  isSelected,
  canvasWidth,
  canvasHeight,
  scaleZoom = 1.0,
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
  
  // Calculate scaled dimensions based on timeline zoom
  const baseCardSize = 144; // w-36 = 144px
  const scaledCardSize = Math.round(baseCardSize * scaleZoom);
  

  
  // Scale thumbnail proportionally but ensure it fits in the card
  const baseThumbnailWidth = 120;
  const baseThumbnailHeight = 60;
  const maxThumbnailWidth = scaledCardSize - 16; // account for padding
  
  // Scale thumbnail to fit within the available space
  let scaledThumbnailWidth = Math.round(baseThumbnailWidth * scaleZoom);
  let scaledThumbnailHeight = Math.round(baseThumbnailHeight * scaleZoom);
  
  // Ensure thumbnail fits within the card
  if (scaledThumbnailWidth > maxThumbnailWidth) {
    const scale = maxThumbnailWidth / scaledThumbnailWidth;
    scaledThumbnailWidth = maxThumbnailWidth;
    scaledThumbnailHeight = Math.round(scaledThumbnailHeight * scale);
  }
  
  // Ensure minimum thumbnail size for readability
  if (scaledThumbnailHeight < 30) {
    scaledThumbnailHeight = 30; 
    scaledThumbnailWidth = Math.round(scaledThumbnailHeight * (baseThumbnailWidth / baseThumbnailHeight));
  }
  

  
  // Update local input when frame duration changes externally
  React.useEffect(() => {
    if (!isEditingDuration) {
      setDurationInput(frame.duration.toString());
    }
  }, [frame.duration, isEditingDuration]);

  // Create a stable serialized representation of frame data for memoization
  const frameDataKey = `${frame.id}-${frame.data.size}-${[...frame.data.keys()].sort().join(',')}`;
  
  // Generate pixel-based thumbnail canvas
  const thumbnailCanvas = useMemo(() => {
    
    // Create a completely independent copy of the frame data at render time
    const frameDataCopy = new Map();
    for (const [key, cell] of frame.data.entries()) {
      frameDataCopy.set(key, { ...cell }); // Deep copy each cell
    }
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Set thumbnail dimensions (scaled based on timeline zoom)
    const thumbnailWidth = scaledThumbnailWidth;
    const thumbnailHeight = scaledThumbnailHeight;
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
    if (frameDataCopy.size === 0) {
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
    for (const [key, cell] of frameDataCopy) {
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
  }, [frameDataKey, canvasWidth, canvasHeight, canvasBackgroundColor, scaledThumbnailWidth, scaledThumbnailHeight]);

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
    
    if (isNaN(parsedDuration) || parsedDuration < 17) {
      // Invalid input, reset to minimum and update store
      setDurationInput('17');
      onDurationChange(17);
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
      event.preventDefault(); // Prevent form submission
      event.currentTarget.blur(); // Trigger blur event to commit changes
    }
    // Tab key: let default behavior happen - blur will occur naturally when focus moves
  };

  // Handle mouse down on duration input to prevent drag initiation
  const handleDurationMouseDown = (event: React.MouseEvent<HTMLInputElement>) => {
    // Stop propagation to prevent drag handlers from being triggered
    event.stopPropagation();
  };

  // Handle mouse enter on duration input to disable dragging
  const handleDurationMouseEnter = () => {
    // Disable dragging on the parent card when mouse is over the input
    const parentCard = document.querySelector(`[data-frame-index="${frameIndex}"]`) as HTMLElement;
    if (parentCard) {
      parentCard.draggable = false;
    }
  };

  // Handle mouse leave on duration input to re-enable dragging
  const handleDurationMouseLeave = () => {
    // Re-enable dragging on the parent card when mouse leaves the input
    const parentCard = document.querySelector(`[data-frame-index="${frameIndex}"]`) as HTMLElement;
    if (parentCard) {
      parentCard.draggable = true;
    }
  };

  // Calculate frame card border styling based on state
  const getBorderStyle = () => {
    if (isDragging) {
      return 'border-primary/50 bg-primary/10';
    }
    
    if (isActive) {
      // Active frame: Full white border
      return 'border-white bg-white/5';
    }
    
    if (isSelected) {
      // Selected but not active: Dimmer white border (60% opacity)
      return 'border-white/60 bg-white/5';
    }
    
    // Unselected: Default border
    return 'border-border hover:border-primary/50';
  };

  // Onion skin indicator on canvas preview box (not card border)
  const getCanvasPreviewBorder = () => {
    if (isOnionSkinPrevious) {
      return 'border-purple-500/60';
    }
    if (isOnionSkinNext) {
      return 'border-red-500/60';
    }
    return 'border-border';
  };

  return (
    <Card
      className={`
        relative flex-shrink-0 cursor-pointer transition-all duration-150 ease-out select-none overflow-hidden flex flex-col
        ${getBorderStyle()}
        ${isDragging ? 'opacity-50 scale-95' : ''}
      `}
      onClick={(e) => onSelect(e)} // Pass event to parent
      {...dragHandleProps}
      data-frame-index={frameIndex}
      style={{
        width: `${scaledCardSize}px`,
        height: `${scaledCardSize}px`,
        maxWidth: `${scaledCardSize}px`,
        maxHeight: `${scaledCardSize}px`,
        padding: '8px', // Fixed padding
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        ...dragHandleProps?.style
      }}
    >
      {/* Frame number and controls - pinned to top */}
      <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
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
                  ? 'border-purple-500 text-purple-600' 
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
            tabIndex={-1} // Remove from tab order - tab should skip to next frame's duration input
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
            tabIndex={-1} // Remove from tab order - tab should skip to next frame's duration input
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Frame preview - flexible space between header and duration */}
      <div className="flex-1 mb-1 overflow-hidden min-h-0">
        <div className={`bg-muted/30 p-1 rounded border h-full flex items-center justify-center ${getCanvasPreviewBorder()}`}>
          {thumbnailCanvas ? (
            <img 
              src={thumbnailCanvas} 
              alt={`Frame ${frameIndex} preview`}
              className="max-w-full max-h-full object-contain rounded-sm pointer-events-none"
              style={{ imageRendering: 'pixelated' }}
            />
          ) : (
            <div className="text-muted-foreground italic text-center text-xs pointer-events-none">
              Empty
            </div>
          )}
        </div>
      </div>

      {/* Duration control - pinned to bottom with fixed height */}
      <div className="flex items-center gap-1 flex-shrink-0" style={{ height: '24px' }}>
        <input
          type="number"
          value={durationInput}
          onChange={handleDurationInputChange}
          onFocus={handleDurationFocus}
          onBlur={handleDurationBlur}
          onKeyDown={handleDurationKeyDown}
          onMouseDown={handleDurationMouseDown}
          onMouseEnter={handleDurationMouseEnter}
          onMouseLeave={handleDurationMouseLeave}
          onClick={(e) => e.stopPropagation()}
          tabIndex={11 + frameIndex} // Sequential tab order: frame 0 = tabIndex 11, frame 1 = tabIndex 12, etc.
          className="flex-1 text-xs px-1 py-0.5 border border-border rounded w-12 bg-background"
          min="17"
          max="10000"
          step="10"
        />
        <span className="text-xs text-muted-foreground">ms</span>
      </div>
    </Card>
  );
};
