import React, { useEffect, useRef, useState } from 'react';
import type { GradientProperty } from '../../types';
import { sampleGradientProperty } from '../../utils/gradientEngine';
import { cn } from '../../lib/utils';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { getFontString } from '../../utils/fontMetrics';

const MAX_PREVIEW_WIDTH = 256;
const PREVIEW_HEIGHT = 24;
const TILE_SIZE = 4;

type GradientPropertyKey = 'character' | 'textColor' | 'backgroundColor';

interface GradientPropertyPreviewProps {
  propertyKey: GradientPropertyKey;
  property: GradientProperty;
}

export const GradientPropertyPreview: React.FC<GradientPropertyPreviewProps> = ({
  propertyKey,
  property
}) => {
  if (propertyKey === 'character') {
    return <CharacterPreview property={property} />;
  }

  return <ColorPreview property={property} />;
};

const ColorPreview: React.FC<{
  property: GradientProperty;
}> = ({ property }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState<number>(MAX_PREVIEW_WIDTH);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const nextWidth = entry.contentRect.width;
        if (nextWidth > 0) {
          setWidth(nextWidth);
        }
      }
    });

    observer.observe(element);
    setWidth(element.clientWidth || MAX_PREVIEW_WIDTH);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const availableWidth = width || container.clientWidth;
    if (!availableWidth) return;

    const sampleCount = Math.max(2, Math.min(MAX_PREVIEW_WIDTH, Math.round(availableWidth)));
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    canvas.width = sampleCount * dpr;
    canvas.height = PREVIEW_HEIGHT * dpr;
    canvas.style.width = '100%';
    canvas.style.height = `${PREVIEW_HEIGHT}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, sampleCount, PREVIEW_HEIGHT);
    drawCheckboard(ctx, sampleCount, PREVIEW_HEIGHT);

    for (let x = 0; x < sampleCount; x++) {
      const position = sampleCount === 1 ? 0 : x / (sampleCount - 1);
      const value = sampleGradientProperty(position, property, x, 0); // Use x coordinate for preview

      if (!value || value === 'transparent') {
        continue;
      }

      ctx.fillStyle = value;
      ctx.fillRect(x, 0, 1, PREVIEW_HEIGHT);
    }

    ctx.restore();
  }, [property, width]);

  return (
    <div ref={containerRef} className="relative w-full">
      <canvas ref={canvasRef} className="block rounded border border-border bg-muted/30" />
    </div>
  );
};

const drawCheckboard = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const light = 'rgba(255,255,255,0.35)';
  const dark = 'rgba(148,163,184,0.35)';

  for (let y = 0; y < height; y += TILE_SIZE) {
    for (let x = 0; x < width; x += TILE_SIZE) {
      const isDark = ((Math.floor(x / TILE_SIZE) + Math.floor(y / TILE_SIZE)) % 2) === 0;
      ctx.fillStyle = isDark ? dark : light;
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    }
  }
};

const CharacterPreview: React.FC<{ property: GradientProperty }> = ({ property }) => {
  const { fontMetrics } = useCanvasContext();
  
  // Use helper to properly quote font names with spaces
  const fontString = getFontString(fontMetrics);
  
  return (
    <div
      className="relative w-full border border-border rounded bg-muted/20 px-3"
      style={{ height: PREVIEW_HEIGHT }}
    >
      <div className="absolute inset-0 flex items-center" role="presentation">
        <div className="w-full h-px bg-border/60" />
      </div>
      {property.stops.map((stop, index) => {
        const clamped = Math.max(0, Math.min(1, stop.position));
        const leftPercent = clamped * 100;
        let translateX = -50;
        if (clamped <= 0.01) {
          translateX = 0;
        } else if (clamped >= 0.99) {
          translateX = -100;
        }
        return (
          <div
            key={`${stop.value}-${index}`}
            className="absolute top-1/2"
            style={{ left: `${leftPercent}%`, transform: `translate(${translateX}%, -50%)` }}
          >
            <span
              className={cn('text-foreground', stop.value ? 'px-1' : '')}
              style={{ 
                font: fontString,
                lineHeight: 1,
              }}
            >
              {stop.value || '∅'}
            </span>
          </div>
        );
      })}
    </div>
  );
};
