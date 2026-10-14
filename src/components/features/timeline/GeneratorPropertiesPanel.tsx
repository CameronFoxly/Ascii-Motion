/**
 * Generator Properties Panel — right-side panel for the selected generator layer.
 *
 * Mirrors EffectPropertiesPanel: every property has a keyframe toggle, edits at
 * the playhead update/auto-key tracked properties, and untracked properties
 * update the static settings. All edits record `generator_update` history.
 */

import React, { useState, useCallback } from 'react';
import { useTimelineStore } from '../../../stores/timelineStore';
import { usePaletteStore } from '../../../stores/paletteStore';
import { getGenerator } from '../../../registry/generatorRegistry';
import { resolveGeneratorSettings } from '../../../utils/generators/generatorRuntime';
import {
  withGeneratorHistory,
  bakeGeneratorLayerWithHistory,
} from '../../../utils/generators/generatorHistory';
import { Button } from '../../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';
import { Eye, EyeOff, X, Diamond, Dices } from 'lucide-react';
import { useScrubInput } from '../../../hooks/useScrubInput';
import type { EffectPropertyDefinition, EffectKeyframe } from '../../../types/effectBlock';
import type { GeneratorSource } from '../../../types/generatorLayer';
import type { LayerId } from '../../../types/timeline';

type KeyframeValue = EffectKeyframe['value'];

interface GeneratorPropertyRowProps {
  layerId: LayerId;
  source: GeneratorSource;
  definition: EffectPropertyDefinition;
  value: unknown;
  currentFrame: number;
  onChange: (value: unknown) => void;
}

function ensureLayerExpanded(layerId: LayerId): void {
  const tl = useTimelineStore.getState();
  if (!tl.view.expandedLayerIds.has(layerId)) tl.toggleLayerExpanded(layerId);
}

