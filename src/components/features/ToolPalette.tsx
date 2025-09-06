import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  PenTool, 
  Eraser, 
  PaintBucket, 
  MousePointer, 
  Pipette, 
  Square,
  Circle,
  Hand,
  Lasso,
  Type,
  Wand2,
  ChevronDown
} from 'lucide-react';
import type { Tool } from '../../types';
import { getToolTooltipText } from '../../constants/hotkeys';

interface ToolPaletteProps {
  className?: string;
}

const TOOLS: Array<{ id: Tool; name: string; icon: React.ReactNode; description: string }> = [
  { id: 'pencil', name: 'Pencil', icon: <PenTool className="w-3 h-3" />, description: 'Draw characters' },
  { id: 'eraser', name: 'Eraser', icon: <Eraser className="w-3 h-3" />, description: 'Remove characters' },
  { id: 'paintbucket', name: 'Fill', icon: <PaintBucket className="w-3 h-3" />, description: 'Fill connected areas' },
  { id: 'select', name: 'Select', icon: <MousePointer className="w-3 h-3" />, description: 'Select rectangular areas' },
  { id: 'lasso', name: 'Lasso', icon: <Lasso className="w-3 h-3" />, description: 'Freeform selection tool' },
  { id: 'magicwand', name: 'Magic Wand', icon: <Wand2 className="w-3 h-3" />, description: 'Select matching cells' },
  { id: 'eyedropper', name: 'Eyedropper', icon: <Pipette className="w-3 h-3" />, description: 'Pick character/color' },
  { id: 'rectangle', name: 'Rectangle', icon: <Square className="w-3 h-3" />, description: 'Draw rectangles' },
  { id: 'ellipse', name: 'Ellipse', icon: <Circle className="w-3 h-3" />, description: 'Draw ellipses/circles' },
  { id: 'text', name: 'Text', icon: <Type className="w-3 h-3" />, description: 'Type text directly' },
  { id: 'hand', name: 'Hand', icon: <Hand className="w-3 h-3" />, description: 'Pan canvas view' },
];

export const ToolPalette: React.FC<ToolPaletteProps> = ({ className = '' }) => {
  const { activeTool, setActiveTool, rectangleFilled, setRectangleFilled, paintBucketContiguous, setPaintBucketContiguous, magicWandContiguous, setMagicWandContiguous } = useToolStore();
  const [showOptions, setShowOptions] = React.useState(false);

  const hasOptions = ['rectangle', 'ellipse', 'paintbucket', 'magicwand'].includes(activeTool);

  return (
    <TooltipProvider>
      <div className={`space-y-2 ${className}`}>
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold">Tools</h3>
          <Badge variant="outline" className="text-xs h-4">{TOOLS.length}</Badge>
        </div>
        
        <Card>
          <CardContent className="p-2">
            <div className="grid grid-cols-3 gap-1" role="toolbar" aria-label="Drawing tools">
              {TOOLS.map((tool) => (
                <Tooltip key={tool.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={activeTool === tool.id ? 'default' : 'outline'}
                      size="sm"
                      className="h-10 w-10 p-0 touch-manipulation sm:h-8 sm:w-8"
                      onClick={() => setActiveTool(tool.id)}
                      aria-label={`${tool.name} tool - ${tool.description}`}
                      aria-pressed={activeTool === tool.id}
                      title={`${tool.name} - ${tool.description}`}
                    >
                      {tool.icon}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="text-xs">{getToolTooltipText(tool.id, tool.description)}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tool Options */}
        {hasOptions && (
          <Collapsible open={showOptions} onOpenChange={setShowOptions}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full h-6 text-xs justify-between p-1">
                Options
                <ChevronDown className="h-3 w-3" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="bg-card/50 border-border/50 mt-1">
                <CardContent className="p-2">
                  {activeTool === 'rectangle' && (
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rectangleFilled}
                        onChange={(e) => setRectangleFilled(e.target.checked)}
                        className="w-3 h-3 rounded border-border"
                      />
                      <span>Filled</span>
                    </label>
                  )}

                  {activeTool === 'ellipse' && (
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rectangleFilled}
                        onChange={(e) => setRectangleFilled(e.target.checked)}
                        className="w-3 h-3 rounded border-border"
                      />
                      <span>Filled</span>
                    </label>
                  )}

                  {activeTool === 'paintbucket' && (
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={paintBucketContiguous}
                        onChange={(e) => setPaintBucketContiguous(e.target.checked)}
                        className="w-3 h-3 rounded border-border"
                      />
                      <span>Contiguous</span>
                    </label>
                  )}

                  {activeTool === 'magicwand' && (
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={magicWandContiguous}
                        onChange={(e) => setMagicWandContiguous(e.target.checked)}
                        className="w-3 h-3 rounded border-border"
                      />
                      <span>Contiguous</span>
                    </label>
                  )}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </TooltipProvider>
  );
};
