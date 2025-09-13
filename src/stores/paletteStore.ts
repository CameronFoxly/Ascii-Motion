// Palette store for managing color palettes, active selections, and UI state

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  ColorPalette, 
  PaletteColor, 
  ColorPickerState, 
  DragState,
  PaletteExportFormat 
} from '../types/palette';
import { generateColorId, generatePaletteId } from '../types/palette';
import { DEFAULT_PALETTES, DEFAULT_ACTIVE_PALETTE_ID } from '../constants/defaultPalettes';
import { validatePaletteJSON, sanitizePaletteData } from '../utils/paletteValidation';

interface PaletteStore {
  // Core state
  palettes: ColorPalette[];
  customPalettes: ColorPalette[];
  activePaletteId: string;
  selectedColorId: string | null;
  recentColors: string[];

  // UI state
  colorPickerState: ColorPickerState;
  dragState: DragState;
  isImportDialogOpen: boolean;
  isExportDialogOpen: boolean;

  // Computed getters
  getActivePalette: () => ColorPalette | null;
  getActiveColors: () => PaletteColor[];
  getAllPalettes: () => ColorPalette[];
  getPresetPalettes: () => ColorPalette[];
  getCustomPalettes: () => ColorPalette[];

  // Palette management
  setActivePalette: (paletteId: string) => void;
  createCustomPalette: (name: string, colors?: string[]) => string;
  duplicatePalette: (paletteId: string, newName?: string) => string;
  deletePalette: (paletteId: string) => boolean;
  renamePalette: (paletteId: string, newName: string) => boolean;

  // Color management
  addColor: (paletteId: string, color: string, name?: string) => string;
  removeColor: (paletteId: string, colorId: string) => void;
  updateColor: (paletteId: string, colorId: string, color: string, name?: string) => void;
  reorderColors: (paletteId: string, fromIndex: number, toIndex: number) => void;
  moveColorLeft: (paletteId: string, colorId: string) => void;
  moveColorRight: (paletteId: string, colorId: string) => void;
  
  // Palette management
  createCustomCopy: (paletteId: string) => string | null;

  // Selection management
  setSelectedColor: (colorId: string | null) => void;
  addRecentColor: (color: string) => void;

  // Color picker state
  openColorPicker: (mode: 'foreground' | 'background', currentColor: string) => void;
  closeColorPicker: () => void;
  updatePreviewColor: (color: string) => void;

  // Drag state
  startDrag: (colorId: string, fromIndex: number) => void;
  updateDragTarget: (targetIndex: number | null) => void;
  endDrag: () => void;

  // Import/Export
  setImportDialogOpen: (open: boolean) => void;
  setExportDialogOpen: (open: boolean) => void;
  exportPalette: (paletteId: string) => PaletteExportFormat | null;
  importPalette: (jsonString: string) => { success: boolean; message: string; paletteId?: string };

  // Initialization
  initialize: () => void;
  reset: () => void;
  clearStorage: () => void;
}

const initialColorPickerState: ColorPickerState = {
  isOpen: false,
  mode: 'foreground',
  currentColor: '#000000',
  previewColor: '#000000',
  recentColors: []
};

const initialDragState: DragState = {
  isDragging: false,
  draggedColorId: null,
  draggedFromIndex: null,
  dropTargetIndex: null
};