const GeneratorPropertyRow: React.FC<GeneratorPropertyRowProps> = ({
  layerId,
  source,
  definition,
  value,
  currentFrame,
  onChange,
}) => {
  const [localValue, setLocalValue] = useState<string>(String(value ?? definition.defaultValue));
  const [isFocused, setIsFocused] = useState(false);
  const palettes = usePaletteStore((s) => s.palettes);
  const customPalettes = usePaletteStore((s) => s.customPalettes);

  const existingTrack = source.propertyTracks.find((pt) => pt.propertyPath === definition.path);
  const existingKf = existingTrack?.keyframes.find((kf) => kf.frame === currentFrame);
  const isTracked = !!existingTrack;

  const handleKeyframeToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const tl = useTimelineStore.getState();
    const kfValue = (value ?? definition.defaultValue) as KeyframeValue;
    if (existingKf && existingTrack) {
      withGeneratorHistory(layerId, `Remove ${definition.displayName} keyframe`, () => {
        tl.removeGeneratorKeyframe(layerId, existingTrack.id, existingKf.id);
      });
      return;
    }
    withGeneratorHistory(layerId, `Add ${definition.displayName} keyframe`, () => {
      const trackId = existingTrack?.id ?? tl.addGeneratorPropertyTrack(layerId, definition.path);
      if (trackId) tl.addGeneratorKeyframe(layerId, trackId, currentFrame, kfValue);
    });
    ensureLayerExpanded(layerId);
  }, [layerId, definition, value, currentFrame, existingKf, existingTrack]);

  const scrubValue = typeof value === 'number' ? value : (definition.defaultValue as number);
  const scrub = useScrubInput({
    value: scrubValue,
    onChange: (v) => { setLocalValue(String(v)); onChange(v); },
    step: definition.step ?? 1,
    min: definition.min,
    max: definition.max,
  });

  const keyframeDiamond = (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="flex-shrink-0 p-0.5 hover:bg-muted rounded" onClick={handleKeyframeToggle}>
            <Diamond
              className={`w-3 h-3 ${
                existingKf
                  ? 'text-yellow-400 fill-yellow-400'
                  : isTracked
                    ? 'text-yellow-500'
                    : 'text-muted-foreground/40'
              }`}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">
          {existingKf
            ? 'Remove keyframe at playhead'
            : isTracked
              ? 'Add keyframe at playhead'
              : 'Add property track + keyframe'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const label = (
    <span
      className={`text-[10px] text-muted-foreground w-20 truncate flex-shrink-0 ${definition.valueType === 'number' ? 'cursor-ew-resize' : ''}`}
      onMouseDown={definition.valueType === 'number' ? scrub.onMouseDown : undefined}
      title={definition.displayName}
    >
      {definition.displayName}
    </span>
  );

  const commitValue = () => {
    if (definition.valueType === 'number') {
      const num = parseFloat(localValue);
      if (!isNaN(num)) {
        let clamped = num;
        if (definition.min !== undefined) clamped = Math.max(definition.min, clamped);
        if (definition.max !== undefined) clamped = Math.min(definition.max, clamped);
        if (definition.step !== undefined && Number.isInteger(definition.step)) clamped = Math.round(clamped);
        if (clamped !== value) onChange(clamped);
        setLocalValue(String(clamped));
        return;
      }
    } else if (definition.valueType === 'characterSet' || definition.valueType === 'string') {
      if (localValue.length > 0 && localValue !== value) onChange(localValue);
      return;
    }
    setLocalValue(String(value ?? definition.defaultValue));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitValue();
      (e.target as HTMLInputElement).blur();
    } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && definition.valueType === 'number') {
      e.preventDefault();
      const step = definition.step ?? 1;
      const current = parseFloat(localValue) || 0;
      let next = current + (e.key === 'ArrowUp' ? step : -step);
      if (definition.min !== undefined) next = Math.max(definition.min, next);
      if (definition.max !== undefined) next = Math.min(definition.max, next);
      next = Math.round(next / step) * step;
      setLocalValue(String(next));
      onChange(next);
    }
    e.stopPropagation();
  };

  if (definition.valueType === 'boolean') {
    return (
      <div className="flex items-center gap-1.5 py-0.5">
        {keyframeDiamond}
        {label}
        <button
          className="h-5 px-2 text-[10px] rounded border border-border/50 bg-background hover:bg-muted"
          onClick={() => onChange(!value)}
        >
          {value ? 'On' : 'Off'}
        </button>
      </div>
    );
  }

  if ((definition.valueType === 'select' && definition.options) || definition.valueType === 'palette') {
    const options = definition.valueType === 'palette'
      ? [...palettes, ...customPalettes].map((p) => ({ label: p.name, value: p.id }))
      : definition.options!;
    return (
      <div className="flex items-center gap-1.5 py-0.5">
        {keyframeDiamond}
        {label}
        <select
          className="h-5 text-[10px] px-1 flex-1 min-w-0 rounded border border-border/50 bg-background text-foreground outline-none"
          value={String(value ?? definition.defaultValue)}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }

  const displayValue = isFocused ? localValue : String(value ?? definition.defaultValue);
  const isText = definition.valueType === 'characterSet' || definition.valueType === 'string';

  return (
    <div className="flex items-center gap-1.5 py-0.5">
      {keyframeDiamond}
      {label}
      <input
        type="text"
        inputMode={isText ? 'text' : 'decimal'}
        value={displayValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onFocus={() => { setIsFocused(true); setLocalValue(String(value ?? definition.defaultValue)); }}
        onBlur={() => { setIsFocused(false); commitValue(); }}
        onKeyDown={handleKeyDown}
        className={`h-5 text-[10px] px-1 flex-1 min-w-0 rounded border border-border/50 bg-background text-foreground outline-none focus:ring-1 focus:ring-ring ${isText ? 'font-mono whitespace-pre' : ''}`}
      />
      {definition.unit && (
        <span className="text-[9px] text-muted-foreground/50 w-5 flex-shrink-0">{definition.unit}</span>
      )}
    </div>
  );
};

/** Start / duration fields for the generator span */
const GeneratorTimingRows: React.FC<{ layerId: LayerId; source: GeneratorSource }> = ({ layerId, source }) => {
  const update = (start: number, duration: number) => {
    withGeneratorHistory(layerId, 'Change generator timing', () => {
      useTimelineStore.getState().updateGeneratorTiming(layerId, start, duration);
    });
  };
  const field = (labelText: string, value: number, min: number, onCommit: (v: number) => void) => (
    <div className="flex items-center gap-1.5 py-0.5">
      <span className="w-4 flex-shrink-0" />
      <span className="text-[10px] text-muted-foreground w-20 truncate flex-shrink-0">{labelText}</span>
      <input
        key={`${labelText}-${value}`}
        type="text"
        inputMode="numeric"
        defaultValue={String(value)}
        onBlur={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v) && v !== value) onCommit(Math.max(min, v));
          else e.target.value = String(value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          e.stopPropagation();
        }}
        className="h-5 text-[10px] px-1 flex-1 min-w-0 rounded border border-border/50 bg-background text-foreground outline-none focus:ring-1 focus:ring-ring"
      />
      <span className="text-[9px] text-muted-foreground/50 w-5 flex-shrink-0">fr</span>
    </div>
  );
  return (
    <div className="mb-2">
      <div className="text-[9px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-0.5">Timing</div>
      {field('Start Frame', source.startFrame, 0, (v) => update(v, source.durationFrames))}
      {field('Duration', source.durationFrames, 1, (v) => update(source.startFrame, v))}
    </div>
  );
};

