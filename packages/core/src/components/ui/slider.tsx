import React from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, onValueChange, min = 0, max = 100, step = 1, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(event.target.value);
      onValueChange?.(newValue);
    };

    return (
      <input
        type="range"
        className={cn(
          "w-full cursor-pointer appearance-none rounded-lg bg-muted outline-none focus:outline-none focus:ring-1 focus:ring-primary/50",
          // Webkit styles - responsive thumb size
          "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:transition-all",
          // Firefox styles - responsive thumb size  
          "[&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:transition-all",
          // Track styles - use the height from className prop, default to h-2
          "[&::-webkit-slider-track]:bg-muted [&::-webkit-slider-track]:rounded-lg",
          "[&::-moz-range-track]:bg-muted [&::-moz-range-track]:rounded-lg [&::-moz-range-track]:border-none",
          className
        )}
        style={{
          height: className?.includes('h-') ? undefined : '8px' // Default height if not specified in className
        }}
        ref={ref}
        value={value}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        {...props}
      />
    );
  }
);

Slider.displayName = "Slider";

export { Slider };
