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
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
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
  RotateCcw,
  Edit3,
  Copy,
  Plus,
  Trash2,
  Save,
  X,
  GripVertical,
  ArrowUpDown
} from 'lucide-react';
import { 
  useCharacterPaletteStore 
} from '../../stores/characterPaletteStore';
import { MAPPING_ALGORITHMS } from '../../utils/asciiConverter';

interface CharacterMappingSectionProps {
  onSettingsChange?: () => void; // Callback for triggering preview updates
}

export function CharacterMappingSection({ onSettingsChange }: CharacterMappingSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [newCharacterInput, setNewCharacterInput] = useState('');
  const [editingName, setEditingName] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);

  // Character palette store access
  const availablePalettes = useCharacterPaletteStore(state => state.availablePalettes);
  const customPalettes = useCharacterPaletteStore(state => state.customPalettes);
  const allPalettes = useMemo(() => [...availablePalettes, ...customPalettes], [availablePalettes, customPalettes]);
  const activePalette = useCharacterPaletteStore(state => state.activePalette);
  const setActivePalette = useCharacterPaletteStore(state => state.setActivePalette);
  const mappingMethod = useCharacterPaletteStore(state => state.mappingMethod);
  const setMappingMethod = useCharacterPaletteStore(state => state.setMappingMethod);
  const isEditing = useCharacterPaletteStore(state => state.isEditing);
  const editingPaletteId = useCharacterPaletteStore(state => state.editingPaletteId);
  const startEditing = useCharacterPaletteStore(state => state.startEditing);
  const stopEditing = useCharacterPaletteStore(state => state.stopEditing);
  const addCharacterToPalette = useCharacterPaletteStore(state => state.addCharacterToPalette);
  const removeCharacterFromPalette = useCharacterPaletteStore(state => state.removeCharacterFromPalette);
  const reorderCharactersInPalette = useCharacterPaletteStore(state => state.reorderCharactersInPalette);
  const updateCustomPalette = useCharacterPaletteStore(state => state.updateCustomPalette);
  const createCustomPalette = useCharacterPaletteStore(state => state.createCustomPalette);
  const duplicatePalette = useCharacterPaletteStore(state => state.duplicatePalette);
  const deleteCustomPalette = useCharacterPaletteStore(state => state.deleteCustomPalette);

  // Handle palette selection
  const handlePaletteChange = (paletteId: string) => {
    const selectedPalette = allPalettes.find(p => p.id === paletteId);
    if (selectedPalette) {
      setActivePalette(selectedPalette);
      onSettingsChange?.();
    }
  };

  // Handle mapping method change
  const handleMappingMethodChange = (method: string) => {
    setMappingMethod(method as keyof typeof MAPPING_ALGORITHMS);
    onSettingsChange?.();
  };

  // Handle reverse character order
  const handleReverseOrder = () => {
    if (activePalette.isCustom) {
      const reversedCharacters = [...activePalette.characters].reverse();
      updateCustomPalette(activePalette.id, { characters: reversedCharacters });
      onSettingsChange?.();
    }
  };

  // Reset to defaults
  const handleResetToDefaults = () => {
    const minimalPalette = allPalettes.find(p => p.id === 'minimal-ascii');
    if (minimalPalette) {
      setActivePalette(minimalPalette);
    }
    setMappingMethod('brightness');
    onSettingsChange?.();
  };

  // Character editing handlers
  const handleStartEditing = () => {
    if (!activePalette.isCustom) {
      // Create a copy of preset palette for editing
      const duplicated = duplicatePalette(activePalette.id, `${activePalette.name} (Custom)`);
      setActivePalette(duplicated);
      startEditing(duplicated.id);
      setEditingName(duplicated.name);
    } else {
      startEditing(activePalette.id);
      setEditingName(activePalette.name);
    }
  };

  const handleSaveEditing = () => {
    if (editingPaletteId && editingName.trim()) {
      updateCustomPalette(editingPaletteId, { name: editingName.trim() });
      onSettingsChange?.();
    }
    stopEditing();
  };

  const handleCancelEditing = () => {
    stopEditing();
    setEditingName('');
  };

  const handleAddCharacter = () => {
    if (newCharacterInput.trim() && activePalette.isCustom) {
      const character = newCharacterInput.trim()[0]; // Take only first character
      if (!activePalette.characters.includes(character)) {
        addCharacterToPalette(activePalette.id, character);
        setNewCharacterInput('');
        onSettingsChange?.();
      }
    }
  };

  const handleRemoveCharacter = (index: number) => {
    if (activePalette.isCustom && activePalette.characters.length > 1) {
      removeCharacterFromPalette(activePalette.id, index);
      onSettingsChange?.();
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!activePalette.isCustom) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!activePalette.isCustom || draggedIndex === null) return;
    e.preventDefault();
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const isAfter = mouseX > rect.width / 2;
    
    setDropIndicatorIndex(isAfter ? index + 1 : index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    if (!activePalette.isCustom || draggedIndex === null) return;
    e.preventDefault();
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const isAfter = mouseX > rect.width / 2;
    const actualTargetIndex = isAfter ? index + 1 : index;
    
    if (draggedIndex !== actualTargetIndex && draggedIndex !== actualTargetIndex - 1) {
      reorderCharactersInPalette(activePalette.id, draggedIndex, actualTargetIndex);
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
      <CollapsibleHeader isOpen={isOpen}>
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-muted-foreground" />
          <span>Character Mapping</span>
        </div>
      </CollapsibleHeader>
      
      <CollapsibleContent className="collapsible-content">
        <div className="space-y-3 w-full">
          <Card className="bg-card/50 border-border/50 overflow-hidden w-full">
            <CardContent className="p-3 space-y-3 w-full">
              
              {/* Header with Reset Button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Settings</Label>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetToDefaults}
                  className="h-6 w-6 p-0"
                  title="Reset to defaults"
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </div>

              {/* Character Palette Selector */}
              <div className="space-y-2 w-full">
                <Label className="text-xs font-medium">Character Palette</Label>
                <Select value={activePalette.id} onValueChange={handlePaletteChange}>
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue placeholder="Select character palette" />
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    {/* Group by category */}
                    {['ascii', 'blocks', 'unicode', 'custom'].map(category => {
                      const categoryPalettes = allPalettes.filter(p => p.category === category);
                      if (categoryPalettes.length === 0) return null;
                      
                      return (
                        <div key={category}>
                          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground capitalize border-b">
                            {category === 'ascii' ? 'ASCII' : category === 'unicode' ? 'Unicode' : category.charAt(0).toUpperCase() + category.slice(1)}
                          </div>
                          {categoryPalettes.map(palette => (
                            <SelectItem key={palette.id} value={palette.id} className="text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="truncate flex-1">{palette.name}</span>
                                <span className="text-muted-foreground flex-shrink-0">({palette.characters.length} chars)</span>
                              </div>
                            </SelectItem>
                          ))}
                        </div>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Mapping Algorithm */}
              <div className="space-y-2 w-full">
                <Label className="text-xs font-medium">Mapping Algorithm</Label>
                <Select value={mappingMethod} onValueChange={handleMappingMethodChange}>
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    {Object.entries(MAPPING_ALGORITHMS).map(([key, algorithm]) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        <div className="space-y-1 min-w-0">
                          <div className="font-medium capitalize truncate">{algorithm.name.replace('-', ' ')}</div>
                          <div className="text-muted-foreground text-xs break-words">{algorithm.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </CardContent>
          </Card>

          {/* Character Palette Editor */}
          <Card className="bg-card/50 border-border/50 overflow-hidden w-full">
            <CardHeader className="pb-2 w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="text-sm">
                    {isEditing && editingPaletteId === activePalette.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="h-6 text-sm font-medium"
                          placeholder="Palette name"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEditing();
                            if (e.key === 'Escape') handleCancelEditing();
                          }}
                        />
                        <Button variant="ghost" size="sm" onClick={handleSaveEditing} className="h-6 w-6 p-0">
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleCancelEditing} className="h-6 w-6 p-0">
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>Character Palette Editor</span>
                      </div>
                    )}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  {!isEditing ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={handleStartEditing} className="h-6 w-6 p-0" title="Edit palette">
                        <Edit3 className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => duplicatePalette(activePalette.id)} className="h-6 w-6 p-0" title="Duplicate palette">
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => createCustomPalette('New Palette', ['.', ':', ';', '+', '*', '#', '@'])} className="h-6 w-6 p-0" title="Create new palette">
                        <Plus className="w-3 h-3" />
                      </Button>
                      {activePalette.isCustom && (
                        <Button variant="ghost" size="sm" onClick={() => deleteCustomPalette(activePalette.id)} className="h-6 w-6 p-0 text-destructive" title="Delete palette">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={handleReverseOrder} className="h-6 w-6 p-0" title="Reverse character order" disabled={!activePalette.isCustom}>
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0 space-y-3 w-full">
              {/* Character Grid */}
              <div className="space-y-2 w-full">
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
                            activePalette.isCustom ? 'cursor-move hover:border-primary/50' : 'cursor-default'
                          }`}
                          draggable={activePalette.isCustom}
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
                          {activePalette.isCustom && (
                            <GripVertical className="absolute top-0 right-0 w-2 h-2 text-muted-foreground/50" />
                          )}
                          
                          {/* Remove button */}
                          {activePalette.isCustom && activePalette.characters.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveCharacter(index)}
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

              {/* Add Character (only for custom palettes) */}
              {activePalette.isCustom && (
                <div className="space-y-2 w-full">
                  <Label className="text-xs font-medium">Add Character</Label>
                  <div className="flex gap-2 w-full">
                    <Input
                      value={newCharacterInput}
                      onChange={(e) => setNewCharacterInput(e.target.value)}
                      placeholder="Enter character"
                      className="h-8 text-xs font-mono flex-1 min-w-0"
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
                      className="h-8 px-3"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}

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
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}