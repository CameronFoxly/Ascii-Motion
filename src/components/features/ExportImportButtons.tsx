import React from 'react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

import { Download, Upload, FileImage, Film, Save, FileText, ChevronDown, Globe } from 'lucide-react';
import { useExportStore } from '../../stores/exportStore';
import { useImportModal } from '../../stores/importStore';
import type { ExportFormatId } from '../../types/export';

// Export format definitions for dropdown
const EXPORT_OPTIONS = [
  {
    id: 'png' as ExportFormatId,
    name: 'PNG Image',
    description: 'Current frame as PNG',
    icon: FileImage,
  },
  {
    id: 'mp4' as ExportFormatId,
    name: 'MP4 Video',
    description: 'Animation as video',
    icon: Film,
  },
  {
    id: 'session' as ExportFormatId,
    name: 'Session File',
    description: 'Complete project',
    icon: Save,
  },
  {
    id: 'json' as ExportFormatId,
    name: 'JSON Data',
    description: 'Human-readable format',
    icon: FileText,
  },
  {
    id: 'html' as ExportFormatId,
    name: 'HTML Animation',
    description: 'Standalone webpage',
    icon: Globe,
  },
  {
    id: 'text' as ExportFormatId,
    name: 'Simple Text',
    description: 'Character data as txt file',
    icon: FileText,
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
    name: 'Session File',
    description: 'Load complete project',
    icon: Save,
  },
  {
    id: 'json' as ExportFormatId,
    name: 'JSON Data',
    description: 'Load JSON project',
    icon: FileText,
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