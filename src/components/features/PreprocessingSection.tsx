/**
 * PreprocessingSection - Collapsible section for image preprocessing controls
 * 
 * Features:
 * - Mapping algorithm selection
 * - Future: Image adjustments (brightness, contrast, etc.) before ASCII conversion
 * - Reset to defaults functionality
 */

import { useState } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Slider } from '../ui/slider';
import { Separator } from '../ui/separator';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { 
  Collapsible,
  CollapsibleContent,
} from '../ui/collapsible';
import { CollapsibleHeader } from '../common/CollapsibleHeader';
import { 
  Settings,
  RotateCcw,
  Image as ImageIcon
} from 'lucide-react';
import { 
  useCharacterPaletteStore 
} from '../../stores/characterPaletteStore';
import { useImportSettings } from '../../stores/importStore';
import { MAPPING_ALGORITHMS } from '../../utils/asciiConverter';

interface PreprocessingSectionProps {
  onSettingsChange?: () => void; // Callback for triggering preview updates
}

export function PreprocessingSection({ onSettingsChange }: PreprocessingSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Character palette store access for mapping method
  const mappingMethod = useCharacterPaletteStore(state => state.mappingMethod);
  const setMappingMethod = useCharacterPaletteStore(state => state.setMappingMethod);

  // Import settings for preprocessing filters
  const { settings, updateSettings } = useImportSettings();

  // Handle mapping method change
  const handleMappingMethodChange = (method: string) => {
    setMappingMethod(method as keyof typeof MAPPING_ALGORITHMS);
    onSettingsChange?.();
  };

  // Handle preprocessing filter changes
  const handleFilterChange = (filter: string, value: number) => {
    updateSettings({ [filter]: value });
    onSettingsChange?.();
  };

  // Reset to defaults
  const handleResetToDefaults = () => {
    setMappingMethod('brightness');
    updateSettings({
      brightness: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
      midtones: 0,
      blur: 0,
      sharpen: 0,
      saturation: 0
    });
    onSettingsChange?.();
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleHeader isOpen={isOpen}>
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <span>Pre-processing</span>
        </div>
      </CollapsibleHeader>
      
      <CollapsibleContent className="collapsible-content">
        <div className="space-y-3 w-full">
          {/* Mapping Algorithm Section */}
          <Card className="bg-card/50 border-border/50 overflow-hidden w-full">
            <CardContent className="p-3 space-y-3 w-full">
              
              {/* Header with Reset Button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="w-3 h-3 text-muted-foreground" />
                  <Label className="text-sm font-medium">Mapping Algorithm</Label>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetToDefaults}
                  className="h-6 w-6 p-0"
                  title="Reset to defaults"
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </div>

              {/* Mapping Algorithm Selection */}
              <div className="space-y-2 w-full">
                <Select value={mappingMethod} onValueChange={handleMappingMethodChange}>
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border/50">
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

            </CardContent>
          </Card>

          {/* Image Processing Filters Section */}
          <Card className="bg-card/50 border-border/50 overflow-hidden w-full">
            <CardContent className="p-3 space-y-3 w-full">
              
              {/* Header */}
              <div className="flex items-center gap-2">
                <ImageIcon className="w-3 h-3 text-muted-foreground" />
                <Label className="text-sm font-medium">Image Adjustments</Label>
              </div>

              {/* Basic Adjustments */}
              <div className="space-y-3 w-full">
                
                {/* Brightness */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Brightness</Label>
                    <span className="text-xs text-muted-foreground w-8 text-right">{settings.brightness}</span>
                  </div>
                  <Slider
                    value={settings.brightness}
                    onValueChange={(value) => handleFilterChange('brightness', value)}
                    min={-100}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Contrast */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Contrast</Label>
                    <span className="text-xs text-muted-foreground w-8 text-right">{settings.contrast}</span>
                  </div>
                  <Slider
                    value={settings.contrast}
                    onValueChange={(value) => handleFilterChange('contrast', value)}
                    min={-100}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Saturation */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Saturation</Label>
                    <span className="text-xs text-muted-foreground w-8 text-right">{settings.saturation}</span>
                  </div>
                  <Slider
                    value={settings.saturation}
                    onValueChange={(value) => handleFilterChange('saturation', value)}
                    min={-100}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <Separator className="my-2" />

                {/* Advanced Adjustments */}
                <div className="space-y-3">
                  
                  {/* Highlights */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Highlights</Label>
                      <span className="text-xs text-muted-foreground w-8 text-right">{settings.highlights}</span>
                    </div>
                    <Slider
                      value={settings.highlights}
                      onValueChange={(value) => handleFilterChange('highlights', value)}
                      min={-100}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  {/* Shadows */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Shadows</Label>
                      <span className="text-xs text-muted-foreground w-8 text-right">{settings.shadows}</span>
                    </div>
                    <Slider
                      value={settings.shadows}
                      onValueChange={(value) => handleFilterChange('shadows', value)}
                      min={-100}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  {/* Midtones */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Midtones</Label>
                      <span className="text-xs text-muted-foreground w-8 text-right">{settings.midtones}</span>
                    </div>
                    <Slider
                      value={settings.midtones}
                      onValueChange={(value) => handleFilterChange('midtones', value)}
                      min={-100}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <Separator className="my-2" />

                  {/* Blur */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Blur</Label>
                      <span className="text-xs text-muted-foreground w-8 text-right">{settings.blur}</span>
                    </div>
                    <Slider
                      value={settings.blur}
                      onValueChange={(value) => handleFilterChange('blur', value)}
                      min={0}
                      max={10}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  {/* Sharpen */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Sharpen</Label>
                      <span className="text-xs text-muted-foreground w-8 text-right">{settings.sharpen}</span>
                    </div>
                    <Slider
                      value={settings.sharpen}
                      onValueChange={(value) => handleFilterChange('sharpen', value)}
                      min={0}
                      max={10}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}