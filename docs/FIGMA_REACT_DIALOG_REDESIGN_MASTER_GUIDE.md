# Figma ↔ React Dialog Redesign - Master Guide

> **Complete workflow for iterating on dialog designs using Figma and syncing back to React code**

---

## 📖 Overview

This master guide provides everything you need to redesign your ASCII Motion dialogs using Figma, then sync improvements back to your React codebase using Figma MCP tools.

**What you'll achieve:**
- Visual iteration on dialog designs without touching code
- Consistent design system across all dialogs
- Better spacing, layout, and visual hierarchy
- Streamlined design-to-code workflow

**Time Investment:**
- Initial setup: 2-3 hours (one time)
- Per dialog: 35-70 minutes

---

## 🎯 The Problem & Solution

### The Problem

You can't directly export React components → Figma designs. The workflow is one-way:
- ❌ React → Figma (not possible with MCP)
- ✅ Figma → React (possible with MCP)

### The Solution

A three-phase workflow:
1. **Manual Recreation** - Recreate current dialogs in Figma based on code analysis
2. **Visual Iteration** - Experiment with designs in Figma
3. **Code Sync** - Use Figma MCP to generate code and extract improvements

---

## 📚 Documentation Structure

This master guide references four detailed documents:

### 1. [DIALOG_COMPONENT_AUDIT.md](./DIALOG_COMPONENT_AUDIT.md)

**Purpose:** Understand what you currently have

**Contents:**
- Analysis of all 26 dialog components
- Common patterns and layouts
- Component inventory by category
- Visual design patterns
- Spacing and responsive patterns

**When to read:** Before starting Figma work

**Key takeaways:**
- 5 distinct dialog categories
- 8 common size variants
- Standard layout patterns to replicate

---

### 2. [FIGMA_DESIGN_SYSTEM_SETUP.md](./FIGMA_DESIGN_SYSTEM_SETUP.md)

**Purpose:** Complete design token reference

**Contents:**
- Full color system (light + dark themes)
- Typography scale with exact values
- Spacing system (4px grid)
- Border radius values
- Component specifications
- Dialog patterns by category

**When to read:** During Figma setup phase

**Key takeaways:**
- Exact HSL/HEX color values
- All design tokens mapped to Tailwind
- Complete component sizing specs

---

### 3. [FIGMA_COMPONENT_RECREATION_GUIDE.md](./FIGMA_COMPONENT_RECREATION_GUIDE.md)

**Purpose:** Step-by-step Figma setup instructions

**Contents:**
- Phase 1: Design system setup
- Phase 2: First dialog creation (SaveToCloudDialog example)
- Phase 3: Additional dialogs
- Phase 4: Using Figma MCP tools
- Troubleshooting tips

**When to read:** While building in Figma

**Key takeaways:**
- Detailed component creation steps
- Auto Layout configurations
- Practical examples with screenshots
- Common pitfalls to avoid

---

### 4. [FIGMA_MCP_WORKFLOW_GUIDE.md](./FIGMA_MCP_WORKFLOW_GUIDE.md)

**Purpose:** Quick reference for MCP tools

**Contents:**
- All 6 MCP tools explained
- Common workflows
- Pro tips
- Troubleshooting
- Quick reference card

**When to read:** When syncing designs to code

**Key takeaways:**
- How to get node IDs
- Effective prompts for code generation
- What to extract from generated code
- Time-saving workflows

---

## 🚀 Getting Started - Quick Path

### Path A: Full Workflow (Recommended)

**For comprehensive redesign of multiple dialogs**

1. **Read the audit** (30 min)
   - `DIALOG_COMPONENT_AUDIT.md`
   - Understand current patterns

2. **Set up Figma** (2 hours)
   - Follow `FIGMA_COMPONENT_RECREATION_GUIDE.md` Phase 1
   - Create design system
   - Build base components

3. **Create first dialog** (1 hour)
   - Follow Phase 2 of recreation guide
   - Start with SaveToCloudDialog
   - Learn the process

4. **Generate & sync code** (30 min)
   - Use `FIGMA_MCP_WORKFLOW_GUIDE.md`
   - Extract improvements
   - Update React component

5. **Iterate** (ongoing)
   - Repeat for additional dialogs
   - Refine design system as needed

---

### Path B: Quick Start (Fast)

**For quick improvements to 1-2 dialogs**

1. **Skip full design system setup**
   - Just create the components you need

2. **Screenshot current dialog**
   - Take screenshot from your app
   - Import to Figma as reference

3. **Design on top of screenshot**
   - Use as guide for sizing/spacing
   - Apply improvements visually

4. **Generate code**
   - Use Figma MCP tools
   - Extract class improvements

