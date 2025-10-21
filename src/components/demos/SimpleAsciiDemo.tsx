/**
 * Simple ASCII Demo Component
 * 
 * A lightweight, self-contained animated ASCII art demo
 * Used in the welcome dialog to showcase ASCII Motion capabilities
 * without requiring heavy dependencies or canvas initialization.
 */

import React, { useEffect, useState } from 'react';

const FRAMES = [
  `
   ╔═══╗
   ║ ◉ ║
   ╚═══╝
  `,
  `
   ╔═══╗
   ║   ║
   ║ ◉ ║
   ╚═══╝
  `,
  `
   ╔═══╗
   ║   ║
   ║   ║
   ║ ◉ ║
   ╚═══╝
  `,
  `
   ╔═══╗
   ║   ║
   ║ ◉ ║
   ╚═══╝
  `,
];

export const SimpleAsciiDemo: React.FC = () => {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % FRAMES.length);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center bg-background/50">
      <pre className="font-mono text-lg leading-tight text-purple-400 select-none">
        {FRAMES[frameIndex]}
      </pre>
    </div>
  );
};
