# Figma MCP Workflow Guide

> **Quick reference for using Figma MCP tools to sync designs with code**

---

## 🚀 Quick Start

The Figma MCP (Model Context Protocol) integration allows you to generate React code from Figma designs and create mappings between design and code components.

---

## 📋 Available Tools

### 1. `mcp_figma_get_code` ⭐ Most Used

**Purpose:** Generate React/TypeScript code from Figma designs

**When to use:**
- After finalizing a dialog design in Figma
- When you want to see code structure
- To extract layout and styling improvements

**What you need:**
- Node ID from Figma (e.g., `123:456` or `123-456`)

**How to get Node ID:**

**Method 1: From URL**
```
1. Select your component in Figma
2. Right-click → "Copy link to selection"
3. Extract from URL:
   https://figma.com/design/fileKey/fileName?node-id=123-456
   
   Node ID = "123:456" or "123-456"
```

**Method 2: From Inspector**
```
1. Select component
2. Look in right panel under "Selection"
3. You'll see the node ID displayed
```

**Example Prompt:**
```
Use mcp_figma_get_code to generate React code for my SaveToCloudDialog 
at node ID 123:456. Use TypeScript and Tailwind CSS matching shadcn/ui patterns.
```

**What you get:**
```tsx
// Component structure
export function SaveToCloudDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save to Cloud</DialogTitle>
          {/* ... */}
        </DialogHeader>
        {/* Form fields */}
        <DialogFooter>
          {/* Buttons */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**How to use it:**
1. Compare with your existing code
2. Look for better class combinations
3. Check spacing/sizing improvements
4. Extract layout patterns
5. Don't copy-paste wholesale - cherry-pick improvements

---

### 2. `mcp_figma_get_metadata`

**Purpose:** Get structure overview without generating full code

**When to use:**
- Quick inspection of component hierarchy
- Finding child node IDs
- Understanding layer structure

**Example Prompt:**
```
Use mcp_figma_get_metadata to inspect the structure of node 123:456
```

**What you get:**
```xml
<Frame id="123:456" name="SaveToCloudDialog" type="FRAME" x="100" y="100" width="425" height="400">
  <Frame id="123:457" name="DialogHeader" type="FRAME">
    <Text id="123:458" name="Title">Save to Cloud</Text>
  </Frame>
  <Frame id="123:459" name="FormFields" type="FRAME">
    <!-- ... -->
  </Frame>