5. **Update React component**
   - Apply spacing/layout changes
   - Test and iterate

**Time:** 1-2 hours per dialog

---

## 📋 Step-by-Step Workflow

### Week 1: Foundation

#### Day 1-2: Research & Setup (4-5 hours)

**Morning:**
1. Read `DIALOG_COMPONENT_AUDIT.md`
2. Identify priority dialogs (3-5 to start)
3. Note specific pain points with current designs

**Afternoon:**
1. Create Figma file
2. Set up color styles (light + dark)
3. Create typography styles
4. Configure layout grid

**Reference:** `FIGMA_DESIGN_SYSTEM_SETUP.md` - Design Tokens section

---

#### Day 3: Base Components (3-4 hours)

**Tasks:**
1. Create Button component with variants
2. Create Input component
3. Create Label component
4. Create Card component
5. Create Dialog base component

**Reference:** `FIGMA_COMPONENT_RECREATION_GUIDE.md` - Phase 1, Step 5

**Validation:**
- Test each component variant
- Verify colors match design tokens
- Check spacing against 4px grid

---

### Week 2: First Dialogs

#### Day 1: Simple Dialog (2-3 hours)

**Create SaveToCloudDialog:**

1. **Build structure** (45 min)
   - Use Dialog component
   - Add header with title/description
   - Build form fields
   - Add footer with buttons

2. **Refine design** (45 min)
   - Adjust spacing
   - Test different layouts
   - Try color variations
   - Create dark mode variant

3. **Generate code** (15 min)
   - Get node ID
   - Use `mcp_figma_get_code`
   - Review generated code

4. **Update React** (45 min)
   - Compare with current code
   - Extract improvements
   - Apply changes
   - Test in browser

**Reference:** `FIGMA_COMPONENT_RECREATION_GUIDE.md` - Phase 2

---

#### Day 2: Complex Dialog (3-4 hours)

**Create VideoExportDialog:**

1. **Build custom layout** (60 min)
   - p-0 pattern
   - Sticky header/footer
   - Scrollable middle section
   - Multiple settings groups

2. **Add components** (45 min)
   - Settings cards
   - Sliders, selects, checkboxes
   - Progress indicator
   - Export button states

3. **Generate & sync** (60 min)
   - Get code
   - Extract layout pattern
   - Update React component
   - Test scrolling behavior

**Reference:** `FIGMA_MCP_WORKFLOW_GUIDE.md` - Workflow 2

---

### Week 3: Batch Processing

#### Create Multiple Dialogs

**Efficient approach:**

1. **Design all in Figma first** (4-6 hours)
   - ProjectsDialog
   - AboutDialog
   - SignInDialog
   - KeyboardShortcutsDialog

2. **Generate code batch** (1 hour)
   - Get all node IDs
   - Generate code for each
   - Create comparison document

3. **Update components** (4-6 hours)
   - One at a time
   - Test each before moving on
   - Commit after each success

4. **Map all components** (30 min)
   - Use `mcp_figma_add_code_connect_map`
   - Create persistent references

**Reference:** `FIGMA_MCP_WORKFLOW_GUIDE.md` - Workflow 3

---

## 🎨 Design Iteration Tips

### Experiment Freely in Figma

**Try these variations:**

1. **Spacing Experiments**
   - Current: `space-y-4` (16px)
   - Try: `space-y-6` (24px)
   - Try: `space-y-3` (12px)
   - Compare side-by-side

2. **Layout Variations**
   - Single column vs. two-column forms
   - Different button arrangements
   - Card-based vs. flat layouts

3. **Typography Hierarchy**
   - Larger titles (20px vs. 18px)
   - Different font weights
   - Tighter or looser line heights

4. **Visual Depth**
   - Stronger shadows
   - More pronounced borders
   - Background color variations for sections

5. **Mobile Optimization**
   - Test at 375px width
   - Adjust padding for smaller screens
   - Stack elements vertically

### Create Variants

**For A/B testing:**

1. Duplicate dialog frame
2. Name: "DialogName - Variant A", "DialogName - Variant B"
3. Make changes
4. Compare side-by-side
5. Choose winner
6. Generate code for best version

---

## 🔄 Sync Process

### Every Dialog Update:

```
1. Design in Figma
   - Make changes
   - Test at different sizes
   - Verify dark mode
   
2. Get Node ID
   - Select component
   - Copy link
   - Extract ID
   
3. Generate Code
   - Use mcp_figma_get_code
   - Provide context in prompt
   - Review output
   
4. Compare
   - Open generated code
   - Open current React component
   - Highlight differences
   
5. Extract Improvements
   - Class combinations
   - Spacing patterns
   - Layout structure
   - Accessibility enhancements
   
6. Update React
   - Apply changes carefully
   - Keep existing logic
   - Update classes/structure only
   
7. Test
   - Light mode
   - Dark mode
   - Responsive behavior
   - Functionality unchanged
   
8. Document
   - Note what changed
   - Map component (optional)
   - Commit with clear message
```

