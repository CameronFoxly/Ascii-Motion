/**
 * BackgroundColorMappingSection - Collapsible section for background color palette mapping controls
 * 
 * Enhanced Features:
 * - Collapsible header with enable/disable toggle
 * - Full palette editing capabilities with color swatches
 * - Inline color editing, reordering, adding/removing colors
 * - Reverse palette order functionality
 * - Integrated palette manager access
 * - Import/export palette functionality
 * - Consistent with main app palette component functionality
 */

import { useState, useMemo } from 'react';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
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
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { 
  Square,
  Settings,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  RotateCcw
} from 'lucide-react';
import { usePaletteStore } from '../../stores/paletteStore';
import { useImportSettings } from '../../stores/importStore';
import { ColorPickerOverlay } from './ColorPickerOverlay';
import { ManagePalettesDialog } from './ManagePalettesDialog';
import { ImportPaletteDialog } from './ImportPaletteDialog';
import { ExportPaletteDialog } from './ExportPaletteDialog';

interface BackgroundColorMappingSectionProps {
  onSettingsChange?: () => void;
}

export function BackgroundColorMappingSection({ onSettingsChange }: BackgroundColorMappingSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [colorPickerInitialColor, setColorPickerInitialColor] = useState('#ffffff');
  const [showManagePalettes, setShowManagePalettes] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  
  // Drag and drop state
  const [draggedColorId, setDraggedColorId] = useState<string | null>(null);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);
  
  // Import settings
  const { settings, updateSettings } = useImportSettings();
  const {
    enableBackgroundColorMapping,
    backgroundColorPaletteId,
    backgroundColorMappingMode
  } = settings;
  
  // Color palette store integration
  const palettes = usePaletteStore(state => state.palettes);
  const customPalettes = usePaletteStore(state => state.customPalettes);
  const updateColor = usePaletteStore(state => state.updateColor);
  const addColor = usePaletteStore(state => state.addColor);
  const removeColor = usePaletteStore(state => state.removeColor);
  const reversePalette = usePaletteStore(state => state.reversePalette);
  const createCustomCopy = usePaletteStore(state => state.createCustomCopy);
  const moveColorLeft = usePaletteStore(state => state.moveColorLeft);
  const moveColorRight = usePaletteStore(state => state.moveColorRight);
  
  // Find currently selected palette
  const selectedPalette = useMemo(() => {
    const allPalettes = [...palettes, ...customPalettes];
    return allPalettes.find(p => p.id === (backgroundColorPaletteId ?? ''));
  }, [palettes, customPalettes, backgroundColorPaletteId]);
  
  const handleToggleEnabled = (enabled: boolean) => {
    updateSettings({ enableBackgroundColorMapping: enabled });
    onSettingsChange?.();
  };
  
  const handlePaletteChange = (paletteId: string) => {
    updateSettings({ backgroundColorPaletteId: paletteId });
    onSettingsChange?.();
  };
  
  const handleMappingModeChange = (mode: 'closest' | 'dithering' | 'by-index') => {
    updateSettings({ backgroundColorMappingMode: mode });
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
        updateSettings({ backgroundColorPaletteId: newPaletteId });
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

  const handleMoveColorLeft = (colorIndex: number) => {
    if (!selectedPalette || colorIndex <= 0) return;
    
    // If it's a preset palette, create a custom copy first
    if (selectedPalette.isPreset) {
      const newPaletteId = createCustomCopy(selectedPalette.id);
      if (newPaletteId) {
        updateSettings({ backgroundColorPaletteId: newPaletteId });
        // Use moveColorLeft with the color ID instead of reorderColors
        const colorId = selectedPalette.colors[colorIndex]?.id;
        if (colorId) {
          moveColorLeft(newPaletteId, colorId);
        }
        onSettingsChange?.();
      }
      return;
    }
    
    const colorId = selectedPalette.colors[colorIndex]?.id;
    if (colorId) {
      moveColorLeft(selectedPalette.id, colorId);
    }
    onSettingsChange?.();
  };

  const handleMoveColorRight = (colorIndex: number) => {
    if (!selectedPalette || colorIndex >= selectedPalette.colors.length - 1) return;
    
    // If it's a preset palette, create a custom copy first
    if (selectedPalette.isPreset) {
      const newPaletteId = createCustomCopy(selectedPalette.id);
      if (newPaletteId) {
        updateSettings({ backgroundColorPaletteId: newPaletteId });
        // Use moveColorRight with the color ID instead of reorderColors
        const colorId = selectedPalette.colors[colorIndex]?.id;
        if (colorId) {
          moveColorRight(newPaletteId, colorId);
        }
        onSettingsChange?.();
      }
      return;
    }
    
    const colorId = selectedPalette.colors[colorIndex]?.id;
    if (colorId) {
      moveColorRight(selectedPalette.id, colorId);
    }
    onSettingsChange?.();
  };

  const handleAddColor = () => {
    if (!selectedPalette) return;
    
    // If it's a preset palette, create a custom copy first
    if (selectedPalette.isPreset) {
      const newPaletteId = createCustomCopy(selectedPalette.id);
      if (newPaletteId) {
        updateSettings({ backgroundColorPaletteId: newPaletteId });
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
        updateSettings({ backgroundColorPaletteId: newPaletteId });
        removeColor(newPaletteId, colorId);
        onSettingsChange?.();
      }
      return;
    }
    
    removeColor(selectedPalette.id, colorId);
    onSettingsChange?.();
  };

  const handleReversePalette = () => {
    if (!selectedPalette) return;
    
    // If it's a preset palette, create a custom copy first
    if (selectedPalette.isPreset) {
      const newPaletteId = createCustomCopy(selectedPalette.id);
      if (newPaletteId) {
        updateSettings({ backgroundColorPaletteId: newPaletteId });
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
        updateSettings({ backgroundColorPaletteId: newPaletteId });
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
    let currentIndex = sourceIndex;
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
    <TooltipProvider>
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
                      
                      {/* Palette Management Controls */}
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setShowManagePalettes(true)}
                            >
                              <Settings className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Manage Palettes</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setShowImportDialog(true)}
                            >
                              <Upload className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Import Palette</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setShowExportDialog(true)}
                              disabled={!selectedPalette}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Export Palette</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>

                  {/* Color Swatches Grid */}
                  {selectedPalette && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">
                          Colors ({selectedPalette.colors.length})
                        </Label>
                        <div className="flex items-center gap-1">
                          {!selectedPalette.isPreset && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={handleReversePalette}
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Reverse palette order</p>
                                </TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
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
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-background/50 border border-border rounded p-2">
                        <div className="grid grid-cols-8 gap-1" onDragLeave={handleDragLeave}>
                          {selectedPalette.colors.map((color, colorIndex) => (
                            <div key={`${color.id}-${colorIndex}`} className="relative group flex items-center justify-center">
                              {/* Drop indicator line */}
                              {dropIndicatorIndex === colorIndex && (
                                <div className="absolute -left-0.5 top-0 bottom-0 w-0.5 bg-primary z-10 rounded-full"></div>
                              )}
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`w-8 h-8 border border-border/50 rounded cursor-pointer transition-all ${
                                      draggedColorId === color.id ? 'opacity-50 scale-95' : ''
                                    } ${
                                      !selectedPalette.isPreset ? 'hover:scale-110 hover:border-primary cursor-move' : ''
                                    }`}
                                    style={{ backgroundColor: color.value }}
                                    draggable={!selectedPalette.isPreset}
                                    onDoubleClick={() => handleColorDoubleClick(color.value)}
                                    onDragStart={(e) => handleDragStart(e, color.id)}
                                    onDragOver={(e) => handleDragOver(e, color.id)}
                                    onDrop={(e) => handleDrop(e, color.id)}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{color.name || color.value}</p>
                                  {selectedPalette.isPreset 
                                    ? <p className="text-xs">Double-click to edit</p>
                                    : <p className="text-xs">Drag to reorder, double-click to edit</p>
                                  }
                                </TooltipContent>
                              </Tooltip>
                              
                              {/* Drop indicator line after last item */}
                              {dropIndicatorIndex === colorIndex + 1 && (
                                <div className="absolute -right-0.5 top-0 bottom-0 w-0.5 bg-primary z-10 rounded-full"></div>
                              )}
                              
                              {/* Color Control Buttons */}
                              {!selectedPalette.isPreset && (
                                <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-4 w-4 p-0 bg-background border-border/50"
                                        onClick={() => handleMoveColorLeft(colorIndex)}
                                        disabled={colorIndex === 0}
                                      >
                                        <ChevronLeft className="h-2 w-2" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Move left</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-4 w-4 p-0 bg-background border-border/50"
                                        onClick={() => handleMoveColorRight(colorIndex)}
                                        disabled={colorIndex === selectedPalette.colors.length - 1}
                                      >
                                        <ChevronRight className="h-2 w-2" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Move right</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              )}
                              
                              {/* Remove Button */}
                              {!selectedPalette.isPreset && selectedPalette.colors.length > 1 && (
                                <div className="absolute -bottom-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-4 w-4 p-0 bg-background border-border/50 hover:bg-destructive hover:text-destructive-foreground"
                                        onClick={() => handleRemoveColor(color.id)}
                                      >
                                        <X className="h-2 w-2" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Remove color</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {selectedPalette.isPreset && (
                        <p className="text-xs text-muted-foreground">
                          This is a preset palette. Create a custom palette to edit colors.
                        </p>
                      )}
                    </div>
                  )}
                  
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
                        <SelectItem value="by-index">By Index</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Help Text */}
                  <div className="text-xs text-muted-foreground bg-muted/20 p-2 rounded">
                    <p>Maps image colors to the selected palette for ASCII character backgrounds. All colors in the palette will be used for mapping.</p>
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
      />

      {/* Palette Management Dialog */}
      <ManagePalettesDialog
        isOpen={showManagePalettes}
        onOpenChange={setShowManagePalettes}
      />

      {/* Import/Export Dialogs */}
      <ImportPaletteDialog
        isOpen={showImportDialog}
        onOpenChange={setShowImportDialog}
      />

      <ExportPaletteDialog
        isOpen={showExportDialog}
        onOpenChange={setShowExportDialog}
      />
    </TooltipProvider>
  );
}