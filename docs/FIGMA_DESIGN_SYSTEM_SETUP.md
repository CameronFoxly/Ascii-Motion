# Figma Design System Setup Guide

> **Purpose**: This guide helps you recreate ASCII Motion's dialog design system in Figma for visual iteration and improvements.

---

## 📊 Table of Contents

1. [Design Tokens](#design-tokens)
2. [Component Library Setup](#component-library-setup)
3. [Dialog Patterns](#dialog-patterns)
4. [Workflow: Figma ↔ Code](#workflow-figma--code)
5. [Using Figma MCP Tools](#using-figma-mcp-tools)

---

## 🎨 Design Tokens

### Color System

ASCII Motion uses **HSL-based CSS variables** for theming. Set up Figma variables/styles for:

#### Light Theme Colors

```
Background Colors:
- background:           HSL(0, 0%, 100%)        #FFFFFF
- foreground:           HSL(222.2, 84%, 4.9%)   #010817
- card:                 HSL(0, 0%, 100%)        #FFFFFF
- card-foreground:      HSL(222.2, 84%, 4.9%)   #010817
- popover:              HSL(0, 0%, 100%)        #FFFFFF
- popover-foreground:   HSL(222.2, 84%, 4.9%)   #010817

Primary Colors (Purple):
- primary:              HSL(270, 95%, 60%)      #A626F8
- primary-foreground:   HSL(0, 0%, 98%)         #FAFAFA

Secondary Colors:
- secondary:            HSL(270, 20%, 96%)      #F8F5FA
- secondary-foreground: HSL(222.2, 84%, 4.9%)   #010817

Muted Colors:
- muted:                HSL(270, 20%, 96%)      #F8F5FA
- muted-foreground:     HSL(215.4, 16.3%, 46.9%) #6B7280

Accent Colors:
- accent:               HSL(270, 20%, 96%)      #F8F5FA
- accent-foreground:    HSL(222.2, 84%, 4.9%)   #010817

Destructive Colors:
- destructive:          HSL(0, 84.2%, 60.2%)    #F04F4F
- destructive-foreground: HSL(210, 40%, 98%)    #F8FAFC

UI Elements:
- border:               HSL(270, 15%, 91.4%)    #E8E2EE
- input:                HSL(270, 15%, 91.4%)    #E8E2EE
- ring:                 HSL(270, 95%, 60%)      #A626F8
```

#### Dark Theme Colors

```
Background Colors:
- background:           HSL(0, 0%, 3.9%)        #0A0A0A
- foreground:           HSL(0, 0%, 98%)         #FAFAFA
- card:                 HSL(0, 0%, 3.9%)        #0A0A0A
- card-foreground:      HSL(0, 0%, 98%)         #FAFAFA
- popover:              HSL(0, 0%, 3.9%)        #0A0A0A
- popover-foreground:   HSL(0, 0%, 98%)         #FAFAFA

Primary Colors (Purple):
- primary:              HSL(270, 91%, 75%)      #D69EFF
- primary-foreground:   HSL(0, 0%, 9%)          #171717

Secondary Colors:
- secondary:            HSL(0, 0%, 14.9%)       #262626
- secondary-foreground: HSL(0, 0%, 98%)         #FAFAFA

Muted Colors:
- muted:                HSL(0, 0%, 14.9%)       #262626
- muted-foreground:     HSL(0, 0%, 63.9%)       #A3A3A3

Accent Colors:
- accent:               HSL(0, 0%, 14.9%)       #262626
- accent-foreground:    HSL(0, 0%, 98%)         #FAFAFA

Destructive Colors:
- destructive:          HSL(0, 62.8%, 30.6%)    #991B1B
- destructive-foreground: HSL(0, 0%, 98%)       #FAFAFA

UI Elements:
- border:               HSL(0, 0%, 14.9%)       #262626
- input:                HSL(0, 0%, 14.9%)       #262626
- ring:                 HSL(270, 91%, 75%)      #D69EFF
```

### Typography Scale

ASCII Motion uses Tailwind's default typography scale:

```
text-xs:    12px / 16px line-height
text-sm:    14px / 20px line-height
text-base:  16px / 24px line-height
text-lg:    18px / 28px line-height
text-xl:    20px / 28px line-height
text-2xl:   24px / 32px line-height

Font Weight:
normal:     400
medium:     500
semibold:   600
bold:       700
```

### Spacing System

Uses **4px base grid** (Tailwind spacing):

```
0:    0px
0.5:  2px
1:    4px
1.5:  6px
2:    8px
2.5:  10px
3:    12px
3.5:  14px
4:    16px
5:    20px
6:    24px
7:    28px
8:    32px
9:    36px
10:   40px
12:   48px
16:   64px
20:   80px
24:   96px
```

### Border Radius

```
sm:  calc(0.5rem - 4px) = 4px
md:  calc(0.5rem - 2px) = 6px
lg:  0.5rem = 8px
```

### Shadows

```
shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)
```

---

## 🧩 Component Library Setup

### Step 1: Create Base Components in Figma

#### Button Component

Create variants for all button states:

**Variants:**
- `variant`: default | outline | ghost | destructive | link
- `size`: sm | default | lg | icon
- `state`: default | hover | active | disabled

**Base Styles:**
```
Default Button (variant=default, size=default):
- Padding: 16px horizontal, 8px vertical (px-4 py-2)
- Border Radius: 6px (md)
- Font: text-sm (14px), font-medium (500)
- Background: primary color
- Foreground: primary-foreground color
- Height: 40px (h-10)

Outline Button (variant=outline):
- Border: 1px solid border color
- Background: transparent
- Foreground: foreground color

Ghost Button (variant=ghost):
- Background: transparent (hover: accent)
- Foreground: foreground color

Small Button (size=sm):
- Padding: 12px horizontal, 4px vertical (px-3 py-1)
- Font: text-sm
- Height: 36px (h-9)
- Border Radius: 6px
```

#### Input Component

**Base Styles:**
```
- Height: 40px (h-10)
- Padding: 12px horizontal, 8px vertical (px-3 py-2)
- Border: 1px solid input color
- Border Radius: 6px (md)
- Font: text-sm (14px)
- Background: background color
- Focus: ring-2 ring-ring color
```

#### Label Component

**Base Styles:**
```
- Font: text-sm (14px), font-medium (500)
- Color: foreground
- Margin bottom: 8px (mb-2) from input
```

#### Card Component

**Base Styles:**
```
Card:
- Background: card color
- Border: 1px solid border color
- Border Radius: 8px (lg)
- Padding: 24px (p-6)

CardHeader:
- Padding: 24px (p-6)

CardContent:
- Padding: 24px horizontal, 0 top (px-6 pt-0)

CardTitle:
- Font: text-lg (18px), font-semibold (600)
```

#### Dialog Component

This is the most important component for your redesign.

**Dialog Structure:**

```
DialogOverlay:
- Position: Fixed, full viewport
- Background: rgba(0, 0, 0, 0.8)
- Z-index: 50

DialogContent:
- Position: Fixed, centered (50% left, 50% top, transform: translate(-50%, -50%))
- Background: background color
- Border: 1px solid border color
- Border Radius: 8px (rounded-lg on sm+)
- Padding: 24px (p-6)
- Shadow: shadow-lg
- Z-index: 50
- Max Width: varies (see dialog patterns)
- Gap: 16px (gap-4) between children

DialogHeader:
- Display: flex flex-col
- Gap: 6px (space-y-1.5)
- Text align: left (sm+), center (mobile)

DialogTitle:
- Font: text-lg (18px), font-semibold (600)
- Line height: tight
- Tracking: tight

DialogDescription:
- Font: text-sm (14px)
- Color: muted-foreground

DialogFooter:
- Display: flex
- Direction: column-reverse (mobile), row (sm+)
- Justify: end (sm+)
- Gap: 8px (space-x-2 on sm+)
```

---

## 📐 Dialog Patterns

Based on analysis of 26 dialog components, here are the common patterns:

### Size Categories

**Small Dialogs** (`max-w-md` = 448px):
- Simple forms
- Confirmations
- Quick settings
- Examples: SaveToCloudDialog, JsonExportDialog, TextExportDialog

**Medium Dialogs** (`max-w-lg` = 512px):
- Standard forms with multiple fields
- Import/export dialogs
- Examples: VideoExportDialog, HtmlExportDialog, ImportPaletteDialog

**Medium-Large Dialogs** (`max-w-xl` = 576px):
- More complex forms
- Code previews
- Examples: ReactExportDialog

**Large Dialogs** (`max-w-2xl` = 672px):
- Rich content dialogs
- About/info dialogs
- Examples: AboutDialog

**Extra Large Dialogs** (`max-w-4xl` = 896px, `max-w-5xl` = 1024px):
- List views with previews
- Complex management interfaces
- Examples: ProjectsDialog (4xl), KeyboardShortcutsDialog (5xl)

### Common Layout Patterns

#### Pattern 1: Simple Form Dialog

```
DialogContent (max-w-md)
├─ DialogHeader
│  ├─ DialogTitle
│  └─ DialogDescription (optional)
├─ Form fields in space-y-4
│  ├─ Label + Input
│  ├─ Label + Input
│  └─ Label + Textarea
└─ DialogFooter
   ├─ Cancel Button (variant=outline)
   └─ Submit Button (variant=default)
```

**Example:** SaveToCloudDialog

#### Pattern 2: Settings Dialog with Sections

```
DialogContent (max-w-lg, p-0, overflow-hidden)
├─ DialogHeader (px-6 pt-6 pb-4, border-b)
│  └─ DialogTitle
├─ Sticky section (px-6 py-4, border-b)
│  └─ Key inputs/controls
├─ Scrollable content (flex-1, overflow-y-auto, px-6 py-4)
│  └─ Settings sections in space-y-4
└─ Footer (px-6 py-4, border-t, sticky bottom)
   └─ Action buttons
```

**Example:** VideoExportDialog, ImageExportDialog

#### Pattern 3: List/Management Dialog

```
DialogContent (max-w-4xl, max-h-[80vh], overflow-hidden, flex flex-col)
├─ DialogHeader (flex-shrink-0)
│  ├─ DialogTitle
│  └─ DialogDescription
├─ Filter/Search controls (px-6 py-4)
├─ ScrollArea (flex-1)
│  └─ Grid/List of Cards
│     └─ Card (with hover effects)
│        ├─ CardHeader
│        ├─ CardContent
│        └─ CardFooter (actions)
└─ Footer actions (optional)
```

**Example:** ProjectsDialog, ManagePalettesDialog

#### Pattern 4: Info/Documentation Dialog

```
DialogContent (max-w-2xl or max-w-5xl, max-h-[85vh])
├─ DialogHeader
│  └─ DialogTitle
├─ Search/Filter (optional)
└─ ScrollArea (max-h-[70vh])
   └─ Content sections
      └─ Multiple Cards in space-y-4
```

**Example:** AboutDialog, KeyboardShortcutsDialog

### Common Styling Patterns

**Border Softening:**
```
border-border/50  // 50% opacity for softer borders
```

**Responsive Max Width:**
```
sm:max-w-md       // 448px on small screens+
sm:max-w-[425px]  // Custom 425px
max-w-lg          // 512px always
```

**Height Constraints:**
```
max-h-[70vh]      // 70% viewport height
max-h-[80vh]      // 80% viewport height
max-h-[85vh]      // 85% viewport height
```

**Overflow Control:**
```
overflow-hidden              // On DialogContent
overflow-y-auto              // On scrollable sections
flex flex-col                // For proper stretch
flex-1                       // For expanding sections
```

**Header Styling:**
```
px-6 pt-6 pb-4 border-b      // Sticky header with border
bg-background                // Ensure proper z-index layering
```

### Icon Usage

Common icons from `lucide-react`:

**Dialog Headers:**
- Video, Image: Export dialogs
- Cloud, CloudUpload: Cloud operations
- Folder, FolderOpen: Project management
- Settings: Settings dialogs
- GitCommit: Version/about dialogs

**Form Icons (inside inputs):**
- Mail: Email input
- Lock: Password input
- Search: Search input
- Eye, EyeOff: Password visibility toggle

**Size:** Typically `h-4 w-4` or `h-5 w-5`

---

## 🔄 Workflow: Figma ↔ Code

### Phase 1: Initial Recreation

1. **Set up design tokens** in Figma (colors, typography, spacing)
2. **Create base components** (Button, Input, Label, Card, Dialog)
3. **Build 2-3 reference dialogs** to test your system
   - Recommended: SaveToCloudDialog (simple), VideoExportDialog (complex), ProjectsDialog (list)

### Phase 2: Design Iteration

1. **Experiment** with layouts in Figma
2. **Create variants** for different dialog sizes
3. **Test responsive breakpoints**
4. **Refine spacing and visual hierarchy**

### Phase 3: Sync Back to Code

#### Option A: Manual Update (Recommended)

1. Export design specs from Figma
2. Use Figma MCP to generate React code
3. Compare with existing components
4. Extract improvements (spacing, layout, new patterns)
5. Update React components manually

#### Option B: Component Mapping

1. Use Figma Code Connect (see next section)
2. Map Figma components to React files
3. Use as reference for updates

---

## 🔧 Using Figma MCP Tools

The Figma MCP integration provides several tools for syncing designs with code.

### Available Tools

#### 1. `mcp_figma_get_code`

**Purpose:** Generate React code from Figma designs

**Usage:**
```
When you have a Figma design ready:
1. Get the node ID from Figma URL:
   https://figma.com/design/fileKey/fileName?node-id=1-2
   → Node ID is "1:2" or "1-2"

2. Call: mcp_figma_get_code with nodeId="1:2"

3. Get generated React/TypeScript code
```

**What you get:**
- Component JSX structure
- Tailwind classes
- Basic props interface

**What to do with it:**
- Compare with your existing dialog
- Extract layout improvements
- Update spacing/sizing
- Adopt better class combinations

#### 2. `mcp_figma_get_metadata`

**Purpose:** Get structure overview without full code

**Usage:**
```
For quick inspection:
- Call: mcp_figma_get_metadata with nodeId="1:2"
- Returns XML structure with layer names, types, positions, sizes
```

**Use cases:**
- Quick structure check
- Finding node IDs for nested elements
- Understanding component hierarchy

#### 3. `mcp_figma_add_code_connect_map`

**Purpose:** Link Figma components to React code files

**Usage:**
```
After creating a dialog in Figma:
1. Get the component node ID
2. Call: mcp_figma_add_code_connect_map
   - componentName: "SaveToCloudDialog"
   - source: "src/components/features/SaveToCloudDialog.tsx"
   - nodeId: "123:456"
```

**Benefits:**
- Creates reference between design and code
- Easy navigation between Figma and codebase
- Documentation of component relationships

#### 4. `mcp_figma_get_code_connect_map`

**Purpose:** View existing component mappings

**Usage:**
```
Check what components are mapped:
- Call: mcp_figma_get_code_connect_map with nodeId
- Returns: mapping of Figma nodes → code files
```

#### 5. `mcp_figma_get_screenshot`

**Purpose:** Generate screenshots of Figma designs

**Usage:**
```
For documentation or reference:
- Call: mcp_figma_get_screenshot with nodeId="1:2"
- Get PNG image of the design
```

### Practical Workflow Example

**Redesigning SaveToCloudDialog:**

1. **Create in Figma:**
   - Build new dialog layout
   - Apply design tokens
   - Test different spacing

2. **Get Node ID:**
   - Select component in Figma
   - Copy node ID from URL or inspector
   - Example: `123:456`

3. **Generate Code:**
   ```
   Use: mcp_figma_get_code
   Input: nodeId="123:456"
   ```

4. **Compare & Update:**
   ```tsx
   // Generated Figma code might suggest:
   <DialogContent className="max-w-[480px]">
     <DialogHeader className="space-y-3">
       <DialogTitle className="text-xl">Save to Cloud</DialogTitle>
       <DialogDescription className="text-sm">
         Save your project to the cloud
       </DialogDescription>
     </DialogHeader>
     
     <div className="space-y-6 py-4">
       // Updated spacing from space-y-4 to space-y-6
       // Added py-4 padding
       ...
     </div>
   </DialogContent>
   
   // Apply improvements to your actual component
   ```

5. **Map Component (Optional):**
   ```
   Use: mcp_figma_add_code_connect_map
   Input:
     componentName: "SaveToCloudDialog"
     source: "src/components/features/SaveToCloudDialog.tsx"
     nodeId: "123:456"
   ```

---

## 📋 Dialog Component Inventory

### Export Dialogs (9)
- ImageExportDialog (max-w-md)
- VideoExportDialog (max-w-lg)
- HtmlExportDialog (max-w-lg)
- TextExportDialog (max-w-md)
- JsonExportDialog (max-w-md)
- ReactExportDialog (max-w-xl)
- SessionExportDialog (max-w-md)
- ExportPaletteDialog (max-w-lg)
- ExportCharacterPaletteDialog (max-w-[600px])

### Import Dialogs (4)
- ImportModal (max-w-md)
- JsonImportDialog (max-w-md)
- ImportPaletteDialog (max-w-lg)
- ImportCharacterPaletteDialog (max-w-[600px])

### Management Dialogs (4)
- ProjectsDialog (max-w-4xl) - Complex grid layout
- ManagePalettesDialog (max-w-[600px])
- ManageCharacterPalettesDialog (max-w-[600px])
- KeyboardShortcutsDialog (max-w-5xl) - Two-column grid

### Cloud/Auth Dialogs (4)
- SaveToCloudDialog (max-w-[425px])
- SignInDialog (max-w-md)
- SignUpDialog (max-w-md)
- PasswordResetDialog (max-w-md)

### Info Dialogs (2)
- AboutDialog (max-w-2xl)
- AsciiTypePreviewDialog (varies)

### Time Effects Dialogs (3)
- WiggleDialog
- WaveWarpDialog
- SetFrameDurationDialog
- AddFramesDialog

---

## 🎯 Quick Start Checklist

### Figma Setup
- [ ] Create new Figma file: "ASCII Motion - Design System"
- [ ] Set up color variables/styles (light + dark themes)
- [ ] Create typography styles
- [ ] Define spacing/layout grid (4px base)
- [ ] Create Button component with all variants
- [ ] Create Input, Label, Textarea components
- [ ] Create Card component variants
- [ ] Create Dialog base component

### First Dialog Recreation
- [ ] Choose dialog to redesign (recommend: SaveToCloudDialog)
- [ ] Screenshot current implementation
- [ ] Recreate in Figma using design system
- [ ] Experiment with improvements
- [ ] Use mcp_figma_get_code to generate React code
- [ ] Compare with existing code
- [ ] Update React component with improvements

### Documentation
- [ ] Map components with mcp_figma_add_code_connect_map
- [ ] Document design decisions
- [ ] Create variants for common patterns

---

## 💡 Tips & Best Practices

1. **Start Small**: Don't try to recreate all 26 dialogs at once. Start with 2-3 representative ones.

2. **Use Auto Layout**: Figma's Auto Layout matches Flexbox behavior perfectly - use it everywhere.

3. **Component Variants**: Create variants for all dialog sizes (sm, md, lg, xl, 2xl, 4xl, 5xl) to test designs at different scales.

4. **Name Layers Semantically**: Use same names as React components (DialogHeader, DialogContent, etc.) for easier mapping.

5. **Test Both Themes**: Always design in both light and dark mode.

6. **Responsive Design**: Test designs at different viewport sizes (mobile, tablet, desktop).

7. **Document Changes**: When you make improvements in Figma, note what changed and why for easier code updates.

8. **Iterate in Batches**: Design → Generate Code → Update → Test → Repeat

---

## 🔗 Related Documentation

- `DIALOG_COMPONENT_AUDIT.md` - Complete analysis of all dialog components
- `FIGMA_COMPONENT_MAPPING.md` - Component-by-component Figma recreation guide
- `DESIGN_TOKEN_REFERENCE.md` - Complete design token specifications

---

## 📞 Need Help?

When using Figma MCP tools:
- Always provide the node ID from your Figma URL
- Specify the programming language context (React/TypeScript)
- For best results, ensure your Figma components match the shadcn/ui patterns

**Example prompt:**
> "Generate React code for my SaveToCloudDialog design at node ID 123:456. This should use TypeScript and Tailwind CSS, matching the shadcn/ui dialog pattern."
