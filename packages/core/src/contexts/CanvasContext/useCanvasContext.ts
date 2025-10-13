import { useContext } from 'react';
import { CanvasContext } from './context';
import type { CanvasContextValue } from './context';

export const useCanvasContext = (): CanvasContextValue => {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error('useCanvasContext must be used within a CanvasProvider');
  }
  return context;
};
