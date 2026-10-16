const SEGMENT_INFO_ID = [0x15, 0x49, 0xa9, 0x66];
const DURATION_FLOAT64 = [0x44, 0x89, 0x88];
const TIMECODE_SCALE_ID = [0x2a, 0xd7, 0xb1];
const SEARCH_WINDOW = 256;

function indexOf(bytes: Uint8Array, pattern: number[], from: number, to: number): number {
  const end = Math.min(to, bytes.length) - pattern.length;
  for (let i = from; i <= end; i++) {
    let match = true;
    for (let j = 0; j < pattern.length; j++) {
      if (bytes[i + j] !== pattern[j]) { match = false; break; }
    }
    if (match) return i;
  }
  return -1;
}

function readTimecodeScale(view: DataView, bytes: Uint8Array, from: number, to: number): number {
  const at = indexOf(bytes, TIMECODE_SCALE_ID, from, to);
  if (at < 0) return 1_000_000;
  const sizeByte = bytes[at + 3];
  const length = sizeByte & 0x80 ? sizeByte & 0x7f : 0;
  if (length < 1 || length > 6) return 1_000_000;
  let value = 0;
  for (let i = 0; i < length; i++) value = value * 256 + view.getUint8(at + 4 + i);
  return value > 0 ? value : 1_000_000;
}

/**
 * webm-muxer sets Segment Duration to the last block's start time, so N frames report
 * (N - 1) / fps and a single frame reports 0. Rewrites the 8-byte float Duration in
 * Segment Info in place to the real playback length. Returns false if not found.
 */
export function setWebMSegmentDuration(buffer: ArrayBuffer, durationMs: number): boolean {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return false;
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const info = indexOf(bytes, SEGMENT_INFO_ID, 0, bytes.length);
  if (info < 0) return false;
  const windowEnd = info + SEARCH_WINDOW;
  const at = indexOf(bytes, DURATION_FLOAT64, info + SEGMENT_INFO_ID.length, windowEnd);
  if (at < 0) return false;
  const scale = readTimecodeScale(view, bytes, info + SEGMENT_INFO_ID.length, windowEnd);
  view.setFloat64(at + DURATION_FLOAT64.length, (durationMs * 1_000_000) / scale, false);
  return true;
}
