# ASCII Motion - Product Requirements Document

## Overview
ASCII Motion is a web-based application for creating, editing, and animating ASCII art with professional timeline controls and multiple export formats.

## Vision
Enable artists and developers to create sophisticated ASCII animations with intuitive tools, frame-by-frame control, and professional export capabilities.

## Tech Stack
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Components**: Shadcn/ui
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Animation**: Custom implementation with Canvas API for playback

## Core Features

### 1. ASCII Art Editor
**Grid-Based Canvas**
- Configurable dimensions (default presets: 80x24, 120x40, custom up to 200x100)
- Individual cell editing with character and color selection
- Real-time preview

**Drawing Tools (Phase 1)**
- Character palette with organized style groups
- Paintbucket tool for flood fill
- Selection tool (rectangular select, move/copy regions)
- Rectangle tool (hollow/filled)
- Ellipse tool (hollow/filled) with aspect ratio locking
- Eyedropper (pick character/color from existing art)
- Hand tool for canvas panning and navigation
- Eraser tool
- Copy/paste from external text sources with visual preview
- Zoom controls (25%-400%) with pan offset management
- Space key override for temporary hand tool activation
- Undo/redo system

**Character Palette Organization**
- Basic Text: A-Z, a-z, 0-9
- Punctuation: .,!?;:"'()[]{}
- Math/Symbols: +-*/=<>%$#@&
- Lines/Borders: ┌┐└┘├┤┬┴┼─│╔╗╚╝
- Blocks/Shading: █▓▒░▄▀■□▪▫
- Arrows: ←→↑↓↖↗↘↙⬅➡⬆⬇
- Geometric: ◆◇○●△▲▼◄►
- Special: ★☆♠♣♥♦※§¶
- Custom user palettes (save/load character sets)

### 2. Animation System
**Timeline Interface**
- Horizontal video-editor style timeline
- Frame thumbnails with duration indicators
- Scrubbing and playback controls
- Individual frame duration configuration
- Maximum 500 frames, 60-second total duration

**Frame Management**
- Add/delete/duplicate frames
- Frame-specific durations (no need for duplicate hold frames)
- Frame reordering via drag & drop
- Frame thumbnails for quick navigation

**Playback System**
- Real-time preview with configurable frame rates
- Play/pause/stop controls
- Timeline scrubbing
- Loop mode toggle

**Future: Onion Skinning**
- Configurable range of surrounding frames (2-5 frames before/after)
- Opacity-based overlay of previous/next frames
- Toggle on/off per user preference

### 3. Export System
**Text Export (.txt)**
- Plain text with preserved spacing and formatting
- Direct grid-to-text conversion
- Maintains exact character positioning

**Project Export (.json)**
```json
{
  "version": "1.0",
  "metadata": {
    "name": "Project Name",
    "created": "2025-09-02T12:00:00Z",
    "modified": "2025-09-02T12:00:00Z",
    "canvas": { "width": 80, "height": 24 }
  },
  "animation": {
    "frames": [
      {
        "id": "frame-1",
        "name": "Frame 1",
        "duration": 100,
        "data": [
          { "x": 0, "y": 0, "char": "@", "color": "#ffffff", "bgColor": "#000000" }
        ]
      }
    ],
    "totalDuration": 1000
  }
}
```

**Visual Export (GIF)**
- Pixel art rendering of ASCII characters
- User-configurable settings:
  - Canvas size multiplier (1x, 2x, 4x, 8x)
  - Color palette reduction
  - Quality settings
  - Frame timing from individual frame durations

**Video Export (MP4)**
- Pixel art rendering matching GIF output
- Web-compatible MP4 format
- Same user controls as GIF export

### 4. Project Management
**Local Storage**
- Auto-save current project to localStorage
- Multiple project slots
- Project metadata (name, last modified, etc.)

**Import/Export**
- Export project as JSON file
- Import JSON project files
- Merge/append animations option

## User Interface Layout

### Main Application Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Header: [Logo] [Project Name] [Save] [Export] [Settings]    │
├─────────────────┬───────────────────────────────────────────┤
│ Tool Palette    │ Main Canvas Area                          │
│ - Drawing Tools │ - Grid-based ASCII editor                 │
│ - Char Palette  │ - Zoom controls                           │
│ - Colors        │ - Canvas size indicator                   │
│ - Brushes       │                                           │
├─────────────────┼───────────────────────────────────────────┤
│ Properties      │ Timeline                                  │
│ - Frame props   │ - Frame thumbnails                        │
│ - Tool settings │ - Playback controls                       │
│ - Export opts   │ - Duration indicators                     │
└─────────────────┴───────────────────────────────────────────┘
```

## Performance Requirements
- Smooth 30fps playback for animations up to 500 frames
- Responsive editing with canvas sizes up to 200x100
- Efficient memory usage with frame caching
- Under 3 second export times for typical animations

## Development Phases

### Phase 1: Core Editor (MVP) - ✅ COMPLETE
- ✅ Grid-based canvas with basic editing
- ✅ Essential drawing tools (palette, paintbucket, selection, rectangle, ellipse, eyedropper, eraser, hand tool)
- ✅ Zoom and navigation system (25%-400% zoom, pan controls, space key override)
- ✅ Character palette with style groupings
- ✅ Copy/paste text support with visual preview and drag positioning
- ✅ Undo/redo system with full action batching
- ✅ Local storage auto-save

### Phase 2: Animation System
- Timeline interface
- Frame management (add/delete/duplicate)
- Individual frame durations
- Basic playback controls
- Frame thumbnails

### Phase 3: Export System
- Text export (.txt)
- Project export/import (.json)
- GIF export with user settings
- MP4 export

### Phase 4: Advanced Tools
- Line tool
- Text tool
- Custom brush system
- Advanced selection tools
- Onion skinning mode

### Phase 5: Polish & Optimization
- Performance optimizations
- UI/UX improvements
- Additional export options
- User preferences system

## Future Enhancements
- Cloud storage and user accounts
- Collaborative editing
- Animation templates
- Advanced color palette management
- Scripting/automation tools
- Mobile responsive design
- Plugin system for custom tools

## Success Metrics
- User can create a simple ASCII animation in under 5 minutes
- Export process completes in under 3 seconds
- Application loads in under 2 seconds
- Zero data loss with auto-save system
- Smooth performance with 200x100 canvas at 30fps
