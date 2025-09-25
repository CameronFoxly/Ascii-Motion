/**
 * ActiveStyleSection - Combined character and color selector in a side-by-side layout
 * 
 * Features:
 * - Character picker on the left with "Character" label
 * - FG/BG color controls on the right with "Color" label
 * - Grid layout similar to media import panel's alignment/nudge sections
 */

import React, { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { 
  Collapsible,
  CollapsibleContent,
} from '../ui/collapsible';
import { CollapsibleHeader } from '../common/CollapsibleHeader';
import { CharacterPicker } from './CharacterPicker';
import { ForegroundBackgroundSelector } from './ForegroundBackgroundSelector';
import { ColorReadout } from './ColorReadout';
import { ColorPickerOverlay } from './ColorPickerOverlay';
import { useToolStore } from '../../stores/toolStore';
import { useCharacterPaletteStore } from '../../stores/characterPaletteStore';

interface ActiveStyleSectionProps {
  className?: string;
}

export function ActiveStyleSection({ className = '' }: ActiveStyleSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isCharacterPickerOpen, setIsCharacterPickerOpen] = useState(false);
  
  // Color picker state
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [colorPickerMode, setColorPickerMode] = useState<'foreground' | 'background'>('foreground');
  const [colorPickerInitialColor, setColorPickerInitialColor] = useState('#000000');
  const [colorPickerTriggerRef, setColorPickerTriggerRef] = useState<React.RefObject<HTMLElement | null> | undefined>(undefined);
  
  const characterPreviewRef = useRef<HTMLButtonElement>(null);
  
  // Tool store for selected character and colors
  const selectedChar = useToolStore(state => state.selectedChar);
  const setSelectedChar = useToolStore(state => state.setSelectedChar);
  const selectedColor = useToolStore(state => state.selectedColor);
  const selectedBgColor = useToolStore(state => state.selectedBgColor);
  const setSelectedColor = useToolStore(state => state.setSelectedColor);
  const setSelectedBgColor = useToolStore(state => state.setSelectedBgColor);
  
  // Character palette store for updating palettes
  const addCharacterToPalette = useCharacterPaletteStore(state => state.addCharacterToPalette);
  const activePalette = useCharacterPaletteStore(state => state.activePalette);

  const handleCharacterSelect = (character: string) => {
    setSelectedChar(character);
    
    // Auto-add to active palette if not already present
    if (activePalette && !activePalette.characters.includes(character)) {
      addCharacterToPalette(activePalette.id, character);
    }
    
    setIsCharacterPickerOpen(false);
  };

  const handleOpenColorPicker = (mode: 'foreground' | 'background', currentColor: string, triggerRef?: React.RefObject<HTMLElement | null> | undefined) => {
    setColorPickerMode(mode);
    setColorPickerInitialColor(currentColor);
    setColorPickerTriggerRef(triggerRef);
    setIsColorPickerOpen(true);
  };

  // Handle color picker selection
  const handleColorPickerSelect = (newColor: string) => {
    if (colorPickerMode === 'foreground') {
      setSelectedColor(newColor);
    } else if (colorPickerMode === 'background') {
      setSelectedBgColor(newColor);
    }
    setIsColorPickerOpen(false);
  };

  // Handle real-time color changes (for live preview)
  const handleColorPickerChange = (newColor: string) => {
    if (colorPickerMode === 'foreground') {
      setSelectedColor(newColor);
    } else if (colorPickerMode === 'background') {
      setSelectedBgColor(newColor);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleHeader isOpen={isOpen}>
          Active Style
        </CollapsibleHeader>
        <CollapsibleContent className="space-y-3">
          {/* Character & Color Controls - Two Equal Columns */}
          <div className="grid grid-cols-2 gap-4">
            {/* Character Section */}
            <div className="flex flex-col items-center space-y-2">
              <Label className="text-xs font-medium">Character</Label>
              <div className="flex justify-center">
                <Button
                  ref={characterPreviewRef}
                  variant="outline"
                  className="w-16 h-16 text-3xl font-mono hover:bg-muted transition-colors"
                  onClick={() => {
                    setIsCharacterPickerOpen(true);
                  }}
                  title={`Active Character: "${selectedChar === ' ' ? 'Space' : selectedChar}" - Click to change`}
                >
                  {selectedChar === ' ' ? '␣' : selectedChar}
                </Button>
              </div>
            </div>

            {/* Color Section */}
            <div className="flex flex-col items-center space-y-2">
              <Label className="text-xs font-medium">Color</Label>
              <ForegroundBackgroundSelector onOpenColorPicker={handleOpenColorPicker} />
            </div>
          </div>

          {/* Color Values Display - Left aligned under both sections */}
          <ColorReadout />
        </CollapsibleContent>
      </Collapsible>

      {/* Character Picker */}
      <CharacterPicker
        isOpen={isCharacterPickerOpen}
        onClose={() => setIsCharacterPickerOpen(false)}
        onSelectCharacter={handleCharacterSelect}
        triggerRef={characterPreviewRef}
        anchorPosition="bottom-right"
      />

      {/* Color Picker Overlay */}
      <ColorPickerOverlay
        isOpen={isColorPickerOpen}
        onOpenChange={setIsColorPickerOpen}
        onColorSelect={handleColorPickerSelect}
        onColorChange={handleColorPickerChange}
        initialColor={colorPickerInitialColor}
        title={`Edit ${colorPickerMode === 'foreground' ? 'Foreground' : 'Background'} Color`}
        showTransparentOption={colorPickerMode === 'background'}
        triggerRef={colorPickerTriggerRef}
        anchorPosition="bottom-right"
      />
    </div>
  );
}