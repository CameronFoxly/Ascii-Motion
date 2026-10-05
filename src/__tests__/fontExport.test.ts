/**
 * Font export regression tests (issue #163: "Export does not honour font-family").
 *
 * Covers:
 * - Font stack formatting (every family quoted so ctx.font / CSS never silently falls back)
 * - Static ExportDataCollector.collect() (silent cloud save + MCP exports) uses the live font
 * - CanvasProvider publishes its typography for non-React export paths
 * - PNG/JPG, image sequence and video frame rendering use the project font
 * - HTML, React, JSON, SVG and session exports carry the project font
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { useEffect } from 'react';
import { render, act } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

import { saveAs } from 'file-saver';
import { MONOSPACE_FONTS, getFontStack } from '../constants/fonts';
import { buildCanvasFont, formatFontStack, parseFontStack, isGenericFontFamily } from '../utils/fontStack';
import { calculateFontMetrics, getFontString } from '../utils/fontMetrics';
import { ExportDataCollector } from '../utils/exportDataCollector';
import { ExportRenderer } from '../utils/exportRenderer';
import {
  getCanvasTypographySnapshot,
  resetCanvasTypographySnapshot,
  setCanvasTypographySnapshot,
} from '../stores/canvasTypographySnapshot';
import { CanvasProvider, useCanvasContext } from '../contexts/CanvasContext';
import { useTimelineStore } from '../stores/timelineStore';
import { useCanvasStore } from '../stores/canvasStore';
import { FONT_REGISTRY } from '../utils/font/fontRegistry';
import { getBundledFontFiles } from '../utils/fontLoader';
import type { ExportDataBundle, HtmlExportSettings, VideoExportSettings } from '../types/export';
import type { Cell, Frame, FrameId } from '../types';

const PUBLIC_DIR = path.resolve(__dirname, '../../public');
const IBM_VGA_CSS = '"Px437 IBM VGA 9x14", monospace';

/**
 * Minimal validator for a CSS font-family list: each entry must be a generic keyword,
 * a quoted string, or a sequence of CSS identifiers (no token may start with a digit).
 */
function isValidCssFontFamilyList(list: string): boolean {
  return list.split(',').every((raw) => {
    const family = raw.trim();
    if (!family) return false;
    if (/^"([^"\\]|\\.)*"$/.test(family) || /^'([^'\\]|\\.)*'$/.test(family)) return true;
    return family.split(/\s+/).every((token) => /^-?[_a-zA-Z][_a-zA-Z0-9-]*$/.test(token));
  });
}

function makeCell(char: string, color = '#ffffff'): Cell {
  return { char, color, bgColor: 'transparent' };
}

function makeBundle(fontId: string, overrides: Partial<ExportDataBundle> = {}): ExportDataBundle {
  const cells = new Map<string, Cell>([
    ['0,0', makeCell('@')],
    ['1,0', makeCell('#', '#ff0000')],
  ]);
  const frames: Frame[] = [
    { id: 'f1' as FrameId, name: 'Frame 1', duration: 100, data: new Map(cells) },
    { id: 'f2' as FrameId, name: 'Frame 2', duration: 100, data: new Map([['0,1', makeCell('*')]]) },
  ];
  return {
    name: 'Font Test',
    description: '',
    metadata: { version: 'test', buildDate: '', buildHash: '', exportDate: '', projectName: 'Font Test' },
    frames,
    currentFrameIndex: 0,
    frameRate: 12,
    looping: true,
    canvasData: cells,
    canvasDimensions: { width: 4, height: 2 },
    canvasBackgroundColor: '#000000',
    showGrid: false,
    fontMetrics: calculateFontMetrics(18, getFontStack(fontId)),
    typography: { fontSize: 18, characterSpacing: 1, lineSpacing: 1, selectedFontId: fontId },
    toolState: {
      activeTool: 'pencil',
      selectedColor: '#ffffff',
      selectedBgColor: 'transparent',
      selectedCharacter: '@',
      paintBucketContiguous: true,
      rectangleFilled: false,
    },
    uiState: { zoom: 1, panOffset: { x: 0, y: 0 }, theme: 'dark' },
    paletteState: { activePaletteId: 'default', customPalettes: [], recentColors: [] },
    characterPaletteState: {
      activePaletteId: 'minimal-ascii',
      customPalettes: [],
      mappingMethod: 'brightness',
      invertDensity: false,
      characterSpacing: 1,
    },
    ...overrides,
  } as ExportDataBundle;
}

