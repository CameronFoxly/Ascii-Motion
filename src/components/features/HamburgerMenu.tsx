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
import { Menu, Info, Keyboard, CloudUpload, CloudDownload } from 'lucide-react';
import { AboutDialog } from './AboutDialog';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { useAuth } from '@ascii-motion/premium';
import { useCloudDialogState } from '../../hooks/useCloudDialogState';

/**
 * Hamburger menu button for the top header bar
 * Contains app information and cloud storage operations
 */
export const HamburgerMenu: React.FC = () => {
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  
  const { user } = useAuth();
  const { 
    setShowSaveToCloudDialog,
    setShowProjectsDialog,
  } = useCloudDialogState();

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
              tabIndex={1}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </MenubarTrigger>
          <MenubarContent align="start" className="border-border/50">
            {user && (
              <>
                <MenubarItem onClick={() => setShowSaveToCloudDialog(true)} className="cursor-pointer">
                  <CloudUpload className="mr-2 h-4 w-4" />
                  <span>Save Project</span>
                </MenubarItem>
                
                <MenubarItem onClick={() => setShowProjectsDialog(true)} className="cursor-pointer">
                  <CloudDownload className="mr-2 h-4 w-4" />
                  <span>Open Project</span>
                </MenubarItem>
                
                <MenubarSeparator />
              </>
            )}
            
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
