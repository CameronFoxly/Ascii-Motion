import React from 'react';
import { Button } from '@/components/ui/button';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { useCanvasContext } from '../../contexts/CanvasContext';

export const ZoomControls: React.FC = () => {
  const { zoom, setZoom } = useCanvasContext();
  
  const zoomIn = () => {
    const newZoom = Math.min(4.0, zoom * 1.25); // Max 400%
    setZoom(Math.round(newZoom * 100) / 100); // Round to 2 decimal places
  };
  
  const zoomOut = () => {
    const newZoom = Math.max(0.25, zoom / 1.25); // Min 25%
    setZoom(Math.round(newZoom * 100) / 100); // Round to 2 decimal places
  };
  
  const resetZoom = () => {
    setZoom(1.0);
  };
  
  const zoomPercentage = Math.round(zoom * 100);
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Zoom:</span>
      
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={zoomOut}
          disabled={zoom <= 0.25}
          title="Zoom out"
          className="h-7 w-7 p-0"
        >
          <Minus className="w-3 h-3" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={resetZoom}
          title="Reset zoom to 100%"
          className="h-7 px-3 min-w-[60px]"
        >
          <span className="text-xs font-medium">{zoomPercentage}%</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={zoomIn}
          disabled={zoom >= 4.0}
          title="Zoom in"
          className="h-7 w-7 p-0"
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
      
      {zoom !== 1.0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={resetZoom}
          title="Reset zoom"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
};
