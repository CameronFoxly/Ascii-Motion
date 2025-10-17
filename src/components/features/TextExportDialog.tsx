import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { FileText, Download, Settings, Loader2 } from 'lucide-react';
import { useExportStore } from '../../stores/exportStore';
import { useExportDataCollector } from '../../utils/exportDataCollector';
import { useProjectMetadataStore } from '../../stores/projectMetadataStore';
import { ExportRenderer } from '../../utils/exportRenderer';
import type { TextExportSettings } from '../../types/export';

/**
 * Text Export Dialog
 * Handles simple text export with character data only
 */
export const TextExportDialog: React.FC = () => {
  const activeFormat = useExportStore(state => state.activeFormat);
  const showExportModal = useExportStore(state => state.showExportModal);
  const setShowExportModal = useExportStore(state => state.setShowExportModal);
  const textSettings = useExportStore(state => state.textSettings);
  const setTextSettings = useExportStore(state => state.setTextSettings);
  
  const exportData = useExportDataCollector();
  const projectName = useProjectMetadataStore((state) => state.projectName);
  
  const [filename, setFilename] = useState(projectName || 'ascii-motion-text');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<{ message: string; progress: number } | null>(null);

  const isOpen = showExportModal && activeFormat === 'text';

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
      await renderer.exportText(exportData, textSettings, filename);
      
      // Close dialog on success
      handleClose();
    } catch (error) {
      console.error('Text export failed:', error);
      // In a real app, you'd show a toast or error message here
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  const handleSettingChange = (key: keyof TextExportSettings, value: boolean) => {
    setTextSettings({ [key]: value });
  };

  const frameCount = exportData?.frames.length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={setShowExportModal}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-border/50">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 bg-background">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Export Simple Text
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col max-h-[80vh]">
          {/* Sticky Progress + Filename */}
          <div className="sticky top-0 z-10 bg-background px-6 py-4 border-b border-border/50 space-y-4">
            {progress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{progress.message}</span>
                  <span>{progress.progress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="filename">Filename</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="filename"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="ascii-motion-text"
                  className="flex-1"
                  disabled={isExporting}
                />
                <Badge variant="outline" className="ml-2 self-center">
                  .txt
                </Badge>
              </div>
            </div>
          </div>

          {/* Scrollable Settings */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <Card className="border-border/50">
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Settings className="w-4 h-4" />
                  <span className="text-sm font-medium">Text Settings</span>
                </div>

                {/* Remove Leading Spaces */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="remove-leading-spaces">Remove leading spaces</Label>
                    <p className="text-xs text-muted-foreground">
                      Remove spaces before leftmost character
                    </p>
                  </div>
                  <Checkbox
                    id="remove-leading-spaces"
                    checked={textSettings.removeLeadingSpaces}
                    onCheckedChange={(checked) => handleSettingChange('removeLeadingSpaces', !!checked)}
                    disabled={isExporting}
                  />
                </div>

                {/* Remove Trailing Spaces */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="remove-trailing-spaces">Remove trailing spaces</Label>
                    <p className="text-xs text-muted-foreground">
                      Remove spaces after rightmost character
                    </p>
                  </div>
                  <Checkbox
                    id="remove-trailing-spaces"
                    checked={textSettings.removeTrailingSpaces}
                    onCheckedChange={(checked) => handleSettingChange('removeTrailingSpaces', !!checked)}
                    disabled={isExporting}
                  />
                </div>

                {/* Remove Leading Lines */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="remove-leading-lines">Remove leading lines</Label>
                    <p className="text-xs text-muted-foreground">
                      Remove empty lines from top
                    </p>
                  </div>
                  <Checkbox
                    id="remove-leading-lines"
                    checked={textSettings.removeLeadingLines}
                    onCheckedChange={(checked) => handleSettingChange('removeLeadingLines', !!checked)}
                    disabled={isExporting}
                  />
                </div>

                {/* Remove Trailing Lines */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="remove-trailing-lines">Remove trailing lines</Label>
                    <p className="text-xs text-muted-foreground">
                      Remove empty lines from bottom
                    </p>
                  </div>
                  <Checkbox
                    id="remove-trailing-lines"
                    checked={textSettings.removeTrailingLines}
                    onCheckedChange={(checked) => handleSettingChange('removeTrailingLines', !!checked)}
                    disabled={isExporting}
                  />
                </div>

                {/* Include Metadata */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="include-metadata">Include metadata</Label>
                    <p className="text-xs text-muted-foreground">
                      Add version info and export details at top
                    </p>
                  </div>
                  <Checkbox
                    id="include-metadata"
                    checked={textSettings.includeMetadata}
                    onCheckedChange={(checked) => handleSettingChange('includeMetadata', !!checked)}
                    disabled={isExporting}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Export Info */}
            <Card className="border-border/50">
              <CardContent className="pt-4">
                <h4 className="text-sm font-medium mb-3">Export Details</h4>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    {frameCount} frame{frameCount !== 1 ? 's' : ''} will be exported
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    Character data only (colors ignored)
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    Frames separated by comma + line break
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    Empty cells converted to spaces
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sticky Actions */}
          <div className="sticky bottom-0 z-10 bg-background px-6 py-4 border-t border-border/50 flex justify-end gap-2">
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
                  Export Text
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};