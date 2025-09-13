import React, { useState, useEffect } from 'react';
import { useToolStore } from '../../stores/toolStore';
import { usePaletteStore } from '../../stores/paletteStore';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Palette, Type, Settings, Plus, Trash2, ChevronLeft, ChevronRight, Upload, Download } from 'lucide-react';
import { ForegroundBackgroundSelector } from './ForegroundBackgroundSelector';
import { ColorPickerOverlay } from './ColorPickerOverlay';
import { ImportPaletteDialog } from './ImportPaletteDialog';
import { ExportPaletteDialog } from './ExportPaletteDialog';
import { ANSI_COLORS } from '../../constants/colors';

interface ColorPickerProps {
  className?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ className = '' }) => {
  const { selectedColor, selectedBgColor, setSelectedColor, setSelectedBgColor } = useToolStore();
  const { 
    palettes,
    customPalettes,
    activePaletteId,
    selectedColorId,
    getActivePalette,
    getActiveColors,
    getAllPalettes,
    setActivePalette,
    setSelectedColor: setSelectedColorId,
    addColor,
    removeColor,
    updateColor,
    moveColorLeft,
    moveColorRight,
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

  // Initialize palette store on mount
  useEffect(() => {
    if (palettes.length === 0 && customPalettes.length === 0) {
      initialize();
    }
  }, [palettes.length, customPalettes.length, initialize]);

  // Get active palette and colors
  const activePalette = getActivePalette();
  const activeColors = getActiveColors();
  const allPalettes = getAllPalettes();

  // Filter colors for foreground (no transparent) and background (include transparent)
  const foregroundColors = activeColors.filter(color => color.value !== 'transparent' && color.value !== ANSI_COLORS.transparent);
  const backgroundColors = activePalette?.id === 'ansi-16' 
    ? [{ id: 'transparent', value: 'transparent', name: 'Transparent' }, ...activeColors.filter(color => color.value !== 'transparent')]
    : activeColors;

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

  // Handle double-click to edit color
  const handleColorDoubleClick = (color: string, isBackground = false) => {
    // Find the color being edited in the palette
    const colorObj = activeColors.find(c => c.value === color);
    if (colorObj) {
      setEditingColorId(colorObj.id);
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
    <div className={`space-y-4 ${className}`}>
      {/* Photoshop-style foreground/background selector */}
      <ForegroundBackgroundSelector onOpenColorPicker={handleOpenColorPicker} />

      {/* Palette selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-muted-foreground">Palette</label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 w-6 p-0"
                  onClick={() => {/* TODO: Open palette manager */}}
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
        
        <Select value={activePaletteId} onValueChange={handlePaletteChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select palette" />
          </SelectTrigger>
          <SelectContent>
            {allPalettes.map((palette) => (
              <SelectItem key={palette.id} value={palette.id} className="text-xs">
                <div className="flex items-center gap-2">
                  <span>{palette.name}</span>
                  {palette.isCustom && (
                    <span className="text-xs text-muted-foreground">(Custom)</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
              <div className="grid grid-cols-6 gap-0.5">
                {foregroundColors.map((color) => (
                  <button
                    key={`text-${color.id}`}
                    className={`w-6 h-6 rounded border-2 transition-all hover:scale-105 ${
                      isColorSelected(color.value, false)
                        ? 'border-primary ring-2 ring-primary/20' 
                        : 'border-border'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => handleColorSelect(color.value, false)}
                    onDoubleClick={() => handleColorDoubleClick(color.value, false)}
                    title={color.name ? `${color.name}: ${color.value}` : color.value}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Background colors */}
        <TabsContent value="bg" className="mt-2">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-2">
              <div className="grid grid-cols-6 gap-0.5">
                {backgroundColors.map((color) => {
                  const isTransparent = color.value === 'transparent';
                  return (
                    <button
                      key={`bg-${color.id}`}
                      className={`w-6 h-6 rounded border-2 transition-all hover:scale-105 relative ${
                        isColorSelected(color.value, true)
                          ? 'border-primary ring-2 ring-primary/20' 
                          : 'border-border'
                      }`}
                      style={{ 
                        backgroundColor: isTransparent ? '#ffffff' : color.value,
                        backgroundImage: isTransparent 
                          ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                          : 'none',
                        backgroundSize: isTransparent ? '4px 4px' : 'auto',
                        backgroundPosition: isTransparent ? '0 0, 0 2px, 2px -2px, -2px 0px' : 'auto'
                      }}
                      onClick={() => handleColorSelect(color.value, true)}
                      onDoubleClick={() => !isTransparent && handleColorDoubleClick(color.value, true)}
                      title={isTransparent ? 'Transparent background' : (color.name ? `${color.name}: ${color.value}` : color.value)}
                    >
                      {isTransparent && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-red-500 font-bold text-xs">∅</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Color management buttons */}
      <div className="flex items-center justify-between gap-1">
        {/* Custom palette editing buttons (only for custom palettes) */}
        {activePalette?.isCustom && (
          <>
            {/* Reorder buttons */}
            <div className="flex gap-0.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 w-6 p-0"
                      onClick={() => selectedColorId && moveColorLeft(activePaletteId, selectedColorId)}
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
                      onClick={() => selectedColorId && moveColorRight(activePaletteId, selectedColorId)}
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
            </div>

            {/* Add/Remove buttons */}
            <div className="flex gap-0.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 w-6 p-0"
                      onClick={() => addColor(activePaletteId, '#808080')}
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
                      onClick={() => selectedColorId && removeColor(activePaletteId, selectedColorId)}
                      disabled={!selectedColorId || activeColors.length <= 1}
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
          </>
        )}

        {/* Spacer when not custom palette */}
        {!activePalette?.isCustom && <div className="flex-1" />}

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
      </div>      {/* Status text */}
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
    </div>
  );
};