/** Fake 2D context that records every font assignment. */
function installFakeCanvas() {
  const fontAssignments: string[] = [];
  const ctx: Record<string, unknown> = {
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    fillText: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    scale: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    measureText: vi.fn(() => ({ width: 10 })),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
  };
  let currentFont = '10px sans-serif';
  Object.defineProperty(ctx, 'font', {
    get: () => currentFont,
    set: (value: string) => {
      currentFont = value;
      fontAssignments.push(value);
    },
  });
  const getContextSpy = vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(() => ctx as unknown as CanvasRenderingContext2D);
  const toBlobSpy = vi
    .spyOn(HTMLCanvasElement.prototype, 'toBlob')
    .mockImplementation(function (cb: BlobCallback) {
      cb(new Blob(['png'], { type: 'image/png' }));
    });
  return {
    fontAssignments,
    restore: () => {
      getContextSpy.mockRestore();
      toBlobSpy.mockRestore();
    },
  };
}

async function lastSavedText(): Promise<string> {
  const calls = vi.mocked(saveAs).mock.calls;
  const blob = calls[calls.length - 1][0] as Blob;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

// ============================================
// Font stack formatting
// ============================================

describe('font stack formatting', () => {
  it.each(MONOSPACE_FONTS.map((font) => [font.id, font.cssStack]))(
    '%s produces a valid canvas font string',
    (_id, cssStack) => {
      // Raw stacks must already be valid for any consumer that skips formatting
      expect(isValidCssFontFamilyList(cssStack)).toBe(true);
      const formatted = formatFontStack(cssStack);
      expect(isValidCssFontFamilyList(formatted)).toBe(true);
      expect(buildCanvasFont(16, cssStack)).toBe(`16px ${formatted}`);
      // Every named (non-generic) family is quoted
      for (const family of parseFontStack(formatted)) {
        if (!isGenericFontFamily(family)) {
          expect(formatted).toContain(`"${family}"`);
        }
      }
    }
  );

  it('quotes family names that are not valid CSS identifiers', () => {
    expect(formatFontStack('Px437 IBM VGA 9x14, monospace')).toBe(IBM_VGA_CSS);
    expect(isValidCssFontFamilyList('Px437 IBM VGA 9x14, monospace')).toBe(false);
  });

  it('is idempotent and normalises mixed quoting', () => {
    const once = formatFontStack(`'SF Mono', "Monaco", Courier New, ui-monospace, monospace`);
    expect(once).toBe('"SF Mono", "Monaco", "Courier New", ui-monospace, monospace');
    expect(formatFontStack(once)).toBe(once);
  });

  it('always guarantees a generic fallback', () => {
    expect(formatFontStack('JetBrains Mono')).toBe('"JetBrains Mono", monospace');
    expect(formatFontStack('')).toBe('monospace');
    expect(formatFontStack(undefined)).toBe('monospace');
  });

  it('getFontString (main canvas) quotes every family in the stack', () => {
    const metrics = calculateFontMetrics(20, getFontStack('auto'));
    const fontString = getFontString(metrics);
    expect(fontString.startsWith('20px ')).toBe(true);
    expect(isValidCssFontFamilyList(fontString.slice(5))).toBe(true);
    expect(fontString).toContain('"Cascadia Code"');
    expect(getFontString(calculateFontMetrics(12, getFontStack('ibm-vga')))).toBe(`12px ${IBM_VGA_CSS}`);
  });
});

// ============================================
// Bundled font assets
// ============================================

describe('bundled font assets', () => {
  it('every bundled font has loadable files in public/', () => {
    for (const font of MONOSPACE_FONTS.filter((f) => f.isBundled)) {
      const files = getBundledFontFiles(font.name);
      expect(files.length, `${font.id} has no BUNDLED_FONT_FILES entry`).toBeGreaterThan(0);
      for (const file of files) {
        expect(fs.existsSync(path.join(PUBLIC_DIR, file.url)), `${file.url} missing`).toBe(true);
      }
    }
  });

  it('every bundled font is declared via @font-face in index.css', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../index.css'), 'utf8');
    for (const font of MONOSPACE_FONTS.filter((f) => f.isBundled)) {
      for (const file of getBundledFontFiles(font.name)) {
        const pattern = new RegExp(
          `font-family:\\s*['"]${font.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"];\\s*src:\\s*url\\(['"]?${file.url}`
        );
        expect(css, `${font.name} missing @font-face`).toMatch(pattern);
      }
    }
  });

  it('outline font registry ids match MONOSPACE_FONTS and files exist', () => {
    const fontIds = new Set(MONOSPACE_FONTS.map((f) => f.id));
    for (const entry of FONT_REGISTRY) {
      expect(fontIds.has(entry.id), `${entry.id} not in MONOSPACE_FONTS`).toBe(true);
      expect(fs.existsSync(path.join(PUBLIC_DIR, entry.path)), `${entry.path} missing`).toBe(true);
    }
  });
});

