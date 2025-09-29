/**
 * RemapCharactersEffectPanel - Character remapping controls
 * 
 * Provides intuitive character remapping with automatic canvas character detection
 * and direct From/To character editing interface.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { useEffectsStore } from '../../../stores/effectsStore';
import { useCanvasStore } from '../../../stores/canvasStore';
import { CharacterPicker } from '../CharacterPicker';
import { RotateCcw, Eye, EyeOff, MoveRight, RotateCcwSquare } from 'lucide-react';

// Character utility functions
const sortCharactersByFrequency = (characters: string[], canvasAnalysis: any): string[] => {
  const charFrequency = canvasAnalysis?.charactersByFrequency || [];
  const frequencyMap = charFrequency.reduce((map: Record<string, number>, { char, count }: { char: string, count: number }) => {
    map[char] = count;
    return map;
  }, {});

  return characters.sort((a, b) => {
    const freqA = frequencyMap[a] || 0;
    const freqB = frequencyMap[b] || 0;
    // Sort by frequency (descending), then alphabetically
    if (freqA !== freqB) {
      return freqB - freqA;
    }
    return a.localeCompare(b);
  });
};

export function RemapCharactersEffectPanel() {
  const { 
    remapCharactersSettings,
    updateRemapCharactersSettings,
    resetEffectSettings,
    isPreviewActive,
    previewEffect,
    startPreview,
    stopPreview,
    updatePreview,
    getUniqueCharacters,
    analyzeCanvas,
    canvasAnalysis,
    isAnalyzing,
    clearAnalysisCache
  } = useEffectsStore();

  const { cells } = useCanvasStore();

  const isCurrentlyPreviewing = isPreviewActive && previewEffect === 'remap-characters';

  // Character picker state
  const [isCharacterPickerOpen, setIsCharacterPickerOpen] = useState(false);
  const [characterPickerTarget, setCharacterPickerTarget] = useState<{ 
    fromChar: string; 
    isToChar: boolean; 
    triggerRef: React.RefObject<HTMLElement | null> | null 
  }>({ fromChar: '', isToChar: false, triggerRef: null });

  // Get all unique characters from canvas analysis, sorted by frequency
  const allCanvasCharacters = useMemo(() => {
    // Only get characters if analysis is complete (not analyzing and has results)
    if (isAnalyzing || !canvasAnalysis) {
      return [];
    }
    const characters = getUniqueCharacters().filter(char => char.trim() !== ''); // Filter out empty/whitespace
    return sortCharactersByFrequency(characters, canvasAnalysis);
  }, [getUniqueCharacters, isAnalyzing, canvasAnalysis]);

  // Create refs for all character picker buttons (must be at top level)
  const characterPickerButtonRefs = useMemo(() => {
    const refs: Record<string, React.RefObject<HTMLButtonElement | null>> = {};
    allCanvasCharacters.forEach((fromChar) => {
      refs[`${fromChar}-from`] = { current: null };
      refs[`${fromChar}-to`] = { current: null };
    });
    return refs;
  }, [allCanvasCharacters]);

  // Auto-start preview when panel opens and analyze canvas
  useEffect(() => {
    // Clear cache and ensure fresh analysis every time panel opens
    clearAnalysisCache();
    analyzeCanvas();
    
    if (!isCurrentlyPreviewing) {
      startPreview('remap-characters');
    }
    
    // Cleanup on unmount
    return () => {
      if (isCurrentlyPreviewing) {
        stopPreview();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-analyze when canvas data changes (e.g., edits made outside the effect)
  useEffect(() => {
    // Clear cache and re-analyze when canvas cells change
    clearAnalysisCache();
    analyzeCanvas();
  }, [cells, clearAnalysisCache, analyzeCanvas]);

  // Initialize character mappings with identity mappings when canvas characters change
  useEffect(() => {
    // Only initialize if we have characters and analysis is complete
    if (allCanvasCharacters.length > 0 && !isAnalyzing) {
      const currentMappings = remapCharactersSettings.characterMappings;
      const identityMappings: Record<string, string> = {};
      
      // Create identity mappings for all current canvas characters
      allCanvasCharacters.forEach(char => {
        // Preserve existing mapping if it exists, otherwise map to self
        identityMappings[char] = currentMappings[char] || char;
      });
      
      // Only update if the mappings have changed
      const currentKeys = Object.keys(currentMappings).sort();
      const newKeys = Object.keys(identityMappings).sort();
      const keysChanged = JSON.stringify(currentKeys) !== JSON.stringify(newKeys);
      
      if (keysChanged || Object.keys(currentMappings).length === 0) {
        updateRemapCharactersSettings({
          characterMappings: identityMappings
        });
      }
    }
  }, [allCanvasCharacters, remapCharactersSettings.characterMappings, updateRemapCharactersSettings, isAnalyzing]);


  // Auto-start preview when panel opens
  useEffect(() => {
    if (!isCurrentlyPreviewing) {
      startPreview('remap-characters');
    }
    
    // Cleanup on unmount
    return () => {
      if (isCurrentlyPreviewing) {
        stopPreview();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update preview when settings change
  useEffect(() => {
    if (isCurrentlyPreviewing) {
      updatePreview().catch(error => {
        console.error('Preview update failed:', error);
      });
    }
  }, [remapCharactersSettings, isCurrentlyPreviewing, updatePreview]);

  // Update preview when active frame changes
  useEffect(() => {
    if (isCurrentlyPreviewing) {
      updatePreview().catch(error => {
        console.error('Preview update failed:', error);
      });
    }
  }, [cells, isCurrentlyPreviewing, updatePreview]);

  // Toggle preview
  const handleTogglePreview = useCallback(() => {
    if (isCurrentlyPreviewing) {
      stopPreview();
    } else {
      startPreview('remap-characters');
    }
  }, [isCurrentlyPreviewing, startPreview, stopPreview]);

  // Reset to default values
  const handleReset = useCallback(() => {
    resetEffectSettings('remap-characters');
  }, [resetEffectSettings]);

  // Update character mapping
  const handleUpdateMapping = useCallback((fromChar: string, toChar: string, isToChar: boolean) => {
    const newMappings = { ...remapCharactersSettings.characterMappings };
    
    if (isToChar) {
      // Update the 'to' character
      newMappings[fromChar] = toChar;
    } else {
      // This shouldn't happen in our UX, but handle just in case
      console.warn('Updating from character not supported in this interface');
    }
    
    updateRemapCharactersSettings({
      characterMappings: newMappings
    });
  }, [remapCharactersSettings.characterMappings, updateRemapCharactersSettings]);

  // Reset individual character mapping
  const handleResetMapping = useCallback((fromChar: string) => {
    const newMappings = { ...remapCharactersSettings.characterMappings };
    newMappings[fromChar] = fromChar; // Reset to identity mapping
    
    updateRemapCharactersSettings({
      characterMappings: newMappings
    });
  }, [remapCharactersSettings.characterMappings, updateRemapCharactersSettings]);

  // Handle character picker
  const handleOpenCharacterPicker = useCallback((fromChar: string, isToChar: boolean, triggerElement: HTMLElement | null) => {
    setCharacterPickerTarget({
      fromChar,
      isToChar,
      triggerRef: { current: triggerElement }
    });
    setIsCharacterPickerOpen(true);
  }, []);

  const handleCharacterPick = useCallback((character: string) => {
    if (characterPickerTarget.fromChar && characterPickerTarget.isToChar) {
      handleUpdateMapping(characterPickerTarget.fromChar, character, true);
    }
    setIsCharacterPickerOpen(false);
    setCharacterPickerTarget({ fromChar: '', isToChar: false, triggerRef: null });
  }, [characterPickerTarget, handleUpdateMapping]);

  const handleCloseCharacterPicker = useCallback(() => {
    setIsCharacterPickerOpen(false);
    setCharacterPickerTarget({ fromChar: '', isToChar: false, triggerRef: null });
  }, []);

  return (
    <div className="space-y-4">
      
      {/* Live Preview Toggle */}
      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-800">
        <div className="space-y-1">
          <Label className="text-xs font-medium text-blue-900 dark:text-blue-100">Live Preview</Label>
          <div className="text-xs text-blue-700 dark:text-blue-300">
            {isCurrentlyPreviewing ? 'Changes are shown on canvas' : 'Preview is disabled'}
          </div>
        </div>
        <Button
          onClick={handleTogglePreview}
          variant={isCurrentlyPreviewing ? "default" : "outline"}
          size="sm"
          className="h-8 gap-1"
        >
          {isCurrentlyPreviewing ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {isCurrentlyPreviewing ? 'On' : 'Off'}
        </Button>
      </div>

      {/* Character Mappings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">
            Character Mappings ({allCanvasCharacters.length})
          </Label>
          <Button
            onClick={handleReset}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            title="Reset all mappings"
            disabled={allCanvasCharacters.length === 0}
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>

        {isAnalyzing ? (
          <div className="p-4 border border-dashed border-muted-foreground/50 rounded text-center text-xs text-muted-foreground">
            Analyzing canvas characters...
          </div>
        ) : allCanvasCharacters.length === 0 ? (
          <div className="p-4 border border-dashed border-muted-foreground/50 rounded text-center text-xs text-muted-foreground">
            No characters found in canvas. Draw something to see character mappings.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {/* Header */}
            <div className="grid grid-cols-[32px_32px_32px_24px_24px] gap-2 items-center text-xs font-medium text-muted-foreground px-1">
              <div>From</div>
              <div></div>
              <div>To</div>
              <div></div>
              <div></div>
            </div>

            {/* Character mappings */}
            <div className="space-y-1">
              {allCanvasCharacters.map((fromChar) => {
                const toChar = remapCharactersSettings.characterMappings[fromChar] || fromChar;
                const toButtonRef = characterPickerButtonRefs[`${fromChar}-to`];

                return (
                  <div 
                    key={fromChar} 
                    className="grid grid-cols-[32px_32px_32px_24px_24px] gap-2 items-center p-2 bg-background rounded border border-muted/30 hover:bg-muted/50 hover:border-muted/50 transition-colors text-xs"
                  >
                    {/* From Character (read-only display) */}
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 bg-muted/50 border rounded text-center font-mono text-xs flex items-center justify-center">
                        {fromChar === ' ' ? '␣' : fromChar}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                      <MoveRight className="w-4 h-4 text-muted-foreground" />
                    </div>

                    {/* To Character (editable) */}
                    <div className="flex items-center justify-center">
                      <button
                        ref={toButtonRef}
                        onClick={(e) => handleOpenCharacterPicker(fromChar, true, e.currentTarget)}
                        className="w-6 h-6 bg-background border rounded text-center font-mono text-xs flex items-center justify-center hover:border-blue-500 transition-colors cursor-pointer"
                        title={`Click to change target character for '${fromChar === ' ' ? 'space' : fromChar}'`}
                      >
                        {toChar === ' ' ? '␣' : toChar}
                      </button>
                    </div>

                    {/* Individual Reset Button */}
                    <Button
                      onClick={() => handleResetMapping(fromChar)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-blue-600"
                      title={`Reset '${fromChar === ' ' ? 'space' : fromChar}' to map to itself`}
                      disabled={fromChar === toChar}
                    >
                      <RotateCcwSquare className="w-3 h-3" />
                    </Button>

                    {/* Remove Button - Hidden for auto-populated mappings */}
                    <div className="w-6 h-6"></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Character Picker */}
      {isCharacterPickerOpen && characterPickerTarget.triggerRef && (
        <CharacterPicker
          isOpen={isCharacterPickerOpen}
          onClose={handleCloseCharacterPicker}
          onSelectCharacter={handleCharacterPick}
          triggerRef={characterPickerTarget.triggerRef}
        />
      )}
      
    </div>
  );
}