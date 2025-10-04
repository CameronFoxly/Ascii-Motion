import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutSection {
  title: string;
  shortcuts: ShortcutItem[];
}

const KEYBOARD_SHORTCUTS: ShortcutSection[] = [
  {
    title: 'Tool Selection',
    shortcuts: [
      { keys: ['P'], description: 'Pencil tool' },
      { keys: ['E'], description: 'Eraser tool' },
      { keys: ['G'], description: 'Fill (Paint Bucket) tool' },
      { keys: ['M'], description: 'Rectangular Selection tool' },
      { keys: ['L'], description: 'Lasso Selection tool' },
      { keys: ['W'], description: 'Magic Wand Selection tool' },
      { keys: ['I'], description: 'Eyedropper tool' },
      { keys: ['R'], description: 'Rectangle tool' },
      { keys: ['O'], description: 'Ellipse tool' },
      { keys: ['T'], description: 'Text tool' },
      { keys: ['F'], description: 'Gradient Fill tool' },
      { keys: ['Alt'], description: 'Temporary Eyedropper (hold while using drawing tools)' },
    ]
  },
  {
    title: 'Canvas Actions',
    shortcuts: [
      { keys: ['Cmd', 'A'], description: 'Select All' },
      { keys: ['Cmd', 'C'], description: 'Copy Selection' },
      { keys: ['Cmd', 'V'], description: 'Paste Selection (press again to commit)' },
      { keys: ['Cmd', 'Z'], description: 'Undo' },
      { keys: ['Cmd', 'Shift', 'Z'], description: 'Redo' },
      { keys: ['Delete'], description: 'Delete selected cells' },
      { keys: ['Backspace'], description: 'Delete selected cells' },
      { keys: ['Esc'], description: 'Clear selection' },
      { keys: ['Shift', 'H'], description: 'Flip selection horizontally' },
      { keys: ['Shift', 'V'], description: 'Flip selection vertically' },
      { keys: ['Space'], description: 'Pan canvas (hold and drag)' },
    ]
  },
  {
    title: 'Color Management',
    shortcuts: [
      { keys: ['X'], description: 'Swap foreground/background colors' },
      { keys: ['['], description: 'Decrease brush size' },
      { keys: [']'], description: 'Increase brush size' },
      { keys: ['Shift', '['], description: 'Previous palette color' },
      { keys: ['Shift', ']'], description: 'Next palette color' },
      { keys: ['Cmd', '['], description: 'Previous character in active palette' },
      { keys: ['Cmd', ']'], description: 'Next character in active palette' },
    ]
  },
  {
    title: 'Zoom & Navigation',
    shortcuts: [
      { keys: ['+'], description: 'Zoom in (20% increments)' },
      { keys: ['='], description: 'Zoom in (20% increments)' },
      { keys: ['-'], description: 'Zoom out (20% increments)' },
    ]
  },
  {
    title: 'Animation & Timeline',
    shortcuts: [
      { keys: [','], description: 'Previous frame' },
      { keys: ['.'], description: 'Next frame' },
      { keys: ['Cmd', 'N'], description: 'Add new frame after current' },
      { keys: ['Cmd', 'D'], description: 'Duplicate current frame' },
      { keys: ['Cmd', 'Delete'], description: 'Delete current frame' },
      { keys: ['Cmd', 'Backspace'], description: 'Delete current frame' },
      { keys: ['Shift', 'O'], description: 'Toggle onion skinning' },
    ]
  },
  {
    title: 'Performance',
    shortcuts: [
      { keys: ['Ctrl', 'Shift', 'P'], description: 'Toggle performance overlay' },
    ]
  }
];

const KeyDisplay: React.FC<{ keys: string[] }> = ({ keys }) => {
  return (
    <div className="flex items-center gap-1">
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded">
            {key === 'Cmd' ? (navigator.platform.includes('Mac') ? '⌘' : 'Ctrl') : key}
          </kbd>
          {index < keys.length - 1 && (
            <span className="text-xs text-muted-foreground">+</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export const KeyboardShortcutsDialog: React.FC<KeyboardShortcutsDialogProps> = ({ 
  isOpen, 
  onOpenChange 
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[calc(85vh-120px)] pr-4">
          <div className="space-y-4">
            {KEYBOARD_SHORTCUTS.map((section, sectionIndex) => (
              <Card key={sectionIndex} className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {section.shortcuts.map((shortcut, shortcutIndex) => (
                    <div 
                      key={shortcutIndex}
                      className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm text-foreground">
                        {shortcut.description}
                      </span>
                      <KeyDisplay keys={shortcut.keys} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}

            {/* Note about platform differences */}
            <div className="text-xs text-muted-foreground text-center pt-2 pb-1">
              Note: "Cmd" shortcuts use Ctrl on Windows/Linux
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
