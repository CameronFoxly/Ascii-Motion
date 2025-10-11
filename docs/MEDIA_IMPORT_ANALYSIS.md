# Media Import - Current State Analysis

**Date**: October 10, 2025  
**Status**: Bug Investigation & Feature Enhancement Planning

## 📋 **Overview**

This document analyzes the current state of the media import functionality in ASCII Motion, focusing on two critical issues:
1. **Blank first frame bug** when importing videos
2. **Nested button hydration error** in CharacterMappingSection

## 🐛 **Issue #1: Blank First Frame Bug**

### **Problem Description**
When importing videos, the first frame often appears blank/empty while subsequent frames render correctly.

### **Root Cause Analysis**

**Location**: `src/utils/mediaProcessor.ts` - `extractVideoFrames()` method (lines 296-337)

The bug occurs due to **video seek timing issues**:

```typescript
for (let i = 0; i < maxFrames; i++) {
  const timestamp = i / estimatedFrameRate;
  
  video.currentTime = timestamp;  // ⚠️ ISSUE: First frame timestamp = 0
  
  // Wait for video to seek with 200ms timeout
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => resolve(), 200);
    video.onseeked = () => {
      clearTimeout(timeout);
      resolve();
    };
  });
  
  // Small delay to ensure frame is ready
  await new Promise(resolve => setTimeout(resolve, 10));
  
  // ⚠️ PROBLEM: Canvas may not be populated for frame 0
  const processedFrame = this.processVideoFrameToCanvas(video, options, timestamp, i, frameDuration);
  frames.push(processedFrame);
}
```

**Why First Frame Fails:**
1. **Timestamp 0 Issue**: `video.currentTime = 0` doesn't always trigger a `seeked` event (already at position 0)
2. **Canvas Not Ready**: Video element may not have decoded the first frame yet
3. **Timeout Racing**: The 200ms timeout may resolve before video frame is actually rendered
4. **No Readiness Check**: Code doesn't verify video frame is actually available before drawing

### **Affected Code Paths**

**Video Processing Flow**:
```
MediaImportPanel.tsx → mediaProcessor.processVideo()
  ↓
mediaProcessor.extractVideoFrames()
  ↓
processVideoFrameToCanvas() ← draws blank canvas if video not ready
  ↓
Returns ProcessedFrame with empty imageData
```

### **Recommended Fix**

**Option 1: Skip timestamp 0, start at small offset** (Quick Fix) ✅ **IMPLEMENTED**
```typescript
for (let i = 0; i < maxFrames; i++) {
  // Skip exact 0 timestamp - start at 0.001 seconds for first frame
  const timestamp = i === 0 ? 0.001 : i / estimatedFrameRate;
  
  video.currentTime = timestamp;
  
  // Longer delay for first frame to ensure it's ready
  await new Promise(resolve => setTimeout(resolve, i === 0 ? 100 : 10));
  
  // ... rest of code
}
```

**Option 2: Add explicit readiness check** (Robust Fix)
```typescript
// Before extracting frames, ensure video is ready
video.currentTime = 0;
await new Promise<void>((resolve) => {
  if (video.readyState >= 2) { // HAVE_CURRENT_DATA
    resolve();
  } else {
    video.onloadeddata = () => resolve();
  }
});

// Then extract frames with confidence first frame is available
```

**Option 3: Retry logic for first frame** (Comprehensive Fix)
```typescript
for (let i = 0; i < maxFrames; i++) {
  const timestamp = i / estimatedFrameRate;
  
  // Special handling for first frame
  if (i === 0) {
    let attempts = 0;
    while (attempts < 3) {
      video.currentTime = timestamp;
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if frame has actual pixel data
      if (this.isFramePopulated(video)) {
        break;
      }
      attempts++;
    }
  } else {
    video.currentTime = timestamp;
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => resolve(), 200);
      video.onseeked = () => {
        clearTimeout(timeout);
        resolve();
      };
    });
  }
  
  const processedFrame = this.processVideoFrameToCanvas(...);
  frames.push(processedFrame);
}

// Helper method to verify frame has data
private isFramePopulated(video: HTMLVideoElement): boolean {
  const testCanvas = document.createElement('canvas');
  testCanvas.width = Math.min(video.videoWidth, 10);
  testCanvas.height = Math.min(video.videoHeight, 10);
  const ctx = testCanvas.getContext('2d')!;
  ctx.drawImage(video, 0, 0, testCanvas.width, testCanvas.height);
  const data = ctx.getImageData(0, 0, testCanvas.width, testCanvas.height).data;
  
  // Check if we have any non-zero pixel data
  return data.some(val => val !== 0);
}
```

