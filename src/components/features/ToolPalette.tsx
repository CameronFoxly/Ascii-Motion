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
  Square,
  Circle,
  Hand,
  Lasso,
  Type,
  Wand2
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
  { id: 'lasso', name: 'Lasso', icon: <Lasso className="w-4 h-4" />, description: 'Freeform selection tool' },
  { id: 'magicwand', name: 'Magic Wand', icon: <Wand2 className="w-4 h-4" />, description: 'Select matching cells' },
  { id: 'eyedropper', name: 'Eyedropper', icon: <Pipette className="w-4 h-4" />, description: 'Pick character/color' },
  { id: 'rectangle', name: 'Rectangle', icon: <Square className="w-4 h-4" />, description: 'Draw rectangles' },
  { id: 'ellipse', name: 'Ellipse', icon: <Circle className="w-4 h-4" />, description: 'Draw ellipses/circles' },
  { id: 'text', name: 'Text', icon: <Type className="w-4 h-4" />, description: 'Type text directly' },
  { id: 'hand', name: 'Hand', icon: <Hand className="w-4 h-4" />, description: 'Pan canvas view' },
];

export const ToolPalette: React.FC<ToolPaletteProps> = ({ className = '' }) => {
  const { activeTool, setActiveTool, rectangleFilled, setRectangleFilled, paintBucketContiguous, setPaintBucketContiguous, magicWandContiguous, setMagicWandContiguous } = useToolStore();

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Tools</h3>
        <Badge variant="outline" className="text-xs">{TOOLS.length}</Badge>
      </div>
      
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {TOOLS.map((tool) => (
              <Button
                key={tool.id}
                variant={activeTool === tool.id ? 'default' : 'outline'}
                size="lg"
                className="h-16 flex flex-col gap-1"
                onClick={() => setActiveTool(tool.id)}
                title={tool.description}
              >
                {tool.icon}
                <span className="text-xs">{tool.name}</span>
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

      {activeTool === 'ellipse' && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Ellipse Options</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={rectangleFilled}
                onChange={(e) => setRectangleFilled(e.target.checked)}
                className="rounded border-border"
              />
              <span>Filled ellipse</span>
            </label>
          </CardContent>
        </Card>
      )}

      {activeTool === 'paintbucket' && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Fill Options</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={paintBucketContiguous}
                onChange={(e) => setPaintBucketContiguous(e.target.checked)}
                className="rounded border-border"
              />
              <span>Contiguous fill (connected areas only)</span>
            </label>
          </CardContent>
        </Card>
      )}

      {activeTool === 'magicwand' && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Magic Wand Options</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={magicWandContiguous}
                onChange={(e) => setMagicWandContiguous(e.target.checked)}
                className="rounded border-border"
              />
              <span>Contiguous selection (connected cells only)</span>
            </label>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
