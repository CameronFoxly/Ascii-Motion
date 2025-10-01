# UI Components & Design System

This document outlines the standardized UI components and design patterns used in ASCII Motion for maintaining consistency across the application.

## Draggable Dialog Components

### DraggableDialogBar

**Location**: `src/components/common/DraggableDialogBar.tsx`

**Purpose**: Provides a reusable draggable title bar for picker dialogs, allowing users to reposition dialogs anywhere on the screen for better visibility and workflow. Matches the design of panel headers (GradientPanel, MediaImportPanel) for consistency.

**Usage**:
```tsx
import { DraggableDialogBar } from '@/components/common/DraggableDialogBar';

const [positionOffset, setPositionOffset] = useState({ x: 0, y: 0 });
const [isDraggingDialog, setIsDraggingDialog] = useState(false);
const [hasBeenDragged, setHasBeenDragged] = useState(false);
const dragStartOffsetRef = useRef({ x: 0, y: 0 });

const handleDrag = useCallback((deltaX: number, deltaY: number) => {
  setPositionOffset({
    x: dragStartOffsetRef.current.x + deltaX,
    y: dragStartOffsetRef.current.y + deltaY
  });
}, []);

const handleDragStart = useCallback(() => {
  setIsDraggingDialog(true);
  setHasBeenDragged(true);
  dragStartOffsetRef.current = { ...positionOffset };
}, [positionOffset]);

const handleDragEnd = useCallback(() => {
  setIsDraggingDialog(false);
  dragStartOffsetRef.current = { ...positionOffset };
}, [positionOffset]);

const handleClose = () => {
  // Close dialog and cancel selection
  onOpenChange(false);
};

// In render:
<Card className="border border-border/50 shadow-lg">
  <DraggableDialogBar 
    title="Dialog Title" 
    onDrag={handleDrag}
    onDragStart={handleDragStart}
    onDragEnd={handleDragEnd}
    onClose={handleClose}
  />
  <CardContent className="space-y-3 pt-3">
    {/* Dialog content */}
  </CardContent>
</Card>
```

**Visual Design**:
- **Header Layout**: Matches GradientPanel and MediaImportPanel headers exactly
  - `text-sm font-medium` for title text
  - `p-3` padding for the header container
  - Grip icon (`w-3 h-3`) indicating draggable area
  - X close button (`h-6 w-6 p-0`) in top-right corner
- **Cursor States**: Changes from `grab` to `grabbing` during drag
- **Border**: Bottom border to separate from content
- **User Selection**: Disabled to prevent text selection during drag

**Props**:
- `title` (string): Dialog title text
- `onDrag` (optional): Callback with deltaX and deltaY during drag
- `onDragStart` (optional): Callback when drag starts
- `onDragEnd` (optional): Callback when drag ends
- `onClose` (optional): Callback when X button is clicked (closes dialog and cancels selection)

**Integration Pattern**:
```tsx
// 1. Add position offset state (reset on dialog open)
const [positionOffset, setPositionOffset] = useState({ x: 0, y: 0 });
const [isDraggingDialog, setIsDraggingDialog] = useState(false);
const [hasBeenDragged, setHasBeenDragged] = useState(false);
const dragStartOffsetRef = useRef({ x: 0, y: 0 });

useEffect(() => {
  if (isOpen) {
    setPositionOffset({ x: 0, y: 0 }); // Reset position on open
    setHasBeenDragged(false); // Reset animation state
  }
}, [isOpen]);

// 2. Create drag handlers with offset accumulation
const handleDrag = useCallback((deltaX: number, deltaY: number) => {
  setPositionOffset({
    x: dragStartOffsetRef.current.x + deltaX,
    y: dragStartOffsetRef.current.y + deltaY
  });
}, []);

const handleDragStart = useCallback(() => {
  setIsDraggingDialog(true);
  setHasBeenDragged(true);
  dragStartOffsetRef.current = { ...positionOffset };
}, [positionOffset]);

const handleDragEnd = useCallback(() => {
  setIsDraggingDialog(false);
  dragStartOffsetRef.current = { ...positionOffset };
}, [positionOffset]);

// 3. Apply offset to dialog positioning with animation control
className={`fixed z-[99999] ${
  !hasBeenDragged ? 'animate-in duration-200 slide-in-from-right-2 fade-in-0' : ''
}`}
style={{
  top: position.top + positionOffset.y,
  right: position.right !== 'auto' && typeof position.right === 'number' 
    ? position.right - positionOffset.x 
    : undefined,
  left: position.left !== 'auto' && typeof position.left === 'number' 
    ? position.left + positionOffset.x 
    : undefined,
  transition: isDraggingDialog ? 'none' : undefined
}}
```

**Where It's Used**:
- **ColorPickerOverlay**: Advanced color picker with HSV/RGB controls
- **EnhancedCharacterPicker**: Character selection dialog
- **GradientStopPicker**: Indirectly through ColorPickerOverlay and EnhancedCharacterPicker

**Benefits**:
- ✅ Prevents dialogs from obscuring important content
- ✅ Improves workflow on small screens
- ✅ Position resets to original trigger position when reopened
- ✅ Consistent drag behavior across all picker dialogs
- ✅ Layered above all other content (`z-[99999]`)

## Panel UI Components

### PanelSeparator

**Location**: `src/components/common/PanelSeparator.tsx`

**Purpose**: Provides a standardized full-width horizontal separator that extends beyond the panel's padding to create visual separation between major sections in side panels.

**Usage**:
```tsx
import { PanelSeparator } from '@/components/common/PanelSeparator';

<div className="space-y-3">
  <SomeSection />
  <PanelSeparator />
  <AnotherSection />
</div>
```

