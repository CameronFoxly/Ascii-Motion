import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { PANEL_ANIMATION } from '@/constants';

interface CollapsiblePanelProps {
  isOpen: boolean;
  side: 'left' | 'right' | 'bottom';
  children: React.ReactNode;
  className?: string;
  minWidth?: string;
}

export const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  isOpen,
  side,
  children,
  className,
  minWidth,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // For bottom panels, update CSS custom property with actual height
  useEffect(() => {
    if (side === 'bottom' && panelRef.current && isOpen) {
      const updateHeight = () => {
        const height = panelRef.current?.offsetHeight;
        if (height) {
          document.documentElement.style.setProperty('--bottom-panel-height', `${height}px`);
        }
      };

      // Update height initially and on content changes
      updateHeight();
      
      // Use ResizeObserver to watch for content changes
      const resizeObserver = new ResizeObserver(updateHeight);
      resizeObserver.observe(panelRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    } else if (side === 'bottom' && !isOpen) {
      // When closed, set a minimal height for the visible strip
      document.documentElement.style.setProperty('--bottom-panel-height', '1.1875rem'); // 19px for toggle button
    }
  }, [side, isOpen]);

  const getPanelClasses = () => {
    const baseClasses = `relative border-border overflow-hidden ${PANEL_ANIMATION.TRANSITION}`;
    
    switch (side) {
      case 'left':
        return cn(
          baseClasses,
          'border-r bg-muted/20 h-full',
          minWidth || 'w-44',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          isOpen && 'pointer-events-auto', // Ensure panel content can receive events when open
          className
        );
      case 'right':
        return cn(
          baseClasses,
          'border-l bg-muted/20 h-full',
          minWidth || 'w-72',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          isOpen && 'pointer-events-auto', // Ensure panel content can receive events when open
          className
        );
      case 'bottom':
        return cn(
          baseClasses,
          'border-t bg-background',
          // Remove fixed height, let content determine size
          isOpen ? 'translate-y-0' : 'translate-y-[calc(100%-1.1875rem)]', // Show 19px for toggle button (h-4 + spacing)
          isOpen && 'pointer-events-auto', // Ensure panel content can receive events when open
          className
        );
      default:
        return cn(baseClasses, className);
    }
  };

  return (
    <div ref={side === 'bottom' ? panelRef : undefined} className={getPanelClasses()}>
      <div 
        id={`panel-${side}`}
        className={cn(
          'h-full',
          side === 'bottom' ? 'px-4 pt-4 pb-2' : 'p-4 overflow-y-auto', // Bottom panel has different padding, side panels scroll
          side === 'left' && 'scrollbar-left' // Put scrollbar on left side for left panel
        )}
        role="region"
        aria-label={`${side} panel content`}
      >
        {children}
      </div>
    </div>
  );
};
