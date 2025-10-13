/**
 * CharacterMappingControls - Inline controls for character palette selection and mapping settings
 * 
 * Features:
 * - Character palette dropdown selector
 * - Mapping algorithm selection (brightness, luminance, contrast, edge-detection)
 * - Invert density toggle
 * - Character density preview visualization
 * - Real-time preview integration with import system
 */


import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent } from '../ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Type, RotateCcw, Settings } from 'lucide-react';
import { useMemo } from 'react';
import { useCharacterPaletteStore } from '../../stores/characterPaletteStore';
import { MAPPING_ALGORITHMS } from '../../utils/asciiConverter';

interface CharacterMappingControlsProps {
  onSettingsChange?: () => void; // Callback for triggering preview updates
}

export function CharacterMappingControls({ onSettingsChange }: CharacterMappingControlsProps) {
  const availablePalettes = useCharacterPaletteStore(state => state.availablePalettes);
  const customPalettes = useCharacterPaletteStore(state => state.customPalettes);
  const allPalettes = useMemo(() => [...availablePalettes, ...customPalettes], [availablePalettes, customPalettes]);
  const activePalette = useCharacterPaletteStore(state => state.activePalette);
  const setActivePalette = useCharacterPaletteStore(state => state.setActivePalette);
  const mappingMethod = useCharacterPaletteStore(state => state.mappingMethod);
  const invertDensity = useCharacterPaletteStore(state => state.invertDensity);
  const characterSpacing = useCharacterPaletteStore(state => state.characterSpacing);
  const setMappingMethod = useCharacterPaletteStore(state => state.setMappingMethod);
  const setInvertDensity = useCharacterPaletteStore(state => state.setInvertDensity);
  const setCharacterSpacing = useCharacterPaletteStore(state => state.setCharacterSpacing);

  // Handle palette selection
  const handlePaletteChange = (paletteId: string) => {
    const selectedPalette = allPalettes.find(p => p.id === paletteId);
    if (selectedPalette) {
      setActivePalette(selectedPalette);
      onSettingsChange?.();
    }
  };

  // Handle mapping method change
  const handleMappingMethodChange = (method: string) => {
    setMappingMethod(method as keyof typeof MAPPING_ALGORITHMS);
    onSettingsChange?.();
  };

  // Handle invert density toggle
  const handleInvertDensityChange = (inverted: boolean) => {
    setInvertDensity(inverted);
    onSettingsChange?.();
  };

  // Handle character spacing change
  const handleCharacterSpacingChange = (spacing: number) => {
    setCharacterSpacing(spacing);
    onSettingsChange?.();
  };

  // Reset to defaults
  const handleResetToDefaults = () => {
    const minimalPalette = allPalettes.find(p => p.id === 'minimal-ascii');
    if (minimalPalette) {
      setActivePalette(minimalPalette);
    }
    setMappingMethod('brightness');
    setInvertDensity(false);
    setCharacterSpacing(1.0);
    onSettingsChange?.();
  };

  return (
    <Card className="bg-card/50 border-border/50 overflow-hidden" style={{ width: '296px', maxWidth: '296px' }}>
      <CardContent className="p-3 space-y-3" style={{ width: '272px', maxWidth: '272px' }}>
        {/* Header */}
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Character Mapping</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetToDefaults}
                  className="h-6 w-6 p-0 ml-auto"
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reset to defaults</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Character Palette Selector */}
        <div className="space-y-2" style={{ width: '272px', maxWidth: '272px' }}>
          <Label className="text-xs font-medium">Character Palette</Label>
          <Select value={activePalette.id} onValueChange={handlePaletteChange}>
            <SelectTrigger className="h-8 text-xs" style={{ width: '272px', maxWidth: '272px' }}>
              <SelectValue placeholder="Select character palette" />
            </SelectTrigger>
            <SelectContent className="max-w-72" style={{ maxWidth: '272px' }}>
              {/* Group by category */}
              {['ascii', 'blocks', 'unicode', 'custom'].map(category => {
                const categoryPalettes = allPalettes.filter(p => p.category === category);
                if (categoryPalettes.length === 0) return null;
                
                return (
                  <div key={category}>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground capitalize border-b">
                      {category === 'ascii' ? 'ASCII' : category === 'unicode' ? 'Unicode' : category.charAt(0).toUpperCase() + category.slice(1)}
                    </div>
                    {categoryPalettes.map(palette => (
                      <SelectItem key={palette.id} value={palette.id} className="text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="truncate flex-1">{palette.name}</span>
                          <span className="text-muted-foreground flex-shrink-0">({palette.characters.length} chars)</span>
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Character Preview */}
        <div className="space-y-2" style={{ width: '272px', maxWidth: '272px' }}>
          <Label className="text-xs font-medium">Character Density Preview</Label>
          <div className="bg-background/50 border border-border rounded p-2 min-h-[40px] overflow-hidden" style={{ width: '272px', maxWidth: '272px' }}>
            <div className="text-xs font-mono leading-relaxed overflow-hidden break-all">
              {(invertDensity ? [...activePalette.characters].reverse() : activePalette.characters).join('')}
            </div>
            <div className="text-xs text-muted-foreground mt-1 break-words">
              {invertDensity ? 'Dark → Light' : 'Light → Dark'} ({activePalette.characters.length} characters)
            </div>
          </div>
        </div>

        {/* Mapping Algorithm */}
        <div className="space-y-2" style={{ width: '272px', maxWidth: '272px' }}>
          <Label className="text-xs font-medium">Mapping Algorithm</Label>
          <Select value={mappingMethod} onValueChange={handleMappingMethodChange}>
            <SelectTrigger className="h-8 text-xs" style={{ width: '272px', maxWidth: '272px' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-w-72" style={{ maxWidth: '272px' }}>
              {Object.entries(MAPPING_ALGORITHMS).map(([key, algorithm]) => (
                <SelectItem key={key} value={key} className="text-xs">
                  <div className="space-y-1 min-w-0">
                    <div className="font-medium capitalize truncate">{algorithm.name.replace('-', ' ')}</div>
                    <div className="text-muted-foreground text-xs break-words">{algorithm.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Advanced Options */}
        <div className="space-y-3 pt-2 border-t border-border/50" style={{ width: '272px', maxWidth: '272px' }}>
          <div className="flex items-center gap-2">
            <Settings className="w-3 h-3 text-muted-foreground" />
            <Label className="text-xs font-medium">Advanced Options</Label>
          </div>

          {/* Invert Density */}
          <div className="flex items-center justify-between" style={{ width: '272px', maxWidth: '272px' }}>
            <Label htmlFor="invert-density" className="text-xs">Invert Density</Label>
            <Switch
              id="invert-density"
              checked={invertDensity}
              onCheckedChange={handleInvertDensityChange}
              className="h-4 w-7"
            />
          </div>

          {/* Character Spacing (Future feature) */}
          <div className="flex items-center justify-between" style={{ width: '272px', maxWidth: '272px' }}>
            <Label htmlFor="char-spacing" className="text-xs">Character Spacing</Label>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCharacterSpacingChange(Math.max(0.1, characterSpacing - 0.1))}
                className="h-6 w-6 p-0 text-xs flex-shrink-0"
                disabled={characterSpacing <= 0.1}
              >
                −
              </Button>
              <span className="text-xs font-mono min-w-[3ch] text-center flex-shrink-0">
                {characterSpacing.toFixed(1)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCharacterSpacingChange(Math.min(3.0, characterSpacing + 0.1))}
                className="h-6 w-6 p-0 text-xs flex-shrink-0"
                disabled={characterSpacing >= 3.0}
              >
                +
              </Button>
            </div>
          </div>
        </div>

        {/* Palette Info */}
        <div className="bg-muted/30 rounded p-2 text-xs space-y-1 overflow-hidden" style={{ width: '272px', maxWidth: '272px' }}>
          <div className="font-medium break-words">{activePalette.name}</div>
          <div className="text-muted-foreground break-words">
            Category: {activePalette.category.charAt(0).toUpperCase() + activePalette.category.slice(1)} • 
            {activePalette.characters.length} characters • 
            {activePalette.isPreset ? 'Preset' : 'Custom'}
          </div>
          {!activePalette.isPreset && (
            <div className="text-muted-foreground break-words">
              Custom palette - can be edited below
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}