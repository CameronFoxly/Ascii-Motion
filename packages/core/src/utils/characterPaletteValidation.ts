// Character palette validation utilities for import/export functionality

import type { CharacterPaletteExportFormat } from '../types/palette';
import { isValidCharacter } from '../types/palette';

type CharacterPaletteDraft = {
  name?: unknown;
  characters?: unknown;
  category?: unknown;
  [key: string]: unknown;
};

export interface CharacterValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: CharacterPaletteExportFormat;
}

/**
 * Validate JSON string as character palette export format
 */
export const validateCharacterPaletteJSON = (jsonString: string): CharacterValidationResult => {
  const result: CharacterValidationResult = {
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
    result.errors.push('Character palette data must be a JSON object.');
    return result;
  }

  const draft = parsedData as CharacterPaletteDraft;

  // Validate required fields
  if (typeof draft.name !== 'string') {
    result.errors.push('Character palette must have a "name" field of type string.');
  }

  if (!Array.isArray(draft.characters)) {
    result.errors.push('Character palette must have a "characters" field of type array.');
  }

  if (typeof draft.category !== 'string') {
    result.errors.push('Character palette must have a "category" field of type string.');
  }

  // If basic structure is invalid, return early
  if (result.errors.length > 0) {
    return result;
  }

  // Validate characters array
  const characters = draft.characters as unknown[];
  if (characters.length === 0) {
    result.errors.push('Character palette must contain at least one character.');
  }

  // Check each character
  const invalidCharacters: string[] = [];
  const duplicateCharacters: string[] = [];
  const characterCounts: Record<string, number> = {};

  characters.forEach((char, index) => {
    if (typeof char !== 'string' || !isValidCharacter(char)) {
      invalidCharacters.push(`Position ${index}: "${char}"`);
    } else {
      characterCounts[char] = (characterCounts[char] || 0) + 1;
      if (characterCounts[char] === 2) {
        duplicateCharacters.push(char);
      }
    }
  });

  if (invalidCharacters.length > 0) {
    result.errors.push(
      `Invalid characters found (must be single characters): ${invalidCharacters.join(', ')}`
    );
  }

  // Validate category
  const validCategories = ['ascii', 'unicode', 'blocks', 'custom'];
  if (!validCategories.includes(draft.category as string)) {
    result.errors.push(
      `Invalid category "${String(draft.category)}". Must be one of: ${validCategories.join(', ')}`
    );
  }

  // Warnings for duplicates
  if (duplicateCharacters.length > 0) {
    result.warnings.push(
      `Duplicate characters found: ${duplicateCharacters.map(c => c === ' ' ? '␣' : c).join(', ')}`
    );
  }

  // Warning for very large palettes
  if (characters.length > 50) {
    result.warnings.push(
      `Large character palette (${characters.length} characters). Consider splitting into smaller palettes for better performance.`
    );
  }

  // Warning for empty name
  if (draft.name?.toString().trim().length === 0) {
    result.errors.push('Character palette name cannot be empty.');
  }

  // If no errors, it's valid
  if (result.errors.length === 0) {
    result.isValid = true;
    result.data = draft as CharacterPaletteExportFormat;
  }

  return result;
};

/**
 * Get a human-readable summary of validation results
 */
export const getCharacterValidationSummary = (validation: CharacterValidationResult): string => {
  if (!validation.data) return 'Invalid character palette data';
  
  const { data } = validation;
  const characterCount = data.characters.length;
  const uniqueCount = new Set(data.characters).size;
  
  let summary = `Valid character palette "${data.name}" with ${characterCount} character${characterCount !== 1 ? 's' : ''}`;
  
  if (uniqueCount !== characterCount) {
    summary += ` (${uniqueCount} unique)`;
  }
  
  summary += ` in ${data.category} category.`;
  
  return summary;
};

/**
 * Sanitize character palette data for import
 */
export const sanitizeCharacterPaletteData = (data: CharacterPaletteExportFormat): CharacterPaletteExportFormat => {
  // Remove duplicates while preserving order
  const uniqueCharacters: string[] = [];
  const seen = new Set<string>();
  
  data.characters.forEach(char => {
    if (!seen.has(char)) {
      seen.add(char);
      uniqueCharacters.push(char);
    }
  });
  
  return {
    name: data.name.trim() || 'Imported Palette',
    characters: uniqueCharacters,
    category: data.category
  };
};

/**
 * Validate character palette name for export filename
 */
export const sanitizeCharacterPaletteNameForFileName = (name: string): string => {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .toLowerCase()
    .substring(0, 50) || 'character-palette'; // Fallback name
};