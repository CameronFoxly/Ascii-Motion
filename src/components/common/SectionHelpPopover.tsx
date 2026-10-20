import React from 'react';
import { CircleHelp } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface SectionHelpPopoverProps {
  title: string;
  children: React.ReactNode;
}

export const SectionHelpPopover: React.FC<SectionHelpPopoverProps> = ({ title, children }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`What are ${title}?`}
          className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <CircleHelp className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="left" align="start" className="w-64 p-3 text-xs">
        <p className="mb-1 font-medium">{title}</p>
        <div className="space-y-1 text-muted-foreground leading-relaxed">{children}</div>
      </PopoverContent>
    </Popover>
  );
};
