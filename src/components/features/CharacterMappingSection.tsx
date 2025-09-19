/**
 * CharacterMappingSection - Collapsible section for character palette mapping controls
 * 
 * Features:
 * - Collapsible header with app-consistent animation
 * - Integrated palette selector and editor
 * - Character reordering and reverse functionality
 * - Mapping algorithm selection
 * - Streamlined UI without redundant preview/density controls
 */

import React, { useState, useMemo } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
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
import { 
  Type, 
  Plus,
  Trash2,
  X,
  GripVertical,
  ArrowUpDown,
  ArrowLeft,
  ArrowRight,
  Settings,
  Palette,
  Edit
} from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { ManageCharacterPalettesDialog } from './ManageCharacterPalettesDialog';
import { CharacterPicker } from './CharacterPicker';
import { 
  useCharacterPaletteStore
} from '../../stores/characterPaletteStore';
import { useImportSettings } from '../../stores/importStore';
import type { CharacterPalette } from '../../types/palette';


interface CharacterMappingSectionProps {
  onSettingsChange?: () => void; // Callback for triggering preview updates
}

export function CharacterMappingSection({ onSettingsChange }: CharacterMappingSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [newCharacterInput, setNewCharacterInput] = useState('');

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);
  const [isManagePalettesOpen, setIsManagePalettesOpen] = useState(false);
  const [isCharacterPickerOpen, setIsCharacterPickerOpen] = useState(false);
  const [pickerTriggerSource, setPickerTriggerSource] = useState<'edit-button' | 'palette-icon'>('palette-icon');
  const [editingCharacterIndex, setEditingCharacterIndex] = useState<number | null>(null);
  const addCharInputRef = React.useRef<HTMLInputElement | null>(null);
  const characterPickerTriggerRef = React.useRef<HTMLButtonElement>(null);
  const editButtonRef = React.useRef<HTMLButtonElement>(null);
  const paletteContainerRef = React.useRef<HTMLDivElement>(null);

  // Import settings for enable/disable toggle
  const { settings, updateSettings } = useImportSettings();
  const { enableCharacterMapping } = settings;

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
      onSettingsChange?.();
      // reset selected index when switching palettes
      setSelectedIndex(null);
    }
  };

  // Handle reverse character order
  const handleReverseOrder = () => {
    const targetPalette = ensureCustomPalette();
    const reversedCharacters = [...activePalette.characters].reverse();
    updateCustomPalette(targetPalette.id, { characters: reversedCharacters });
    onSettingsChange?.();
    if (selectedIndex !== null) {
      setSelectedIndex(activePalette.characters.length - 1 - selectedIndex);
    }
  };

  const handleSelectCharacter = (index: number) => {
    setSelectedIndex(index === selectedIndex ? null : index);
  };
  
  const handleMoveSelectedLeft = () => {
    if (selectedIndex === null) return;
    if (selectedIndex <= 0) return;
    const targetPalette = ensureCustomPalette();
    reorderCharactersInPalette(targetPalette.id, selectedIndex, selectedIndex - 1);
    setSelectedIndex(selectedIndex - 1);
    onSettingsChange?.();
  };
  
  const handleMoveSelectedRight = () => {
    if (selectedIndex === null) return;
    if (selectedIndex >= activePalette.characters.length - 1) return;
    const targetPalette = ensureCustomPalette();
    reorderCharactersInPalette(targetPalette.id, selectedIndex, selectedIndex + 1);
    setSelectedIndex(selectedIndex + 1);
    onSettingsChange?.();
  };
  
  const handleDeleteSelected = () => {
    if (selectedIndex === null) return;
    const targetPalette = ensureCustomPalette();
    removeCharacterFromPalette(targetPalette.id, selectedIndex);
    const newIndex = Math.max(0, selectedIndex - 1);
    setSelectedIndex(activePalette.characters.length > 1 ? newIndex : null);
    onSettingsChange?.();
  };
  
  const handleEditCharacters = () => {
    // Only allow editing if a character is selected
    if (selectedIndex === null) return;
    
    // Open character picker in edit mode
    setPickerTriggerSource('edit-button');
    setEditingCharacterIndex(selectedIndex);
    setIsCharacterPickerOpen(true);
  };
  
  const handleToggleEnabled = (enabled: boolean) => {
    updateSettings({ enableCharacterMapping: enabled });
    onSettingsChange?.();
  };



  // Character editing handlers


  const handleAddCharacter = () => {
    if (newCharacterInput.trim()) {
      const character = newCharacterInput.trim()[0]; // Take only first character
      if (!activePalette.characters.includes(character)) {
        const targetPalette = ensureCustomPalette();
        addCharacterToPalette(targetPalette.id, character);
        setNewCharacterInput('');
        addCharInputRef.current?.focus();
      }
    }
  };

  const handleCharacterSelect = (character: string) => {
    if (pickerTriggerSource === 'edit-button' && editingCharacterIndex !== null) {
      // Edit mode: replace the character at the selected index
      const targetPalette = ensureCustomPalette();
      const newCharacters = [...targetPalette.characters];
      newCharacters[editingCharacterIndex] = character;
      
      updateCustomPalette(targetPalette.id, { characters: newCharacters });
      setEditingCharacterIndex(null);
      setIsCharacterPickerOpen(false);
      onSettingsChange?.();
    } else {
      // Add mode: add to input field
      if (!activePalette.characters.includes(character)) {
        setNewCharacterInput(character);
        addCharInputRef.current?.focus();
      }
    }
  };

  // Helper function to ensure we're working with a custom palette for editing
  const ensureCustomPalette = (): CharacterPalette => {
    if (activePalette.isCustom) {
      return activePalette;
    } else {
      // Create a duplicate with "Custom" prefix
      const newPalette = duplicatePalette(activePalette.id, `Custom ${activePalette.name}`);
      setActivePalette(newPalette);
      onSettingsChange?.();
      return newPalette;
    }
  };

  const handleRemoveCharacter = (index: number) => {
    if (activePalette.characters.length > 1) {
      const targetPalette = ensureCustomPalette();
      removeCharacterFromPalette(targetPalette.id, index);
      onSettingsChange?.();
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
      onSettingsChange?.();
    }
    
    setDraggedIndex(null);
    setDropIndicatorIndex(null);
  };

  const handleDragLeave = () => {
    setDropIndicatorIndex(null);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between">
        <CollapsibleHeader isOpen={isOpen}>
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-muted-foreground" />
            <span>Character Mapping</span>
          </div>
        </CollapsibleHeader>
        <div className="flex items-center space-x-2 pr-2">
          <Checkbox
            id="enable-character-mapping"
            checked={enableCharacterMapping}
            onCheckedChange={handleToggleEnabled}
          />
          <Label htmlFor="enable-character-mapping" className="text-xs">
            Enable
          </Label>
        </div>
      </div>
      
      <CollapsibleContent className="collapsible-content">
        <div className="space-y-3 w-full">
          {!enableCharacterMapping && (
            <div className="p-3 border border-border/50 rounded-lg bg-muted/20">
              <p className="text-xs text-muted-foreground text-center">
                Character mapping is disabled. Images will be converted using a default character set.
              </p>
            </div>
          )}
          
          {enableCharacterMapping && (
            <>
              {/* Character Palette Editor */}
              <Card className="bg-card/50 border-border/50 overflow-hidden w-full">
            <CardContent className="p-3 space-y-3 w-full">
              
              {/* Header */}
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Character Palette Editor</Label>
              </div>
              {/* Character Palette Selector */}
              <div className="space-y-2 w-full">
                <Label className="text-xs font-medium">Character Palette</Label>
                <div className="flex items-center gap-2 w-full">
                  <div className="flex-1 min-w-0 max-w-[calc(100%-80px)]">
                    <Select value={activePalette.id} onValueChange={handlePaletteChange}>
                      <SelectTrigger className="h-8 text-xs w-full">
                        <div className="truncate">
                          <SelectValue placeholder="Select character palette" />
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
                  <div className="flex items-center gap-1 flex-shrink-0">
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
                <Label className="text-xs font-medium">Characters ({activePalette.characters.length})</Label>
                <div className="bg-background/50 border border-border rounded p-2 min-h-[60px] overflow-auto w-full" onDragLeave={handleDragLeave}>
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
                            } cursor-pointer`}
                          draggable={true}
                          onClick={() => handleSelectCharacter(index)}
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDrop={(e) => handleDrop(e, index)}
                          title={
                            activePalette.isCustom 
                              ? `Character: "${character}" (drag to reorder, click X to remove)`
                              : `Character: "${character}"`
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
                              onClick={(e) => { e.stopPropagation(); handleRemoveCharacter(index); setSelectedIndex(null); onSettingsChange?.(); }}
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

                  {/* Bottom controls: move, add, delete, reverse */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={handleMoveSelectedLeft} disabled={selectedIndex === null || selectedIndex === 0} title="Move left">
                        <ArrowLeft className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={handleMoveSelectedRight} disabled={selectedIndex === null || selectedIndex === activePalette.characters.length - 1} title="Move right">
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                      <Button ref={editButtonRef} size="sm" variant="outline" className="h-8 w-8 p-0" onClick={handleEditCharacters} title="Edit character">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-destructive" onClick={handleDeleteSelected} disabled={selectedIndex === null} title="Delete character">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <div>
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={handleReverseOrder} title="Reverse order">
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Manage Palettes Dialog */}
                  <ManageCharacterPalettesDialog isOpen={isManagePalettesOpen} onOpenChange={setIsManagePalettesOpen} />

                  {/* Character Picker */}
                  <CharacterPicker
                    isOpen={isCharacterPickerOpen}
                    onClose={() => setIsCharacterPickerOpen(false)}
                    onSelectCharacter={handleCharacterSelect}
                    triggerRef={pickerTriggerSource === 'edit-button' ? editButtonRef : characterPickerTriggerRef}
                    anchorPosition={pickerTriggerSource === 'edit-button' ? 'left-bottom-aligned' : 'left-bottom'}
                  />

                </div>
              </div>
              
              {/* Add Character */}
              <div className="space-y-2 w-full">
                <Label className="text-xs font-medium">Add Character</Label>
                <div className="flex gap-2 w-full relative">
                  <Button
                    ref={characterPickerTriggerRef}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (isCharacterPickerOpen && pickerTriggerSource === 'palette-icon') {
                        // If already open from palette button, close it
                        setIsCharacterPickerOpen(false);
                      } else {
                        // Open it from palette button
                        setPickerTriggerSource('palette-icon');
                        setIsCharacterPickerOpen(true);
                      }
                    }}
                    className="h-8 w-8 p-0 flex-shrink-0"
                    title="Character picker"
                  >
                    <Palette className="w-3 h-3" />
                  </Button>
                  <div className="flex flex-1 min-w-0">
                    <Input
                      ref={(el) => { addCharInputRef.current = el; }}
                      value={newCharacterInput}
                      onChange={(e) => setNewCharacterInput(e.target.value)}
                      placeholder="Enter character"
                      className="h-8 text-xs font-mono flex-1 min-w-0 rounded-r-none border-r-0"
                      maxLength={1}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddCharacter();
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddCharacter}
                      disabled={!newCharacterInput.trim() || activePalette.characters.includes(newCharacterInput.trim()[0])}
                      className="h-8 px-3 flex-shrink-0 rounded-l-none"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Palette Info */}
              <div className="bg-muted/30 rounded p-2 text-xs space-y-1 w-full">
                <div className="font-medium break-words">{activePalette.name}</div>
                <div className="text-muted-foreground break-words">
                  {activePalette.characters.length} characters • {activePalette.category.charAt(0).toUpperCase() + activePalette.category.slice(1)} category
                </div>
                {activePalette.isCustom ? (
                  <div className="text-muted-foreground break-words">
                    Custom palette - drag characters to reorder, click reverse to flip mapping
                  </div>
                ) : (
                  <div className="text-muted-foreground break-words">
                    Preset palette - click Edit to create an editable copy
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}