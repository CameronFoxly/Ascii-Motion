/**
 * useCompositedCanvas Hook
 * 
 * Provides composited cell data from all visible layers for rendering.
 * The active layer reads from canvasStore (the working copy), while all
 * other layers read from timelineStore (the source of truth).
 * 
 * This hook bridges the canvasStore (drawing) and timelineStore (layers)
 * for rendering purposes.
 * 
 * Part of the Layer Timeline Refactor (Phase 2)
 * See: docs/LAYER_TIMELINE_REFACTOR_PLAN.md §2.5
 */

import { useMemo } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useTimelineStore } from '../stores/timelineStore';
import { usePaletteStore } from '../stores/paletteStore';
import { useCharacterPaletteStore } from '../stores/characterPaletteStore';
import { useAnimatedTextEditStore } from '../stores/animatedTextEditStore';
import type { Cell } from '../types';
import type { Layer } from '../types/timeline';
import {
  compositeLayersAtFrame,
  getContentFrameAtTime,
  getVisibleLayers,
} from '../utils/layerCompositing';
import { isGeneratorLayer } from '../utils/generators/generatorRuntime';

/**
 * Hook that provides composited cells from all layers for rendering.
 * 
 * Returns a getCellFunction that composites all visible layers at the current
 * frame, using canvasStore cells for the active layer (to reflect in-progress
 * drawing) and timelineStore cells for all other layers.
 * 
 * @returns Object with:
 *   - compositedCells: Map of all composited cells
 *   - getCompositedCell: Function to get a single cell at (x,y)
 *   - isLayerMode: Whether layers are active (vs legacy single-frame mode)
 *   - visibleLayerCount: Number of visible layers
 */
export function useCompositedCanvas() {
  const layers = useTimelineStore((s) => s.layers);
  const layerGroups = useTimelineStore((s) => s.layerGroups);
  const globalEffects = useTimelineStore((s) => s.globalEffects);
  const currentFrame = useTimelineStore((s) => s.view.currentFrame);
  const activeLayerId = useTimelineStore((s) => s.view.activeLayerId);
  const canvasWidth = useCanvasStore((s) => s.width);
  const canvasHeight = useCanvasStore((s) => s.height);
  const canvasCells = useCanvasStore((s) => s.cells);
  // Generator layers map intensities through palettes — re-composite on palette edits
  const palettes = usePaletteStore((s) => s.palettes);
  const customPalettes = usePaletteStore((s) => s.customPalettes);
  const characterPalettes = useCharacterPaletteStore((s) => s.availablePalettes);
  const customCharacterPalettes = useCharacterPaletteStore((s) => s.customPalettes);
  // Animated text renders without its effect while being edited
  const editingTextLayerId = useAnimatedTextEditStore((s) => s.editingLayerId);

  // Determine if we're in layer mode (have layers loaded)
  const isLayerMode = layers.length > 0;

  // Composite all layers, but substitute canvasStore cells for the active layer
  const compositedCells = useMemo(() => {
    if (!isLayerMode) {
      return canvasCells;
    }

    // Fast path: single layer with NO transforms — skip compositing entirely
    if (layers.length === 1 && layers[0].id === activeLayerId && !isGeneratorLayer(layers[0])) {
      const layer = layers[0];
      const hasTransforms = layer.propertyTracks.length > 0 ||
        Object.keys(layer.staticProperties).some(k => {
          if (k === 'transform.anchorPoint.x' || k === 'transform.anchorPoint.y') return false;
          const v = layer.staticProperties[k];
          if (k === 'transform.scale.x' || k === 'transform.scale.y') return v !== 1;
          return v !== 0;
        });
      const hasEffects = layer.effectTracks.length > 0 || globalEffects.length > 0;
      
      if (!hasTransforms && !hasEffects) {
        const activeContentFrame = getContentFrameAtTime(layer, currentFrame);
        if (activeContentFrame) {
          return canvasCells;
        }
        return new Map<string, Cell>();
      }
    }

    // Multi-layer path: build modified layers and composite
    const layersForCompositing: Layer[] = layers.map((layer) => {
      if (layer.id === activeLayerId) {
        const activeContentFrame = getContentFrameAtTime(layer, currentFrame);
        if (activeContentFrame) {
          return {
            ...layer,
            contentFrames: layer.contentFrames.map((cf) =>
              cf.id === activeContentFrame.id
                ? { ...cf, data: canvasCells }
                : cf,
            ),
          };
        }
      }
      return layer;
    });

    return compositeLayersAtFrame(
      layersForCompositing,
      currentFrame,
      canvasWidth,
      canvasHeight,
      undefined,
      false,
      layerGroups,
      globalEffects,
      { generatorEditPreview: editingTextLayerId !== null },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers, layerGroups, globalEffects, currentFrame, activeLayerId, canvasCells, canvasWidth, canvasHeight, isLayerMode, palettes, customPalettes, characterPalettes, customCharacterPalettes, editingTextLayerId]);

  // Cell getter function for the renderer
  const getCompositedCell = useMemo(() => {
    return (x: number, y: number): Cell | undefined => {
      return compositedCells.get(`${x},${y}`);
    };
  }, [compositedCells]);

  const visibleLayerCount = useMemo(() => {
    return getVisibleLayers(layers).length;
  }, [layers]);

  return {
    compositedCells,
    getCompositedCell,
    isLayerMode,
    visibleLayerCount,
  };
}
