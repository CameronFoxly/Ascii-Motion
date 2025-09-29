/**
 * ActiveStyleSection - Combined character and color selector in a side-by-side layout
 * 
 * Features:
 * - Character picker on the left with "Character" label
 * - FG/BG color controls on the right with "Color" label
 * - Grid layout similar to media import panel's alignment/nudge sections
 * - Renamed to "Appearance" in the UI for better clarity
 */

import React, { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Eye } from 'lucide-react';
import { 
  Collapsible,
  CollapsibleContent,
} from '../ui/collapsible';
import { CollapsibleHeader } from '../common/CollapsibleHeader';
import { EnhancedCharacterPicker } from './EnhancedCharacterPicker';
import { ForegroundBackgroundSelector } from './ForegroundBackgroundSelector';
import { ColorReadout } from './ColorReadout';
import { ColorPickerOverlay } from './ColorPickerOverlay';
import { useToolStore } from '../../stores/toolStore';
import { useCanvasStore } from '../../stores/canvasStore';

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
  
  // Canvas store for canvas background color
  const canvasBackgroundColor = useCanvasStore(state => state.canvasBackgroundColor);

  const handleCharacterSelect = (character: string) => {
    setSelectedChar(character);
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
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Appearance
          </div>
        </CollapsibleHeader>
        <CollapsibleContent className="collapsible-content space-y-3">
          {/* Character & Color Controls - Two Equal Columns */}
          <div className="grid grid-cols-2 gap-4">
            {/* Character Section */}
            <div className="flex flex-col items-center space-y-2">
              <Label className="text-xs font-medium">Character</Label>
              <div className="flex justify-center">
                <Button
                  ref={characterPreviewRef}
                  variant="outline"
                  className="w-16 h-16 text-3xl font-mono hover:border-primary transition-colors relative overflow-hidden flex items-center justify-center border-2"
                  onClick={() => {
                    setIsCharacterPickerOpen(true);
                  }}
                  title={`Active Character: "${selectedChar === ' ' ? 'Space' : selectedChar}" - Click to change`}
                  style={{
                    // Use canvas background color as the button background
                    backgroundColor: canvasBackgroundColor === 'transparent' ? '#000000' : canvasBackgroundColor,
                  }}
                >
                  {/* Character container with background color - sized to character bounds */}
                  <div className="relative flex items-center justify-center">
                    {/* Character background color - only covers character area */}
                    {selectedBgColor !== 'transparent' && (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ 
                          backgroundColor: selectedBgColor,
                          // Size the background to roughly match character bounds
                          width: '1.2em',
                          height: '1.2em',
                          left: '50%',
                          top: '50%',
                          transform: 'translate(-50%, -50%)'
                        }}
                      />
                    )}
                    {/* Character display - positioned above background */}
                    <span 
                      className="relative z-10 flex items-center justify-center"
                      style={{ 
                        color: selectedColor,
                        width: '1.2em',
                        height: '1.2em'
                      }}
                    >
                      {selectedChar === ' ' ? '␣' : selectedChar}
                    </span>
                  </div>
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
      <EnhancedCharacterPicker
        isOpen={isCharacterPickerOpen}
        onClose={() => setIsCharacterPickerOpen(false)}
        onSelectCharacter={handleCharacterSelect}
        triggerRef={characterPreviewRef}
        anchorPosition="bottom-right"
        initialValue={selectedChar}
        title="Select Character"
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