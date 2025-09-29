import React, { useRef } from 'react';
import { ColorPickerOverlay } from './ColorPickerOverlay';
import { EnhancedCharacterPicker } from './EnhancedCharacterPicker';

interface GradientStopPickerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onValueSelect: (value: string) => void;
  initialValue: string;
  type: 'character' | 'textColor' | 'backgroundColor';
}

export const GradientStopPicker: React.FC<GradientStopPickerProps> = ({
  isOpen,
  onOpenChange,
  onValueSelect,
  initialValue,
  type
}) => {
  // Create a dummy ref for the EnhancedCharacterPicker triggerRef requirement
  const dummyTriggerRef = useRef<HTMLDivElement>(null);

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
      <>
        {/* Hidden trigger element for positioning */}
        <div ref={dummyTriggerRef} className="fixed top-0 left-0 w-0 h-0 invisible" />
        
        <EnhancedCharacterPicker
          isOpen={isOpen}
          onClose={() => onOpenChange(false)}
          onSelectCharacter={handleCharacterSelect}
          triggerRef={dummyTriggerRef}
          anchorPosition="gradient-panel"
          initialValue={initialValue}
          title="Select Character"
        />
      </>
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