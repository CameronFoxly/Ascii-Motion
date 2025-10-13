/**
 * Box Drawing Styles - Character sets for ASCII Box Drawing Tool
 * 
 * Each style defines the complete set of box-drawing characters needed
 * for automatic character selection based on surrounding connections.
 */

export interface BoxDrawingStyle {
  id: string;
  name: string;
  characters: {
    // Corners
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
    
    // Lines
    horizontal: string;
    vertical: string;
    
    // T-junctions
    teeTop: string;     // ┬ - connection from bottom, left, right
    teeBottom: string;  // ┴ - connection from top, left, right
    teeLeft: string;    // ├ - connection from top, bottom, right
    teeRight: string;   // ┤ - connection from top, bottom, left
    
    // Cross
    cross: string;      // ┼ - connections from all 4 directions
  };
  preview: string[][]; // 5x5 grid for visual preview in panel
}

/**
 * All available box drawing styles
 */
export const BOX_DRAWING_STYLES: BoxDrawingStyle[] = [
  {
    id: 'single-line',
    name: 'Single Line',
    characters: {
      topLeft: '┌',
      topRight: '┐',
      bottomLeft: '└',
      bottomRight: '┘',
      horizontal: '─',
      vertical: '│',
      teeTop: '┬',
      teeBottom: '┴',
      teeLeft: '├',
      teeRight: '┤',
      cross: '┼'
    },
    preview: [
      ['┌', '─', '┬', '─', '┐'],
      ['│', ' ', '│', ' ', '│'],
      ['├', '─', '┼', '─', '┤'],
      ['│', ' ', '│', ' ', '│'],
      ['└', '─', '┴', '─', '┘']
    ]
  },
  {
    id: 'double-line',
    name: 'Double Line',
    characters: {
      topLeft: '╔',
      topRight: '╗',
      bottomLeft: '╚',
      bottomRight: '╝',
      horizontal: '═',
      vertical: '║',
      teeTop: '╦',
      teeBottom: '╩',
      teeLeft: '╠',
      teeRight: '╣',
      cross: '╬'
    },
    preview: [
      ['╔', '═', '╦', '═', '╗'],
      ['║', ' ', '║', ' ', '║'],
      ['╠', '═', '╬', '═', '╣'],
      ['║', ' ', '║', ' ', '║'],
      ['╚', '═', '╩', '═', '╝']
    ]
  },
  {
    id: 'heavy-line',
    name: 'Heavy Line',
    characters: {
      topLeft: '┏',
      topRight: '┓',
      bottomLeft: '┗',
      bottomRight: '┛',
      horizontal: '━',
      vertical: '┃',
      teeTop: '┳',
      teeBottom: '┻',
      teeLeft: '┣',
      teeRight: '┫',
      cross: '╋'
    },
    preview: [
      ['┏', '━', '┳', '━', '┓'],
      ['┃', ' ', '┃', ' ', '┃'],
      ['┣', '━', '╋', '━', '┫'],
      ['┃', ' ', '┃', ' ', '┃'],
      ['┗', '━', '┻', '━', '┛']
    ]
  },
  {
    id: 'rounded',
    name: 'Rounded',
    characters: {
      topLeft: '╭',
      topRight: '╮',
      bottomLeft: '╰',
      bottomRight: '╯',
      horizontal: '─',
      vertical: '│',
      teeTop: '┬',
      teeBottom: '┴',
      teeLeft: '├',
      teeRight: '┤',
      cross: '┼'
    },
    preview: [
      ['╭', '─', '┬', '─', '╮'],
      ['│', ' ', '│', ' ', '│'],
      ['├', '─', '┼', '─', '┤'],
      ['│', ' ', '│', ' ', '│'],
      ['╰', '─', '┴', '─', '╯']
    ]
  },
  {
    id: 'ascii-simple',
    name: 'ASCII Simple',
    characters: {
      topLeft: '+',
      topRight: '+',
      bottomLeft: '+',
      bottomRight: '+',
      horizontal: '-',
      vertical: '|',
      teeTop: '+',
      teeBottom: '+',
      teeLeft: '+',
      teeRight: '+',
      cross: '+'
    },
    preview: [
      ['+', '-', '+', '-', '+'],
      ['|', ' ', '|', ' ', '|'],
      ['+', '-', '+', '-', '+'],
      ['|', ' ', '|', ' ', '|'],
      ['+', '-', '+', '-', '+']
    ]
  }
];

/**
 * Get all box drawing characters from all styles
 * Used for detecting if a character is a box drawing character
 */
export function getAllBoxDrawingCharacters(): Set<string> {
  const chars = new Set<string>();
  
  BOX_DRAWING_STYLES.forEach(style => {
    Object.values(style.characters).forEach(char => {
      chars.add(char);
    });
  });
  
  return chars;
}

/**
 * Check if a character is a box drawing character
 */
export function isBoxDrawingCharacter(char: string): boolean {
  const boxChars = getAllBoxDrawingCharacters();
  return boxChars.has(char);
}

/**
 * Get box drawing style by ID
 */
export function getBoxDrawingStyle(id: string): BoxDrawingStyle | undefined {
  return BOX_DRAWING_STYLES.find(style => style.id === id);
}