---

## 📊 Progress Tracking

### Checklist: Foundation

**Design System:**
- [ ] Figma file created
- [ ] Color styles (light theme)
- [ ] Color styles (dark theme)
- [ ] Typography styles
- [ ] Layout grid
- [ ] Button component
- [ ] Input/Label/Textarea
- [ ] Card component
- [ ] Dialog component
- [ ] Additional UI components

---

### Checklist: Dialogs

**Priority 1 (High Use/Impact):**
- [ ] SaveToCloudDialog - Simple form
- [ ] SignInDialog - Auth pattern
- [ ] ProjectsDialog - Complex list
- [ ] VideoExportDialog - Settings pattern

**Priority 2 (Medium):**
- [ ] AboutDialog - Info pattern
- [ ] KeyboardShortcutsDialog - Documentation
- [ ] ManagePalettesDialog - List management
- [ ] ImageExportDialog - Export settings

**Priority 3 (Lower):**
- [ ] Other export dialogs
- [ ] Import dialogs
- [ ] Time effect dialogs
- [ ] Palette management dialogs

---

## 💡 Best Practices

### Do's ✅

1. **Start Small**
   - Begin with 1-2 simple dialogs
   - Learn the workflow
   - Then tackle complex ones

2. **Test Both Themes**
   - Always design in light AND dark
   - Verify colors work in both
   - Test before implementing

3. **Use Components**
   - Build reusable Figma components
   - Match React component structure
   - Maintain consistency

4. **Document Changes**
   - Note why you made changes
   - Keep design decisions recorded
   - Helps with future updates

5. **Iterate Incrementally**
   - Small improvements over time
   - Test each change
   - Don't redesign everything at once

6. **Focus on Layout**
   - Extract spacing/class improvements
   - Don't change business logic
   - Keep functionality intact

---

### Don'ts ❌

1. **Don't Copy-Paste Generated Code**
   - Use as reference only
   - Extract patterns, not everything
   - Keep your existing logic

2. **Don't Skip Testing**
   - Always test in browser
   - Check responsive behavior
   - Verify dark mode works

3. **Don't Over-Design**
   - Match existing shadcn/ui patterns
   - Don't deviate too far from system
   - Consistency > uniqueness

4. **Don't Rush**
   - Take time to understand patterns
   - Learn from each dialog
   - Quality > quantity

5. **Don't Forget Mobile**
   - Always test at mobile sizes
   - Dialogs should work on 375px screens
   - Responsive is not optional

---

## 🐛 Common Issues & Solutions

### Issue: "Too much work to recreate everything"

**Solution:** You don't have to!
- Start with 3-5 priority dialogs
- Get comfortable with workflow
- Expand over time
- Some dialogs may not need redesign

---

### Issue: "Generated code doesn't match my style"

**Solution:** That's expected!
- Focus on layout/spacing extraction
- Don't use generated code as-is
- Cherry-pick improvements only
- Keep your component structure

---

### Issue: "Design looks great in Figma, bad in browser"

**Solution:** Verify implementation
- Double-check class names
- Verify Tailwind config matches
- Test with browser DevTools
- Compare computed styles

---

### Issue: "Colors don't match exactly"

**Solution:** Check your tokens
- Verify HSL values in CSS
- Check Figma color styles
- Test in both light/dark modes
- Use browser color picker to compare

---

## 📈 Success Metrics

### How to know you're succeeding:

**Design Quality:**
- [ ] Consistent spacing across dialogs
- [ ] Better visual hierarchy
- [ ] Improved readability
- [ ] Polished appearance

**Workflow Efficiency:**
- [ ] Faster to iterate on designs
- [ ] Clear process for updates
- [ ] Easy to test variations
- [ ] Smooth sync to code

**Code Quality:**
- [ ] Cleaner class combinations
- [ ] Better responsive behavior
- [ ] Improved accessibility
- [ ] More maintainable

**User Experience:**
- [ ] Easier to use dialogs
- [ ] Better mobile experience
- [ ] More accessible
- [ ] Consistent feel across app

---

## 🎯 Next Actions

### Right Now:

1. **Choose your path:**
   - [ ] Path A: Full workflow (comprehensive)
   - [ ] Path B: Quick start (fast iteration)

