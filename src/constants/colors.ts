/**
 * ANSI 4-bit color palette
 * These colors are globally accessible for easy theming and customization
 */

export const ANSI_COLORS = {
  // Standard colors (0-7)
  black: '#000000',
  red: '#cd0000',
  green: '#00cd00',
  yellow: '#cdcd00',
  blue: '#0000ee',
  magenta: '#cd00cd',
  cyan: '#00cdcd',
  white: '#e5e5e5',
  
  // Bright colors (8-15)
  brightBlack: '#7f7f7f',
  brightRed: '#ff0000',
  brightGreen: '#00ff00',
  brightYellow: '#ffff00',
  brightBlue: '#5c5cff',
  brightMagenta: '#ff00ff',
  brightCyan: '#00ffff',
  brightWhite: '#ffffff',
} as const

/**
 * Semantic color mappings using ANSI palette
 */
export const SEMANTIC_COLORS = {
  primary: ANSI_COLORS.brightBlue,
  secondary: ANSI_COLORS.cyan,
  accent: ANSI_COLORS.brightMagenta,
  success: ANSI_COLORS.brightGreen,
  warning: ANSI_COLORS.brightYellow,
  error: ANSI_COLORS.brightRed,
  info: ANSI_COLORS.brightCyan,
  muted: ANSI_COLORS.brightBlack,
} as const

/**
 * CSS custom properties for the ANSI color palette
 * Use these in your CSS or Tailwind classes
 */
export const ANSI_CSS_VARS = {
  '--ansi-black': ANSI_COLORS.black,
  '--ansi-red': ANSI_COLORS.red,
  '--ansi-green': ANSI_COLORS.green,
  '--ansi-yellow': ANSI_COLORS.yellow,
  '--ansi-blue': ANSI_COLORS.blue,
  '--ansi-magenta': ANSI_COLORS.magenta,
  '--ansi-cyan': ANSI_COLORS.cyan,
  '--ansi-white': ANSI_COLORS.white,
  '--ansi-bright-black': ANSI_COLORS.brightBlack,
  '--ansi-bright-red': ANSI_COLORS.brightRed,
  '--ansi-bright-green': ANSI_COLORS.brightGreen,
  '--ansi-bright-yellow': ANSI_COLORS.brightYellow,
  '--ansi-bright-blue': ANSI_COLORS.brightBlue,
  '--ansi-bright-magenta': ANSI_COLORS.brightMagenta,
  '--ansi-bright-cyan': ANSI_COLORS.brightCyan,
  '--ansi-bright-white': ANSI_COLORS.brightWhite,
} as const

export type AnsiColor = keyof typeof ANSI_COLORS
export type SemanticColor = keyof typeof SEMANTIC_COLORS
