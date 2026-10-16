export type AtomicFrameNavigator = (frameIndex: number) => Promise<number>;

let activeNavigator: AtomicFrameNavigator | null = null;

export function registerAtomicFrameNavigator(
  navigator: AtomicFrameNavigator,
): () => void {
  activeNavigator = navigator;

  return () => {
    if (activeNavigator === navigator) {
      activeNavigator = null;
    }
  };
}

export function navigateToFrameAtomically(frameIndex: number): Promise<number> {
  if (!activeNavigator) {
    return Promise.reject(new Error('Frame synchronization is unavailable'));
  }

  return activeNavigator(frameIndex);
}

export type CanvasReloadListener = () => void;

let reloadListener: CanvasReloadListener | null = null;

/**
 * Lets the mounted frame synchronizer adopt a canvas buffer that was installed
 * outside its effects (snapshot restore, undo), so it never flushes the new
 * buffer into the previously active layer or frame.
 */
export function registerCanvasReloadListener(listener: CanvasReloadListener): () => void {
  reloadListener = listener;
  return () => {
    if (reloadListener === listener) reloadListener = null;
  };
}

export function notifyCanvasReloaded(): void {
  reloadListener?.();
}
