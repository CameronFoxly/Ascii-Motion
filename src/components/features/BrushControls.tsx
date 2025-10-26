/**
 * BrushControls Component
 * 
 * Provides brush shape selection and size controls for the pencil tool
 * Follows the established UI patterns from other tool options
 */

import React, { useMemo, useCallback } from 'react';
import { useToolStore } from '../../stores/toolStore';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Circle, Square, Minus, MoreVertical, Plus } from 'lucide-react';
import type { BrushShape } from '../../types';

interface BrushControlsProps {
  tool: 'pencil' | 'eraser';
  className?: string;
}

export const BrushControls: React.FC<BrushControlsProps> = ({ tool, className = '' }) => {
  const brushSize = useToolStore((state) => state.brushSettings[tool].size);
  const brushShape = useToolStore((state) => state.brushSettings[tool].shape);
  const setBrushSize = useToolStore((state) => state.setBrushSize);
  const setBrushShape = useToolStore((state) => state.setBrushShape);
  const showBrushSizePreview = useToolStore((state) => state.showBrushSizePreview);

  const labelPrefix = tool === 'eraser' ? 'Eraser' : 'Brush';
  const tooltipPrefix = tool === 'eraser' ? 'Eraser brush' : 'Brush';
  
  const brushShapes = useMemo<Array<{ 
    id: BrushShape; 
    name: string; 
    icon: React.ReactNode; 
    description: string;
  }>>(() => ([
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
  ]), []);

  const handleSliderChange = useCallback((value: number) => {
    setBrushSize(value, tool);
    showBrushSizePreview();
  }, [setBrushSize, tool, showBrushSizePreview]);

  return (
    <TooltipProvider>
      <div className={`space-y-2 ${className}`}>
        {/* Brush Size Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">{labelPrefix} Size:</div>
            <div className="text-xs font-mono text-muted-foreground">{brushSize}</div>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 w-6 p-0"
                  data-brush-control="true"
                  onClick={() => {
                    setBrushSize(Math.max(1, brushSize - 1), tool);
                    showBrushSizePreview();
                  }}
                  disabled={brushSize <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Decrease {tooltipPrefix.toLowerCase()} size ([)</p>
              </TooltipContent>
            </Tooltip>
            <div className="flex-1 px-1" data-brush-control="true">
              <Slider
                value={brushSize}
                onValueChange={handleSliderChange}
                min={1}
                max={20}
                step={1}
                className="w-full h-2"
              />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 w-6 p-0"
                  data-brush-control="true"
                  onClick={() => {
                    setBrushSize(Math.min(20, brushSize + 1), tool);
                    showBrushSizePreview();
                  }}
                  disabled={brushSize >= 20}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Increase {tooltipPrefix.toLowerCase()} size (])</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        {/* Brush Shape Selection */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">{labelPrefix} Shape:</div>
          <div className="grid grid-cols-4 gap-1">
            {brushShapes.map((shape) => (
              <Tooltip key={shape.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={brushShape === shape.id ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-full p-0"
                    data-brush-control="true"
                    onClick={() => setBrushShape(shape.id, tool)}
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
      </div>
    </TooltipProvider>
  );
};