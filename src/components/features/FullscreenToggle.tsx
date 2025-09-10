import React from 'react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Maximize2, Minimize2 } from 'lucide-react';

interface FullscreenToggleProps {
  isFullscreen: boolean;
  onToggle: () => void;
}

/**
 * Floating fullscreen toggle button for canvas
 * Positioned in bottom-right corner of canvas container
 */
export const FullscreenToggle: React.FC<FullscreenToggleProps> = ({ 
  isFullscreen, 
  onToggle 
}) => {
  return (
    <TooltipProvider>
      <div className="absolute bottom-16 right-6 z-10">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              onClick={onToggle}
              className="h-10 w-10 p-0 bg-background/95 backdrop-blur-md border-border/50 shadow-lg hover:bg-background"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
