# Custom Icons Directory

This directory contains custom SVG icons for ASCII Motion that aren't available in Lucide React.

## Structure

- `types.ts` - Common interface and default props for custom icons
- `GradientIcon.tsx` - Custom gradient fill tool icon
- `index.ts` - Barrel export for easy importing

## Adding New Custom Icons

When you need to add a new custom icon:

1. **Create the component file**: `YourIcon.tsx`
2. **Use the IconProps interface** for consistent prop handling
3. **Follow the established pattern**:

```tsx
import React from 'react';
import type { IconProps } from './types';
import { defaultIconProps } from './types';

export const YourIcon: React.FC<IconProps> = ({ 
  size = defaultIconProps.size,
  color = defaultIconProps.color,
  strokeWidth = defaultIconProps.strokeWidth,
  className,
  ...props 
}) => {
  const sizeValue = typeof size === 'number' ? size : parseInt(size.toString());
  
  return (
    <svg 
      width={sizeValue}
      height={sizeValue} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Your SVG content */}
    </svg>
  );
};
```

4. **Export it in index.ts**:
```tsx
export { YourIcon } from './YourIcon';
```

5. **Use in components**:
```tsx
import { YourIcon } from '../icons';

// In your component:
<YourIcon className="w-3 h-3" />
```

## Design Guidelines

- **Size**: Default to 24x24px viewBox (matches Lucide icons)
- **Styling**: Use `currentColor` for fill/stroke to inherit text color
- **ClassName**: Support className prop for Tailwind styling (e.g., `w-3 h-3`)
- **Props**: Extend IconProps interface for consistent API
- **Accessibility**: Ensure icons work at different sizes and color themes

## Current Custom Icons

- **GradientIcon** - Pixelated gradient pattern for the gradient fill tool