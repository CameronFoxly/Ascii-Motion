# Animation System Implementation Guide

## Quick Reference for Onion Skinning Development

### Core Data Access

#### Getting Frame Data
```typescript
import { useAnimationStore } from './stores/animationStore';

const { getFrameData, currentFrameIndex, frames } = useAnimationStore();

// Get specific frame data
const frameData = getFrameData(frameIndex); // Returns Map<string, Cell> | undefined

// Get current frame
const currentFrame = frames[currentFrameIndex];

// Get adjacent frames for onion skinning
const previousFrame = getFrameData(currentFrameIndex - 1);
const nextFrame = getFrameData(currentFrameIndex + 1);
```

#### Frame Data Structure
```typescript
interface Frame {
  id: FrameId;
  name: string;
  duration: number; // milliseconds (50-10000)
  data: Map<string, Cell>; // coordinate key "x,y" -> Cell
  thumbnail?: string; // base64 image data URL
}

interface Cell {
  char: string;   // ASCII character
  color: string;  // foreground color (hex)
  bgColor: string; // background color (hex)
}

// Coordinate key format: "x,y" (e.g., "10,5")
```

### Canvas Integration Points

#### Canvas Store Integration
```typescript
import { useCanvasStore } from './stores/canvasStore';

const { cells, setCanvasData } = useCanvasStore();

// Current canvas state
const currentCells = cells; // Map<string, Cell>

// Load frame data into canvas
setCanvasData(frameData);
```

#### Canvas Overlay System
```typescript
// Existing overlay infrastructure in CanvasOverlay.tsx
// Ready for onion skin layers with proper z-index coordination

// Canvas rendering happens in CanvasRenderer.tsx
// Support for multiple render passes already exists
```

### Auto-Save and Conflict Prevention

#### Current Conflict Prevention
```typescript
// Auto-save is disabled during:
// 1. isPlaying (animation playback)
// 2. isDraggingFrame (frame reordering)
// 3. isLoadingFrameRef.current (frame data loading)

// For onion skinning, you may need to add:
// 4. isUpdatingOnionSkins (when regenerating onion skin overlays)
```

#### Frame Synchronization Hook
```typescript
// src/hooks/useFrameSynchronization.ts
// Handles bidirectional sync between canvas and frames
// Extendable for onion skin overlay updates

// Key functions:
// - saveCurrentCanvasToFrame() - manual save trigger
// - loadFrameToCanvas() - manual load trigger
// - Auto-save with conflict prevention
```

### Performance Considerations

#### Efficient Frame Iteration
```typescript
// Get multiple frames efficiently
const getFrameRange = (start: number, count: number) => {
  return Array.from({ length: count }, (_, i) => {
    const frameIndex = start + i;
    return frameIndex >= 0 && frameIndex < frames.length 
      ? getFrameData(frameIndex) 
      : undefined;
  }).filter(Boolean);
};

// Example: Get 3 previous frames
const previousFrames = getFrameRange(currentFrameIndex - 3, 3);
```

#### Onion Skin Rendering Strategy
```typescript
// Recommended approach for onion skin rendering:

// 1. Render to separate canvas layers
const renderOnionSkin = (frameData: Map<string, Cell>, opacity: number) => {
  // Create temporary canvas for this onion skin layer
  // Apply opacity/tinting
  // Composite onto main canvas
};

// 2. Cache rendered onion skins
const onionSkinCache = new Map<string, HTMLCanvasElement>();
const cacheKey = `${frameIndex}-${opacity}-${tintColor}`;

// 3. Only re-render when frame data changes
// Use frame.thumbnail as change detection mechanism
```

### State Management Extension

#### Recommended Onion Skin State
```typescript
// Add to animationStore.ts
interface OnionSkinState {
  enabled: boolean;
  previousFrames: number; // 0-5 frames back
  nextFrames: number;     // 0-5 frames forward
  opacity: number;        // 0.1-0.8 (don't make too opaque)
  
  // Visual options
  colorMode: 'original' | 'monochrome' | 'tinted';
  previousTint: string;   // hex color for previous frames
  nextTint: string;       // hex color for next frames
  
  // Performance options
  maxDistance: number;    // max frames away to render (performance limit)
}

// Default values
const defaultOnionSkin: OnionSkinState = {
  enabled: false,
  previousFrames: 1,
  nextFrames: 1,
  opacity: 0.3,
  colorMode: 'tinted',
  previousTint: '#ff6b6b', // red tint for previous
  nextTint: '#4ecdc4',     // blue tint for next
  maxDistance: 3
};
```

### Integration Points

#### Canvas Renderer Integration
```typescript
// In CanvasRenderer.tsx, add onion skin pass:

// 1. Render background
// 2. Render onion skins (previous frames)
// 3. Render current frame
// 4. Render onion skins (next frames)  
// 5. Render overlays (selection, etc.)

// Z-index layers:
// - Onion skins: z-index 10-15
// - Current canvas: z-index 20
// - Overlays: z-index 30+
```

#### Timeline UI Integration
```typescript
// Add onion skin controls to AnimationTimeline.tsx:
// - Enable/disable toggle
// - Previous/next frame count sliders
// - Opacity slider
// - Color mode dropdown

// Visual indicators:
// - Show which frames are being used for onion skins
// - Highlight current frame distinctly
```

### Implementation Checklist

#### Phase 1: Basic Onion Skinning
- [ ] Add onion skin state to animationStore
- [ ] Create OnionSkinRenderer component
- [ ] Integrate with CanvasOverlay system
- [ ] Add basic enable/disable toggle

#### Phase 2: Visual Controls
- [ ] Add opacity controls
- [ ] Add frame count controls (previous/next)
- [ ] Add tinting options
- [ ] Add monochrome mode

#### Phase 3: Performance Optimization
- [ ] Implement onion skin caching
- [ ] Add distance limiting
- [ ] Optimize re-render triggers
- [ ] Add performance monitoring

#### Phase 4: Advanced Features
- [ ] Custom tint colors
- [ ] Onion skin opacity per distance
- [ ] Keyboard shortcuts for quick toggle
- [ ] Visual indicators in timeline

### Common Pitfalls to Avoid

1. **Don't render all frames**: Only render frames within the specified distance
2. **Cache aggressively**: Onion skins change less frequently than current frame
3. **Respect existing conflict prevention**: Don't interfere with auto-save system
4. **Use appropriate opacity**: Too high makes current frame hard to see
5. **Z-index coordination**: Ensure proper layering with existing overlays

### Testing Strategy

#### Manual Test Cases
1. Enable onion skins with different frame counts
2. Test performance with many frames
3. Verify no interference with auto-save
4. Test during playback (onion skins should update)
5. Test during frame reordering (onion skins should pause)

#### Performance Benchmarks
- Time to render onion skins with N previous/next frames
- Memory usage with onion skin caching
- Frame rate during animation with onion skins enabled

This architecture provides a solid foundation for implementing onion skinning while maintaining the performance and reliability of the existing animation system.
