# Figma Component Recreation Guide

> **Step-by-step instructions for recreating ASCII Motion's dialog components in Figma**

---

## 🎯 Overview

This guide walks you through recreating your React/shadcn/ui components in Figma, allowing you to visually iterate on designs before updating code.

**Time Estimate:**
- Phase 1 (Setup): 1-2 hours
- Phase 2 (First Dialog): 30-60 minutes
- Phase 3 (Additional Dialogs): 15-30 minutes each

---

## 📋 Prerequisites

- Figma account (free tier works fine)
- Access to ASCII Motion codebase
- Figma Desktop App (recommended for MCP integration)

---

## Phase 1: Design System Setup (One-Time)

### Step 1: Create New Figma File

1. Create new Figma file: `ASCII Motion - Design System`
2. Create three pages:
   - `🎨 Design Tokens` - Color, typography, spacing reference
   - `🧩 Components` - Reusable UI components
   - `📱 Dialogs` - Dialog designs

---

### Step 2: Set Up Color Styles

#### 2.1 Create Light Theme Colors

**On the "Design Tokens" page:**

1. **Create color swatches:**
   - Draw 64x64 rectangles for each color
   - Label them clearly

2. **Create Figma color styles:**

**Background Colors:**
- `light/background` - `#FFFFFF` (HSL: 0, 0%, 100%)
- `light/foreground` - `#010817` (HSL: 222.2, 84%, 4.9%)
- `light/card` - `#FFFFFF`
- `light/card-foreground` - `#010817`

**Primary (Purple):**
- `light/primary` - `#A626F8` (HSL: 270, 95%, 60%)
- `light/primary-foreground` - `#FAFAFA`

**Secondary:**
- `light/secondary` - `#F8F5FA` (HSL: 270, 20%, 96%)
- `light/secondary-foreground` - `#010817`

**Muted:**
- `light/muted` - `#F8F5FA`
- `light/muted-foreground` - `#6B7280` (HSL: 215.4, 16.3%, 46.9%)

**Accent:**
- `light/accent` - `#F8F5FA`
- `light/accent-foreground` - `#010817`

**Destructive:**
- `light/destructive` - `#F04F4F` (HSL: 0, 84.2%, 60.2%)
- `light/destructive-foreground` - `#F8FAFC`

**UI Elements:**
- `light/border` - `#E8E2EE` (HSL: 270, 15%, 91.4%)
- `light/input` - `#E8E2EE`
- `light/ring` - `#A626F8`

**Utility:**
- `light/border-soft` - `#E8E2EE` at 50% opacity (for `border-border/50`)

#### 2.2 Create Dark Theme Colors

**Repeat for dark theme with prefix `dark/`:**

- `dark/background` - `#0A0A0A`
- `dark/foreground` - `#FAFAFA`
- `dark/primary` - `#D69EFF`
- `dark/primary-foreground` - `#171717`
- `dark/border` - `#262626`
- etc.

**Tip:** Create both themes side-by-side for easy comparison.

---

### Step 3: Set Up Typography Styles

**Create text styles:**

1. **Headings:**
   - `text/title-lg` - 18px, Semibold (600), 28px line height
   - `text/title-base` - 16px, Semibold (600), 24px line height

2. **Body:**
   - `text/base` - 16px, Regular (400), 24px line height
   - `text/sm` - 14px, Regular (400), 20px line height
   - `text/xs` - 12px, Regular (400), 16px line height

3. **Labels:**
   - `text/label` - 14px, Medium (500), 20px line height

4. **Code/Mono:**
   - `text/kbd` - 12px, Semibold (600), monospace

**Apply colors to variants:**
- Default: `foreground`
- Muted: `muted-foreground`

---

### Step 4: Set Up Layout Grid

1. **Create 4px base grid:**
   - Layout Grid: 4px square grid
   - Color: Light purple at 5% opacity
   - This matches Tailwind's spacing scale

