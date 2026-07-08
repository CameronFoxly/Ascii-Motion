/**
 * Import Store Preview Tests
 *
 * Tests for src/stores/importStore.ts preview-frame behavior.
 *
 * Regression coverage: navigating the import preview to a specific frame must
 * persist when a setting change re-processes the media frames. Previously
 * `setProcessedFrames` always reset the preview to the first frame, snapping the
 * user back to frame 0 on every property edit.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useImportStore } from '../stores/importStore';
import type { ProcessedFrame } from '../utils/mediaProcessor';

function makeFrame(): ProcessedFrame {
  // The store only stores/relays frames; it never reads `canvas`/`imageData`,
  // so a lightweight stub keeps the test focused on preview-index logic and
  // avoids needing canvas/ImageData APIs that jsdom does not provide.
  return { canvas: {} as HTMLCanvasElement, imageData: {} as ImageData };
}

function makeFrames(count: number): ProcessedFrame[] {
  return Array.from({ length: count }, makeFrame);
}

describe('importStore preview frame index', () => {
  beforeEach(() => {
    useImportStore.setState({
      selectedFile: null,
      processedFrames: [],
      previewFrameIndex: 0,
      isPreviewMode: false,
    });
  });

  it('starts at frame 0 when frames are first processed', () => {
    useImportStore.getState().setProcessedFrames(makeFrames(10));
    const state = useImportStore.getState();
    expect(state.previewFrameIndex).toBe(0);
    expect(state.isPreviewMode).toBe(true);
  });

  it('preserves the selected preview frame when frames are re-processed', () => {
    const store = useImportStore.getState();
    store.setProcessedFrames(makeFrames(10));
    store.setPreviewFrameIndex(5);
    expect(useImportStore.getState().previewFrameIndex).toBe(5);

    // Simulate a setting change that re-extracts the same number of frames.
    store.setProcessedFrames(makeFrames(10));
    expect(useImportStore.getState().previewFrameIndex).toBe(5);
  });

  it('clamps the preserved frame to the new (shorter) frame range', () => {
    const store = useImportStore.getState();
    store.setProcessedFrames(makeFrames(10));
    store.setPreviewFrameIndex(8);
    expect(useImportStore.getState().previewFrameIndex).toBe(8);

    store.setProcessedFrames(makeFrames(4));
    expect(useImportStore.getState().previewFrameIndex).toBe(3);
  });

  it('resets to frame 0 when there are no frames', () => {
    const store = useImportStore.getState();
    store.setProcessedFrames(makeFrames(10));
    store.setPreviewFrameIndex(5);

    store.setProcessedFrames([]);
    const state = useImportStore.getState();
    expect(state.previewFrameIndex).toBe(0);
    expect(state.isPreviewMode).toBe(false);
  });

  it('resets to frame 0 when a new file is selected, then keeps it through processing', () => {
    const store = useImportStore.getState();
    store.setProcessedFrames(makeFrames(10));
    store.setPreviewFrameIndex(7);

    // Selecting a new file should reset the preview position.
    store.setSelectedFile(null);
    expect(useImportStore.getState().previewFrameIndex).toBe(0);

    // Processing the newly selected file keeps the reset position.
    store.setProcessedFrames(makeFrames(10));
    expect(useImportStore.getState().previewFrameIndex).toBe(0);
  });
});
