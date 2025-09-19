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
  RotateCcw
} from 'lucide-react';
import { 
  useCharacterPaletteStore 
} from '../../stores/characterPaletteStore';
import { MAPPING_ALGORITHMS } from '../../utils/asciiConverter';

interface PreprocessingSectionProps {
  onSettingsChange?: () => void; // Callback for triggering preview updates
}

export function PreprocessingSection({ onSettingsChange }: PreprocessingSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Character palette store access for mapping method
  const mappingMethod = useCharacterPaletteStore(state => state.mappingMethod);
  const setMappingMethod = useCharacterPaletteStore(state => state.setMappingMethod);

  // Handle mapping method change
  const handleMappingMethodChange = (method: string) => {
    setMappingMethod(method as keyof typeof MAPPING_ALGORITHMS);
    onSettingsChange?.();
  };

  // Reset to defaults
  const handleResetToDefaults = () => {
    setMappingMethod('brightness');
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
          <Card className="bg-card/50 border-border/50 overflow-hidden w-full">
            <CardContent className="p-3 space-y-3 w-full">
              
              {/* Header with Reset Button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Image Processing</Label>
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

              {/* Mapping Algorithm */}
              <div className="space-y-2 w-full">
                <Label className="text-xs font-medium">Mapping Algorithm</Label>
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
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}