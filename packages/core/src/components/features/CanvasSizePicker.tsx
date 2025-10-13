import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';

interface CanvasSizePickerProps {
  width: number;
  height: number;
  onSizeChange: (width: number, height: number) => void;
  className?: string;
}

export const CanvasSizePicker: React.FC<CanvasSizePickerProps> = ({
  width,
  height,
  onSizeChange,
  className = ''
}) => {
  const [localWidth, setLocalWidth] = useState(width.toString());
  const [localHeight, setLocalHeight] = useState(height.toString());

  // Update local state when props change
  useEffect(() => {
    setLocalWidth(width.toString());
    setLocalHeight(height.toString());
  }, [width, height]);

  const handleWidthChange = (value: string) => {
    setLocalWidth(value);
  };

  const handleWidthBlur = () => {
    const numValue = parseInt(localWidth, 10);
    if (isNaN(numValue) || localWidth === '') {
      // Reset to current value if invalid or empty
      setLocalWidth(width.toString());
    } else {
      // Apply constraints and update
      const constrainedValue = Math.max(4, Math.min(200, numValue));
      onSizeChange(constrainedValue, height);
    }
  };

  const handleWidthKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur(); // Trigger blur to apply validation
    }
  };

  const handleHeightChange = (value: string) => {
    setLocalHeight(value);
  };

  const handleHeightBlur = () => {
    const numValue = parseInt(localHeight, 10);
    if (isNaN(numValue) || localHeight === '') {
      // Reset to current value if invalid or empty
      setLocalHeight(height.toString());
    } else {
      // Apply constraints and update
      const constrainedValue = Math.max(4, Math.min(100, numValue));
      onSizeChange(width, constrainedValue);
    }
  };

  const handleHeightKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur(); // Trigger blur to apply validation
    }
  };

  const adjustWidth = (delta: number) => {
    const newWidth = Math.max(4, Math.min(200, width + delta));
    onSizeChange(newWidth, height);
  };

  const adjustHeight = (delta: number) => {
    const newHeight = Math.max(4, Math.min(100, height + delta));
    onSizeChange(width, newHeight);
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="text-sm font-medium text-muted-foreground">Canvas size:</span>
      
      {/* Width controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => adjustWidth(-1)}
          disabled={width <= 4}
          className="h-7 w-7 p-0"
        >
          <Minus className="w-3 h-3" />
        </Button>
        
        <input
          type="number"
          value={localWidth}
          onChange={(e) => handleWidthChange(e.target.value)}
          onBlur={handleWidthBlur}
          onKeyDown={handleWidthKeyDown}
          className="w-12 h-7 px-2 text-center text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          min="4"
          max="200"
        />
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => adjustWidth(1)}
          disabled={width >= 200}
          className="h-7 w-7 p-0"
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      <span className="text-xs text-muted-foreground">×</span>

      {/* Height controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => adjustHeight(-1)}
          disabled={height <= 4}
          className="h-7 w-7 p-0"
        >
          <Minus className="w-3 h-3" />
        </Button>
        
        <input
          type="number"
          value={localHeight}
          onChange={(e) => handleHeightChange(e.target.value)}
          onBlur={handleHeightBlur}
          onKeyDown={handleHeightKeyDown}
          className="w-12 h-7 px-2 text-center text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          min="4"
          max="100"
        />
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => adjustHeight(1)}
          disabled={height >= 100}
          className="h-7 w-7 p-0"
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};
