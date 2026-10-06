import React from 'react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

import { Download, Upload, FileImage, Film, FileText, ChevronDown, Globe, FileCode, Save, FolderOpen, Terminal, Monitor } from 'lucide-react';
import { useExportStore } from '../../stores/exportStore';
import { useImportModal } from '../../stores/importStore';
import type { ExportFormatId } from '../../types/export';

// Export format definitions for dropdown
const EXPORT_OPTIONS = [
  {
    id: 'png' as ExportFormatId,
    name: 'Image',
    description: 'Current frame as SVG/PNG/JPG',
    icon: FileImage,
  },
  {
    id: 'mp4' as ExportFormatId,
    name: 'Video',
    description: 'Animation as .mp4 or .webm',
    icon: Film,
  },
  {
    id: 'html' as ExportFormatId,
    name: 'HTML',
    description: 'Standalone webpage',
    icon: Globe,
  },
  {
    id: 'react' as ExportFormatId,
    name: 'React Component',
    description: 'Drop-in canvas component',
    icon: FileCode,
  },
  {
    id: 'ink' as ExportFormatId,
    name: 'Ink Component',
    description: 'React-flavored CLI component',
    icon: Terminal,
  },
  {
    id: 'opentui' as ExportFormatId,
    name: 'OpenTUI Component',
    description: 'Terminal UI component',
    icon: Monitor,
  },
  {
    id: 'bubbletea' as ExportFormatId,
    name: 'Bubbletea Component',
    description: 'Go-based CLI component',
    icon: Terminal,
  },
  {
    id: 'ansi' as ExportFormatId,
    name: 'ANSI Text',
    description: 'Console-safe xterm-256 / truecolor output',
    icon: Terminal,
  },
  {
    id: 'json' as ExportFormatId,
    name: 'JSON',
    description: 'Importable & human readable',
    icon: FileText,
  },
  {
    id: 'text' as ExportFormatId,
    name: 'Simple Text',
    description: 'Character data as a .txt file',
    icon: FileText,
  },
  {
    id: 'session' as ExportFormatId,
    name: '.asciimtn Project',
    description: 'Full ascii-motion session file',
    icon: Save,
  },
];

// Import format definitions for dropdown
const IMPORT_OPTIONS = [
  {
    id: 'media' as ExportFormatId,
    name: 'Image/Video',
    description: 'Convert to ASCII art',
    icon: Upload,
  },
  {
    id: 'session' as ExportFormatId,
    name: '.asciimtn',
    description: 'Load project file',
    icon: FolderOpen,
  },
];

/**
 * Export and Import dropdown buttons for the top header bar
 * Each button opens a dropdown menu with format options
 */
export const ExportImportButtons: React.FC = () => {
  const setActiveFormat = useExportStore(state => state.setActiveFormat);
  const setShowExportModal = useExportStore(state => state.setShowExportModal);
  const setShowImportModal = useExportStore(state => state.setShowImportModal);
  const { openModal: openMediaImportModal } = useImportModal();

  const handleExportSelect = (formatId: ExportFormatId) => {
    setActiveFormat(formatId);
    setShowExportModal(true);
  };

  const handleImportSelect = (formatId: ExportFormatId) => {
    if (formatId === 'media') {
      // Use new media import modal
      openMediaImportModal();
    } else {
      // Use existing session or json import modals
      setActiveFormat(formatId);
      setShowImportModal(true);
    }
  };

  return (
    <div className="flex items-center gap-2">
        {/* Import Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 gap-2"
              tabIndex={3}
            >
              <Upload className="h-4 w-4" />
              <span className="text-sm">Import</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-border/50">
            {IMPORT_OPTIONS.map((option) => {
              const IconComponent = option.icon;
              return (
                <DropdownMenuItem
                  key={option.id}
                  onClick={() => handleImportSelect(option.id)}
                  className="cursor-pointer"
                >
                  <IconComponent className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{option.name}</span>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 gap-2"
              tabIndex={2}
            >
              <Download className="h-4 w-4" />
              <span className="text-sm">Export</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-border/50">
            {EXPORT_OPTIONS.map((option) => {
              const IconComponent = option.icon;
              return (
                <DropdownMenuItem
                  key={option.id}
                  onClick={() => handleExportSelect(option.id)}
                  className="cursor-pointer"
                >
                  <IconComponent className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{option.name}</span>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
    </div>
  );
};