import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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

  const handleCharacterSelect = (character: string) => {
    onValueSelect(character);
    onOpenChange(false);
  };

  const handleColorSelect = (color: string) => {
    onValueSelect(color);
    onOpenChange(false);
  };

  if (type === 'character') {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Character</DialogTitle>
          </DialogHeader>
          
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
        </DialogContent>
      </Dialog>
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
    />
  );
};