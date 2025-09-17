import React from 'react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Download, Upload, FileImage, Film, Save, ChevronDown } from 'lucide-react';
import { useExportStore } from '../../stores/exportStore';
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
];

// Import format definitions for dropdown
const IMPORT_OPTIONS = [
  {
    id: 'session' as ExportFormatId,
    name: 'Session File',
    description: 'Load complete project',
    icon: Save,
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

  const handleExportSelect = (formatId: ExportFormatId) => {
    setActiveFormat(formatId);
    setShowExportModal(true);
  };

  const handleImportSelect = (formatId: ExportFormatId) => {
    setActiveFormat(formatId);
    setShowImportModal(true);
  };

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        {/* Import Dropdown */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 gap-1"
                  title="Import options"
                >
                  <Upload className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Import project</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
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
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 gap-1"
                  title="Export options"
                >
                  <Download className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Export project</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
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
      </TooltipProvider>
    </div>
  );
};