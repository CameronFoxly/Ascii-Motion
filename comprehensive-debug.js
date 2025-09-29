/**
 * Comprehensive Effects Preview Debug Test
 * 
 * This creates test scenarios to help identify preview issues.
 */

// Create test canvas data
const createTestCanvas = () => {
  const canvas = new Map();
  
  // Create a simple 3x2 test pattern
  canvas.set('0,0', { char: 'A', color: '#ff0000', bgColor: '#000000' }); // Red A
  canvas.set('1,0', { char: 'B', color: '#00ff00', bgColor: '#000000' }); // Green B  
  canvas.set('2,0', { char: 'C', color: '#0000ff', bgColor: '#000000' }); // Blue C
  canvas.set('0,1', { char: 'X', color: '#888888', bgColor: '#111111' }); // Gray X
  canvas.set('1,1', { char: 'Y', color: '#cccccc', bgColor: '#222222' }); // Light Gray Y
  canvas.set('2,1', { char: 'Z', color: '#444444', bgColor: '#333333' }); // Dark Gray Z
  
  return canvas;
};

console.log('🔬 Comprehensive Effects Preview Debug');
console.log('======================================');

// Test the processing functions directly
console.log('\n🧪 Testing Effect Processing Functions:');
console.log('=======================================');

const testCanvas = createTestCanvas();
console.log(`📊 Test canvas created with ${testCanvas.size} cells:`);
testCanvas.forEach((cell, key) => {
  console.log(`  ${key}: '${cell.char}' (${cell.color}, bg:${cell.bgColor})`);
});

console.log('\n1. Testing Levels Effect (should work with defaults):');
console.log('   - Default: shadows=0, midtones=128, highlights=255');
console.log('   - Test: Adjust shadows to 50 (should brighten dark colors)');
console.log('   - Expected: Colors should shift brighter');

console.log('\n2. Testing Hue & Saturation Effect (should work with defaults):'); 
console.log('   - Default: hue=0, saturation=0, lightness=0');
console.log('   - Test: Adjust hue to 60 (should shift colors)');
console.log('   - Expected: Red→Yellow, Green→Cyan, Blue→Magenta');

console.log('\n3. Testing Color Remapping Effect:');
console.log('   - Default: empty colorMappings {}');
console.log('   - Test: Add mapping "#ff0000" → "#00ffff" (Red→Cyan)');
console.log('   - Expected: Red A should become Cyan A');

console.log('\n4. Testing Character Remapping Effect:');
console.log('   - Default: empty characterMappings {}');
console.log('   - Test: Add mapping "A" → "@"');
console.log('   - Expected: All A characters should become @ characters');

console.log('\n🔍 Debug Steps for Browser Testing:');
console.log('===================================');

console.log('\nStep 1: Open Browser DevTools Console');
console.log('Step 2: Create some ASCII art on the canvas');  
console.log('Step 3: Open Levels effect panel');
console.log('Step 4: Check console for these messages:');
console.log('  - Should see preview starting automatically');
console.log('  - No "Preview processing failed" errors');
console.log('  - No "Preview update failed" errors');

console.log('\nStep 5: In DevTools, run this to check preview state:');
console.log('```javascript');
console.log('// Check if preview store has data');
console.log('const previewStore = window.__STORE__.usePreviewStore?.getState();');
console.log('console.log("Preview active:", previewStore?.isPreviewActive);');
console.log('console.log("Preview data size:", previewStore?.previewData?.size);');
console.log('console.log("Preview data:", Array.from(previewStore?.previewData?.entries() || []));');
console.log('');
console.log('// Check effects store state');
console.log('const effectsStore = window.__STORE__.useEffectsStore?.getState();');
console.log('console.log("Effects preview active:", effectsStore?.isPreviewActive);');
console.log('console.log("Preview effect:", effectsStore?.previewEffect);');
console.log('console.log("Levels settings:", effectsStore?.levelsSettings);');
console.log('```');

console.log('\nStep 6: Test Levels Effect Specifically:');
console.log('  - Adjust shadows slider from 0 to 100');
console.log('  - Should see immediate changes on canvas');
console.log('  - Canvas cells should appear brighter');
console.log('  - Changes should have 80% opacity (slightly transparent)');

console.log('\nStep 7: Test Preview Toggle:');
console.log('  - Click the Eye icon to turn preview off');
console.log('  - Changes should disappear from canvas');
console.log('  - Click Eye icon again to turn preview on');
console.log('  - Changes should reappear');

console.log('\n🔧 Common Issues and Fixes:');
console.log('===========================');

console.log('\nIssue 1: Preview not starting automatically');
console.log('  - Check: useEffect in effect panels calls startPreview()');
console.log('  - Check: startPreview() is setting isPreviewActive: true');
console.log('  - Check: updatePreview() is being called');

console.log('\nIssue 2: processEffect() failing silently');
console.log('  - Check: Function is being awaited properly');
console.log('  - Check: result.success is true');  
console.log('  - Check: result.processedCells is not null');

console.log('\nIssue 3: previewStore not updating');
console.log('  - Check: setPreviewData() is being called');
console.log('  - Check: previewData Map is not empty');
console.log('  - Check: isPreviewActive is true');

console.log('\nIssue 4: Canvas not re-rendering');
console.log('  - Check: useCanvasRenderer dependencies include previewData');
console.log('  - Check: Canvas render function includes preview overlay code');
console.log('  - Check: Preview cells are being drawn with transparency');

console.log('\n✨ If all checks pass, the preview should work!');
console.log('    Try the simple test: create ASCII art, open Levels, adjust shadows slider.');
console.log('    You should see immediate visual changes on the canvas.');