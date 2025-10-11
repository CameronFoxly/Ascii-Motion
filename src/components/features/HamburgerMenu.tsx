import React, { useState } from 'react';
import { Button } from '../ui/button';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
  MenubarShortcut,
} from '../ui/menubar';
import { Menu, Save, FolderOpen, Info, Keyboard } from 'lucide-react';
import { AboutDialog } from './AboutDialog';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { useProjectFileActions } from '../../hooks/useProjectFileActions';

const isMacPlatform = () =>
  typeof window !== 'undefined' && typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

/**
 * Hamburger menu button for the top header bar
 * Contains project file operations and app information
 */
export const HamburgerMenu: React.FC = () => {
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const { showSaveProjectDialog, showOpenProjectDialog } = useProjectFileActions();
  const isMac = isMacPlatform();

  return (
    <>
      <Menubar className="border-none bg-transparent p-0">
        <MenubarMenu>
          <MenubarTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label="Menu"
              tabIndex={1001}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </MenubarTrigger>
          <MenubarContent align="start" className="border-border/50">
            <MenubarItem onClick={showSaveProjectDialog} className="cursor-pointer">
              <Save className="mr-2 h-4 w-4" />
              <span>Save Project</span>
              <MenubarShortcut>{isMac ? '⌘S' : 'Ctrl+S'}</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={showOpenProjectDialog} className="cursor-pointer">
              <FolderOpen className="mr-2 h-4 w-4" />
              <span>Open Project</span>
              <MenubarShortcut>{isMac ? '⌘O' : 'Ctrl+O'}</MenubarShortcut>
            </MenubarItem>
            
            <MenubarSeparator />
            
            <MenubarItem onClick={() => setShowKeyboardShortcuts(true)} className="cursor-pointer">
              <Keyboard className="mr-2 h-4 w-4" />
              <span>Keyboard Shortcuts</span>
            </MenubarItem>
            
            <MenubarItem onClick={() => setShowAboutDialog(true)} className="cursor-pointer">
              <Info className="mr-2 h-4 w-4" />
              <span>About</span>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>

      {/* Dialogs */}
      <AboutDialog 
        isOpen={showAboutDialog} 
        onOpenChange={setShowAboutDialog} 
      />
      <KeyboardShortcutsDialog 
        isOpen={showKeyboardShortcuts} 
        onOpenChange={setShowKeyboardShortcuts} 
      />
    </>
  );
};
