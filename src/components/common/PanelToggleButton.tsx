import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PANEL_ANIMATION } from '@/constants';

interface PanelToggleButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  side: 'left' | 'right' | 'bottom';
}

export const PanelToggleButton: React.FC<PanelToggleButtonProps> = ({
  isOpen,
  onToggle,
  side,
}) => {
  const getToggleIcon = () => {
    const iconSize = side === 'bottom' && isOpen ? "h-2.5 w-2.5" : "h-3 w-3";
    
    switch (side) {
      case 'left':
        return isOpen ? <ChevronLeft className={iconSize} /> : <ChevronRight className={iconSize} />;
      case 'right':
        return isOpen ? <ChevronRight className={iconSize} /> : <ChevronLeft className={iconSize} />;
      case 'bottom':
        return isOpen ? <ChevronDown className={iconSize} /> : <ChevronUp className={iconSize} />;
      default:
        return null;
    }
  };

  const getButtonClasses = () => {
    const baseClasses = `bg-background border shadow-sm hover:bg-accent touch-manipulation ${PANEL_ANIMATION.TRANSITION}`;
    
    switch (side) {
      case 'left':
        return cn('h-12 w-4 p-0', baseClasses);
      case 'right':
        return cn('h-12 w-4 p-0', baseClasses);
      case 'bottom':
        return cn('h-4 w-12 p-0', baseClasses);
      default:
        return baseClasses;
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onToggle}
      className={getButtonClasses()}
      title={`${isOpen ? 'Collapse' : 'Expand'} panel`}
      aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${side} panel`}
      aria-expanded={isOpen}
    >
      {getToggleIcon()}
    </Button>
  );
};
