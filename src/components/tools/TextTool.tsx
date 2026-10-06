import React from 'react';
import { useTextTool } from '../../hooks/useTextTool';

/**
 * Text Tool Component
 * Handles text input functionality with cursor placement and typing
 */
export const TextTool: React.FC = () => {
  const { handleTextToolKeyDown } = useTextTool();
  
  // Set up global keyboard listener for text input
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      handleTextToolKeyDown(event);
    };

    // Add global keyboard listener
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleTextToolKeyDown]);

  return null; // No direct UI - handles behavior through hooks and global listeners
};

/**
 * Text Tool Status Component
 * Provides visual feedback about the text tool's current state
 */
export const TextToolStatus: React.FC = () => {
  const { isTyping, cursorPosition, textBox } = useTextTool();

  if (!isTyping) {
    return (
      <span className="text-muted-foreground">
        Click to place cursor • Drag to draw a text box
      </span>
    );
  }

  if (cursorPosition) {
    return (
      <span className="text-muted-foreground">
        {textBox
          ? `Text box ${textBox.right - textBox.left + 1}×${textBox.bottom - textBox.top + 1} • Text wraps at the box edge • Esc to finish`
          : `Typing at (${cursorPosition.x}, ${cursorPosition.y}) • Arrows to move • Enter for new line • Esc to finish`}
      </span>
    );
  }

  return (
    <span className="text-muted-foreground">
      Ready to type
    </span>
  );
};
