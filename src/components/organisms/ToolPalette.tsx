import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import { Button } from '../atoms/Button';
import type { Tool } from '../../types';

interface ToolPaletteProps {
  className?: string;
}

const TOOLS: Array<{ id: Tool; name: string; icon: string; description: string }> = [
  { id: 'pencil', name: 'Pencil', icon: '✏️', description: 'Draw characters' },
  { id: 'eraser', name: 'Eraser', icon: '🧽', description: 'Remove characters' },
  { id: 'paintbucket', name: 'Fill', icon: '🪣', description: 'Fill connected areas' },
  { id: 'select', name: 'Select', icon: '⬚', description: 'Select rectangular areas' },
  { id: 'eyedropper', name: 'Eyedropper', icon: '💧', description: 'Pick character/color' },
  { id: 'rectangle', name: 'Rectangle', icon: '▭', description: 'Draw rectangles' },
];

export const ToolPalette: React.FC<ToolPaletteProps> = ({ className = '' }) => {
  const { activeTool, setActiveTool, rectangleFilled, setRectangleFilled } = useToolStore();

  return (
    <div className={`tool-palette ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Tools</h3>
      
      <div className="grid grid-cols-2 gap-2 mb-4">
        {TOOLS.map((tool) => (
          <Button
            key={tool.id}
            variant={activeTool === tool.id ? 'default' : 'outline'}
            className={`
              p-3 h-auto flex flex-col items-center gap-1 text-xs
              ${activeTool === tool.id ? 'border-blue-500 bg-blue-50' : ''}
            `}
            onClick={() => setActiveTool(tool.id)}
            title={tool.description}
          >
            <span className="text-lg">{tool.icon}</span>
            <span>{tool.name}</span>
          </Button>
        ))}
      </div>

      {/* Tool-specific options */}
      {activeTool === 'rectangle' && (
        <div className="tool-options border-t pt-4">
          <h4 className="text-sm font-medium mb-2">Rectangle Options</h4>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={rectangleFilled}
              onChange={(e) => setRectangleFilled(e.target.checked)}
              className="rounded"
            />
            Filled
          </label>
        </div>
      )}

      {/* Current tool display */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600 mb-1">Active Tool:</div>
        <div className="font-medium">
          {TOOLS.find(tool => tool.id === activeTool)?.name || 'Unknown'}
        </div>
      </div>
    </div>
  );
};
