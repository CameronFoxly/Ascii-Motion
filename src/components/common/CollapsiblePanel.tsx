import React from 'react';
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
  const getPanelClasses = () => {
    const baseClasses = `relative border-border overflow-hidden ${PANEL_ANIMATION.TRANSITION}`;
    
    switch (side) {
      case 'left':
        return cn(
          baseClasses,
          'border-r bg-muted/20 h-full',
          minWidth || 'w-44',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        );
      case 'right':
        return cn(
          baseClasses,
          'border-l bg-muted/20 h-full',
          minWidth || 'w-72',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          className
        );
      case 'bottom':
        return cn(
          baseClasses,
          'border-t bg-background',
          isOpen ? 'translate-y-0' : 'translate-y-[calc(100%-1.1875rem)]', // Show 19px for toggle button (h-4 + spacing)
          className
        );
      default:
        return cn(baseClasses, className);
    }
  };

  return (
    <div className={getPanelClasses()}>
      {side === 'bottom' ? (
        // Bottom panel: Use wrapper div for content-responsive height
        <div className="overflow-y-auto max-h-80">
          <div className="p-4">
            {children}
          </div>
        </div>
      ) : (
        // Side panels: Keep existing structure
        <div 
          id={`panel-${side}`}
          className={cn(
            'h-full p-4 overflow-y-auto',
            side === 'left' && 'scrollbar-left' // Put scrollbar on left side for left panel
          )}
          role="region"
          aria-label={`${side} panel content`}
        >
          {children}
        </div>
      )}
    </div>
  );
};
