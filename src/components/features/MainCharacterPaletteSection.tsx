/**
 * MainCharacterPaletteSection - Enhanced character palette for the main drawing tool
 * 
 * Features:
 * - Integrated palette selector and editor
 * - Character reordering and reverse functionality
 * - Preset and custom palette management
 * - Character picker integration
 * - Updates toolStore.selectedChar for drawing tools
 */

import React, { useState, useMemo } from 'react';
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

import {
  ArrowLeft,
  ArrowRight,
  GripVertical,
  Plus,
  Settings,
  Trash2,
  X,
  Download,
  Upload
} from 'lucide-react';
import { CollapsibleHeader } from '../common/CollapsibleHeader';
import { ManageCharacterPalettesDialog } from './ManageCharacterPalettesDialog';
import { ImportCharacterPaletteDialog } from './ImportCharacterPaletteDialog';
import { ExportCharacterPaletteDialog } from './ExportCharacterPaletteDialog';
import { CharacterPicker } from './CharacterPicker';
import { 
  useCharacterPaletteStore
} from '../../stores/characterPaletteStore';
import { useToolStore } from '../../stores/toolStore';
import type { CharacterPalette } from '../../types/palette';

interface MainCharacterPaletteSectionProps {
  className?: string;
}

export function MainCharacterPaletteSection({ className = '' }: MainCharacterPaletteSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);
  const [isManagePalettesOpen, setIsManagePalettesOpen] = useState(false);
  const [isCharacterPickerOpen, setIsCharacterPickerOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [pickerTriggerSource, setPickerTriggerSource] = useState<'edit-button' | 'palette-icon' | 'palette-swatch'>('palette-icon');
  const [editingCharacterIndex, setEditingCharacterIndex] = useState<number | null>(null);
  const characterPickerTriggerRef = React.useRef<HTMLButtonElement>(null);
  const editButtonRef = React.useRef<HTMLButtonElement>(null);
  const paletteContainerRef = React.useRef<HTMLDivElement>(null);

  // Tool store for selectedChar - this is the main difference from CharacterMappingSection
  const { selectedChar, setSelectedChar } = useToolStore();

  // Character palette store access
  const availablePalettes = useCharacterPaletteStore(state => state.availablePalettes);
  const customPalettes = useCharacterPaletteStore(state => state.customPalettes);
  const allPalettes = useMemo(() => [...availablePalettes, ...customPalettes], [availablePalettes, customPalettes]);
  const activePalette = useCharacterPaletteStore(state => state.activePalette);
  const setActivePalette = useCharacterPaletteStore(state => state.setActivePalette);

  const startEditing = useCharacterPaletteStore(state => state.startEditing);
  const addCharacterToPalette = useCharacterPaletteStore(state => state.addCharacterToPalette);
  const removeCharacterFromPalette = useCharacterPaletteStore(state => state.removeCharacterFromPalette);
  const reorderCharactersInPalette = useCharacterPaletteStore(state => state.reorderCharactersInPalette);

  const updateCustomPalette = useCharacterPaletteStore(state => state.updateCustomPalette);
  const createCustomPalette = useCharacterPaletteStore(state => state.createCustomPalette);
  const duplicatePalette = useCharacterPaletteStore(state => state.duplicatePalette);

  // Handle palette selection
  const handlePaletteChange = (paletteId: string) => {
    const selectedPalette = allPalettes.find(p => p.id === paletteId);
    if (selectedPalette) {
      setActivePalette(selectedPalette);
      setSelectedIndex(null); // Clear selection when switching palettes
    }
  };

  // Handle character selection (update tool store)
  const handleSelectCharacter = (index: number) => {
    setSelectedIndex(index);
    const character = activePalette.characters[index];
    setSelectedChar(character); // Update the drawing tool's selected character
  };

  const handleCharacterSelect = (character: string) => {
    if ((pickerTriggerSource === 'edit-button' || pickerTriggerSource === 'palette-swatch') && editingCharacterIndex !== null) {
      // Replace the character at editingCharacterIndex
      const targetPalette = ensureCustomPalette();
      const newCharacters = [...targetPalette.characters];
      newCharacters[editingCharacterIndex] = character;
      updateCustomPalette(targetPalette.id, { characters: newCharacters });
      setEditingCharacterIndex(null);
    } else {
      // Add new character
      if (!activePalette.characters.includes(character)) {
        const targetPalette = ensureCustomPalette();
        addCharacterToPalette(targetPalette.id, character);
      }
    }
    setIsCharacterPickerOpen(false);
  };

  const handleAddCurrentCharacter = () => {
    if (selectedChar && !activePalette.characters.includes(selectedChar)) {
      const targetPalette = ensureCustomPalette();
      addCharacterToPalette(targetPalette.id, selectedChar);
    }
  };

  const handleMoveSelectedLeft = () => {
    if (selectedIndex === null || selectedIndex === 0) return;
    const targetPalette = ensureCustomPalette();
    reorderCharactersInPalette(targetPalette.id, selectedIndex, selectedIndex - 1);
    setSelectedIndex(selectedIndex - 1);
  };

  const handleMoveSelectedRight = () => {
    if (selectedIndex === null || selectedIndex === activePalette.characters.length - 1) return;
    const targetPalette = ensureCustomPalette();
    reorderCharactersInPalette(targetPalette.id, selectedIndex, selectedIndex + 1);
    setSelectedIndex(selectedIndex + 1);
  };

  const handleDeleteSelected = () => {
    if (selectedIndex === null) return;
    const targetPalette = ensureCustomPalette();
    removeCharacterFromPalette(targetPalette.id, selectedIndex);
    const newIndex = Math.max(0, selectedIndex - 1);
    setSelectedIndex(activePalette.characters.length > 1 ? newIndex : null);
  };
  
  // Helper function to ensure we're working with a custom palette for editing
  const ensureCustomPalette = (): CharacterPalette => {
    if (activePalette.isCustom) {
      return activePalette;
    } else {
      // Create a duplicate with "Custom" prefix
      const newPalette = duplicatePalette(activePalette.id, `Custom ${activePalette.name}`);
      setActivePalette(newPalette);
      return newPalette;
    }
  };

  const handleRemoveCharacter = (index: number) => {
    if (activePalette.characters.length > 1) {
      const targetPalette = ensureCustomPalette();
      removeCharacterFromPalette(targetPalette.id, index);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (draggedIndex === null) return;
    e.preventDefault();
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const isAfter = mouseX > rect.width / 2;
    
    setDropIndicatorIndex(isAfter ? index + 1 : index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    if (draggedIndex === null) return;
    e.preventDefault();
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const isAfter = mouseX > rect.width / 2;
    const actualTargetIndex = isAfter ? index + 1 : index;
    
    if (draggedIndex !== actualTargetIndex && draggedIndex !== actualTargetIndex - 1) {
      const targetPalette = ensureCustomPalette();
      reorderCharactersInPalette(targetPalette.id, draggedIndex, actualTargetIndex);
    }
    
    setDraggedIndex(null);
    setDropIndicatorIndex(null);
  };

  const handleDragLeave = () => {
    setDropIndicatorIndex(null);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Character Palette Section */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleHeader isOpen={isOpen}>
          Character Palette
        </CollapsibleHeader>
        <CollapsibleContent className="space-y-3">
          {/* Character Palette Selector */}
          <div className="space-y-2 w-full">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <Select value={activePalette.id} onValueChange={handlePaletteChange}>
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue placeholder="Select character palette">
                      <span className="truncate text-left">{activePalette.name}</span>
                    </SelectValue>
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
                                    <span className="text-muted-foreground flex-shrink-0">({palette.characters.length} chars)</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </div>
                          )}
                          
                          {/* Preset Palettes */}
                          {availablePalettes.length > 0 && (
                            <div>
                              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-b border-border/30">
                                Presets
                              </div>
                              {availablePalettes.map(palette => (
                                <SelectItem key={palette.id} value={palette.id} className="text-xs">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="truncate flex-1">{palette.name}</span>
                                    <span className="text-muted-foreground flex-shrink-0">({palette.characters.length} chars)</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </div>
                          )}
                        </SelectContent>
                </Select>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-8 w-8 p-0 flex-shrink-0" onClick={() => { const p = createCustomPalette('New Palette', [' ']); setActivePalette(p); startEditing(p.id); setSelectedIndex(0);}} title="Create palette">
                  <Plus className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0 flex-shrink-0" onClick={() => setIsManagePalettesOpen(true)} title="Manage palettes">
                  <Settings className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
                
                {/* Character Grid */}
                <div className="space-y-2 w-full" ref={paletteContainerRef}>
                  <div className="bg-background/50 border border-border rounded p-2 min-h-[60px] max-h-[212px] overflow-auto w-full" onDragLeave={handleDragLeave}>
                    <div className="flex flex-wrap gap-1 relative max-w-full">
                      {activePalette.characters.map((character, index) => (
                        <div key={`${character}-${index}`} className="relative">
                          {/* Drop indicator */}
                          {dropIndicatorIndex === index && draggedIndex !== null && (
                            <div className="absolute -left-0.5 top-0 bottom-0 w-0.5 bg-primary z-10 rounded-full"></div>
                          )}
                          
                          <div
                            className={`relative flex items-center justify-center w-8 h-8 bg-muted/50 border border-border rounded transition-all hover:bg-muted ${
                                draggedIndex === index ? 'opacity-50 scale-95' : ''
                              } ${
                                'cursor-move hover:border-primary/50'
                              } ${
                                selectedIndex === index ? 'ring-2 ring-primary' : ''
                              } ${
                                selectedChar === character ? 'bg-primary/20 border-primary' : ''
                              } cursor-pointer`}
                            draggable={true}
                            onClick={() => handleSelectCharacter(index)}
                            onDoubleClick={() => {
                              setSelectedIndex(index);
                              setEditingCharacterIndex(index);
                              setPickerTriggerSource('palette-swatch');
                              setIsCharacterPickerOpen(true);
                            }}
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            title={
                              activePalette.isCustom 
                                ? `Character: "${character}" (drag to reorder, double-click to edit, click X to remove)`
                                : `Character: "${character}" (double-click to edit)`
                            }
                          >
                            {/* Character display */}
                            <span className="font-mono text-sm select-none">
                              {character === ' ' ? '␣' : character}
                            </span>
                            
                            {/* Drag handle */}
                            <GripVertical className="absolute top-0 right-0 w-2 h-2 text-muted-foreground/50" />
                            
                            {/* Remove button */}
                            {activePalette.characters.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleRemoveCharacter(index); setSelectedIndex(null); }}
                                className="absolute -top-1 -right-1 h-4 w-4 p-0 bg-destructive text-destructive-foreground hover:bg-destructive/80 rounded-full opacity-0 hover:opacity-100 transition-opacity"
                              >
                                <X className="w-2 h-2" />
                              </Button>
                            )}
                          </div>
                          
                          {/* Drop indicator at end */}
                          {dropIndicatorIndex === index + 1 && draggedIndex !== null && (
                            <div className="absolute -right-0.5 top-0 bottom-0 w-0.5 bg-primary z-10 rounded-full"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Character palette controls */}
                <div className="flex items-center gap-1 w-full">
                  <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={handleMoveSelectedLeft} disabled={selectedIndex === null || selectedIndex === 0} title="Move left">
                    <ArrowLeft className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={handleMoveSelectedRight} disabled={selectedIndex === null || selectedIndex === activePalette.characters.length - 1} title="Move right">
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={handleAddCurrentCharacter} disabled={!selectedChar || activePalette.characters.includes(selectedChar)} title="Add current character">
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-6 w-6 p-0 text-destructive" onClick={handleDeleteSelected} disabled={selectedIndex === null} title="Delete character">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                  <div className="flex-1" />
                  <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => setIsImportDialogOpen(true)} title="Import character palette">
                    <Upload className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => setIsExportDialogOpen(true)} title="Export character palette">
                    <Download className="w-3 h-3" />
                  </Button>
                </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Manage Palettes Dialog */}
      <ManageCharacterPalettesDialog 
        isOpen={isManagePalettesOpen} 
        onOpenChange={setIsManagePalettesOpen}
        onImportClick={() => setIsImportDialogOpen(true)}
        onExportClick={() => setIsExportDialogOpen(true)}
      />

      {/* Character Picker */}
      <CharacterPicker
        isOpen={isCharacterPickerOpen}
        onClose={() => setIsCharacterPickerOpen(false)}
        onSelectCharacter={handleCharacterSelect}
        triggerRef={
          pickerTriggerSource === 'edit-button' ? editButtonRef :
          pickerTriggerSource === 'palette-swatch' ? paletteContainerRef :
          characterPickerTriggerRef
        }
        anchorPosition={
          pickerTriggerSource === 'edit-button' ? 'left-bottom-aligned' :
          'left-bottom'
        }
      />

      {/* Import/Export Dialogs */}
      <ImportCharacterPaletteDialog
        isOpen={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
      />
      
      <ExportCharacterPaletteDialog
        isOpen={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
      />
    </div>
  );
}