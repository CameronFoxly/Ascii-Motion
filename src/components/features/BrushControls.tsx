/**
 * BrushControls Component
 * 
 * Provides brush shape selection and size controls for the pencil tool
 * Follows the established UI patterns from other tool options
 */

import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Circle, Square, Minus, MoreVertical } from 'lucide-react';
import type { BrushShape } from '../../types';
import { BrushPreview } from './BrushPreview';

interface BrushControlsProps {
  className?: string;
}

export const BrushControls: React.FC<BrushControlsProps> = ({ className = '' }) => {
  const { brushSize, brushShape, setBrushSize, setBrushShape } = useToolStore();
  
  const brushShapes: Array<{ 
    id: BrushShape; 
    name: string; 
    icon: React.ReactNode; 
    description: string;
  }> = [
    { 
      id: 'circle', 
      name: 'Circle', 
      icon: <Circle className="h-3 w-3" />, 
      description: 'Circular brush shape' 
    },
    { 
      id: 'square', 
      name: 'Square', 
      icon: <Square className="h-3 w-3" />, 
      description: 'Square brush shape' 
    },
    { 
      id: 'horizontal', 
      name: 'Horizontal', 
      icon: <Minus className="h-3 w-3" />, 
      description: 'Horizontal line brush' 
    },
    { 
      id: 'vertical', 
      name: 'Vertical', 
      icon: <MoreVertical className="h-3 w-3" />, 
      description: 'Vertical line brush' 
    },
  ];

  return (
    <TooltipProvider>
      <div className={`space-y-2 ${className}`}>
        {/* Brush Preview */}
        <BrushPreview className="mt-2" />
        
        {/* Brush Shape Selection */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Brush Shape:</div>
          <div className="grid grid-cols-4 gap-1">
            {brushShapes.map((shape) => (
              <Tooltip key={shape.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={brushShape === shape.id ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-full p-0"
                    onClick={() => setBrushShape(shape.id)}
                  >
                    {shape.icon}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{shape.description}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
        
        {/* Brush Size Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Brush Size:</div>
            <div className="text-xs font-mono text-muted-foreground">{brushSize}</div>
          </div>
          <div className="px-1">
            <Slider
              value={brushSize}
              onValueChange={setBrushSize}
              min={1}
              max={20}
              step={1}
              className="w-full h-2"
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground/60">
            <span>1</span>
            <span>20</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};