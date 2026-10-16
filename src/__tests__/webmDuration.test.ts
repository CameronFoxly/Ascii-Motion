import { describe, expect, it } from 'vitest';
import { Muxer, ArrayBufferTarget } from 'webm-muxer';
import { setWebMSegmentDuration } from '../utils/webmDuration';

function mux(frameCount: number, fps: number): ArrayBuffer {
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'V_VP9', width: 16, height: 16, frameRate: fps } });
  for (let i = 0; i < frameCount; i++) {
    muxer.addVideoChunkRaw(new Uint8Array([i, 1, 2, 3]), i === 0 ? 'key' : 'delta', (i * 1e6) / fps);
  }
  muxer.finalize();
  return muxer.target.buffer;
}

function readDurationMs(buffer: ArrayBuffer): number {
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length - 11; i++) {
    if (bytes[i] === 0x44 && bytes[i + 1] === 0x89 && bytes[i + 2] === 0x88) {
      return new DataView(buffer).getFloat64(i + 3, false);
    }
  }
  throw new Error('Duration element not found');
}

describe('setWebMSegmentDuration', () => {
  it('reports N/fps instead of the last frame start time', () => {
    const buffer = mux(8, 12);
    expect(readDurationMs(buffer)).toBe(583);
    expect(setWebMSegmentDuration(buffer, (8 * 1000) / 12)).toBe(true);
    expect(readDurationMs(buffer)).toBeCloseTo(666.667, 2);
  });

  it('gives a single-frame video a non-zero duration', () => {
    const buffer = mux(1, 12);
    expect(readDurationMs(buffer)).toBe(0);
    expect(setWebMSegmentDuration(buffer, 1000 / 12)).toBe(true);
    expect(readDurationMs(buffer)).toBeCloseTo(83.333, 2);
  });

  it('leaves non-WebM data and invalid durations untouched', () => {
    expect(setWebMSegmentDuration(new Uint8Array([1, 2, 3]).buffer, 100)).toBe(false);
    expect(setWebMSegmentDuration(mux(2, 12), 0)).toBe(false);
  });
});
