# Dialog Component Audit

> **Complete analysis of all 26 dialog components in ASCII Motion**
> 
> Use this document to understand current dialog patterns before recreating in Figma.

---

## 📊 Summary Statistics

- **Total Dialogs**: 26
- **Dialog Size Distribution**:
  - Small (`max-w-md`, 448px): 11 dialogs
  - Medium (`max-w-lg`, 512px): 5 dialogs
  - Medium-Large (`max-w-xl`, 576px): 1 dialog
  - Large (`max-w-2xl`, 672px): 1 dialog
  - Custom sizes (`max-w-[425px]`, `max-w-[600px]`, etc.): 5 dialogs
  - Extra Large (`max-w-4xl`, `max-w-5xl`): 2 dialogs

---

## 🏗️ Pattern Categories

### Category 1: Simple Form Dialogs (11)

**Characteristics:**
- Small to medium size
- Single form with 2-5 input fields
- Standard DialogHeader + DialogFooter
- No complex layouts

**Common Structure:**
```tsx
<DialogContent className="max-w-md">
  <DialogHeader>
    <DialogTitle>Title</DialogTitle>
    <DialogDescription>Description</DialogDescription>
  </DialogHeader>
  
  <form className="space-y-4">
    <div className="space-y-2">
      <Label>Field 1</Label>
      <Input />
    </div>
    // More fields...
  </form>
  
  <DialogFooter>
    <Button variant="outline">Cancel</Button>
    <Button>Submit</Button>
  </DialogFooter>
</DialogContent>
```

**Examples:**
1. **SaveToCloudDialog** (`max-w-[425px]`)
   - Project name input
   - Description textarea
   - Save/Cancel buttons
   - Uses icon decorations (Cloud, CloudUpload)

2. **JsonImportDialog** (`max-w-md`)
   - File upload area
   - Simple error display
   - Load button

3. **TextExportDialog** (`max-w-md`)
   - Filename input
   - Format selection
   - Export button with loading state

4. **SessionExportDialog** (`max-w-md`)
   - Similar to TextExportDialog
   - Session-specific settings

5. **SignInDialog** (`max-w-md`)
   - Email input (with Mail icon)
   - Password input (with Lock icon, show/hide toggle)
   - Error alerts
   - Link to forgot password
   - Switch to sign-up link

6. **SignUpDialog** (`max-w-md`)
   - Email input with validation
   - Password input with requirements checklist
   - Confirm password input
   - Success confirmation state
   - Switch to sign-in link

7. **PasswordResetDialog** (`max-w-md`)
   - Email input
   - Success state with instructions
   - Back to sign-in link

---

### Category 2: Export Settings Dialogs (8)

**Characteristics:**
- Medium to large size
- Multiple sections with many settings
- Sticky header with filename input
- Scrollable settings area
- Progress indicators
- `p-0 overflow-hidden` pattern for custom layout

**Common Structure:**
```tsx
<DialogContent className="max-w-lg p-0 overflow-hidden">
  {/* Sticky Header */}
  <DialogHeader className="px-6 pt-6 pb-4 border-b bg-background">
    <DialogTitle className="flex items-center gap-2">
      <Icon />
      Export Title
    </DialogTitle>
  </DialogHeader>

  <div className="flex flex-col max-h-[80vh]">
    {/* Sticky Filename & Progress */}
    <div className="sticky top-0 z-10 bg-background px-6 py-4 border-b">
      <Label>File Name</Label>
      <Input />
      {progress && <Progress />}
    </div>

    {/* Scrollable Settings */}
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      <Card>
        <CardContent>
          {/* Settings groups */}
        </CardContent>
      </Card>
    </div>

    {/* Sticky Footer */}
    <div className="sticky bottom-0 px-6 py-4 border-t bg-background">
      <Button>Export</Button>
    </div>
  </div>
</DialogContent>
```

**Examples:**

1. **VideoExportDialog** (`max-w-lg`)
   - Size multiplier slider
   - Frame rate input
   - Format selector (MP4/WebM)
   - Quality/CRF settings
   - Loop settings
   - Grid toggle
   - Progress bar
   - Estimated file size display

2. **ImageExportDialog** (`max-w-md`)
   - Size multiplier
   - Format selection (PNG/JPG)
   - Quality slider
   - Grid toggle
   - Pixel dimensions display

3. **HtmlExportDialog** (`max-w-lg`)
   - Font size settings
   - Line height settings
   - Template selection
   - Style options
   - Code preview

4. **ReactExportDialog** (`max-w-xl`)
   - Component name input
   - TypeScript toggle
   - Animation settings
   - Code preview section
   - Copy code button

5. **JsonExportDialog** (`max-w-md`)
   - Format options
   - Include metadata toggle
   - Pretty print toggle