**Design Pattern**:
- Uses `-mx-4` offset to match the standard panel padding (`p-4`)
- Creates edge-to-edge separators for clear visual hierarchy
- Utilizes the shadcn/ui `Separator` component internally
- Maintains consistency across all panel sections

**Implementation Notes**:
- The `-mx-4` offset is specifically designed to work with the standard `p-4` padding used in `CollapsiblePanel` components
- The component wraps the Separator in a relative positioned div to ensure proper rendering
- An optional `className` prop allows for custom styling when needed

**Where It's Used**:
- Left panel (ToolPalette): Between "Tools" and "Tool Options" sections
- Right panel (App.tsx): Between "Appearance", "Character Palette", and "Color Picker" sections
- Right panel (ColorPicker.tsx): Between "Color Palette", "Effects", and other collapsible sections

### CollapsibleHeader

**Location**: `src/components/common/CollapsibleHeader.tsx`

**Purpose**: Provides a consistent header for collapsible sections throughout the application.

**Standard Pattern**:
```tsx
import { CollapsibleHeader } from '../common/CollapsibleHeader';
import { SomeIcon } from 'lucide-react';

<CollapsibleHeader isOpen={isOpen}>
  <div className="flex items-center gap-2">
    <SomeIcon className="w-4 h-4" />
    Section Title
  </div>
</CollapsibleHeader>
```

**Design Standards**:
- **Icon Size**: Always use `w-4 h-4` for consistent icon sizing
- **Icon Spacing**: Always use `gap-2` (0.5rem/8px) between icon and text
- **Icon Placement**: Icon should always come before the text
- **Icons**: Use lucide-react icons for consistency

**Standard Section Icons**:
- **Tools**: `Wrench` icon
- **Appearance**: `Eye` icon  
- **Character Palette**: `Type` icon
- **Color Palette**: `Palette` icon
- **Effects**: `Wand2` icon

## Spacing Standards

### Panel Container Spacing
- Use `space-y-3` (0.75rem/12px) for consistent spacing between major sections
- Both left and right panels follow this standard

### Panel Padding
- Standard panel padding: `p-4` (1rem/16px)
- Side panels with scroll: `p-4` with `overflow-y-auto`
- Bottom panel: `px-4 pt-4 pb-2` for different vertical spacing

### Section Internal Spacing
- Collapsible content: Use `space-y-3` for internal elements
- Card content: Use `p-3` for card padding, `p-2` for tool option cards
- Form elements: Use `space-y-2` for tighter groupings

## Layout Patterns

### Side Panel Structure
```tsx
<CollapsiblePanel isOpen={isOpen} side="left|right" minWidth="w-44|w-56">
  <div className="space-y-3">
    <FirstSection />
    <PanelSeparator />
    <SecondSection />
    <PanelSeparator />
    <ThirdSection />
  </div>
</CollapsiblePanel>
```

### Collapsible Section Structure
```tsx
<div className="space-y-3">
  <Collapsible open={isOpen} onOpenChange={setIsOpen}>
    <CollapsibleHeader isOpen={isOpen}>
      <div className="flex items-center gap-2">
        <IconComponent className="w-4 h-4" />
        Section Title
      </div>
    </CollapsibleHeader>
    <CollapsibleContent className="collapsible-content">
      {/* Section content here */}
    </CollapsibleContent>
  </Collapsible>
</div>
```

## Design Principles

### Consistency
- All panels follow the same spacing standards
- All section headers use the same icon sizing and spacing
- All separators use the same full-width pattern

### Visual Hierarchy
- Full-width separators (PanelSeparator) for major section divisions
- Consistent spacing creates clear groupings
- Icons provide quick visual identification of sections

### Maintainability
- Shared components reduce code duplication
- Standardized patterns make it easy to add new sections
- Clear documentation ensures future consistency

### Extensibility
- PanelSeparator accepts className prop for custom styling when needed
- CollapsibleHeader supports any content while maintaining structure
- Standard spacing can be overridden when necessary with explicit classes

## Adding New Panel Sections

When adding a new collapsible section to a panel:

1. **Choose an appropriate icon** from lucide-react
2. **Use the standard CollapsibleHeader pattern** with `gap-2` spacing
3. **Wrap the section** in a `<div className="space-y-3">` container
4. **Add PanelSeparator** components before and/or after as needed
5. **Use CollapsibleContent** with `className="collapsible-content"`
6. **Follow existing patterns** for internal spacing and structure

## Example: Adding a New Section

```tsx
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { CollapsibleHeader } from '../common/CollapsibleHeader';
import { PanelSeparator } from '../common/PanelSeparator';
import { Settings } from 'lucide-react'; // Choose appropriate icon

export function NewSection() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <PanelSeparator />
      
      <div className="space-y-3">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleHeader isOpen={isOpen}>
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              New Section
            </div>
          </CollapsibleHeader>
          <CollapsibleContent className="collapsible-content">
            {/* Your section content */}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </>
  );
}
```

## Component Dependencies

- **PanelSeparator**: Depends on `@/components/ui/separator` (shadcn/ui)
- **CollapsibleHeader**: Depends on `@/components/ui/collapsible` and `@/components/ui/button` (shadcn/ui)
- **Icons**: All icons from `lucide-react` package

## Migration Notes

When migrating existing inline separator patterns to PanelSeparator:

1. Replace:
   ```tsx
   <div className="relative -mx-4 h-px">
     <Separator className="absolute inset-0" />
   </div>
   ```
   
2. With:
   ```tsx
   <PanelSeparator />
   ```

3. Update imports to include PanelSeparator
4. Remove unused Separator imports if no longer needed
