# Web Share Video Feature

## Overview
Implemented native video sharing functionality for ASCII Motion projects using the Web Share API. Users can generate and share project videos directly to social media platforms on supported devices (primarily mobile).

## Implementation Summary

### Architecture Decision
**Challenge**: Cross-workspace TypeScript isolation prevented the premium package from importing `ExportRenderer` from the main workspace.

**Solution**: Implemented a standalone video generator using the browser's native `MediaRecorder` API instead of the complex `ExportRenderer` class. This approach:
- Avoids workspace boundary issues
- Reduces code complexity
- Provides faster generation times
- Uses browser-native encoding (no FFmpeg.wasm dependency)

### Files Created/Modified

#### New Files
1. **`packages/premium/src/community/utils/socialShareVideo.ts`**
   - `generateSocialShareVideo()` - Generates WebM video using MediaRecorder API
   - `canShareVideo()` - Feature detection for Web Share API support
   - `shareVideoToSocial()` - Invokes native share sheet with video file
   - `generateAndShareVideo()` - Combined helper function

#### Modified Files
1. **`packages/premium/src/community/pages/ProjectDetailPage.tsx`**
   - Added "Share Video" button next to Like/Remix buttons
   - Integrated progress indicator during video generation
   - Added toast notifications for success/error states
   - Feature detection: button only shows on supported devices

### Technical Specifications

#### Video Quality Settings
- **Minimum Height**: 1080px (auto-scales based on canvas dimensions)
- **Frame Rate**: Uses project's configured frame rate (typically 24 FPS)
- **Video Codec**: VP9 (WebM) if supported, falls back to standard WebM
- **Bitrate**: 5 Mbps for high quality
- **Loop Count**: 2x (animation plays twice for better viewing)
- **Format**: WebM (excellent compression, wide mobile support)

#### Size Multiplier Calculation
```typescript
const targetHeight = 1080;
const estimatedPixelHeight = canvasHeight * characterHeight;

if (estimatedPixelHeight < targetHeight) {
  const requiredMultiplier = Math.ceil(targetHeight / estimatedPixelHeight);
  sizeMultiplier = Math.min(requiredMultiplier, 4); // Cap at 4x
}
```

#### Frame Rendering Process
1. Create offscreen canvas with calculated dimensions
2. Setup MediaRecorder with canvas stream
3. Render each frame using canvas 2D context:
   - Clear background
   - Draw character cells with proper positioning
   - Apply colors (foreground + background)
4. MediaRecorder captures frames automatically
5. Combine chunks into final video blob

### User Experience

#### Desktop Behavior
- Button hidden on devices without Web Share API support
- Shows error toast if user somehow triggers share on unsupported device

#### Mobile Behavior
- "Share Video" button appears next to Like/Remix buttons
- Click triggers video generation with progress indicator
- Native share sheet appears when ready
- User can share to:
  - Instagram Stories
  - Twitter/X
  - Facebook
  - iMessage
  - WhatsApp
  - Any app that accepts video files

#### Loading States
- **Initial**: "Share Video" with Share icon
- **Generating**: Shows spinner + percentage (0-100%)
- **Complete**: Opens native share sheet
- **Error**: Toast notification with error message

#### Share Content
```
Title: [Project Title]
Text: [Project Description]

Made with ASCII Motion
URL: [Project URL]
Files: [animation.webm]
```

### Browser Compatibility

#### Web Share API Support
- ✅ iOS Safari (iOS 12.2+)
- ✅ Android Chrome (Chrome 75+)
- ✅ Android Firefox (Firefox 79+)
- ❌ Desktop Chrome (partial support, no file sharing)
- ❌ Desktop Safari (no support)
- ❌ Desktop Firefox (no support)

#### MediaRecorder API Support
- ✅ All modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ iOS Safari (iOS 14.3+)
- ✅ Android Chrome (Chrome 49+)

### Testing Checklist

- [ ] Test on iOS Safari (iPhone)
- [ ] Test on Android Chrome
- [ ] Test video quality (1080px min height verified)
- [ ] Test share to Instagram Stories
- [ ] Test share to Twitter/X
- [ ] Test share to Facebook
- [ ] Verify file size is reasonable (< 10 MB for typical animations)
- [ ] Test with different canvas sizes
- [ ] Test with different frame counts
- [ ] Test progress indicator updates correctly
- [ ] Verify error handling for unsupported devices
- [ ] Test user cancellation (should not show error)

### Future Enhancements

#### Potential Improvements
1. **Format Selection**: Allow users to choose WebM vs MP4
   - MP4 requires FFmpeg.wasm (larger bundle, slower generation)
   - Current WebM approach is faster and well-supported on mobile

2. **Quality Presets**: "High Quality" vs "Small File Size"
   - Adjust bitrate and resolution accordingly

3. **Custom Loop Count**: Let users choose 1x, 2x, or loop count

4. **Thumbnail Selection**: Pick specific frame as video thumbnail

5. **Desktop Fallback**: Show download button instead of hiding feature
   - Users could download and manually share

6. **Share Analytics**: Track share metrics in Supabase
   - Count shares per project
   - Popular sharing platforms

### Known Limitations

1. **Desktop Support**: Web Share API file sharing not supported on desktop browsers
   - Button hidden on desktop to avoid confusion
   - Could add download fallback in future

2. **File Size**: Large animations (100+ frames, big canvas) may generate large files
   - Consider adding file size warning
   - Could implement compression presets

3. **Generation Time**: Complex animations take time to render
   - Progress indicator helps manage expectations
   - Typically 5-15 seconds for standard projects

4. **Browser Tab Performance**: Video generation uses main thread
   - UI may feel slightly sluggish during generation
   - Consider Web Worker approach for future optimization

### Performance Metrics

#### Estimated Generation Times
- Small (24 frames, 50x30 canvas): ~3-5 seconds
- Medium (48 frames, 100x60 canvas): ~8-12 seconds
- Large (96 frames, 200x120 canvas): ~15-25 seconds

#### Estimated File Sizes (VP9 WebM @ 5 Mbps)
- Small animation (2 loops): ~2-4 MB
- Medium animation (2 loops): ~5-8 MB
- Large animation (2 loops): ~10-15 MB

### Git Branch
- Feature Branch: `feature/web-share-video`
- Premium Submodule: `feature/web-share-video`
- Ready for testing and merge after validation

## Conclusion

This implementation provides a streamlined, mobile-first video sharing experience that leverages native browser APIs for optimal performance. The MediaRecorder approach sidesteps workspace boundary issues while delivering high-quality video output suitable for social media platforms.
