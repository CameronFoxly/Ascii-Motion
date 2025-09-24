import React from 'react';
import type { IconProps } from './types';
import { defaultIconProps } from './types';

/**
 * Custom Gradient Fill Icon Component
 * Displays a pixelated gradient pattern representing the gradient fill tool
 * 
 * Based on custom SVG design with smooth gradient appearance
 * Matches ASCII Motion's aesthetic for pixel/character-based content
 */
export const GradientIcon: React.FC<IconProps> = ({ 
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
      <path d="M8.03125 18.2744H6.24609V16.4893H8.03125V18.2744Z" fill={color}/>
      <path d="M11.5996 18.2744H9.81445V16.4893H11.5996V18.2744Z" fill={color}/>
      <path d="M8.03125 14.7051H6.24609V12.9199H8.03125V14.7051Z" fill={color}/>
      <path d="M11.5996 14.7051H9.81445V12.9199H11.5996V14.7051Z" fill={color}/>
      <path d="M8.03125 11.1357H6.24609V9.35059H8.03125V11.1357Z" fill={color}/>
      <path d="M11.5996 11.1357H9.81445V9.35059H11.5996V11.1357Z" fill={color}/>
      <path d="M13.3848 9.35059H11.5996V7.56641L13.3848 7.56543V9.35059Z" fill={color}/>
      <path d="M8.03125 7.56641H6.24609V5.78125H8.03125V7.56641Z" fill={color}/>
      <path d="M11.5996 7.56641L9.81445 7.56543V5.78125H11.5996V7.56641Z" fill={color}/>
      <path 
        fillRule="evenodd" 
        clipRule="evenodd" 
        d="M19 2C20.6569 2 22 3.34315 22 5V19C22 20.6569 20.6569 22 19 22H5C3.34315 22 2 20.6569 2 19V5C2 3.34315 3.34315 2 5 2H19ZM16.9551 20H18.7383V18.2744H16.9551V20ZM13.3848 20H15.1699V18.2744H13.3848V20ZM5 4C4.44772 4 4 4.44772 4 5V19C4 19.5523 4.44772 20 5 20H11.5996V18.2744H13.3848V16.4893H15.1699V14.7051H13.3848V16.4893H11.5996V14.7051H13.3848V12.9199H15.1699V11.1357H13.3848V12.9199H11.5996V11.1357H13.3848V9.35059H15.1699V7.56543H13.3848V5.78125H15.1699V4H13.3848V5.78125H11.5996V4H5ZM16.9551 16.4893H18.7383V14.7051H16.9551V16.4893ZM16.9551 12.9199H18.7383V11.1357H16.9551V12.9199ZM16.9551 9.35059H18.7383V7.56543H16.9551V9.35059ZM16.9551 5.78125H18.7383V4H16.9551V5.78125Z" 
        fill={color}
      />
    </svg>
  );
};