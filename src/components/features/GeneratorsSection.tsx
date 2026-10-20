/**
 * GeneratorsSection - Collapsible generators section for the right panel
 *
 * Clicking a generator adds a procedural generator layer to the timeline.
 * Generator settings are edited (and keyframed) from the timeline's
 * generator properties panel.
 */

import { useState } from 'react';
import { Button } from '../ui/button';
import {
  Collapsible,
  CollapsibleContent,
} from '../ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { CollapsibleHeader } from '../common/CollapsibleHeader';
import { SectionHelpPopover } from '../common/SectionHelpPopover';
import { getAllGenerators } from '../../registry/generatorRegistry';
import { addGeneratorLayerWithHistory } from '../../utils/generators/generatorHistory';
import { useTimelineStore } from '../../stores/timelineStore';
import { useLayerLimit } from '../../hooks/useLayerLimit';
import { useAnimatedTextEditStore } from '../../stores/animatedTextEditStore';
import { ANIMATED_TEXT_GENERATOR_TYPE } from '../../registry/generators/animatedText';
import { Zap } from 'lucide-react';

interface GeneratorsSectionProps {
  className?: string;
}

export function GeneratorsSection({ className = '' }: GeneratorsSectionProps) {
  const [isOpen, setIsOpen] = useState(false); // Collapsed by default
  const { canAddLayer } = useLayerLimit();

  const handleGeneratorClick = (generatorType: string) => {
    const layerId = addGeneratorLayerWithHistory(generatorType);
    if (!layerId) return;
    const tl = useTimelineStore.getState();
    if (!tl.view.expandedLayerIds.has(layerId)) {
      tl.toggleLayerExpanded(layerId);
    }
    if (generatorType === ANIMATED_TEXT_GENERATOR_TYPE) {
      useAnimatedTextEditStore.getState().startEditing(layerId, { selectAll: true });
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleHeader
          isOpen={isOpen}
          accessory={
            <SectionHelpPopover title="Generators">
              <p>Generators procedurally create new animated text content on their own layer.</p>
              <p>Tweak and keyframe their settings anytime, or bake them into regular editable frames.</p>
            </SectionHelpPopover>
          }
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Generators
          </div>
        </CollapsibleHeader>

        <CollapsibleContent className="collapsible-content mt-2">
          <div className="space-y-2">
            <TooltipProvider>
              {getAllGenerators().map((generator) => {
                const IconComponent = generator.icon;
                return (
                  <Tooltip key={generator.type}>
                    <TooltipTrigger asChild>
                      {/* Wrapper keeps the tooltip working when the button is disabled */}
                      <span className="block">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGeneratorClick(generator.type)}
                          disabled={!canAddLayer}
                          className="w-full justify-start gap-2 h-8 text-xs"
                        >
                          <IconComponent className="w-3 h-3" />
                          {generator.name}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p className="text-xs">
                        {canAddLayer
                          ? generator.description
                          : 'Layer limit reached. Upgrade to Pro for unlimited layers.'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
