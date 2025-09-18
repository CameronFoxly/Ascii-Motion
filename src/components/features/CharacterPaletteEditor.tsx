/**
 * CharacterPaletteEditor - Inline editor for character palettes with drag-and-drop reordering
 * 
 * Features:
 * - Visual character editing with drag-and-drop reordering
 * - Add/remove characters with UI buttons
 * - Real-time density preview
 * - Custom palette creation and management
 * - Follows existing sidepanel palette control patterns
 */

import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Plus, 
  Edit3, 
  Save, 
  X, 
  Copy, 
  Trash2,
  GripVertical,
  Type
} from 'lucide-react';
import { 
  useCharacterPaletteStore 
} from '../../stores/characterPaletteStore';

interface CharacterPaletteEditorProps {
  onPaletteChange?: () => void; // Callback for triggering preview updates
}

export function CharacterPaletteEditor({ onPaletteChange }: CharacterPaletteEditorProps) {
  const activePalette = useCharacterPaletteStore(state => state.activePalette);
  const setActivePalette = useCharacterPaletteStore(state => state.setActivePalette);
  const isEditing = useCharacterPaletteStore(state => state.isEditing);
  const editingPaletteId = useCharacterPaletteStore(state => state.editingPaletteId);
  const startEditing = useCharacterPaletteStore(state => state.startEditing);
  const stopEditing = useCharacterPaletteStore(state => state.stopEditing);
  const addCharacterToPalette = useCharacterPaletteStore(state => state.addCharacterToPalette);
  const removeCharacterFromPalette = useCharacterPaletteStore(state => state.removeCharacterFromPalette);
  const reorderCharactersInPalette = useCharacterPaletteStore(state => state.reorderCharactersInPalette);
  
  const { 
    createCustomPalette, 
    updateCustomPalette,
    deleteCustomPalette,
    duplicatePalette
  } = useCharacterPaletteStore();

  // Local state
  const [newCharacterInput, setNewCharacterInput] = useState('');
  const [editingName, setEditingName] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);

  // Start editing the active palette
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

  // Save editing changes
  const handleSaveEditing = () => {
    if (editingPaletteId && editingName.trim()) {
      updateCustomPalette(editingPaletteId, { name: editingName.trim() });
      onPaletteChange?.();
    }
    stopEditing();
  };

  // Cancel editing
  const handleCancelEditing = () => {
    stopEditing();
    setEditingName('');
  };

  // Add new character
  const handleAddCharacter = () => {
    if (newCharacterInput.trim() && activePalette.isCustom) {
      const character = newCharacterInput.trim()[0]; // Take only first character
      if (!activePalette.characters.includes(character)) {
        addCharacterToPalette(activePalette.id, character);
        setNewCharacterInput('');
        onPaletteChange?.();
      }
    }
  };

  // Remove character
  const handleRemoveCharacter = (index: number) => {
    if (activePalette.isCustom && activePalette.characters.length > 1) {
      removeCharacterFromPalette(activePalette.id, index);
      onPaletteChange?.();
    }
  };

  // Create new custom palette
  const handleCreateNewPalette = () => {
    const newPalette = createCustomPalette('New Palette', [' ', '.', ':', ';', '+', '*', '#', '@']);
    setActivePalette(newPalette);
    startEditing(newPalette.id);
    setEditingName(newPalette.name);
    onPaletteChange?.();
  };

  // Delete current palette
  const handleDeletePalette = () => {
    if (activePalette.isCustom && confirm(`Delete palette "${activePalette.name}"?`)) {
      deleteCustomPalette(activePalette.id);
      onPaletteChange?.();
    }
  };

  // Duplicate current palette
  const handleDuplicatePalette = () => {
    const duplicated = duplicatePalette(activePalette.id, `${activePalette.name} Copy`);
    setActivePalette(duplicated);
    onPaletteChange?.();
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!activePalette.isCustom) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetIndex?: number) => {
    if (!activePalette.isCustom || draggedIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (targetIndex !== undefined) {
      // Determine if we should show indicator before or after based on mouse position
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const isAfter = mouseX > rect.width / 2;
      setDropIndicatorIndex(isAfter ? targetIndex + 1 : targetIndex);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!activePalette.isCustom || draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDropIndicatorIndex(null);
      return;
    }

    // Determine actual drop position based on indicator
    let actualTargetIndex = targetIndex;
    if (dropIndicatorIndex !== null) {
      actualTargetIndex = dropIndicatorIndex;
      if (actualTargetIndex > draggedIndex) {
        actualTargetIndex -= 1; // Adjust for the removed source item
      }
    }

    reorderCharactersInPalette(activePalette.id, draggedIndex, actualTargetIndex);
    setDraggedIndex(null);
    setDropIndicatorIndex(null);
    onPaletteChange?.();
  };

  const handleDragLeave = () => {
    setDropIndicatorIndex(null);
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
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
                  <Badge variant={activePalette.isCustom ? "default" : "secondary"} className="text-xs">
                    {activePalette.isCustom ? 'Custom' : 'Preset'}
                  </Badge>
                </div>
              )}
            </CardTitle>
          </div>
          
          <div className="flex items-center gap-1">
            {!isEditing && (
              <>
                <Button variant="ghost" size="sm" onClick={handleStartEditing} className="h-6 w-6 p-0" title="Edit palette">
                  <Edit3 className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDuplicatePalette} className="h-6 w-6 p-0" title="Duplicate palette">
                  <Copy className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCreateNewPalette} className="h-6 w-6 p-0" title="Create new palette">
                  <Plus className="w-3 h-3" />
                </Button>
                {activePalette.isCustom && (
                  <Button variant="ghost" size="sm" onClick={handleDeletePalette} className="h-6 w-6 p-0 text-destructive" title="Delete palette">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Character Grid */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Characters ({activePalette.characters.length})</Label>
          <div className="bg-background/50 border border-border rounded p-2 min-h-[60px]" onDragLeave={handleDragLeave}>
            <div className="flex flex-wrap gap-1 relative">
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
          <div className="space-y-2">
            <Label className="text-xs font-medium">Add Character</Label>
            <div className="flex gap-2">
              <Input
                value={newCharacterInput}
                onChange={(e) => setNewCharacterInput(e.target.value)}
                placeholder="Enter character"
                className="h-8 text-xs font-mono"
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
            <div className="text-xs text-muted-foreground">
              Type a single character and press Enter or click + to add
            </div>
          </div>
        )}

        {/* Palette Info */}
        <div className="bg-muted/30 rounded p-2 text-xs space-y-1">
          <div className="font-medium">{activePalette.name}</div>
          <div className="text-muted-foreground">
            {activePalette.characters.length} characters • {activePalette.category.charAt(0).toUpperCase() + activePalette.category.slice(1)} category
          </div>
          {activePalette.isCustom ? (
            <div className="text-muted-foreground">
              Custom palette - drag characters to reorder, click X to remove
            </div>
          ) : (
            <div className="text-muted-foreground">
              Preset palette - click Edit to create an editable copy
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}