2. **Save as reusable style**

---

### Step 5: Create Base Components

#### 5.1 Button Component

**Create master component with variants:**

1. **Draw base button:**
   ```
   Auto Layout (Horizontal)
   - Padding: 16px horizontal, 8px vertical
   - Gap: 8px
   - Border Radius: 6px
   - Height: 40px (h-10)
   ```

2. **Add component properties:**
   - **Variant**: default | outline | ghost | destructive | link
   - **Size**: sm | default | lg | icon
   - **State**: default | hover | active | disabled
   - **Icon Left**: Boolean (shows/hides left icon slot)
   - **Icon Right**: Boolean (shows/hides right icon slot)
   - **Label**: Text property

3. **Configure variants:**

   **Default Button:**
   - Fill: `primary`
   - Text: `primary-foreground`
   - Font: `text/sm`

   **Outline Button:**
   - Fill: transparent
   - Stroke: 1px, `border`
   - Text: `foreground`

   **Ghost Button:**
   - Fill: transparent
   - Text: `foreground`
   - Hover: `accent` background

   **Small Size:**
   - Padding: 12px horizontal, 4px vertical
   - Height: 36px

   **Disabled State:**
   - Opacity: 50%
   - Cursor: not-allowed (in prototype)

4. **Add icon slots:**
   - Instance of placeholder icon component
   - 16x16 size (h-4 w-4)
   - Visible only when property is true

#### 5.2 Input Component

**Create component:**

1. **Draw base:**
   ```
   Auto Layout (Horizontal)
   - Padding: 12px horizontal, 8px vertical
   - Height: 40px
   - Border: 1px, `input` color
   - Border Radius: 6px
   - Fill: `background`
   ```

2. **Add properties:**
   - **State**: default | focus | disabled | error
   - **Icon Left**: Boolean
   - **Icon Right**: Boolean
   - **Placeholder**: Text

3. **Configure states:**
   - **Focus**: Border color `ring`, add 2px ring effect
   - **Error**: Border color `destructive`
   - **Disabled**: Opacity 50%

4. **Add text:**
   - Text: `text/sm`, `foreground` or `muted-foreground` (placeholder)

#### 5.3 Label Component

**Simple component:**
```
Text: text/label
Color: foreground
Margin-bottom: 8px (space to input)
```

#### 5.4 Card Component

**Create component set:**

1. **Card Container:**
   ```
   Auto Layout (Vertical)
   - Padding: 24px
   - Gap: 0 (children manage their own spacing)
   - Fill: `card`
   - Stroke: 1px, `border`
   - Border Radius: 8px
   ```

2. **Nested components:**
   - **CardHeader** - Padding: 24px, nested in Card
   - **CardContent** - Padding: 24px horizontal, 0 top
   - **CardTitle** - Text: `text/title-base`
   - **CardDescription** - Text: `text/sm`, color: `muted-foreground`

3. **Create variant:**
   - **Border**: normal | soft (50% opacity)

#### 5.5 Dialog Component

**This is the most important component.**

**Create Dialog component set:**

1. **Dialog Overlay:**
   ```
   Frame
   - Size: 1440 x 900 (desktop reference)
   - Fill: #000000 at 80% opacity
   ```

2. **Dialog Content:**
   ```
   Auto Layout (Vertical)
   - Padding: 24px
   - Gap: 16px
   - Fill: `background`
   - Stroke: 1px, `border`
   - Border Radius: 8px
   - Effect: Shadow (shadow-lg)
   - Constraints: Center in parent
   ```

3. **Component properties:**
   - **Size**: sm | md | lg | xl | 2xl | 4xl | 5xl
   - **Has Description**: Boolean
   - **Has Footer**: Boolean
   - **Custom Layout**: Boolean (for p-0 pattern)