// ============================================
// Static collector (silent cloud save, MCP exports)
// ============================================

describe('ExportDataCollector.collect() typography', () => {
  beforeEach(() => {
    resetCanvasTypographySnapshot();
    useTimelineStore.getState().createNewProject();
    useCanvasStore.setState({ width: 10, height: 5, cells: new Map(), canvasBackgroundColor: '#000000', showGrid: false });
  });

  afterEach(() => {
    resetCanvasTypographySnapshot();
  });

  it('uses the published canvas typography instead of hardcoded defaults', () => {
    setCanvasTypographySnapshot({
      fontMetrics: calculateFontMetrics(24, getFontStack('ibm-vga')),
      fontSize: 24,
      characterSpacing: 1.2,
      lineSpacing: 1.1,
      selectedFontId: 'ibm-vga',
      actualFont: 'Px437 IBM VGA 9x14',
      zoom: 2,
      panOffset: { x: 5, y: 6 },
    });

    const data = ExportDataCollector.collect();

    expect(data.typography).toEqual({
      fontSize: 24,
      characterSpacing: 1.2,
      lineSpacing: 1.1,
      selectedFontId: 'ibm-vga',
      actualFont: 'Px437 IBM VGA 9x14',
    });
    expect(data.fontMetrics.fontFamily).toBe(getFontStack('ibm-vga'));
    expect(data.fontMetrics.fontSize).toBe(24);
    expect(data.fontMetrics.characterWidth).toBeGreaterThan(0);
    expect(data.uiState.zoom).toBe(2);
    expect(data.uiState.panOffset).toEqual({ x: 5, y: 6 });
  });

  it('defaults match CanvasProvider defaults (not monospace/16px)', () => {
    const data = ExportDataCollector.collect();
    expect(data.typography.selectedFontId).toBe('auto');
    expect(data.typography.fontSize).toBe(18);
    expect(data.fontMetrics.fontFamily).toBe(getFontStack('auto'));
  });
});

describe('CanvasProvider typography publishing', () => {
  afterEach(() => {
    resetCanvasTypographySnapshot();
  });

  it('publishes font changes for non-React export paths', async () => {
    let api: ReturnType<typeof useCanvasContext> | null = null;
    const Probe: React.FC = () => {
      const ctx = useCanvasContext();
      useEffect(() => {
        api = ctx;
      });
      return null;
    };

    render(React.createElement(CanvasProvider, null, React.createElement(Probe)));

    await act(async () => {
      api!.setSelectedFontId('courier-new');
      api!.setFontSize(22);
      api!.setCharacterSpacing(1.5);
      api!.setLineSpacing(1.25);
    });

    const snapshot = getCanvasTypographySnapshot();
    expect(snapshot.selectedFontId).toBe('courier-new');
    expect(snapshot.fontSize).toBe(22);
    expect(snapshot.characterSpacing).toBe(1.5);
    expect(snapshot.lineSpacing).toBe(1.25);
    expect(snapshot.fontMetrics.fontFamily).toBe(getFontStack('courier-new'));
  });
});

// ============================================
// Raster exports (PNG/JPG, image sequence, video frames)
// ============================================

