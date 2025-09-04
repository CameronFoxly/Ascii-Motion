import React from 'react';
import { CanvasGrid } from './CanvasGrid';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

interface CanvasWithShortcutsProps {
  className?: string;
}

/**
 * Wrapper component that provides keyboard shortcuts functionality
 * to the canvas grid. Must be inside CanvasProvider.
 */
export const CanvasWithShortcuts: React.FC<CanvasWithShortcutsProps> = ({ className }) => {
  // Enable keyboard shortcuts (this hook now requires CanvasContext)
  const { copySelection, pasteSelection } = useKeyboardShortcuts();

  // Expose keyboard shortcuts to parent via window object for button access
  React.useEffect(() => {
    (window as any).canvasShortcuts = { copySelection, pasteSelection };
    return () => {
      delete (window as any).canvasShortcuts;
    };
  }, [copySelection, pasteSelection]);

  return <CanvasGrid className={className} />;
};
