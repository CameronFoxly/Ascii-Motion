import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { FileImage, Download, Settings, Loader2 } from 'lucide-react';
import { useExportStore } from '../../stores/exportStore';
import { useExportDataCollector } from '../../utils/exportDataCollector';
import { ExportRenderer } from '../../utils/exportRenderer';
import { calculateExportPixelDimensions, formatPixelDimensions, estimatePngFileSize } from '../../utils/exportPixelCalculator';

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
  const setProgress = useExportStore(state => state.setProgress);
  const setIsExporting = useExportStore(state => state.setIsExporting);
  const isExporting = useExportStore(state => state.isExporting);
  
  const exportData = useExportDataCollector();

  const [filename, setFilename] = useState('ascii-motion-frame');

  const isOpen = showExportModal && activeFormat === 'png';

  const handleClose = () => {
    setShowExportModal(false);
  };

  const handleExport = async () => {
    
    if (!exportData) {
      console.error('No export data available');
      alert('No export data available. Please make sure you have some content to export.');
      return;
    }

    try {
      setIsExporting(true);
      
      // Create renderer with progress callback
      const renderer = new ExportRenderer((progress) => {
        setProgress(progress);
      });

      // Perform the export
      await renderer.exportPng(exportData, pngSettings, filename);
      
      // Close dialog on success
      handleClose();
    } catch (error) {
      console.error('PNG export failed:', error);
      alert(`PNG export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  const handleSizeChange = (multiplier: string) => {
    setPngSettings({ sizeMultiplier: parseInt(multiplier) as 1 | 2 });
  };

  const handleGridToggle = (includeGrid: boolean) => {
    setPngSettings({ includeGrid });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setShowExportModal}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-background">
          <DialogTitle className="flex items-center gap-2">
            <FileImage className="w-5 h-5" />
            Export PNG Image
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
                .png
              </Badge>
            </div>
          </div>

          {/* Scrollable Settings */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Settings className="w-4 h-4" />
                  <span className="text-sm font-medium">Export Settings</span>
                </div>

                {/* Size Multiplier */}
                <div className="space-y-2">
                  <Label htmlFor="size-multiplier">Size Multiplier</Label>
                  <Select
                    value={pngSettings.sizeMultiplier.toString()}
                    onValueChange={handleSizeChange}
                    disabled={isExporting}
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
                  {exportData && (
                    <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Output size:</span>
                        <span className="font-mono">
                          {formatPixelDimensions(calculateExportPixelDimensions({
                            gridWidth: exportData.canvasDimensions.width,
                            gridHeight: exportData.canvasDimensions.height,
                            sizeMultiplier: pngSettings.sizeMultiplier,
                            fontSize: exportData.typography.fontSize,
                            characterSpacing: exportData.typography.characterSpacing,
                            lineSpacing: exportData.typography.lineSpacing
                          }))}
                        </span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-muted-foreground">Est. file size:</span>
                        <span className="font-mono">
                          {estimatePngFileSize(calculateExportPixelDimensions({
                            gridWidth: exportData.canvasDimensions.width,
                            gridHeight: exportData.canvasDimensions.height,
                            sizeMultiplier: pngSettings.sizeMultiplier,
                            fontSize: exportData.typography.fontSize,
                            characterSpacing: exportData.typography.characterSpacing,
                            lineSpacing: exportData.typography.lineSpacing
                          }))}
                        </span>
                      </div>
                    </div>
                  )}
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
                    disabled={isExporting}
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
                  Export PNG
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};