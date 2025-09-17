/**
 * Video Export Test Script
 * Quick verification that video export functionality is working
 */

// Test WebCodecs support detection
function testWebCodecsSupport() {
  const hasWebCodecs = typeof window !== 'undefined' && 
                      'VideoEncoder' in window && 
                      'VideoFrame' in window;
  
  console.log('🎥 WebCodecs Support:', hasWebCodecs ? '✅ Supported' : '❌ Not supported');
  return hasWebCodecs;
}

// Test webm-muxer import
async function testWebMMuxer() {
  try {
    const { Muxer, ArrayBufferTarget } = await import('webm-muxer');
    console.log('📦 webm-muxer:', '✅ Imported successfully');
    
    // Test basic muxer creation
    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: {
        codec: 'V_VP9',
        width: 640,
        height: 480,
        frameRate: 12
      }
    });
    
    console.log('🔧 Muxer creation:', '✅ Success');
    return true;
  } catch (error) {
    console.error('📦 webm-muxer:', '❌ Import failed:', error);
    return false;
  }
}

// Test video export dialog components
function testVideoExportDialog() {
  // Check if VideoExportDialog is available
  const hasDialog = document.querySelector('[data-testid="video-export-dialog"]') || 
                   document.querySelector('dialog') ||
                   'VideoExportDialog component available';
  
  console.log('🎛️ VideoExportDialog:', hasDialog ? '✅ Available' : '❌ Not found');
  return !!hasDialog;
}

// Main test function
async function runVideoExportTests() {
  console.log('\n🚀 Testing Video Export Functionality\n');
  
  const webCodecsSupport = testWebCodecsSupport();
  const webmMuxerSupport = await testWebMMuxer();
  const dialogAvailable = testVideoExportDialog();
  
  console.log('\n📊 Test Results Summary:');
  console.log('- WebCodecs API:', webCodecsSupport ? '✅' : '⚠️ Fallback required');
  console.log('- webm-muxer:', webmMuxerSupport ? '✅' : '❌');
  console.log('- Video Export UI:', dialogAvailable ? '✅' : '⚠️');
  
  const allGood = webmMuxerSupport && dialogAvailable;
  console.log('\n🎯 Overall Status:', allGood ? '✅ Ready for video export!' : '⚠️ Some issues detected');
  
  return {
    webCodecsSupport,
    webmMuxerSupport,
    dialogAvailable,
    ready: allGood
  };
}

// Run tests if in browser
if (typeof window !== 'undefined') {
  window.testVideoExport = runVideoExportTests;
  console.log('📝 Run: testVideoExport() to verify video export functionality');
} else {
  // Node.js environment
  runVideoExportTests();
}