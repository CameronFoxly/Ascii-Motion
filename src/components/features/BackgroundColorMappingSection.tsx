/**
 * BackgroundColorMappingSection - Collapsible section for background color palette mapping controls
 * 
 * Features:
 * - Collapsible header with enable/disable toggle
 * - Integrated color palette selector from main paletteStore
 * - Color quantization and mapping algorithm selection
 * - Consistent UI patterns following CharacterMappingSection and TextColorMappingSection
 */

import { useState, useMemo } from 'react';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { 
  Collapsible,
  CollapsibleContent,
} from '../ui/collapsible';
import { CollapsibleHeader } from '../common/CollapsibleHeader';
import { Checkbox } from '../ui/checkbox';
import { Square } from 'lucide-react';
import { usePaletteStore } from '../../stores/paletteStore';
import { useImportSettings } from '../../stores/importStore';

interface BackgroundColorMappingSectionProps {
  onSettingsChange?: () => void;
}

export function BackgroundColorMappingSection({ onSettingsChange }: BackgroundColorMappingSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Import settings
  const { settings, updateSettings } = useImportSettings();
  const {
    enableBackgroundColorMapping,
    backgroundColorPaletteId,
    backgroundColorMappingMode,
    backgroundColorQuantization
  } = settings;
  
  // Color palette store integration - access state directly to avoid infinite loops
  const palettes = usePaletteStore(state => state.palettes);
  const customPalettes = usePaletteStore(state => state.customPalettes);
  
  // Find currently selected palette (memoized to prevent infinite loops)
  const selectedPalette = useMemo(() => {
    const allPalettes = [...palettes, ...customPalettes];
    return allPalettes.find(p => p.id === backgroundColorPaletteId);
  }, [palettes, customPalettes, backgroundColorPaletteId]);
  
  const handleToggleEnabled = (enabled: boolean) => {
    updateSettings({ enableBackgroundColorMapping: enabled });
    onSettingsChange?.();
  };
  
  const handlePaletteChange = (paletteId: string) => {
    updateSettings({ backgroundColorPaletteId: paletteId });
    onSettingsChange?.();
  };
  
  const handleMappingModeChange = (mode: 'closest' | 'dithering') => {
    updateSettings({ backgroundColorMappingMode: mode });
    onSettingsChange?.();
  };
  
  const handleQuantizationChange = (value: string) => {
    const quantization = parseInt(value, 10);
    updateSettings({ backgroundColorQuantization: quantization });
    onSettingsChange?.();
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between">
        <CollapsibleHeader isOpen={isOpen}>
          <div className="flex items-center gap-2">
            <Square className="w-4 h-4 text-muted-foreground" />
            <span>Background Color Mapping</span>
          </div>
        </CollapsibleHeader>
        <div className="flex items-center space-x-2 pr-2">
          <Checkbox
            id="enable-background-color-mapping"
            checked={enableBackgroundColorMapping}
            onCheckedChange={handleToggleEnabled}
          />
          <Label htmlFor="enable-background-color-mapping" className="text-xs">
            Enable
          </Label>
        </div>
      </div>
      
      <CollapsibleContent className="collapsible-content">
        <div className="space-y-3 w-full">
          {!enableBackgroundColorMapping && (
            <div className="p-3 border border-border/50 rounded-lg bg-muted/20">
              <p className="text-xs text-muted-foreground text-center">
                Background color mapping is disabled. Characters will use transparent backgrounds.
              </p>
            </div>
          )}
          
          {enableBackgroundColorMapping && (
            <Card className="bg-card/50 border-border/50 overflow-hidden w-full">
              <CardContent className="p-3 space-y-3 w-full">
                
                {/* Header */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Background Color Palette</Label>
                </div>
                
                {/* Color Palette Selector */}
                <div className="space-y-2 w-full">
                  <Label className="text-xs font-medium">Color Palette</Label>
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex-1 min-w-0">
                      <Select 
                        value={backgroundColorPaletteId || ''} 
                        onValueChange={handlePaletteChange}
                        disabled={!enableBackgroundColorMapping}
                      >
                        <SelectTrigger className="h-8 text-xs w-full">
                          <div className="truncate">
                            <SelectValue placeholder="Select color palette" />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="border-border/50">
                          {/* Custom Palettes First */}
                          {customPalettes.length > 0 && (
                            <div>
                              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-b border-border/30">
                                Custom
                              </div>
                              {customPalettes.map(palette => (
                                <SelectItem key={palette.id} value={palette.id} className="text-xs">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="truncate flex-1">{palette.name}</span>
                                    <span className="text-muted-foreground flex-shrink-0">({palette.colors.length} colors)</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </div>
                          )}
                          
                          {/* Preset Palettes */}
                          {palettes.length > 0 && (
                            <div>
                              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-b border-border/30">
                                Presets
                              </div>
                              {palettes.map((palette: any) => (
                                <SelectItem key={palette.id} value={palette.id} className="text-xs">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="truncate flex-1">{palette.name}</span>
                                    <span className="text-muted-foreground flex-shrink-0">({palette.colors.length} colors)</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                {/* Selected Palette Preview */}
                {selectedPalette && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Preview ({selectedPalette.colors.length} colors)</Label>
                    <div className="bg-background/50 border border-border rounded p-2 min-h-[40px]">
                      <div className="flex flex-wrap gap-1">
                        {selectedPalette.colors.slice(0, backgroundColorQuantization).map((color) => (
                          <div
                            key={color.id}
                            className="w-6 h-6 border border-border/50 rounded flex-shrink-0"
                            style={{ backgroundColor: color.value }}
                            title={color.name || color.value}
                          />
                        ))}
                        {selectedPalette.colors.length > backgroundColorQuantization && (
                          <div className="flex items-center justify-center w-6 h-6 border border-border/50 rounded text-xs text-muted-foreground bg-muted/50">
                            +{selectedPalette.colors.length - backgroundColorQuantization}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Mapping Controls */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Color Quantization */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Colors to Use</Label>
                    <Select 
                      value={backgroundColorQuantization.toString()} 
                      onValueChange={handleQuantizationChange}
                      disabled={!enableBackgroundColorMapping}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4">4 colors</SelectItem>
                        <SelectItem value="8">8 colors</SelectItem>
                        <SelectItem value="16">16 colors</SelectItem>
                        <SelectItem value="32">32 colors</SelectItem>
                        <SelectItem value="64">64 colors</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Mapping Algorithm */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Mapping Mode</Label>
                    <Select 
                      value={backgroundColorMappingMode} 
                      onValueChange={handleMappingModeChange}
                      disabled={!enableBackgroundColorMapping}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="closest">Closest Match</SelectItem>
                        <SelectItem value="dithering">Dithered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Help Text */}
                <div className="text-xs text-muted-foreground bg-muted/20 p-2 rounded">
                  <p>Maps image colors to the selected palette for ASCII character backgrounds. Creates colorful pixel art effects.</p>
                </div>
                
              </CardContent>
            </Card>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}