/**
 * PanelSeparator - Standardized full-width separator for panel sections
 * 
 * This component provides a consistent full-width horizontal separator that extends
 * beyond the panel's padding to create visual separation between major sections.
 * 
 * Usage:
 * ```tsx
 * <div className="space-y-3">
 *   <SomeSection />
 *   <PanelSeparator />
 *   <AnotherSection />
 * </div>
 * ```
 * 
 * The default -mx-4 offset matches the standard panel padding (p-4).
 * Use marginX prop to customize for panels with different padding (e.g., marginX="3" for p-3).
 */

import React from 'react';
import { Separator } from '@/components/ui/separator';

interface PanelSeparatorProps {
  className?: string;
  marginX?: '3' | '4'; // Negative margin to match panel padding
}

export const PanelSeparator: React.FC<PanelSeparatorProps> = ({ className = '', marginX = '4' }) => {
  const marginClass = marginX === '3' ? '-mx-3' : '-mx-4';
  
  return (
    <div className={`relative ${marginClass} h-px ${className}`}>
      <Separator className="absolute inset-0" />
    </div>
  );
};
