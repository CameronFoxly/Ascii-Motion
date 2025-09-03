import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  PenTool, 
  Eraser, 
  PaintBucket, 
  MousePointer, 
  Pipette, 
  Square 
} from 'lucide-react';
import type { Tool } from '../../types';

interface ToolPaletteProps {
  className?: string;
}

const TOOLS: Array<{ id: Tool; name: string; icon: React.ReactNode; description: string }> = [
  { id: 'pencil', name: 'Pencil', icon: <PenTool className="w-4 h-4" />, description: 'Draw characters' },
  { id: 'eraser', name: 'Eraser', icon: <Eraser className="w-4 h-4" />, description: 'Remove characters' },
  { id: 'paintbucket', name: 'Fill', icon: <PaintBucket className="w-4 h-4" />, description: 'Fill connected areas' },
  { id: 'select', name: 'Select', icon: <MousePointer className="w-4 h-4" />, description: 'Select rectangular areas' },
  { id: 'eyedropper', name: 'Eyedropper', icon: <Pipette className="w-4 h-4" />, description: 'Pick character/color' },
  { id: 'rectangle', name: 'Rectangle', icon: <Square className="w-4 h-4" />, description: 'Draw rectangles' },
];

export const ToolPalette: React.FC<ToolPaletteProps> = ({ className = '' }) => {
  const { activeTool, setActiveTool, rectangleFilled, setRectangleFilled } = useToolStore();

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Tools</h3>
        <Badge variant="outline" className="text-xs">{TOOLS.length}</Badge>
      </div>
      
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {TOOLS.map((tool) => (
              <Button
                key={tool.id}
                variant={activeTool === tool.id ? 'default' : 'outline'}
                size="lg"
                className={`h-20 w-full flex flex-col items-center gap-2 p-3 transition-all duration-200 border-2 ${
                  activeTool === tool.id 
                    ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' 
                    : 'bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground'
                }`}
                onClick={() => setActiveTool(tool.id)}
                title={tool.description}
              >
                <div className="flex-shrink-0">
                  {tool.icon}
                </div>
                <span className="text-xs font-medium leading-none">{tool.name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tool-specific options */}
      {activeTool === 'rectangle' && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Rectangle Options</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={rectangleFilled}
                onChange={(e) => setRectangleFilled(e.target.checked)}
                className="rounded border-border"
              />
              <span>Filled rectangle</span>
            </label>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
