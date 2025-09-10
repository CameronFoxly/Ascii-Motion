import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
];

const UTILITY_TOOLS: Array<{ id: Tool; name: string; icon: React.ReactNode; description: string }> = [
  { id: 'eyedropper', name: 'Eyedropper', icon: <Pipette className="w-3 h-3" />, description: 'Pick character/color' },
  { id: 'hand', name: 'Hand', icon: <Hand className="w-3 h-3" />, description: 'Pan canvas view' },
];

export const ToolPalette: React.FC<ToolPaletteProps> = ({ className = '' }) => {
  const { activeTool, setActiveTool, rectangleFilled, setRectangleFilled, paintBucketContiguous, setPaintBucketContiguous, magicWandContiguous, setMagicWandContiguous, toolAffectsChar, toolAffectsColor, toolAffectsBgColor, eyedropperPicksChar, eyedropperPicksColor, eyedropperPicksBgColor, setToolAffectsChar, setToolAffectsColor, setToolAffectsBgColor, setEyedropperPicksChar, setEyedropperPicksColor, setEyedropperPicksBgColor } = useToolStore();
  const [showOptions, setShowOptions] = React.useState(true);
  const [showTools, setShowTools] = React.useState(true);

  const hasOptions = ['rectangle', 'ellipse', 'paintbucket', 'magicwand', 'pencil', 'eraser', 'text', 'eyedropper'].includes(activeTool);

  // Get the current tool's icon
  const getCurrentToolIcon = () => {
    const allTools = [...DRAWING_TOOLS, ...SELECTION_TOOLS, ...UTILITY_TOOLS];
    const currentTool = allTools.find(tool => tool.id === activeTool);
    return currentTool?.icon || null;
  };

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
      <div className={`space-y-1 ${className}`}>
        <Collapsible open={showTools} onOpenChange={setShowTools}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full h-6 text-xs justify-between p-1">
              Tools
              <ChevronDown className="h-3 w-3" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="collapsible-content">
            <Card className="border-border/50 mt-1">
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
                  <div className="grid grid-cols-3 gap-1" role="toolbar" aria-label="Selection tools">
                    {SELECTION_TOOLS.map((tool) => (
                      <ToolButton key={tool.id} tool={tool} />
                    ))}
                  </div>
                </div>

                {/* Utility Tools Section */}
                <div className="space-y-2 mt-3">
                  <h4 className="text-xs font-medium text-muted-foreground">Utility</h4>
                  <div className="grid grid-cols-2 gap-1" role="toolbar" aria-label="Utility tools">
                    {UTILITY_TOOLS.map((tool) => (
                      <ToolButton key={tool.id} tool={tool} />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Tool Options */}
        {hasOptions && (
          <Collapsible open={showOptions} onOpenChange={setShowOptions}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full h-6 text-xs justify-between p-1">
                <div className="flex items-center gap-1">
                  {getCurrentToolIcon()}
                  <span>Tool Options</span>
                </div>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="collapsible-content">
              <Card className="bg-card/50 border-border/50 mt-1">
                <CardContent className="p-2 space-y-2">
                  {activeTool === 'rectangle' && (
                    <div className="flex items-center justify-between">
                      <Label htmlFor="filled-rectangle" className="text-xs cursor-pointer">
                        Filled rectangle
                      </Label>
                      <Switch
                        id="filled-rectangle"
                        checked={rectangleFilled}
                        onCheckedChange={setRectangleFilled}
                      />
                    </div>
                  )}
                  
                  {activeTool === 'ellipse' && (
                    <div className="flex items-center justify-between">
                      <Label htmlFor="filled-ellipse" className="text-xs cursor-pointer">
                        Filled ellipse
                      </Label>
                      <Switch
                        id="filled-ellipse"
                        checked={rectangleFilled}
                        onCheckedChange={setRectangleFilled}
                      />
                    </div>
                  )}
                  
                  {activeTool === 'paintbucket' && (
                    <div className="flex items-center justify-between">
                      <Label htmlFor="contiguous-fill" className="text-xs cursor-pointer">
                        Contiguous fill only
                      </Label>
                      <Switch
                        id="contiguous-fill"
                        checked={paintBucketContiguous}
                        onCheckedChange={setPaintBucketContiguous}
                      />
                    </div>
                  )}
                  
                  {activeTool === 'magicwand' && (
                    <div className="flex items-center justify-between">
                      <Label htmlFor="contiguous-selection" className="text-xs cursor-pointer">
                        Contiguous selection only
                      </Label>
                      <Switch
                        id="contiguous-selection"
                        checked={magicWandContiguous}
                        onCheckedChange={setMagicWandContiguous}
                      />
                    </div>
                  )}
                  
                  {/* Tool behavior toggles for drawing tools */}
                  {(['pencil', 'eraser', 'paintbucket', 'rectangle', 'ellipse', 'text'] as Tool[]).includes(activeTool) && (
                    <>
                      <div className="border-t border-border/30 my-2"></div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="affects-char" className="text-xs cursor-pointer">
                            Affect character
                          </Label>
                          <Switch
                            id="affects-char"
                            checked={toolAffectsChar}
                            onCheckedChange={setToolAffectsChar}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="affects-color" className="text-xs cursor-pointer">
                            Affect text color
                          </Label>
                          <Switch
                            id="affects-color"
                            checked={toolAffectsColor}
                            onCheckedChange={setToolAffectsColor}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="affects-bg-color" className="text-xs cursor-pointer">
                            Affect background color
                          </Label>
                          <Switch
                            id="affects-bg-color"
                            checked={toolAffectsBgColor}
                            onCheckedChange={setToolAffectsBgColor}
                          />
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* Eyedropper behavior toggles */}
                  {activeTool === 'eyedropper' && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="picks-char" className="text-xs cursor-pointer">
                            Pick character
                          </Label>
                          <Switch
                            id="picks-char"
                            checked={eyedropperPicksChar}
                            onCheckedChange={setEyedropperPicksChar}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="picks-color" className="text-xs cursor-pointer">
                            Pick text color
                          </Label>
                          <Switch
                            id="picks-color"
                            checked={eyedropperPicksColor}
                            onCheckedChange={setEyedropperPicksColor}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="picks-bg-color" className="text-xs cursor-pointer">
                            Pick background color
                          </Label>
                          <Switch
                            id="picks-bg-color"
                            checked={eyedropperPicksBgColor}
                            onCheckedChange={setEyedropperPicksBgColor}
                          />
                        </div>
                      </div>
                    </>
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
