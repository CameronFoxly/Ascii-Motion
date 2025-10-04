# Multi-Frame Selection – Manual Test Plan

## 🎯 Objectives
- Validate the stability of timeline multi-frame selection across duplication, deletion, reordering, and duration edits.
- Confirm undo/redo integrity for range-based actions, including restoration of selection and active frame.
- Exercise newly added deselection triggers (Escape, canvas interactions, navigation) to ensure selections never linger unexpectedly.
- Document a regression checklist that can be reused before releases and major feature drops.

## 🧪 Test Environment
- **Build**: Latest `main` branch with production Vite build (`npx vite build`).
- **Browser**: Chromium-based (Chrome 129+) and Firefox 129+.
- **Project Setup**: Load a sample project with ≥6 frames of mixed durations (create via duplicate + edits if needed).
- **Reset Conditions**: Before each scenario, ensure playback is stopped and the canvas reflects the active frame.

## ✅ Core Scenario Matrix
| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| T-01 | Shift range selection | Select frame 2, Shift+Click frame 5 | Frames 2-5 highlighted, frame 5 active, no other frames selected |
| T-02 | Duplicate selection (toolbar) | With frames 2-5 selected, press **Duplicate** | Copies insert after frame 5, names suffixed “Copy 1…”, new copies selected |
| T-03 | Duplicate selection (Ctrl/Cmd+D) | Repeat T-02 using keyboard shortcut | Same as toolbar behavior |
| T-04 | Delete selection (toolbar) | Highlight frames 3-6, press **Delete** | Frames removed, next frame becomes active, selection collapses to active frame |
| T-05 | Delete selection (Ctrl/Cmd+Delete) | Highlight frames 1-3, use shortcut | Same as toolbar, history entry recorded |
| T-06 | Reorder selection | Select frames 2-4, drag frame 2 handle after frame 6 | Group moves in order, undo restores original order and selection |
| T-07 | Drop indicator hotspot | Drag a single frame so the indicator appears between frames, hover within the glow, then drop | Frame reorders at the highlighted slot even if the cursor isn’t touching a frame card |
| T-08 | Set duration (selection) | Select frames 4-6, run **Set Duration**, enter `120` ms | Only selected frames change to 120 ms; history description lists 3 frames |
| T-09 | Set duration (all) | Ensure single selection, run dialog, set `90` ms | Every frame adopts 90 ms, selection remains on active frame |
| T-10 | Undo/Redo duplicate | Perform T-02, Undo, Redo | Undo removes copies & restores selection; Redo re-inserts and reselects copies |
| T-11 | Undo/Redo delete | Perform T-04, Undo, Redo | Undo reinserts frames with original order & selection; Redo deletes again |
| T-12 | Escape clears selection | Create multi selection, press **Escape** | Timeline selection collapses to active frame while canvas selections clear |
| T-13 | Canvas interaction clears selection | Select frames 2-5, click canvas, draw a stroke | Timeline selection resets to active frame before drawing begins |
| T-14 | Navigation clears selection | Multi-select frames, press `,` or `.` | Moves one frame and selection reduces to the new active frame only |
| T-15 | Playback clears selection | Multi-select frames, press **Play** then **Stop** | Selection resets to the frame where playback stopped |
| T-16 | Import/Export sanity | After multi operations, export JSON, re-import | Imported session retains frame order/durations and has single selection |

## 🔁 Regression Walkthroughs
1. **Full Range Workflow**
   - Select frames 2-5, duplicate, reorder to end, delete duplicates, undo twice.
   - Verify history stack navigates without mismatched IDs or selections.
2. **Duration & Undo Stress**
   - Apply different durations to overlapping selections (e.g., frames 1-3, then 3-5).
   - Undo chain should step backwards correctly and final redo restores both duration sets.
3. **Keyboard Combo Sweep**
   - Ctrl/Cmd + N/D/Delete across single and multi selections.
   - Ensure shortcuts respect selection context and no browser defaults leak through.
4. **Canvas Interaction**
   - Multi-select frames, draw on canvas, toggle tools, paste data.
   - Selection should stay on the active frame after canvas actions finish.

## 🧭 Expected Selection States
| Action | Selection After Action | Notes |
|--------|------------------------|-------|
| Duplicate Range | New duplicates selected | Active frame = first inserted duplicate |
| Delete Range | Single active frame near deletion site | Chooses nearest surviving frame |
| Reorder Range | Moved frames remain selected | Active frame aligns with moved selection |
| Set Duration (multi) | Same selection | Duration change undo restores highlight |
| Escape Key | Single active frame | Canvas selections also cleared |
| Canvas Click/Drag | Single active frame | Fires before drawing to avoid stale selection |
| Navigation (, / .) | Single new frame | Works during playback pause, blocked while playing |

## 📅 Testing Cadence
| Frequency | Trigger | Owner |
|-----------|---------|-------|
| Weekly | Timeline-related merges | Animation feature QA rotation |
| Release Candidate | Before tagging release | Release captain |
| Hotfix Verification | After undo/selection bugfix | On-call engineer |

## 📝 Notes & Follow-Ups
- Capture screenshots or short videos for regressions—attach to GitHub issues with frame indices.
- If undo stack misbehaves, dump `useToolStore.getState().history` to inspect snapshots.
- When executing T-07, keep the cursor inside the indicator’s glow to confirm the enlarged hotspot accepts the drop without touching adjacent frame cards.
- For flaky behavior, re-run scenario after a fresh reload; note if persisted projects impact reproduction.
- Extend this checklist when new batch operations (e.g., copy/paste ranges) arrive.

Document last updated: **October 3, 2025**.
