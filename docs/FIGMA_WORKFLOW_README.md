# Figma ↔ React Design Workflow Documentation

> **Complete documentation package for redesigning ASCII Motion dialogs using Figma and syncing back to React**

---

## 📚 Documentation Overview

This package contains everything you need to iterate on your dialog designs visually in Figma, then sync improvements back to your React codebase using Figma MCP tools.

---

## 🗂️ Documents

### 🎯 [Master Guide](./FIGMA_REACT_DIALOG_REDESIGN_MASTER_GUIDE.md) - **START HERE**

**Your main roadmap** for the entire redesign workflow.

- Overview of the problem and solution
- Links to all detailed guides
- Step-by-step weekly workflow
- Quick start paths
- Progress tracking checklists
- Best practices and common issues

**Read this first** to understand the complete workflow and choose your path.

---

### 📊 [Dialog Component Audit](./DIALOG_COMPONENT_AUDIT.md)

**Analysis of your current 26 dialog components.**

- Complete inventory by category
- Common patterns and layouts
- Spacing and responsive patterns
- Visual design patterns
- Component dependencies
- Recommendations for improvements

**Read this before designing** to understand what you currently have.

**Key Stats:**
- 26 total dialogs analyzed
- 5 distinct pattern categories
- 8 common size variants
- ~8,500+ lines of dialog code

---

### 🎨 [Design System Setup](./FIGMA_DESIGN_SYSTEM_SETUP.md)

**Complete reference for design tokens and component specifications.**

- Full color system (light + dark themes)
  - Exact HSL/HEX values for all colors
  - Semantic color naming
- Typography scale with sizes and weights
- Spacing system (4px grid)
- Border radius values
- Shadow specifications
- Complete component specs
  - Button variants and states
  - Input, Label, Textarea
  - Card components
  - Dialog structure
- Dialog size reference table
- Common layout patterns

**Use this during Figma setup** as your design token reference.

**Contains:**
- 30+ color tokens (light + dark)
- 7 typography sizes
- 20+ spacing values
- Complete Dialog component spec

---

### 🧩 [Component Recreation Guide](./FIGMA_COMPONENT_RECREATION_GUIDE.md)

**Step-by-step instructions for building your design system in Figma.**

**Phase 1: Design System Setup**
- Create color styles
- Set up typography
- Configure layout grid
- Build base components (Button, Input, Card, Dialog, etc.)

**Phase 2: First Dialog**
- Complete walkthrough of SaveToCloudDialog
- Form fields, header, footer
- Loading states
- Dark mode variant

**Phase 3: Additional Dialogs**
- Templates for different dialog types
- Export settings dialogs
- List management dialogs
- Documentation dialogs

**Phase 4: Using Figma MCP Tools**
- Getting node IDs
- Generating code
- Comparing with existing components
- Mapping components

**Use this while building** in Figma, step by step.

**Time Estimates:**
- Phase 1: 1-2 hours (one time)
- Phase 2: 30-60 minutes
- Phase 3: 15-30 minutes per dialog

---

### 🔧 [MCP Workflow Guide](./FIGMA_MCP_WORKFLOW_GUIDE.md)

**Quick reference for using Figma MCP tools to sync designs with code.**

**All 6 MCP Tools:**
1. `mcp_figma_get_code` - Generate React code ⭐ Most used
2. `mcp_figma_get_metadata` - Get structure overview
3. `mcp_figma_add_code_connect_map` - Link design to code
4. `mcp_figma_get_code_connect_map` - View mappings
5. `mcp_figma_get_screenshot` - Capture design image
6. `mcp_figma_get_variable_defs` - Extract design tokens

**Common Workflows:**
- Design → Code (simple dialog)
- Complex dialog with custom layout
- Batch update multiple dialogs
- Design tokens extraction

**Includes:**
- Pro tips
- Troubleshooting
- Time estimates
- Quick reference card

**Use this when syncing** designs back to code.

---

## 🚀 Quick Start

### Option 1: Comprehensive Workflow (Recommended)

**For redesigning multiple dialogs with a full design system**

1. **Read the Master Guide** (15 min)
   - Understand the complete workflow
   - Choose your learning path

2. **Read the Audit** (30 min)
   - `DIALOG_COMPONENT_AUDIT.md`
   - Understand current state

3. **Set Up Figma** (2 hours)
   - Follow `FIGMA_COMPONENT_RECREATION_GUIDE.md` Phase 1
   - Use `FIGMA_DESIGN_SYSTEM_SETUP.md` for reference

