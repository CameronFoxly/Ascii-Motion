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
