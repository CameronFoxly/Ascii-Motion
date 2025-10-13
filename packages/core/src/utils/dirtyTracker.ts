/**
 * Dirty tracking system for optimized canvas rendering
 * Tracks which parts of the canvas need to be redrawn
 */

interface DirtyRegion {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

class DirtyTracker {
  private isDirty = false;
  private dirtyRegion: DirtyRegion | null = null;
  private fullRedrawRequested = false;

  /**
   * Mark a specific cell as dirty
   */
  markCellDirty(x: number, y: number): void {
    this.isDirty = true;
    
    if (this.fullRedrawRequested) {
      return; // Already doing full redraw
    }

    if (!this.dirtyRegion) {
      this.dirtyRegion = { minX: x, minY: y, maxX: x, maxY: y };
    } else {
      this.dirtyRegion.minX = Math.min(this.dirtyRegion.minX, x);
      this.dirtyRegion.minY = Math.min(this.dirtyRegion.minY, y);
      this.dirtyRegion.maxX = Math.max(this.dirtyRegion.maxX, x);
      this.dirtyRegion.maxY = Math.max(this.dirtyRegion.maxY, y);
    }
  }

  /**
   * Mark a rectangular region as dirty
   */
  markRegionDirty(startX: number, startY: number, endX: number, endY: number): void {
    this.isDirty = true;
    
    if (this.fullRedrawRequested) {
      return;
    }

    const minX = Math.min(startX, endX);
    const minY = Math.min(startY, endY);
    const maxX = Math.max(startX, endX);
    const maxY = Math.max(startY, endY);

    if (!this.dirtyRegion) {
      this.dirtyRegion = { minX, minY, maxX, maxY };
    } else {
      this.dirtyRegion.minX = Math.min(this.dirtyRegion.minX, minX);
      this.dirtyRegion.minY = Math.min(this.dirtyRegion.minY, minY);
      this.dirtyRegion.maxX = Math.max(this.dirtyRegion.maxX, maxX);
      this.dirtyRegion.maxY = Math.max(this.dirtyRegion.maxY, maxY);
    }
  }

  /**
   * Mark the entire canvas for full redraw
   */
  markFullRedraw(): void {
    this.isDirty = true;
    this.fullRedrawRequested = true;
    this.dirtyRegion = null;
  }

  /**
   * Check if anything is dirty
   */
  isDirtyFlag(): boolean {
    return this.isDirty;
  }

  /**
   * Check if full redraw is needed
   */
  needsFullRedraw(): boolean {
    return this.fullRedrawRequested;
  }

  /**
   * Get the dirty region (null if full redraw needed)
   */
  getDirtyRegion(): DirtyRegion | null {
    return this.fullRedrawRequested ? null : this.dirtyRegion;
  }

  /**
   * Clear all dirty flags
   */
  clear(): void {
    this.isDirty = false;
    this.dirtyRegion = null;
    this.fullRedrawRequested = false;
  }

  /**
   * Get render bounds (or null for full canvas)
   */
  getRenderBounds(canvasWidth: number, canvasHeight: number): DirtyRegion | null {
    if (this.fullRedrawRequested || !this.dirtyRegion) {
      return null; // Full canvas render
    }

    // Add small padding to avoid edge artifacts
    const padding = 1;
    return {
      minX: Math.max(0, this.dirtyRegion.minX - padding),
      minY: Math.max(0, this.dirtyRegion.minY - padding),
      maxX: Math.min(canvasWidth - 1, this.dirtyRegion.maxX + padding),
      maxY: Math.min(canvasHeight - 1, this.dirtyRegion.maxY + padding)
    };
  }
}

// Global dirty tracker instance
export const dirtyTracker = new DirtyTracker();

// Convenience functions
export const markCellDirty = (x: number, y: number) => dirtyTracker.markCellDirty(x, y);
export const markRegionDirty = (startX: number, startY: number, endX: number, endY: number) => 
  dirtyTracker.markRegionDirty(startX, startY, endX, endY);
export const markFullRedraw = () => dirtyTracker.markFullRedraw();
export const clearDirtyFlags = () => dirtyTracker.clear();
