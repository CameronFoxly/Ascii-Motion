import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExportRenderer } from '../utils/exportRenderer';
import { DEFAULT_EXPORT_SETTINGS } from '../stores/exportStore';

const muxer = vi.hoisted(() => ({
  addVideoChunk: vi.fn(),
  finalize: vi.fn(),
}));

vi.mock('webm-muxer', () => ({
  ArrayBufferTarget: class { buffer = new ArrayBuffer(16); },
  Muxer: class {
    target: { buffer: ArrayBuffer };
    addVideoChunk = muxer.addVideoChunk;
    finalize = muxer.finalize;
    constructor(options: { target: { buffer: ArrayBuffer } }) { this.target = options.target; }
  },
}));

let events: string[];
let encoders: FakeVideoEncoder[];
let flushError: Error | undefined;
let callbackError: Error | undefined;
let configureError: Error | undefined;
let encodeError: Error | undefined;
let flushGate: Promise<void> | undefined;
let skipOutput: boolean;
const frameClose = vi.fn();

class FakeVideoFrame {
  close = frameClose;
}

class FakeVideoEncoder {
  state: CodecState = 'unconfigured';
  frames = 0;
  constructor(private callbacks: VideoEncoderInit) { encoders.push(this); }
  configure = vi.fn(() => {
    if (configureError) throw configureError;
    this.state = 'configured';
  });
  encode = vi.fn(() => {
    if (encodeError) throw encodeError;
    this.frames++;
  });
  flush = vi.fn(async () => {
    await Promise.resolve();
    if (callbackError) {
      this.state = 'closed';
      this.callbacks.error(callbackError);
      throw new DOMException('Aborted due to encoder failure', 'AbortError');
    }
    if (flushError) throw flushError;
    if (!skipOutput) {
      for (let i = 0; i < this.frames; i++) {
        events.push('output');
        this.callbacks.output({ timestamp: i } as EncodedVideoChunk, {});
      }
    }
    await flushGate;
    if (this.state === 'closed') throw new DOMException('Aborted due to close()', 'AbortError');
    events.push('flushed');
  });
  close = vi.fn(() => {
    if (this.state === 'closed') throw new DOMException('Already closed', 'InvalidStateError');
    events.push('closed');
    this.state = 'closed';
  });
}

function encode(frameCount = 8) {
  const frames = Array.from({ length: frameCount }, () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 16;
    return canvas;
  });
  return new ExportRenderer()['encodeWebMVideo'](frames, { ...DEFAULT_EXPORT_SETTINGS.video, frameRate: 12 });
}

beforeEach(() => {
  events = [];
  encoders = [];
  flushError = callbackError = configureError = encodeError = undefined;
  flushGate = undefined;
  skipOutput = false;
  muxer.addVideoChunk.mockReset();
  muxer.finalize.mockReset().mockImplementation(() => { events.push('finalized'); });
  frameClose.mockClear();
  vi.stubGlobal('VideoEncoder', FakeVideoEncoder);
  vi.stubGlobal('VideoFrame', FakeVideoFrame);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('WebM encoder lifecycle', () => {
  it.each([1, 8])('awaits flush before finalizing/closing a %i-frame export', async (count) => {
    const blob = await encode(count);
    expect(blob.type).toBe('video/webm');
    expect(muxer.addVideoChunk).toHaveBeenCalledTimes(count);
    expect(frameClose).toHaveBeenCalledTimes(count);
    expect(events).toEqual([...Array<string>(count).fill('output'), 'flushed', 'finalized', 'closed']);
    expect(encoders[0].close).toHaveBeenCalledTimes(1);
  });

  it('does not resolve or close on the last chunk while flush remains pending', async () => {
    let release!: () => void;
    flushGate = new Promise<void>((resolve) => { release = resolve; });
    const pending = encode(1);
    let settled = false;
    void pending.then(() => { settled = true; });
    await vi.waitFor(() => expect(events).toEqual(['output']));
    expect(settled).toBe(false);
    expect(muxer.finalize).not.toHaveBeenCalled();
    expect(encoders[0].close).not.toHaveBeenCalled();
    release();
    await pending;
    expect(events).toEqual(['output', 'flushed', 'finalized', 'closed']);
  });

  it('rejects flush failures and closes the encoder', async () => {
    flushError = new Error('Actual encode failure');
    await expect(encode()).rejects.toBe(flushError);
    expect(muxer.finalize).not.toHaveBeenCalled();
    expect(encoders[0].close).toHaveBeenCalledTimes(1);
  });

  it('preserves encoder callback failures and does not close an already-closed encoder', async () => {
    callbackError = new Error('Hardware codec failed');
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(encode()).rejects.toBe(callbackError);
    expect(log).toHaveBeenCalledWith('VideoEncoder error:', callbackError);
    expect(encoders[0].close).not.toHaveBeenCalled();
    expect(muxer.finalize).not.toHaveBeenCalled();
  });

  it.each(['output', 'finalize'] as const)('rejects muxer %s failures instead of reporting export success', async (stage) => {
    const error = new Error('Muxer failed');
    (stage === 'output' ? muxer.addVideoChunk : muxer.finalize).mockImplementation(() => { throw error; });
    await expect(encode()).rejects.toBe(error);
    expect(encoders[0].close).toHaveBeenCalledTimes(1);
  });

  it('rejects an incomplete output after a successful flush', async () => {
    skipOutput = true;
    await expect(encode(8)).rejects.toThrow('VideoEncoder produced 0 of 8 frames');
    expect(muxer.finalize).not.toHaveBeenCalled();
    expect(encoders[0].close).toHaveBeenCalledTimes(1);
  });

  it('closes a VideoFrame and encoder if synchronous encoding fails', async () => {
    encodeError = new Error('Cannot encode frame');
    await expect(encode()).rejects.toBe(encodeError);
    expect(frameClose).toHaveBeenCalledTimes(1);
    expect(encoders[0].close).toHaveBeenCalledTimes(1);
    expect(encoders[0].flush).not.toHaveBeenCalled();
  });

  it('closes the encoder if configuration fails', async () => {
    configureError = new Error('Unsupported codec');
    await expect(encode()).rejects.toBe(configureError);
    expect(frameClose).not.toHaveBeenCalled();
    expect(encoders[0].close).toHaveBeenCalledTimes(1);
    expect(encoders[0].flush).not.toHaveBeenCalled();
  });
});
