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
  hoverEndPoint: { x: number; y: number } | null;
  previewData: Map<string, Cell> | null;
  
  // Fill area configuration
  contiguous: boolean;
  matchChar: boolean;
  matchColor: boolean;
  matchBgColor: boolean;
  
  // Drag state for interactive controls
  dragState: {
    isDragging: boolean;
    dragType: 'start' | 'end' | 'stop';
    dragData?: {
      property?: 'character' | 'textColor' | 'backgroundColor';
      stopIndex?: number;
    };
    startMousePos?: { x: number; y: number };
    startValue?: { x: number; y: number } | number; // position for start/end, position value for stops
  } | null;
  
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
  sortStops: (property: 'character' | 'textColor' | 'backgroundColor') => void;
  
  // Application state
  setApplying: (isApplying: boolean) => void;
  setPoints: (start: { x: number; y: number } | null, end: { x: number; y: number } | null) => void;
  setHoverEndPoint: (point: { x: number; y: number } | null) => void;
  setPreview: (previewData: Map<string, Cell> | null) => void;
  
  // Fill configuration
  setContiguous: (contiguous: boolean) => void;
  setMatchCriteria: (criteria: { char: boolean; color: boolean; bgColor: boolean }) => void;
  
  // Drag actions
  startDrag: (
    dragType: 'start' | 'end' | 'stop',
    mousePos: { x: number; y: number },
    dragData?: { property?: 'character' | 'textColor' | 'backgroundColor'; stopIndex?: number }
  ) => void;
  updateDrag: (mousePos: { x: number; y: number }, canvasContext?: { 
    cellWidth: number; 
    cellHeight: number; 
    zoom: number; 
    panOffset: { x: number; y: number };
  }) => void;
  endDrag: () => void;
  
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
  interpolation: 'linear',
  ditherStrength: 50 // Default to 50% strength for balanced dithering
});

// Default gradient definition
const createDefaultDefinition = (): GradientDefinition => ({
  type: 'linear',
  character: createDefaultProperty(true, '#', '*'),
  textColor: createDefaultProperty(true, '#FFFFFF', '#FFFFFF'),
  backgroundColor: createDefaultProperty(false, '#808080', '#FFFFFF') // Default mid grey and white, disabled by default
});

