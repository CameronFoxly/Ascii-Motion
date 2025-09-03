/**
 * Performance measurement utilities for ASCII Motion
 * Development tools to track rendering performance and identify bottlenecks
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

interface RenderMetrics {
  renderTime: number;
  cellCount: number;
  fps: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private renderHistory: RenderMetrics[] = [];
  private frameCount = 0;
  private lastFrameTime = 0;
  private isEnabled = false;

  constructor() {
    // Only enable in development
    this.isEnabled = import.meta.env.DEV;
  }

  /**
   * Start measuring a performance metric
   */
  start(name: string): void {
    if (!this.isEnabled) return;

    this.metrics.set(name, {
      name,
      startTime: performance.now()
    });
  }

  /**
   * End measuring a performance metric and return duration
   */
  end(name: string): number {
    if (!this.isEnabled) return 0;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric "${name}" was not started`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;

    return duration;
  }

  /**
   * Measure canvas render performance
   */
  measureCanvasRender(cellCount: number): { duration: number; fps: number } {
    if (!this.isEnabled) return { duration: 0, fps: 0 };

    const renderTime = this.end('canvas-render');
    const currentTime = performance.now();

    // Calculate FPS
    let fps = 0;
    if (this.lastFrameTime > 0) {
      const frameDelta = currentTime - this.lastFrameTime;
      fps = Math.round(1000 / frameDelta);
    }

    this.lastFrameTime = currentTime;
    this.frameCount++;

    // Store render metrics
    const metrics: RenderMetrics = {
      renderTime,
      cellCount,
      fps,
      timestamp: currentTime
    };

    this.renderHistory.push(metrics);

    // Keep only last 100 measurements
    if (this.renderHistory.length > 100) {
      this.renderHistory.shift();
    }

    return { duration: renderTime, fps };
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    averageRenderTime: number;
    averageFPS: number;
    totalRenders: number;
    lastRenderTime: number;
    efficiency: string;
  } {
    if (!this.isEnabled || this.renderHistory.length === 0) {
      return {
        averageRenderTime: 0,
        averageFPS: 0,
        totalRenders: 0,
        lastRenderTime: 0,
        efficiency: 'N/A'
      };
    }

    const recent = this.renderHistory.slice(-10); // Last 10 renders
    const avgRenderTime = recent.reduce((sum, m) => sum + m.renderTime, 0) / recent.length;
    const avgFPS = recent.reduce((sum, m) => sum + m.fps, 0) / recent.length;
    const lastMetric = this.renderHistory[this.renderHistory.length - 1];

    let efficiency = 'Good';
    if (avgRenderTime > 16.67) { // > 60 FPS threshold
      efficiency = avgRenderTime > 33.33 ? 'Poor' : 'Fair'; // 30 FPS threshold
    }

    return {
      averageRenderTime: Math.round(avgRenderTime * 100) / 100,
      averageFPS: Math.round(avgFPS),
      totalRenders: this.frameCount,
      lastRenderTime: Math.round(lastMetric.renderTime * 100) / 100,
      efficiency
    };
  }

  /**
   * Log performance statistics to console
   */
  logStats(): void {
    if (!this.isEnabled) return;

    const stats = this.getStats();
    console.group('🎯 Canvas Performance Stats');
    console.log(`Average Render Time: ${stats.averageRenderTime}ms`);
    console.log(`Average FPS: ${stats.averageFPS}`);
    console.log(`Total Renders: ${stats.totalRenders}`);
    console.log(`Last Render: ${stats.lastRenderTime}ms`);
    console.log(`Efficiency: ${stats.efficiency}`);
    console.groupEnd();
  }

  /**
   * Clear performance history
   */
  clear(): void {
    this.metrics.clear();
    this.renderHistory = [];
    this.frameCount = 0;
    this.lastFrameTime = 0;
  }

  /**
   * Test large grid performance
   */
  async testLargeGrid(width: number, height: number): Promise<{
    gridSize: string;
    avgRenderTime: number;
    recommendation: string;
  }> {
    if (!this.isEnabled) {
      return {
        gridSize: `${width}x${height}`,
        avgRenderTime: 0,
        recommendation: 'Performance testing disabled in production'
      };
    }

    console.log(`🧪 Testing ${width}x${height} grid performance...`);

    // Clear previous measurements
    this.clear();

    // Simulate multiple renders
    const cellCount = width * height;
    const testRenders = 10;

    for (let i = 0; i < testRenders; i++) {
      this.start('canvas-render');
      
      // Simulate render work (in real usage, this would be actual rendering)
      await new Promise(resolve => setTimeout(resolve, 1));
      
      this.measureCanvasRender(cellCount);
    }

    const stats = this.getStats();
    const recommendation = this.getRecommendation(stats.averageRenderTime, cellCount);

    const result = {
      gridSize: `${width}x${height}`,
      avgRenderTime: stats.averageRenderTime,
      recommendation
    };

    console.log('📊 Large Grid Test Results:', result);
    return result;
  }

  private getRecommendation(renderTime: number, cellCount: number): string {
    const cellsPerMs = cellCount / Math.max(renderTime, 0.1);
    
    if (renderTime < 8) return `Excellent performance (${Math.round(cellsPerMs)} cells/ms) - suitable for animation`;
    if (renderTime < 16.67) return `Good performance (${Math.round(cellsPerMs)} cells/ms) - smooth for static editing`;
    if (renderTime < 33.33) return `Fair performance (${Math.round(cellsPerMs)} cells/ms) - consider optimizations for large grids`;
    return `Poor performance (${Math.round(cellsPerMs)} cells/ms) - optimization required`;
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Convenience functions
export const measureCanvasRender = () => {
  performanceMonitor.start('canvas-render');
};

export const finishCanvasRender = (cellCount: number) => {
  return performanceMonitor.measureCanvasRender(cellCount);
};

export const logPerformanceStats = () => {
  performanceMonitor.logStats();
};

export const testLargeGridPerformance = (width: number, height: number) => {
  return performanceMonitor.testLargeGrid(width, height);
};

export const clearPerformanceHistory = () => {
  performanceMonitor.clear();
};

// Development helper to enable performance logging in console
if (import.meta.env.DEV) {
  (window as any).asciiMotionPerf = {
    monitor: performanceMonitor,
    logStats: logPerformanceStats,
    testGrid: testLargeGridPerformance,
    clear: clearPerformanceHistory
  };
}
