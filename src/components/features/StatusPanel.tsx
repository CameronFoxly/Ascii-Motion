import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCanvasStore } from '@/stores/canvasStore';
import { useAnimationStore } from '@/stores/animationStore';
import { useToolStore } from '@/stores/toolStore';
import { useCanvasContext } from '@/contexts/CanvasContext';

export const StatusPanel: React.FC = () => {
  const { width, height, getCellCount } = useCanvasStore();
  const { frames, currentFrameIndex } = useAnimationStore();
  const { activeTool, selectedChar, selectedColor, selectedBgColor } = useToolStore();
  const { hoveredCell } = useCanvasContext();

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold">Status</h2>
      
      {/* Canvas Info */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-1 px-6 py-3">
          <CardTitle className="text-xs font-medium">Canvas</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-6 pb-3 space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Size:</span>
            <Badge variant="secondary" className="text-xs h-4">{width} × {height}</Badge>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Cells:</span>
            <Badge variant="secondary" className="text-xs h-4">{getCellCount().toLocaleString()}</Badge>
          </div>
        </CardContent>
      </Card>
      
      {/* Tool Status */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-1 px-6 py-3">
          <CardTitle className="text-xs font-medium">Tool</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-6 pb-3 space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Active:</span>
            <Badge variant="secondary" className="text-xs h-4 capitalize">{activeTool}</Badge>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Cell:</span>
            <Badge variant="secondary" className="font-mono text-xs h-4">
              {hoveredCell ? `[${hoveredCell.x}, ${hoveredCell.y}]` : '—'}
            </Badge>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Char:</span>
            <Badge variant="secondary" className="font-mono text-xs h-4">"{selectedChar}"</Badge>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Colors:</span>
            <div className="flex gap-1">
              <div 
                className="w-4 h-4 border rounded-sm" 
                style={{ backgroundColor: selectedColor }}
                title="Text color"
              />
              <div 
                className="w-4 h-4 border rounded-sm" 
                style={{ backgroundColor: selectedBgColor }}
                title="Background color"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Animation Status */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-1 px-6 py-3">
          <CardTitle className="text-xs font-medium">Animation</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-6 pb-3 space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Frames:</span>
            <Badge variant="secondary" className="text-xs h-4">{frames.length}</Badge>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Current:</span>
            <Badge variant="secondary" className="text-xs h-4">{currentFrameIndex + 1}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
