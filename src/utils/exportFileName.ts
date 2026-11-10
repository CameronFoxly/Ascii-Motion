/**
 * ASCII Motion - Open Source ASCII Art Editor
 *
 * @license MIT
 * @copyright 2025 ASCII Motion
 * @see LICENSE-MIT for full license text
 */

/** Turn free text into a safe export file name (lower case, dashes for spaces). */
export const sanitizeFileName = (value: string): string => {
  if (!value) return '';
  return value
    .replace(/\s+/g, '-') // spaces to dashes
    .replace(/[^a-zA-Z0-9\-_]/g, '') // allow alphanumeric, dash, underscore
    .replace(/-+/g, '-') // collapse multiple dashes
    .replace(/_+/g, '_') // collapse multiple underscores
    .toLowerCase();
};

export const finalizeFileName = (value: string): string => {
  // Remove leading/trailing dashes and underscores only when finalizing for export
  return value.replace(/^[-_]+|[-_]+$/g, '');
};