export const GeneratorPropertiesPanel: React.FC = () => {
  const selectedLayerId = useTimelineStore((s) => s.view.selectedGeneratorLayerId);
  const layer = useTimelineStore((s) => s.layers.find((l) => l.id === s.view.selectedGeneratorLayerId));
  const currentFrame = useTimelineStore((s) => s.view.currentFrame);
  const selectGeneratorLayer = useTimelineStore((s) => s.selectGeneratorLayer);
  // Re-render when palettes change (palette options + mapping)
  usePaletteStore((s) => s.palettes);

  if (!selectedLayerId || !layer?.generator) return null;
  const layerId = layer.id;
  const source = layer.generator;
  const entry = getGenerator(source.generatorType);
  if (!entry) return null;

  const resolved = resolveGeneratorSettings(source, currentFrame);
  const Icon = entry.icon;

  const categories = new Map<string, EffectPropertyDefinition[]>();
  for (const def of entry.propertyDefinitions) {
    if (!categories.has(def.category)) categories.set(def.category, []);
    categories.get(def.category)!.push(def);
  }

  const handleChange = (def: EffectPropertyDefinition, newValue: unknown) => {
    const tl = useTimelineStore.getState();
    const current = tl.layers.find((l) => l.id === layerId)?.generator;
    if (!current) return;
    const track = current.propertyTracks.find((pt) => pt.propertyPath === def.path);
    const kfAtFrame = track?.keyframes.find((kf) => kf.frame === currentFrame);
    withGeneratorHistory(layerId, `Update ${def.displayName}`, () => {
      if (track && kfAtFrame) {
        tl.updateGeneratorKeyframe(layerId, track.id, kfAtFrame.id, { value: newValue as KeyframeValue });
      } else if (track && track.keyframes.length > 0) {
        // Tracked property without a keyframe at the playhead — auto-key
        tl.addGeneratorKeyframe(layerId, track.id, currentFrame, newValue as KeyframeValue);
      } else {
        tl.updateGeneratorSettings(layerId, { [def.path]: newValue });
      }
    });
  };

  const hasSeed = entry.propertyDefinitions.some((d) => d.path === 'seed');

  return (
    <div className="w-56 flex-shrink-0 border-l border-border/50 bg-muted/10 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border/50 bg-muted/20">
        <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-[11px] font-medium truncate flex-1" title={layer.name}>{entry.name}</span>
        <TooltipProvider>
          {hasSeed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="p-0.5 hover:bg-muted rounded"
                  onClick={() => withGeneratorHistory(layerId, 'Randomize seed', () => {
                    useTimelineStore.getState().randomizeGeneratorSeed(layerId, currentFrame);
                  })}
                >
                  <Dices className="w-3 h-3 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">Randomize seed</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="p-0.5 hover:bg-muted rounded"
                onClick={() => withGeneratorHistory(layerId, source.enabled ? 'Disable generator' : 'Enable generator', () => {
                  useTimelineStore.getState().toggleGeneratorEnabled(layerId);
                })}
              >
                {source.enabled
                  ? <Eye className="w-3 h-3 text-muted-foreground" />
                  : <EyeOff className="w-3 h-3 text-muted-foreground/50" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">{source.enabled ? 'Disable' : 'Enable'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <button className="p-0.5 hover:bg-muted rounded" onClick={() => selectGeneratorLayer(null)}>
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        <GeneratorTimingRows layerId={layerId} source={source} />
        {[...categories.entries()].map(([category, defs]) => {
          const visibleDefs = defs.filter((def) => {
            if (!def.visibleWhen) return true;
            return def.visibleWhen.values.includes(String(resolved[def.visibleWhen.path]));
          });
          if (visibleDefs.length === 0) return null;
          return (
            <div key={category} className="mb-2">
              <div className="text-[9px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-0.5">
                {category}
              </div>
              {visibleDefs.map((def) => (
                <GeneratorPropertyRow
                  key={def.path}
                  layerId={layerId}
                  source={source}
                  definition={def}
                  value={resolved[def.path]}
                  currentFrame={currentFrame}
                  onChange={(v) => handleChange(def, v)}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-2 py-1.5 border-t border-border/50 space-y-1">
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-6 text-[10px]"
            onClick={() => bakeGeneratorLayerWithHistory(layerId)}
          >
            Bake to Frames
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[10px]"
            onClick={() => withGeneratorHistory(layerId, 'Reset generator', () => {
              useTimelineStore.getState().resetGeneratorSettings(layerId);
            })}
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
};
