# OS Clipboard Integration - Testing Guide

## ✅ Implementation Status

### Features Implemented:
- **OS Clipboard Integration**: Added to all three selection types (rectangular, lasso, magic wand)
- **Text Format Conversion**: Converts selections to plain text with proper spacing
- **Transparent Operation**: Cmd+C now copies to both internal clipboard AND OS clipboard
- **Smart Spacing**: Empty cells become spaces only when needed, trailing spaces are cropped
- **Error Handling**: Graceful fallback if clipboard API is unavailable

### Files Modified:
- ✅ `src/utils/clipboardUtils.ts` - New utility functions for text conversion and OS clipboard
- ✅ `src/stores/toolStore.ts` - Enhanced copy functions with OS clipboard integration
- ✅ `src/components/features/CanvasActionButtons.tsx` - Updated UI handlers

## 🧪 Testing Protocol

### Test Case 1: Rectangular Selection
1. **Setup**: Draw some ASCII art (e.g., "Hello World")
2. **Select**: Use rectangle selection tool to select the text
3. **Copy**: Press Cmd+C (or use Copy button)
4. **Verify Internal**: Paste should work normally in ASCII Motion
5. **Verify OS**: Paste in external text editor (VS Code, TextEdit, etc.)
6. **Expected**: Both should show the same text content

### Test Case 2: Lasso Selection
1. **Setup**: Create ASCII art with irregular shapes
2. **Select**: Use lasso tool to select non-rectangular area
3. **Copy**: Press Cmd+C
4. **Verify**: External paste should show text using bounding box with spaces for unselected areas

### Test Case 3: Magic Wand Selection
1. **Setup**: Create ASCII art with same characters/colors
2. **Select**: Use magic wand to select similar content
3. **Copy**: Press Cmd+C
4. **Verify**: External paste should show text using bounding box format

### Test Case 4: Spacing and Line Handling
1. **Setup**: Create content with:
   - Leading spaces
   - Trailing spaces
   - Empty lines
   - Multiple lines
2. **Expected Behavior**:
   - Leading spaces preserved when followed by characters
   - Trailing spaces cropped from each line
   - Empty lines at end are removed
   - Each row becomes a separate line

### Test Case 5: Empty Selection
1. **Select**: Empty area with no content
2. **Copy**: Press Cmd+C
3. **Verify**: No error, empty clipboard is acceptable

### Test Case 6: Browser Compatibility
1. **Test in Chrome**: Full clipboard API support expected
2. **Test in Firefox**: Should work with modern versions
3. **Test in Safari**: Should work with recent versions
4. **Check Console**: Look for any clipboard API warnings

## 🔍 Debug Information

### Testing in Browser Console:
```javascript
// Test the clipboard utility functions directly
import { rectangularSelectionToText } from './src/utils/clipboardUtils.js';

// Create test data
const testCells = new Map([
  ['0,0', { char: 'H', color: '#fff', bgColor: '#000' }],
  ['1,0', { char: 'i', color: '#fff', bgColor: '#000' }],
  ['0,1', { char: 'B', color: '#fff', bgColor: '#000' }],
  ['1,1', { char: 'y', color: '#fff', bgColor: '#000' }],
  ['2,1', { char: 'e', color: '#fff', bgColor: '#000' }]
]);

const selection = { start: { x: 0, y: 0 }, end: { x: 2, y: 1 } };
console.log(rectangularSelectionToText(testCells, selection));
// Expected output:
// Hi
// Bye
```

### Check Clipboard API Support:
```javascript
console.log('Clipboard API available:', !!navigator.clipboard);
console.log('writeText available:', !!navigator.clipboard?.writeText);
```

## 🚀 Success Criteria

### ✅ Functional Requirements:
- [ ] Cmd+C copies to both internal and OS clipboard
- [ ] Internal copy/paste functionality unchanged
- [ ] Text format preserves character positioning
- [ ] Leading spaces preserved, trailing spaces cropped
- [ ] All three selection types work (rectangular, lasso, magic wand)
- [ ] No TypeScript compilation errors
- [ ] No runtime JavaScript errors

### ✅ User Experience:
- [ ] Seamless operation - user doesn't notice additional complexity
- [ ] Fast performance - no noticeable lag when copying
- [ ] Cross-platform compatibility
- [ ] Graceful fallback if clipboard API unavailable

### ✅ Edge Cases Handled:
- [ ] Empty selections
- [ ] Very large selections
- [ ] Selections with only spaces
- [ ] Multi-line content with varying lengths
- [ ] Browser security restrictions

## 📋 Manual Testing Checklist

### Basic Functionality:
- [ ] Draw simple text and copy with rectangular selection
- [ ] Paste in external text editor - verify content matches
- [ ] Verify internal paste still works
- [ ] Test with lasso selection - verify bounding box format
- [ ] Test with magic wand selection

### Edge Cases:
- [ ] Copy empty selection - no errors
- [ ] Copy selection with only spaces
- [ ] Copy multi-line irregular shapes
- [ ] Test with canvas at different zoom levels
- [ ] Test with different canvas sizes

### Browser Testing:
- [ ] Chrome - full functionality
- [ ] Firefox - check for any restrictions
- [ ] Safari - verify clipboard API support
- [ ] Check console for warnings or errors

## 🎯 Expected Behavior Examples

### Example 1: Simple Text
**Canvas Content:**
```
Hello
World
```
**Selected Area:** Full content
**OS Clipboard Result:**
```
Hello
World
```

### Example 2: Irregular Lasso Selection
**Canvas Content:**
```
 AB 
C DE
```
**Lasso Selected:** Only A, B, D, E
**OS Clipboard Result:**
```
AB 
 DE
```

### Example 3: Leading/Trailing Spaces
**Canvas Content:**
```
   Hello   
  World    
```
**Selected Area:** Full content
**OS Clipboard Result:**
```
   Hello
  World
```
(Note: trailing spaces cropped, leading spaces preserved)

---

**Test Environment**: macOS with dev server on http://localhost:5189/
**Last Updated**: September 10, 2025
