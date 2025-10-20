import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Search } from 'lucide-react';

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
    title: 'File & Project',
    shortcuts: [
      { keys: ['Cmd', 'S'], description: 'Save to Cloud (requires sign in)' },
      { keys: ['Cmd', 'Shift', 'S'], description: 'Save As... (requires sign in)' },
      { keys: ['Cmd', 'O'], description: 'Open from Cloud (requires sign in)' },
    ]
  },
  {
    title: 'Tool Selection',
    shortcuts: [
      { keys: ['P'], description: 'Pencil tool' },
      { keys: ['E'], description: 'Eraser tool' },
      { keys: ['F'], description: 'Fill tool' },
      { keys: ['M'], description: 'Rectangular Selection tool' },
      { keys: ['L'], description: 'Lasso Selection tool' },
      { keys: ['W'], description: 'Magic Wand Selection tool' },
      { keys: ['I'], description: 'Eyedropper tool' },
      { keys: ['R'], description: 'Rectangle tool' },
      { keys: ['O'], description: 'Ellipse tool' },
      { keys: ['T'], description: 'Text tool' },
      { keys: ['G'], description: 'Gradient Fill tool' },
      { keys: ['Alt'], description: 'Temporary Eyedropper' },
    ]
  },
  {
    title: 'Canvas Actions',
    shortcuts: [
      { keys: ['Cmd', 'A'], description: 'Select All' },
      { keys: ['Cmd', 'C'], description: 'Copy Selection' },
      { keys: ['Cmd', 'V'], description: 'Paste Selection' },
      { keys: ['Cmd', 'Z'], description: 'Undo' },
      { keys: ['Cmd', 'Shift', 'Z'], description: 'Redo' },
      { keys: ['Delete'], description: 'Delete selected cells' },
      { keys: ['Backspace'], description: 'Delete selected cells' },
      { keys: ['Esc'], description: 'Clear selection' },
      { keys: ['Shift', 'H'], description: 'Flip selection horizontally' },
      { keys: ['Shift', 'V'], description: 'Flip selection vertically' },
      { keys: ['Space'], description: 'Pan canvas' },
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
      { keys: ['+'], description: 'Zoom in' },
      { keys: ['='], description: 'Zoom in' },
      { keys: ['-'], description: 'Zoom out' },
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
  const [searchQuery, setSearchQuery] = useState('');

  // Filter shortcuts based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) {
      return KEYBOARD_SHORTCUTS;
    }

    const query = searchQuery.toLowerCase();
    
    return KEYBOARD_SHORTCUTS.map(section => ({
      ...section,
      shortcuts: section.shortcuts.filter(shortcut => {
        // Search in description
        const matchesDescription = shortcut.description.toLowerCase().includes(query);
        
        // Search in keyboard shortcut keys
        const matchesKeys = shortcut.keys.some(key => 
          key.toLowerCase().includes(query)
        );
        
        return matchesDescription || matchesKeys;
      })
    })).filter(section => section.shortcuts.length > 0);
  }, [searchQuery]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] border-border/50" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <ScrollArea className="h-[calc(85vh-180px)] pr-4">
          {filteredSections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No shortcuts found matching "{searchQuery}"
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSections.map((section, sectionIndex) => (
                <Card key={sectionIndex} className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-muted-foreground">
                      {section.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* 2-column grid layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-2">
                      {section.shortcuts.map((shortcut, shortcutIndex) => (
                        <div 
                          key={shortcutIndex}
                          className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 transition-colors gap-4"
                        >
                          <span className="text-sm text-foreground flex-1 min-w-0">
                            {shortcut.description}
                          </span>
                          <KeyDisplay keys={shortcut.keys} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Note about platform differences */}
              <div className="text-xs text-muted-foreground text-center pt-2 pb-1">
                Note: "Cmd" shortcuts use Ctrl on Windows/Linux
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
