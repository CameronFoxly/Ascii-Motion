/**
 * CharacterPaletteStore - Zustand store for managing character palettes
 * 
 * Features:
 * - Character palette CRUD operations
 * - Active palette selection and mapping settings
 * - Session-only storage with future JSON import/export capability
 * - Integration with ASCII conversion system
 */

import { create } from 'zustand';
import type { CharacterPalette, CharacterMappingSettings, CharacterPaletteExportFormat } from '../types/palette';
import { DEFAULT_CHARACTER_PALETTES, MINIMAL_ASCII_PALETTE, createCustomCharacterPalette } from '../constants/defaultCharacterPalettes';

export interface CharacterPaletteState {
  // Available palettes
  availablePalettes: CharacterPalette[];
  customPalettes: CharacterPalette[];
  
  // Active mapping settings
  activePalette: CharacterPalette;
  mappingMethod: CharacterMappingSettings['mappingMethod'];
  invertDensity: boolean;
  characterSpacing: number;
  
  // Editor state
  isEditing: boolean;
  editingPaletteId: string | null;
  
  // Actions - Palette Management
  setActivePalette: (palette: CharacterPalette) => void;
  createCustomPalette: (name: string, characters: string[]) => CharacterPalette;
  updateCustomPalette: (id: string, updates: Partial<CharacterPalette>) => void;
  deleteCustomPalette: (id: string) => void;
  duplicatePalette: (id: string, newName?: string) => CharacterPalette;
  
  // Actions - Mapping Settings
  setMappingMethod: (method: CharacterMappingSettings['mappingMethod']) => void;
  setInvertDensity: (invert: boolean) => void;
  setCharacterSpacing: (spacing: number) => void;
  
  // Actions - Editor State
  startEditing: (paletteId: string) => void;
  stopEditing: () => void;
  
  // Actions - Character Array Management
  addCharacterToPalette: (paletteId: string, character: string, index?: number) => void;
  removeCharacterFromPalette: (paletteId: string, index: number) => void;
  reorderCharactersInPalette: (paletteId: string, fromIndex: number, toIndex: number) => void;
  
  // Actions - Import/Export (Future feature)
  exportPalette: (id: string) => CharacterPaletteExportFormat | null;
  importPalette: (data: CharacterPaletteExportFormat) => CharacterPalette;
  
  // Utility actions
  resetToDefaults: () => void;
  getAllPalettes: () => CharacterPalette[];
  getPaletteById: (id: string) => CharacterPalette | undefined;
}

