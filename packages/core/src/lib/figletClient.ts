import figlet from 'figlet';

// Figlet types - @types/figlet is incomplete for our needs
type FigletKerningMethod = 'default' | 'full' | 'fitted' | 'controlled smushing' | 'universal smushing';

const FIGLET_FONT_MODULES = import.meta.glob<{ default: string }>(
  '../../node_modules/figlet/importable-fonts/*.js'
);

const loadedFonts = new Set<string>();
const loadingFonts = new Map<string, Promise<void>>();

const parseFont = (figlet as unknown as { parseFont: (fontName: string, definition: string) => void }).parseFont;

function getFontModuleLoader(fontName: string) {
  for (const [path, loader] of Object.entries(FIGLET_FONT_MODULES)) {
    if (path.endsWith(`/${fontName}.js`)) {
      return loader;
    }
  }

  return undefined;
}

async function ensureFontLoaded(fontName: string): Promise<void> {
  if (loadedFonts.has(fontName)) {
    return;
  }

  const existingLoad = loadingFonts.get(fontName);
  if (existingLoad) {
    await existingLoad;
    return;
  }

  const loader = getFontModuleLoader(fontName);

  if (!loader) {
    throw new Error(`Figlet font "${fontName}" is not available.`);
  }

  const loadPromise = loader().then((module) => {
    parseFont(fontName, module.default);
    loadedFonts.add(fontName);
  });

  loadingFonts.set(fontName, loadPromise);
  await loadPromise;
}

export type AsciiTypeLayoutPreset = 'normal' | 'narrow' | 'squeezed' | 'fitted' | 'wide';

const LAYOUT_PRESET_TO_FIGLET: Record<AsciiTypeLayoutPreset, FigletKerningMethod> = {
  normal: 'default',
  wide: 'full',
  fitted: 'fitted',
  narrow: 'controlled smushing',
  squeezed: 'universal smushing',
};

export const ASCII_TYPE_LAYOUT_OPTIONS: AsciiTypeLayoutPreset[] = [
  'normal',
  'narrow',
  'squeezed',
  'fitted',
  'wide',
];

export interface FigletRenderOptions {
  font: string;
  horizontalLayout: AsciiTypeLayoutPreset;
  verticalLayout: AsciiTypeLayoutPreset;
}

export interface FigletRenderResult {
  lines: string[];
}

export async function renderFigletText(
  text: string,
  { font, horizontalLayout, verticalLayout }: FigletRenderOptions
): Promise<FigletRenderResult> {
  await ensureFontLoaded(font);

  const rendered = figlet.textSync(text || ' ', {
    font: font as any, // figlet types are incomplete
    horizontalLayout: LAYOUT_PRESET_TO_FIGLET[horizontalLayout],
    verticalLayout: LAYOUT_PRESET_TO_FIGLET[verticalLayout],
  });

  const lines = rendered.split('\n');

  return { lines };
}

export function getFigletKerning(layout: AsciiTypeLayoutPreset): FigletKerningMethod {
  return LAYOUT_PRESET_TO_FIGLET[layout];
}