4. **Create First Dialog** (1 hour)
   - Follow Phase 2 of recreation guide
   - Build SaveToCloudDialog

5. **Sync to Code** (30 min)
   - Use `FIGMA_MCP_WORKFLOW_GUIDE.md`
   - Generate code and update React

6. **Iterate** (ongoing)
   - Repeat for more dialogs
   - Refine as you learn

---

### Option 2: Quick Iteration (Fast)

**For quick improvements to 1-2 specific dialogs**

1. **Read MCP Workflow** (15 min)
   - `FIGMA_MCP_WORKFLOW_GUIDE.md`
   - Understand the tools

2. **Screenshot Current Dialog** (5 min)
   - Take from your running app

3. **Design in Figma** (30-60 min)
   - Use screenshot as reference
   - Apply improvements

4. **Generate & Apply Code** (30 min)
   - Use Figma MCP
   - Extract improvements
   - Update React component

**Total Time:** 1-2 hours per dialog

---

## 📋 Reading Order

### For Beginners

1. ✅ [Master Guide](./FIGMA_REACT_DIALOG_REDESIGN_MASTER_GUIDE.md) - Overview
2. ✅ [Dialog Audit](./DIALOG_COMPONENT_AUDIT.md) - Current state
3. ✅ [Component Recreation](./FIGMA_COMPONENT_RECREATION_GUIDE.md) - How to build
4. ✅ [Design System](./FIGMA_DESIGN_SYSTEM_SETUP.md) - Reference while building
5. ✅ [MCP Workflow](./FIGMA_MCP_WORKFLOW_GUIDE.md) - Tool usage

### For Advanced Users

1. ✅ [Master Guide](./FIGMA_REACT_DIALOG_REDESIGN_MASTER_GUIDE.md) - Skim for workflow
2. ✅ [Dialog Audit](./DIALOG_COMPONENT_AUDIT.md) - Quick review
3. ✅ [Design System](./FIGMA_DESIGN_SYSTEM_SETUP.md) - Bookmark for reference
4. ✅ [MCP Workflow](./FIGMA_MCP_WORKFLOW_GUIDE.md) - Focus on workflows
5. ✅ [Component Recreation](./FIGMA_COMPONENT_RECREATION_GUIDE.md) - As needed

---

## 🎯 What Each Document Is Best For

| Document | Best For | When to Use |
|----------|----------|-------------|
| **Master Guide** | Understanding the complete workflow | First read, planning |
| **Dialog Audit** | Seeing what you currently have | Before designing |
| **Design System** | Design token reference | During Figma setup |
| **Component Recreation** | Step-by-step building instructions | While creating in Figma |
| **MCP Workflow** | Tool reference and quick tips | When syncing to code |

---

## 💡 Key Concepts

### The Workflow

```
Current React Dialogs
    ↓
Analyze Patterns (Dialog Audit)
    ↓
Recreate in Figma (Component Recreation + Design System)
    ↓
Iterate & Improve Visually
    ↓
Generate Code (MCP Workflow)
    ↓
Extract Improvements
    ↓
Update React Components
    ↓
Test & Refine
```

### What You'll Learn

- **Design System Thinking:** Consistent tokens and components
- **Figma Skills:** Auto Layout, components, variants
- **MCP Tools:** Figma-to-code generation
- **Workflow Optimization:** Efficient design iteration
- **Pattern Recognition:** Common dialog structures

### What You'll Produce

- **Figma Design System:** Reusable components and tokens
- **Improved Dialogs:** Better spacing, layout, hierarchy
- **Updated React Code:** Enhanced components
- **Documentation:** Component mappings and decisions

---

## 📊 Stats & Scope

### Current State (Analyzed)
- **26 dialogs** across the application
- **5 major categories** of dialog patterns
- **8 size variants** (from 425px to 1024px wide)
- **~8,500 lines** of dialog code
- **30+ components** used across dialogs

### Design System (To Build)
- **30+ color tokens** (light + dark themes)
- **7 typography styles**
- **20+ spacing values**
- **6 base components** (Button, Input, Label, Card, Dialog, etc.)
- **26 dialog designs** (optional - can do subset)

### Time Investment
- **Setup:** 2-3 hours (one time)
- **Per dialog:** 35-70 minutes average
- **Complete redesign:** 20-40 hours total (all dialogs)
- **Subset (5-8 dialogs):** 8-12 hours

