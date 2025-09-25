import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Globe, Download, Loader2, Palette, Type, Zap } from 'lucide-react';
import { useExportStore } from '../../stores/exportStore';
import { useExportDataCollector } from '../../utils/exportDataCollector';
import { ExportRenderer } from '../../utils/exportRenderer';

/**
 * HTML Export Dialog
 * Handles HTML animation export with customization options
 */
export const HtmlExportDialog: React.FC = () => {
  const activeFormat = useExportStore(state => state.activeFormat);
  const showExportModal = useExportStore(state => state.showExportModal);
  const setShowExportModal = useExportStore(state => state.setShowExportModal);
  const htmlSettings = useExportStore(state => state.htmlSettings);
  const setHtmlSettings = useExportStore(state => state.setHtmlSettings);
  const setProgress = useExportStore(state => state.setProgress);
  const setIsExporting = useExportStore(state => state.setIsExporting);
  const isExporting = useExportStore(state => state.isExporting);
  
  const exportData = useExportDataCollector();

  const [filename, setFilename] = useState('ascii-motion-animation');

  const isOpen = showExportModal && activeFormat === 'html';

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
      await renderer.exportHtml(exportData, htmlSettings, filename);
      
      // Close dialog on success
      handleClose();
    } catch (error) {
      console.error('HTML export failed:', error);
      // In a real app, you'd show a toast or error message here
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  const handleSettingChange = (key: keyof typeof htmlSettings, value: any) => {
    setHtmlSettings({ [key]: value });
  };

  // Calculate total animation duration
  const totalDuration = exportData ? 
    (exportData.frames.reduce((sum, frame) => sum + frame.duration, 0) / 1000) / htmlSettings.animationSpeed :
    0;

  return (
    <Dialog open={isOpen} onOpenChange={setShowExportModal}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Export HTML Animation
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
                disabled={isExporting}
              />
              <Badge variant="outline" className="ml-2 self-center">
                .html
              </Badge>
            </div>
          </div>

          {/* Animation Settings */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <Label className="text-sm font-medium">Animation Settings</Label>
              </div>

              {/* Animation Speed */}
              <div className="space-y-2">
                <Label className="text-sm">Speed Multiplier</Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={htmlSettings.animationSpeed.toString()}
                    onValueChange={(value) => handleSettingChange('animationSpeed', parseFloat(value))}
                    disabled={isExporting}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.25">0.25x (Very Slow)</SelectItem>
                      <SelectItem value="0.5">0.5x (Slow)</SelectItem>
                      <SelectItem value="1">1x (Normal)</SelectItem>
                      <SelectItem value="1.5">1.5x (Fast)</SelectItem>
                      <SelectItem value="2">2x (Very Fast)</SelectItem>
                      <SelectItem value="3">3x (Ultra Fast)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Duration: {totalDuration.toFixed(1)}s at current speed
                </p>
              </div>

              {/* Loop Settings */}
              <div className="space-y-2">
                <Label className="text-sm">Loop Count</Label>
                <Select
                  value={htmlSettings.loops.toString()}
                  onValueChange={(value) => handleSettingChange('loops', value === 'infinite' ? 'infinite' : parseInt(value))}
                  disabled={isExporting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="infinite">Loop Forever</SelectItem>
                    <SelectItem value="1">Play Once</SelectItem>
                    <SelectItem value="2">2 Times</SelectItem>
                    <SelectItem value="5">5 Times</SelectItem>
                    <SelectItem value="10">10 Times</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Appearance Settings */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                <Label className="text-sm font-medium">Appearance Settings</Label>
              </div>

              {/* Background Color */}
              <div className="space-y-2">
                <Label className="text-sm">Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={htmlSettings.backgroundColor}
                    onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
                    className="w-12 h-8 p-0 border-0"
                    disabled={isExporting}
                  />
                  <Input
                    type="text"
                    value={htmlSettings.backgroundColor}
                    onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
                    className="flex-1 font-mono text-sm"
                    disabled={isExporting}
                  />
                </div>
              </div>

              {/* Font Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Font Family</Label>
                  <Select
                    value={htmlSettings.fontFamily}
                    onValueChange={(value) => handleSettingChange('fontFamily', value)}
                    disabled={isExporting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monospace">Monospace</SelectItem>
                      <SelectItem value="courier">Courier New</SelectItem>
                      <SelectItem value="consolas">Consolas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Font Size (px)</Label>
                  <Select
                    value={htmlSettings.fontSize.toString()}
                    onValueChange={(value) => handleSettingChange('fontSize', parseInt(value))}
                    disabled={isExporting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10px</SelectItem>
                      <SelectItem value="12">12px</SelectItem>
                      <SelectItem value="14">14px</SelectItem>
                      <SelectItem value="16">16px</SelectItem>
                      <SelectItem value="18">18px</SelectItem>
                      <SelectItem value="20">20px</SelectItem>
                      <SelectItem value="24">24px</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Options */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4" />
                <Label className="text-sm font-medium">Additional Options</Label>
              </div>

              {/* Include Metadata */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm">Include Project Info</Label>
                  <p className="text-xs text-muted-foreground">
                    Show frame count, duration, and export date
                  </p>
                </div>
                <Switch
                  checked={htmlSettings.includeMetadata}
                  onCheckedChange={(checked) => handleSettingChange('includeMetadata', checked)}
                  disabled={isExporting}
                />
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">
                <div className="font-medium mb-2">HTML Export Features:</div>
                <ul className="space-y-1">
                  <li>• Standalone HTML file with no external dependencies</li>
                  <li>• Built-in play/pause controls and speed adjustment</li>
                  <li>• Preserves all character colors and backgrounds</li>
                  <li>• Works in any modern web browser</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
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
                  Export HTML
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};