export const useCharacterPaletteStore = create<CharacterPaletteState>((set, get) => ({
  // Initial state
  availablePalettes: [...DEFAULT_CHARACTER_PALETTES],
  customPalettes: [],
  activePalette: MINIMAL_ASCII_PALETTE,
  mappingMethod: 'brightness',
  invertDensity: false,
  characterSpacing: 1.0,
  isEditing: false,
  editingPaletteId: null,
  
  // Palette Management Actions
  setActivePalette: (palette: CharacterPalette) => {
    set({ activePalette: palette });
  },
  
  createCustomPalette: (name: string, characters: string[]) => {
    const newPalette = createCustomCharacterPalette(name, characters);
    set(state => ({
      customPalettes: [...state.customPalettes, newPalette]
    }));
    return newPalette;
  },
  
  updateCustomPalette: (id: string, updates: Partial<CharacterPalette>) => {
    set(state => ({
      customPalettes: state.customPalettes.map(palette =>
        palette.id === id ? { ...palette, ...updates } : palette
      ),
      // Update active palette if it's the one being updated
      activePalette: state.activePalette.id === id 
        ? { ...state.activePalette, ...updates }
        : state.activePalette
    }));
  },
  
  deleteCustomPalette: (id: string) => {
    set(state => {
      const newCustomPalettes = state.customPalettes.filter(palette => palette.id !== id);
      
      // If we're deleting the active palette, switch to default
      const newActivePalette = state.activePalette.id === id 
        ? MINIMAL_ASCII_PALETTE 
        : state.activePalette;
      
      return {
        customPalettes: newCustomPalettes,
        activePalette: newActivePalette,
        // Stop editing if we're editing the deleted palette
        isEditing: state.editingPaletteId === id ? false : state.isEditing,
        editingPaletteId: state.editingPaletteId === id ? null : state.editingPaletteId
      };
    });
  },
  
  duplicatePalette: (id: string, newName?: string) => {
    const originalPalette = get().getPaletteById(id);
    if (!originalPalette) return originalPalette!;
    
    const duplicatedName = newName || `${originalPalette.name} Copy`;
    const newPalette = createCustomCharacterPalette(duplicatedName, [...originalPalette.characters]);
    
    set(state => ({
      customPalettes: [...state.customPalettes, newPalette]
    }));
    
    return newPalette;
  },
  
  // Mapping Settings Actions
  setMappingMethod: (method: CharacterMappingSettings['mappingMethod']) => {
    set({ mappingMethod: method });
  },
  
  setInvertDensity: (invert: boolean) => {
    set({ invertDensity: invert });
  },
  
  setCharacterSpacing: (spacing: number) => {
    set({ characterSpacing: Math.max(0.1, Math.min(3.0, spacing)) });
  },
  
  // Editor State Actions
  startEditing: (paletteId: string) => {
    set({
      isEditing: true,
      editingPaletteId: paletteId
    });
  },
  
  stopEditing: () => {
    set({
      isEditing: false,
      editingPaletteId: null
    });
  },
  
  // Character Array Management Actions
  addCharacterToPalette: (paletteId: string, character: string, index?: number) => {
    const state = get();
    const palette = state.getPaletteById(paletteId);
    
    if (!palette || !palette.isCustom) return; // Only allow editing custom palettes
    
    const newCharacters = [...palette.characters];
    
    if (index !== undefined && index >= 0 && index <= newCharacters.length) {
      newCharacters.splice(index, 0, character);
    } else {
      newCharacters.push(character);
    }
    
    get().updateCustomPalette(paletteId, { characters: newCharacters });
  },
  
  removeCharacterFromPalette: (paletteId: string, index: number) => {
    const state = get();
    const palette = state.getPaletteById(paletteId);
    
    if (!palette || !palette.isCustom || index < 0 || index >= palette.characters.length) return;
    
    const newCharacters = [...palette.characters];
    newCharacters.splice(index, 1);
    
    // Ensure at least one character remains
    if (newCharacters.length === 0) {
      newCharacters.push(' ');
    }
    
    get().updateCustomPalette(paletteId, { characters: newCharacters });
  },
  
  reorderCharactersInPalette: (paletteId: string, fromIndex: number, toIndex: number) => {
    const state = get();
    const palette = state.getPaletteById(paletteId);
    
    if (!palette || !palette.isCustom) return;
    
    const newCharacters = [...palette.characters];
    const [movedCharacter] = newCharacters.splice(fromIndex, 1);
    newCharacters.splice(toIndex, 0, movedCharacter);
    
    get().updateCustomPalette(paletteId, { characters: newCharacters });
  },
  
  // Import/Export Actions (Future feature)
  exportPalette: (id: string): CharacterPaletteExportFormat | null => {
    const palette = get().getPaletteById(id);
    if (!palette) return null;
    
    return {
      name: palette.name,
      characters: [...palette.characters],
      category: palette.category
    };
  },
  
  importPalette: (data: CharacterPaletteExportFormat): CharacterPalette => {
    const newPalette = createCustomCharacterPalette(data.name, data.characters);
    newPalette.category = data.category;
    
    set(state => ({
      customPalettes: [...state.customPalettes, newPalette]
    }));
    
    return newPalette;
  },
  
  // Utility Actions
  resetToDefaults: () => {
    set({
      availablePalettes: [...DEFAULT_CHARACTER_PALETTES],
      customPalettes: [],
      activePalette: MINIMAL_ASCII_PALETTE,
      mappingMethod: 'brightness',
      invertDensity: false,
      characterSpacing: 1.0,
      isEditing: false,
      editingPaletteId: null
    });
  },
  
  getAllPalettes: (): CharacterPalette[] => {
    const state = get();
    return [...state.availablePalettes, ...state.customPalettes];
  },
  
  getPaletteById: (id: string): CharacterPalette | undefined => {
    const state = get();
    return state.getAllPalettes().find(palette => palette.id === id);
  }
}));

// Convenience hooks for specific store slices
export const useCharacterPalettes = () => useCharacterPaletteStore(state => ({
  available: state.availablePalettes,
  custom: state.customPalettes,
  all: state.getAllPalettes()
}));

export const useActiveCharacterPalette = () => useCharacterPaletteStore(state => ({
  palette: state.activePalette,
  setActivePalette: state.setActivePalette
}));

export const useCharacterMappingSettings = () => useCharacterPaletteStore(state => ({
  mappingMethod: state.mappingMethod,
  invertDensity: state.invertDensity,
  characterSpacing: state.characterSpacing,
  setMappingMethod: state.setMappingMethod,
  setInvertDensity: state.setInvertDensity,
  setCharacterSpacing: state.setCharacterSpacing
}));

export const useCharacterPaletteEditor = () => useCharacterPaletteStore(state => ({
  isEditing: state.isEditing,
  editingPaletteId: state.editingPaletteId,
  startEditing: state.startEditing,
  stopEditing: state.stopEditing,
  addCharacter: state.addCharacterToPalette,
  removeCharacter: state.removeCharacterFromPalette,
  reorderCharacters: state.reorderCharactersInPalette
}));