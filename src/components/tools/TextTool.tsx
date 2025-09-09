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
  const { isTyping, cursorPosition } = useTextTool();

  if (!isTyping) {
    return (
      <span className="text-muted-foreground">
        Text: Click to place cursor and start typing
      </span>
    );
  }

  if (cursorPosition) {
    return (
      <span className="text-muted-foreground">
        Text: Typing at ({cursorPosition.x}, {cursorPosition.y}) • Arrows to move • Enter for new line • Escape to finish
      </span>
    );
  }

  return (
    <span className="text-muted-foreground">
      Text: Ready to type
    </span>
  );
};
