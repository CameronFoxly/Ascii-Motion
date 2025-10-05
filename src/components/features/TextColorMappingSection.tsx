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
  CollapsibleTrigger,
} from '../ui/collapsible';

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
  Download,
  Edit,
  ChevronDown
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
  
  // Drag and drop state
  const [draggedColorId, setDraggedColorId] = useState<string | null>(null);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);
  
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
    createCustomCopy,
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
  
  const handleMappingModeChange = (mode: 'closest' | 'dithering' | 'by-index') => {
    updateSettings({ textColorMappingMode: mode });
    onSettingsChange?.();
  };

  // Color palette editing handlers
  const handleColorDoubleClick = (color: string) => {
    if (!selectedPalette) return;
    
    // If it's a preset palette, create a custom copy first
    if (selectedPalette.isPreset) {
      const newPaletteId = createCustomCopy(selectedPalette.id);
      if (newPaletteId) {
        // Switch to the new custom palette
        updateSettings({ textColorPaletteId: newPaletteId });
        // Find the color in the new palette and edit it
        const newPalette = customPalettes.find(p => p.id === newPaletteId);
        if (newPalette) {
          const colorObj = newPalette.colors.find(c => c.value === color);
          if (colorObj) {
            setEditingColorId(colorObj.id);
            setColorPickerInitialColor(color);
            setIsColorPickerOpen(true);
          }
        }
        onSettingsChange?.();
      }
      return;
    }
    
    // For custom palettes, edit directly
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

  const handleEditColor = () => {
    if (!selectedColorId || !selectedPalette) return;
    
    const colorObj = selectedPalette.colors.find(c => c.id === selectedColorId);
    if (!colorObj) return;
    
    // If it's a preset palette, create a custom copy first
    if (selectedPalette.isPreset) {
      const newPaletteId = createCustomCopy(selectedPalette.id);
      if (newPaletteId) {
        updateSettings({ textColorPaletteId: newPaletteId });
        // Find the color in the new palette and edit it
        const newPalette = customPalettes.find(p => p.id === newPaletteId);
        if (newPalette) {
          const newColorObj = newPalette.colors.find(c => c.value === colorObj.value);
          if (newColorObj) {
            setEditingColorId(newColorObj.id);
            setColorPickerInitialColor(colorObj.value);
            setIsColorPickerOpen(true);
          }
        }
        onSettingsChange?.();
      }
      return;
    }
    
    // For custom palettes, edit directly
    setEditingColorId(colorObj.id);
    setColorPickerInitialColor(colorObj.value);
    setIsColorPickerOpen(true);
  };

  const handleAddColor = () => {
    if (!selectedPalette) return;
    
    // If it's a preset palette, create a custom copy first
    if (selectedPalette.isPreset) {
      const newPaletteId = createCustomCopy(selectedPalette.id);
      if (newPaletteId) {
        updateSettings({ textColorPaletteId: newPaletteId });
        addColor(newPaletteId, '#ffffff');
        onSettingsChange?.();
      }
      return;
    }
    
    addColor(selectedPalette.id, '#ffffff');
    onSettingsChange?.();
  };

  const handleRemoveColor = (colorId: string) => {
    if (!selectedPalette || selectedPalette.colors.length <= 1) return;
    
    // If it's a preset palette, create a custom copy first
    if (selectedPalette.isPreset) {
      const newPaletteId = createCustomCopy(selectedPalette.id);
      if (newPaletteId) {
        updateSettings({ textColorPaletteId: newPaletteId });
        removeColor(newPaletteId, colorId);
        onSettingsChange?.();
      }
      return;
    }
    
    removeColor(selectedPalette.id, colorId);
    onSettingsChange?.();
  };

  const handleMoveColorLeft = (colorId: string) => {
    if (!selectedPalette) return;
    
    // If it's a preset palette, create a custom copy first
    if (selectedPalette.isPreset) {
      const newPaletteId = createCustomCopy(selectedPalette.id);
      if (newPaletteId) {
        updateSettings({ textColorPaletteId: newPaletteId });
        moveColorLeft(newPaletteId, colorId);
        onSettingsChange?.();
      }
      return;
    }
    
    moveColorLeft(selectedPalette.id, colorId);
    onSettingsChange?.();
  };

  const handleMoveColorRight = (colorId: string) => {
    if (!selectedPalette) return;
    
    // If it's a preset palette, create a custom copy first
    if (selectedPalette.isPreset) {
      const newPaletteId = createCustomCopy(selectedPalette.id);
      if (newPaletteId) {
        updateSettings({ textColorPaletteId: newPaletteId });
        moveColorRight(newPaletteId, colorId);
        onSettingsChange?.();
      }
      return;
    }
    
    moveColorRight(selectedPalette.id, colorId);
    onSettingsChange?.();
  };

  const handleReversePalette = () => {
    if (!selectedPalette) return;
    
    // If it's a preset palette, create a custom copy first
    if (selectedPalette.isPreset) {
      const newPaletteId = createCustomCopy(selectedPalette.id);
      if (newPaletteId) {
        updateSettings({ textColorPaletteId: newPaletteId });
        reversePalette(newPaletteId);
        onSettingsChange?.();
      }
      return;
    }
    
    reversePalette(selectedPalette.id);
    onSettingsChange?.();
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, colorId: string) => {
    if (!selectedPalette) {
      e.preventDefault();
      return;
    }
    setDraggedColorId(colorId);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, targetColorId?: string) => {
    if (!selectedPalette || !draggedColorId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (targetColorId) {
      const targetIndex = selectedPalette.colors.findIndex(c => c.id === targetColorId);
      if (targetIndex !== -1) {
        // Determine if we should show indicator before or after based on mouse position
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const isAfter = mouseX > rect.width / 2;
        setDropIndicatorIndex(isAfter ? targetIndex + 1 : targetIndex);
      }
    }
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, targetColorId: string) => {
    e.preventDefault();
    if (!selectedPalette || !draggedColorId || draggedColorId === targetColorId) {
      setDraggedColorId(null);
      setDropIndicatorIndex(null);
      return;
    }

    // Find indices of source and target colors
    const sourceIndex = selectedPalette.colors.findIndex(c => c.id === draggedColorId);
    const targetIndex = selectedPalette.colors.findIndex(c => c.id === targetColorId);
    
    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedColorId(null);
      setDropIndicatorIndex(null);
      return;
    }

    // If it's a preset palette, create a custom copy first
    let paletteId = selectedPalette.id;
    if (selectedPalette.isPreset) {
      const newPaletteId = createCustomCopy(selectedPalette.id);
      if (newPaletteId) {
        paletteId = newPaletteId;
        updateSettings({ textColorPaletteId: newPaletteId });
      } else {
        setDraggedColorId(null);
        setDropIndicatorIndex(null);
        return;
      }
    }

    // Determine final position based on drop indicator
    let finalTargetIndex = targetIndex;
    if (dropIndicatorIndex === targetIndex + 1) {
      finalTargetIndex = targetIndex + 1;
    }

    // Move the colors
    const currentIndex = sourceIndex;
    if (currentIndex < finalTargetIndex) {
      // Moving right - use moveColorRight
      for (let i = 0; i < finalTargetIndex - sourceIndex; i++) {
        moveColorRight(paletteId, draggedColorId);
      }
    } else if (currentIndex > finalTargetIndex) {
      // Moving left - use moveColorLeft
      for (let i = 0; i < sourceIndex - finalTargetIndex; i++) {
        moveColorLeft(paletteId, draggedColorId);
      }
    }

    setDraggedColorId(null);
    setDropIndicatorIndex(null);
    onSettingsChange?.();
  };

  // Handle drag leave
  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the grid container
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropIndicatorIndex(null);
    }
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full h-auto text-xs justify-between py-1 px-1 my-1"
          >
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              <span>Text Color Mapping</span>
              <Checkbox
                id="enable-text-color-mapping"
                checked={enableTextColorMapping}
                onCheckedChange={handleToggleEnabled}
                className="ml-2"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <ChevronDown 
              className={`h-3 w-3 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="collapsible-content space-y-3 mt-2">
          <div className="w-full">
            {!enableTextColorMapping && (
              <div className="p-3 border border-border/50 rounded-lg bg-muted/20">
                <p className="text-xs text-muted-foreground text-center">
                  Text color mapping is disabled. Characters will use default foreground colors.
                </p>
              </div>
            )}
            
            {enableTextColorMapping && (
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
                                <Plus className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Add new palette</p>
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
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Colors</Label>
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
                    
                    {/* Color swatches grid */}
                    <Card className="bg-card/50 border-border/50">
                      <CardContent className="p-2">
                        <TooltipProvider>
                          <div className="grid grid-cols-8 gap-0.5 mb-2" onDragLeave={handleDragLeave}>
                            {selectedPalette.colors.map((color, index) => (
                            <div key={color.id} className="relative flex items-center justify-center">
                              {/* Drop indicator line */}
                              {dropIndicatorIndex === index && (
                                <div className="absolute -left-0.5 top-0 bottom-0 w-0.5 bg-primary z-10 rounded-full"></div>
                              )}
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`w-6 h-6 rounded border-2 transition-all hover:scale-105 cursor-pointer ${
                                      draggedColorId === color.id ? 'opacity-50 scale-95' : ''
                                    } ${
                                      selectedColorId === color.id
                                        ? 'border-primary ring-2 ring-primary/20 shadow-lg'
                                        : 'border-border hover:border-border/80'
                                    } cursor-move`}
                                    style={{ backgroundColor: color.value }}
                                    draggable={!selectedPalette.isPreset}
                                    onClick={() => setSelectedColor(color.id)}
                                    onDoubleClick={() => handleColorDoubleClick(color.value)}
                                    onDragStart={(e) => handleDragStart(e, color.id)}
                                    onDragOver={(e) => handleDragOver(e, color.id)}
                                    onDrop={(e) => handleDrop(e, color.id)}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {color.name || 'Unnamed'}: {color.value}
                                    {selectedPalette.isPreset 
                                      ? ' (double-click to edit)' 
                                      : ' (drag to reorder, double-click to edit)'}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                              
                              {/* Drop indicator line after last item */}
                              {dropIndicatorIndex === index + 1 && (
                                <div className="absolute -right-0.5 top-0 bottom-0 w-0.5 bg-primary z-10 rounded-full"></div>
                              )}
                            </div>
                            ))}
                          </div>
                        </TooltipProvider>
                        
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
                                    onClick={handleEditColor}
                                    disabled={!selectedColorId}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Edit color</p>
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

                          </div>
                          
                          {/* Reverse button (right-aligned) */}
                          <div>
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
                      <SelectItem value="by-index" className="text-xs">
                        By Index
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                </CardContent>
              </Card>
            )}
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
        anchorPosition="import-media-panel"
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