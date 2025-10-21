# ASCII Motion Documentation

This directory contains comprehensive documentation for the ASCII Motion project, organized for both human developers and AI coding agents.

## 📁 **Documentation Structure**

### **🔐 Security & Deployment (NEW - October 2025)**
- **[`SECURITY_HEADERS_INDEX.md`](./SECURITY_HEADERS_INDEX.md)** - **START HERE: Navigation hub for all security documentation**
- [`COEP_CONFIGURATION_GUIDE.md`](./COEP_CONFIGURATION_GUIDE.md) - Complete COEP/COOP/CSP configuration guide for FFmpeg + iframes
- [`COEP_TROUBLESHOOTING_GUIDE.md`](./COEP_TROUBLESHOOTING_GUIDE.md) - Diagnostic flowchart and error solutions for COEP issues
- [`VERCEL_JSON_REFERENCE.md`](./VERCEL_JSON_REFERENCE.md) - Line-by-line explanation of vercel.json security headers
- [`OPEN_SOURCE_SECURITY_STRATEGY.md`](./OPEN_SOURCE_SECURITY_STRATEGY.md) - Open-source security architecture strategy
- [`SECURITY_REVIEW.md`](./SECURITY_REVIEW.md) - Security audit and review documentation

### **🎉 User Experience & Onboarding (NEW - October 2025)**
Documentation for the welcome dialog and first-time user experience is maintained in root-level files:
- [`../DEVELOPMENT.md`](../DEVELOPMENT.md) - See "Welcome Dialog - First-Time User Experience" section
- Implementation: `src/components/features/WelcomeDialog.tsx`, `src/hooks/useWelcomeDialog.ts`

### **🏗️ Monorepo & Project Structure (NEW - October 2025)**
- [`MONOREPO_SETUP_GUIDE.md`](./MONOREPO_SETUP_GUIDE.md) - Complete monorepo setup with Git submodules
- [`MONOREPO_SETUP_COMPLETE.md`](./MONOREPO_SETUP_COMPLETE.md) - Monorepo implementation summary
- [`MONOREPO_QUICK_REFERENCE.md`](./MONOREPO_QUICK_REFERENCE.md) - Quick reference for monorepo workflows
- [`GIT_SUBMODULE_SETUP.md`](./GIT_SUBMODULE_SETUP.md) - Git submodule setup and management
- [`PREMIUM_DOCS_MOVED.md`](./PREMIUM_DOCS_MOVED.md) - Premium feature documentation location guide

### **🎨 Design System & UI**
- [`FIGMA_WORKFLOW_README.md`](./FIGMA_WORKFLOW_README.md) - **START HERE: Complete Figma ↔ React dialog redesign workflow**
- [`FIGMA_REACT_DIALOG_REDESIGN_MASTER_GUIDE.md`](./FIGMA_REACT_DIALOG_REDESIGN_MASTER_GUIDE.md) - Master guide with weekly workflow plans
- [`FIGMA_WORKFLOW_IMPLEMENTATION_SUMMARY.md`](./FIGMA_WORKFLOW_IMPLEMENTATION_SUMMARY.md) - Figma workflow implementation summary
- [`DIALOG_COMPONENT_AUDIT.md`](./DIALOG_COMPONENT_AUDIT.md) - Analysis of all 26 dialog components with patterns
- [`DIALOG_CONSISTENCY_UPDATE.md`](./DIALOG_CONSISTENCY_UPDATE.md) - Dialog consistency improvements
- [`FIGMA_DESIGN_SYSTEM_SETUP.md`](./FIGMA_DESIGN_SYSTEM_SETUP.md) - Complete design token reference and specifications
- [`FIGMA_COMPONENT_RECREATION_GUIDE.md`](./FIGMA_COMPONENT_RECREATION_GUIDE.md) - Step-by-step Figma component creation
- [`FIGMA_MCP_WORKFLOW_GUIDE.md`](./FIGMA_MCP_WORKFLOW_GUIDE.md) - Figma MCP tools quick reference
- [`SHARED_UI_COMPONENTS_PATTERN.md`](./SHARED_UI_COMPONENTS_PATTERN.md) - Shared UI component patterns
- [`UI_COMPONENTS_DESIGN_SYSTEM.md`](./UI_COMPONENTS_DESIGN_SYSTEM.md) - UI components, design patterns, and panel standardization
- [`DRAGGABLE_PICKERS_IMPLEMENTATION.md`](./DRAGGABLE_PICKERS_IMPLEMENTATION.md) - Draggable picker dialog implementation
- [`TAB_ORDER_STRATEGY.md`](./TAB_ORDER_STRATEGY.md) - Keyboard navigation and tab order strategy

