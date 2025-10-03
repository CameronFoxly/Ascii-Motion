import React, { useState } from 'react';
import { Button } from '../ui/button';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from '../ui/menubar';
import { Menu, Save, FolderOpen, Info, Keyboard } from 'lucide-react';
import { useExportStore } from '../../stores/exportStore';
import { AboutDialog } from './AboutDialog';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';

/**
 * Hamburger menu button for the top header bar
 * Contains project file operations and app information
 */
export const HamburgerMenu: React.FC = () => {
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  
  const setActiveFormat = useExportStore(state => state.setActiveFormat);
  const setShowExportModal = useExportStore(state => state.setShowExportModal);
  const setShowImportModal = useExportStore(state => state.setShowImportModal);

  const handleSaveProject = () => {
    setActiveFormat('session');
    setShowExportModal(true);
  };

  const handleOpenProject = () => {
    setActiveFormat('session');
    setShowImportModal(true);
  };

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
            >
              <Menu className="h-4 w-4" />
            </Button>
          </MenubarTrigger>
          <MenubarContent align="start" className="border-border/50">
            <MenubarItem onClick={handleSaveProject} className="cursor-pointer">
              <Save className="mr-2 h-4 w-4" />
              <span>Save Project</span>
            </MenubarItem>
            <MenubarItem onClick={handleOpenProject} className="cursor-pointer">
              <FolderOpen className="mr-2 h-4 w-4" />
              <span>Open Project</span>
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
