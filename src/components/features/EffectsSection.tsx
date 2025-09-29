/**
 * EffectsSection - Collapsible effects section for the right panel
 * 
 * Features:
 * - Collapsible section header with effects icon
 * - Effect buttons with icons and names
 * - Timeline toggle for applying effects to entire timeline
 * - Follows MainCharacterPaletteSection patterns exactly
 */

import { useState } from 'react';
import { Button } from '../ui/button';
import { 
  Collapsible,
  CollapsibleContent,
} from '../ui/collapsible';
import { CollapsibleHeader } from '../common/CollapsibleHeader';
import { useEffectsStore } from '../../stores/effectsStore';
import { EFFECT_DEFINITIONS } from '../../constants/effectsDefaults';
import { 
  Wand2,
  BarChart3,
  Palette,
  RefreshCcw,
  Type
} from 'lucide-react';

// Icon mapping for effect buttons
const EFFECT_ICONS = {
  'BarChart3': BarChart3,
  'Palette': Palette,
  'RefreshCcw': RefreshCcw,
  'Type': Type
} as const;

interface EffectsSectionProps {
  className?: string;
}

export function EffectsSection({ className = '' }: EffectsSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const { 
    openEffectPanel, 
    isAnalyzing
  } = useEffectsStore();

  const handleEffectClick = (effectId: string) => {
    openEffectPanel(effectId as any);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleHeader isOpen={isOpen}>
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4" />
            Effects
          </div>
        </CollapsibleHeader>
        
        <CollapsibleContent className="collapsible-content">
          <div className="space-y-3">
            {/* Effect Buttons */}
            <div className="space-y-2">
              {EFFECT_DEFINITIONS.map(effect => {
                const IconComponent = EFFECT_ICONS[effect.icon as keyof typeof EFFECT_ICONS];
                
                return (
                  <Button
                    key={effect.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleEffectClick(effect.id)}
                    disabled={isAnalyzing}
                    className="w-full justify-start gap-2 h-8 text-xs"
                    title={effect.description}
                  >
                    {IconComponent && <IconComponent className="w-3 h-3" />}
                    {effect.name}
                  </Button>
                );
              })}
            </div>
            
            {/* Analysis Status */}
            {isAnalyzing && (
              <div className="text-xs text-muted-foreground animate-pulse">
                Analyzing canvas...
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}