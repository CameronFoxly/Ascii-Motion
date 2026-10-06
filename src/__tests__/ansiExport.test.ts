import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

import { saveAs } from 'file-saver';
import { ExportRenderer } from '../utils/exportRenderer';
import type { Cell, Frame, FrameId } from '../types';
import type { AnsiExportSettings, ExportDataBundle } from '../types/export';

const makeCell = (char: string, color: string, bgColor = 'transparent'): Cell => ({
  char,
  color,
  bgColor,
});

const makeBundle = (): ExportDataBundle => {
  const frames: Frame[] = [
    {
      id: 'frame-1' as FrameId,
      name: 'Frame 1',
      duration: 125,
      data: new Map([
        ['0,0', makeCell('A', '#ff0000')],
        ['1,0', makeCell("'", '#ffffff')],
      ]),
    },
    {
      id: 'frame-2' as FrameId,
      name: 'Frame 2',
      duration: 250,
      data: new Map([
        ['0,0', makeCell('B', '#00ff00', '#0000ff')],
        ['1,0', makeCell('C', '#f00000', '#0000f0')],
      ]),
    },
  ];

  return {
    name: 'ANSI Test',
    description: '',
    metadata: {
      version: 'test',
      buildDate: '',
      buildHash: '',
      exportDate: '',
      projectName: 'ANSI Test',
    },
    frames,
    currentFrameIndex: 1,
    frameRate: 12,
    looping: true,
    canvasData: frames[1].data,
    canvasDimensions: { width: 2, height: 1 },
    canvasBackgroundColor: '#000000',
    showGrid: false,
    fontMetrics: {
      fontSize: 16,
      fontFamily: 'monospace',
      characterWidth: 9.6,
      characterHeight: 16,
      baseline: 12.8,
      lineHeight: 16,
    },
    typography: {
      fontSize: 16,
      characterSpacing: 1,
      lineSpacing: 1,
      selectedFontId: 'monospace',
    },
    toolState: {
      activeTool: 'pencil',
      selectedColor: '#ffffff',
      selectedBgColor: 'transparent',
      selectedCharacter: '@',
      paintBucketContiguous: true,
      rectangleFilled: false,
    },
    uiState: {
      zoom: 1,
      panOffset: { x: 0, y: 0 },
      theme: 'dark',
    },
    paletteState: {
      activePaletteId: 'default',
      customPalettes: [],
      recentColors: [],
    },
    characterPaletteState: {
      activePaletteId: 'default',
      customPalettes: [],
      mappingMethod: 'brightness',
      invertDensity: false,
      characterSpacing: 1,
    },
  } as ExportDataBundle;
};

const settings = (overrides: Partial<AnsiExportSettings> = {}): AnsiExportSettings => ({
  fileName: 'ansi-test',
  colorMode: '256',
  outputMode: 'single-frame',
  includeMetadata: false,
  loopAnimation: false,
  clearScreen: false,
  ...overrides,
});

const lastSavedText = async (): Promise<string> => {
  const calls = vi.mocked(saveAs).mock.calls;
  const blob = calls.at(-1)?.[0] as Blob;
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
};

describe('ANSI export', () => {
  beforeEach(() => {
    vi.mocked(saveAs).mockReset();
  });

  it('exports the current frame as directly printable xterm-256 ANSI', async () => {
    await new ExportRenderer().exportAnsi(
      makeBundle(),
      settings({ includeMetadata: true, clearScreen: true }),
      'current-frame.ansi'
    );

    const text = await lastSavedText();

    expect(vi.mocked(saveAs).mock.calls.at(-1)?.[1]).toBe('current-frame.ansi');
    expect(text.startsWith('\u001b[2J\u001b[H')).toBe(true);
    expect(text).toContain('ASCII Motion ANSI Export');
    expect(text).toContain('Frame: 2/2');
    expect(text).toContain('\u001b[38;5;46;48;5;21mB');
    expect(text).not.toContain('\u001b[38;5;196mA');
    expect(text.endsWith('\u001b[0m\n')).toBe(true);
  });

  it('emits exact truecolor foreground and background sequences', async () => {
    await new ExportRenderer().exportAnsi(
      makeBundle(),
      settings({ colorMode: 'truecolor' }),
      'truecolor'
    );

    const text = await lastSavedText();

    expect(text).toContain('\u001b[38;2;0;255;0;48;2;0;0;255mB');
    expect(text).toContain('\u001b[38;2;240;0;0;48;2;0;0;240mC');
  });

  it('maps arbitrary colors to the nearest ANSI 16-color foreground and background', async () => {
    await new ExportRenderer().exportAnsi(
      makeBundle(),
      settings({ colorMode: 'ansi' }),
      'ansi-16'
    );

    const text = await lastSavedText();

    expect(text).toContain('\u001b[92;104mB');
    expect(text).toContain('\u001b[91;104mC');
  });

  it('uses the canvas background for cells without an explicit background color', async () => {
    const bundle = makeBundle();
    bundle.currentFrameIndex = 0;

    await new ExportRenderer().exportAnsi(
      bundle,
      settings({ colorMode: 'ansi' }),
      'canvas-background'
    );

    const text = await lastSavedText();

    expect(text).toContain('\u001b[91;40mA');
  });

  it('exports a looping shell animation with frame timing and terminal cleanup', async () => {
    await new ExportRenderer().exportAnsi(
      makeBundle(),
      settings({
        colorMode: 'truecolor',
        outputMode: 'animation',
        includeMetadata: true,
        loopAnimation: true,
        clearScreen: true,
      }),
      'animated.sh'
    );

    const script = await lastSavedText();

    expect(vi.mocked(saveAs).mock.calls.at(-1)?.[1]).toBe('animated.sh');
    expect(script.startsWith('#!/bin/sh\n')).toBe(true);
    expect(script).toContain('# Project: ANSI Test');
    expect(script).toContain("trap cleanup EXIT");
    expect(script).toContain("trap 'exit 0' HUP INT TERM");
    expect(script).toContain("printf '\\033[?25l'");
    expect(script).toContain("printf '\\033[2J'");
    expect(script.match(/printf '\\033\[H%s'/g)).toHaveLength(2);
    expect(script).toContain('sleep 0.125');
    expect(script).toContain('sleep 0.250');
    expect(script).toContain('while :; do');
    expect(script).toContain("'\\''");
    expect(script).toContain("printf '\\033[0m\\033[?25h\\n'");
  });

  it('exports a one-shot animation without metadata or a loop', async () => {
    await new ExportRenderer().exportAnsi(
      makeBundle(),
      settings({ outputMode: 'animation' }),
      'once'
    );

    const script = await lastSavedText();

    expect(vi.mocked(saveAs).mock.calls.at(-1)?.[1]).toBe('once.sh');
    expect(script).not.toContain('# Project:');
    expect(script).not.toContain('while :; do');
    expect(script).toMatch(/\nplay_once\n$/);
  });
});
