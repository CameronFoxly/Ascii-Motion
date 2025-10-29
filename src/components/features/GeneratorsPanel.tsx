/**
 * GeneratorsPanel - Side panel overlay for procedural animation generation
 * 
 * Features:
 * - Overlays existing side panel while keeping canvas visible
 * - Animation and Mapping tabs
 * - Live preview playback with frame scrubbing
 * - Output mode selection (append/overwrite)
 * - Generator-specific settings per tab
 */

import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  X,
  Radio,
  Wind,
  Sparkles,
  Droplets,
  Wand2,
  Palette as PaletteIcon
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { PANEL_ANIMATION } from '../../constants';
import { useGeneratorPanel, useGeneratorUIState, useGeneratorsStore } from '../../stores/generatorsStore';
import { GENERATOR_DEFINITIONS } from '../../constants/generators';
import { GeneratorPreviewCanvas } from './preview/GeneratorPreviewCanvas';
import { RadioWavesSettings } from './generators/RadioWavesSettings';
import { TurbulentNoiseSettings } from './generators/TurbulentNoiseSettings';
import { ParticlePhysicsSettings } from './generators/ParticlePhysicsSettings';
import { RainDropsSettings } from './generators/RainDropsSettings';
import { GeneratorsMappingTab } from './generators/GeneratorsMappingTab';
import { useGeneratorPreview } from '../../hooks/useGeneratorPreview';

// Icon mapping for generator headers
const GENERATOR_ICONS = {
  'radio-waves': Radio,
  'turbulent-noise': Wind,
  'particle-physics': Sparkles,
  'rain-drops': Droplets
} as const;

// Parse Tailwind duration for animation timing
const parseTailwindDuration = (token: string): number | null => {
  const match = token.match(/duration-(\d+)/);
  return match ? Number(match[1]) : null;
};

export function GeneratorsPanel() {
  const { isOpen, activeGenerator, closeGenerator } = useGeneratorPanel();
  const { uiState, setActiveTab, outputMode, setOutputMode } = useGeneratorUIState();
  const { isGenerating, totalPreviewFrames, applyGenerator } = useGeneratorsStore();
  const previewControls = useGeneratorPreview();

  const animationDurationMs = useMemo(
    () => parseTailwindDuration(PANEL_ANIMATION.DURATION) ?? 300,
    []
  );

  // Animation state to handle transitions properly (from EffectsPanel pattern)
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimating, setIsAnimating] = useState(isOpen);

  // Handle panel animation states
  useEffect(() => {
    if (isOpen) {
      if (!shouldRender) {
        setShouldRender(true);
      }

      // Use double rAF to guarantee the enter transition after initial paint
      let rafId: number | null = null;
      let rafId2: number | null = null;

      if (!isAnimating) {
        rafId = requestAnimationFrame(() => {
          rafId2 = requestAnimationFrame(() => {
            setIsAnimating(true);
          });
        });
      }

      return () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        if (rafId2 !== null) cancelAnimationFrame(rafId2);
      };
    } else if (shouldRender) {
      // Only start exit animation if panel was previously rendered
      setIsAnimating(false);
      // Wait for animation to complete before removing from DOM
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, animationDurationMs);
      return () => clearTimeout(timer);
    }
  }, [isOpen, shouldRender, isAnimating, animationDurationMs]);

  // Don't render if panel should not be visible
  if (!shouldRender) return null;

  const generatorDef = GENERATOR_DEFINITIONS.find(g => g.id === activeGenerator);
  const IconComponent = generatorDef ? GENERATOR_ICONS[generatorDef.id] : Wand2;

  const handleClose = () => {
    closeGenerator();
  };

  return (
    <div className={cn(
      "fixed inset-y-0 right-0 w-80 bg-background border-l border-border shadow-lg z-[100]",
      "flex flex-col overflow-hidden",
      PANEL_ANIMATION.TRANSITION,
      isAnimating ? "translate-x-0" : "translate-x-full"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <IconComponent className="w-3 h-3" />
          {generatorDef?.name || 'Generator'}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="h-6 w-6 p-0"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs 
        value={uiState.activeTab} 
        onValueChange={(tab) => setActiveTab(tab as 'animation' | 'mapping')}
        className="flex flex-col flex-1 overflow-hidden"
      >
        <div className="border-b border-border px-3">
          <TabsList className="grid w-full grid-cols-2 h-9">
            <TabsTrigger value="animation" className="text-xs">
              <Wand2 className="w-3 h-3 mr-1.5" />
              Animation
            </TabsTrigger>
            <TabsTrigger value="mapping" className="text-xs">
              <PaletteIcon className="w-3 h-3 mr-1.5" />
              Mapping
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <TabsContent value="animation" className="p-3 space-y-4 mt-0">
            {/* Preview Canvas */}
            <GeneratorPreviewCanvas {...previewControls} />
            
            {/* Generator-Specific Settings */}
            {activeGenerator === 'radio-waves' && <RadioWavesSettings />}
            {activeGenerator === 'turbulent-noise' && <TurbulentNoiseSettings />}
            {activeGenerator === 'particle-physics' && <ParticlePhysicsSettings />}
            {activeGenerator === 'rain-drops' && <RainDropsSettings />}
          </TabsContent>

          <TabsContent value="mapping" className="p-3 space-y-3 mt-0">
            <GeneratorsMappingTab />
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Footer */}
      <div className="border-t border-border p-3 space-y-3">
        {/* Output Mode Selection */}
        <div className="space-y-2">
          <div className="text-xs font-medium">Output Mode</div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={outputMode === 'overwrite' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setOutputMode('overwrite')}
              className="h-8 text-xs"
            >
              Overwrite
            </Button>
            <Button
              variant={outputMode === 'append' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setOutputMode('append')}
              className="h-8 text-xs"
            >
              Append
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            {outputMode === 'overwrite' 
              ? 'Replace frames starting from current frame'
              : 'Add frames after the last existing frame'
            }
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            className="flex-1 h-8 text-xs"
          >
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={isGenerating || totalPreviewFrames === 0}
            onClick={applyGenerator}
            className="flex-1 h-8 text-xs"
          >
            {outputMode === 'overwrite' ? 'Apply to Canvas' : 'Generate Animation'}
          </Button>
        </div>
      </div>
    </div>
  );
}
