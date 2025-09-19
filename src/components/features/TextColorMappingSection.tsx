/**
 * TextColorMappingSection - Collapsible section for text color palette mapping controls
 * 
 * Features:
 * - Collapsible header with enable/disable toggle
 * - Full palette editing: color swatches, inline editing, reordering, reverse button
 * - Palette manager integration for sharing palettes between editors
 * - Consistent UI patterns following main app palette component
 */

import { useState, useMemo } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { 
  Collapsible,
  CollapsibleContent,
} from '../ui/collapsible';
import { CollapsibleHeader } from '../common/CollapsibleHeader';
import { Checkbox } from '../ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { 
  Type, 
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Settings,
  Upload,
  Download
} from 'lucide-react';
import { usePaletteStore } from '../../stores/paletteStore';
import { useImportSettings } from '../../stores/importStore';
import { ColorPickerOverlay } from './ColorPickerOverlay';
import { ManagePalettesDialog } from './ManagePalettesDialog';
import { ImportPaletteDialog } from './ImportPaletteDialog';
import { ExportPaletteDialog } from './ExportPaletteDialog';

interface TextColorMappingSectionProps {
  onSettingsChange?: () => void;
}

export function TextColorMappingSection({ onSettingsChange }: TextColorMappingSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [colorPickerInitialColor, setColorPickerInitialColor] = useState('#000000');
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [isManagePalettesOpen, setIsManagePalettesOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  
  // Import settings
  const { settings, updateSettings } = useImportSettings();
  const {
    enableTextColorMapping,
    textColorPaletteId,
    textColorMappingMode
  } = settings;
  
  // Color palette store integration
  const { 
    palettes,
    customPalettes,
    selectedColorId,
    setSelectedColor,
    addColor,
    removeColor,
    updateColor,
    moveColorLeft,
    moveColorRight,
    reversePalette,
  } = usePaletteStore();
  
  // Get the currently selected palette for text color mapping
  const selectedPalette = useMemo(() => {
    const allPalettes = [...palettes, ...customPalettes];
    return allPalettes.find(p => p.id === textColorPaletteId);
  }, [palettes, customPalettes, textColorPaletteId]);

  const handleToggleEnabled = (enabled: boolean) => {
    updateSettings({ enableTextColorMapping: enabled });
    onSettingsChange?.();
  };
  
  const handlePaletteChange = (paletteId: string) => {
    updateSettings({ textColorPaletteId: paletteId });
    onSettingsChange?.();
  };
  
  const handleMappingModeChange = (mode: 'closest' | 'dithering') => {
    updateSettings({ textColorMappingMode: mode });
    onSettingsChange?.();
  };

  // Color palette editing handlers
  const handleColorDoubleClick = (color: string) => {
    if (!selectedPalette) return;
    const colorObj = selectedPalette.colors.find(c => c.value === color);
    if (colorObj) {
      setEditingColorId(colorObj.id);
      setColorPickerInitialColor(color);
      setIsColorPickerOpen(true);
    }
  };

  const handleColorPickerSelect = (newColor: string) => {
    if (editingColorId && selectedPalette) {
      updateColor(selectedPalette.id, editingColorId, newColor);
      setEditingColorId(null);
      onSettingsChange?.();
    }
  };

  const handleAddColor = () => {
    if (!selectedPalette) return;
    addColor(selectedPalette.id, '#ffffff');
    onSettingsChange?.();
  };

  const handleRemoveColor = (colorId: string) => {
    if (!selectedPalette || selectedPalette.colors.length <= 1) return;
    removeColor(selectedPalette.id, colorId);
    onSettingsChange?.();
  };

  const handleMoveColorLeft = (colorId: string) => {
    if (!selectedPalette) return;
    moveColorLeft(selectedPalette.id, colorId);
    onSettingsChange?.();
  };

  const handleMoveColorRight = (colorId: string) => {
    if (!selectedPalette) return;
    moveColorRight(selectedPalette.id, colorId);
    onSettingsChange?.();
  };

  const handleReversePalette = () => {
    if (!selectedPalette) return;
    reversePalette(selectedPalette.id);
    onSettingsChange?.();
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between">
          <CollapsibleHeader isOpen={isOpen}>
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              <span>Text Color Mapping</span>
            </div>
          </CollapsibleHeader>
          <div className="flex items-center space-x-2 pr-2">
            <Checkbox
              id="enable-text-color-mapping"
              checked={enableTextColorMapping}
              onCheckedChange={handleToggleEnabled}
            />
            <Label htmlFor="enable-text-color-mapping" className="text-xs">
              Enable
            </Label>
          </div>
        </div>
        
        <CollapsibleContent className="collapsible-content">
          <div className="space-y-3 w-full">
            <Card className="bg-card/30 border-border/50">
              <CardContent className="p-3 space-y-3">
                {/* Palette Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Color Palette</Label>
                    {enableTextColorMapping && (
                      <div className="flex gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 w-6 p-0"
                                onClick={() => setIsManagePalettesOpen(true)}
                              >
                                <Settings className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Manage palettes</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                  </div>
                  
                  <Select 
                    value={textColorPaletteId || ''} 
                    onValueChange={handlePaletteChange}
                    disabled={!enableTextColorMapping}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Select palette..." />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Custom Palettes */}
                      {customPalettes.length > 0 && (
                        <div>
                          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-b border-border/30">
                            Custom
                          </div>
                          {customPalettes.map((palette: any) => (
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
                          <SelectSeparator />
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

                {/* Color Palette Editor */}
                {selectedPalette && enableTextColorMapping && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Colors</Label>
                    
                    {/* Color swatches grid */}
                    <Card className="bg-card/50 border-border/50">
                      <CardContent className="p-2">
                        <div className="grid grid-cols-8 gap-0.5 mb-2">
                          {selectedPalette.colors.map((color) => (
                            <div
                              key={color.id}
                              className={`w-6 h-6 rounded border-2 transition-all hover:scale-105 cursor-pointer ${
                                selectedColorId === color.id
                                  ? 'border-primary ring-2 ring-primary/20 shadow-lg'
                                  : 'border-border hover:border-border/80'
                              }`}
                              style={{ backgroundColor: color.value }}
                              onClick={() => setSelectedColor(color.id)}
                              onDoubleClick={() => handleColorDoubleClick(color.value)}
                              title={`${color.name || 'Unnamed'}: ${color.value} (double-click to edit)`}
                            />
                          ))}
                        </div>
                        
                        {/* Palette controls */}
                        <div className="flex items-center justify-between">
                          {/* Editing controls */}
                          <div className="flex gap-0.5">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 w-6 p-0"
                                    onClick={() => selectedColorId && handleMoveColorLeft(selectedColorId)}
                                    disabled={!selectedColorId}
                                  >
                                    <ChevronLeft className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Move color left</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 w-6 p-0"
                                    onClick={() => selectedColorId && handleMoveColorRight(selectedColorId)}
                                    disabled={!selectedColorId}
                                  >
                                    <ChevronRight className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Move color right</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 w-6 p-0"
                                    onClick={handleAddColor}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Add color</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 w-6 p-0"
                                    onClick={() => selectedColorId && handleRemoveColor(selectedColorId)}
                                    disabled={!selectedColorId || selectedPalette.colors.length <= 1}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Remove color</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 w-6 p-0"
                                    onClick={handleReversePalette}
                                  >
                                    <ArrowUpDown className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Reverse palette order</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>

                          {/* Import/Export buttons */}
                          <div className="flex gap-0.5">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 w-6 p-0"
                                    onClick={() => setIsImportDialogOpen(true)}
                                  >
                                    <Upload className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Import palette</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 w-6 p-0"
                                    onClick={() => setIsExportDialogOpen(true)}
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Export palette</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Mapping Mode */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Mapping Mode</Label>
                  <Select 
                    value={textColorMappingMode}
                    onValueChange={handleMappingModeChange}
                    disabled={!enableTextColorMapping}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="closest" className="text-xs">
                        Closest Match
                      </SelectItem>
                      <SelectItem value="dithering" className="text-xs">
                        Dithering
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Help Text */}
                {!enableTextColorMapping && (
                  <div className="text-xs text-muted-foreground bg-muted/20 p-2 rounded">
                    Enable text color mapping to use palette-based colors for ASCII characters.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Color Picker Overlay */}
      <ColorPickerOverlay
        isOpen={isColorPickerOpen}
        onOpenChange={setIsColorPickerOpen}
        initialColor={colorPickerInitialColor}
        onColorSelect={handleColorPickerSelect}
        title="Edit Color"
      />

      {/* Palette Management Dialog */}
      <ManagePalettesDialog
        isOpen={isManagePalettesOpen}
        onOpenChange={setIsManagePalettesOpen}
      />

      {/* Import/Export Dialogs */}
      <ImportPaletteDialog
        isOpen={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
      />

      <ExportPaletteDialog
        isOpen={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
      />
    </>
  );
}