### **🎨 Effects System Documentation**
- [`EFFECTS_IMPLEMENTATION_SUMMARY.md`](./EFFECTS_IMPLEMENTATION_SUMMARY.md) - Production-ready effects system summary and technical overview
- [`EFFECTS_SYSTEM_IMPLEMENTATION.md`](./EFFECTS_SYSTEM_IMPLEMENTATION.md) - Complete effects system architecture and implementation patterns
- [`EFFECTS_SYSTEM_USER_GUIDE.md`](./EFFECTS_SYSTEM_USER_GUIDE.md) - Complete user guide for all effects with workflows and best practices
- [`EFFECTS_DEVELOPER_GUIDE.md`](./EFFECTS_DEVELOPER_GUIDE.md) - Step-by-step guide for adding new effects with code examples
- [`SCATTER_EFFECT_FINAL_IMPLEMENTATION.md`](./SCATTER_EFFECT_FINAL_IMPLEMENTATION.md) - Scatter effect implementation details
- [`SCATTER_BLEND_COLORS_FEATURE.md`](./SCATTER_BLEND_COLORS_FEATURE.md) - Scatter blend colors feature documentation
- [`TIME_EFFECTS_IMPLEMENTATION_PLAN.md`](./TIME_EFFECTS_IMPLEMENTATION_PLAN.md) - Time-based effects planning

### **🖼️ Media Import & Processing**
- [`MEDIA_IMPORT_ANALYSIS.md`](./MEDIA_IMPORT_ANALYSIS.md) - Media import system analysis
- [`MEDIA_IMPORT_FIXES_COMPLETE.md`](./MEDIA_IMPORT_FIXES_COMPLETE.md) - Media import bug fixes summary
- [`MEDIA_IMPORT_HISTORY_INTEGRATION.md`](./MEDIA_IMPORT_HISTORY_INTEGRATION.md) - History integration for media imports
- [`DITHERING_ANALYSIS_AND_PLAN.md`](./DITHERING_ANALYSIS_AND_PLAN.md) - Dithering algorithm analysis and planning
- [`DITHERING_IMPLEMENTATION_SUMMARY.md`](./DITHERING_IMPLEMENTATION_SUMMARY.md) - Dithering implementation summary
- [`DITHERING_QUICK_REFERENCE.md`](./DITHERING_QUICK_REFERENCE.md) - Dithering algorithms quick reference

### **📤 Export System**
- [`EXPORT_METADATA_AUDIT_COMPLETE.md`](./EXPORT_METADATA_AUDIT_COMPLETE.md) - Export metadata audit and improvements
- [`SVG_EXPORT_IMPLEMENTATION_PLAN.md`](./SVG_EXPORT_IMPLEMENTATION_PLAN.md) - SVG export system planning
- [`SVG_TEXT_TO_OUTLINES_IMPLEMENTATION_PLAN.md`](./SVG_TEXT_TO_OUTLINES_IMPLEMENTATION_PLAN.md) - OpenType.js integration plan
- [`SVG_TEXT_TO_OUTLINES_IMPLEMENTATION_SUMMARY.md`](./SVG_TEXT_TO_OUTLINES_IMPLEMENTATION_SUMMARY.md) - Implementation summary and testing guide
- [`REACT_COMPONENT_EXPORT_IMPLEMENTATION_PLAN.md`](./REACT_COMPONENT_EXPORT_IMPLEMENTATION_PLAN.md) - React component export planning

### **🛠️ Drawing Tools & Features**
- [`BRUSH_TOOL_USER_GUIDE.md`](./BRUSH_TOOL_USER_GUIDE.md) - Brush system with hover preview user guide
- [`BRUSH_HOVER_PREVIEW_PLAN.md`](./BRUSH_HOVER_PREVIEW_PLAN.md) - Brush hover preview implementation architecture
- [`GRADIENT_FILL_IMPLEMENTATION.md`](./GRADIENT_FILL_IMPLEMENTATION.md) - Complete gradient tool implementation analysis
- [`ELLIPSE_RADIAL_GRADIENTS.md`](./ELLIPSE_RADIAL_GRADIENTS.md) - Ellipse and radial gradient implementation
- [`ASCII_BOX_TOOL_IMPLEMENTATION_PLAN.md`](./ASCII_BOX_TOOL_IMPLEMENTATION_PLAN.md) - ASCII box drawing tool planning
- [`ASCII_TYPE_TOOL_IMPLEMENTATION_PLAN.md`](./ASCII_TYPE_TOOL_IMPLEMENTATION_PLAN.md) - ASCII text tool planning
- [`TOOL_BEHAVIOR_IMPLEMENTATION.md`](./TOOL_BEHAVIOR_IMPLEMENTATION.md) - Tool behavior patterns and implementations
- [`DRAWING_GAP_FIX.md`](./DRAWING_GAP_FIX.md) - Drawing tool gap prevention fixes