4. **Configure size variants:**
   - **sm**: 384px width
   - **md**: 448px width
   - **lg**: 512px width
   - **xl**: 576px width
   - **2xl**: 672px width
   - **4xl**: 896px width
   - **5xl**: 1024px width

5. **Nested components:**

   **DialogHeader:**
   ```
   Auto Layout (Vertical)
   - Gap: 6px
   - Padding: 0
   ```

   **DialogTitle:**
   ```
   Text: text/title-lg
   Color: foreground
   ```

   **DialogDescription:**
   ```
   Text: text/sm
   Color: muted-foreground
   Visible: Based on "Has Description" property
   ```

   **DialogFooter:**
   ```
   Auto Layout (Horizontal-Reverse on mobile, Horizontal on desktop)
   - Gap: 8px
   - Justify: End
   - Visible: Based on "Has Footer" property
   ```

6. **Close button:**
   ```
   Position: Absolute
   Top: 16px, Right: 16px
   Size: 32x32
   Icon: X (16x16)
   ```

#### 5.6 ScrollArea Component

**Visual representation:**
```
Frame
- Clip Content: true
- Scrollbar: Shown on overflow
- Padding right: 16px (for scrollbar space)
```

**Properties:**
- **Max Height**: auto | 70vh | 80vh | 85vh

#### 5.7 Additional Components

Create as needed:
- **Checkbox**
- **Select/Dropdown**
- **Slider**
- **Progress Bar**
- **Alert**
- **Textarea**

---

## Phase 2: Create Your First Dialog

Let's recreate **SaveToCloudDialog** as a practical example.

### Step 1: Set Up Dialog Frame

1. **Go to "Dialogs" page**
2. **Place Dialog Overlay** (use component from library)
3. **Place Dialog Content** (size: custom 425px width)
   - Variant: Size = custom
   - Set width to 425px manually

### Step 2: Build Header

1. **Add DialogHeader component**
2. **Configure:**
   - Title: "Save to Cloud"
   - Description: "Save your project to access it anywhere"
   - Text align: center

### Step 3: Build Form Fields

**Inside Dialog Content (after header):**

1. **Create form container:**
   ```
   Auto Layout (Vertical)
   - Gap: 16px (space-y-4)
   - Padding: 0
   ```

2. **Add field 1 - Project Name:**
   ```
   Auto Layout (Vertical)
   - Gap: 8px (space-y-2)
   
   Children:
   - Label component: "Project Name"
   - Input component: 
     - Placeholder: "My ASCII Animation"
     - Icon Left: false
   ```

3. **Add field 2 - Description (optional):**
   ```
   Auto Layout (Vertical)
   - Gap: 8px
   
   Children:
   - Label component: "Description (optional)"
   - Textarea component:
     - Placeholder: "Describe your project..."
     - Height: 80px
   ```

### Step 4: Build Footer

1. **Add DialogFooter component**
2. **Add buttons:**
   - Cancel Button:
     - Variant: outline
     - Label: "Cancel"
   - Save Button:
     - Variant: default
     - Icon Left: true (Cloud icon)
     - Label: "Save"

### Step 5: Add Loading State (Optional)

**Create variant for loading state:**
1. Duplicate dialog
2. Add Progress component above footer
3. Disable buttons
4. Show loading spinner in Save button

### Step 6: Apply Final Touches

1. **Check spacing:**
   - Ensure consistent 16px gaps
   - 24px padding on DialogContent

2. **Test with grid:**
   - Verify alignment to 4px grid

3. **Add soft border:**
   - Apply `border-soft` color style

4. **Create dark mode variant:**
   - Switch all color styles to `dark/` variants

---

## Phase 3: Additional Dialogs

Now that you have the base system, creating more dialogs is faster.

### Template: Export Settings Dialog

**Example: VideoExportDialog**

