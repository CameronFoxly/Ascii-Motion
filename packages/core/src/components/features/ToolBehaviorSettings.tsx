import React, { useState } from 'react';
import { useToolStore } from '../../stores/toolStore';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { CollapsibleHeader } from '../common/CollapsibleHeader';

export const ToolBehaviorSettings: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  const {
    toolAffectsChar,
    toolAffectsColor,
    toolAffectsBgColor,
    eyedropperPicksChar,
    eyedropperPicksColor,
    eyedropperPicksBgColor,
    setToolAffectsChar,
    setToolAffectsColor,
    setToolAffectsBgColor,
    setEyedropperPicksChar,
    setEyedropperPicksColor,
    setEyedropperPicksBgColor
  } = useToolStore();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleHeader isOpen={isOpen}>
        Tool Behavior
      </CollapsibleHeader>
      <CollapsibleContent className="collapsible-content">
        <div className="p-3 bg-gray-800 rounded-b-lg space-y-4">
          {/* Drawing Tool Toggles */}
          <div>
            <h4 className="text-sm font-medium text-white mb-2">Drawing Tools Affect:</h4>
            <div className="space-y-2">
              <label className="flex items-center text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={toolAffectsChar}
                  onChange={(e) => setToolAffectsChar(e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                Character
              </label>
              <label className="flex items-center text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={toolAffectsColor}
                  onChange={(e) => setToolAffectsColor(e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                Text Color
              </label>
              <label className="flex items-center text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={toolAffectsBgColor}
                  onChange={(e) => setToolAffectsBgColor(e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                Background Color
              </label>
            </div>
          </div>

          {/* Eyedropper Tool Toggles */}
          <div>
            <h4 className="text-sm font-medium text-white mb-2">Eyedropper Picks:</h4>
            <div className="space-y-2">
              <label className="flex items-center text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={eyedropperPicksChar}
                  onChange={(e) => setEyedropperPicksChar(e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                Character
              </label>
              <label className="flex items-center text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={eyedropperPicksColor}
                  onChange={(e) => setEyedropperPicksColor(e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                Text Color
              </label>
              <label className="flex items-center text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={eyedropperPicksBgColor}
                  onChange={(e) => setEyedropperPicksBgColor(e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                Background Color
              </label>
            </div>
          </div>

          {/* Help Text */}
          <div className="text-xs text-gray-400 mt-3 p-2 bg-gray-900 rounded">
            <p className="mb-1"><strong>Drawing Tools:</strong> When unchecked, tools will preserve existing values for that property.</p>
            <p><strong>Eyedropper:</strong> When unchecked, eyedropper will not change that property value.</p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
