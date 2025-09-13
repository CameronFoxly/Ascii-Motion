import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { CollapsibleHeader } from '../common/CollapsibleHeader';
import { useToolStore } from '@/stores/toolStore';
import { useCanvasContext } from '@/contexts/CanvasContext';

export const StatusPanel: React.FC = () => {
  const { activeTool, selectedChar, selectedColor, selectedBgColor } = useToolStore();
  const { hoveredCell } = useCanvasContext();
  const [showStatus, setShowStatus] = React.useState(false);

  return (
    <div className="space-y-3">
      <Collapsible open={showStatus} onOpenChange={setShowStatus}>
        <CollapsibleContent className="collapsible-content-up">
          {/* Tool Status */}
          <Card className="bg-card/50 border-border/50 mb-1">
            <CardHeader className="pb-1 px-3 py-3">
              <CardTitle className="text-xs font-medium">Tool</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-3 pb-3 space-y-1">
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
        </CollapsibleContent>
        <CollapsibleHeader isOpen={showStatus} expandsUp>
          Status
        </CollapsibleHeader>
      </Collapsible>
    </div>
  );
};
