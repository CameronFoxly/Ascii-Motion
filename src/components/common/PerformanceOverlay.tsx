import React, { useState, useEffect } from 'react';
import { performanceMonitor } from '../../utils/performance';

/**
 * Performance Monitor Overlay
 * Shows real-time performance metrics during development
 */
export const PerformanceOverlay: React.FC = () => {
  const [stats, setStats] = useState({
    averageRenderTime: 0,
    averageFPS: 0,
    totalRenders: 0,
    lastRenderTime: 0,
    efficiency: 'Good'
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      const currentStats = performanceMonitor.getStats();
      setStats(currentStats);
    }, 100); // Update every 100ms

    return () => clearInterval(interval);
  }, [isVisible]);

  // Show/hide with keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'p' && event.ctrlKey && event.shiftKey) {
        setIsVisible(!isVisible);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isVisible]);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-50">
        Press Ctrl+Shift+P for perf stats
      </div>
    );
  }

  const getEfficiencyColor = (efficiency: string) => {
    switch (efficiency) {
      case 'Excellent': return 'text-green-400';
      case 'Good': return 'text-blue-400';
      case 'Fair': return 'text-yellow-400';
      case 'Poor': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="fixed top-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg text-sm font-mono z-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-blue-400">Performance Monitor</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white text-lg leading-none"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Avg Render Time:</span>
          <span className={stats.averageRenderTime > 16 ? 'text-red-400' : 'text-green-400'}>
            {stats.averageRenderTime.toFixed(2)}ms
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Avg FPS:</span>
          <span className={stats.averageFPS < 30 ? 'text-red-400' : stats.averageFPS < 50 ? 'text-yellow-400' : 'text-green-400'}>
            {stats.averageFPS.toFixed(0)}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Total Renders:</span>
          <span className="text-gray-300">{stats.totalRenders}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Last Render:</span>
          <span className={stats.lastRenderTime > 16 ? 'text-red-400' : 'text-green-400'}>
            {stats.lastRenderTime.toFixed(2)}ms
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Efficiency:</span>
          <span className={getEfficiencyColor(stats.efficiency)}>
            {stats.efficiency}
          </span>
        </div>
      </div>
      
      <div className="mt-3 pt-2 border-t border-gray-700 text-xs text-gray-400">
        <div>• Green: Under 16ms (60fps)</div>
        <div>• Yellow: 16-33ms (30-60fps)</div>
        <div>• Red: Over 33ms (under 30fps)</div>
      </div>
      
      <div className="mt-2 flex gap-2">
        <button 
          onClick={() => performanceMonitor.clear()}
          className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs"
        >
          Clear
        </button>
        <button 
          onClick={() => performanceMonitor.logStats()}
          className="px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-xs"
        >
          Log Stats
        </button>
      </div>
    </div>
  );
};
