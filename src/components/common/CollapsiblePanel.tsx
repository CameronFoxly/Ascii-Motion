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
          'border-t overflow-y-auto overflow-x-hidden',
          isOpen ? minHeight || 'h-48' : 'h-8',
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
          'h-6 w-6 p-0 bg-background border shadow-sm hover:bg-accent',
          getTogglePosition()
        )}
        title={`${isOpen ? 'Collapse' : 'Expand'} panel`}
      >
        {getToggleIcon()}
      </Button>
      
      {isOpen && (
        <Collapsible open={isOpen}>
          <CollapsibleContent className="h-full">
            <div className={cn(
              'h-full',
              side === 'bottom' ? 'p-3' : 'p-4'
            )}>
              {children}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};
