import React, { useMemo } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import type { Frame } from '../../types';
import { X, Copy } from 'lucide-react';

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
  dragHandleProps
}) => {
  // Generate ASCII preview from frame data
  const asciiPreview = useMemo(() => {
    const lines: string[] = [];
    const maxPreviewHeight = 8; // Max lines to show in thumbnail
    const maxPreviewWidth = 20; // Max chars per line
    
    // Calculate scaling to fit preview
    const scaleX = Math.max(1, Math.ceil(canvasWidth / maxPreviewWidth));
    const scaleY = Math.max(1, Math.ceil(canvasHeight / maxPreviewHeight));
    
    for (let y = 0; y < Math.min(canvasHeight, maxPreviewHeight); y += scaleY) {
      let line = '';
      for (let x = 0; x < Math.min(canvasWidth, maxPreviewWidth); x += scaleX) {
        const cellKey = `${x * scaleX},${y * scaleY}`;
        const cell = frame.data.get(cellKey);
        line += cell?.char || ' ';
      }
      lines.push(line);
    }
    
    return lines;
  }, [frame.data, canvasWidth, canvasHeight]);

  // Handle duration input change
  const handleDurationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDuration = parseInt(event.target.value) || 100;
    onDurationChange(Math.max(50, Math.min(5000, newDuration))); // Clamp between 50-5000ms
  };

  return (
    <Card
      className={`
        relative flex-shrink-0 w-44 h-28 p-2 cursor-pointer transition-all
        ${isSelected 
          ? 'ring-2 ring-primary border-primary bg-primary/5' 
          : 'border-border hover:border-primary/50'
        }
        ${isDragging ? 'opacity-50 scale-95' : ''}
      `}
      onClick={onSelect}
      {...dragHandleProps}
    >
      {/* Frame number and controls */}
      <div className="flex items-center justify-between mb-1">
        <Badge variant="outline" className="text-xs px-1 py-0">
          {frameIndex + 1}
        </Badge>
        
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

      {/* ASCII preview */}
      <div className="flex-1 mb-1 overflow-hidden">
        <div className="text-xs font-mono leading-none bg-muted/30 p-1 rounded border h-full">
          {asciiPreview.length > 0 ? (
            asciiPreview.map((line, idx) => (
              <div key={idx} className="whitespace-pre">
                {line || ' '}
              </div>
            ))
          ) : (
            <div className="text-muted-foreground italic text-center flex items-center justify-center h-full text-xs">
              Empty
            </div>
          )}
        </div>
      </div>

      {/* Duration control */}
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={frame.duration}
          onChange={handleDurationChange}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-xs px-1 py-0.5 border rounded w-12 bg-background"
          min="50"
          max="5000"
          step="10"
        />
        <span className="text-xs text-muted-foreground">ms</span>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute inset-0 pointer-events-none border-2 border-primary rounded-md" />
      )}
    </Card>
  );
};
