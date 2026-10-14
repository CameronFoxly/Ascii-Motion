import React from 'react';
import { useTextTool } from '../../hooks/useTextTool';
import { useToolStore } from '../../stores/toolStore';
import type { TextBoxEdit } from '../../types';

function syncSelection(input: HTMLTextAreaElement | null, edit: TextBoxEdit | null) {
  if (!input || !edit) return;
  input.setSelectionRange(
    Math.min(edit.anchor, edit.caret), Math.max(edit.anchor, edit.caret),
    edit.caret < edit.anchor ? 'backward' : 'forward',
  );
}

/**
 * Text Tool Component
 * Handles text input functionality with cursor placement and typing
 */
export const TextTool: React.FC = () => {
  const { handleTextToolKeyDown, handleTextBoxKeyDown } = useTextTool();
  const edit = useToolStore((s) => s.textToolState.boxEdit);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const editing = edit !== null;

  React.useEffect(() => {
    if (editing) inputRef.current?.focus({ preventScroll: true });
  }, [editing]);

  React.useLayoutEffect(() => {
    syncSelection(inputRef.current, edit);
  }, [edit]);

  React.useEffect(() => {
    const focusEditor = () => {
      syncSelection(inputRef.current, useToolStore.getState().textToolState.boxEdit);
      inputRef.current?.focus({ preventScroll: true });
    };
    window.addEventListener('text-box-focus', focusEditor);
    return () => window.removeEventListener('text-box-focus', focusEditor);
  }, []);
  
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

  const updateInput = (event: React.FormEvent<HTMLTextAreaElement>) => {
    const input = event.currentTarget;
    const anchor = input.selectionDirection === 'backward' ? input.selectionEnd : input.selectionStart;
    const caret = input.selectionDirection === 'backward' ? input.selectionStart : input.selectionEnd;
    const current = useToolStore.getState().textToolState.boxEdit;
    if (current && (current.text !== input.value || current.anchor !== anchor || current.caret !== caret)) {
      useToolStore.getState().updateTextBoxEdit({ text: input.value, anchor, caret, preferredColumn: null });
    }
  };

  if (!edit) return null;
  return (
    <textarea
      ref={inputRef}
      aria-label="Text box editor"
      className="fixed opacity-0 pointer-events-none"
      style={{ width: 1, height: 1, left: 0, top: 0 }}
      tabIndex={-1}
      value={edit.text}
      onKeyDown={(event) => {
        event.stopPropagation();
        handleTextBoxKeyDown(event.nativeEvent);
        syncSelection(event.currentTarget, useToolStore.getState().textToolState.boxEdit);
      }}
      onInput={updateInput}
      onChange={updateInput}
      onSelect={(event) => {
        const input = event.currentTarget;
        const anchor = input.selectionDirection === 'backward' ? input.selectionEnd : input.selectionStart;
        const caret = input.selectionDirection === 'backward' ? input.selectionStart : input.selectionEnd;
        const current = useToolStore.getState().textToolState.boxEdit;
        if (current && (current.anchor !== anchor || current.caret !== caret)) {
          useToolStore.getState().updateTextBoxEdit({ anchor, caret });
        }
      }}
    />
  );
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
          ? `Text box ${textBox.right - textBox.left + 1}×${textBox.bottom - textBox.top + 1} • Cmd/Ctrl+Enter to commit • Enter for new line • Esc to cancel`
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
