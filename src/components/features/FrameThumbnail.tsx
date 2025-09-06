import React, { useMemo } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import type { Frame, Cell } from '../../types';
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
    <TooltipProvider>
      <Card
        className={`
          relative flex-shrink-0 w-48 h-32 p-2 cursor-pointer transition-all
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
          <Badge variant="outline" className="text-xs">
            {frameIndex + 1}
          </Badge>
          
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate();
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Duplicate frame</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete frame</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ASCII preview */}
        <div className="flex-1 mb-2 overflow-hidden">
          <div className="text-xs font-mono leading-none bg-muted/30 p-2 rounded border h-full">
            {asciiPreview.length > 0 ? (
              asciiPreview.map((line, idx) => (
                <div key={idx} className="whitespace-pre">
                  {line || ' '}
                </div>
              ))
            ) : (
              <div className="text-muted-foreground italic text-center flex items-center justify-center h-full">
                Empty
              </div>
            )}
          </div>
        </div>

        {/* Duration control */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Duration:</label>
          <input
            type="number"
            value={frame.duration}
            onChange={handleDurationChange}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-xs px-2 py-1 border rounded w-16 bg-background"
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
    </TooltipProvider>
  );
};
