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

// Custom dashed rectangle icon for selection tool
const DashedRectangleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    className={className}
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
  >
    <rect 
      x="3" 
      y="3" 
      width="18" 
      height="18" 
      strokeDasharray="3 3"
      fill="none"
    />
  </svg>
);

// Organized tools by category
const DRAWING_TOOLS: Array<{ id: Tool; name: string; icon: React.ReactNode; description: string }> = [
  { id: 'pencil', name: 'Pencil', icon: <PenTool className="w-3 h-3" />, description: 'Draw characters' },
  { id: 'eraser', name: 'Eraser', icon: <Eraser className="w-3 h-3" />, description: 'Remove characters' },
  { id: 'paintbucket', name: 'Fill', icon: <PaintBucket className="w-3 h-3" />, description: 'Fill connected areas' },
  { id: 'rectangle', name: 'Rectangle', icon: <Square className="w-3 h-3" />, description: 'Draw rectangles' },
  { id: 'ellipse', name: 'Ellipse', icon: <Circle className="w-3 h-3" />, description: 'Draw ellipses/circles' },
  { id: 'text', name: 'Text', icon: <Type className="w-3 h-3" />, description: 'Type text directly' },
];

const SELECTION_TOOLS: Array<{ id: Tool; name: string; icon: React.ReactNode; description: string }> = [
  { id: 'select', name: 'Select', icon: <DashedRectangleIcon className="w-3 h-3" />, description: 'Select rectangular areas' },
  { id: 'lasso', name: 'Lasso', icon: <Lasso className="w-3 h-3" />, description: 'Freeform selection tool' },
  { id: 'magicwand', name: 'Magic Wand', icon: <Wand2 className="w-3 h-3" />, description: 'Select matching cells' },
  { id: 'hand', name: 'Hand', icon: <Hand className="w-3 h-3" />, description: 'Pan canvas view' },
];

// Separate utility tool
const UTILITY_TOOLS: Array<{ id: Tool; name: string; icon: React.ReactNode; description: string }> = [
  { id: 'eyedropper', name: 'Eyedropper', icon: <Pipette className="w-3 h-3" />, description: 'Pick character/color' },
];

export const ToolPalette: React.FC<ToolPaletteProps> = ({ className = '' }) => {
  const { activeTool, setActiveTool, rectangleFilled, setRectangleFilled, paintBucketContiguous, setPaintBucketContiguous, magicWandContiguous, setMagicWandContiguous } = useToolStore();
  const [showOptions, setShowOptions] = React.useState(false);

  const allTools = [...DRAWING_TOOLS, ...SELECTION_TOOLS, ...UTILITY_TOOLS];
  const hasOptions = ['rectangle', 'ellipse', 'paintbucket', 'magicwand'].includes(activeTool);

  const ToolButton: React.FC<{ tool: { id: Tool; name: string; icon: React.ReactNode; description: string } }> = ({ tool }) => (
    <Tooltip key={tool.id}>
      <TooltipTrigger asChild>
        <Button
          variant={activeTool === tool.id ? 'default' : 'outline'}
          size="sm"
          className="h-8 w-8 p-0 touch-manipulation"
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
  );

  return (
    <TooltipProvider>
      <div className={`space-y-2 ${className}`}>
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold">Tools</h3>
          <Badge variant="outline" className="text-xs h-4">{allTools.length}</Badge>
        </div>
        
        <Card className="border-border/50">
          <CardContent className="p-3">
            {/* Drawing Tools Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">Drawing</h4>
              <div className="grid grid-cols-3 gap-1" role="toolbar" aria-label="Drawing tools">
                {DRAWING_TOOLS.map((tool) => (
                  <ToolButton key={tool.id} tool={tool} />
                ))}
              </div>
            </div>

            {/* Selection Tools Section */}
            <div className="space-y-2 mt-3">
              <h4 className="text-xs font-medium text-muted-foreground">Selection</h4>
              <div className="grid grid-cols-2 gap-1" role="toolbar" aria-label="Selection tools">
                {SELECTION_TOOLS.map((tool) => (
                  <ToolButton key={tool.id} tool={tool} />
                ))}
              </div>
            </div>

            {/* Utility Tools Section */}
            <div className="space-y-2 mt-3">
              <h4 className="text-xs font-medium text-muted-foreground">Utility</h4>
              <div className="flex gap-1" role="toolbar" aria-label="Utility tools">
                {UTILITY_TOOLS.map((tool) => (
                  <ToolButton key={tool.id} tool={tool} />
                ))}
              </div>
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
                        className="rounded"
                      />
                      Filled rectangle
                    </label>
                  )}
                  
                  {activeTool === 'ellipse' && (
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rectangleFilled}
                        onChange={(e) => setRectangleFilled(e.target.checked)}
                        className="rounded"
                      />
                      Filled ellipse
                    </label>
                  )}
                  
                  {activeTool === 'paintbucket' && (
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={paintBucketContiguous}
                        onChange={(e) => setPaintBucketContiguous(e.target.checked)}
                        className="rounded"
                      />
                      Contiguous fill only
                    </label>
                  )}
                  
                  {activeTool === 'magicwand' && (
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={magicWandContiguous}
                        onChange={(e) => setMagicWandContiguous(e.target.checked)}
                        className="rounded"
                      />
                      Contiguous selection only
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
