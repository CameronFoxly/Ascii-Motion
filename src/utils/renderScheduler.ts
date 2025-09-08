/**
 * Render Scheduler for optimized canvas performance
 * Batches render requests and throttles to 60fps
 */

type RenderCallback = () => void;

class RenderScheduler {
  private renderCallbacks = new Set<RenderCallback>();
  private isScheduled = false;
  private rafId: number | null = null;

  /**
   * Schedule a render callback to be executed on the next frame
   */
  schedule(callback: RenderCallback): void {
    this.renderCallbacks.add(callback);
    
    if (!this.isScheduled) {
      this.isScheduled = true;
      this.rafId = requestAnimationFrame(() => {
        this.executeBatch();
      });
    }
  }

  /**
   * Execute all scheduled render callbacks
   */
  private executeBatch(): void {
    this.isScheduled = false;
    this.rafId = null;

    // Execute all callbacks in a single frame
    const callbacks = Array.from(this.renderCallbacks);
    this.renderCallbacks.clear();

    for (const callback of callbacks) {
      try {
        callback();
      } catch (error) {
        console.error('Render callback error:', error);
      }
    }
  }

  /**
   * Cancel all scheduled renders
   */
  cancel(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.isScheduled = false;
    this.renderCallbacks.clear();
  }

  /**
   * Force immediate execution of all scheduled renders
   */
  flush(): void {
    if (this.isScheduled) {
      this.cancel();
      this.executeBatch();
    }
  }
}

// Global render scheduler instance
export const renderScheduler = new RenderScheduler();

// Convenience function for scheduling canvas renders
export const scheduleCanvasRender = (renderFn: RenderCallback): void => {
  renderScheduler.schedule(renderFn);
};
