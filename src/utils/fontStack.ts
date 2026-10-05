/**
 * Font stack formatting helpers.
 *
 * Font stacks in `MONOSPACE_FONTS` are stored unquoted (e.g. `JetBrains Mono, monospace`).
 * Unquoted family names are only valid CSS when every space-separated token is a valid
 * identifier — names such as `Px437 IBM VGA 9x14` (token starting with a digit) are not,
 * and `ctx.font` / CSS silently ignores the whole declaration. Every consumer that writes
 * a stack into `ctx.font` or generated CSS/JS must go through these helpers.
 */

const GENERIC_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'math',
  'emoji',
  'fangsong',
]);

export const DEFAULT_EXPORT_FONT_STACK =
  'SF Mono, Monaco, Cascadia Code, Consolas, JetBrains Mono, Fira Code, Monaspace Neon, Geist Mono, Courier New, monospace';

export const isGenericFontFamily = (name: string): boolean =>
  GENERIC_FAMILIES.has(name.trim().toLowerCase());

/**
 * Split a font stack into bare family names (quotes stripped, empties removed).
 */
export const parseFontStack = (stack: string | null | undefined): string[] => {
  if (!stack) return [];
  return stack
    .split(',')
    .map((family) => family.trim().replace(/^(['"])(.*)\1$/, '$2').trim())
    .filter((family) => family.length > 0);
};

/**
 * Format a font stack so it is always valid for `ctx.font` and CSS `font-family`.
 * Every non-generic family is double-quoted and a `monospace` fallback is guaranteed.
 */
export const formatFontStack = (stack: string | null | undefined): string => {
  const families = parseFontStack(stack);
  const formatted = families.map((family) =>
    isGenericFontFamily(family) ? family.toLowerCase() : `"${family.replace(/["\\]/g, '\\$&')}"`
  );

  if (!families.some(isGenericFontFamily)) {
    formatted.push('monospace');
  }

  return formatted.join(', ');
};

/**
 * Build a `ctx.font` shorthand for the given size and stack.
 */
export const buildCanvasFont = (fontSize: number, stack: string | null | undefined): string =>
  `${fontSize}px ${formatFontStack(stack)}`;
