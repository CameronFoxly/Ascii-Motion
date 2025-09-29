/**
 * RemapCharactersEffectPanel - Character remapping controls
 * 
 * Provides controls for replacing specific characters with new characters
 * in ASCII art with character selection and mapping interface.
 */

import { useCallback } from 'react';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { useEffectsStore } from '../../../stores/effectsStore';
import { RotateCcw, Plus } from 'lucide-react';

export function RemapCharactersEffectPanel() {
  const { 
    remapCharactersSettings,
    resetEffectSettings,
    canvasAnalysis
  } = useEffectsStore();

  // Reset to default values
  const handleReset = useCallback(() => {
    resetEffectSettings('remap-characters');
  }, [resetEffectSettings]);

  // Character analysis preview
  const charCount = canvasAnalysis?.uniqueCharacters?.length || 0;
  const topChars = canvasAnalysis?.charactersByFrequency?.slice(0, 10) || [];

  return (
    <div className="space-y-4">
      
      {/* Character Analysis Summary */}
      {canvasAnalysis && (
        <div className="bg-muted/50 rounded p-3 text-xs space-y-2">
          <div className="font-medium">Available Characters ({charCount}):</div>
          <div className="flex flex-wrap gap-1">
            {topChars.map(({ char, count }) => (
              <div key={char} className="flex items-center gap-1 text-xs bg-background border rounded px-1">
                <span className="font-mono text-xs">{char === ' ' ? '␣' : char}</span>
                <span className="text-muted-foreground text-[10px]">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Character Mappings Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Character Mappings</Label>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              title="Add mapping"
            >
              <Plus className="w-3 h-3" />
            </Button>
            <Button
              onClick={handleReset}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              title="Reset to defaults"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        {/* Current Mappings */}
        {Object.keys(remapCharactersSettings.characterMappings).length === 0 ? (
          <div className="p-4 border border-dashed border-muted-foreground/50 rounded text-center text-xs text-muted-foreground">
            No character mappings defined. Click + to add mappings.
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(remapCharactersSettings.characterMappings).map(([fromChar, toChar]) => (
              <div key={fromChar} className="flex items-center gap-2 text-xs">
                <div className="w-6 h-6 bg-background border rounded text-center font-mono text-xs flex items-center justify-center">
                  {fromChar === ' ' ? '␣' : fromChar}
                </div>
                <span>→</span>
                <div className="w-6 h-6 bg-background border rounded text-center font-mono text-xs flex items-center justify-center">
                  {toChar === ' ' ? '␣' : toChar}
                </div>
                <span className="text-muted-foreground flex-1">
                  '{fromChar}' → '{toChar}'
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Preview Hint */}
      <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded p-2 text-xs">
        <div className="text-blue-800 dark:text-blue-200">
          💡 <strong>Coming Soon:</strong> Interactive character mapping with
          click-to-select characters from your ASCII art.
        </div>
      </div>
      
    </div>
  );
}