/**
 * Test file for clipboard utilities
 * Run this in browser console to verify OS clipboard functionality
 */

// Example test data to verify our clipboard utilities work correctly
const mockCells = new Map([
  ['0,0', { char: 'H', color: '#ffffff', bgColor: '#000000' }],
  ['1,0', { char: 'e', color: '#ffffff', bgColor: '#000000' }],
  ['2,0', { char: 'l', color: '#ffffff', bgColor: '#000000' }],
  ['3,0', { char: 'l', color: '#ffffff', bgColor: '#000000' }],
  ['4,0', { char: 'o', color: '#ffffff', bgColor: '#000000' }],
  ['0,1', { char: ' ', color: '#ffffff', bgColor: '#000000' }],
  ['1,1', { char: ' ', color: '#ffffff', bgColor: '#000000' }],
  ['2,1', { char: 'A', color: '#ffffff', bgColor: '#000000' }],
  ['3,1', { char: 'S', color: '#ffffff', bgColor: '#000000' }],
  ['4,1', { char: 'C', color: '#ffffff', bgColor: '#000000' }],
  ['5,1', { char: 'I', color: '#ffffff', bgColor: '#000000' }],
  ['6,1', { char: 'I', color: '#ffffff', bgColor: '#000000' }]
]);

// Expected output:
// Hello
//   ASCII

const mockSelection = {
  start: { x: 0, y: 0 },
  end: { x: 6, y: 1 }
};

const mockLassoSelection = new Set([
  '0,0', '1,0', '2,0', '3,0', '4,0',  // Hello
  '2,1', '3,1', '4,1', '5,1', '6,1'  // ASCII (with leading spaces)
]);

// Test functions:
// import { rectangularSelectionToText, lassoSelectionToText } from './src/utils/clipboardUtils';
// 
// console.log('Rectangular selection:');
// console.log(rectangularSelectionToText(mockCells, mockSelection));
// 
// console.log('\nLasso selection:');
// console.log(lassoSelectionToText(mockCells, mockLassoSelection));

export { mockCells, mockSelection, mockLassoSelection };
