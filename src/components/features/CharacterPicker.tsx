import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { CHARACTER_CATEGORIES } from '@/constants';

interface CharacterPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCharacter: (character: string) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

export const CharacterPicker: React.FC<CharacterPickerProps> = ({
  isOpen,
  onClose,
  onSelectCharacter,
  triggerRef
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
    if (!triggerRef.current) return { top: 0, right: 0 };
    
    const triggerRect = triggerRef.current.getBoundingClientRect();
    return {
      top: triggerRect.top + window.scrollY,
      right: window.innerWidth - triggerRect.left + 8 // 8px gap from trigger
    };
  };

  if (!isOpen) return null;

  const position = getPickerPosition();

  return (
    <div
      ref={pickerRef}
      className="fixed z-50 animate-in slide-in-from-right-2 duration-200"
      style={{
        top: position.top,
        right: position.right,
        maxWidth: '320px',
        width: '320px'
      }}
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
    </div>
  );
};