import React from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsiblePanelProps {
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  side: 'left' | 'right' | 'bottom';
  className?: string;
  minWidth?: string;
  minHeight?: string;
}

export const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  children,
  isOpen,
  onToggle,
  side,
  className = '',
  minWidth,
  minHeight,
}) => {
  const getToggleIcon = () => {
    switch (side) {
      case 'left':
        return isOpen ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />;
      case 'right':
        return isOpen ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />;
      case 'bottom':
        return isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getTogglePosition = () => {
    switch (side) {
      case 'left':
        return isOpen ? 'absolute -right-3 top-4 z-10' : 'absolute left-1 top-4 z-10';
      case 'right':
        return isOpen ? 'absolute -left-3 top-4 z-10' : 'absolute right-1 top-4 z-10';
      case 'bottom':
        return isOpen ? 'absolute -top-3 left-4 z-10' : 'absolute bottom-1 left-4 z-10';
      default:
        return '';
    }
  };

  const getPanelClasses = () => {
    const baseClasses = 'relative border-border bg-muted/20 transition-all duration-200 ease-in-out';
    
    switch (side) {
      case 'left':
        return cn(
          baseClasses,
          'border-r overflow-y-auto overflow-x-hidden',
          isOpen ? minWidth || 'w-80' : 'w-8',
          className
        );
      case 'right':
        return cn(
          baseClasses,
          'border-l overflow-y-auto overflow-x-hidden',
          isOpen ? minWidth || 'w-72' : 'w-8',
          className
        );
      case 'bottom':
        return cn(
          baseClasses,
          'border-t',
          isOpen ? minHeight || 'h-auto' : 'h-8',
          className
        );
      default:
        return cn(baseClasses, className);
    }
  };

  return (
    <div className={getPanelClasses()}>
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className={cn(
          // Increased touch target size for mobile accessibility
          'h-8 w-8 p-0 bg-background border shadow-sm hover:bg-accent touch-manipulation',
          'sm:h-6 sm:w-6', // Smaller on desktop
          getTogglePosition()
        )}
        title={`${isOpen ? 'Collapse' : 'Expand'} panel`}
        aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${side} panel`}
        aria-expanded={isOpen}
        aria-controls={`panel-${side}`}
      >
        {getToggleIcon()}
      </Button>
      
      {isOpen && (
        <Collapsible open={isOpen}>
          <CollapsibleContent className={side === 'bottom' ? '' : 'h-full'}>
            <div 
              id={`panel-${side}`}
              className={cn(
                side === 'bottom' ? '' : 'h-full',
                side === 'bottom' ? 'p-3' : 'p-4'
              )}
              role="region"
              aria-label={`${side} panel content`}
            >
              {children}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};
