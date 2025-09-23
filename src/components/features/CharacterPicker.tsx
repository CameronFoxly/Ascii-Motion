import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { CHARACTER_CATEGORIES } from '@/constants';

interface CharacterPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCharacter: (character: string) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  anchorPosition?: 'bottom-right' | 'left-slide' | 'left-bottom' | 'left-bottom-aligned';
}

export const CharacterPicker: React.FC<CharacterPickerProps> = ({
  isOpen,
  onClose,
  onSelectCharacter,
  triggerRef,
  anchorPosition = 'left-slide'
}) => {
  const [activeTab, setActiveTab] = useState('Basic Text');
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

  // Position calculation
  const getPickerPosition = () => {
    if (!triggerRef.current) return { top: 0, right: 0, left: 0 };
    
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const pickerWidth = 320;
    const pickerHeight = 300;
    
    if (anchorPosition === 'bottom-right') {
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
        maxWidth: '320px',
        width: '320px'
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <Card className="border border-border/50 shadow-lg">
        <div className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-3">
              <TabsTrigger value="Basic Text" className="text-xs">Basic</TabsTrigger>
              <TabsTrigger value="Blocks/Shading" className="text-xs">Blocks</TabsTrigger>
              <TabsTrigger value="Lines/Borders" className="text-xs">Lines</TabsTrigger>
            </TabsList>
            
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="Punctuation" className="text-xs">Punct</TabsTrigger>
              <TabsTrigger value="Math/Symbols" className="text-xs">Math</TabsTrigger>
              <TabsTrigger value="Arrows" className="text-xs">Arrows</TabsTrigger>
            </TabsList>

            {Object.entries(CHARACTER_CATEGORIES).map(([category, characters]) => (
              <TabsContent key={category} value={category} className="mt-0">
                <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto">
                  {characters.map((char, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      className="h-8 w-8 p-0 text-sm font-mono hover:bg-accent hover:text-accent-foreground flex items-center justify-center"
                      onClick={() => handleCharacterSelect(char)}
                      title={`Insert "${char}"`}
                    >
                      {char}
                    </Button>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </Card>
    </div>,
    document.body
  );
};