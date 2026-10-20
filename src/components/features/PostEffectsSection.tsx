/**
 * PostEffectsSection - Collapsible post effects section for the right panel
 *
 * Creates GPU-accelerated post-processing effect blocks on the timeline.
 * Uses the post effect registry for available shader effects.
 * Post effects default to spanning the entire timeline duration.
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
import { useTimelineStore } from '../../stores/timelineStore';
import { getAllPostEffects } from '../../registry/postEffectRegistry';
import { usePostEffectBlockHistory } from '../../hooks/usePostEffectBlockHistory';
import { Layers } from 'lucide-react';

interface PostEffectsSectionProps {
  className?: string;
}

export function PostEffectsSection({ className = '' }: PostEffectsSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const addPostEffectBlock = useTimelineStore((s) => s.addPostEffectBlock);
  const selectPostEffectBlock = useTimelineStore((s) => s.selectPostEffectBlock);
  const durationFrames = useTimelineStore((s) => s.config.durationFrames);
  const { recordAdd } = usePostEffectBlockHistory();

  const registeredPostEffects = getAllPostEffects();

  const handlePostEffectClick = (postEffectType: string) => {
    // Post effects default to filling the entire timeline
    const blockId = addPostEffectBlock(postEffectType, 0, durationFrames);
    if (blockId) {
      recordAdd(blockId);
      selectPostEffectBlock(blockId);
      // Auto-expand the post effects section in the timeline
      const tl = useTimelineStore.getState();
      if (!tl.view.postEffectsExpanded) {
        tl.togglePostEffectsExpanded();
      }
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleHeader
          isOpen={isOpen}
          accessory={
            <SectionHelpPopover title="Shaders">
              <p>Shaders are post-processing effects applied to the final rendered image.</p>
              <p>They survive React, image, and video exports, but not terminal or SVG exports.</p>
            </SectionHelpPopover>
          }
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Shaders
          </div>
        </CollapsibleHeader>

        <CollapsibleContent className="collapsible-content mt-2">
          <div className="space-y-2">
            <TooltipProvider>
              {registeredPostEffects.map((effect) => (
                <Tooltip key={effect.type}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePostEffectClick(effect.type)}
                      className="w-full justify-start gap-2 h-8 text-xs"
                    >
                      <effect.icon className="w-3 h-3" />
                      {effect.name}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p className="text-xs">{effect.description}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>

            {registeredPostEffects.length === 0 && (
              <div className="text-xs text-muted-foreground">
                No shaders registered
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
