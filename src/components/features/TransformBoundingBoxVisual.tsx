import React from 'react';

interface TransformPoint {
  x: number;
  y: number;
}

interface TransformBoundingBoxVisualProps {
  corners: TransformPoint[];
  isLocked?: boolean;
}

export const TransformBoundingBoxVisual: React.FC<TransformBoundingBoxVisualProps> = ({
  corners,
  isLocked = false,
}) => {
  if (corners.length !== 4) return null;

  const boxPath =
    corners
      .map((corner, index) => `${index === 0 ? 'M' : 'L'} ${corner.x} ${corner.y}`)
      .join(' ') + ' Z';
  const boxColor = isLocked
    ? 'rgba(128, 128, 128, 0.5)'
    : 'rgba(147, 130, 255, 0.8)';
  const handleColor = isLocked
    ? 'rgba(128, 128, 128, 0.6)'
    : 'rgba(147, 130, 255, 1)';
  const handleSize = 8;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ overflow: 'visible' }}
    >
      <path
        d={boxPath}
        fill="none"
        stroke={boxColor}
        strokeWidth={1.5}
        strokeDasharray="6 3"
      />

      {corners.map((corner, index) => (
        <rect
          key={index}
          x={corner.x - handleSize / 2}
          y={corner.y - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill={handleColor}
          stroke={
            isLocked
              ? 'rgba(100, 100, 100, 0.8)'
              : 'rgba(255, 255, 255, 0.9)'
          }
          strokeWidth={1}
          rx={1}
        />
      ))}
    </svg>
  );
};
