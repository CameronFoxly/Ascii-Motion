import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { CollapsibleTrigger } from '@/components/ui/collapsible';

interface CollapsibleHeaderProps {
  children: React.ReactNode;
  isOpen: boolean;
  expandsUp?: boolean;
  className?: string;
  /** Rendered next to the title, outside the toggle button (e.g. a help button). */
  accessory?: React.ReactNode;
}

export const CollapsibleHeader: React.FC<CollapsibleHeaderProps> = ({ 
  children, 
  isOpen,
  expandsUp = false,
  className = '',
  accessory,
}) => {
  const chevron = (
    <ChevronDown 
      className={`h-3 w-3 transition-transform duration-200 ${
        expandsUp 
          ? (isOpen ? '' : 'rotate-180')
          : (isOpen ? 'rotate-180' : '')
      }`} 
    />
  );

  if (accessory) {
    // Split into title trigger + accessory + chevron trigger to avoid nesting buttons.
    return (
      <div className={`flex w-full items-center rounded-md my-1 hover:bg-accent hover:text-accent-foreground transition-colors ${className}`}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="h-auto text-xs justify-start py-1 pl-1 pr-0 hover:bg-transparent"
          >
            {children}
          </Button>
        </CollapsibleTrigger>
        {accessory}
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            tabIndex={-1}
            aria-hidden="true"
            className="flex-1 h-auto text-xs justify-end py-1 px-1 hover:bg-transparent"
          >
            {chevron}
          </Button>
        </CollapsibleTrigger>
      </div>
    );
  }

  return (
    <CollapsibleTrigger asChild>
      <Button 
        variant="ghost" 
        className={`w-full h-auto text-xs justify-between py-1 px-1 my-1 ${className}`}
      >
        {children}
        {chevron}
      </Button>
    </CollapsibleTrigger>
  );
};
