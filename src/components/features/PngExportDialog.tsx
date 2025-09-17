import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { FileImage, Download, Settings } from 'lucide-react';
import { useExportStore } from '../../stores/exportStore';

/**
 * PNG Export Dialog
 * Handles PNG-specific export settings and file naming
 */
export const PngExportDialog: React.FC = () => {
  const activeFormat = useExportStore(state => state.activeFormat);
  const showExportModal = useExportStore(state => state.showExportModal);
  const setShowExportModal = useExportStore(state => state.setShowExportModal);
  const pngSettings = useExportStore(state => state.pngSettings);
  const setPngSettings = useExportStore(state => state.setPngSettings);

  const [filename, setFilename] = useState('ascii-motion-frame');

  const isOpen = showExportModal && activeFormat === 'png';

  const handleClose = () => {
    setShowExportModal(false);
  };

  const handleExport = () => {
    console.log('Exporting PNG with settings:', {
      filename: `${filename}.png`,
      settings: pngSettings
    });
    // Export logic will be implemented later
    handleClose();
  };

  const handleSizeChange = (multiplier: string) => {
    setPngSettings({ sizeMultiplier: parseInt(multiplier) as 1 | 2 });
  };

  const handleGridToggle = (includeGrid: boolean) => {
    setPngSettings({ includeGrid });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setShowExportModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileImage className="w-5 h-5" />
            Export PNG Image
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
                .png
              </Badge>
            </div>
          </div>

          {/* Export Settings */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4" />
                <span className="text-sm font-medium">Export Settings</span>
              </div>

              {/* Size Multiplier */}
              <div className="space-y-2">
                <Label htmlFor="size-multiplier">Size Multiplier</Label>
                <Select
                  value={pngSettings.sizeMultiplier.toString()}
                  onValueChange={handleSizeChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1x (Original)</SelectItem>
                    <SelectItem value="2">2x (Double)</SelectItem>
                    <SelectItem value="3">3x (Triple)</SelectItem>
                    <SelectItem value="4">4x (Quadruple)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Higher multipliers create larger, more detailed images
                </p>
              </div>

              {/* Include Grid */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="include-grid">Include Grid</Label>
                  <p className="text-xs text-muted-foreground">
                    Show grid lines in exported image
                  </p>
                </div>
                <Switch
                  id="include-grid"
                  checked={pngSettings.includeGrid}
                  onCheckedChange={handleGridToggle}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview Info */}
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Current frame will be exported as
            </p>
            <p className="text-sm font-medium">
              {filename}.png ({pngSettings.sizeMultiplier}x scale)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export PNG
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};