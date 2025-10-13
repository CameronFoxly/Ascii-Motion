import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { CollapsibleTrigger } from '@/components/ui/collapsible';

interface CollapsibleHeaderProps {
  children: React.ReactNode;
  isOpen: boolean;
  expandsUp?: boolean;
  className?: string;
}

export const CollapsibleHeader: React.FC<CollapsibleHeaderProps> = ({ 
  children, 
  isOpen,
  expandsUp = false,
  className = ''
}) => {
  return (
    <CollapsibleTrigger asChild>
      <Button 
        variant="ghost" 
        className={`w-full h-auto text-xs justify-between py-1 px-1 my-1 ${className}`}
      >
        {children}
        <ChevronDown 
          className={`h-3 w-3 transition-transform duration-200 ${
            expandsUp 
              ? (isOpen ? '' : 'rotate-180')
              : (isOpen ? 'rotate-180' : '')
          }`} 
        />
      </Button>
    </CollapsibleTrigger>
  );
};