### **Testing Recommendations**

After implementing fix:
- [ ] Test with various video formats (MP4, WebM, MOV)
- [ ] Test with different frame rates (24fps, 30fps, 60fps)
- [ ] Test with short videos (<1 second)
- [ ] Test with long videos (>30 seconds)
- [ ] Verify first frame matches video thumbnail in system preview
- [ ] Test live preview updates correctly
- [ ] Test import to canvas shows correct first frame

---

## 🐛 **Issue #2: Nested Button Hydration Error**

### **Problem Description**

Console error when opening Media Import Panel:
```
[Error] In HTML, <button> cannot be a descendant of <button>.
This will cause a hydration error.
```

### **Root Cause Analysis**

**Location**: `src/components/features/CharacterMappingSection.tsx` (lines 268-289)

**Problem Code**:
```tsx
<CollapsibleTrigger asChild>
  <Button variant="ghost" className="w-full h-auto...">
    <div className="flex items-center gap-2">
      <Type className="w-4 h-4..." />
      <span>Character Mapping</span>
      {/* ⚠️ NESTED BUTTON: Checkbox renders as <button role="checkbox"> */}
      <Checkbox
        id="enable-character-mapping"
        checked={enableCharacterMapping}
        onCheckedChange={handleToggleEnabled}
        className="ml-2"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
    <ChevronDown className="h-3 w-3..." />
  </Button>
</CollapsibleTrigger>
```

**Why This Fails:**
1. `CollapsibleTrigger` with `asChild` renders its child (`Button`) as the trigger
2. `Button` component renders as `<button>` element
3. `Checkbox` component (from shadcn/ui) renders as `<button role="checkbox">`
4. Result: `<button><button role="checkbox"></button></button>` ← **Invalid HTML**

### **Architecture Context**

The issue stems from trying to combine **three interactive patterns** in one element:
- **Collapsible trigger** (expands/collapses section)
- **Toggle checkbox** (enables/disables character mapping)
- **Button container** (provides button styling)

### **Recommended Fix**

**Option 1: Move checkbox outside trigger button** (Recommended)
```tsx
<div className="flex items-center justify-between gap-2">
  <CollapsibleTrigger asChild>
    <Button variant="ghost" className="flex-1 h-auto text-xs justify-between py-1 px-1 my-1">
      <div className="flex items-center gap-2">
        <Type className="w-4 h-4 text-muted-foreground" />
        <span>Character Mapping</span>
      </div>
      <ChevronDown 
        className={`h-3 w-3 transition-transform duration-200 ${
          isOpen ? 'rotate-180' : ''
        }`}
      />
    </Button>
  </CollapsibleTrigger>
  
  {/* Checkbox separate from collapsible trigger */}
  <Checkbox
    id="enable-character-mapping"
    checked={enableCharacterMapping}
    onCheckedChange={handleToggleEnabled}
    className="flex-shrink-0"
  />
</div>
```

**Option 2: Use Switch instead of Checkbox** (Alternative)
```tsx
<CollapsibleTrigger asChild>
  <Button variant="ghost" className="w-full h-auto...">
    <div className="flex items-center gap-2 flex-1">
      <Type className="w-4 h-4..." />
      <span>Character Mapping</span>
    </div>
    {/* Switch renders as <button> but can use onClick to prevent propagation */}
    <div onClick={(e) => e.stopPropagation()}>
      <Switch
        checked={enableCharacterMapping}
        onCheckedChange={handleToggleEnabled}
      />
    </div>
    <ChevronDown className="h-3 w-3..." />
  </Button>
</CollapsibleTrigger>
```

**Option 3: Custom checkbox rendering** (Most Control)
```tsx
<CollapsibleTrigger asChild>
  <Button variant="ghost" className="w-full h-auto...">
    <div className="flex items-center gap-2">
      <Type className="w-4 h-4..." />
      <span>Character Mapping</span>
      {/* Custom div-based checkbox visual */}
      <div
        role="checkbox"
        aria-checked={enableCharacterMapping}
        onClick={(e) => {
          e.stopPropagation();
          handleToggleEnabled(!enableCharacterMapping);
        }}
        className={cn(
          "h-4 w-4 rounded-sm border border-primary ml-2 cursor-pointer",
          enableCharacterMapping && "bg-primary"
        )}
      >
        {enableCharacterMapping && <Check className="h-3 w-3 text-primary-foreground" />}
      </div>
    </div>
    <ChevronDown className="h-3 w-3..." />
  </Button>
</CollapsibleTrigger>
```

