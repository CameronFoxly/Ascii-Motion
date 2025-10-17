import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { FileText, Download, Settings, Loader2 } from 'lucide-react';
import { useExportStore } from '../../stores/exportStore';
import { useExportDataCollector } from '../../utils/exportDataCollector';
import { useProjectMetadataStore } from '../../stores/projectMetadataStore';
import { ExportRenderer } from '../../utils/exportRenderer';

/**
 * JSON Export Dialog
 * Handles human-readable JSON export with formatting options
 */
export const JsonExportDialog: React.FC = () => {
  const activeFormat = useExportStore(state => state.activeFormat);
  const showExportModal = useExportStore(state => state.showExportModal);
  const setShowExportModal = useExportStore(state => state.setShowExportModal);
  const jsonSettings = useExportStore(state => state.jsonSettings);
  const setJsonSettings = useExportStore(state => state.setJsonSettings);
  const setProgress = useExportStore(state => state.setProgress);
  const setIsExporting = useExportStore(state => state.setIsExporting);
  const isExporting = useExportStore(state => state.isExporting);
  
  const exportData = useExportDataCollector();
  const projectName = useProjectMetadataStore((state) => state.projectName);

  const [filename, setFilename] = useState(projectName || 'ascii-motion-data');

  const isOpen = showExportModal && activeFormat === 'json';

  // Sync filename with project name when dialog opens
  useEffect(() => {
    if (isOpen && projectName) {
      setFilename(projectName);
    }
  }, [isOpen, projectName]);

  const handleClose = () => {
    setShowExportModal(false);
  };

  const handleExport = async () => {
    if (!exportData) {
      console.error('No export data available');
      return;
    }

    try {
      setIsExporting(true);
      
      // Create renderer with progress callback
      const renderer = new ExportRenderer((progress) => {
        setProgress(progress);
      });

      // Perform the export
      await renderer.exportJson(exportData, jsonSettings, filename);
      
      // Close dialog on success
      handleClose();
    } catch (error) {
      console.error('JSON export failed:', error);
      // In a real app, you'd show a toast or error message here
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  const handleMetadataToggle = (includeMetadata: boolean) => {
    setJsonSettings({ includeMetadata });
  };

  const handleHumanReadableToggle = (humanReadable: boolean) => {
    setJsonSettings({ humanReadable });
  };

  const handleIncludeEmptyCellsToggle = (includeEmptyCells: boolean) => {
    setJsonSettings({ includeEmptyCells });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setShowExportModal}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-background">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Export JSON Data
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col max-h-[80vh]">
          {/* Sticky File Name Input */}
          <div className="sticky top-0 z-10 bg-background px-6 py-4 border-b space-y-2">
            <Label htmlFor="filename">File Name</Label>
            <div className="flex">
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="Enter filename"
                className="flex-1"
                disabled={isExporting}
              />
              <Badge variant="outline" className="ml-2 self-center">
                .json
              </Badge>
            </div>
          </div>

          {/* Scrollable Settings */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <Label className="text-sm font-medium">JSON Format Settings</Label>
                </div>

                {/* Human Readable */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm">Pretty Print</Label>
                    <p className="text-xs text-muted-foreground">
                      Format JSON with indentation for readability
                    </p>
                  </div>
                  <Switch
                    checked={jsonSettings.humanReadable}
                    onCheckedChange={handleHumanReadableToggle}
                    disabled={isExporting}
                  />
                </div>

                {/* Include Empty Cells */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm">Include Empty Cells</Label>
                    <p className="text-xs text-muted-foreground">
                      Include cells with default values (larger file size)
                    </p>
                  </div>
                  <Switch
                    checked={jsonSettings.includeEmptyCells}
                    onCheckedChange={handleIncludeEmptyCellsToggle}
                    disabled={isExporting}
                  />
                </div>

                {/* Include Metadata */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm">Include Metadata</Label>
                    <p className="text-xs text-muted-foreground">
                      Include export timestamp and version information
                    </p>
                  </div>
                  <Switch
                    checked={jsonSettings.includeMetadata}
                    onCheckedChange={handleMetadataToggle}
                    disabled={isExporting}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="text-xs text-muted-foreground">
                  <div className="font-medium mb-2">JSON Export Format:</div>
                  <ul className="space-y-1">
                    <li>• Human-readable structure with organized frame data</li>
                    <li>• Character, foreground color, and background color per cell</li>
                    <li>• Compatible with JSON import for round-trip data preservation</li>
                    <li>• Suitable for external processing and data analysis</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sticky Action Buttons */}
          <div className="sticky bottom-0 z-10 bg-background px-6 py-4 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isExporting}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting || !filename.trim()}>
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export JSON
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};