describe('raster exports honour the project font', () => {
  let fakeCanvas: ReturnType<typeof installFakeCanvas>;

  beforeEach(() => {
    vi.mocked(saveAs).mockClear();
    fakeCanvas = installFakeCanvas();
  });

  afterEach(() => {
    fakeCanvas.restore();
  });

  it.each(['ibm-vga', 'jetbrains-mono', 'courier-new', 'c64-pro', 'auto'])(
    'PNG export renders with %s',
    async (fontId) => {
      const renderer = new ExportRenderer();
      await renderer.exportImage(
        makeBundle(fontId),
        { format: 'png', sizeMultiplier: 2, includeGrid: false, quality: 90 },
        'out'
      );
      expect(fakeCanvas.fontAssignments).toContain(buildCanvasFont(36, getFontStack(fontId)));
      expect(fakeCanvas.fontAssignments.every((font) => isValidCssFontFamilyList(font.replace(/^\d+(\.\d+)?px /, '')))).toBe(true);
    }
  );

  it('sanitises legacy unquoted font stacks before assigning ctx.font', async () => {
    const bundle = makeBundle('ibm-vga', {
      fontMetrics: { ...calculateFontMetrics(18, 'x'), fontFamily: 'Px437 IBM VGA 9x14, monospace' },
    });
    await new ExportRenderer().exportImage(
      bundle,
      { format: 'png', sizeMultiplier: 1, includeGrid: false, quality: 90 },
      'out'
    );
    expect(fakeCanvas.fontAssignments).toContain(`18px ${IBM_VGA_CSS}`);
  });

  it('image sequence export renders every frame with the project font', async () => {
    const renderer = new ExportRenderer();
    await renderer.exportImageSequence(
      makeBundle('ibm-vga'),
      { format: 'png', sizeMultiplier: 1, includeGrid: false, quality: 90 },
      'seq'
    );
    const expected = buildCanvasFont(18, getFontStack('ibm-vga'));
    expect(fakeCanvas.fontAssignments.filter((f) => f === expected).length).toBe(2);
  });

  it('video frames are rendered with the project font', async () => {
    const renderer = new ExportRenderer();
    const settings: VideoExportSettings = {
      sizeMultiplier: 1,
      frameRate: 'auto',
      frameRange: { start: 0, end: 1 },
      quality: 'high',
      crf: 24,
      format: 'webm',
      includeGrid: false,
      loops: 'none',
    } as VideoExportSettings;
    const frames = await (renderer as unknown as {
      generateVideoFrames: (d: ExportDataBundle, s: VideoExportSettings) => Promise<HTMLCanvasElement[]>;
    }).generateVideoFrames(makeBundle('ibm-dos'), settings);

    expect(frames).toHaveLength(2);
    const expected = buildCanvasFont(18, getFontStack('ibm-dos'));
    expect(fakeCanvas.fontAssignments.filter((f) => f === expected).length).toBe(2);
  });
});

// ============================================
// Text-based exports (HTML, React, JSON, SVG, session)
// ============================================

