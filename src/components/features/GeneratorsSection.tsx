/**
 * GeneratorsSection - Collapsible generators section for the right panel
 * 
 * Features:
 * - Collapsible section header with generators icon
 * - Generator buttons with icons and names
 * - Defaults to collapsed state
 * - Opens generator panel and starts preview on click
 */

import { useState } from 'react';
import { Button } from '../ui/button';
import { 
  Collapsible,
  CollapsibleContent,
} from '../ui/collapsible';
import { CollapsibleHeader } from '../common/CollapsibleHeader';
import { useGeneratorActions } from '../../stores/generatorsStore';
import { GENERATOR_DEFINITIONS } from '../../constants/generators';
import type { GeneratorId } from '../../types/generators';
import { 
  Zap,
  Radio,
  Wind,
  Sparkles,
  Droplets,
  CloudHail
} from 'lucide-react';

// Icon mapping for generator buttons
const GENERATOR_ICONS = {
  'Radio': Radio,
  'Wind': Wind,
  'Sparkles': Sparkles,
  'Droplets': Droplets,
  'CloudHail': CloudHail
} as const;

interface GeneratorsSectionProps {
  className?: string;
}

export function GeneratorsSection({ className = '' }: GeneratorsSectionProps) {
  const [isOpen, setIsOpen] = useState(false); // Collapsed by default
  
  const { openGenerator, isGenerating } = useGeneratorActions();

  const handleGeneratorClick = (generatorId: GeneratorId) => {
    openGenerator(generatorId);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleHeader isOpen={isOpen}>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Generators
          </div>
        </CollapsibleHeader>
        
        <CollapsibleContent className="collapsible-content mt-2">
          <div className="space-y-3">
            {/* Generator Buttons */}
            <div className="space-y-2">
              {GENERATOR_DEFINITIONS.map(generator => {
                const IconComponent = GENERATOR_ICONS[generator.icon as keyof typeof GENERATOR_ICONS];
                
                return (
                  <Button
                    key={generator.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleGeneratorClick(generator.id)}
                    disabled={isGenerating}
                    className="w-full justify-start gap-2 h-8 text-xs"
                    title={generator.description}
                  >
                    {IconComponent && <IconComponent className="w-3 h-3" />}
                    {generator.name}
                  </Button>
                );
              })}
            </div>
            
            {/* Generating Status */}
            {isGenerating && (
              <div className="text-xs text-muted-foreground animate-pulse">
                Generating preview...
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