export const useGradientStore = create<GradientStore>((set, get) => ({
  // Initial state
  isOpen: false,
  definition: createDefaultDefinition(),
  isApplying: false,
  startPoint: null,
  endPoint: null,
  hoverEndPoint: null,
  previewData: null,
  contiguous: true,
  matchChar: true,
  matchColor: true,
  matchBgColor: true,
  dragState: null,

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
          stops: [...state.definition[property].stops, newStop].sort((a, b) => a.position - b.position)
        }
      }
    }));
  },

  removeStop: (property: 'character' | 'textColor' | 'backgroundColor', index: number) => {
    const state = get();
    const currentProperty = state.definition[property];
    
    if (currentProperty.stops.length <= 1) return; // Minimum 1 stop
    
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

  sortStops: (property: 'character' | 'textColor' | 'backgroundColor') => {
    set((state) => {
      const propertyState = state.definition[property];
      const sortedStops = [...propertyState.stops].sort((a, b) => a.position - b.position);
      return {
        definition: {
          ...state.definition,
          [property]: {
            ...propertyState,
            stops: sortedStops
          }
        }
      };
    });
  },

  // Application state actions
  setApplying: (isApplying: boolean) => {
    set({ isApplying });
    if (!isApplying) {
      // Reset interactive state when not applying
      set({ startPoint: null, endPoint: null, hoverEndPoint: null, previewData: null });
    }
  },

  setPoints: (start: { x: number; y: number } | null, end: { x: number; y: number } | null) => {
    set({ startPoint: start, endPoint: end });
    if (end) {
      set({ hoverEndPoint: null });
    }
  },

  setHoverEndPoint: (point: { x: number; y: number } | null) => {
    set({ hoverEndPoint: point });
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

  // Drag actions
  startDrag: (
    dragType: 'start' | 'end' | 'stop',
    mousePos: { x: number; y: number },
    dragData?: { property?: 'character' | 'textColor' | 'backgroundColor'; stopIndex?: number }
  ) => {
    const state = get();
    let startValue: { x: number; y: number } | number | undefined;
    
    if (dragType === 'start' && state.startPoint) {
      startValue = { ...state.startPoint };
    } else if (dragType === 'end' && state.endPoint) {
      startValue = { ...state.endPoint };
    } else if (dragType === 'stop' && dragData?.property && dragData.stopIndex !== undefined) {
      const stops = state.definition[dragData.property].stops;
      if (stops[dragData.stopIndex]) {
        startValue = stops[dragData.stopIndex].position;
      }
    }
    
    set({
      dragState: {
        isDragging: true,
        dragType,
        dragData,
        startMousePos: { ...mousePos },
        startValue
      }
    });
  },

  updateDrag: (mousePos: { x: number; y: number }, canvasContext?: { 
    cellWidth: number; 
    cellHeight: number; 
    zoom: number; 
    panOffset: { x: number; y: number };
  }) => {
    const state = get();
    if (!state.dragState || !state.dragState.isDragging) return;
    
    const { dragType, dragData, startMousePos, startValue } = state.dragState;
    if (!startMousePos || startValue === undefined) return;
    
    if (dragType === 'start' || dragType === 'end') {
      if (typeof startValue === 'object' && canvasContext) {
        // Convert mouse delta to grid delta
        const deltaX = mousePos.x - startMousePos.x;
        const deltaY = mousePos.y - startMousePos.y;
        
        const effectiveCellWidth = canvasContext.cellWidth * canvasContext.zoom;
        const effectiveCellHeight = canvasContext.cellHeight * canvasContext.zoom;
        
        const gridDeltaX = Math.round(deltaX / effectiveCellWidth);
        const gridDeltaY = Math.round(deltaY / effectiveCellHeight);
        
        const newPoint = {
          x: Math.max(0, startValue.x + gridDeltaX),
          y: Math.max(0, startValue.y + gridDeltaY)
        };
        
        if (dragType === 'start') {
          set({ startPoint: newPoint });
        } else if (dragType === 'end') {
          set({ endPoint: newPoint });
        }
      }
    } else if (dragType === 'stop' && dragData?.property && dragData.stopIndex !== undefined) {
      // Calculate new stop position along the gradient line
      if (state.startPoint && state.endPoint && typeof startValue === 'number') {
        const lineLength = Math.sqrt(
          Math.pow(state.endPoint.x - state.startPoint.x, 2) + 
          Math.pow(state.endPoint.y - state.startPoint.y, 2)
        );
        
        if (lineLength > 0 && canvasContext) {
          // Project mouse movement onto the gradient line
          const deltaX = mousePos.x - startMousePos.x;
          const deltaY = mousePos.y - startMousePos.y;
          
          const effectiveCellWidth = canvasContext.cellWidth * canvasContext.zoom;
          
          const lineAngle = Math.atan2(state.endPoint.y - state.startPoint.y, state.endPoint.x - state.startPoint.x);
          const projectedDelta = deltaX * Math.cos(lineAngle) + deltaY * Math.sin(lineAngle);
          const positionDelta = projectedDelta / (lineLength * effectiveCellWidth);
          
          const newPosition = Math.max(0, Math.min(1, startValue + positionDelta));
          
          // Update the stop position
          const currentProperty = state.definition[dragData.property];
          const newStops = [...currentProperty.stops];
          if (newStops[dragData.stopIndex]) {
            newStops[dragData.stopIndex] = { ...newStops[dragData.stopIndex], position: newPosition };
            
            set((prevState) => ({
              definition: {
                ...prevState.definition,
                [dragData.property as keyof GradientDefinition]: {
                  ...currentProperty,
                  stops: newStops
                }
              }
            }));
          }
        }
      }
    }
  },

  endDrag: () => {
    const state = get();
    const { dragState } = state;
    set({ dragState: null });

    if (dragState?.dragType === 'stop' && dragState.dragData?.property) {
      const property = dragState.dragData.property;
      set((current) => {
        const propertyState = current.definition[property];
        const sortedStops = [...propertyState.stops].sort((a, b) => a.position - b.position);
        return {
          definition: {
            ...current.definition,
            [property]: {
              ...propertyState,
              stops: sortedStops
            }
          }
        };
      });
    }
  },

  // Utility actions
  reset: () => {
    set({
      isApplying: false,
      startPoint: null,
      endPoint: null,
      hoverEndPoint: null,
      previewData: null,
      dragState: null
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
      { position: 1, value: '*' }
    ],
    ditherStrength: 50
  });
  
  // Initialize text color gradient
  updateProperty('textColor', {
    enabled: true,
    stops: [
      { position: 0, value: selectedColor },
      { position: 1, value: '#FFFFFF' }
    ],
    ditherStrength: 50
  });
  
  // Initialize background color gradient (handle transparent case) - disabled by default
  const bgStartValue = selectedBgColor === 'transparent' ? '#808080' : selectedBgColor;
  updateProperty('backgroundColor', {
    enabled: false,
    stops: [
      { position: 0, value: bgStartValue },
      { position: 1, value: '#FFFFFF' }
    ],
    ditherStrength: 50
  });
};