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
import { Menu, Info, Keyboard, CloudUpload, CloudDownload, FilePlus2, Settings } from 'lucide-react';
import { AboutDialog } from './AboutDialog';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { useAuth } from '@ascii-motion/premium';
import { useCloudDialogState } from '../../hooks/useCloudDialogState';
import { useProjectDialogState } from '../../hooks/useProjectDialogState';
import { useProjectFileActions } from '../../hooks/useProjectFileActions';

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
  
  const {
    setShowNewProjectDialog,
    setShowProjectSettingsDialog,
  } = useProjectDialogState();

  const { showSaveAsDialog } = useProjectFileActions();

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
            {/* Project Management */}
            <MenubarItem onClick={() => setShowNewProjectDialog(true)} className="cursor-pointer">
              <FilePlus2 className="mr-2 h-4 w-4" />
              <span>New Project</span>
            </MenubarItem>
            
            <MenubarSeparator />
            
            {user && (
              <>
                <MenubarItem onClick={() => setShowSaveToCloudDialog(true)} className="cursor-pointer">
                  <CloudUpload className="mr-2 h-4 w-4" />
                  <span>Save Project</span>
                  <span className="ml-auto pl-4 text-xs text-muted-foreground">
                    {navigator.platform.includes('Mac') ? '⌘S' : 'Ctrl+S'}
                  </span>
                </MenubarItem>
                
                <MenubarItem onClick={showSaveAsDialog} className="cursor-pointer">
                  <CloudUpload className="mr-2 h-4 w-4" />
                  <span>Save As...</span>
                  <span className="ml-auto pl-4 text-xs text-muted-foreground">
                    {navigator.platform.includes('Mac') ? '⇧⌘S' : 'Ctrl+Shift+S'}
                  </span>
                </MenubarItem>
                
                <MenubarItem onClick={() => setShowProjectsDialog(true)} className="cursor-pointer">
                  <CloudDownload className="mr-2 h-4 w-4" />
                  <span>Open Project</span>
                  <span className="ml-auto pl-4 text-xs text-muted-foreground">
                    {navigator.platform.includes('Mac') ? '⌘O' : 'Ctrl+O'}
                  </span>
                </MenubarItem>
                
                <MenubarSeparator />
              </>
            )}
            
            <MenubarItem onClick={() => setShowProjectSettingsDialog(true)} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Project Settings</span>
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
