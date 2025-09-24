/**
 * Common props for custom SVG icons
 * Maintains consistency with Lucide React icon patterns
 */
export interface IconProps extends React.SVGAttributes<SVGElement> {
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
}

/**
 * Default props for custom icons to match Lucide patterns
 */
export const defaultIconProps: Required<Pick<IconProps, 'size' | 'color' | 'strokeWidth'>> = {
  size: 24,
  color: 'currentColor', 
  strokeWidth: 2,
};