6. **ExportPaletteDialog** (`max-w-lg`)
   - Palette selection
   - Format options
   - Name/description fields

7. **ExportCharacterPaletteDialog** (`max-w-[600px]`)
   - Palette preview
   - Format selection
   - Export options

---

### Category 3: List Management Dialogs (5)

**Characteristics:**
- Large size (600px - 4xl)
- Grid or list layout
- Search/filter capabilities
- Card-based items
- Dropdown menus for actions
- Often uses ScrollArea

**Common Structure:**
```tsx
<DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
  <DialogHeader>
    <DialogTitle>Manage Items</DialogTitle>
    <DialogDescription>Description</DialogDescription>
  </DialogHeader>
  
  {/* Search/Filter */}
  <div className="px-6 py-4 border-b">
    <Input placeholder="Search..." />
  </div>
  
  {/* Scrollable Grid */}
  <ScrollArea className="flex-1 px-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(item => (
        <Card key={item.id}>
          <CardHeader>
            <div className="flex justify-between">
              <CardTitle>{item.name}</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <MoreVertical />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Edit</DropdownMenuItem>
                  <DropdownMenuItem>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            {/* Item preview/content */}
          </CardContent>
          <CardFooter>
            <Button>Open</Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  </ScrollArea>
</DialogContent>
```

**Examples:**

1. **ProjectsDialog** (`max-w-4xl`, `max-h-[80vh]`)
   - Grid of project cards with previews
   - Project metadata (name, date, description)
   - Inline editing for name/description
   - Dropdown actions menu (Open, Delete, Rename, Download)
   - Upload button
   - Trash section (collapsible)
   - Loading states
   - Empty states
   - Complex state management

2. **ManagePalettesDialog** (`max-w-[600px]`, `max-h-[70vh]`)
   - List of color palettes
   - Palette preview swatches
   - Add/Edit/Delete actions
   - Set as active palette
   - Scrollable list

3. **ManageCharacterPalettesDialog** (`max-w-[600px]`, `max-h-[70vh]`)
   - List of character palettes
   - Character preview
   - Add/Edit/Delete actions
   - Set as active

4. **ImportPaletteDialog** (`max-w-lg`)
   - Upload area
   - Format selection
   - Palette preview after upload
   - Import button

5. **ImportCharacterPaletteDialog** (`max-w-[600px]`, `max-h-[80vh]`)
   - Similar to ImportPaletteDialog
   - Character-specific options

---

### Category 4: Documentation/Info Dialogs (2)

**Characteristics:**
- Large to extra-large size
- Heavy use of ScrollArea
- Collapsible sections
- Multi-column layouts
- Rich text content
- Search functionality

**Examples:**

1. **AboutDialog** (`max-w-2xl`)
   - ASCII art header
   - Version info with formatted display
   - Multiple Card sections:
     - Description
     - Features list
     - Open source info
     - GitHub links
   - Collapsible version history
   - Build metadata (hash, date)
   - ScrollArea for long content
   - Formatted dates

2. **KeyboardShortcutsDialog** (`max-w-5xl`, `max-h-[85vh]`)
   - Search input for filtering shortcuts
   - Multiple sections (6 categories):
     - Tool Selection
     - Canvas Actions
     - Color Management
     - Zoom & Navigation
     - Animation & Timeline
     - Performance
   - Two-column grid layout (`md:grid-cols-2`)
   - Custom kbd element styling
   - Keyboard shortcut display component
   - Platform-aware (Mac ⌘ vs Ctrl)
   - Hover effects on rows
   - Filtered results display

---

### Category 5: Specialized/Complex Dialogs (2)

**Examples:**

1. **AsciiTypePreviewDialog**
   - Dynamic size based on content
   - Text preview rendering
   - Scroll position persistence
   - Custom font handling

2. **Time Effects Dialogs** (WiggleDialog, WaveWarpDialog, etc.)
   - Complex parameter controls
   - Multiple sliders
   - Range settings
   - Preview capabilities
   - Draggable positioning

---

## 🎨 Visual Design Patterns

### Border Styling

**Soft Borders:**
```tsx
className="border-border/50"  // 50% opacity - used in 8+ dialogs
```
Creates softer, less harsh borders. Common in:
- SaveToCloudDialog
- ProjectsDialog
- SignInDialog
- AboutDialog cards

### Header Variations

**Standard Header:**
```tsx
<DialogHeader>
  <DialogTitle>Title</DialogTitle>
</DialogHeader>
```

**Header with Icon:**
```tsx
<DialogHeader>
  <DialogTitle className="flex items-center gap-2">
    <Icon className="w-5 h-5" />
    Title
  </DialogTitle>
</DialogHeader>
```

