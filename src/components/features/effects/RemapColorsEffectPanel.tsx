/**
 * RemapColorsEffectPanel - Color remapping controls
 * 
 * Provides controls for replacing specific colors with new colors
 * in ASCII art with color selection and mapping interface.
 */

import { useCallback, useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Switch } from '../../ui/switch';
import { useEffectsStore } from '../../../stores/effectsStore';
import { RotateCcw, Plus, X, Eye, EyeOff } from 'lucide-react';

export function RemapColorsEffectPanel() {
  const { 
    remapColorsSettings,
    updateRemapColorsSettings,
    resetEffectSettings,
    canvasAnalysis,
    isPreviewActive,
    previewEffect,
    startPreview,
    stopPreview,
    updatePreview
  } = useEffectsStore();

  const [newFromColor, setNewFromColor] = useState('#000000');
  const [newToColor, setNewToColor] = useState('#ffffff');

  const isCurrentlyPreviewing = isPreviewActive && previewEffect === 'remap-colors';

  // Auto-start preview when panel opens
  useEffect(() => {
    if (!isCurrentlyPreviewing) {
      startPreview('remap-colors');
    }
    
    // Cleanup on unmount
    return () => {
      if (isCurrentlyPreviewing) {
        stopPreview();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update preview when settings change
  useEffect(() => {
    if (isCurrentlyPreviewing) {
      updatePreview().catch(error => {
        console.error('Preview update failed:', error);
      });
    }
  }, [remapColorsSettings, isCurrentlyPreviewing, updatePreview]);

  // Toggle preview
  const handleTogglePreview = useCallback(() => {
    if (isCurrentlyPreviewing) {
      stopPreview();
    } else {
      startPreview('remap-colors');
    }
  }, [isCurrentlyPreviewing, startPreview, stopPreview]);

  // Reset to default values
  const handleReset = useCallback(() => {
    resetEffectSettings('remap-colors');
  }, [resetEffectSettings]);

  // Add new color mapping
  const handleAddMapping = useCallback(() => {
    const newMappings = {
      ...remapColorsSettings.colorMappings,
      [newFromColor]: newToColor
    };
    updateRemapColorsSettings({
      colorMappings: newMappings
    });
  }, [remapColorsSettings, updateRemapColorsSettings, newFromColor, newToColor]);

  // Remove color mapping
  const handleRemoveMapping = useCallback((fromColor: string) => {
    const newMappings = { ...remapColorsSettings.colorMappings };
    delete newMappings[fromColor];
    updateRemapColorsSettings({
      colorMappings: newMappings
    });
  }, [remapColorsSettings, updateRemapColorsSettings]);

  // Select color from canvas analysis
  const handleSelectCanvasColor = useCallback((color: string) => {
    setNewFromColor(color);
  }, []);

  // Update match exact setting
  const handleMatchExactChange = useCallback((matchExact: boolean) => {
    updateRemapColorsSettings({
      matchExact
    });
  }, [updateRemapColorsSettings]);

  // Update include transparent setting
  const handleIncludeTransparentChange = useCallback((includeTransparent: boolean) => {
    updateRemapColorsSettings({
      includeTransparent
    });
  }, [updateRemapColorsSettings]);

  // Color analysis preview
  const colorCount = canvasAnalysis?.uniqueColors?.length || 0;
  const topColors = canvasAnalysis?.colorsByFrequency?.slice(0, 10) || [];
  const mappingCount = Object.keys(remapColorsSettings.colorMappings).length;

  return (
    <div className="space-y-4">
      
      {/* Settings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Match Options</Label>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span>Exact color match</span>
            <Switch
              checked={remapColorsSettings.matchExact}
              onCheckedChange={handleMatchExactChange}
            />
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span>Include transparent</span>
            <Switch
              checked={remapColorsSettings.includeTransparent}
              onCheckedChange={handleIncludeTransparentChange}
            />
          </div>
        </div>
      </div>

      {/* Live Preview Toggle */}
      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-800">
        <div className="space-y-1">
          <Label className="text-xs font-medium text-blue-900 dark:text-blue-100">Live Preview</Label>
          <div className="text-xs text-blue-700 dark:text-blue-300">
            {isCurrentlyPreviewing ? 'Changes are shown on canvas' : 'Preview is disabled'}
          </div>
        </div>
        <Button
          onClick={handleTogglePreview}
          variant={isCurrentlyPreviewing ? "default" : "outline"}
          size="sm"
          className="h-8 gap-1"
        >
          {isCurrentlyPreviewing ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {isCurrentlyPreviewing ? 'On' : 'Off'}
        </Button>
      </div>

      {/* Color Analysis Summary */}
      {canvasAnalysis && (
        <div className="bg-muted/50 rounded p-3 text-xs space-y-2">
          <div className="font-medium">Canvas Colors ({colorCount}):</div>
          <div className="grid grid-cols-5 gap-1">
            {topColors.map(({ color, count }) => (
              <button
                key={color}
                onClick={() => handleSelectCanvasColor(color)}
                className="flex flex-col items-center gap-1 p-1 rounded hover:bg-background/80 transition-colors"
                title={`Click to select ${color} (used ${count} times)`}
              >
                <div 
                  className="w-6 h-6 rounded border border-border flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[10px] text-muted-foreground">{count}</span>
              </button>
            ))}
          </div>
          <div className="text-[10px] text-muted-foreground">
            Click any color to select as source color
          </div>
        </div>
      )}
      
      {/* Add New Mapping */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Add Color Mapping</Label>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">From Color</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={newFromColor}
                onChange={(e) => setNewFromColor(e.target.value)}
                className="w-8 h-8 p-0 border rounded cursor-pointer"
                title="Select source color"
              />
              <Input
                type="text"
                value={newFromColor}
                onChange={(e) => setNewFromColor(e.target.value)}
                className="flex-1 h-8 text-xs font-mono"
                placeholder="#000000"
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">To Color</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={newToColor}
                onChange={(e) => setNewToColor(e.target.value)}
                className="w-8 h-8 p-0 border rounded cursor-pointer"
                title="Select target color"
              />
              <Input
                type="text"
                value={newToColor}
                onChange={(e) => setNewToColor(e.target.value)}
                className="flex-1 h-8 text-xs font-mono"
                placeholder="#ffffff"
              />
            </div>
          </div>
        </div>
        
        <Button
          onClick={handleAddMapping}
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs"
          disabled={!newFromColor || !newToColor}
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Mapping
        </Button>
      </div>
      
      {/* Current Mappings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">
            Color Mappings ({mappingCount})
          </Label>
          <Button
            onClick={handleReset}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            title="Reset all mappings"
            disabled={mappingCount === 0}
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>
        
        {mappingCount === 0 ? (
          <div className="p-4 border border-dashed border-muted-foreground/50 rounded text-center text-xs text-muted-foreground">
            No color mappings defined. Use the controls above to add mappings.
          </div>
        ) : (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {Object.entries(remapColorsSettings.colorMappings).map(([fromColor, toColor]) => (
              <div key={fromColor} className="flex items-center gap-2 text-xs p-2 bg-background rounded border">
                <div 
                  className="w-4 h-4 rounded border border-border flex-shrink-0"
                  style={{ backgroundColor: fromColor }}
                  title={fromColor}
                />
                <span className="text-muted-foreground">→</span>
                <div 
                  className="w-4 h-4 rounded border border-border flex-shrink-0"
                  style={{ backgroundColor: toColor }}
                  title={toColor}
                />
                <div className="flex-1 font-mono text-[11px]">
                  <div>{fromColor} → {toColor}</div>
                </div>
                <Button
                  onClick={() => handleRemoveMapping(fromColor)}
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                  title="Remove mapping"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      
    </div>
  );
}