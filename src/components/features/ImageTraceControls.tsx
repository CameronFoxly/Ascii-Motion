/**
 * ImageTraceControls
 * 
 * Popover dropdown UI for the Image Trace overlay feature.
 * Rendered as a portal (like the typography dropdown) with all controls inline.
 * 
 * Controls:
 * - File upload (image/video)
 * - Enable/disable toggle
 * - Opacity slider
 * - Render order toggle (behind/in front)
 * - Position X/Y inputs
 * - Scale slider + fit-to-canvas button
 * - Video frame offset (slider + input, video-only)
 * - Clear/remove button
 */

import React, { useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Upload, Trash2, Maximize2, Film, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useImageTraceStore } from '@/stores/imageTraceStore';
import { useCanvasStore } from '@/stores/canvasStore';
import { useCanvasContext } from '@/contexts/CanvasContext';
import { useScrubInput } from '@/hooks/useScrubInput';
import {
  classifyTraceFile,
  getTraceFileAcceptString,
  processTraceImage,
  processTraceVideo,
} from '@/utils/imageTraceProcessor';

export const ImageTraceControls: React.FC = () => {
  const {
    enabled,
    source,
    opacity,
    renderOrder,
    frameOffset,
    position,
    scale,
    isLoading,
    loadError,
    setSource,
    clearSource,
    setOpacity,
    setRenderOrder,
    setFrameOffset,
    setPosition,
    setScale,
    fitToCanvas,
    toggle,
    setLoadError,
  } = useImageTraceStore();

  const canvasWidth = useCanvasStore((s) => s.width);
  const canvasHeight = useCanvasStore((s) => s.height);
  const { fontSize, characterSpacing, lineSpacing } = useCanvasContext();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate pixel dimensions for fit-to-canvas
  const getCanvasPixelDimensions = useCallback(() => {
    const cellWidth = fontSize * 0.6 * characterSpacing;
    const cellHeight = fontSize * lineSpacing;
    return {
      width: canvasWidth * cellWidth,
      height: canvasHeight * cellHeight,
    };
  }, [canvasWidth, canvasHeight, fontSize, characterSpacing, lineSpacing]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = classifyTraceFile(file);
    if (!fileType) {
      setLoadError('Unsupported file format');
      return;
    }

    // Clear existing source and enter loading state atomically
    // (single set() call prevents a flash of non-loading UI)
    useImageTraceStore.setState({
      source: null,
      enabled: false,
      isLoading: true,
      loadError: null,
      frameOffset: 0,
      position: { x: 0, y: 0 },
      scale: 1.0,
    });

    try {
      const result = fileType === 'image'
        ? await processTraceImage(file)
        : await processTraceVideo(file);
      setSource(result);
      // Auto fit-to-canvas on load
      const dims = getCanvasPixelDimensions();
      fitToCanvas(dims.width, dims.height);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load file');
    }

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [setSource, setLoadError, fitToCanvas, getCanvasPixelDimensions]);

  const handleFitToCanvas = useCallback(() => {
    const dims = getCanvasPixelDimensions();
    fitToCanvas(dims.width, dims.height);
  }, [fitToCanvas, getCanvasPixelDimensions]);

  // Drag-to-scrub for position X/Y (matches LayerPropertiesPanel pattern)
  const scrubX = useScrubInput({
    value: position.x,
    onChange: (v) => setPosition(v, position.y),
    step: 1,
  });
  const scrubY = useScrubInput({
    value: position.y,
    onChange: (v) => setPosition(position.x, v),
    step: 1,
  });

  return (
    <div className="space-y-3" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      {/* Single persistent file input (always in DOM so ref stays valid during replace) */}
      <input
        ref={fileInputRef}
        type="file"
        accept={getTraceFileAcceptString()}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* File Upload */}
      {!source ? (
        <div className="flex flex-col items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="w-full h-8 text-xs gap-1.5"
          >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            {isLoading ? 'Loading...' : 'Upload Image or Video'}
          </Button>
          {loadError && (
            <p className="text-xs text-destructive">{loadError}</p>
          )}
        </div>
      ) : (
        <>
          {/* Source info + Enable toggle */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {source.type === 'image' ? (
                <ImageIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              ) : (
                <Film className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              )}
              <span className="text-xs text-muted-foreground truncate">{source.name}</span>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={() => toggle()}
              aria-label="Toggle image trace"
            />
          </div>

          {/* Opacity */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Opacity: {Math.round(opacity * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={Math.round(opacity * 100)}
              onChange={(e) => setOpacity(parseInt(e.target.value) / 100)}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Render Order */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Render Order
            </label>
            <div className="flex gap-1">
              <Button
                variant={renderOrder === 'behind' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRenderOrder('behind')}
                className="flex-1 h-7 text-xs"
              >
                Behind
              </Button>
              <Button
                variant={renderOrder === 'inFront' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRenderOrder('inFront')}
                className="flex-1 h-7 text-xs"
              >
                In Front
              </Button>
            </div>
          </div>

          {/* Position */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Position
            </label>
            <div className="flex gap-2 items-center">
              <div className="flex items-center gap-1">
                <span
                  className="text-xs text-muted-foreground w-3 cursor-ew-resize select-none"
                  onMouseDown={scrubX.onMouseDown}
                >X</span>
                <input
                  type="number"
                  value={position.x}
                  onChange={(e) => setPosition(parseInt(e.target.value) || 0, position.y)}
                  className="w-16 h-6 text-xs text-center border border-border rounded bg-background text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="flex items-center gap-1">
                <span
                  className="text-xs text-muted-foreground w-3 cursor-ew-resize select-none"
                  onMouseDown={scrubY.onMouseDown}
                >Y</span>
                <input
                  type="number"
                  value={position.y}
                  onChange={(e) => setPosition(position.x, parseInt(e.target.value) || 0)}
                  className="w-16 h-6 text-xs text-center border border-border rounded bg-background text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
          </div>

          {/* Scale + Fit to Canvas */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Scale: {Math.round(scale * 100)}%
              </label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFitToCanvas}
                    className="h-5 px-1.5 text-[10px] gap-1"
                  >
                    <Maximize2 className="w-2.5 h-2.5" />
                    Fit
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Fit to canvas</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <input
              type="range"
              min="10"
              max="500"
              step="1"
              value={Math.round(scale * 100)}
              onChange={(e) => setScale(parseInt(e.target.value) / 100)}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>10%</span>
              <span>100%</span>
              <span>500%</span>
            </div>
          </div>

          {/* Video Frame Offset (video-only) */}
          {source.type === 'video' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Frame Offset: {frameOffset}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={-(source.totalVideoFrames - 1)}
                  max={Math.max(0, source.totalVideoFrames - 1)}
                  step="1"
                  value={frameOffset}
                  onChange={(e) => setFrameOffset(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                />
                <input
                  type="number"
                  min={-(source.totalVideoFrames - 1)}
                  max={Math.max(0, source.totalVideoFrames - 1)}
                  value={frameOffset}
                  onChange={(e) => setFrameOffset(parseInt(e.target.value) || 0)}
                  className="w-14 h-6 text-xs text-center border border-border rounded bg-background text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {source.totalVideoFrames} frames @ {Math.round(source.videoFps * 100) / 100} fps
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 border-t border-border flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 h-7 text-xs gap-1"
            >
              <Upload className="w-3 h-3" />
              Replace
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearSource}
              className="flex-1 h-7 text-xs text-destructive hover:text-destructive gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Remove
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