1. **Use Dialog component (size: lg, 512px)**
2. **Set custom layout:**
   - Remove default padding (p-0 pattern)
   - Build custom structure:

   ```
   Sticky Header (px-6 pt-6 pb-4, border-b):
   - DialogTitle with Video icon
   
   Sticky Filename Section (px-6 py-4, border-b):
   - Label + Input
   - Progress component (conditional)
   
   Scrollable Settings (flex-1, overflow-y-auto, px-6 py-4):
   - Card with settings groups
   - Space-y-4 between groups
   
   Sticky Footer (px-6 py-4, border-t):
   - Export button
   ```

3. **Build settings sections as Cards:**
   ```
   Card
   - CardHeader: "Video Settings" with Settings icon
   - CardContent:
     - Auto Layout (Vertical), gap: 16px
     - Individual setting rows
   ```

### Template: List Management Dialog

**Example: ProjectsDialog**

1. **Use Dialog component (size: 4xl, 896px)**
2. **Set max height: 80vh**
3. **Structure:**

   ```
   DialogHeader:
   - Title: "My Projects"
   - Description: "Manage your cloud projects"
   
   Search Bar (px-6 py-4):
   - Input with Search icon
   
   ScrollArea (flex-1, px-6):
   - Grid (3 columns on desktop, 2 on tablet, 1 on mobile)
   - Gap: 16px
   - Each item: ProjectCard component
   
   Footer (px-6 py-4, border-t):
   - Upload button
   ```

4. **Create ProjectCard component:**
   ```
   Card (hover effect)
   - CardHeader:
     - Title + DropdownMenu
   - CardContent:
     - Preview image/canvas
     - Metadata (date, description)
   - CardFooter:
     - Open button
   ```

---

## Phase 4: Using Figma MCP Tools

### Step 1: Get Node ID

**In Figma:**
1. Select your dialog component
2. Copy link: Right-click → "Copy link to selection"
3. Extract node ID from URL:
   ```
   https://figma.com/design/ABC123/ASCII-Motion?node-id=123-456
   
   Node ID: 123:456 (or 123-456)
   ```

### Step 2: Generate React Code

**Using Copilot with Figma MCP:**

```
Prompt: "Generate React code for my SaveToCloudDialog design at node ID 123:456. 
Use TypeScript, Tailwind CSS, and match the shadcn/ui dialog pattern."
```

**You'll receive:**
- Component structure
- Tailwind classes
- Basic TypeScript interface

### Step 3: Compare with Existing Code

**Side-by-side comparison:**

1. Open generated code
2. Open your current `SaveToCloudDialog.tsx`
3. Look for improvements:
   - Better spacing combinations
   - More semantic class usage
   - Layout optimizations
   - Accessibility improvements

### Step 4: Extract Improvements

**Example changes you might adopt:**

```tsx
// Old
<div className="space-y-4">
  <Label>Name</Label>
  <Input />
</div>

// New (from Figma)
<div className="space-y-2">
  <Label htmlFor="name" className="text-sm font-medium">
    Project Name
  </Label>
  <Input 
    id="name"
    className="h-10"
    aria-label="Project name"
  />
</div>
```

### Step 5: Map Components (Optional)

**Create persistent mapping:**

```
Use: mcp_figma_add_code_connect_map
- componentName: "SaveToCloudDialog"
- source: "src/components/features/SaveToCloudDialog.tsx"
- nodeId: "123:456"
```

**Benefits:**
- Easy reference between design and code
- Documentation of component relationships
- Quick navigation

---

## 🎨 Design Iteration Tips

### Visual Experimentation

**Try these variations in Figma:**

1. **Spacing:**
   - Increase form field gap from 16px → 24px
   - Test different padding values
   - Try tighter or looser layouts

2. **Typography:**
   - Larger dialog titles (20px instead of 18px)
   - Different font weights
   - Adjusted line heights

3. **Colors:**
   - Softer borders (lower opacity)
   - Different accent colors for CTAs
   - Muted backgrounds for sections

4. **Layout:**
   - Two-column forms for wide dialogs
   - Horizontal button layouts
   - Icon placement variations

