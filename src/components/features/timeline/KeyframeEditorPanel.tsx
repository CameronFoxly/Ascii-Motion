/**
 * Keyframe Editor Panel — right-side panel for editing a selected keyframe's
 * value, frame position, and easing curve.
 *
 * Features:
 *  - Diamond keyframe icon in header
 *  - Always-visible cubic easing graph (not just for custom)
 *  - Preset buttons set graph values; dragging graph switches to custom
 *  - Editable P1/P2 text fields for manual curve entry
 *  - Copy/Paste ease between keyframes (single or multi-select)
 *  - Works for both layer and group keyframes via store fallbacks
 *
 * Part of the Layer Timeline Refactor (Phase 3, updated Phase 7)
 * See: docs/LAYER_TIMELINE_REFACTOR_PLAN.md §3.10
 */

import React, { useMemo, useState, useRef } from 'react';
import { useTimelineStore } from '../../../stores/timelineStore';
import { PROPERTY_DEFINITIONS } from '../../../types/timeline';
import { getGenerator } from '../../../registry/generatorRegistry';
import { ANIMATED_TEXT_GENERATOR_TYPE, getAnimatedTextRangeDefinition } from '../../../registry/generators/animatedText';
import { resolveGeneratorSettings } from '../../../utils/generators/generatorRuntime';
import { convertTypewriterUnits } from '../../../utils/generators/animatedTextActions';
import { EasingCurveEditor } from './EasingCurveEditor';
import { useScrubInput } from '../../../hooks/useScrubInput';
import { withGeneratorHistory, recordGeneratorChange } from '../../../utils/generators/generatorHistory';
import type { GeneratorSource } from '../../../types/generatorLayer';
import type { LayerId } from '../../../types/timeline';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Button } from '../../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';
import { X, Diamond, Copy, ClipboardPaste } from 'lucide-react';
import type { EasingCurve, Keyframe } from '../../../types/timeline';
import type { EffectPropertyDefinition } from '../../../types/effectBlock';

