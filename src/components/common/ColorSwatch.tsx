import React from 'react';

interface ColorSwatchProps {
  color: string;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * ColorSwatch Component
 * Displays a small colored square for inline status bar display
 */
export const ColorSwatch: React.FC<ColorSwatchProps> = ({ 
  color, 
  className = '', 
  size = 'sm' 
}) => {
  const sizeClass = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  
  return (
    <span
      className={`inline-block ${sizeClass} rounded border border-border ${className}`}
      style={{ backgroundColor: color }}
      aria-label={`Color: ${color}`}
    />
  );
};
