import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Save, Download, Settings } from 'lucide-react';
import { useExportStore } from '../../stores/exportStore';

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

  const [filename, setFilename] = useState('ascii-motion-project');

  const isOpen = showExportModal && activeFormat === 'session';

  const handleClose = () => {
    setShowExportModal(false);
  };

  const handleExport = () => {
    console.log('Exporting Session with settings:', {
      filename: `${filename}.asciimtn`,
      settings: sessionSettings
    });
    // Export logic will be implemented later
    handleClose();
  };

  const handleMetadataToggle = (includeMetadata: boolean) => {
    setSessionSettings({ includeMetadata });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setShowExportModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            Save Session File
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Name Input */}
          <div className="space-y-2">
            <Label htmlFor="filename">File Name</Label>
            <div className="flex">
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="Enter filename"
                className="flex-1"
              />
              <Badge variant="outline" className="ml-2 self-center">
                .asciimtn
              </Badge>
            </div>
          </div>

          {/* Export Settings */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center gap-2 mb-3">
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
                />
              </div>
            </CardContent>
          </Card>

          {/* What's Included */}
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

          {/* Preview Info */}
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Complete project will be saved as
            </p>
            <p className="text-sm font-medium">
              {filename}.asciimtn
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Save Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};