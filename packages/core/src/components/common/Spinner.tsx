import React from 'react';
import { cn } from '../../lib/utils';

interface SpinnerProps {
  /** Size of the spinner */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Color variant */
  variant?: 'primary' | 'secondary' | 'accent' | 'muted';
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses = {
  xs: 'w-3 h-3 p-0.5',
  sm: 'w-4 h-4 p-1', 
  md: 'w-6 h-6 p-1.5',
  lg: 'w-8 h-8 p-2'
};

const variantClasses = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  accent: 'bg-accent',
  muted: 'bg-muted-foreground'
};

/**
 * Reusable Spinner component
 * 
 * Features:
 * - Multiple sizes (xs, sm, md, lg)
 * - Color variants using theme colors (primary, secondary, accent, muted)
 * - Smooth conic gradient animation with proper accessibility
 * - Works with both light and dark themes
 * - Customizable with additional CSS classes
 */
export const Spinner: React.FC<SpinnerProps> = ({ 
  size = 'sm', 
  variant = 'primary',
  className 
}) => {
  return (
    <div
      className={cn(
        // Base spinner styles with conic gradient animation
        'rounded-full aspect-square',
        '[mask:conic-gradient(transparent_10%,black),linear-gradient(black_0_0)_content-box]',
        '[mask-composite:subtract]',
        'animate-spin',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      style={{
        maskComposite: 'subtract',
        WebkitMaskComposite: 'source-out',
        animationDuration: '1s',
        animationTimingFunction: 'linear',
        animationIterationCount: 'infinite'
      }}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};