**Header with Description:**
```tsx
<DialogHeader>
  <DialogTitle className="text-center">Title</DialogTitle>
  <DialogDescription className="text-center">
    Description text
  </DialogDescription>
</DialogHeader>
```

**Sticky Header with Border:**
```tsx
<DialogHeader className="px-6 pt-6 pb-4 border-b bg-background">
  <DialogTitle>Title</DialogTitle>
</DialogHeader>
```

### Input Field Patterns

**Basic Field:**
```tsx
<div className="space-y-2">
  <Label htmlFor="field">Field Name</Label>
  <Input id="field" />
</div>
```

**Field with Icon:**
```tsx
<div className="space-y-2">
  <Label>Email</Label>
  <div className="relative">
    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input className="pl-9" type="email" />
  </div>
</div>
```

**Password Field with Toggle:**
```tsx
<div className="relative">
  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
  <Input 
    type={showPassword ? "text" : "password"}
    className="pl-9 pr-9"
  />
  <Button
    type="button"
    variant="ghost"
    size="icon"
    className="absolute right-0 top-0 h-full px-3"
    onClick={() => setShowPassword(!showPassword)}
  >
    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
  </Button>
</div>
```

### Button Patterns

**Footer Buttons:**
```tsx
<DialogFooter>
  <Button variant="outline" onClick={onClose}>
    Cancel
  </Button>
  <Button onClick={onSubmit} disabled={loading}>
    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
    Submit
  </Button>
</DialogFooter>
```

**Icon Buttons:**
```tsx
<Button variant="outline" className="w-full justify-start">
  <GitHubIcon className="mr-2 h-4 w-4" />
  Button Text
  <ExternalLink className="ml-auto h-3 w-3" />
</Button>
```

### Loading States

**Form Loading:**
```tsx
<Button disabled={loading}>
  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {loading ? 'Saving...' : 'Save'}
</Button>
```

**Progress Bar:**
```tsx
{progress && (
  <div className="space-y-2">
    <div className="flex justify-between">
      <span className="text-sm">{progress.message}</span>
      <span className="text-sm">{Math.round(progress.progress)}%</span>
    </div>
    <Progress value={progress.progress} />
  </div>
)}
```

**Loading Overlay:**
```tsx
{loading && (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
)}
```

### Error Display

**Alert Component:**
```tsx
{error && (
  <Alert variant="destructive">
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}
```

**Inline Error:**
```tsx
{error && (
  <p className="text-sm text-destructive">{error}</p>
)}
```

### Empty States

```tsx
{items.length === 0 && (
  <div className="text-center py-8 text-muted-foreground">
    <Icon className="h-12 w-12 mx-auto mb-4 opacity-50" />
    <p>No items found</p>
  </div>
)}
```

---

## 📏 Spacing Patterns

### Form Spacing

**Vertical spacing between fields:**
```tsx
className="space-y-4"  // 16px - most common
className="space-y-6"  // 24px - more generous
className="space-y-2"  // 8px - within field groups
```

**Field internal spacing:**
```tsx
<div className="space-y-2">  // Label to Input
  <Label>Name</Label>
  <Input />
</div>
```

### Card Spacing

**Card gaps in grids:**
```tsx
className="grid gap-4"     // 16px
className="grid gap-6"     // 24px
```

**Card internal padding:**
```tsx
<Card>
  <CardHeader className="pb-3">      // Reduced bottom padding
  <CardContent className="pt-4">     // Top padding
```

### Dialog Padding

**Standard padding:**
```tsx
className="p-6"         // 24px all around
className="px-6 py-4"   // 24px horizontal, 16px vertical
```

**Custom layouts (p-0 pattern):**
```tsx
<DialogContent className="p-0">
  <div className="px-6 pt-6 pb-4">  // Manual padding
```

---

## 🎯 Responsive Patterns

### Width Breakpoints

**Mobile-first approach:**
```tsx
className="sm:max-w-md"        // 448px on sm+ screens
className="max-w-lg"           // 512px on all screens
className="sm:max-w-[425px]"   // Custom 425px on sm+
```

### Grid Responsive

**Column counts:**
```tsx
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
```

**Gap responsive:**
```tsx
className="gap-x-16"  // Large horizontal gap for two-column layouts
```

### Text Alignment

```tsx
className="text-center sm:text-left"  // Center on mobile, left on desktop
```

### Flex Direction

```tsx
className="flex flex-col-reverse sm:flex-row"  // Stack on mobile, row on desktop
```

---

## 🔍 Search & Filter Patterns

**Search Input:**
```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    placeholder="Search..."
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    className="pl-9"
  />
</div>
```

