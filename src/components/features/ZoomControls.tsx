import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { useCanvasContext } from '../../contexts/CanvasContext';

/**
 * Custom hook for zoom functionality that can be shared between UI and keyboard shortcuts
 */
export const useZoomControls = () => {
  const { zoom, setZoom, panOffset, setPanOffset } = useCanvasContext();
  
  const zoomIn = () => {
    const newZoom = Math.min(4.0, zoom + 0.2); // 20% increments (max 400%)
    setZoom(Math.round(newZoom * 100) / 100); // Round to 2 decimal places
  };
  
  const zoomOut = () => {
    const newZoom = Math.max(0.2, zoom - 0.2); // 20% increments (min 20%)
    setZoom(Math.round(newZoom * 100) / 100); // Round to 2 decimal places
  };
  
  const resetZoom = () => {
    setZoom(1.0);
  };
  
  const resetView = () => {
    setZoom(1.0);
    setPanOffset({ x: 0, y: 0 });
  };
  
  return { zoom, zoomIn, zoomOut, resetZoom, resetView, panOffset };
};

export const ZoomControls: React.FC = () => {
  const { zoom, zoomIn, zoomOut, resetZoom, resetView, panOffset } = useZoomControls();
  
  // Check if view is at default state (zoom = 1.0 and no pan offset)
  const isViewAtDefault = zoom === 1.0 && panOffset.x === 0 && panOffset.y === 0;
  
  const zoomPercentage = Math.round(zoom * 100);
  
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Zoom:</span>
        
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={zoomOut}
                disabled={zoom <= 0.2}
                className="h-7 w-7 p-0"
              >
                <Minus className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Zoom out (-)</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={resetZoom}
                className="h-7 px-3 min-w-[60px]"
              >
                <span className="text-xs font-medium">{zoomPercentage}%</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reset zoom to 100%</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={zoomIn}
                disabled={zoom >= 4.0}
                className="h-7 w-7 p-0"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Zoom in (+)</p>
            </TooltipContent>
          </Tooltip>
        </div>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetView}
              disabled={isViewAtDefault}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Reset view (zoom and position)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