interface KeyframeValueDefinition {
  displayName: string;
  valueType?: EffectPropertyDefinition['valueType'];
  options?: EffectPropertyDefinition['options'];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

// Clipboard state for ease copy/paste (module-level, persists across re-renders)
let copiedEasing: EasingCurve | null = null;

export const KeyframeEditorPanel: React.FC = () => {
  const editingKeyframeId = useTimelineStore((s) => s.view.editingKeyframeId);
  const selectedKeyframeIds = useTimelineStore((s) => s.view.selectedKeyframeIds);
  const layers = useTimelineStore((s) => s.layers);
  const layerGroups = useTimelineStore((s) => s.layerGroups);
  const globalEffects = useTimelineStore((s) => s.globalEffects);
  const postEffectTracks = useTimelineStore((s) => s.postEffectTracks);
  const setEditingKeyframe = useTimelineStore((s) => s.setEditingKeyframe);
  const moveKeyframeDirect = useTimelineStore((s) => s.moveKeyframe);
  const updateKeyframeDirect = useTimelineStore((s) => s.updateKeyframe);
  const setKeyframeLoopingDirect = useTimelineStore((s) => s.setKeyframeLooping);
  const removeKeyframeDirect = useTimelineStore((s) => s.removeKeyframe);
  const clearKeyframeSelection = useTimelineStore((s) => s.clearKeyframeSelection);

  const [hasCopiedEase, setHasCopiedEase] = useState(!!copiedEasing);
  const scrubSnapshot = useRef<{ layerId: LayerId; source: GeneratorSource } | null>(null);

  const mutateWithHistory = (layerId: LayerId, description: string, mutate: () => void) => {
    if (scrubSnapshot.current) mutate();
    else withGeneratorHistory(layerId, description, mutate);
  };
  const moveKeyframe: typeof moveKeyframeDirect = (layerId, trackId, id, frame) =>
    mutateWithHistory(layerId, 'Move generator keyframe', () => moveKeyframeDirect(layerId, trackId, id, frame));
  const updateKeyframe: typeof updateKeyframeDirect = (layerId, trackId, id, updates) =>
    mutateWithHistory(layerId, 'Update generator keyframe', () => updateKeyframeDirect(layerId, trackId, id, updates));
  const removeKeyframe: typeof removeKeyframeDirect = (layerId, trackId, id) =>
    mutateWithHistory(layerId, 'Remove generator keyframe', () => removeKeyframeDirect(layerId, trackId, id));
  const setKeyframeLooping: typeof setKeyframeLoopingDirect = (layerId, trackId, looping) =>
    mutateWithHistory(layerId, 'Change generator keyframe looping', () => setKeyframeLoopingDirect(layerId, trackId, looping));

  const multiSelectCount = selectedKeyframeIds.size;

  // Find the keyframe being edited across all layers/tracks, groups, and effect blocks
  const kfData = useMemo(() => {
    if (!editingKeyframeId) return null;
    for (const layer of layers) {
      for (const track of layer.propertyTracks) {
        const kf = track.keyframes.find((k) => k.id === editingKeyframeId);
        if (kf) return { layerId: layer.id, trackId: track.id, keyframe: kf, track };
      }
      // Search effect block property tracks
      for (const et of (layer.effectTracks ?? [])) {
        for (const pt of et.effectBlock.propertyTracks) {
          const kf = pt.keyframes.find((k) => k.id === editingKeyframeId);
          if (kf) return { layerId: layer.id, trackId: pt.id as unknown as typeof layer.propertyTracks[0]['id'], keyframe: kf as unknown as typeof layer.propertyTracks[0]['keyframes'][0], track: pt as unknown as typeof layer.propertyTracks[0] };
        }
      }      // Search generator property tracks
      for (const pt of (layer.generator?.propertyTracks ?? [])) {
        const kf = pt.keyframes.find((k) => k.id === editingKeyframeId);
        if (kf) return { layerId: layer.id, trackId: pt.id as unknown as typeof layer.propertyTracks[0]['id'], keyframe: kf as unknown as typeof layer.propertyTracks[0]['keyframes'][0], track: pt as unknown as typeof layer.propertyTracks[0], generatorType: layer.generator!.generatorType };
      }
    }
    for (const group of layerGroups) {
      for (const track of group.propertyTracks) {
        const kf = track.keyframes.find((k) => k.id === editingKeyframeId);
        if (kf) {
          const proxyLayerId = group.childLayerIds[0] ?? ('' as typeof layers[0]['id']);
          return { layerId: proxyLayerId, trackId: track.id, keyframe: kf, track };
        }
      }
      // Search group effect block property tracks
      for (const et of (group.effectTracks ?? [])) {
        for (const pt of et.effectBlock.propertyTracks) {
          const kf = pt.keyframes.find((k) => k.id === editingKeyframeId);
          if (kf) {
            const proxyLayerId = group.childLayerIds[0] ?? ('' as typeof layers[0]['id']);
            return { layerId: proxyLayerId, trackId: pt.id as unknown as typeof layers[0]['propertyTracks'][0]['id'], keyframe: kf as unknown as typeof layers[0]['propertyTracks'][0]['keyframes'][0], track: pt as unknown as typeof layers[0]['propertyTracks'][0] };
          }
        }
      }
    }
    // Search global effects
    const proxyId = layers.length > 0 ? layers[0].id : ('' as typeof layers[0]['id']);
    for (const et of (globalEffects ?? [])) {
      for (const pt of et.effectBlock.propertyTracks) {
        const kf = pt.keyframes.find((k) => k.id === editingKeyframeId);
        if (kf) return { layerId: proxyId, trackId: pt.id as unknown as typeof layers[0]['propertyTracks'][0]['id'], keyframe: kf as unknown as typeof layers[0]['propertyTracks'][0]['keyframes'][0], track: pt as unknown as typeof layers[0]['propertyTracks'][0] };
      }
    }
    // Search post effects
    for (const pet of (postEffectTracks ?? [])) {
      for (const pt of pet.effectBlock.propertyTracks) {
        const kf = pt.keyframes.find((k) => k.id === editingKeyframeId);
        if (kf) return { layerId: proxyId, trackId: pt.id as unknown as typeof layers[0]['propertyTracks'][0]['id'], keyframe: kf as unknown as typeof layers[0]['propertyTracks'][0]['keyframes'][0], track: pt as unknown as typeof layers[0]['propertyTracks'][0] };
      }
    }
    return null;
  }, [editingKeyframeId, layers, layerGroups, globalEffects, postEffectTracks]);

  // All selected keyframes (for batch operations)
  const selectedKeyframeEntries = useMemo(() => {
    if (selectedKeyframeIds.size <= 1) return [];
    const entries: Array<{ layerId: typeof layers[0]['id']; trackId: typeof layers[0]['propertyTracks'][0]['id']; keyframe: typeof layers[0]['propertyTracks'][0]['keyframes'][0] }> = [];
    for (const layer of layers) {
      for (const track of layer.propertyTracks) {
        for (const kf of track.keyframes) {
          if (selectedKeyframeIds.has(kf.id)) entries.push({ layerId: layer.id, trackId: track.id, keyframe: kf });
        }
      }
    }
    for (const group of layerGroups) {
      for (const track of group.propertyTracks) {
        for (const kf of track.keyframes) {
          if (selectedKeyframeIds.has(kf.id)) {
            const proxyLayerId = group.childLayerIds[0] ?? ('' as typeof layers[0]['id']);
            entries.push({ layerId: proxyLayerId, trackId: track.id, keyframe: kf });
          }
        }
      }
    }
    // Search effect property tracks across layers, groups, global, and post effects
    const proxyId = layers.length > 0 ? layers[0].id : ('' as typeof layers[0]['id']);
    for (const layer of layers) {
      for (const pt of (layer.generator?.propertyTracks ?? [])) {
        for (const kf of pt.keyframes) {
          if (selectedKeyframeIds.has(kf.id as unknown as typeof layers[0]['propertyTracks'][0]['keyframes'][0]['id'])) {
            entries.push({ layerId: layer.id, trackId: pt.id as unknown as typeof layers[0]['propertyTracks'][0]['id'], keyframe: kf as unknown as typeof layers[0]['propertyTracks'][0]['keyframes'][0] });
          }
        }
      }
      for (const et of (layer.effectTracks ?? [])) {
        for (const pt of et.effectBlock.propertyTracks) {
          for (const kf of pt.keyframes) {
            if (selectedKeyframeIds.has(kf.id as unknown as typeof layers[0]['propertyTracks'][0]['keyframes'][0]['id'])) {
              entries.push({ layerId: layer.id, trackId: pt.id as unknown as typeof layers[0]['propertyTracks'][0]['id'], keyframe: kf as unknown as typeof layers[0]['propertyTracks'][0]['keyframes'][0] });
            }
          }
        }
      }
    }
    for (const group of layerGroups) {
      for (const et of (group.effectTracks ?? [])) {
        for (const pt of et.effectBlock.propertyTracks) {
          for (const kf of pt.keyframes) {
            if (selectedKeyframeIds.has(kf.id as unknown as typeof layers[0]['propertyTracks'][0]['keyframes'][0]['id'])) {
              const proxyLayerId = group.childLayerIds[0] ?? ('' as typeof layers[0]['id']);
              entries.push({ layerId: proxyLayerId, trackId: pt.id as unknown as typeof layers[0]['propertyTracks'][0]['id'], keyframe: kf as unknown as typeof layers[0]['propertyTracks'][0]['keyframes'][0] });
            }
          }
        }
      }
    }
    for (const et of (globalEffects ?? [])) {
      for (const pt of et.effectBlock.propertyTracks) {
        for (const kf of pt.keyframes) {
          if (selectedKeyframeIds.has(kf.id as unknown as typeof layers[0]['propertyTracks'][0]['keyframes'][0]['id'])) {
            entries.push({ layerId: proxyId, trackId: pt.id as unknown as typeof layers[0]['propertyTracks'][0]['id'], keyframe: kf as unknown as typeof layers[0]['propertyTracks'][0]['keyframes'][0] });
          }
        }
      }
    }
    for (const pet of (postEffectTracks ?? [])) {
      for (const pt of pet.effectBlock.propertyTracks) {
        for (const kf of pt.keyframes) {
          if (selectedKeyframeIds.has(kf.id as unknown as typeof layers[0]['propertyTracks'][0]['keyframes'][0]['id'])) {
            entries.push({ layerId: proxyId, trackId: pt.id as unknown as typeof layers[0]['propertyTracks'][0]['id'], keyframe: kf as unknown as typeof layers[0]['propertyTracks'][0]['keyframes'][0] });
          }
        }
      }
    }
    return entries;
  }, [selectedKeyframeIds, layers, layerGroups, globalEffects, postEffectTracks]);

  const onScrubStart = () => {
    if (!kfData) return;
    const source = useTimelineStore.getState().getLayer(kfData.layerId)?.generator;
    if (source) scrubSnapshot.current = { layerId: kfData.layerId, source };
  };
  const onScrubEnd = () => {
    const snapshot = scrubSnapshot.current;
    if (snapshot) {
      recordGeneratorChange(snapshot.layerId, 'Edit generator keyframe', snapshot.source);
      scrubSnapshot.current = null;
    }
  };

  const frameScrub = useScrubInput({
    value: kfData?.keyframe.frame ?? 0,
    onChange: (v) => {
      if (kfData) moveKeyframe(kfData.layerId, kfData.trackId, kfData.keyframe.id, Math.max(0, Math.round(v)));
    },
    step: 1,
    min: 0,
    onScrubStart,
    onScrubEnd,
  });

  const kfDef = useMemo((): KeyframeValueDefinition | undefined => {
    if (!kfData) return undefined;
    if ('generatorType' in kfData && kfData.generatorType) {
      const original = getGenerator(kfData.generatorType)?.propertyDefinitions.find((d) => d.path === kfData.track.propertyPath);
      const source = layers.find((layer) => layer.id === kfData.layerId)?.generator;
      const def = original && source?.generatorType === ANIMATED_TEXT_GENERATOR_TYPE
        ? getAnimatedTextRangeDefinition(original, resolveGeneratorSettings(source, kfData.keyframe.frame))
        : original;
      if (def) {
        return {
          displayName: def.displayName, valueType: def.valueType, options: def.options,
          min: def.min, max: def.max, step: def.step, unit: def.unit,
        };
      }
    }
    return PROPERTY_DEFINITIONS[kfData.track.propertyPath];
  }, [kfData, layers]);
  const isNumericValue = typeof kfData?.keyframe.value === 'number'
    && (kfDef?.valueType === undefined || kfDef.valueType === 'number');
  const valueScrub = useScrubInput({
    value: isNumericValue ? (kfData!.keyframe.value as number) : 0,
    onChange: (v) => {
      if (kfData) updateKeyframe(kfData.layerId, kfData.trackId, kfData.keyframe.id, { value: v });
    },
    step: kfDef?.step ?? 1,
    min: kfDef?.min,
    max: kfDef?.max,
    onScrubStart,
    onScrubEnd,
  });

  if (!kfData) return null;

  const { layerId, trackId, keyframe, track } = kfData;
  const definition = kfDef;

  const handleFrameChange = (value: string) => {
    const frame = parseInt(value, 10);
    if (!isNaN(frame) && frame >= 0) moveKeyframe(layerId, trackId, keyframe.id, frame);
  };

  const handleValueChange = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) updateKeyframe(layerId, trackId, keyframe.id, {
      value: Math.max(definition?.min ?? -Infinity, Math.min(definition?.max ?? Infinity, num)),
    });
  };

  const setValue = (value: Keyframe['value']) => {
    if ('generatorType' in kfData && kfData.generatorType === ANIMATED_TEXT_GENERATOR_TYPE &&
        layers.find((layer) => layer.id === layerId)?.generator?.propertyTracks
          .find((propertyTrack) => propertyTrack.id === String(trackId))?.propertyPath === 'typewriter.units' &&
        (value === 'percent' || value === 'index')) {
      withGeneratorHistory(layerId, 'Change typewriter units', () => convertTypewriterUnits(layerId, value, keyframe.frame));
      return;
    }
    updateKeyframe(layerId, trackId, keyframe.id, { value });
  };

  const renderValueControl = () => {
    if (isNumericValue) {
      return (
        <Input type="number" value={keyframe.value as number} onChange={(e) => handleValueChange(e.target.value)}
          className="h-6 text-xs mt-0.5" min={definition?.min} max={definition?.max} step={definition?.step ?? 1} />
      );
    }
    if (definition?.valueType === 'boolean' || typeof keyframe.value === 'boolean') {
      return (
        <div className="h-6 mt-0.5 flex items-center">
          <Switch checked={keyframe.value === true} onCheckedChange={setValue} className="scale-[0.6]" />
        </div>
      );
    }
    if (definition?.valueType === 'select' && definition.options?.length) {
      return (
        <Select value={String(keyframe.value)} onValueChange={setValue}>
          <SelectTrigger className="h-6 text-xs mt-0.5"><SelectValue /></SelectTrigger>
          <SelectContent>
            {definition.options.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    if (definition?.valueType === 'color') {
      return (
        <Input type="color" value={String(keyframe.value)} onChange={(e) => setValue(e.target.value)}
          className="h-6 mt-0.5 p-0.5" />
      );
    }
    // Palette, character set, and other non-numeric values are edited from the generator panel
    return (
      <Input value={String(keyframe.value)} readOnly disabled title={String(keyframe.value)}
        className="h-6 text-xs mt-0.5" />
    );
  };

  const handleEasingChange = (easing: EasingCurve) => {
    if (selectedKeyframeEntries.length > 1) {
      for (const entry of selectedKeyframeEntries) {
        updateKeyframe(entry.layerId, entry.trackId, entry.keyframe.id, { easing });
      }
    } else {
      updateKeyframe(layerId, trackId, keyframe.id, { easing });
    }
  };

  const handleDelete = () => {
    if (selectedKeyframeEntries.length > 1) {
      for (const entry of selectedKeyframeEntries) {
        removeKeyframe(entry.layerId, entry.trackId, entry.keyframe.id);
      }
      clearKeyframeSelection();
    } else {
      removeKeyframe(layerId, trackId, keyframe.id);
      setEditingKeyframe(null);
    }
  };

  const handleCopyEase = () => {
    copiedEasing = { ...keyframe.easing };
    if (copiedEasing.type === 'custom') {
      copiedEasing = { type: 'custom', x1: copiedEasing.x1, y1: copiedEasing.y1, x2: copiedEasing.x2, y2: copiedEasing.y2 };
    }
    setHasCopiedEase(true);
  };

  const handlePasteEase = () => {
    if (!copiedEasing) return;
    handleEasingChange({ ...copiedEasing });
  };

  return (
    <div className="w-52 flex-shrink-0 border-l border-border/50 bg-muted/20 overflow-y-auto">
      {/* Header with diamond icon */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50">
        <div className="flex items-center gap-1.5 min-w-0">
          <Diamond className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />
          <span className="text-xs font-medium truncate">
            {definition?.displayName ?? track.propertyPath}
          </span>
          {multiSelectCount > 1 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500 tabular-nums flex-shrink-0">
              {multiSelectCount}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setEditingKeyframe(null)}>
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="p-2 space-y-2">
        {/* Frame + Value */}
        <div className="flex gap-1.5">
          <div className="flex-1">
            <Label className="text-[10px] text-muted-foreground cursor-ew-resize" onMouseDown={frameScrub.onMouseDown}>Frame</Label>
            <Input type="number" value={keyframe.frame} onChange={(e) => handleFrameChange(e.target.value)}
              className="h-6 text-xs mt-0.5" min={0} />
          </div>
          <div className="flex-1">
            <Label
              className={`text-[10px] text-muted-foreground${isNumericValue ? ' cursor-ew-resize' : ''}`}
              onMouseDown={isNumericValue ? valueScrub.onMouseDown : undefined}
            >
              Value{isNumericValue && definition?.unit ? ` (${definition.unit})` : ''}
            </Label>
            {renderValueControl()}
          </div>
        </div>

        {/* Easing — always-visible graph + presets + editable fields */}
        <div>
          <Label className="text-[10px] text-muted-foreground">Easing</Label>
          <div className="mt-0.5">
            <EasingCurveEditor value={keyframe.easing} onChange={handleEasingChange} />
          </div>
        </div>

        {/* Copy/Paste Ease buttons */}
        <TooltipProvider>
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 h-6 text-[10px] gap-1" onClick={handleCopyEase}>
                  <Copy className="w-3 h-3" />
                  Copy Ease
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Copy easing curve to clipboard</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 h-6 text-[10px] gap-1"
                  onClick={handlePasteEase} disabled={!hasCopiedEase}>
                  <ClipboardPaste className="w-3 h-3" />
                  Paste Ease
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {hasCopiedEase
                  ? `Paste easing to ${multiSelectCount > 1 ? `${multiSelectCount} keyframes` : 'keyframe'}`
                  : 'No easing copied yet'}
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {/* Loop + Delete row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <Switch
              checked={track.loopKeyframes}
              onCheckedChange={(loop) => setKeyframeLooping(layerId, trackId, loop)}
              className="scale-[0.6]"
            />
            <Label className="text-[10px] text-muted-foreground">Loop</Label>
          </div>
          <Button variant="ghost" size="sm"
            className="h-5 text-[10px] px-1.5 text-destructive hover:text-destructive"
            onClick={handleDelete}>
            Delete{multiSelectCount > 1 ? ` (${multiSelectCount})` : ''}
          </Button>
        </div>
      </div>
    </div>
  );
};
