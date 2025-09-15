import React, { useState, useEffect } from 'react';
import { useToolStore } from '../../stores/toolStore';
import { usePaletteStore } from '../../stores/paletteStore';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Palette, Type, Settings, Plus, Trash2, ChevronLeft, ChevronRight, Upload, Download } from 'lucide-react';
import { CollapsibleHeader } from '../common/CollapsibleHeader';
import { ForegroundBackgroundSelector } from './ForegroundBackgroundSelector';
import { ColorPickerOverlay } from './ColorPickerOverlay';
import { ImportPaletteDialog } from './ImportPaletteDialog';
import { ExportPaletteDialog } from './ExportPaletteDialog';
import { ManagePalettesDialog } from './ManagePalettesDialog';
import { ANSI_COLORS } from '../../constants/colors';

interface ColorPickerProps {
  className?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ className = '' }) => {
  const { selectedColor, selectedBgColor, setSelectedColor, setSelectedBgColor } = useToolStore();
  const { 
    palettes,
    activePaletteId,
    selectedColorId,
    getActivePalette,
    getActiveColors,
    getCustomPalettes,
    getPresetPalettes,
    setActivePalette,
    setSelectedColor: setSelectedColorId,
    addColor,
    removeColor,
    updateColor,
    moveColorLeft,
    moveColorRight,
    createCustomPalette,
    initialize,
    addRecentColor
  } = usePaletteStore();

  const [activeTab, setActiveTab] = useState("text");
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [colorPickerMode, setColorPickerMode] = useState<'foreground' | 'background' | 'palette'>('foreground');
  const [colorPickerInitialColor, setColorPickerInitialColor] = useState('#000000');
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isManagePalettesOpen, setIsManagePalettesOpen] = useState(false);
  
  // Collapsible section states
  const [isColorSectionOpen, setIsColorSectionOpen] = useState(true);
  const [isPaletteSectionOpen, setIsPaletteSectionOpen] = useState(true);

  // Initialize palette store on mount (ensure default palettes are loaded)
  useEffect(() => {
    if (palettes.length === 0) {
      initialize();
    }
  }, [palettes.length, initialize]);

  // Get active palette and colors
  const activePalette = getActivePalette();
  const activeColors = getActiveColors();
  const customPalettes = getCustomPalettes();
  const presetPalettes = getPresetPalettes();

  // Filter colors for foreground (no transparent) and background (always include transparent)
  const foregroundColors = activeColors.filter(color => color.value !== 'transparent' && color.value !== ANSI_COLORS.transparent);
  const backgroundColors = [
    { id: 'transparent', value: 'transparent', name: 'Transparent' }, 
    ...activeColors.filter(color => color.value !== 'transparent' && color.value !== ANSI_COLORS.transparent)
  ];

  // Handle palette selection
  const handlePaletteChange = (paletteId: string) => {
    setActivePalette(paletteId);
    setSelectedColorId(null);
  };

  // Handle color selection from palette
  const handleColorSelect = (color: string, isBackground = false) => {
    if (isBackground) {
      setSelectedBgColor(color);
    } else {
      setSelectedColor(color);
    }
    addRecentColor(color);
  };

  // Handle color selection for editing (single click)
  const handleColorPaletteSelect = (colorId: string) => {
    setSelectedColorId(selectedColorId === colorId ? null : colorId);
  };

  // Get current active color based on which tab is active
  const getCurrentActiveColor = () => {
    if (activeTab === 'bg') {
      // If background is transparent, use default grey instead
      if (selectedBgColor === 'transparent' || selectedBgColor === ANSI_COLORS.transparent) {
        return '#808080';
      }
      return selectedBgColor;
    }
    return selectedColor;
  };

  // Drag and drop state
  const [draggedColorId, setDraggedColorId] = useState<string | null>(null);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, colorId: string) => {
    if (!activePalette) {
      e.preventDefault();
      return;
    }
    setDraggedColorId(colorId);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, targetColorId?: string) => {
    if (!activePalette || !draggedColorId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (targetColorId) {
      const targetIndex = activeColors.findIndex(c => c.id === targetColorId);
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
    if (!activePalette || !draggedColorId || draggedColorId === targetColorId) {
      setDraggedColorId(null);
      setDropIndicatorIndex(null);
      return;
    }

    // Find indices of source and target colors
    const sourceIndex = activeColors.findIndex(c => c.id === draggedColorId);
    const targetIndex = activeColors.findIndex(c => c.id === targetColorId);
    
    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedColorId(null);
      setDropIndicatorIndex(null);
      return;
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
        moveColorRight(activePaletteId, draggedColorId);
      }
    } else if (currentIndex > finalTargetIndex) {
      // Moving left - use moveColorLeft
      for (let i = 0; i < sourceIndex - finalTargetIndex; i++) {
        moveColorLeft(activePaletteId, draggedColorId);
      }
    }

    setDraggedColorId(null);
    setDropIndicatorIndex(null);
  };

  // Handle drag leave
  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the grid container
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropIndicatorIndex(null);
    }
  };

  // Handle color double-click to edit
  const handleColorDoubleClick = (color: string) => {
    if (activePalette) {
      const colorItem = activeColors.find(c => c.value === color);
      setEditingColorId(colorItem?.id || null);
      setColorPickerMode('palette');
      setColorPickerInitialColor(color);
      setIsColorPickerOpen(true);
    }
  };

  // Handle opening color picker from foreground/background selector
  const handleOpenColorPicker = (mode: 'foreground' | 'background', currentColor: string) => {
    setColorPickerMode(mode);
    setColorPickerInitialColor(currentColor);
    setIsColorPickerOpen(true);
  };

  // Handle color picker selection
  const handleColorPickerSelect = (newColor: string) => {
    if (colorPickerMode === 'palette' && editingColorId) {
      // Update the color in the palette
      updateColor(activePaletteId, editingColorId, newColor);
      // Clear editing state
      setEditingColorId(null);
      setColorPickerMode('foreground');
    } else if (colorPickerMode === 'foreground') {
      setSelectedColor(newColor);
    } else if (colorPickerMode === 'background') {
      setSelectedBgColor(newColor);
    }
  };

  // Check if color is currently selected 
  const isColorSelected = (color: string, isBackground = false) => {
    return isBackground ? selectedBgColor === color : selectedColor === color;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Color Section */}
      <Collapsible open={isColorSectionOpen} onOpenChange={setIsColorSectionOpen}>
        <CollapsibleHeader isOpen={isColorSectionOpen}>
          Color
        </CollapsibleHeader>
        <CollapsibleContent className="collapsible-content space-y-3">
          {/* Photoshop-style foreground/background selector */}
          <ForegroundBackgroundSelector onOpenColorPicker={handleOpenColorPicker} />
        </CollapsibleContent>
      </Collapsible>

      <div className="relative -mx-4 h-px">
        <Separator className="absolute inset-0" />
      </div>

      {/* Palette Section */}
      <Collapsible open={isPaletteSectionOpen} onOpenChange={setIsPaletteSectionOpen}>
        <CollapsibleHeader isOpen={isPaletteSectionOpen}>
          Palette
        </CollapsibleHeader>
        <CollapsibleContent className="collapsible-content space-y-3">
          {/* Palette selector with inline buttons */}
          <div className="flex items-center gap-1">
            <div className="w-28 flex-shrink-0">
              <Select value={activePaletteId || ''} onValueChange={handlePaletteChange}>
                <SelectTrigger className="w-full h-8 text-xs">
                  <SelectValue placeholder="Select palette..." className="truncate" />
                </SelectTrigger>
              <SelectContent>
                {customPalettes.length > 0 && (
                  <>
                    {customPalettes.map((palette) => (
                      <SelectItem key={palette.id} value={palette.id} className="text-xs">
                        <span>{palette.name}</span>
                      </SelectItem>
                    ))}
                    <SelectSeparator />
                  </>
                )}
                {presetPalettes.map((palette) => (
                  <SelectItem key={palette.id} value={palette.id} className="text-xs">
                    <span>{palette.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 flex-shrink-0"
                    onClick={() => {
                      const newPaletteId = createCustomPalette('New Palette');
                      setActivePalette(newPaletteId);
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create new palette</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 flex-shrink-0"
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

          {/* Color palette tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="text" className="text-xs h-full flex items-center justify-center gap-1">
                <Type className="w-3 h-3" />
                Text
              </TabsTrigger>
              <TabsTrigger value="bg" className="text-xs h-full flex items-center justify-center gap-1">
                <Palette className="w-3 h-3" />
                BG
              </TabsTrigger>
            </TabsList>

            {/* Foreground colors */}
            <TabsContent value="text" className="mt-2">
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-2">
                  <div className="grid grid-cols-6 gap-0.5 relative flex items-center justify-center" onDragLeave={handleDragLeave}>
                    {foregroundColors.map((color, index) => (
                      <div key={`text-${color.id}`} className="relative flex items-center justify-center">
                        {/* Drop indicator line */}
                        {dropIndicatorIndex === index && (
                          <div className="absolute -left-0.5 top-0 bottom-0 w-0.5 bg-primary z-10 rounded-full"></div>
                        )}
                        
                        <button
                          draggable={!!activePalette}
                          className={`w-6 h-6 rounded border-2 transition-all hover:scale-105 relative ${
                            draggedColorId === color.id ? 'opacity-50 scale-95' : ''
                          } ${
                            selectedColorId === color.id
                              ? 'border-primary ring-2 ring-primary/20 shadow-lg' 
                              : isColorSelected(color.value, false)
                              ? 'border-primary ring-1 ring-primary/20' 
                              : 'border-border'
                          } cursor-move`}
                          style={{ backgroundColor: color.value }}
                          onClick={() => {
                            // Single click sets drawing color and selects for editing
                            handleColorSelect(color.value, false);
                            handleColorPaletteSelect(color.id);
                          }}
                          onDoubleClick={() => handleColorDoubleClick(color.value)}
                          onDragStart={(e) => handleDragStart(e, color.id)}
                          onDragOver={(e) => handleDragOver(e, color.id)}
                          onDrop={(e) => handleDrop(e, color.id)}
                          title={
                            activePalette?.isCustom 
                              ? `${color.name ? `${color.name}: ${color.value}` : color.value} (drag to reorder)` 
                              : color.name ? `${color.name}: ${color.value}` : color.value
                          }
                        />
                        
                        {/* Drop indicator line after last item */}
                        {dropIndicatorIndex === index + 1 && (
                          <div className="absolute -right-0.5 top-0 bottom-0 w-0.5 bg-primary z-10 rounded-full"></div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Background colors */}
            <TabsContent value="bg" className="mt-2">
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-2">
                  <div className="grid grid-cols-6 gap-0.5 relative flex items-center justify-center" onDragLeave={handleDragLeave}>
                    {backgroundColors.map((color, index) => {
                      const isTransparent = color.value === 'transparent';
                      return (
                        <div key={`bg-${color.id}`} className="relative flex items-center justify-center">
                          {/* Drop indicator line */}
                          {dropIndicatorIndex === index && (
                            <div className="absolute -left-0.5 top-0 bottom-0 w-0.5 bg-primary z-10 rounded-full"></div>
                          )}
                          
                          <button
                            draggable={!!activePalette && !isTransparent}
                            className={`w-6 h-6 rounded border-2 transition-all hover:scale-105 relative overflow-hidden ${
                              draggedColorId === color.id ? 'opacity-50 scale-95' : ''
                            } ${
                              selectedColorId === color.id
                                ? 'border-primary ring-2 ring-primary/20 shadow-lg' 
                                : isColorSelected(color.value, true)
                                ? 'border-primary ring-1 ring-primary/20' 
                                : 'border-border'
                            } ${!isTransparent ? 'cursor-move' : 'cursor-pointer'}`}
                            style={{
                              backgroundColor: isTransparent ? '#ffffff' : color.value,
                              backgroundImage: isTransparent 
                                ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                                : 'none',
                              backgroundSize: isTransparent ? '8px 8px' : 'auto',
                              backgroundPosition: isTransparent ? '0 0, 0 4px, 4px -4px, -4px 0px' : 'auto'
                            }}
                            onClick={() => {
                              handleColorSelect(color.value, true);
                              handleColorPaletteSelect(color.id);
                            }}
                            onDoubleClick={() => !isTransparent && handleColorDoubleClick(color.value)}
                            onDragStart={(e) => handleDragStart(e, color.id)}
                            onDragOver={(e) => handleDragOver(e, color.id)}
                            onDrop={(e) => handleDrop(e, color.id)}
                            title={
                              isTransparent 
                                ? 'Transparent background' 
                                : activePalette?.isCustom 
                                ? `${color.name ? `${color.name}: ${color.value}` : color.value} (drag to reorder)` 
                                : color.name ? `${color.name}: ${color.value}` : color.value
                            }
                          >
                            {isTransparent && (
                              <svg 
                                className="absolute inset-0 w-full h-full pointer-events-none" 
                                viewBox="0 0 24 24"
                                style={{ borderRadius: 'inherit' }}
                              >
                                <line 
                                  x1="2" y1="2" 
                                  x2="22" y2="22" 
                                  stroke="#ef4444" 
                                  strokeWidth="2"
                                />
                              </svg>
                            )}
                          </button>
                          
                          {/* Drop indicator line after last item */}
                          {dropIndicatorIndex === index + 1 && (
                            <div className="absolute -right-0.5 top-0 bottom-0 w-0.5 bg-primary z-10 rounded-full"></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Palette controls */}
          {activePalette && (
            <div className="flex items-center justify-between">
              {/* Editing controls (only for custom palettes) */}
              <div className="flex gap-0.5">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0"
                        onClick={() => selectedColorId && moveColorLeft(activePaletteId, selectedColorId)}
                        disabled={!selectedColorId || !activePalette?.isCustom}
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Move color left{!activePalette?.isCustom ? ' (will create custom copy)' : ''}</p>
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
                        onClick={() => selectedColorId && moveColorRight(activePaletteId, selectedColorId)}
                        disabled={!selectedColorId || !activePalette?.isCustom}
                      >
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Move color right{!activePalette?.isCustom ? ' (will create custom copy)' : ''}</p>
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
                        onClick={() => addColor(activePaletteId, getCurrentActiveColor())}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Add color{!activePalette?.isCustom ? ' (will create custom copy)' : ''}</p>
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
                        onClick={() => selectedColorId && removeColor(activePaletteId, selectedColorId)}
                        disabled={!selectedColorId || activeColors.length <= 1}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Remove color{!activePalette?.isCustom ? ' (will create custom copy)' : ''}</p>
                    </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

              {/* Import/Export buttons (always visible) */}
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
          )}

          {/* Status text */}
          {activePalette && (
            <div className="text-xs text-muted-foreground text-center">
              {activePalette.name} • {activeColors.length} colors
              {selectedColorId && (
                <span className="ml-2">
                  • Selected: {activeColors.find(c => c.id === selectedColorId)?.name || 'Color'}
                </span>
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Color Picker Modal */}
      <ColorPickerOverlay
        isOpen={isColorPickerOpen}
        onOpenChange={(open) => {
          setIsColorPickerOpen(open);
          // Reset editing state when closing
          if (!open && colorPickerMode === 'palette') {
            setEditingColorId(null);
            setColorPickerMode('foreground');
          }
        }}
        onColorSelect={handleColorPickerSelect}
        initialColor={colorPickerInitialColor}
        title={
          colorPickerMode === 'palette' 
            ? 'Edit Palette Color' 
            : `Edit ${colorPickerMode === 'foreground' ? 'Foreground' : 'Background'} Color`
        }
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

      {/* Manage Palettes Dialog */}
      <ManagePalettesDialog
        isOpen={isManagePalettesOpen}
        onOpenChange={setIsManagePalettesOpen}
      />
    </div>
  );
};
