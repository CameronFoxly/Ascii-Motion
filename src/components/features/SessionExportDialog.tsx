import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Save, Download, Settings, Loader2 } from 'lucide-react';
import { useExportStore } from '../../stores/exportStore';
import { useExportDataCollector } from '../../utils/exportDataCollector';
import { useProjectMetadataStore } from '../../stores/projectMetadataStore';
import { ExportRenderer } from '../../utils/exportRenderer';

/**
 * Session Export Dialog
 * Handles session file export settings and file naming
 */
export const SessionExportDialog: React.FC = () => {
  const activeFormat = useExportStore(state => state.activeFormat);
  const showExportModal = useExportStore(state => state.showExportModal);
  const setShowExportModal = useExportStore(state => state.setShowExportModal);
  const sessionSettings = useExportStore(state => state.sessionSettings);
  const setSessionSettings = useExportStore(state => state.setSessionSettings);
  const setProgress = useExportStore(state => state.setProgress);
  const setIsExporting = useExportStore(state => state.setIsExporting);
  const isExporting = useExportStore(state => state.isExporting);
  
  const exportData = useExportDataCollector();
  const projectName = useProjectMetadataStore((state) => state.projectName);

  const [filename, setFilename] = useState(projectName || 'ascii-motion-project');

  const isOpen = showExportModal && activeFormat === 'session';

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

      // Export data already contains project metadata from projectMetadataStore
      // No need to manually inject name/description
      await renderer.exportSession(exportData, sessionSettings, filename);
      
      // Close dialog on success
      handleClose();
    } catch (error) {
      console.error('Session export failed:', error);
      // In a real app, you'd show a toast or error message here
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  const handleMetadataToggle = (includeMetadata: boolean) => {
    setSessionSettings({ includeMetadata });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setShowExportModal}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-border/50">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-background">
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            Save Session File
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col max-h-[80vh]">
          {/* Sticky File Name Input */}
          <div className="sticky top-0 z-10 bg-background px-6 py-4 border-b space-y-4">
            <div className="space-y-2">
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
                  .asciimtn
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Project metadata (name, description) is stored in Project Settings
              </p>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Settings className="w-4 h-4" />
                  <span className="text-sm font-medium">Session Settings</span>
                </div>

                {/* Include Metadata */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="include-metadata">Include Metadata</Label>
                    <p className="text-xs text-muted-foreground">
                      Save creation date, version info, and export history
                    </p>
                  </div>
                  <Switch
                    id="include-metadata"
                    checked={sessionSettings.includeMetadata}
                    onCheckedChange={handleMetadataToggle}
                    disabled={isExporting}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <h4 className="text-sm font-medium mb-3">What's Included</h4>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    All animation frames and timeline data
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    Canvas settings and dimensions
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    Tool configurations and palettes
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    UI layout and preferences
                  </div>
                  {sessionSettings.includeMetadata && (
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      Creation metadata and version info
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Complete project will be saved as
              </p>
              <p className="text-sm font-medium">
                {filename}.asciimtn
              </p>
            </div>
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
                  Saving...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Save Session
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};