5. **Hierarchy:**
   - Stronger visual separation between sections
   - Card borders vs. background differences
   - Sticky section shadows

### A/B Testing

**Create variants:**
1. Duplicate dialog
2. Name: "SaveToCloudDialog - Variant A"
3. Make changes
4. Compare side-by-side
5. Get feedback (if working with team)

### Mobile Testing

**Create mobile viewport:**
1. Frame: 375px wide (iPhone SE)
2. Test dialog at mobile size
3. Adjust spacing, font sizes
4. Test button layouts (stack vertically)

---

## 🔄 Workflow Summary

### Quick Iteration Cycle

```
1. Tweak design in Figma (5-10 min)
   ↓
2. Generate code with MCP (1 min)
   ↓
3. Compare and extract improvements (5 min)
   ↓
4. Update React component (10-15 min)
   ↓
5. Test in browser (5 min)
   ↓
6. Repeat or move to next dialog
```

### Batch Processing

**Efficient approach for multiple dialogs:**

1. **Week 1: Design**
   - Recreate 5-6 dialogs in Figma
   - Experiment with variations
   - Finalize designs

2. **Week 2: Implementation**
   - Generate code for all dialogs
   - Extract improvements
   - Update React components in batches
   - Test and refine

---

## 📊 Progress Tracking

### Checklist: Design System Setup

- [ ] Color styles created (light theme)
- [ ] Color styles created (dark theme)
- [ ] Typography styles created
- [ ] Layout grid configured
- [ ] Button component built
- [ ] Input component built
- [ ] Label component built
- [ ] Card component built
- [ ] Dialog component built
- [ ] Additional components as needed

### Checklist: Dialog Recreation

**High Priority:**
- [ ] SaveToCloudDialog
- [ ] SignInDialog
- [ ] ProjectsDialog
- [ ] VideoExportDialog

**Medium Priority:**
- [ ] AboutDialog
- [ ] KeyboardShortcutsDialog
- [ ] ManagePalettesDialog
- [ ] ImageExportDialog

**Low Priority:**
- [ ] Other export dialogs
- [ ] Time effect dialogs

---

## 🐛 Troubleshooting

### Issue: Colors Don't Match

**Solution:**
- Double-check HSL values
- Ensure opacity is correct (especially for border-soft)
- Test in both light and dark modes

### Issue: Spacing Feels Off

**Solution:**
- Verify 4px grid alignment
- Check Auto Layout gaps
- Compare with browser DevTools measurements

### Issue: Component Variants Not Working

**Solution:**
- Check component property configuration
- Verify variant naming matches
- Test each variant individually

### Issue: Generated Code Doesn't Match shadcn/ui

**Solution:**
- Add context in prompt: "Use shadcn/ui patterns"
- Manually adjust generated code
- Focus on extracting layout/spacing improvements only

---

## 📚 Additional Resources

### Figma Resources
- Auto Layout guide: figma.com/best-practices/everything-you-need-to-know-about-layout-grids/
- Component properties: figma.com/blog/component-properties/
- Variants: figma.com/blog/how-to-use-variants/

### Design System References
- shadcn/ui components: ui.shadcn.com
- Radix UI (underlying components): radix-ui.com
- Tailwind CSS docs: tailwindcss.com

### Your Codebase
- `/src/components/ui/` - shadcn components
- `/docs/DIALOG_COMPONENT_AUDIT.md` - Component analysis
- `/docs/FIGMA_DESIGN_SYSTEM_SETUP.md` - Design tokens

---

## 🎯 Next Steps

1. **Set up your Figma file** using Phase 1
2. **Create your first dialog** using Phase 2
3. **Generate code** using Figma MCP
4. **Update your React component** with improvements
5. **Document your learnings** for future dialogs
6. **Iterate** on remaining dialogs

---

**Ready to start?** Begin with Phase 1: Design System Setup!
