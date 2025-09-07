// ASCII character sets organized by style

// Re-export hotkey utilities for easier access
export * from './hotkeys';

export const CHARACTER_CATEGORIES = {
  "Basic Text": [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
  ],
  "Punctuation": [
    '.', ',', '!', '?', ';', ':', '"', "'", '(', ')', '[', ']', '{', '}',
    '-', '_', '=', '+', '/', '\\', '|', '<', '>', '~', '`'
  ],
  "Math/Symbols": [
    '+', '-', '*', '/', '=', '<', '>', '%', '$', '#', '@', '&', '^',
    '°', '±', '÷', '×', '∞', '∑', '∏', '√', '∂', '∆', '∇', '∫'
  ],
  "Lines/Borders": [
    '─', '│', '┌', '┐', '└', '┘', '├', '┤', '┬', '┴', '┼',
    '═', '║', '╔', '╗', '╚', '╝', '╠', '╣', '╦', '╩', '╬',
    '┏', '┓', '┗', '┛', '┣', '┫', '┳', '┻', '╋',
    '╭', '╮', '╯', '╰', '╱', '╲', '╳'
  ],
  "Blocks/Shading": [
    '█', '▓', '▒', '░', '▄', '▀', '■', '□', '▪', '▫',
    '◆', '◇', '○', '●', '◦', '•', '▬', '▭', '▮', '▯'
  ],
  "Arrows": [
    '←', '→', '↑', '↓', '↖', '↗', '↘', '↙', '⬅', '➡', '⬆', '⬇',
    '↔', '↕', '⤴', '⤵', '↩', '↪', '⤸', '⤹', '⤺', '⤻'
  ],
  "Geometric": [
    '△', '▲', '▼', '▽', '◄', '►', '◀', '▶', '◥', '◤', '◣', '◢',
    '☉', '◎', '◉', '○', '●', '◦', '•', '⊙', '⊚', '⊛'
  ],
  "Special": [
    '★', '☆', '♠', '♣', '♥', '♦', '※', '§', '¶', '†', '‡', '•',
    '‰', '‱', '℃', '℉', '№', '℗', '©', '®', '™', '♪', '♫', '♬'
  ]
} as const;

export const DEFAULT_CANVAS_SIZES = [
  { name: "Terminal (80x24)", width: 80, height: 24 },
  { name: "Wide Terminal (120x40)", width: 120, height: 40 },
  { name: "Square (50x50)", width: 50, height: 50 },
  { name: "Large (100x60)", width: 100, height: 60 },
  { name: "Max (200x100)", width: 200, height: 100 }
] as const;

export const DEFAULT_COLORS = [
  "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF",
  "#FFFF00", "#FF00FF", "#00FFFF", "#808080", "#C0C0C0",
  "#800000", "#008000", "#000080", "#808000", "#800080",
  "#008080", "#FFA500", "#FFC0CB", "#A52A2A"
] as const;

export const EXPORT_FORMATS = [
  { name: "Text File", extension: "txt", type: "text" },
  { name: "JSON Project", extension: "json", type: "project" },
  { name: "GIF Animation", extension: "gif", type: "image" },
  { name: "MP4 Video", extension: "mp4", type: "video" }
] as const;

export const FRAME_RATE_PRESETS = [
  { name: "Slow", fps: 8 },
  { name: "Normal", fps: 12 },
  { name: "Fast", fps: 24 },
  { name: "Smooth", fps: 30 }
] as const;

export const MAX_LIMITS = {
  CANVAS_WIDTH: 200,
  CANVAS_HEIGHT: 100,
  FRAME_COUNT: 500,
  ANIMATION_DURATION: 60000, // 60 seconds in ms
  UNDO_HISTORY: 50
} as const;

export const DEFAULT_FRAME_DURATION = 100; // ms
export const MIN_FRAME_DURATION = 50; // ms
export const MAX_FRAME_DURATION = 10000; // ms
