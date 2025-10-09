// Palette validation utilities for import/export functionality

import type { PaletteExportFormat } from '../types/palette';
import { isValidHexColor, isPaletteExportFormat } from '../types/palette';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: PaletteExportFormat;
}

/**
 * Validate JSON string as palette export format
 */
export const validatePaletteJSON = (jsonString: string): ValidationResult => {
  const result: ValidationResult = {
    isValid: false,
    errors: [],
    warnings: []
  };

  // Parse JSON
  let parsedData: unknown;
  try {
    parsedData = JSON.parse(jsonString);
  } catch {
    result.errors.push('Invalid JSON format. Please check the file syntax.');
    return result;
  }

  // Check if it's an object
  if (typeof parsedData !== 'object' || parsedData === null) {
    result.errors.push('Palette data must be a JSON object.');
    return result;
  }

  const draft = parsedData as Record<string, unknown>;

  // Validate required fields
  if (typeof draft.name !== 'string') {
    result.errors.push('Palette must have a "name" field of type string.');
  }

  if (!Array.isArray(draft.colors)) {
    result.errors.push('Palette must have a "colors" field of type array.');
  }

  // If basic structure is invalid, return early
  if (result.errors.length > 0) {
    return result;
  }

  // Validate palette name
  const name = (draft.name as string).trim();
  if (name.length === 0) {
    result.errors.push('Palette name cannot be empty.');
  } else if (name.length > 100) {
    result.warnings.push('Palette name is very long (over 100 characters).');
  }

  // Validate colors array
  const colors = draft.colors as unknown[];
  if (colors.length === 0) {
    result.errors.push('Palette must contain at least one color.');
  } else if (colors.length > 256) {
    result.warnings.push('Palette contains a very large number of colors (over 256). This may impact performance.');
  }

  // Validate each color
  const validColors: string[] = [];
  const invalidColors: string[] = [];
  const duplicateColors: string[] = [];
  const seenColors = new Set<string>();

  colors.forEach((color, index: number) => {
    if (typeof color !== 'string') {
      invalidColors.push(`Color at index ${index} is not a string.`);
      return;
    }

    const trimmedColor = color.trim();
    if (!isValidHexColor(trimmedColor)) {
      invalidColors.push(`Color "${color}" at index ${index} is not a valid hex color.`);
      return;
    }

    const normalizedColor = trimmedColor.toUpperCase();
    if (seenColors.has(normalizedColor)) {
      duplicateColors.push(normalizedColor);
    } else {
      seenColors.add(normalizedColor);
      validColors.push(normalizedColor);
    }
  });

  // Add validation errors
  if (invalidColors.length > 0) {
    result.errors.push(...invalidColors);
  }

  // Add warnings for duplicates
  if (duplicateColors.length > 0) {
    result.warnings.push(`Found ${duplicateColors.length} duplicate colors that will be removed: ${duplicateColors.slice(0, 3).join(', ')}${duplicateColors.length > 3 ? '...' : ''}`);
  }

  // Check if we have any valid colors after validation
  if (validColors.length === 0) {
    result.errors.push('No valid colors found in the palette.');
  }

  // If no errors, mark as valid and prepare cleaned data
  if (result.errors.length === 0) {
    result.isValid = true;
    result.data = {
      name: name,
      colors: validColors
    };
  }

  return result;
};

/**
 * Validate palette export format object
 */
export const validatePaletteObject = (data: unknown): ValidationResult => {
  const result: ValidationResult = {
    isValid: false,
    errors: [],
    warnings: []
  };

  if (!isPaletteExportFormat(data)) {
    result.errors.push('Invalid palette format. Expected object with "name" and "colors" fields.');
    return result;
  }

  // Additional validation beyond type checking
  if (data.name.trim().length === 0) {
    result.errors.push('Palette name cannot be empty.');
  }

  if (data.colors.length === 0) {
    result.errors.push('Palette must contain at least one color.');
  }

  if (result.errors.length === 0) {
    result.isValid = true;
    result.data = data;
  }

  return result;
};

/**
 * Sanitize and normalize palette data
 */
export const sanitizePaletteData = (data: PaletteExportFormat): PaletteExportFormat => {
  return {
    name: data.name.trim(),
    colors: [...new Set(data.colors.map(color => color.toUpperCase()))] // Remove duplicates and normalize case
  };
};

/**
 * Generate validation summary for user display
 */
export const getValidationSummary = (result: ValidationResult): string => {
  const parts: string[] = [];

  if (result.isValid) {
    parts.push('✅ Valid palette format');
    if (result.data) {
      parts.push(`📊 ${result.data.colors.length} colors found`);
    }
  } else {
    parts.push('❌ Invalid palette format');
  }

  if (result.errors.length > 0) {
    parts.push(`🚨 ${result.errors.length} error${result.errors.length > 1 ? 's' : ''}`);
  }

  if (result.warnings.length > 0) {
    parts.push(`⚠️ ${result.warnings.length} warning${result.warnings.length > 1 ? 's' : ''}`);
  }

  return parts.join(' • ');
};

/**
 * Common palette file extensions for validation
 */
export const SUPPORTED_PALETTE_EXTENSIONS = ['.json', '.palette', '.pal'] as const;

/**
 * Check if filename has supported extension
 */
export const hasSupportedExtension = (filename: string): boolean => {
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex === -1) {
    return false;
  }

  const extension = filename.toLowerCase().slice(dotIndex) as typeof SUPPORTED_PALETTE_EXTENSIONS[number];
  return SUPPORTED_PALETTE_EXTENSIONS.includes(extension);
};
