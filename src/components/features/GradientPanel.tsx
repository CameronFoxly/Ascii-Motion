/**
 * GradientPanel - Full overlay panel for configuring gradient fill tool
 * 
 * Features:
 * - Full overlay panel matching MediaImportPanel design
 * - Comprehensive gradient configuration with stops management
 * - Live preview on canvas as settings change
 * - Support for character, color, and background gradients
 * - Multiple interpolation methods and gradient types
 */

import { useEffect } from 'react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { 
  SwatchBook,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useGradientStore } from '../../stores/gradientStore';
import { useToolStore } from '../../stores/toolStore';

export function GradientPanel() {
  const { activeTool } = useToolStore();
  const { isOpen, setIsOpen } = useGradientStore();

  // Auto-open panel when gradient tool becomes active
  // Auto-close when switching away from gradient tool
  useEffect(() => {
    if (activeTool === 'gradientfill') {
      if (!isOpen) {
        setIsOpen(true);
      }
    } else {
      if (isOpen) {
        setIsOpen(false);
      }
    }
  }, [activeTool, isOpen, setIsOpen]);

  // Don't render if panel is not open
  if (!isOpen) {
    return null;
  }

  return (
    <div className={cn(
      "fixed inset-y-0 right-0 w-80 bg-background border-l border-border shadow-lg z-50 flex flex-col overflow-hidden transition-transform duration-300 ease-in-out",
      isOpen ? "translate-x-0" : "translate-x-full"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <SwatchBook className="w-3 h-3" />
          Gradient Fill
        </h2>
        <Button
          onClick={() => setIsOpen(false)}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      {/* Scrollable Content Area */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4" style={{ width: '296px', maxWidth: '296px' }}>
          <div className="text-center py-8">
            <SwatchBook className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-sm font-medium mb-2">
              Gradient Configuration
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Full gradient panel UI coming in Phase 5.4!
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Click and drag on canvas to apply gradients</p>
              <p>Alt+click for eyedropper</p>
              <p>F key to activate gradient tool</p>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}