export const usePaletteStore = create<PaletteStore>()(
  persist(
    (set, get) => ({
      // Initial state
      palettes: DEFAULT_PALETTES, // Always start with default palettes
      customPalettes: [],
      activePaletteId: DEFAULT_ACTIVE_PALETTE_ID,
      selectedColorId: null,
      recentColors: [],
      colorPickerState: initialColorPickerState,
      dragState: initialDragState,
      isImportDialogOpen: false,
      isExportDialogOpen: false,

      // Computed getters
      getActivePalette: () => {
        const { palettes, customPalettes, activePaletteId } = get();
        const allPalettes = [...palettes, ...customPalettes];
        return allPalettes.find(palette => palette.id === activePaletteId) || null;
      },

      getActiveColors: () => {
        const activePalette = get().getActivePalette();
        return activePalette?.colors || [];
      },

      getAllPalettes: () => {
        const { palettes, customPalettes } = get();
        return [...palettes, ...customPalettes];
      },

      getPresetPalettes: () => {
        return get().palettes;
      },

      getCustomPalettes: () => {
        return get().customPalettes;
      },

      // Palette management
      setActivePalette: (paletteId: string) => {
        set({ activePaletteId: paletteId, selectedColorId: null });
      },

      createCustomPalette: (name: string, colors: string[] = ['#000000']) => {
        const paletteId = generatePaletteId();
        const paletteColors: PaletteColor[] = colors.map(color => ({
          id: generateColorId(),
          value: color,
          name: undefined
        }));

        const newPalette: ColorPalette = {
          id: paletteId,
          name: name,
          colors: paletteColors,
          isPreset: false,
          isCustom: true
        };

        set(state => ({
          customPalettes: [...state.customPalettes, newPalette],
          activePaletteId: paletteId
        }));

        return paletteId;
      },

      duplicatePalette: (paletteId: string, newName?: string) => {
        const allPalettes = get().getAllPalettes();
        const sourcePalette = allPalettes.find(p => p.id === paletteId);
        
        if (!sourcePalette) return '';

        const name = newName || `${sourcePalette.name} Copy`;
        const colors = sourcePalette.colors.map(color => color.value);
        
        return get().createCustomPalette(name, colors);
      },

      deletePalette: (paletteId: string) => {
        const customPalettes = get().customPalettes;
        const paletteExists = customPalettes.some(p => p.id === paletteId);
        
        if (!paletteExists) return false;

        set(state => {
          const updatedCustomPalettes = state.customPalettes.filter(p => p.id !== paletteId);
          const newActivePaletteId = state.activePaletteId === paletteId 
            ? DEFAULT_ACTIVE_PALETTE_ID 
            : state.activePaletteId;

          return {
            customPalettes: updatedCustomPalettes,
            activePaletteId: newActivePaletteId,
            selectedColorId: state.activePaletteId === paletteId ? null : state.selectedColorId
          };
        });

        return true;
      },

      renamePalette: (paletteId: string, newName: string) => {
        set(state => ({
          customPalettes: state.customPalettes.map(palette =>
            palette.id === paletteId ? { ...palette, name: newName } : palette
          )
        }));
        return true;
      },

      // Palette management
      createCustomCopy: (paletteId: string) => {
        const { palettes, customPalettes } = get();
        const allPalettes = [...palettes, ...customPalettes];
        const sourcePalette = allPalettes.find(p => p.id === paletteId);
        
        if (!sourcePalette) return null;

        // Generate unique name
        const baseName = `${sourcePalette.name} (Custom)`;
        let customName = baseName;
        let counter = 1;
        
        while (allPalettes.some(p => p.name === customName)) {
          customName = `${baseName} ${counter}`;
          counter++;
        }

        // Create custom copy
        const newPaletteId = generatePaletteId();
        const newPalette: ColorPalette = {
          id: newPaletteId,
          name: customName,
          colors: sourcePalette.colors.map(color => ({
            ...color,
            id: generateColorId() // Generate new IDs for colors
          })),
          isCustom: true,
          isPreset: false
        };

        set(state => ({
          customPalettes: [...state.customPalettes, newPalette],
          activePaletteId: newPaletteId // Switch to the new custom palette
        }));

        return newPaletteId;
      },

      // Color management
      addColor: (paletteId: string, color: string, name?: string) => {
        const { palettes, createCustomCopy } = get();
        
        // Check if this is a preset palette
        const isPresetPalette = palettes.some(p => p.id === paletteId);
        let targetPaletteId = paletteId;
        
        if (isPresetPalette) {
          // Create custom copy first
          const newPaletteId = createCustomCopy(paletteId);
          if (!newPaletteId) return '';
          targetPaletteId = newPaletteId;
        }

        const colorId = generateColorId();
        const newColor: PaletteColor = { id: colorId, value: color, name };

        set(state => ({
          customPalettes: state.customPalettes.map(palette =>
            palette.id === targetPaletteId 
              ? { ...palette, colors: [...palette.colors, newColor] }
              : palette
          )
        }));

        return colorId;
      },

      removeColor: (paletteId: string, colorId: string) => {
        const { palettes, createCustomCopy } = get();
        
        // Check if this is a preset palette
        const isPresetPalette = palettes.some(p => p.id === paletteId);
        let targetPaletteId = paletteId;
        
        if (isPresetPalette) {
          // Create custom copy first
          const newPaletteId = createCustomCopy(paletteId);
          if (!newPaletteId) return;
          targetPaletteId = newPaletteId;
        }

        set(state => {
          const updatedCustomPalettes = state.customPalettes.map(palette => {
            if (palette.id === targetPaletteId) {
              const updatedColors = palette.colors.filter(color => color.id !== colorId);
              // Don't allow removing the last color
              if (updatedColors.length === 0) return palette;
              return { ...palette, colors: updatedColors };
            }
            return palette;
          });

          return {
            customPalettes: updatedCustomPalettes,
            selectedColorId: state.selectedColorId === colorId ? null : state.selectedColorId
          };
        });
      },

      updateColor: (paletteId: string, colorId: string, color: string, name?: string) => {
        const { palettes, createCustomCopy } = get();
        
        // Check if this is a preset palette
        const isPresetPalette = palettes.some(p => p.id === paletteId);
        
        if (isPresetPalette) {
          // Create custom copy and update the color in the new palette
          const newPaletteId = createCustomCopy(paletteId);
          if (!newPaletteId) return false;
          
          // Find the corresponding color in the new custom palette
          const { customPalettes } = get();
          const newPalette = customPalettes.find(p => p.id === newPaletteId);
          if (!newPalette) return false;
          
          // Find color by value since IDs changed
          const originalColor = palettes.find(p => p.id === paletteId)?.colors.find(c => c.id === colorId);
          if (!originalColor) return false;
          
          const newColorId = newPalette.colors.find(c => c.value === originalColor.value)?.id;
          if (!newColorId) return false;
          
          // Update the color in the new custom palette
          set(state => ({
            customPalettes: state.customPalettes.map(palette =>
              palette.id === newPaletteId 
                ? {
                    ...palette,
                    colors: palette.colors.map(c =>
                      c.id === newColorId ? { ...c, value: color, name } : c
                    )
                  }
                : palette
            )
          }));
        } else {
          // Update custom palette directly
          set(state => ({
            customPalettes: state.customPalettes.map(palette =>
              palette.id === paletteId 
                ? {
                    ...palette,
                    colors: palette.colors.map(c =>
                      c.id === colorId ? { ...c, value: color, name } : c
                    )
                  }
                : palette
            )
          }));
        }

        return true;
      },

      reorderColors: (paletteId: string, fromIndex: number, toIndex: number) => {
        const { palettes, createCustomCopy } = get();
        
        // Check if this is a preset palette
        const isPresetPalette = palettes.some(p => p.id === paletteId);
        let targetPaletteId = paletteId;
        
        if (isPresetPalette) {
          // Create custom copy first
          const newPaletteId = createCustomCopy(paletteId);
          if (!newPaletteId) return;
          targetPaletteId = newPaletteId;
        }

        set(state => ({
          customPalettes: state.customPalettes.map(palette => {
            if (palette.id === targetPaletteId) {
              const colors = [...palette.colors];
              const [movedColor] = colors.splice(fromIndex, 1);
              colors.splice(toIndex, 0, movedColor);
              return { ...palette, colors };
            }
            return palette;
          })
        }));
      },

      moveColorLeft: (paletteId: string, colorId: string) => {
        const palette = get().getAllPalettes().find(p => p.id === paletteId);
        if (!palette) return;

        const colorIndex = palette.colors.findIndex(c => c.id === colorId);
        if (colorIndex <= 0) return;

        get().reorderColors(paletteId, colorIndex, colorIndex - 1);
      },

      moveColorRight: (paletteId: string, colorId: string) => {
        const palette = get().getAllPalettes().find(p => p.id === paletteId);
        if (!palette) return;

        const colorIndex = palette.colors.findIndex(c => c.id === colorId);
        if (colorIndex === -1 || colorIndex >= palette.colors.length - 1) return;

        get().reorderColors(paletteId, colorIndex, colorIndex + 1);
      },

      // Selection management
      setSelectedColor: (colorId: string | null) => {
        set({ selectedColorId: colorId });
      },

      addRecentColor: (color: string) => {
        set(state => {
          const recentColors = [color, ...state.recentColors.filter(c => c !== color)].slice(0, 16);
          return { recentColors };
        });
      },

      // Color picker state
      openColorPicker: (mode: 'foreground' | 'background', currentColor: string) => {
        set({
          colorPickerState: {
            isOpen: true,
            mode,
            currentColor,
            previewColor: currentColor,
            recentColors: get().recentColors
          }
        });
      },

      closeColorPicker: () => {
        set({
          colorPickerState: initialColorPickerState
        });
      },

      updatePreviewColor: (color: string) => {
        set(state => ({
          colorPickerState: {
            ...state.colorPickerState,
            previewColor: color
          }
        }));
      },

      // Drag state
      startDrag: (colorId: string, fromIndex: number) => {
        set({
          dragState: {
            isDragging: true,
            draggedColorId: colorId,
            draggedFromIndex: fromIndex,
            dropTargetIndex: null
          }
        });
      },

      updateDragTarget: (targetIndex: number | null) => {
        set(state => ({
          dragState: {
            ...state.dragState,
            dropTargetIndex: targetIndex
          }
        }));
      },

      endDrag: () => {
        set({ dragState: initialDragState });
      },

      // Import/Export dialogs
      setImportDialogOpen: (open: boolean) => {
        set({ isImportDialogOpen: open });
      },

      setExportDialogOpen: (open: boolean) => {
        set({ isExportDialogOpen: open });
      },

      // Export palette
      exportPalette: (paletteId: string) => {
        const palette = get().getAllPalettes().find(p => p.id === paletteId);
        if (!palette) return null;

        return {
          name: palette.name,
          colors: palette.colors.map(color => color.value)
        };
      },

      // Import palette
      importPalette: (jsonString: string) => {
        const validation = validatePaletteJSON(jsonString);
        
        if (!validation.isValid || !validation.data) {
          return {
            success: false,
            message: validation.errors.join(', ')
          };
        }

        const sanitizedData = sanitizePaletteData(validation.data);
        const paletteId = get().createCustomPalette(sanitizedData.name, sanitizedData.colors);

        return {
          success: true,
          message: `Successfully imported "${sanitizedData.name}" with ${sanitizedData.colors.length} colors.`,
          paletteId
        };
      },

      // Initialization
      initialize: () => {
        set({
          palettes: DEFAULT_PALETTES,
          activePaletteId: DEFAULT_ACTIVE_PALETTE_ID
        });
      },

      reset: () => {
        set({
          palettes: DEFAULT_PALETTES,
          customPalettes: [],
          activePaletteId: DEFAULT_ACTIVE_PALETTE_ID,
          selectedColorId: null,
          recentColors: [],
          colorPickerState: initialColorPickerState,
          dragState: initialDragState,
          isImportDialogOpen: false,
          isExportDialogOpen: false
        });
      },

      // Debug function to clear localStorage
      clearStorage: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('ascii-motion-palette-store');
          window.location.reload();
        }
      }
    }),
    {
      name: 'ascii-motion-palette-store',
      partialize: (state) => ({
        customPalettes: state.customPalettes,
        activePaletteId: state.activePaletteId,
        recentColors: state.recentColors
      })
    }
  )
);