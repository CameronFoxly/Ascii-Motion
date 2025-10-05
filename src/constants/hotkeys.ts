/**
 * Tool hotkey configuration
 * Centralized mapping of tools to their keyboard shortcuts
 */

import type { Tool } from '../types';

export interface ToolHotkey {
  tool: Tool;
  key: string;
  displayName: string;
  description: string;
}

/**
 * Centralized tool hotkey mappings
 * 
 * Usage:
 * - Single key press switches to tool (respects text input protection)
 * - Alt key temporarily activates eyedropper tool for drawing tools  
 * - Easy to update and maintain hotkeys in one place
 */
export const TOOL_HOTKEYS: ToolHotkey[] = [
  { tool: 'pencil', key: 'p', displayName: 'P', description: 'Pencil tool hotkey' },
  { tool: 'eraser', key: 'e', displayName: 'E', description: 'Eraser tool hotkey' },
  { tool: 'paintbucket', key: 'g', displayName: 'G', description: 'Fill tool hotkey' },
  { tool: 'select', key: 'm', displayName: 'M', description: 'Rectangular selection hotkey' },
  { tool: 'lasso', key: 'l', displayName: 'L', description: 'Lasso selection hotkey' },
  { tool: 'magicwand', key: 'w', displayName: 'W', description: 'Magic wand selection hotkey' },
  { tool: 'eyedropper', key: 'i', displayName: 'I', description: 'Eyedropper tool hotkey (Alt for temporary)' },
  { tool: 'rectangle', key: 'r', displayName: 'R', description: 'Rectangle drawing hotkey' },
  { tool: 'ellipse', key: 'o', displayName: 'O', description: 'Ellipse drawing hotkey' },
  { tool: 'text', key: 't', displayName: 'T', description: 'Text tool hotkey' },
  { tool: 'asciitype', key: 'y', displayName: 'Y', description: 'ASCII Type tool hotkey' },
  { tool: 'asciibox', key: 'q', displayName: 'Q', description: 'ASCII Box drawing hotkey' },
  { tool: 'gradientfill', key: 'f', displayName: 'F', description: 'Gradient fill tool hotkey' },
];

/**
 * Create lookup maps for efficient hotkey processing
 */
export const HOTKEY_TO_TOOL = new Map<string, Tool>(
  TOOL_HOTKEYS.map(({ key, tool }) => [key.toLowerCase(), tool])
);

export const TOOL_TO_HOTKEY = new Map<Tool, ToolHotkey>(
  TOOL_HOTKEYS.map(hotkey => [hotkey.tool, hotkey])
);

/**
 * Get hotkey display name for a tool
 */
export const getToolHotkey = (tool: Tool): string | null => {
  const hotkey = TOOL_TO_HOTKEY.get(tool);
  return hotkey ? hotkey.displayName : null;
};

/**
 * Get tool for a hotkey
 */
export const getToolForHotkey = (key: string): Tool | null => {
  return HOTKEY_TO_TOOL.get(key.toLowerCase()) || null;
};

/**
 * Check if a key is a tool hotkey
 */
export const isToolHotkey = (key: string): boolean => {
  return HOTKEY_TO_TOOL.has(key.toLowerCase());
};

/**
 * Check if a key is a zoom hotkey
 */
export const isZoomHotkey = (key: string): boolean => {
  return key === '+' || key === '=' || key === '-';
};

/**
 * Get formatted tooltip text including hotkey
 */
export const getToolTooltipText = (tool: Tool, baseDescription: string): string => {
  const hotkey = getToolHotkey(tool);
  return hotkey ? `${baseDescription} (${hotkey})` : baseDescription;
};