### **🎬 Animation System**
- [`ANIMATION_SYSTEM_GUIDE.md`](./ANIMATION_SYSTEM_GUIDE.md) - Animation system architecture and implementation
- [`ONION_SKINNING_GUIDE.md`](./ONION_SKINNING_GUIDE.md) - Onion skinning implementation and usage
- [`MULTI_FRAME_SELECTION_IMPLEMENTATION_PLAN.md`](./MULTI_FRAME_SELECTION_IMPLEMENTATION_PLAN.md) - Multi-frame selection planning
- [`MULTI_FRAME_SELECTION_MANUAL_TEST_PLAN.md`](./MULTI_FRAME_SELECTION_MANUAL_TEST_PLAN.md) - Multi-frame selection testing

### **⚡ Performance & Optimization**
- [`PERFORMANCE_OPTIMIZATION.md`](./PERFORMANCE_OPTIMIZATION.md) - **Complete performance guide: canvas rendering + animation playback optimizations**
- [`ANIMATION_PLAYBACK_OPTIMIZATION.md`](./ANIMATION_PLAYBACK_OPTIMIZATION.md) - Animation playback optimization (445% FPS improvement)
- [`ANIMATION_PLAYBACK_OPTIMIZATION_PLAN.md`](./ANIMATION_PLAYBACK_OPTIMIZATION_PLAN.md) - Animation optimization planning
- [`PERFORMANCE_OPTIMIZATION_PHASE1.md`](./PERFORMANCE_OPTIMIZATION_PHASE1.md) - Phase 1 performance improvements  
- [`CANVAS_RENDERING_IMPROVEMENTS.md`](./CANVAS_RENDERING_IMPROVEMENTS.md) - Canvas rendering optimizations

### **🐛 Debugging & Troubleshooting**
- [`FRAME_SYNCHRONIZATION_DEBUGGING_GUIDE.md`](./FRAME_SYNCHRONIZATION_DEBUGGING_GUIDE.md) - Systematic debugging methodology for complex React state synchronization issues
- [`COEP_TROUBLESHOOTING_GUIDE.md`](./COEP_TROUBLESHOOTING_GUIDE.md) - COEP/CSP troubleshooting (see Security section)
- [`LOGGING_CLEANUP_SUMMARY.md`](./LOGGING_CLEANUP_SUMMARY.md) - Logging system cleanup summary
- [`UNDO_REDO_BUG_FIXES.md`](./UNDO_REDO_BUG_FIXES.md) - Undo/redo bug fixes documentation
- [`BUILD_FIXES.md`](./BUILD_FIXES.md) - Build system fixes and improvements
- [`WIDTH_HEIGHT_INPUT_FIX.md`](./WIDTH_HEIGHT_INPUT_FIX.md) - Width/height input bug fixes

### **📋 Project Planning & Management**
- [`PHASE_4_ADVANCED_TOOLS_PLAN.md`](./PHASE_4_ADVANCED_TOOLS_PLAN.md) - Phase 4 development plan and progress
- [`PROJECT_MANAGEMENT_ENHANCEMENT_PLAN.md`](./PROJECT_MANAGEMENT_ENHANCEMENT_PLAN.md) - Project management improvements
- [`COLOR_PALETTE_OVERHAUL_PLAN.md`](./COLOR_PALETTE_OVERHAUL_PLAN.md) - Color system enhancement planning
- [`ADDING_FEATURES_TO_PROJECT_SYSTEM.md`](./ADDING_FEATURES_TO_PROJECT_SYSTEM.md) - Feature addition workflow

