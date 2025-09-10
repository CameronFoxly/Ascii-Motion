/**
 * Test script to validate grid color calculations
 * This can be used to quickly test different background colors
 */
import { calculateAdaptiveGridColor } from './gridColor';

// Test cases for various background colors
const testColors = [
  '#000000',   // Pure black
  '#ffffff',   // Pure white  
  '#ff0000',   // Red
  '#00ff00',   // Green
  '#0000ff',   // Blue
  '#ffff00',   // Yellow
  '#ff00ff',   // Magenta
  '#00ffff',   // Cyan
  '#808080',   // Gray
  '#400080',   // Dark purple
  '#ffa500',   // Orange
  '#8b4513',   // Brown
  'transparent', // Transparent
];

console.log('Grid Color Test Results:');
console.log('========================');

testColors.forEach(bgColor => {
  const gridColor = calculateAdaptiveGridColor(bgColor);
  console.log(`Background: ${bgColor.padEnd(12)} → Grid: ${gridColor}`);
});

// Test RGB parsing
console.log('\nRGB Parsing Tests:');
console.log('==================');
const rgbTests = ['#ff0000', '#00ff00', '#0000ff', 'invalid', ''];
rgbTests.forEach(color => {
  try {
    const result = calculateAdaptiveGridColor(color);
    console.log(`${color.padEnd(10)} → ${result}`);
  } catch (error) {
    console.log(`${color.padEnd(10)} → Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

export {}; // Make this a module