### **Impact Assessment**

**Current Issues:**
- ❌ React hydration warnings in console
- ❌ Potential accessibility issues (nested interactive elements)
- ❌ Unpredictable keyboard navigation behavior
- ⚠️ Works in practice but violates HTML spec

**After Fix:**
- ✅ Clean console (no hydration errors)
- ✅ Proper HTML semantics
- ✅ Predictable keyboard navigation
- ✅ Better accessibility for screen readers

---

## 🔍 **Issue #3: MP4Box Invalid Box Type Error**

### **Problem Description**

Console error when loading videos:
```
[Error] [0:00:08.010] – "[BoxParser]" – "Invalid box type: '©TIM'"
```

### **Root Cause Analysis**

**Location**: `src/utils/mediaProcessor.ts` - `parseMP4FrameRate()` method (lines 372-437)

**Context**: The error comes from MP4Box.js library when parsing MP4 metadata atoms.

**Why This Happens:**
- `©TIM` is a **QuickTime metadata atom** (copyright timestamp)
- MP4Box.js doesn't recognize all QuickTime custom atoms
- Video files created by Apple devices or QuickTime-based encoders include non-standard atoms
- This is a **warning, not a fatal error** - frame rate detection still works

### **Current Behavior**
```typescript
mp4boxFile.onError = () => {
  // MP4Box parsing failed, use default framerate
  resolve(0);
};

// Error logged but doesn't prevent processing
mp4boxFile.appendBuffer(buffer);
mp4boxFile.flush();
```

**Impact**: 
- ✅ Video still processes correctly
- ✅ Fallback to 30fps works as expected
- ⚠️ Console pollution (confusing for developers)
- ⚠️ May indicate other metadata being skipped

### **Recommended Fix**

**Option 1: Suppress non-critical MP4Box errors** (Quick Fix)
```typescript
// Wrap MP4Box logging to filter known non-critical errors
const originalConsoleError = console.error;
const suppressedErrors = ['Invalid box type'];

mp4boxFile.onError = (error) => {
  const errorMsg = String(error);
  const isSuppressed = suppressedErrors.some(msg => errorMsg.includes(msg));
  
  if (!isSuppressed) {
    originalConsoleError('[MP4Box]', error);
  }
  
  // Still resolve with fallback
  resolve(0);
};
```

**Option 2: Add error categorization** (Better UX)
```typescript
private parseMP4FrameRate(arrayBuffer: ArrayBuffer): Promise<number> {
  return new Promise((resolve) => {
    const mp4boxFile: MP4File = MP4Box.createFile();
    let hasMetadataWarning = false;
    
    mp4boxFile.onError = (error: string) => {
      // Categorize errors
      if (error.includes('Invalid box type')) {
        hasMetadataWarning = true;
        console.debug('[MP4Box] Non-critical metadata warning:', error);
      } else {
        console.warn('[MP4Box] Parsing error:', error);
      }
      resolve(0);
    };
    
    mp4boxFile.onReady = (info: MP4Info) => {
      if (hasMetadataWarning) {
        console.debug('[MP4Box] Proceeding despite metadata warnings');
      }
      // ... rest of frame rate extraction
    };
  });
}
```

**Option 3: Upgrade MP4Box.js** (Long-term Fix)
- Check for newer version of MP4Box.js with better QuickTime support
- Test compatibility with existing code
- May fix issue at source level

---

## 📊 **Current Architecture Overview**

### **Import Flow**

```
User Action: Drop/Select Media File
  ↓
MediaImportPanel.tsx
  ↓
useImportFile.setSelectedFile()
  ↓
Auto-process effect (line 388-422)
  ↓
mediaProcessor.processVideo() / processImage()
  ↓
extractVideoFrames() / processImageToCanvas()
  ↓
processVideoFrameToCanvas() / processImageToCanvas()
  ↓
setProcessedFrames(frames)
  ↓
Live Preview Effect (line 441-509)
  ↓
asciiConverter.convertImageDataToAscii()
  ↓
positionCellsOnCanvas()
  ↓
setPreviewData() → Canvas displays preview
```

### **State Management**

**Import Store** (`src/stores/importStore.ts`):
- Modal state (open/closed)
- File selection
- Processing progress
- Settings (dimensions, colors, character mapping)
- Preview state

