import React from 'react';
import { Search } from 'lucide-react';
import { Slider } from '../ui/slider';
import { useAnimationStore } from '../../stores/animationStore';

/**
 * Timeline zoom control component
 * Provides a slider to adjust the size of frame cards from 50% to 100%
 */
export const TimelineZoomControl: React.FC = () => {
  const { timelineZoom, setTimelineZoom } = useAnimationStore();
  
  // Convert zoom value (0.5-1.0) to percentage for display
  const zoomPercentage = Math.round(timelineZoom * 100);
  
  const handleZoomChange = (value: number) => {
    // Convert percentage back to zoom value (0.5-1.0)
    const zoomValue = value / 100;
    setTimelineZoom(zoomValue);
  };
  
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Slider
        value={zoomPercentage}
        onValueChange={handleZoomChange}
        min={60}
        max={100}
        step={5}
        className="w-24 h-1.5"
        title={`Timeline zoom: ${zoomPercentage}%`}
      />
      <Search className="h-3 w-3 text-muted-foreground/70" />
    </div>
  );
};
