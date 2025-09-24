/**
 * Video Export Debug Script
 * Run this in the browser console to test video export functionality
 */

// Test function to be run in browser console
function debugVideoExport() {
  console.log('🔍 Starting video export debug...');
  
  // Check WebCodecs support
  const webCodecsSupported = 'VideoEncoder' in window && 'VideoFrame' in window;
  console.log('WebCodecs supported:', webCodecsSupported);
  
  // Check webm-muxer availability
  import('webm-muxer').then(module => {
    console.log('webm-muxer loaded:', !!module.Muxer);
    
    // Test creating a simple muxer
    const { Muxer, ArrayBufferTarget } = module;
    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: {
        codec: 'V_VP9',
        width: 640,
        height: 480,
        frameRate: 12
      }
    });
    console.log('Muxer created successfully:', !!muxer);
    
  }).catch(error => {
    console.error('webm-muxer import failed:', error);
  });
  
  // Test VideoEncoder creation if WebCodecs is supported
  if (webCodecsSupported) {
    try {
      const encoder = new VideoEncoder({
        output: (chunk) => {
          console.log('Encoder output chunk:', chunk.byteLength, 'bytes');
        },
        error: (error) => {
          console.error('Encoder error:', error);
        }
      });
      
      encoder.configure({
        codec: 'vp09.00.10.08',
        width: 640,
        height: 480,
        framerate: 12,
        bitrate: 1000000
      });
      
      console.log('VideoEncoder configured successfully');
      encoder.close();
      
    } catch (error) {
      console.error('VideoEncoder test failed:', error);
    }
  }
}

// Instructions for browser console
console.log(`
🎥 Video Export Debug Tools
===========================

Run these commands in the browser console:

1. debugVideoExport() - Test WebCodecs and webm-muxer
2. Check the export dropdown for MP4 Video option
3. Try exporting a simple animation and watch console output

The video export now includes detailed logging:
- Frame generation progress
- Encoding progress  
- File size information
- Error details if something fails
`);

// Make function available globally
window.debugVideoExport = debugVideoExport;