**Preview Store** (`src/stores/previewStore.ts`):
- Preview overlay data
- Active/inactive state
- Independent from canvas store

**Integration Points**:
- Character Palette Store → Character mapping settings
- Color Palette Store → Color mapping settings  
- Canvas Store → Final import destination
- Animation Store → Multi-frame import

### **Key Components**

1. **MediaImportPanel.tsx** (1,362 lines)
   - Main import UI
   - Settings controls
   - Preview management
   - File handling
   
2. **CharacterMappingSection.tsx** (635 lines)
   - Character palette editor
   - Mapping controls
   - Drag & drop reordering
   - **Contains nested button bug**

3. **mediaProcessor.ts** (614 lines)
   - Video/image loading
   - Frame extraction
   - Canvas rendering
   - **Contains blank first frame bug**
   - **Contains MP4Box error**

4. **asciiConverter.ts**
   - Image data → ASCII conversion
   - Character mapping algorithms
   - Color quantization
   - Palette matching

---

## 🎯 **Priority Recommendations**

### **Immediate Actions (P0)**

1. **Fix Nested Button Error** ✅ Easy
   - Estimated effort: 15 minutes
   - Move checkbox outside CollapsibleTrigger
   - Zero risk, immediate improvement

2. **Fix Blank First Frame Bug** ⚠️ Medium Risk
   - Estimated effort: 1-2 hours (including testing)
   - Implement Option 3 (retry logic with validation)
   - Requires thorough testing across video formats

### **Short-term Improvements (P1)**

3. **Suppress MP4Box Metadata Warnings**
   - Estimated effort: 30 minutes
   - Implement Option 2 (error categorization)
   - Improves developer experience

4. **Add Video Processing Diagnostics**
   - Show frame extraction progress
   - Display detected frame rate
   - Warn if first frame validation fails

### **Long-term Enhancements (P2)**

5. **Video Processing Optimization**
   - Consider Web Workers for frame extraction
   - Add cancelable processing
   - Improve large video handling

6. **Better Error Reporting**
   - User-friendly error messages
   - Suggest fixes for common issues
   - Add retry functionality

---

## 📝 **Testing Checklist**

### **Before Changes**
- [ ] Document current behavior (screenshot first frame)
- [ ] Record console errors
- [ ] Test with 3+ different video files
- [ ] Note any other unexpected behaviors

### **After Fixes**
- [ ] First frame displays correctly in all test videos
- [ ] No nested button console errors
- [ ] MP4Box warnings suppressed or categorized
- [ ] Live preview still works
- [ ] Import to canvas works
- [ ] Multi-frame import works
- [ ] No new console errors introduced
- [ ] Keyboard navigation works in CharacterMappingSection
- [ ] Accessibility: Screen reader announces checkbox state

---

## 🔧 **Development Notes**

### **File Locations**

**Core Files to Modify:**
- `src/utils/mediaProcessor.ts` (blank frame fix)
- `src/components/features/CharacterMappingSection.tsx` (nested button fix)

**Related Files to Review:**
- `src/stores/importStore.ts` (settings management)
- `src/components/features/MediaImportPanel.tsx` (integration)
- `src/utils/asciiConverter.ts` (conversion logic)

### **Dependencies**

```json
{
  "mp4box": "^0.5.2",  // Check for updates
  "@radix-ui/react-collapsible": "...",  // Collapsible UI
  "@radix-ui/react-checkbox": "...",     // Checkbox UI
}
```

### **Known Limitations**

1. **Frame extraction performance**: Currently synchronous, blocks UI
2. **Memory usage**: Large videos load all frames into memory
3. **Format support**: Limited to browser-supported codecs
4. **Frame rate detection**: May fail for unusual frame rates

---

## 📚 **Additional Context**

### **Related Documentation**
- See `/docs/README.md` for documentation index
- Import feature planning: Look for `MEDIA_IMPORT_*` docs
- Character palette system: `TYPOGRAPHY_IMPLEMENTATION.md`

### **Recent Changes**
- Media import panel added in Phase 4
- Character mapping integrated
- Color palette support added
- Live preview functionality implemented

### **Future Considerations**
- Audio track visualization (future enhancement)
- GIF export with frame timing from video
- Batch video processing
- Custom frame rate override

---

**Document Status**: ✅ Complete  
**Next Steps**: Implement fixes based on priority recommendations  
**Assigned To**: Development team  
**Review Required**: Yes (post-implementation)
