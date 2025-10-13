/**
 * TransparencySection - Collapsible section for color keying/alpha transparency controls
 * 
 * Features:
 * - Enable/disable color as alpha
 * - Color picker for selecting the alpha key color
 * - Eyedropper tool to sample colors from the preview
 * - Tolerance slider for fuzzy color matching
 */

import { useState } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Slider } from '../ui/slider';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import { Checkbox } from '../ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Sparkles, ChevronDown, Pipette } from 'lucide-react';
import { useImportSettings } from '../../stores/importStore';
import { ColorPickerOverlay } from './ColorPickerOverlay';

interface TransparencySectionProps {
  onSettingsChange?: () => void;
  onEyedropperClick?: () => void;
}

export function TransparencySection({ onSettingsChange, onEyedropperClick }: TransparencySectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  
  // Import settings
  const { settings, updateSettings } = useImportSettings();
  const {
    enableColorAsAlpha,
    colorAsAlphaKey,
    colorAsAlphaTolerance
  } = settings;

  const handleToggleEnabled = (enabled: boolean) => {
    updateSettings({ enableColorAsAlpha: enabled });
    onSettingsChange?.();
  };

  const handleColorChange = (color: string) => {
    updateSettings({ colorAsAlphaKey: color });
    onSettingsChange?.();
  };

  const handleToleranceChange = (value: number) => {
    updateSettings({ colorAsAlphaTolerance: value });
    onSettingsChange?.();
  };

  const handleColorPickerOpen = () => {
    setIsColorPickerOpen(true);
  };

  const handleColorPickerSelect = (color: string) => {
    handleColorChange(color);
    setIsColorPickerOpen(false);
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-2 px-3">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start gap-2 h-8 px-2 hover:bg-accent/50"
            >
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Transparency</span>
              <ChevronDown 
                className={`ml-auto h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </Button>
          </CollapsibleTrigger>
          
          <Checkbox
            checked={enableColorAsAlpha}
            onCheckedChange={handleToggleEnabled}
            className="flex-shrink-0"
          />
        </div>
        
        <CollapsibleContent className="collapsible-content">
          <div className="px-3 pb-3">
            {!enableColorAsAlpha && (
              <div className="p-3 border border-border/50 rounded-lg bg-muted/20">
                <p className="text-xs text-muted-foreground text-center">
                  Color keying is disabled. Enable to make a color transparent.
                </p>
              </div>
            )}
            
            {enableColorAsAlpha && (
              <Card className="bg-card/30 border-border/50">
                <CardContent className="p-3 space-y-3">
                  {/* Color Selection */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Alpha Key Color</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleColorPickerOpen}
                        className="flex-1 h-8 justify-start gap-2 px-2"
                      >
                        <div 
                          className="w-4 h-4 rounded border border-border"
                          style={{ backgroundColor: colorAsAlphaKey }}
                        />
                        <span className="text-xs font-mono">{colorAsAlphaKey}</span>
                      </Button>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={onEyedropperClick}
                              className="h-8 w-8 p-0"
                            >
                              <Pipette className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Pick color from preview</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cells matching this color will be transparent
                    </p>
                  </div>

                  {/* Tolerance Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Tolerance</Label>
                      <span className="text-xs text-muted-foreground">{colorAsAlphaTolerance}</span>
                    </div>
                    <Slider
                      value={colorAsAlphaTolerance}
                      onValueChange={handleToleranceChange}
                      min={0}
                      max={255}
                      step={1}
                      className="w-full"
                      disabled={!enableColorAsAlpha}
                    />
                    <p className="text-xs text-muted-foreground">
                      Higher values match similar colors (0 = exact match)
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Color Picker Overlay */}
      <ColorPickerOverlay
        isOpen={isColorPickerOpen}
        onOpenChange={setIsColorPickerOpen}
        initialColor={colorAsAlphaKey}
        onColorSelect={handleColorPickerSelect}
        title="Select Alpha Key Color"
        anchorPosition="import-media-panel"
      />
    </>
  );
}