</Frame>
```

**Use cases:**
- Finding specific element IDs
- Understanding nesting structure
- Quick sanity check

---

### 3. `mcp_figma_add_code_connect_map`

**Purpose:** Create a persistent link between Figma component and React file

**When to use:**
- After finalizing a dialog design
- For documentation purposes
- To enable easy navigation between design and code

**What you need:**
- Component name (React component name)
- Source file path
- Node ID

**Example Prompt:**
```
Use mcp_figma_add_code_connect_map to link:
- Component: "SaveToCloudDialog"
- Source: "src/components/features/SaveToCloudDialog.tsx"
- Node ID: "123:456"
```

**Benefits:**
- Creates documentation of design-code relationships
- Easy reference for future updates
- Team collaboration

---

### 4. `mcp_figma_get_code_connect_map`

**Purpose:** View existing component mappings

**When to use:**
- Check what components are already mapped
- Find the Figma node for a React component
- Audit existing connections

**Example Prompt:**
```
Use mcp_figma_get_code_connect_map to see existing mappings for node 123:456
```

**What you get:**
```json
{
  "123:456": {
    "codeConnectSrc": "src/components/features/SaveToCloudDialog.tsx",
    "codeConnectName": "SaveToCloudDialog"
  }
}
```

---

### 5. `mcp_figma_get_screenshot`

**Purpose:** Generate PNG screenshot of design

**When to use:**
- Documentation
- Design reviews
- Before/after comparisons
- README images

**Example Prompt:**
```
Use mcp_figma_get_screenshot to capture node 123:456
```

**What you get:**
- PNG image of the selected component

---

### 6. `mcp_figma_get_variable_defs`

**Purpose:** Get design variables (colors, typography, etc.) from Figma

**When to use:**
- Extracting design tokens
- Syncing color palettes
- Getting spacing values

**Example Prompt:**
```
Use mcp_figma_get_variable_defs for node 123:456
```

**What you get:**
```json
{
  "colors/primary": "#A626F8",
  "spacing/lg": "24px",
  "radius/md": "6px"
}
```

---

## 🔄 Common Workflows

### Workflow 1: Design → Code (Simple Dialog)

**Scenario:** You've designed SaveToCloudDialog in Figma and want to improve your React component.

**Steps:**

1. **Get Node ID**
   ```
   Select dialog in Figma → Copy link → Extract node ID
   Example: 123:456
   ```

2. **Generate Code**
   ```
   Prompt: "Generate React code for SaveToCloudDialog at node 123:456 
   using TypeScript and Tailwind CSS"
   ```

3. **Review Generated Code**
   - Check DialogContent className
   - Look at spacing patterns (space-y-X)
   - Review button layouts
   - Note any accessibility improvements

4. **Compare with Current Code**
   ```tsx
   // Your current code
   <DialogContent className="max-w-md">
   
   // Generated suggestion
   <DialogContent className="sm:max-w-[425px] border-border/50">
   ```

5. **Apply Improvements**
   ```tsx
   // Update your component
   <DialogContent className="sm:max-w-[425px] border-border/50">
     <DialogHeader className="space-y-3"> {/* Was space-y-2 */}
       <DialogTitle className="text-center">Save to Cloud</DialogTitle>
       <DialogDescription className="text-center text-sm">
         Save your project to access it anywhere
       </DialogDescription>
     </DialogHeader>
     {/* ... */}
   </DialogContent>
   ```

6. **Test in Browser**
   - Verify changes look correct
   - Check responsive behavior
   - Test dark mode

7. **Map Component (Optional)**
   ```
   Prompt: "Map this component:
   - Name: SaveToCloudDialog
   - File: src/components/features/SaveToCloudDialog.tsx
   - Node: 123:456"
   ```

---

### Workflow 2: Complex Dialog with Custom Layout

**Scenario:** Redesigning VideoExportDialog with sticky header/footer.

**Steps:**

1. **Create in Figma**
   - Use p-0 pattern (no default padding)
   - Build custom sections with px-6 py-4
   - Add borders between sections

2. **Get Code**
   ```
   Prompt: "Generate code for VideoExportDialog at node 456:789
   with custom layout structure (p-0 pattern)"
   ```

3. **Extract Layout Pattern**
   ```tsx
   // Generated structure
   <DialogContent className="max-w-lg p-0 overflow-hidden">
     <DialogHeader className="px-6 pt-6 pb-4 border-b bg-background">
       {/* Title */}
     </DialogHeader>
     
     <div className="flex flex-col max-h-[80vh]">
       <div className="sticky top-0 z-10 bg-background px-6 py-4 border-b">
         {/* Filename input */}
       </div>
       
       <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
         {/* Settings */}
       </div>
       
       <div className="sticky bottom-0 px-6 py-4 border-t bg-background">
         {/* Export button */}
       </div>
     </div>
   </DialogContent>
   ```

4. **Apply to React Component**
   - Use the exact class structure
   - Maintain z-index layering
   - Keep sticky positioning

---

### Workflow 3: Batch Update Multiple Dialogs

**Scenario:** You've standardized 5 dialogs in Figma and want to update code.

**Steps:**

1. **Create Mapping List**
   ```
   SaveToCloudDialog:    123:456
   SignInDialog:         123:457
   ProjectsDialog:       123:458
   VideoExportDialog:    123:459
   AboutDialog:          123:460
   ```

2. **Generate Code for Each**
   ```
   Prompt: "Generate code for all these dialogs:
   1. SaveToCloudDialog (123:456)
   2. SignInDialog (123:457)
   3. ProjectsDialog (123:458)
   4. VideoExportDialog (123:459)
   5. AboutDialog (123:460)"
   ```

3. **Create Comparison Document**
   - For each dialog, note:
     - Changed class combinations
     - Spacing updates
     - Layout improvements
     - New patterns

4. **Update Components in Order**
   - Start with simplest (SaveToCloudDialog)
   - Test each before moving to next
   - Commit after each successful update

5. **Map All Components**
   ```
   Create mappings for all 5 dialogs for future reference
   ```

---

### Workflow 4: Design Tokens Extraction

**Scenario:** You've defined colors in Figma variables and want to sync to code.

**Steps:**

1. **Get Variables**
   ```
   Prompt: "Extract design variables from node 123:456"
   ```

2. **Compare with Tailwind Config**
   ```javascript
   // Figma variables
   colors/primary: #A626F8
   
   // tailwind.config.js
   primary: "hsl(var(--primary))"
   
   // index.css
   --primary: 270 95% 60%  // = #A626F8 ✓
   ```

3. **Update if Needed**
   - Sync any discrepancies
   - Update CSS variables
   - Test both themes

---

## 💡 Pro Tips

### Tip 1: Always Provide Context

**Instead of:**
```
"Generate code for node 123:456"
```

**Better:**
```
"Generate React code for SaveToCloudDialog at node 123:456.
Use TypeScript, Tailwind CSS, and match shadcn/ui Dialog patterns.
This is a simple form dialog with name/description fields."
```

**Why:** More context = better code generation matching your needs.

---

### Tip 2: Focus on Layout, Not Logic

**Generated code is best for:**
- ✅ Class combinations
- ✅ Spacing patterns
- ✅ Layout structure
- ✅ Responsive breakpoints

**Generated code needs work on:**
- ❌ State management
- ❌ Event handlers
- ❌ Business logic
- ❌ API calls

**Extract layout improvements, keep your logic.**

---

### Tip 3: Use Metadata for Quick Checks

**Before generating full code:**
```
Use mcp_figma_get_metadata to check structure
```

**Benefits:**
- Faster than full code generation
- Verify component hierarchy
- Find specific element IDs
- Sanity check before committing to changes

---

### Tip 4: Screenshot for Documentation

**After finalizing a design:**
```
1. Generate screenshot
2. Add to docs/figma-designs/
3. Reference in component comments
```

**Example:**
```tsx
/**
 * SaveToCloudDialog
 * 
 * @figma https://figma.com/...?node-id=123-456
 * @screenshot docs/figma-designs/save-to-cloud-dialog.png
 */
