import { useState } from 'react';
import { PerformanceMonitor } from '@/components/common/PerformanceMonitor';

export const usePerformanceMonitor = () => {
  const [showMonitor, setShowMonitor] = useState(import.meta.env.DEV);

  return {
    showMonitor,
    setShowMonitor,
    PerformanceMonitor,
  };
};
