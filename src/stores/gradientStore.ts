import { create } from 'zustand';
import type { 
  GradientDefinition, 
  GradientProperty, 
  GradientStop, 
  Cell 
} from '../types';

interface GradientStore {
  // Panel state
  isOpen: boolean;
  
  // Current gradient configuration
  definition: GradientDefinition;
  
  // Interactive application state
  isApplying: boolean;
  startPoint: { x: number; y: number } | null;
  endPoint: { x: number; y: number } | null;
  previewData: Map<string, Cell> | null;
  
  // Fill area configuration
  contiguous: boolean;
  matchChar: boolean;
  matchColor: boolean;
  matchBgColor: boolean;
  
  // Actions
  setIsOpen: (open: boolean) => void;
  updateDefinition: (definition: Partial<GradientDefinition>) => void;
  updateProperty: (
    property: 'character' | 'textColor' | 'backgroundColor', 
    update: Partial<GradientProperty>
  ) => void;
  addStop: (property: 'character' | 'textColor' | 'backgroundColor') => void;
  removeStop: (property: 'character' | 'textColor' | 'backgroundColor', index: number) => void;
  updateStop: (
    property: 'character' | 'textColor' | 'backgroundColor', 
    index: number, 
    update: Partial<GradientStop>
  ) => void;
  
  // Application state
  setApplying: (isApplying: boolean) => void;
  setPoints: (start: { x: number; y: number } | null, end: { x: number; y: number } | null) => void;
  setPreview: (previewData: Map<string, Cell> | null) => void;
  
  // Fill configuration
  setContiguous: (contiguous: boolean) => void;
  setMatchCriteria: (criteria: { char: boolean; color: boolean; bgColor: boolean }) => void;
  
  // Utility
  reset: () => void;
}

// Default gradient property
const createDefaultProperty = (enabled: boolean, defaultValue: string, secondValue: string): GradientProperty => ({
  enabled,
  stops: enabled ? [
    { position: 0, value: defaultValue },
    { position: 1, value: secondValue }
  ] : [],
  interpolation: 'linear'
});

// Default gradient definition
const createDefaultDefinition = (): GradientDefinition => ({
  type: 'linear',
  character: createDefaultProperty(true, '#', '@'),
  textColor: createDefaultProperty(true, '#FFFFFF', '#FFFFFF'),
  backgroundColor: createDefaultProperty(true, '#808080', '#FFFFFF') // Default mid grey and white
});

export const useGradientStore = create<GradientStore>((set, get) => ({
  // Initial state
  isOpen: false,
  definition: createDefaultDefinition(),
  isApplying: false,
  startPoint: null,
  endPoint: null,
  previewData: null,
  contiguous: true,
  matchChar: true,
  matchColor: true,
  matchBgColor: true,

  // Panel actions
  setIsOpen: (open: boolean) => {
    set({ isOpen: open });
  },

  // Definition actions
  updateDefinition: (update: Partial<GradientDefinition>) => {
    set((state) => ({
      definition: { ...state.definition, ...update }
    }));
  },

  updateProperty: (property: 'character' | 'textColor' | 'backgroundColor', update: Partial<GradientProperty>) => {
    set((state) => ({
      definition: {
        ...state.definition,
        [property]: { ...state.definition[property], ...update }
      }
    }));
  },

  addStop: (property: 'character' | 'textColor' | 'backgroundColor') => {
    const state = get();
    const currentProperty = state.definition[property];
    
    if (currentProperty.stops.length >= 8) return; // Maximum 8 stops
    
    // Find a good position for the new stop (middle of largest gap)
    const stops = [...currentProperty.stops].sort((a, b) => a.position - b.position);
    let newPosition = 0.5;
    let maxGap = 0;
    
    for (let i = 0; i < stops.length - 1; i++) {
      const gap = stops[i + 1].position - stops[i].position;
      if (gap > maxGap) {
        maxGap = gap;
        newPosition = (stops[i].position + stops[i + 1].position) / 2;
      }
    }
    
    // Default value based on property type
    let defaultValue = '';
    switch (property) {
      case 'character':
        defaultValue = '*';
        break;
      case 'textColor':
        defaultValue = '#808080'; // Mid grey
        break;
      case 'backgroundColor':
        defaultValue = '#C0C0C0'; // Light grey
        break;
    }
    
    const newStop: GradientStop = { position: newPosition, value: defaultValue };
    
    set((state) => ({
      definition: {
        ...state.definition,
        [property]: {
          ...state.definition[property],
          stops: [...state.definition[property].stops, newStop]
        }
      }
    }));
  },

  removeStop: (property: 'character' | 'textColor' | 'backgroundColor', index: number) => {
    const state = get();
    const currentProperty = state.definition[property];
    
    if (currentProperty.stops.length <= 2) return; // Minimum 2 stops
    
    set((state) => ({
      definition: {
        ...state.definition,
        [property]: {
          ...state.definition[property],
          stops: state.definition[property].stops.filter((_, i) => i !== index)
        }
      }
    }));
  },

  updateStop: (
    property: 'character' | 'textColor' | 'backgroundColor', 
    index: number, 
    update: Partial<GradientStop>
  ) => {
    set((state) => ({
      definition: {
        ...state.definition,
        [property]: {
          ...state.definition[property],
          stops: state.definition[property].stops.map((stop, i) => 
            i === index ? { ...stop, ...update } : stop
          )
        }
      }
    }));
  },

  // Application state actions
  setApplying: (isApplying: boolean) => {
    set({ isApplying });
    if (!isApplying) {
      // Reset interactive state when not applying
      set({ startPoint: null, endPoint: null, previewData: null });
    }
  },

  setPoints: (start: { x: number; y: number } | null, end: { x: number; y: number } | null) => {
    set({ startPoint: start, endPoint: end });
  },

  setPreview: (previewData: Map<string, Cell> | null) => {
    set({ previewData });
  },

  // Fill configuration actions
  setContiguous: (contiguous: boolean) => {
    set({ contiguous });
  },

  setMatchCriteria: (criteria: { char: boolean; color: boolean; bgColor: boolean }) => {
    set({ 
      matchChar: criteria.char, 
      matchColor: criteria.color, 
      matchBgColor: criteria.bgColor 
    });
  },

  // Utility actions
  reset: () => {
    set({
      isApplying: false,
      startPoint: null,
      endPoint: null,
      previewData: null
    });
  }
}));

// Helper function to initialize gradient with current tool values
export const initializeGradientWithCurrentValues = (
  selectedChar: string, 
  selectedColor: string, 
  selectedBgColor: string
) => {
  const { updateProperty } = useGradientStore.getState();
  
  // Initialize character gradient
  updateProperty('character', {
    enabled: true,
    stops: [
      { position: 0, value: selectedChar },
      { position: 1, value: '@' }
    ]
  });
  
  // Initialize text color gradient
  updateProperty('textColor', {
    enabled: true,
    stops: [
      { position: 0, value: selectedColor },
      { position: 1, value: '#FFFFFF' }
    ]
  });
  
  // Initialize background color gradient (handle transparent case)
  const bgStartValue = selectedBgColor === 'transparent' ? '#808080' : selectedBgColor;
  updateProperty('backgroundColor', {
    enabled: true,
    stops: [
      { position: 0, value: bgStartValue },
      { position: 1, value: '#FFFFFF' }
    ]
  });
};