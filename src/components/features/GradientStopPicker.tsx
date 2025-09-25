import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ColorPickerOverlay } from './ColorPickerOverlay';
import { CHARACTER_CATEGORIES } from '../../constants';
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

interface GradientStopPickerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onValueSelect: (value: string) => void;
  initialValue: string;
  type: 'character' | 'textColor' | 'backgroundColor';
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

export const GradientStopPicker: React.FC<GradientStopPickerProps> = ({
  isOpen,
  onOpenChange,
  onValueSelect,
  initialValue,
  type
}) => {
  const [selectedCategory, setSelectedCategory] = useState("Basic Text");
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        onOpenChange(false);
      }
    };

    if (isOpen && type === 'character') {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onOpenChange, type]);

  // Close picker on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && type === 'character') {
        onOpenChange(false);
      }
    };

    if (isOpen && type === 'character') {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onOpenChange, type]);

  const handleCharacterSelect = (character: string) => {
    onValueSelect(character);
    onOpenChange(false);
  };

  const handleColorSelect = (color: string) => {
    onValueSelect(color);
    onOpenChange(false);
  };

  // Position calculation for character picker (same as color picker gradient-panel positioning)
  const getPickerPosition = () => {
    const pickerWidth = 400;
    const pickerHeight = 500;
    
    // Center the picker vertically in the viewport
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
  };

  if (type === 'character') {
    if (!isOpen) return null;

    const position = getPickerPosition();
    
    return createPortal(
      <div
        ref={pickerRef}
        className="fixed z-[99999] animate-in duration-200 slide-in-from-right-2 fade-in-0"
        style={{
          top: position.top,
          left: position.left,
          maxWidth: '400px',
          width: '400px'
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="border border-border/50 shadow-lg">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Select Character</h3>
            
            <div className="space-y-4">
              {/* Category Selection */}
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
              
              {/* Character Grid */}
              <div className="max-h-60 overflow-y-auto">
                <div className="grid grid-cols-8 gap-1 p-2 border border-border rounded bg-muted/30">
                  {CHARACTER_CATEGORIES[selectedCategory as keyof typeof CHARACTER_CATEGORIES]?.map((char, index) => (
                    <Button
                      key={index}
                      variant={initialValue === char ? "default" : "ghost"}
                      className="h-8 w-8 p-0 font-mono text-sm"
                      onClick={() => handleCharacterSelect(char)}
                    >
                      {char}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>,
      document.body
    );
  }

  // For color types, use the existing ColorPickerOverlay
  return (
    <ColorPickerOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onColorSelect={handleColorSelect}
      initialColor={initialValue}
      title={type === 'textColor' ? 'Select Text Color' : 'Select Background Color'}
      showTransparentOption={type === 'backgroundColor'}
      anchorPosition="gradient-panel"
    />
  );
};