**Filtered Results Display:**
```tsx
{filteredItems.length === 0 ? (
  <div className="text-center py-8 text-muted-foreground">
    No results found for "{searchQuery}"
  </div>
) : (
  <div className="space-y-4">
    {filteredItems.map(item => ...)}
  </div>
)}
```

---

## 🎨 Card Hover Effects

```tsx
<Card className="border-border/50 hover:border-border transition-colors cursor-pointer">
```

```tsx
<div className="py-1.5 px-2 rounded hover:bg-muted/50 transition-colors">
```

---

## 📱 ScrollArea Usage

**Basic ScrollArea:**
```tsx
<ScrollArea className="max-h-[70vh] pr-4">
  <div className="space-y-4">
    {/* Content */}
  </div>
</ScrollArea>
```

**With flex container:**
```tsx
<DialogContent className="flex flex-col overflow-hidden">
  <DialogHeader />
  <ScrollArea className="flex-1">
    {/* Scrollable content */}
  </ScrollArea>
</DialogContent>
```

---

## 🏷️ Common Class Combinations

**Dialog Content Variations:**
```tsx
// Standard
"max-w-md"

// No padding (custom layout)
"max-w-lg p-0 overflow-hidden"

// Flex container
"max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"

// Responsive
"sm:max-w-md border-border/50"
```

**Section Dividers:**
```tsx
"px-6 py-4 border-b"  // Top section
"px-6 py-4 border-t"  // Bottom section
```

**Sticky Elements:**
```tsx
"sticky top-0 z-10 bg-background px-6 py-4 border-b"
```

---

## 📊 Dialog Size Reference

| Size Class | Width | Use Case | Count |
|-----------|-------|----------|-------|
| `max-w-md` | 448px | Simple forms, confirmations | 11 |
| `max-w-[425px]` | 425px | Custom small dialogs | 1 |
| `max-w-lg` | 512px | Settings, exports | 5 |
| `max-w-[600px]` | 600px | Palette management | 3 |
| `max-w-xl` | 576px | Code exports | 1 |
| `max-w-2xl` | 672px | Info dialogs | 1 |
| `max-w-4xl` | 896px | Project management | 1 |
| `max-w-5xl` | 1024px | Documentation | 1 |

---

## 🔧 Component Dependencies

### Most Common Imports

```tsx
// Core Dialog
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Form Elements
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Layout
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

// Additional UI
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Icons (lucide-react)
import { Loader2, Mail, Lock, Eye, EyeOff, Search, MoreVertical } from 'lucide-react';
```

---

## 💡 Design Recommendations

Based on the audit, consider these improvements:

1. **Standardize Border Treatment**
   - Consistently use `border-border/50` for softer appearance
   - Currently inconsistent across dialogs

2. **Unify Spacing**
   - Some dialogs use `space-y-4`, others `space-y-6`
   - Establish clear spacing scale for consistency

3. **Loading State Patterns**
   - Standardize progress indicator placement
   - Consistent button loading states

4. **Empty State Design**
   - Create reusable EmptyState component
   - Currently implemented ad-hoc

5. **Error Display**
   - Standardize error alert styling
   - Consider toast notifications for non-critical errors

6. **Card Hover Effects**
   - Apply consistent hover states to all interactive cards
   - Currently missing in some dialogs

7. **Responsive Breakpoints**
   - Review mobile experience
   - Some dialogs may be too wide on mobile

8. **Icon Consistency**
   - Standardize icon sizes (h-4 w-4 vs h-5 w-5)
   - Consistent icon positioning in inputs

---

## 📝 Notes for Figma Recreation

1. **Create size variants** for DialogContent (md, lg, xl, 2xl, 4xl, 5xl)
2. **Build reusable patterns** for:
   - Form fields with icons
   - Loading states
   - Empty states
   - Error displays
   - Card grids
3. **Use Auto Layout extensively** to match Flexbox behavior
4. **Create component variants** for all button states
5. **Test at multiple viewport sizes** (375px, 768px, 1024px, 1440px)
6. **Document spacing decisions** for easier handoff to code
7. **Consider dark mode** from the start

---

## 🎯 Priority Dialogs for Redesign

Based on complexity and frequency of use:

1. **High Priority:**
   - SaveToCloudDialog (simple, frequently used)
   - ProjectsDialog (complex, critical UX)
   - VideoExportDialog (complex settings)
   - SignInDialog (first impression)

2. **Medium Priority:**
   - AboutDialog (branding opportunity)
   - KeyboardShortcutsDialog (user education)
   - ManagePalettesDialog (frequent use)

3. **Low Priority:**
   - Export dialogs (functional, less critical)
   - Time effect dialogs (advanced feature)

---

**Last Updated:** 2025-10-14
**Total Dialogs Analyzed:** 26
**Lines of Dialog Code:** ~8,500+
