import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trash2, Copy, Edit3, Plus, Type, Upload, Download } from 'lucide-react';
import { useCharacterPaletteStore } from '../../stores/characterPaletteStore';
import type { CharacterPalette } from '../../types/palette';

interface ManageCharacterPalettesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onImportClick: () => void;
  onExportClick: () => void;
}

export const ManageCharacterPalettesDialog: React.FC<ManageCharacterPalettesDialogProps> = ({
  isOpen,
  onOpenChange,
  onImportClick,
  onExportClick
}) => {
  const availablePalettes = useCharacterPaletteStore(state => state.availablePalettes);
  const customPalettes = useCharacterPaletteStore(state => state.customPalettes);
  const activePalette = useCharacterPaletteStore(state => state.activePalette);
  const setActivePalette = useCharacterPaletteStore(state => state.setActivePalette);
  const deleteCustomPalette = useCharacterPaletteStore(state => state.deleteCustomPalette);
  const updateCustomPalette = useCharacterPaletteStore(state => state.updateCustomPalette);
  const duplicatePalette = useCharacterPaletteStore(state => state.duplicatePalette);
  const createCustomPalette = useCharacterPaletteStore(state => state.createCustomPalette);

  const [editingPaletteId, setEditingPaletteId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleStartRename = (palette: CharacterPalette) => {
    setEditingPaletteId(palette.id);
    setEditingName(palette.name);
  };

  const handleSaveRename = () => {
    if (editingPaletteId && editingName.trim()) {
      updateCustomPalette(editingPaletteId, { name: editingName.trim() });
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
      deleteCustomPalette(paletteId);
    }
  };

  const handleDuplicate = (paletteId: string) => {
    const newPalette = duplicatePalette(paletteId);
    setActivePalette(newPalette);
  };

  const handleCreateNew = () => {
    const newPalette = createCustomPalette('New Palette', [' ']);
    setActivePalette(newPalette);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[70vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            Manage Character Palettes
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Custom Palettes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Custom Palettes</h3>
              <div className="flex gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="outline" onClick={onImportClick} className="h-7 w-7 p-0">
                        <Upload className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Import character palette</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="outline" onClick={onExportClick} className="h-7 w-7 p-0">
                        <Download className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Export active character palette</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <Button size="sm" variant="outline" onClick={handleCreateNew} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  New Palette
                </Button>
              </div>
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
                      palette.id === activePalette.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex gap-1">
                      {palette.characters.slice(0, 8).map((ch, idx) => (
                        <div key={idx} className="w-5 h-5 rounded-sm border border-border/50 flex items-center justify-center font-mono text-xs">
                          {ch === ' ' ? '␣' : ch}
                        </div>
                      ))}
                      {palette.characters.length > 8 && (
                        <div className="w-5 h-5 rounded-sm border border-border/50 bg-muted flex items-center justify-center">
                          <span className="text-[10px] text-muted-foreground">+</span>
                        </div>
                      )}
                    </div>

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
                          <Button size="sm" onClick={handleSaveRename} className="h-6 w-6 p-0">✓</Button>
                          <Button size="sm" variant="outline" onClick={handleCancelRename} className="h-6 w-6 p-0">✕</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium truncate">{palette.name}</span>
                          <span className="text-xs text-muted-foreground">({palette.characters.length} chars)</span>
                          {palette.id === activePalette.id && (
                            <span className="text-xs text-primary">• Active</span>
                          )}
                        </div>
                      )}
                    </div>

                    {editingPaletteId !== palette.id && (
                      <div className="flex gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" onClick={() => setActivePalette(palette)} className="h-6 w-6 p-0" disabled={palette.id === activePalette.id}>
                                <Type className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Set active</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" onClick={() => handleStartRename(palette)} className="h-6 w-6 p-0">
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
                              <Button size="sm" variant="ghost" onClick={() => handleDuplicate(palette.id)} className="h-6 w-6 p-0">
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
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(palette.id)} className="h-6 w-6 p-0 text-destructive">
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

          {/* Preset Palettes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Preset Palettes</h3>
            </div>

            <div className="space-y-2">
              {availablePalettes.map((palette) => (
                <div
                  key={palette.id}
                  className={`flex items-center gap-2 p-2 rounded-md border ${
                    palette.id === activePalette.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex gap-1">
                    {palette.characters.slice(0, 8).map((ch, idx) => (
                      <div key={idx} className="w-5 h-5 rounded-sm border border-border/50 flex items-center justify-center font-mono text-xs">
                        {ch === ' ' ? '␣' : ch}
                      </div>
                    ))}
                    {palette.characters.length > 8 && (
                      <div className="w-5 h-5 rounded-sm border border-border/50 bg-muted flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground">+</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium truncate">{palette.name}</span>
                      <span className="text-xs text-muted-foreground">({palette.characters.length} chars)</span>
                      {palette.id === activePalette.id && (
                        <span className="text-xs text-primary">• Active</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm" variant="ghost" onClick={() => setActivePalette(palette)} className="h-6 w-6 p-0" disabled={palette.id === activePalette.id}>
                            <Type className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Set active</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm" variant="ghost" onClick={() => handleDuplicate(palette.id)} className="h-6 w-6 p-0">
                            <Copy className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Duplicate to custom palette</p>
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