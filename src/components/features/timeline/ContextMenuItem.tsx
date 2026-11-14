/**
 * ASCII Motion - Open Source ASCII Art Editor
 *
 * @license MIT
 * @copyright 2025 ASCII Motion
 * @see LICENSE-MIT for full license text
 */

import React from 'react';
import { cn } from '@/lib/utils';

// ============================================
// MENU ITEM COMPONENT
// ============================================

export const MenuItem: React.FC<{
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}> = ({ icon, label, onClick, disabled, destructive }) => (
  <button
    className={cn(
      'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
      disabled
        ? 'text-muted-foreground/50 cursor-not-allowed'
        : destructive
          ? 'text-destructive hover:bg-destructive/10 focus:bg-destructive/10'
          : 'hover:bg-accent focus:bg-accent',
    )}
    onClick={(e) => {
      e.stopPropagation();
      if (!disabled) onClick();
    }}
    disabled={disabled}
  >
    {icon}
    {label}
  </button>
);

export const MenuSeparator: React.FC = () => (
  <div className="h-px bg-border my-1" />
);
