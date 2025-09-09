import React from 'react';
import { cn } from '@/lib/utils';
import { PANEL_ANIMATION } from '@/constants';

interface CollapsiblePanelProps {
  children: React.ReactNode;
  isOpen: boolean;
  side: 'left' | 'right' | 'bottom';
  className?: string;
  minWidth?: string;
  minHeight?: string;
}

export const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  children,
  isOpen,
  side,
  className = '',
  minWidth,
  minHeight,
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
          minHeight || 'h-52',
          isOpen ? 'translate-y-0' : 'translate-y-full',
          className
        );
      default:
        return cn(baseClasses, className);
    }
  };

  return (
    <div className={getPanelClasses()}>
      <div 
        id={`panel-${side}`}
        className={cn(
          'h-full overflow-y-auto',
          side === 'bottom' ? 'pt-4 px-4 pb-2' : 'p-4', // Match canvas padding for bottom panel
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