2. **Read the right docs:**
   - [ ] `DIALOG_COMPONENT_AUDIT.md` (understand current state)
   - [ ] `FIGMA_DESIGN_SYSTEM_SETUP.md` (design tokens)
   - [ ] `FIGMA_COMPONENT_RECREATION_GUIDE.md` (setup steps)
   - [ ] `FIGMA_MCP_WORKFLOW_GUIDE.md` (tool reference)

3. **Set up your workspace:**
   - [ ] Create Figma file
   - [ ] Bookmark these docs
   - [ ] Schedule time blocks

---

### This Week:

1. **Foundation** (2-3 hours)
   - [ ] Set up color/typography styles
   - [ ] Create Button component
   - [ ] Create Dialog component

2. **First Dialog** (1-2 hours)
   - [ ] Choose simple dialog (SaveToCloudDialog)
   - [ ] Recreate in Figma
   - [ ] Experiment with improvements

3. **First Sync** (1 hour)
   - [ ] Generate code with MCP
   - [ ] Compare with existing
   - [ ] Update React component
   - [ ] Test and commit

---

### This Month:

1. **Complete 5-8 priority dialogs**
2. **Refine design system**
3. **Document learnings**
4. **Establish consistent patterns**
5. **Train team (if applicable)**

---

## 📚 Quick Reference

### Essential Reading Order:

1. **Before Figma:** `DIALOG_COMPONENT_AUDIT.md`
2. **During Setup:** `FIGMA_DESIGN_SYSTEM_SETUP.md`
3. **While Building:** `FIGMA_COMPONENT_RECREATION_GUIDE.md`
4. **When Syncing:** `FIGMA_MCP_WORKFLOW_GUIDE.md`

### Most Useful Sections:

- **Color values:** `FIGMA_DESIGN_SYSTEM_SETUP.md` → Design Tokens
- **Component specs:** `FIGMA_DESIGN_SYSTEM_SETUP.md` → Component Library
- **Layout patterns:** `DIALOG_COMPONENT_AUDIT.md` → Pattern Categories
- **Step-by-step Figma:** `FIGMA_COMPONENT_RECREATION_GUIDE.md` → Phase 1-3
- **MCP tools:** `FIGMA_MCP_WORKFLOW_GUIDE.md` → Available Tools

### Quick Command Reference:

```bash
# Generate code
"Generate React code for [DialogName] at node [ID] using TypeScript and Tailwind"

# Get structure
"Show metadata for node [ID]"

# Map component
"Map [DialogName] to src/components/features/[FileName].tsx at node [ID]"
```

---

## 🎓 Learning Path

### Beginner Track

**Week 1:** Setup + 1 simple dialog
- Follow guides exactly
- Don't customize yet
- Focus on learning workflow

**Week 2:** 2-3 more simple dialogs
- Apply learnings
- Start experimenting
- Find your rhythm

**Week 3:** 1 complex dialog
- Tackle custom layouts
- Work with ScrollArea
- Handle edge cases

---

### Advanced Track

**Week 1:** Setup + 3-4 dialogs
- Parallel design work
- Batch code generation
- Optimize workflow

**Week 2:** Remaining priority dialogs
- Establish patterns
- Create variants
- Document system

**Week 3:** Polish & edge cases
- Mobile optimization
- Accessibility improvements
- Final refinements

---

## 🎉 You're Ready!

You now have everything you need to:
1. ✅ Understand your current dialog components
2. ✅ Set up a complete design system in Figma
3. ✅ Recreate and improve your dialogs visually
4. ✅ Use Figma MCP tools to sync designs to code
5. ✅ Establish an efficient workflow for ongoing iteration

**Start with the smallest step:**
- Open `DIALOG_COMPONENT_AUDIT.md`
- Read about your current dialogs
- Choose your first one to redesign

**You've got this! 🚀**

---

## 📞 Reference Quick Links

- **Main Docs:**
  - [Dialog Audit](./DIALOG_COMPONENT_AUDIT.md)
  - [Design System Setup](./FIGMA_DESIGN_SYSTEM_SETUP.md)
  - [Component Recreation](./FIGMA_COMPONENT_RECREATION_GUIDE.md)
  - [MCP Workflow](./FIGMA_MCP_WORKFLOW_GUIDE.md)

- **Your Codebase:**
  - Dialog components: `src/components/features/*Dialog.tsx`
  - UI components: `src/components/ui/`
  - Tailwind config: `tailwind.config.js`
  - CSS variables: `src/index.css`

- **External Resources:**
  - [shadcn/ui](https://ui.shadcn.com)
  - [Radix UI](https://radix-ui.com)
  - [Tailwind CSS](https://tailwindcss.com)
  - [Figma Auto Layout](https://help.figma.com/hc/en-us/articles/360040451373)

---

**Last Updated:** 2025-10-14  
**Version:** 1.0  
**Status:** Ready to use
