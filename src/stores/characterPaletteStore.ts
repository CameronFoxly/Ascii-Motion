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
import { generateCharacterPaletteId } from '../types/palette';
import { DEFAULT_CHARACTER_PALETTES, MINIMAL_ASCII_PALETTE, createCustomCharacterPalette } from '../constants/defaultCharacterPalettes';

export interface CharacterPaletteState {
  // Available palettes
  availablePalettes: CharacterPalette[];
  customPalettes: CharacterPalette[];
  
  // Active mapping settings
  activePalette: CharacterPalette;
  mappingMethod: CharacterMappingSettings['mappingMethod'];
  mappingMode: 'by-index' | 'noise-dither' | 'bayer2x2' | 'bayer4x4';
  ditherStrength: number;
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
  setMappingMode: (mode: 'by-index' | 'noise-dither' | 'bayer2x2' | 'bayer4x4') => void;
  setDitherStrength: (strength: number) => void;
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

  // Session restore
  loadSessionCharacterPalettes: (payload: {
    customPalettes: CharacterPalette[];
    activePaletteId?: string;
    mappingMethod?: CharacterMappingSettings['mappingMethod'];
    mappingMode?: 'by-index' | 'noise-dither' | 'bayer2x2' | 'bayer4x4';
    ditherStrength?: number;
    invertDensity?: boolean;
    characterSpacing?: number;
  }) => void;
}

export const useCharacterPaletteStore = create<CharacterPaletteState>((set, get) => ({
  // Initial state
  availablePalettes: [...DEFAULT_CHARACTER_PALETTES],
  customPalettes: [],
  activePalette: MINIMAL_ASCII_PALETTE,
  mappingMethod: 'brightness',
  mappingMode: 'by-index',
  ditherStrength: 0.5,
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
  
  setMappingMode: (mode: 'by-index' | 'noise-dither' | 'bayer2x2' | 'bayer4x4') => {
    set({ mappingMode: mode });
  },
  
  setDitherStrength: (strength: number) => {
    set({ ditherStrength: Math.max(0, Math.min(1, strength)) });
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
  
  loadSessionCharacterPalettes: ({ customPalettes, activePaletteId, mappingMethod, mappingMode, ditherStrength, invertDensity, characterSpacing }) => {
    set(state => {
      const sanitizeCharacters = (characters: unknown): string[] => {
        if (!Array.isArray(characters)) {
          return [' '];
        }

        const cleaned = characters
          .map(char => (typeof char === 'string' && char.length > 0 ? char[0] : null))
          .filter((char): char is string => Boolean(char));

        return cleaned.length > 0 ? cleaned : [' '];
      };

      const sanitizedCustomPalettes = Array.isArray(customPalettes)
        ? customPalettes.map((palette, index) => {
            const id = typeof palette?.id === 'string' && palette.id.trim().length > 0
              ? palette.id
              : `${generateCharacterPaletteId()}_${index}`;

            const name = typeof palette?.name === 'string' && palette.name.trim().length > 0
              ? palette.name
              : 'Custom Palette';

            const category = typeof palette?.category === 'string' && ['ascii', 'unicode', 'blocks', 'custom'].includes(palette.category)
              ? palette.category as CharacterPalette['category']
              : 'custom';

            return {
              id,
              name,
              characters: sanitizeCharacters(palette?.characters),
              category,
              isPreset: false,
              isCustom: true
            } as CharacterPalette;
          })
          // Deduplicate by id to avoid duplicates after sanitization
          .filter((palette, index, array) => array.findIndex(item => item.id === palette.id) === index)
        : state.customPalettes;

      const findPaletteById = (id?: string | null): CharacterPalette | undefined => {
        if (!id) return undefined;
        return sanitizedCustomPalettes.find(palette => palette.id === id)
          || state.availablePalettes.find(palette => palette.id === id);
      };

      const resolvedActivePalette = findPaletteById(activePaletteId)
        || (state.activePalette ? findPaletteById(state.activePalette.id) : undefined)
        || state.activePalette
        || MINIMAL_ASCII_PALETTE;

      const validMappingMethods: CharacterMappingSettings['mappingMethod'][] = [
        'brightness',
        'luminance',
        'contrast',
        'edge-detection',
        'saturation',
        'red-channel',
        'green-channel',
        'blue-channel'
      ];

      const resolvedMappingMethod = mappingMethod && validMappingMethods.includes(mappingMethod)
        ? mappingMethod
        : state.mappingMethod;

      const validMappingModes = ['by-index', 'noise-dither', 'bayer2x2', 'bayer4x4'] as const;
      const resolvedMappingMode = mappingMode && validMappingModes.includes(mappingMode)
        ? mappingMode
        : state.mappingMode;

      const resolvedDitherStrength = typeof ditherStrength === 'number'
        ? Math.max(0, Math.min(1, ditherStrength))
        : state.ditherStrength;

      const resolvedInvertDensity = typeof invertDensity === 'boolean' ? invertDensity : state.invertDensity;

      const resolvedCharacterSpacing = typeof characterSpacing === 'number'
        ? Math.max(0.1, Math.min(3.0, characterSpacing))
        : state.characterSpacing;

      return {
        customPalettes: sanitizedCustomPalettes,
        activePalette: resolvedActivePalette,
        mappingMethod: resolvedMappingMethod,
        mappingMode: resolvedMappingMode,
        ditherStrength: resolvedDitherStrength,
        invertDensity: resolvedInvertDensity,
        characterSpacing: resolvedCharacterSpacing,
        isEditing: false,
        editingPaletteId: null
      };
    });
  },
  
  // Utility Actions
  resetToDefaults: () => {
    set({
      availablePalettes: [...DEFAULT_CHARACTER_PALETTES],
      customPalettes: [],
      activePalette: MINIMAL_ASCII_PALETTE,
      mappingMethod: 'brightness',
      mappingMode: 'by-index',
      ditherStrength: 0.5,
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
  mappingMode: state.mappingMode,
  ditherStrength: state.ditherStrength,
  invertDensity: state.invertDensity,
  characterSpacing: state.characterSpacing,
  setMappingMethod: state.setMappingMethod,
  setMappingMode: state.setMappingMode,
  setDitherStrength: state.setDitherStrength,
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