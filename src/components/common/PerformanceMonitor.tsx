import React, { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCanvasStore } from '../../stores/canvasStore'
import { 
  logPerformanceStats, 
  testLargeGridPerformance, 
  clearPerformanceHistory 
} from '../../utils/performance';

interface PerformanceTestResult {
  gridSize: string;
  avgRenderTime: number;
  recommendation: string;
}

/**
 * Development component for testing canvas performance
 * Only visible in development mode for performance monitoring
 */
export const PerformanceMonitor: React.FC = () => {
  const { setCanvasSize } = useCanvasStore();
  const [testResults, setTestResults] = useState<PerformanceTestResult[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  // Run performance tests on various grid sizes
  const runPerformanceTests = useCallback(async () => {
    setIsTesting(true);
    setTestResults([]);
    
    const testSizes = [
      { width: 80, height: 24 },   // Standard
      { width: 120, height: 40 },  // Medium
      { width: 160, height: 60 },  // Large
      { width: 200, height: 100 }  // Extra Large
    ];

    const results: PerformanceTestResult[] = [];

    for (const size of testSizes) {
      try {
        // Set canvas to test size
        setCanvasSize(size.width, size.height);
        
        // Wait a moment for render
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Run performance test
        const result = await testLargeGridPerformance(size.width, size.height);
        results.push(result);
        
      } catch (error) {
        console.error(`❌ Test failed for ${size.width}x${size.height}:`, error);
      }
    }

    setTestResults(results);
    setIsTesting(false);
    
    // Reset to standard size
    setCanvasSize(80, 24);
  }, [setCanvasSize]);

  const handleLogStats = useCallback(() => {
    logPerformanceStats();
  }, []);

  const handleClearHistory = useCallback(() => {
    clearPerformanceHistory();
    setTestResults([]);
  }, []);

  // Only show in development mode
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg max-w-md">
      <h3 className="font-semibold text-sm mb-2">🎯 Performance Monitor</h3>
      
      <div className="space-y-2">
        <div className="flex gap-2">
          <Button
            onClick={handleLogStats}
            size="sm"
            variant="outline"
            className="text-xs"
          >
            Log Stats
          </Button>
          
          <Button
            onClick={runPerformanceTests}
            size="sm"
            variant="outline"
            className="text-xs"
            disabled={isTesting}
          >
            {isTesting ? 'Testing...' : 'Test Grid Sizes'}
          </Button>
          
          <Button
            onClick={handleClearHistory}
            size="sm"
            variant="outline"
            className="text-xs"
          >
            Clear
          </Button>
        </div>

        {testResults.length > 0 && (
          <div className="mt-3">
            <h4 className="text-xs font-medium mb-2">Test Results:</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                  <div className="font-medium">{result.gridSize}</div>
                  <div className="text-gray-600">
                    {result.avgRenderTime.toFixed(2)}ms avg
                  </div>
                  <div className="text-gray-500 text-[10px]">
                    {result.recommendation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-[10px] text-gray-500 border-t pt-2">
          Step 5.1 Performance Optimizations Active
          <br />
          Check console for detailed metrics
        </div>
      </div>
    </div>
  );
};