export function SaveToCloudDialog({ open, onOpenChange }: Props) {
  // ...
}
```

---

### Tip 5: Iterate in Small Batches

**Don't:**
- Redesign all 26 dialogs in Figma
- Generate all code at once
- Try to update everything simultaneously

**Do:**
- Design 2-3 dialogs
- Generate and test each
- Learn from the process
- Repeat with next batch

---

## 🐛 Troubleshooting

### Issue: "Node not found"

**Problem:** Invalid node ID

**Solutions:**
- Double-check node ID format (123:456 or 123-456)
- Ensure you're selecting a component, not a group
- Try copying link again from Figma
- Verify Figma file is accessible

---

### Issue: Generated code doesn't match shadcn/ui

**Problem:** Generic React code instead of shadcn patterns

**Solutions:**
- Add more context to prompt
- Specify "shadcn/ui Dialog component"
- Mention Radix UI if needed
- Manually adapt the generated layout to shadcn patterns

---

### Issue: Code has wrong imports

**Problem:** Uses different UI library

**Solutions:**
- Specify import paths in prompt:
  ```
  "Import from '@/components/ui/dialog' and '@/components/ui/button'"
  ```
- Manually fix imports
- Focus on extracting class patterns, not import statements

---

### Issue: Can't find Figma file

**Problem:** MCP can't access the Figma file

**Solutions:**
- Ensure Figma Desktop App is running
- Check file sharing permissions
- Verify you're signed into Figma
- Try selecting component in Figma first

---

## 📊 Workflow Checklist

### For Each Dialog Redesign:

- [ ] Design/update dialog in Figma
- [ ] Get node ID
- [ ] Generate code with `mcp_figma_get_code`
- [ ] Compare with current implementation
- [ ] Extract improvements (classes, spacing, layout)
- [ ] Update React component
- [ ] Test in browser (light + dark mode)
- [ ] Test responsive behavior
- [ ] Map component with `mcp_figma_add_code_connect_map`
- [ ] Document changes
- [ ] Commit to git

---

## 🎯 Expected Time Investment

**Per Dialog:**
- Figma design/tweaks: 15-30 minutes
- Code generation: 1-2 minutes
- Code comparison: 5-10 minutes
- Implementation: 10-20 minutes
- Testing: 5-10 minutes

**Total:** 35-70 minutes per dialog

**First dialog will be slower** (learning curve), subsequent dialogs faster.

---

## 📚 Related Docs

- `FIGMA_DESIGN_SYSTEM_SETUP.md` - Complete design system reference
- `FIGMA_COMPONENT_RECREATION_GUIDE.md` - Step-by-step Figma setup
- `DIALOG_COMPONENT_AUDIT.md` - Current component analysis

---

## 🔗 Quick Reference Card

**Most Common Commands:**

```bash
# Generate code
"Generate React code for [ComponentName] at node [ID]"

# Get structure
"Show metadata for node [ID]"

# Map component
"Map [ComponentName] to [FilePath] with node [ID]"

# Get screenshot
"Screenshot node [ID]"

# Extract variables
"Get design variables from node [ID]"
```

**Node ID Formats:**
- `123:456` ✓
- `123-456` ✓
- `123/456` ✗
- `node-123-456` ✗

**File Paths:**
- `src/components/features/SaveToCloudDialog.tsx` ✓
- `./src/components/features/SaveToCloudDialog.tsx` ✓
- `SaveToCloudDialog.tsx` ✗ (needs full path)

---

**Ready to start?** Try generating code for your first redesigned dialog!