### **🖥️ Canvas & Rendering**
- [`CANVAS_TEXT_RENDERING.md`](./CANVAS_TEXT_RENDERING.md) - Text rendering system documentation
- [`CANVAS_RENDERING_IMPROVEMENTS.md`](./CANVAS_RENDERING_IMPROVEMENTS.md) - Canvas rendering optimizations
- [`GRID_OPACITY_IMPROVEMENTS.md`](./GRID_OPACITY_IMPROVEMENTS.md) - Grid visualization improvements
- [`TYPOGRAPHY_IMPLEMENTATION.md`](./TYPOGRAPHY_IMPLEMENTATION.md) - Typography and character rendering system

### **✅ Testing & Quality Assurance**
- [`RESPONSIVE_TESTING_CHECKLIST.md`](./RESPONSIVE_TESTING_CHECKLIST.md) - Responsive design testing procedures
- [`OS_CLIPBOARD_TESTING.md`](./OS_CLIPBOARD_TESTING.md) - Cross-platform clipboard testing
- [`PASTE_FUNCTIONALITY_TEST.md`](./PASTE_FUNCTIONALITY_TEST.md) - Paste feature testing documentation
- [`MULTI_FRAME_SELECTION_MANUAL_TEST_PLAN.md`](./MULTI_FRAME_SELECTION_MANUAL_TEST_PLAN.md) - Multi-frame selection testing

### **⚖️ Legal & Compliance**
- [`TERMS_OF_SERVICE.md`](./TERMS_OF_SERVICE.md) - Terms of Service with GDPR compliance
- [`PRIVACY_POLICY.md`](./PRIVACY_POLICY.md) - Privacy Policy with GDPR compliance

### **🔧 Database & Backend** 
(Note: Premium authentication docs are in `packages/premium/docs/`)
- [`PERMANENT_DELETE_RLS_FIX.md`](./PERMANENT_DELETE_RLS_FIX.md) - RLS policy fixes for permanent deletion

---

## 🤖 **For AI Coding Agents**

This documentation is designed to provide comprehensive context for AI-assisted development:

- **Implementation Patterns**: Documented architectural patterns for consistent development
- **Feature Context**: Complete implementation context for understanding existing features
- **Extension Points**: Clear guidance on how to extend and enhance existing systems
- **Quality Standards**: Established patterns for maintaining code quality and user experience

## 🔍 **Finding Documentation**

### Quick Search Patterns
Use these search patterns to find relevant documentation:
- **Security & Deployment**: `SECURITY_*`, `COEP_*`, `VERCEL_*`
- **Feature Implementation**: `*_IMPLEMENTATION*.md` files
- **Development Planning**: `*_PLAN.md` files  
- **System Guides**: `*_GUIDE.md` files
- **Performance**: `PERFORMANCE_*` files
- **Testing**: `*_TEST*` files
- **Monorepo**: `MONOREPO_*` files
- **Figma Design**: `FIGMA_*` files

### Documentation by Category

**Need to understand security headers?**
→ Start with [`SECURITY_HEADERS_INDEX.md`](./SECURITY_HEADERS_INDEX.md)

**Working on Figma designs?**
→ Start with [`FIGMA_WORKFLOW_README.md`](./FIGMA_WORKFLOW_README.md)

**Adding a new effect?**
→ Read [`EFFECTS_DEVELOPER_GUIDE.md`](./EFFECTS_DEVELOPER_GUIDE.md)

**Troubleshooting COEP issues?**
→ Read [`COEP_TROUBLESHOOTING_GUIDE.md`](./COEP_TROUBLESHOOTING_GUIDE.md)

**Setting up monorepo?**
→ Read [`MONOREPO_SETUP_GUIDE.md`](./MONOREPO_SETUP_GUIDE.md)

**Performance optimization?**
→ Start with [`PERFORMANCE_OPTIMIZATION.md`](./PERFORMANCE_OPTIMIZATION.md)

## 📚 **Root-Level Documentation**

Essential project documentation remains in the root directory:
- [`../README.md`](../README.md) - Main project overview and getting started
- [`../DEVELOPMENT.md`](../DEVELOPMENT.md) - Development setup, core architecture, and welcome dialog docs
- [`../COPILOT_INSTRUCTIONS.md`](../COPILOT_INSTRUCTIONS.md) - AI coding assistant guidelines with security headers section
- [`../PRD.md`](../PRD.md) - Product requirements document

## 📊 **Documentation Statistics**

- **Total Documentation Files**: 77 markdown files
- **Last Major Update**: October 20, 2025
- **Coverage Areas**: Security, UX, Design System, Effects, Tools, Animation, Performance, Testing, Legal

---

**Note**: This organization balances discoverability for AI agents with clean project structure for human developers. Documentation is continuously updated as features are added and refined.
