import { cn } from '@/lib/utils';

export interface MotionPathPoint {
  x: number;
  y: number;
  frame: number;
}

interface MotionPathDotsProps {
  points: MotionPathPoint[];
  currentFrame: number;
  toPixelX: (x: number) => number;
  toPixelY: (y: number) => number;
}

export function MotionPathDots({ points, currentFrame, toPixelX, toPixelY }: MotionPathDotsProps) {
  if (points.length <= 1) return null;
  return points.map((point) => (
    <div
      key={point.frame}
      className={cn(
        'absolute rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none',
        point.frame === currentFrame
          ? 'w-2.5 h-2.5 bg-yellow-400 border border-yellow-600'
          : 'w-1 h-1 bg-yellow-500/50',
      )}
      style={{ left: toPixelX(point.x), top: toPixelY(point.y) }}
    />
  ));
}
