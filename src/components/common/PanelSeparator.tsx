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
 * The -mx-4 offset matches the standard panel padding (p-4) to create edge-to-edge separators.
 */

import React from 'react';
import { Separator } from '@/components/ui/separator';

interface PanelSeparatorProps {
  className?: string;
}

export const PanelSeparator: React.FC<PanelSeparatorProps> = ({ className = '' }) => {
  return (
    <div className={`relative -mx-4 h-px ${className}`}>
      <Separator className="absolute inset-0" />
    </div>
  );
};
