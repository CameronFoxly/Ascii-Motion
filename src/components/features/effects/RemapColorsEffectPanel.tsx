/**
 * RemapColorsEffectPanel - Color remapping controls
 * 
 * Provides controls for replacing specific colors with new colors
 * in ASCII art with color selection and mapping interface.
 */

import { useCallback } from 'react';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { useEffectsStore } from '../../../stores/effectsStore';
import { RotateCcw, Plus } from 'lucide-react';

export function RemapColorsEffectPanel() {
  const { 
    remapColorsSettings,
    resetEffectSettings,
    canvasAnalysis
  } = useEffectsStore();

  // Reset to default values
  const handleReset = useCallback(() => {
    resetEffectSettings('remap-colors');
  }, [resetEffectSettings]);

  // Color analysis preview
  const colorCount = canvasAnalysis?.uniqueColors?.length || 0;
  const topColors = canvasAnalysis?.colorsByFrequency?.slice(0, 5) || [];

  return (
    <div className="space-y-4">
      
      {/* Color Analysis Summary */}
      {canvasAnalysis && (
        <div className="bg-muted/50 rounded p-3 text-xs space-y-2">
          <div className="font-medium">Available Colors ({colorCount}):</div>
          <div className="flex flex-wrap gap-1">
            {topColors.map(({ color, count }) => (
              <div key={color} className="flex items-center gap-1 text-xs">
                <div 
                  className="w-3 h-3 rounded border border-border flex-shrink-0"
                  style={{ backgroundColor: color }}
                  title={`${color} (${count} uses)`}
                />
                <span className="text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Color Mappings Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Color Mappings</Label>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              title="Add mapping"
            >
              <Plus className="w-3 h-3" />
            </Button>
            <Button
              onClick={handleReset}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              title="Reset to defaults"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        {/* Current Mappings */}
        {Object.keys(remapColorsSettings.colorMappings).length === 0 ? (
          <div className="p-4 border border-dashed border-muted-foreground/50 rounded text-center text-xs text-muted-foreground">
            No color mappings defined. Click + to add mappings.
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(remapColorsSettings.colorMappings).map(([fromColor, toColor]) => (
              <div key={fromColor} className="flex items-center gap-2 text-xs">
                <div 
                  className="w-4 h-4 rounded border border-border"
                  style={{ backgroundColor: fromColor }}
                />
                <span>→</span>
                <div 
                  className="w-4 h-4 rounded border border-border"
                  style={{ backgroundColor: toColor }}
                />
                <span className="text-muted-foreground flex-1">{fromColor} → {toColor}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Preview Hint */}
      <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded p-2 text-xs">
        <div className="text-blue-800 dark:text-blue-200">
          💡 <strong>Coming Soon:</strong> Interactive color mapping with drag & drop
          color selection from your ASCII art.
        </div>
      </div>
      
    </div>
  );
}