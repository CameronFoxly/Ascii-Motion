import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trash2, Copy, Edit3, Palette, Plus } from 'lucide-react';
import { usePaletteStore } from '../../stores/paletteStore';
import type { ColorPalette } from '../../types/palette';

interface ManagePalettesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ManagePalettesDialog: React.FC<ManagePalettesDialogProps> = ({
  isOpen,
  onOpenChange
}) => {
  const {
    getAllPalettes,
    activePaletteId,
    setActivePalette,
    deletePalette,
    renamePalette,
    duplicatePalette,
    createCustomPalette
  } = usePaletteStore();

  const [editingPaletteId, setEditingPaletteId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const allPalettes = getAllPalettes();
  const customPalettes = allPalettes.filter(p => p.isCustom);
  const presetPalettes = allPalettes.filter(p => !p.isCustom);

  const handleStartRename = (palette: ColorPalette) => {
    setEditingPaletteId(palette.id);
    setEditingName(palette.name);
  };

  const handleSaveRename = () => {
    if (editingPaletteId && editingName.trim()) {
      renamePalette(editingPaletteId, editingName.trim());
      setEditingPaletteId(null);
      setEditingName('');
    }
  };

  const handleCancelRename = () => {
    setEditingPaletteId(null);
    setEditingName('');
  };

  const handleDelete = (paletteId: string) => {
    if (confirm('Are you sure you want to delete this palette?')) {
      const deleted = deletePalette(paletteId);
      if (deleted && paletteId === activePaletteId) {
        // If we deleted the active palette, switch to the first preset palette
        const firstPreset = presetPalettes[0];
        if (firstPreset) {
          setActivePalette(firstPreset.id);
        }
      }
    }
  };

  const handleDuplicate = (paletteId: string) => {
    const newPaletteId = duplicatePalette(paletteId);
    setActivePalette(newPaletteId);
  };

  const handleCreateNew = () => {
    const newPaletteId = createCustomPalette('New Palette');
    setActivePalette(newPaletteId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[70vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Manage Palettes
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Custom Palettes Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Custom Palettes</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCreateNew}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                New Palette
              </Button>
            </div>

            {customPalettes.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-4 border rounded-md border-dashed">
                No custom palettes yet. Create one to get started!
              </div>
            ) : (
              <div className="space-y-2">
                {customPalettes.map((palette) => (
                  <div
                    key={palette.id}
                    className={`flex items-center gap-2 p-2 rounded-md border ${
                      palette.id === activePaletteId
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    {/* Color preview */}
                    <div className="flex gap-0.5">
                      {palette.colors.slice(0, 8).map((color, index) => (
                        <div
                          key={index}
                          className="w-3 h-3 rounded-sm border border-border/50"
                          style={{ backgroundColor: color.value }}
                        />
                      ))}
                      {palette.colors.length > 8 && (
                        <div className="w-3 h-3 rounded-sm border border-border/50 bg-muted flex items-center justify-center">
                          <span className="text-[6px] text-muted-foreground">+</span>
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      {editingPaletteId === palette.id ? (
                        <div className="flex gap-1">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="h-6 text-xs"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename();
                              if (e.key === 'Escape') handleCancelRename();
                            }}
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={handleSaveRename}
                            className="h-6 w-6 p-0"
                          >
                            ✓
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelRename}
                            className="h-6 w-6 p-0"
                          >
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium truncate">{palette.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({palette.colors.length} colors)
                          </span>
                          {palette.id === activePaletteId && (
                            <span className="text-xs text-primary">• Active</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {editingPaletteId !== palette.id && (
                      <div className="flex gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setActivePalette(palette.id)}
                                className="h-6 w-6 p-0"
                                disabled={palette.id === activePaletteId}
                              >
                                <Palette className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Set as active</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleStartRename(palette)}
                                className="h-6 w-6 p-0"
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Rename</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDuplicate(palette.id)}
                                className="h-6 w-6 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Duplicate</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(palette.id)}
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preset Palettes Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Preset Palettes</h3>
            <div className="space-y-2">
              {presetPalettes.map((palette) => (
                <div
                  key={palette.id}
                  className={`flex items-center gap-2 p-2 rounded-md border ${
                    palette.id === activePaletteId
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  {/* Color preview */}
                  <div className="flex gap-0.5">
                    {palette.colors.slice(0, 8).map((color, index) => (
                      <div
                        key={index}
                        className="w-3 h-3 rounded-sm border border-border/50"
                        style={{ backgroundColor: color.value }}
                      />
                    ))}
                    {palette.colors.length > 8 && (
                      <div className="w-3 h-3 rounded-sm border border-border/50 bg-muted flex items-center justify-center">
                        <span className="text-[6px] text-muted-foreground">+</span>
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium truncate">{palette.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({palette.colors.length} colors)
                      </span>
                      {palette.id === activePaletteId && (
                        <span className="text-xs text-primary">• Active</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setActivePalette(palette.id)}
                            className="h-6 w-6 p-0"
                            disabled={palette.id === activePaletteId}
                          >
                            <Palette className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Set as active</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDuplicate(palette.id)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Duplicate to custom</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
