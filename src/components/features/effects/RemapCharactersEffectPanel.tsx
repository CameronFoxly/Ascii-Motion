/**
 * RemapCharactersEffectPanel - Character remapping controls
 * 
 * Provides controls for replacing specific characters with new characters
 * in ASCII art with character selection and mapping interface.
 */

import { useCallback, useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Switch } from '../../ui/switch';
import { useEffectsStore } from '../../../stores/effectsStore';
import { RotateCcw, Plus, X, Eye, EyeOff } from 'lucide-react';

export function RemapCharactersEffectPanel() {
  const { 
    remapCharactersSettings,
    updateRemapCharactersSettings,
    resetEffectSettings,
    canvasAnalysis,
    isPreviewActive,
    previewEffect,
    startPreview,
    stopPreview,
    updatePreview
  } = useEffectsStore();

  const [newFromChar, setNewFromChar] = useState('');
  const [newToChar, setNewToChar] = useState('');

  const isCurrentlyPreviewing = isPreviewActive && previewEffect === 'remap-characters';

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

  // Add new character mapping
  const handleAddMapping = useCallback(() => {
    if (!newFromChar || !newToChar) return;
    
    const newMappings = {
      ...remapCharactersSettings.characterMappings,
      [newFromChar]: newToChar
    };
    updateRemapCharactersSettings({
      characterMappings: newMappings
    });
    
    // Clear input fields
    setNewFromChar('');
    setNewToChar('');
  }, [remapCharactersSettings, updateRemapCharactersSettings, newFromChar, newToChar]);

  // Remove character mapping
  const handleRemoveMapping = useCallback((fromChar: string) => {
    const newMappings = { ...remapCharactersSettings.characterMappings };
    delete newMappings[fromChar];
    updateRemapCharactersSettings({
      characterMappings: newMappings
    });
  }, [remapCharactersSettings, updateRemapCharactersSettings]);

  // Select character from canvas analysis
  const handleSelectCanvasCharacter = useCallback((char: string) => {
    setNewFromChar(char);
  }, []);

  // Update preserve spacing setting
  const handlePreserveSpacingChange = useCallback((preserveSpacing: boolean) => {
    updateRemapCharactersSettings({
      preserveSpacing
    });
  }, [updateRemapCharactersSettings]);

  // Handle character input (limit to single character)
  const handleFromCharChange = useCallback((value: string) => {
    setNewFromChar(value.slice(0, 1));
  }, []);

  const handleToCharChange = useCallback((value: string) => {
    setNewToChar(value.slice(0, 1));
  }, []);

  // Character analysis preview
  const charCount = canvasAnalysis?.uniqueCharacters?.length || 0;
  const topChars = canvasAnalysis?.charactersByFrequency?.slice(0, 15) || [];
  const mappingCount = Object.keys(remapCharactersSettings.characterMappings).length;

  return (
    <div className="space-y-4">
      
      {/* Settings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Character Options</Label>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span>Preserve spacing</span>
            <Switch
              checked={remapCharactersSettings.preserveSpacing}
              onCheckedChange={handlePreserveSpacingChange}
            />
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
          When enabled, spacing characters (spaces, tabs) are preserved and not remapped.
        </div>
      </div>

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

      {/* Character Analysis Summary */}
      {canvasAnalysis && (
        <div className="bg-muted/50 rounded p-3 text-xs space-y-2">
          <div className="font-medium">Canvas Characters ({charCount}):</div>
          <div className="grid grid-cols-5 gap-1">
            {topChars.map(({ char, count }) => (
              <button
                key={char}
                onClick={() => handleSelectCanvasCharacter(char)}
                className="flex flex-col items-center gap-1 p-1 rounded hover:bg-background/80 transition-colors border"
                title={`Click to select '${char === ' ' ? 'space' : char}' (used ${count} times)`}
              >
                <div className="w-6 h-6 bg-background border rounded text-center font-mono text-xs flex items-center justify-center">
                  {char === ' ' ? '␣' : char}
                </div>
                <span className="text-[10px] text-muted-foreground">{count}</span>
              </button>
            ))}
          </div>
          <div className="text-[10px] text-muted-foreground">
            Click any character to select as source character
          </div>
        </div>
      )}
      
      {/* Add New Mapping */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Add Character Mapping</Label>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">From Character</Label>
            <Input
              type="text"
              value={newFromChar}
              onChange={(e) => handleFromCharChange(e.target.value)}
              className="h-8 text-center font-mono"
              placeholder="A"
              maxLength={1}
            />
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">To Character</Label>
            <Input
              type="text"
              value={newToChar}
              onChange={(e) => handleToCharChange(e.target.value)}
              className="h-8 text-center font-mono"
              placeholder="B"
              maxLength={1}
            />
          </div>
        </div>
        
        <Button
          onClick={handleAddMapping}
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs"
          disabled={!newFromChar || !newToChar}
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Mapping
        </Button>
      </div>
      
      {/* Current Mappings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">
            Character Mappings ({mappingCount})
          </Label>
          <Button
            onClick={handleReset}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            title="Reset all mappings"
            disabled={mappingCount === 0}
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>
        
        {mappingCount === 0 ? (
          <div className="p-4 border border-dashed border-muted-foreground/50 rounded text-center text-xs text-muted-foreground">
            No character mappings defined. Use the controls above to add mappings.
          </div>
        ) : (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {Object.entries(remapCharactersSettings.characterMappings).map(([fromChar, toChar]) => (
              <div key={fromChar} className="flex items-center gap-2 text-xs p-2 bg-background rounded border">
                <div className="w-6 h-6 bg-muted border rounded text-center font-mono text-xs flex items-center justify-center">
                  {fromChar === ' ' ? '␣' : fromChar}
                </div>
                <span className="text-muted-foreground">→</span>
                <div className="w-6 h-6 bg-muted border rounded text-center font-mono text-xs flex items-center justify-center">
                  {toChar === ' ' ? '␣' : toChar}
                </div>
                <div className="flex-1 font-mono text-[11px]">
                  <div>
                    '{fromChar === ' ' ? 'space' : fromChar}' → '{toChar === ' ' ? 'space' : toChar}'
                  </div>
                </div>
                <Button
                  onClick={() => handleRemoveMapping(fromChar)}
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                  title="Remove mapping"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      
    </div>
  );
}