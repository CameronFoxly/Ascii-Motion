/**
 * EffectsPanel - Main overlay panel for effects system
 * 
 * Features:
 * - Fixed right-side overlay with slide animation
 * - Header with effect name and close button
 * - Scrollable content area for effect-specific controls
 * - Footer with Apply to Timeline toggle and Apply/Cancel buttons
 * - Follows MediaImportPanel and GradientPanel patterns exactly
 */

import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { useEffectsStore } from '../../stores/effectsStore';
import { EFFECT_DEFINITIONS } from '../../constants/effectsDefaults';
import { PANEL_ANIMATION } from '../../constants';
import { cn } from '../../lib/utils';
import {
  X,
  BarChart3,
  Palette,
  RefreshCcw,
  Type
} from 'lucide-react';

// Icon mapping for effect headers
const EFFECT_ICONS = {
  'BarChart3': BarChart3,
  'Palette': Palette,
  'RefreshCcw': RefreshCcw,
  'Type': Type
} as const;

// Parse Tailwind duration for animation timing
const parseTailwindDuration = (token: string): number | null => {
  const match = token.match(/duration-(\d+)/);
  return match ? Number(match[1]) : null;
};

interface EffectsPanelProps {
  // No props needed - uses store state
}

export function EffectsPanel({}: EffectsPanelProps) {
  const { 
    isOpen, 
    activeEffect, 
    applyToTimeline,
    setApplyToTimeline,
    closeEffectPanel,
    applyEffect,
    isAnalyzing
  } = useEffectsStore();

  const animationDurationMs = useMemo(
    () => parseTailwindDuration(PANEL_ANIMATION.DURATION) ?? 300,
    []
  );

  // Animation state to handle transitions properly (from GradientPanel pattern)
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimating, setIsAnimating] = useState(isOpen);

  // Handle panel animation states
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Trigger animation on next frame to ensure DOM is ready
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else if (shouldRender) {
      // Only start exit animation if panel was previously rendered
      setIsAnimating(false);
      // Wait for animation to complete before removing from DOM
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, animationDurationMs);
      return () => clearTimeout(timer);
    }
  }, [isOpen, shouldRender, animationDurationMs]);

  // Get current effect definition
  const currentEffectDef = activeEffect 
    ? EFFECT_DEFINITIONS.find(def => def.id === activeEffect)
    : null;

  // Get effect icon component
  const EffectIconComponent = currentEffectDef 
    ? EFFECT_ICONS[currentEffectDef.icon as keyof typeof EFFECT_ICONS]
    : null;

  // Handle apply effect
  const handleApplyEffect = async () => {
    if (!activeEffect) return;
    
    const success = await applyEffect(activeEffect);
    if (success) {
      // Panel will close automatically via store
      console.log(`${activeEffect} effect applied successfully`);
    } else {
      console.error(`Failed to apply ${activeEffect} effect`);
    }
  };

  // Don't render if panel should not be visible
  if (!shouldRender) return null;

  return (
    <div className={cn(
      "fixed inset-y-0 right-0 w-80 bg-background border-l border-border shadow-lg z-50",
      "flex flex-col overflow-hidden",
      PANEL_ANIMATION.TRANSITION,
      isAnimating ? "translate-x-0" : "translate-x-full"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h2 className="text-sm font-medium flex items-center gap-2">
          {EffectIconComponent && <EffectIconComponent className="w-3 h-3" />}
          {currentEffectDef?.name || 'Effect'}
        </h2>
        <Button
          onClick={closeEffectPanel}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      {/* Scrollable Content Area */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3" style={{ width: '296px', maxWidth: '296px' }}>
          
          {/* Effect-specific content will be rendered here */}
          {activeEffect === 'levels' && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Adjust brightness, contrast, and color ranges for your ASCII art.
              </div>
              {/* TODO: Replace with LevelsEffectPanel */}
              <div className="p-4 border border-dashed border-muted-foreground/50 rounded text-center text-sm text-muted-foreground">
                Levels controls will appear here
              </div>
            </div>
          )}
          
          {activeEffect === 'hue-saturation' && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Modify hue, saturation, and lightness of your ASCII art colors.
              </div>
              {/* TODO: Replace with HueSaturationEffectPanel */}
              <div className="p-4 border border-dashed border-muted-foreground/50 rounded text-center text-sm text-muted-foreground">
                Hue & Saturation controls will appear here
              </div>
            </div>
          )}
          
          {activeEffect === 'remap-colors' && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Replace specific colors in your ASCII art with new colors.
              </div>
              {/* TODO: Replace with RemapColorsEffectPanel */}
              <div className="p-4 border border-dashed border-muted-foreground/50 rounded text-center text-sm text-muted-foreground">
                Color remap controls will appear here
              </div>
            </div>
          )}
          
          {activeEffect === 'remap-characters' && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Replace specific characters in your ASCII art with new characters.
              </div>
              {/* TODO: Replace with RemapCharactersEffectPanel */}
              <div className="p-4 border border-dashed border-muted-foreground/50 rounded text-center text-sm text-muted-foreground">
                Character remap controls will appear here
              </div>
            </div>
          )}
          
          {/* Analysis status */}
          {isAnalyzing && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              Analyzing canvas...
            </div>
          )}
          
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border p-3 space-y-3">
        {/* Apply to Timeline Toggle */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Switch
              checked={applyToTimeline}
              onCheckedChange={setApplyToTimeline}
            />
            <span>Apply to entire timeline</span>
          </label>
        </div>
        
        <div className="text-xs text-muted-foreground">
          {applyToTimeline 
            ? 'Effect will be applied to all frames' 
            : 'Effect will be applied to current canvas only'
          }
        </div>
        
        <Separator className="-mx-3" />
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={closeEffectPanel}
            className="flex-1 h-8"
          >
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleApplyEffect}
            disabled={!activeEffect || isAnalyzing}
            className="flex-1 h-8"
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}