describe('document exports honour the project font', () => {
  const htmlSettings: HtmlExportSettings = {
    includeMetadata: true,
    animationSpeed: 1,
    backgroundColor: '#000000',
    fontFamily: 'project',
    fontSize: 14,
    loops: 'infinite',
  };

  beforeEach(() => {
    vi.mocked(saveAs).mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('HTML export uses the project font and embeds bundled font files', async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3, 4])));
    vi.stubGlobal('fetch', fetchMock);

    await new ExportRenderer().exportHtml(makeBundle('ibm-vga'), htmlSettings, 'anim');
    const html = await lastSavedText();

    expect(fetchMock).toHaveBeenCalledWith('/fonts/Px437_IBM_VGA_9x14.ttf');
    expect(html).toContain(`font-family: ${IBM_VGA_CSS};`);
    expect(html).toContain('@font-face');
    expect(html).toContain('font-family: "Px437 IBM VGA 9x14";');
    expect(html).toContain("src: url(data:font/ttf;base64,AQIDBA==) format('truetype');");
  });

  it('HTML export does not embed system fonts', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await new ExportRenderer().exportHtml(makeBundle('courier-new'), htmlSettings, 'anim');
    const html = await lastSavedText();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(html).not.toContain('@font-face');
    expect(html).toContain('font-family: "Courier New", monospace;');
  });

  it('HTML export font override still works', async () => {
    vi.stubGlobal('fetch', vi.fn());
    await new ExportRenderer().exportHtml(makeBundle('ibm-vga'), { ...htmlSettings, fontFamily: 'courier' }, 'anim');
    const html = await lastSavedText();
    expect(html).toContain('font-family: "Courier New", monospace;');
    expect(html).not.toContain('@font-face');
  });

  it('React export uses a valid, quoted project font stack', async () => {
    await new ExportRenderer().exportReactComponent(
      makeBundle('ibm-vga'),
      { typescript: true, includeControls: false, includeBackground: true, fileName: 'Anim' },
      'Anim'
    );
    const code = await lastSavedText();
    expect(code).toContain(`const FONT_FAMILY = ${JSON.stringify(IBM_VGA_CSS)};`);
  });

  it('JSON export records the selected font', async () => {
    await new ExportRenderer().exportJson(
      makeBundle('fira-code'),
      { includeMetadata: false, humanReadable: true, includeEmptyCells: false },
      'anim'
    );
    const json = JSON.parse(await lastSavedText());
    expect(json.typography.selectedFontId).toBe('fira-code');
    expect(json.typography.fontFamily).toBe(getFontStack('fira-code'));
  });

  it('session export records the selected font and spacing', async () => {
    const bundle = makeBundle('geist-mono', {
      typography: { fontSize: 20, characterSpacing: 1.3, lineSpacing: 1.2, selectedFontId: 'geist-mono' },
    });
    await new ExportRenderer().exportSession(bundle, { includeMetadata: true, compressData: false }, 'proj');
    const session = JSON.parse(await lastSavedText());
    expect(session.typography).toEqual({
      fontSize: 20,
      characterSpacing: 1.3,
      lineSpacing: 1.2,
      selectedFontId: 'geist-mono',
    });
  });

  it('SVG export uses the project font in text mode', async () => {
    const bundle = makeBundle('ibm-vga', {
      typography: { fontSize: 18, characterSpacing: 1, lineSpacing: 1, selectedFontId: 'ibm-vga', actualFont: 'Px437 IBM VGA 9x14' },
    });
    await new ExportRenderer().exportSvg(
      bundle,
      {
        format: 'svg',
        sizeMultiplier: 1,
        includeGrid: false,
        quality: 90,
        svgSettings: { includeGrid: false, textAsOutlines: false, includeBackground: true, prettify: true },
      },
      'anim'
    );
    const svg = await lastSavedText();
    expect(svg).toContain(`font-family="'Px437 IBM VGA 9x14', monospace"`);
  });

  it('SVG outlines load the project font, not a fixed outline font', async () => {
    const fontModule = await import('../utils/font');
    const loadSpy = vi
      .spyOn(fontModule.fontLoader, 'loadFont')
      .mockResolvedValue({ font: {} as never, family: 'x', metadata: FONT_REGISTRY[0], loadedAt: 0 } as never);
    const renderer = new ExportRenderer() as unknown as {
      loadOutlineFont: (id: string | undefined) => Promise<unknown>;
    };

    await renderer.loadOutlineFont('ibm-vga');
    expect(loadSpy).toHaveBeenCalledWith('ibm-vga', expect.anything());

    loadSpy.mockClear();
    // System fonts have no outline file: fall back to pixel tracing with the project font
    expect(await renderer.loadOutlineFont('sf-mono')).toBeUndefined();
    expect(loadSpy).not.toHaveBeenCalled();

    loadSpy.mockRestore();
  });
});

// ============================================
// Premium gallery/publish font mapping (only when the submodule is checked out)
// ============================================

const PREMIUM_FONT_MAPPING = path.resolve(__dirname, '../../packages/premium/src/community/utils/fontMapping.ts');

describe.skipIf(!fs.existsSync(PREMIUM_FONT_MAPPING))('premium font mapping', () => {
  it.each(MONOSPACE_FONTS.map((font) => [font.id, font.cssStack]))(
    '%s maps to the same valid stack as the editor',
    async (fontId, cssStack) => {
      const { getFontStack: getPremiumFontStack } = await import(
        /* @vite-ignore */ PREMIUM_FONT_MAPPING
      );
      const premiumStack: string = getPremiumFontStack(fontId);
      expect(isValidCssFontFamilyList(premiumStack)).toBe(true);
      expect(parseFontStack(premiumStack)).toEqual(parseFontStack(cssStack));
    }
  );
});
