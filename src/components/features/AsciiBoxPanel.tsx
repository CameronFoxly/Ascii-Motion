/**
 * AsciiBoxPanel - Side panel overlay for configuring the ASCII Box Drawing tool.
 *
 * Features:
 * - Box style selection with visual preview grid
 * - Navigation buttons (< and >) to cycle through styles
 * - Drawing mode toggle (Rectangle / Free Draw / Erase)
 * - Mode-specific help text
 * - Sticky footer with Cancel/Apply actions
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '../ui/label';
import { PANEL_ANIMATION } from '../../constants';
import { BOX_DRAWING_STYLES } from '../../constants/boxDrawingStyles';
import { useAsciiBoxTool } from '../../hooks/useAsciiBoxTool';
import { cn } from '../../lib/utils';
import { X, ChevronLeft, ChevronRight, Square, PenTool, Eraser } from 'lucide-react';
import type { BoxDrawingMode } from '../../stores/asciiBoxStore';

const parseTailwindDuration = (token: string): number | null => {
  const match = token.match(/duration-(\d+)/);
  return match ? Number(match[1]) : null;
};

export function AsciiBoxPanel() {
  const {
    isPanelOpen,
    selectedStyleId,
    drawingMode,
    isApplying,
    setSelectedStyle,
    setDrawingMode,
    applyPreview,
    cancelPreview,
    closePanel
  } = useAsciiBoxTool();
  
  const [shouldRender, setShouldRender] = useState(isPanelOpen);
  const [isAnimating, setIsAnimating] = useState(isPanelOpen);
  
  const animationDurationMs = useMemo(
    () => parseTailwindDuration(PANEL_ANIMATION.DURATION) ?? 300,
    []
  );
  
  useEffect(() => {
    if (isPanelOpen) {
      setShouldRender(true);
      requestAnimationFrame(() => setIsAnimating(true));
    } else if (shouldRender) {
      setIsAnimating(false);
      const timer = setTimeout(() => setShouldRender(false), animationDurationMs);
      return () => clearTimeout(timer);
    }
  }, [isPanelOpen, shouldRender, animationDurationMs]);
  
  const currentStyleIndex = BOX_DRAWING_STYLES.findIndex(s => s.id === selectedStyleId);
  const currentStyle = BOX_DRAWING_STYLES[currentStyleIndex];
  
  const handlePreviousStyle = useCallback(() => {
    const newIndex = currentStyleIndex === 0 
      ? BOX_DRAWING_STYLES.length - 1 
      : currentStyleIndex - 1;
    setSelectedStyle(BOX_DRAWING_STYLES[newIndex].id);
  }, [currentStyleIndex, setSelectedStyle]);
  
  const handleNextStyle = useCallback(() => {
    const newIndex = (currentStyleIndex + 1) % BOX_DRAWING_STYLES.length;
    setSelectedStyle(BOX_DRAWING_STYLES[newIndex].id);
  }, [currentStyleIndex, setSelectedStyle]);
  
  const handleModeChange = useCallback((mode: BoxDrawingMode) => {
    setDrawingMode(mode);
  }, [setDrawingMode]);
  
  if (!shouldRender) return null;
  
  return (
    <div
      className={cn(
        'fixed top-0 right-0 h-screen w-80 bg-background border-l border-border shadow-lg z-[100]',
        PANEL_ANIMATION.TRANSITION,
        isAnimating ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Square className="w-5 h-5" />
          ASCII Box Drawing
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={cancelPreview}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Content */}
      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="p-4 space-y-6">
          
          {/* Box Style Selector */}
          <div className="space-y-2">
            <Label>Box Style</Label>
            
            {/* Style Preview Grid */}
            <div className="bg-muted rounded-md p-4 flex items-center justify-center">
              <div className="font-mono text-sm leading-tight">
                {currentStyle.preview.map((row, i) => (
                  <div key={i} className="flex">
                    {row.map((char, j) => (
                      <span key={j} className="inline-block w-4 text-center">
                        {char}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Style Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousStyle}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="flex-1 text-center text-sm font-medium">
                {currentStyle.name}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextStyle}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Drawing Mode */}
          <div className="space-y-2">
            <Label>Drawing Mode</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={drawingMode === 'rectangle' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleModeChange('rectangle')}
                className="flex flex-col gap-1 h-auto py-2"
              >
                <Square className="w-4 h-4" />
                <span className="text-xs">Rectangle</span>
              </Button>
              
              <Button
                variant={drawingMode === 'freedraw' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleModeChange('freedraw')}
                className="flex flex-col gap-1 h-auto py-2"
              >
                <PenTool className="w-4 h-4" />
                <span className="text-xs">Free Draw</span>
              </Button>
              
              <Button
                variant={drawingMode === 'erase' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleModeChange('erase')}
                className="flex flex-col gap-1 h-auto py-2"
              >
                <Eraser className="w-4 h-4" />
                <span className="text-xs">Erase</span>
              </Button>
            </div>
          </div>
          
          {/* Mode Description */}
          <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 p-3 rounded-md">
            {drawingMode === 'rectangle' && (
              <>
                <p className="font-medium">Rectangle Mode:</p>
                <p>Click to set start point, then click again to draw rectangle outline.</p>
                <p className="mt-1">Characters automatically connect with neighbors.</p>
              </>
            )}
            {drawingMode === 'freedraw' && (
              <>
                <p className="font-medium">Free Draw Mode:</p>
                <p>Click or drag to draw box lines. Shift+click to draw straight lines.</p>
                <p className="mt-1">Characters automatically connect with neighbors.</p>
              </>
            )}
            {drawingMode === 'erase' && (
              <>
                <p className="font-medium">Erase Mode:</p>
                <p>Click or drag to erase box drawing characters from this session.</p>
                <p className="mt-1">Neighbors will update automatically.</p>
              </>
            )}
          </div>
          
        </div>
      </ScrollArea>
      
      {/* Footer Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-background">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={cancelPreview}
            className="flex-1"
          >
            Cancel (Esc)
          </Button>
          <Button
            onClick={applyPreview}
            className="flex-1"
            disabled={!isApplying}
          >
            Apply (Enter)
          </Button>
        </div>
      </div>
    </div>
  );
}
