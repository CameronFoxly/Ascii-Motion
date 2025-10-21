'use client';
import React, { useState, useEffect, useRef } from 'react';
import { FRAMES, type CellData } from './WelcomeAsciiAnimationData';

/**
 * ASCII Motion welcome animation component
 * Displays an animated ASCII art title for the welcome screen
 */
export const WelcomeAsciiAnimation: React.FC = () => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(10);

  // Animation loop
  useEffect(() => {
    const frame = FRAMES[currentFrame];
    const timer = setTimeout(() => {
      setCurrentFrame((prev) => (prev + 1) % FRAMES.length);
    }, frame.duration);

    return () => clearTimeout(timer);
  }, [currentFrame]);

  // Calculate responsive font size based on container width
  useEffect(() => {
    const updateFontSize = () => {
      if (containerRef.current && canvasRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const frame = FRAMES[0]; // Use first frame to calculate dimensions
        const maxX = Math.max(...frame.cells.map(cell => cell.x)) + 1;
        
        // Calculate font size to fit the width (with some padding)
        // Using 0.6 as the approximate width/height ratio for monospace characters
        const calculatedSize = (containerWidth - 16) / (maxX * 0.6);
        setFontSize(Math.max(6, Math.min(calculatedSize, 14))); // Clamp between 6-14px
      }
    };

    updateFontSize();
    window.addEventListener('resize', updateFontSize);
    return () => window.removeEventListener('resize', updateFontSize);
  }, []);

  // Render current frame
  const renderFrame = () => {
    const frame = FRAMES[currentFrame];
    
    // Calculate grid dimensions
    const maxX = Math.max(...frame.cells.map(cell => cell.x));
    const maxY = Math.max(...frame.cells.map(cell => cell.y));
    const minY = Math.min(...frame.cells.map(cell => cell.y));
    
    // Create 2D grid (offset by minY to remove top blank space)
    const grid: (CellData | null)[][] = Array(maxY - minY + 1)
      .fill(null)
      .map(() => Array(maxX + 1).fill(null));
    
    // Fill grid with cells (offset y coordinates)
    frame.cells.forEach(cell => {
      grid[cell.y - minY][cell.x] = cell;
    });
    
    return (
      <div 
        ref={canvasRef}
        className="font-mono tracking-tighter whitespace-pre select-none"
        style={{ 
          fontSize: `${fontSize}px`,
          lineHeight: '1.0',
        }}
      >
        {grid.map((row, y) => (
          <div key={y}>
            {row.map((cell, x) => (
              <span
                key={`${x}-${y}`}
                style={{
                  color: cell?.color || 'transparent',
                  backgroundColor: cell?.bgColor || 'transparent',
                }}
              >
                {cell?.char || ' '}
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="w-full bg-black rounded-md border border-border/50 p-2">
      <div className="w-full overflow-hidden">
        {renderFrame()}
      </div>
    </div>
  );
};
