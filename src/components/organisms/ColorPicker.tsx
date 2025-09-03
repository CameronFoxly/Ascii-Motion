import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import { DEFAULT_COLORS } from '../../constants';

interface ColorPickerProps {
  className?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ className = '' }) => {
  const { selectedColor, selectedBgColor, setSelectedColor, setSelectedBgColor } = useToolStore();

  return (
    <div className={`color-picker ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Colors</h3>
      
      {/* Current colors display */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="text-sm text-gray-600 mb-1">Text Color</div>
            <div 
              className="w-12 h-12 border border-gray-300 rounded cursor-pointer"
              style={{ backgroundColor: selectedColor }}
              title={`Text color: ${selectedColor}`}
            />
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-600 mb-1">Background</div>
            <div 
              className="w-12 h-12 border border-gray-300 rounded cursor-pointer"
              style={{ backgroundColor: selectedBgColor }}
              title={`Background color: ${selectedBgColor}`}
            />
          </div>
        </div>
      </div>

      {/* Preset colors */}
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">Text Colors</h4>
        <div className="grid grid-cols-6 gap-1">
          {DEFAULT_COLORS.map((color) => (
            <button
              key={`text-${color}`}
              className={`
                w-8 h-8 border-2 rounded transition-all
                ${selectedColor === color ? 'border-blue-500 scale-110' : 'border-gray-300'}
              `}
              style={{ backgroundColor: color }}
              onClick={() => setSelectedColor(color)}
              title={`Set text color to ${color}`}
            />
          ))}
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">Background Colors</h4>
        <div className="grid grid-cols-6 gap-1">
          {DEFAULT_COLORS.map((color) => (
            <button
              key={`bg-${color}`}
              className={`
                w-8 h-8 border-2 rounded transition-all
                ${selectedBgColor === color ? 'border-blue-500 scale-110' : 'border-gray-300'}
              `}
              style={{ backgroundColor: color }}
              onClick={() => setSelectedBgColor(color)}
              title={`Set background color to ${color}`}
            />
          ))}
        </div>
      </div>

      {/* Custom color inputs */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Custom Text Color</label>
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="w-full h-10 border border-gray-300 rounded cursor-pointer"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Custom Background Color</label>
          <input
            type="color"
            value={selectedBgColor}
            onChange={(e) => setSelectedBgColor(e.target.value)}
            className="w-full h-10 border border-gray-300 rounded cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
