# Phase 4: Advanced Tools Implementation Plan

## 🎯 **Phase Status: READY TO BEGIN** (Sept 16, 2025)

### **📋 Phase 4 Overview**

With the core functionality (Phase 1), animation system (Phase 2), and export/import system (Phase 3) complete, Phase 4 focuses on advanced creative tools that enhance the artistic capabilities of ASCII Motion.

## **🏆 Completed Phases Recap**

### ✅ **Phase 1: Core Drawing Tools** - COMPLETE
- All basic drawing tools (brush, line, rectangle, ellipse, text)
- Selection tools (rectangular, lasso, magic wand)
- Copy/paste with OS clipboard integration
- Typography controls and spacing
- Professional canvas interaction

### ✅ **Phase 2: Animation System** - COMPLETE
- Timeline interface with frame management
- Animation playback controls
- Frame thumbnails and previews
- Onion skinning visualization
- Animation history system

### ✅ **Phase 3: Export/Import System** - COMPLETE
- PNG export with high-DPI support
- Session export/import (.asciimtn files)
- Typography settings preservation
- Professional export UI
- Complete project state management

## **🚀 Phase 4: Advanced Tools - Implementation Plan**

### **4.1 Custom Brush System** (Priority: HIGH)
**Goal**: Allow users to create and use custom brush patterns

**Implementation:**
```typescript
// src/types/brush.ts
interface CustomBrush {
  id: string;
  name: string;
  pattern: Map<string, Cell>; // Relative coordinates
  size: { width: number; height: number };
  hotspot: { x: number; y: number }; // Center point
}

// src/stores/brushStore.ts
interface BrushState {
  customBrushes: CustomBrush[];
  activeBrush: CustomBrush | null;
  brushLibrary: CustomBrush[]; // Built-in brushes
}
```

**Features:**
- Brush creation from selected canvas areas
- Built-in brush library (arrows, patterns, decorative elements)
- Brush rotation and mirroring
- Brush size scaling
- Import/export custom brush sets

### **4.2 Advanced Color Palettes** (Priority: HIGH)
**Goal**: Extend beyond ANSI colors to full RGB palette support

**Implementation:**
```typescript
// src/types/palette.ts
interface RGBPalette {
  id: string;
  name: string;
  colors: Array<{
    hex: string;
    name?: string;
    category?: string;
  }>;
}

// Enhanced color picker with:
// - RGB color wheel
// - Color harmony tools (complementary, triadic, etc.)
// - Custom palette creation
// - Palette import/export
// - Recent colors history
```

### **4.3 Re-color Brush Tool** (Priority: MEDIUM)
**Goal**: Change colors without affecting characters or structure

**Implementation:**
```typescript
// src/tools/RecolorTool.ts
class RecolorTool {
  sourceColor: string;
  targetColor: string;
  tolerance: number; // For similar color matching
  
  // Replace specific colors while preserving characters
  recolorCell(cell: Cell): Cell {
    if (this.colorMatches(cell.color, this.sourceColor)) {
      return { ...cell, color: this.targetColor };
    }
    return cell;
  }
}
```

**Features:**
- Click to sample source color
- Drag to paint target color
- Tolerance slider for similar color matching
- Background color re-coloring
- Undo/redo integration

### **4.4 Pattern Brush Tool** (Priority: MEDIUM)
**Goal**: Apply repeating patterns efficiently

**Implementation:**
```typescript
// src/types/pattern.ts
interface Pattern {
  id: string;
  name: string;
  tile: Map<string, Cell>; // Base tile pattern
  size: { width: number; height: number };
  seamless: boolean; // Whether pattern tiles seamlessly
}

// Pattern application with:
// - Tile-based repetition
// - Pattern offset controls
// - Rotation and mirroring
// - Transparency support
```

### **4.5 Enhanced Onion Skinning** (Priority: LOW)
**Goal**: Advanced onion skinning with more visual options

**Current Status**: Basic onion skinning implemented
**Enhancements:**
- Multiple frame visibility (2-5 frames before/after)
- Opacity controls per frame layer
- Color tinting for different frame distances
- Onion skin settings panel
- Per-frame onion skin toggle

## **🗓️ Implementation Timeline**

### **Week 1: Custom Brush System**
- **Days 1-2**: Brush data structures and storage
- **Days 3-4**: Brush creation UI and tools
- **Days 5-7**: Built-in brush library and testing

### **Week 2: Advanced Color Palettes**
- **Days 1-3**: RGB color picker implementation
- **Days 4-5**: Custom palette management
- **Days 6-7**: Color harmony tools and import/export

### **Week 3: Specialized Tools**
- **Days 1-3**: Re-color brush tool
- **Days 4-6**: Pattern brush tool
- **Days 7**: Enhanced onion skinning

### **Week 4: Polish & Integration**
- **Days 1-2**: Tool integration and UX refinement
- **Days 3-4**: Performance optimization
- **Days 5-7**: Documentation and testing

## **🎨 UI/UX Considerations**

### **Tool Organization**
- Expand tool palette to accommodate new tools
- Group related tools (brushes, color tools, etc.)
- Add tool categories/tabs if needed
- Maintain current tool switching shortcuts

### **Settings Panels**
- Brush settings panel (size, opacity, pattern)
- Color palette management panel
- Pattern browser and editor
- Advanced onion skin controls

### **Performance Considerations**
- Optimize custom brush rendering
- Efficient pattern tiling algorithms
- Color palette lookup optimization
- Brush preview performance

## **🧪 Testing Strategy**

### **Unit Tests**
- Custom brush pattern application
- Color matching algorithms
- Pattern tiling logic
- Palette management operations

### **Integration Tests**
- Tool switching with custom brushes
- Undo/redo with advanced tools
- Export functionality with new features
- Session save/load with custom content

### **User Testing**
- Brush creation workflow
- Color palette usability
- Tool discoverability
- Performance with complex patterns

## **📚 Documentation Updates Required**

1. **DEVELOPMENT.md**: Add Phase 4 completion status
2. **COPILOT_INSTRUCTIONS.md**: Update with new tool patterns
3. **Create ADVANCED_TOOLS_GUIDE.md**: Comprehensive guide for new features
4. **Update README.md**: Feature list and screenshots

## **🔄 Future Phases After Phase 4**

### **Phase 5: Polish & Optimization**
- Performance optimizations for large canvases
- Mobile responsiveness
- Additional export formats (GIF, MP4)
- User preferences system
- Advanced keyboard shortcuts

### **Phase 6: Collaboration Features**
- Project sharing and collaboration
- Cloud storage integration
- Real-time collaborative editing
- Version control for projects

## **🎯 Success Metrics for Phase 4**

- [ ] Users can create custom brushes in under 2 minutes
- [ ] Color palette management is intuitive and fast
- [ ] Re-color tool works accurately with tolerance settings
- [ ] Pattern brush creates seamless repeating patterns
- [ ] No performance degradation with advanced tools
- [ ] All new tools integrate seamlessly with existing workflow

---

**Ready to begin Phase 4 implementation! 🚀**