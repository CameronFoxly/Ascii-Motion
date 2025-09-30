import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CHARACTER_CATEGORIES } from '@/constants';
import { 
  Type, 
  Hash, 
  Grid3X3, 
  Square, 
  Navigation, 
  Triangle, 
  Sparkles,
  Minus
} from 'lucide-react';

interface EnhancedCharacterPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCharacter: (character: string) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  anchorPosition?: 'bottom-right' | 'left-slide' | 'left-bottom' | 'left-bottom-aligned' | 'gradient-panel';
  initialValue?: string;
  title?: string;
}

const CATEGORY_ICONS = {
  "Basic Text": Type,
  "Punctuation": Minus,
  "Math/Symbols": Hash,
  "Lines/Borders": Grid3X3,
  "Blocks/Shading": Square,
  "Arrows": Navigation,
  "Geometric": Triangle,
  "Special": Sparkles
};

export const EnhancedCharacterPicker: React.FC<EnhancedCharacterPickerProps> = ({
  isOpen,
  onClose,
  onSelectCharacter,
  triggerRef,
  anchorPosition = 'left-slide',
  initialValue = '',
  title = 'Select Character'
}) => {
  const [selectedCategory, setSelectedCategory] = useState("Basic Text");
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  // Close picker on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleCharacterSelect = (character: string) => {
    onSelectCharacter(character);
    onClose();
  };

  // Position calculation with support for all existing anchor positions
  const getPickerPosition = () => {
    if (!triggerRef.current) return { top: 0, right: 0, left: 0 };
    
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const pickerWidth = 400; // Enhanced width for better breathing room
    const pickerHeight = 500; // Enhanced height for better visual hierarchy
    
    if (anchorPosition === 'gradient-panel') {
      // Center the picker vertically in the viewport (from GradientStopPicker)
      const viewportHeight = window.innerHeight;
      const top = Math.max(8, (viewportHeight - pickerHeight) / 2 + window.scrollY);
      
      // Position to the left of the gradient panel (which is 320px wide and on the right side)
      const gradientPanelWidth = 320;
      const left = window.innerWidth - gradientPanelWidth - pickerWidth - 16; // 16px gap
      
      return {
        top,
        left: Math.max(8, left), // Ensure it doesn't go off-screen
        right: 'auto'
      };
    } else if (anchorPosition === 'bottom-right') {
      // Anchor bottom-right corner of picker to the trigger element
      let top = triggerRect.bottom + window.scrollY - pickerHeight - 8; // 8px gap above trigger
      let left = triggerRect.right - pickerWidth + window.scrollX;
      
      // Ensure picker doesn't go off-screen
      if (left < 0) left = 8; // 8px margin from left edge
      if (top < window.scrollY) top = triggerRect.bottom + window.scrollY + 8; // Show below if no room above
      
      return {
        top,
        left,
        right: 'auto'
      };
    } else if (anchorPosition === 'left-bottom') {
      // Anchor bottom-right corner of picker to the left side of trigger, with bottom alignment
      let top = triggerRect.bottom + window.scrollY - pickerHeight;
      let right = window.innerWidth - triggerRect.left + 8; // 8px gap from trigger
      
      // Ensure picker doesn't go off-screen vertically
      if (top < window.scrollY) top = window.scrollY + 8; // 8px margin from top
      
      return {
        top,
        right,
        left: 'auto'
      };
    } else if (anchorPosition === 'left-bottom-aligned') {
      // Align bottom of picker with bottom of trigger element, positioned to the left
      let top = triggerRect.bottom + window.scrollY - pickerHeight;
      let right = window.innerWidth - triggerRect.left + 8; // 8px gap from trigger
      
      // Ensure picker doesn't go off-screen vertically
      if (top < window.scrollY) top = window.scrollY + 8; // 8px margin from top
      
      return {
        top,
        right,
        left: 'auto'
      };
    } else {
      // Default left-slide behavior (for edit button from palette container)
      return {
        top: triggerRect.top + window.scrollY,
        right: window.innerWidth - triggerRect.left + 8, // 8px gap from trigger
        left: 'auto'
      };
    }
  };

  if (!isOpen) return null;

  const position = getPickerPosition();

  return createPortal(
    <div
      ref={pickerRef}
      className={`fixed z-[99999] animate-in duration-200 ${
        anchorPosition === 'bottom-right' ? 'slide-in-from-bottom-2 fade-in-0' : 'slide-in-from-right-2 fade-in-0'
      }`}
      style={{
        top: position.top,
        right: position.right !== 'auto' ? position.right : undefined,
        left: position.left !== 'auto' ? position.left : undefined,
        maxWidth: '400px',
        width: '400px'
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <Card className="border border-border/50 shadow-lg">
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-4">{title}</h3>
          
          <div className="space-y-4">
            {/* Category Selection - Enhanced 4-column grid with icons */}
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(CHARACTER_CATEGORIES).map(([category]) => {
                const Icon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || Type;
                return (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    className="h-12 flex flex-col items-center gap-1 text-xs"
                    onClick={() => setSelectedCategory(category)}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs leading-none">{category.split('/')[0]}</span>
                  </Button>
                );
              })}
            </div>
            
            {/* Character Grid - Enhanced 8-column grid for better spacing */}
            <div className="max-h-60 overflow-y-auto">
              <div className="grid grid-cols-8 gap-1 p-2 border border-border rounded bg-muted/30">
                <TooltipProvider>
                  {CHARACTER_CATEGORIES[selectedCategory as keyof typeof CHARACTER_CATEGORIES]?.map((char, index) => (
                    <Tooltip key={index}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={initialValue === char ? "default" : "ghost"}
                          className="h-8 w-8 p-0 font-mono text-sm hover:bg-accent hover:text-accent-foreground flex items-center justify-center"
                          onClick={() => handleCharacterSelect(char)}
                        >
                          {char}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Insert "{char}"</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>,
    document.body
  );
};