---

## 🔍 FAQ

### Q: Do I need to recreate all 26 dialogs?

**A:** No! Start with 3-5 priority dialogs. The Master Guide suggests:
- SaveToCloudDialog (simple form)
- SignInDialog (auth pattern)
- ProjectsDialog (complex list)
- VideoExportDialog (settings)

### Q: Can I skip the design system setup?

**A:** For quick iteration on 1-2 dialogs, yes. But for comprehensive redesign, the design system saves time in the long run.

### Q: Will the MCP tools generate perfect React code?

**A:** No. They generate good starting code, but you should:
- Extract layout/spacing improvements only
- Keep your existing logic and state management
- Manually integrate the improvements
- Focus on class combinations and structure

### Q: What if I'm not a designer?

**A:** These guides assume no design background! They provide:
- Exact color values and sizes
- Step-by-step instructions
- Component specifications
- Common patterns to follow

### Q: How do I handle dark mode?

**A:** The Design System Setup includes both light and dark theme tokens. Create both variants in Figma and test before implementing.

---

## 🎨 Examples Included

### Complete Walkthroughs

1. **SaveToCloudDialog**
   - Simple form pattern
   - Header, fields, footer
   - Step-by-step build

2. **VideoExportDialog**
   - Complex settings pattern
   - Custom layout (p-0)
   - Sticky sections
   - Scrollable content

3. **ProjectsDialog**
   - List management pattern
   - Grid layout
   - Card components
   - Search/filter

---

## 🛠️ Tools You'll Use

### Required
- **Figma** (free account works)
- **Figma Desktop App** (recommended for MCP)
- **Your codebase** (ASCII Motion)
- **These documentation files**

### Optional
- **Figma plugins:** Auto Layout visualizer, Color contrast checker
- **Browser DevTools:** For comparing designs to implementation
- **Git:** For tracking changes and rolling back if needed

---

## 📈 Success Metrics

You'll know you're succeeding when:

**Design Quality:**
- ✅ Consistent spacing across all dialogs
- ✅ Better visual hierarchy
- ✅ Polished, professional appearance
- ✅ Works well in both light and dark modes

**Workflow Efficiency:**
- ✅ Can iterate on designs in minutes, not hours
- ✅ Clear process for making changes
- ✅ Easy to test variations
- ✅ Smooth sync from design to code

**Code Quality:**
- ✅ Cleaner, more semantic class names
- ✅ Better responsive behavior
- ✅ Improved accessibility
- ✅ More maintainable

**User Experience:**
- ✅ Dialogs feel cohesive across the app
- ✅ Better mobile experience
- ✅ Easier to use and understand
- ✅ More accessible to all users

---

## 🚦 Current Status

**Documentation:** ✅ Complete
- [x] Master Guide
- [x] Dialog Component Audit
- [x] Design System Setup
- [x] Component Recreation Guide
- [x] MCP Workflow Guide
- [x] This README

**Next Steps:** Ready for you!
- [ ] Choose your path (comprehensive or quick)
- [ ] Read the Master Guide
- [ ] Set up Figma
- [ ] Create first dialog
- [ ] Generate and sync code

---

## 📞 Additional Resources

### In This Repo
- **Dialog Components:** `src/components/features/*Dialog.tsx`
- **UI Components:** `src/components/ui/`
- **Tailwind Config:** `tailwind.config.js`
- **CSS Variables:** `src/index.css`
- **Development Docs:** `docs/`

### External
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Radix UI Primitives](https://radix-ui.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Figma Help Center](https://help.figma.com)
- [Figma Auto Layout Guide](https://help.figma.com/hc/en-us/articles/360040451373)

---

## 🎉 Ready to Start?

1. **Open:** [FIGMA_REACT_DIALOG_REDESIGN_MASTER_GUIDE.md](./FIGMA_REACT_DIALOG_REDESIGN_MASTER_GUIDE.md)
2. **Choose:** Your path (comprehensive or quick)
3. **Begin:** Following the workflow
4. **Iterate:** Improve your dialogs visually
5. **Enjoy:** A better design workflow!

**You've got everything you need. Let's go! 🚀**

---

**Created:** 2025-10-14  
**Version:** 1.0  
**Total Pages:** 5 comprehensive guides  
**Total Words:** ~25,000+  
**Status:** Ready to use
