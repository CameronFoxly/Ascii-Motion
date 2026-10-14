/**
 * Generator Properties Panel — right-side panel for the selected generator layer.
 *
 * Mirrors EffectPropertiesPanel: every property has a keyframe toggle, edits at
 * the playhead update/auto-key tracked properties, and untracked properties
 * update the static settings. All edits record `generator_update` history.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTimelineStore } from '../../../stores/timelineStore';
import { usePaletteStore } from '../../../stores/paletteStore';
import { useCharacterPaletteStore } from '../../../stores/characterPaletteStore';
import { PaletteEditorDialog } from '../PaletteEditorDialog';
import { getGenerator } from '../../../registry/generatorRegistry';
import { resolveGeneratorSettings, toCharacterArray } from '../../../utils/generators/generatorRuntime';
import {
  withGeneratorHistory,
  bakeGeneratorLayerWithHistory,
  recordGeneratorChange,
  setGeneratorValueAtFrame,
} from '../../../utils/generators/generatorHistory';
import { ANIMATED_TEXT_GENERATOR_TYPE } from '../../../registry/generators/animatedText';
import { applyTypewriterDefaultKeyframes } from '../../../utils/generators/animatedTextActions';
import { ColorPickerOverlay } from '../ColorPickerOverlay';
import { Button } from '../../ui/button';
import { Slider } from '../../ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';
import { Eye, EyeOff, X, Diamond, Dices, Pencil } from 'lucide-react';
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
  onChange: (value: unknown, recordHistory?: boolean) => void;
}

function ensureLayerExpanded(layerId: LayerId): void {
  const tl = useTimelineStore.getState();
  if (!tl.view.expandedLayerIds.has(layerId)) tl.toggleLayerExpanded(layerId);
}

function GeneratorSlider({
  layerId, definition, value, onChange,
}: Pick<GeneratorPropertyRowProps, 'layerId' | 'definition' | 'onChange'> & { value: number }) {
  const before = useRef<GeneratorSource | null>(null);
  const finish = useCallback(() => {
    if (!before.current) return;
    recordGeneratorChange(layerId, `Update ${definition.displayName}`, before.current);
    before.current = null;
  }, [layerId, definition.displayName]);

  useEffect(() => {
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    return () => {
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      finish();
    };
  }, [finish]);

  return (
    <Slider
      aria-label={definition.displayName}
      value={value}
      min={definition.min}
      max={definition.max}
      step={definition.step}
      className="h-1 flex-1 min-w-0"
      onValueChange={(next) => {
        before.current ??= useTimelineStore.getState().getLayer(layerId)?.generator ?? null;
        onChange(next, false);
      }}
      onKeyDown={(event) => event.stopPropagation()}
      onKeyUp={finish}
      onBlur={finish}
    />
  );
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
  const [isPaletteDialogOpen, setIsPaletteDialogOpen] = useState(false);
  const scrubSource = useRef<GeneratorSource | null>(null);
  const palettes = usePaletteStore((s) => s.palettes);
  const customPalettes = usePaletteStore((s) => s.customPalettes);
  const characterPalettes = useCharacterPaletteStore((s) => s.availablePalettes);
  const customCharacterPalettes = useCharacterPaletteStore((s) => s.customPalettes);

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
    onChange: (v) => { setLocalValue(String(v)); onChange(v, false); },
    onScrubStart: () => {
      scrubSource.current = useTimelineStore.getState().getLayer(layerId)?.generator ?? null;
    },
    onScrubEnd: () => {
      if (scrubSource.current) {
        recordGeneratorChange(layerId, `Update ${definition.displayName}`, scrubSource.current);
        scrubSource.current = null;
      }
    },
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

  if (definition.valueType === 'palette') {
    const isCharacterPalette = definition.path === 'mapping.characterPaletteId';
    const paletteId = String(value ?? definition.defaultValue);
    const palette = (isCharacterPalette
      ? [...characterPalettes, ...customCharacterPalettes]
      : [...palettes, ...customPalettes]).find((p) => p.id === paletteId);
    const openEditor = () => {
      if (isCharacterPalette && !paletteId) {
        const characters = toCharacterArray(resolveGeneratorSettings(source, currentFrame)['mapping.characterSet']);
        const matching = [...characterPalettes, ...customCharacterPalettes]
          .find((p) => JSON.stringify(p.characters) === JSON.stringify(characters));
        const selected = matching ?? useCharacterPaletteStore.getState().createCustomPalette('Generator Characters', characters);
        onChange(selected.id);
      }
      setIsPaletteDialogOpen(true);
    };
    return (
      <div className="flex items-center gap-1.5 py-0.5">
        {keyframeDiamond}
        {label}
        <button
          className="h-6 px-1.5 flex-1 min-w-0 flex items-center gap-1 rounded border border-border/50 bg-background hover:bg-muted text-[10px]"
          onClick={openEditor}
          aria-label={`Edit ${definition.displayName}`}
          title={`Choose or edit ${definition.displayName.toLowerCase()}`}
        >
          <span className="truncate flex-1 text-left">{palette?.name ?? (paletteId ? 'Unavailable palette' : 'Custom characters')}</span>
          <Pencil className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
        </button>
        {isPaletteDialogOpen && (
          <PaletteEditorDialog
            open
            onOpenChange={setIsPaletteDialogOpen}
            kind={isCharacterPalette ? 'character' : 'color'}
            paletteId={paletteId}
            onPaletteChange={onChange}
            title={definition.displayName}
          />
        )}
      </div>
    );
  }

  if (definition.valueType === 'number' && definition.control === 'slider') {
    return (
      <div className="flex items-center gap-1.5 py-0.5">
        {keyframeDiamond}
        {label}
        <GeneratorSlider layerId={layerId} definition={definition} value={scrubValue} onChange={onChange} />
        <span className="text-[9px] text-muted-foreground w-8 text-right flex-shrink-0">
          {scrubValue}{definition.unit}
        </span>
      </div>
    );
  }

  if (definition.valueType === 'color') {
    return (
      <GeneratorColorRow
        layerId={layerId}
        definition={definition}
        value={typeof value === 'string' ? value : String(definition.defaultValue)}
        onChange={onChange}
        keyframeDiamond={keyframeDiamond}
        label={label}
      />
    );
  }

  if (definition.valueType === 'string' && definition.control === 'multiline') {
    const textValue = isFocused ? localValue : String(value ?? definition.defaultValue);
    return (
      <div className="py-0.5">
        <div className="flex items-center gap-1.5">
          {keyframeDiamond}
          {label}
        </div>
        <textarea
          aria-label={definition.displayName}
          value={textValue}
          rows={Math.min(6, Math.max(2, textValue.split('\n').length))}
          onChange={(e) => setLocalValue(e.target.value)}
          onFocus={() => { setIsFocused(true); setLocalValue(String(value ?? definition.defaultValue)); }}
          onBlur={() => {
            setIsFocused(false);
            if (localValue !== value) onChange(localValue);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur();
            e.stopPropagation();
          }}
          className="mt-0.5 w-full text-[10px] px-1 py-0.5 rounded border border-border/50 bg-background text-foreground outline-none focus:ring-1 focus:ring-ring font-mono resize-y whitespace-pre"
        />
      </div>
    );
  }

  if (definition.valueType === 'select' && definition.options) {
    const options = definition.options;
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

const CHECKERBOARD = 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)';

/** Color swatch row; live picker changes are grouped into one history entry */
function GeneratorColorRow({
  layerId, definition, value, onChange, keyframeDiamond, label,
}: {
  layerId: LayerId;
  definition: EffectPropertyDefinition;
  value: string;
  onChange: (value: unknown, recordHistory?: boolean) => void;
  keyframeDiamond: React.ReactNode;
  label: React.ReactNode;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const swatchRef = useRef<HTMLDivElement>(null);
  const before = useRef<{ source: GeneratorSource; value: string } | null>(null);
  const isTransparent = value === 'transparent';

  const open = (next: boolean) => {
    if (next && !before.current) {
      const source = useTimelineStore.getState().getLayer(layerId)?.generator;
      if (source) before.current = { source, value };
    }
    setPickerOpen(next);
  };
  const finish = () => {
    if (before.current) recordGeneratorChange(layerId, `Update ${definition.displayName}`, before.current.source);
    before.current = null;
  };

  return (
    <div className="flex items-center gap-1.5 py-0.5">
      {keyframeDiamond}
      {label}
      <div
        ref={swatchRef}
        role="button"
        aria-label={`Edit ${definition.displayName}`}
        className="w-5 h-5 rounded border border-border/50 cursor-pointer hover:ring-1 hover:ring-primary flex-shrink-0"
        style={isTransparent
          ? { backgroundImage: CHECKERBOARD, backgroundSize: '6px 6px', backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px' }
          : { backgroundColor: value }}
        title={value}
        onClick={() => open(!pickerOpen)}
      />
      <span className="text-[10px] text-muted-foreground/60 flex-1 min-w-0 truncate select-none">{value}</span>
      <ColorPickerOverlay
        isOpen={pickerOpen}
        onOpenChange={(next) => { open(next); if (!next) finish(); }}
        onColorSelect={(color) => { onChange(color, false); finish(); setPickerOpen(false); }}
        onColorChange={(color) => onChange(color, false)}
        onCancel={() => {
          if (before.current) onChange(before.current.value, false);
          before.current = null;
        }}
        initialColor={isTransparent || /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
        showTransparentOption
        triggerRef={swatchRef as React.RefObject<HTMLElement | null>}
        anchorPosition="bottom-left"
      />
    </div>
  );
}

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

  const handleChange = (def: EffectPropertyDefinition, newValue: unknown, recordHistory = true) => {
    const current = useTimelineStore.getState().layers.find((l) => l.id === layerId)?.generator;
    if (!current) return;
    if (resolveGeneratorSettings(current, currentFrame)[def.path] === newValue) return;
    const mutate = () => {
      setGeneratorValueAtFrame(layerId, def.path, newValue as KeyframeValue, currentFrame);
      if (source.generatorType === ANIMATED_TEXT_GENERATOR_TYPE && def.path === 'effect' && newValue === 'typewriter') {
        applyTypewriterDefaultKeyframes(layerId);
      }
    };
    if (recordHistory) withGeneratorHistory(layerId, `Update ${def.displayName}`, mutate);
    else mutate();
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
            if (def.path === 'mapping.characterSet') return false;
            const conditions = [
              ...(def.visibleWhen ? [def.visibleWhen] : []),
              ...(def.visibleWhenAll ?? []),
            ];
            return conditions.every((c) => c.values.includes(String(resolved[c.path])));
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
                  onChange={(v, recordHistory) => handleChange(def, v, recordHistory)}
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
