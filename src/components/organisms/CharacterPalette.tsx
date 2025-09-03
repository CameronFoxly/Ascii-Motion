import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import { CHARACTER_CATEGORIES } from '../../constants';

interface CharacterPaletteProps {
  className?: string;
}

export const CharacterPalette: React.FC<CharacterPaletteProps> = ({ className = '' }) => {
  const { selectedChar, setSelectedChar } = useToolStore();

  return (
    <div className={`character-palette ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Character Palette</h3>
      
      <div className="space-y-4">
        {Object.entries(CHARACTER_CATEGORIES).map(([categoryName, characters]) => (
          <div key={categoryName} className="category-section">
            <h4 className="text-sm font-medium text-gray-700 mb-2">{categoryName}</h4>
            <div className="grid grid-cols-8 gap-1">
              {characters.map((char) => (
                <button
                  key={char}
                  className={`
                    w-8 h-8 border border-gray-300 rounded text-sm font-mono
                    hover:border-blue-400 hover:bg-blue-50 transition-colors
                    flex items-center justify-center
                    ${selectedChar === char 
                      ? 'border-blue-500 bg-blue-100 text-blue-700' 
                      : 'bg-white text-gray-700'
                    }
                  `}
                  onClick={() => setSelectedChar(char)}
                  title={`Character: ${char}`}
                >
                  {char}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Current selection display */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600 mb-1">Selected Character:</div>
        <div className="text-2xl font-mono text-center w-8 h-8 border border-gray-300 rounded bg-white flex items-center justify-center">
          {selectedChar}
        </div>
      </div>
    </div>
  );
};
