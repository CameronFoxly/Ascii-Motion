import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Film, Download, Settings, Clock, Zap } from 'lucide-react';
import { useExportStore } from '../../stores/exportStore';

/**
 * MP4 Export Dialog
 * Handles MP4-specific export settings and file naming
 */
export const Mp4ExportDialog: React.FC = () => {
  const activeFormat = useExportStore(state => state.activeFormat);
  const showExportModal = useExportStore(state => state.showExportModal);
  const setShowExportModal = useExportStore(state => state.setShowExportModal);
  const videoSettings = useExportStore(state => state.videoSettings);
  const setVideoSettings = useExportStore(state => state.setVideoSettings);

  const [filename, setFilename] = useState('ascii-motion-animation');

  const isOpen = showExportModal && activeFormat === 'mp4';

  const handleClose = () => {
    setShowExportModal(false);
  };

  const handleExport = () => {
    console.log('Exporting MP4 with settings:', {
      filename: `${filename}.mp4`,
      settings: videoSettings
    });
    // Export logic will be implemented later
    handleClose();
  };

  const handleSizeChange = (multiplier: string) => {
    setVideoSettings({ sizeMultiplier: parseInt(multiplier) as 1 | 2 });
  };

  const handleFrameRateChange = (frameRate: string) => {
    setVideoSettings({ frameRate: parseInt(frameRate) as 12 | 24 | 30 | 60 });
  };

  const handleQualityChange = (quality: string) => {
    setVideoSettings({ quality: quality as 'low' | 'medium' | 'high' });
  };

  const getQualityDescription = (quality: string) => {
    switch (quality) {
      case 'low': return 'Smaller file size';
      case 'medium': return 'Balanced quality/size';
      case 'high': return 'Best quality, larger file';
      default: return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setShowExportModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="w-5 h-5" />
            Export MP4 Video
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
                .mp4
              </Badge>
            </div>
          </div>

          {/* Export Settings */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4" />
                <span className="text-sm font-medium">Video Settings</span>
              </div>

              {/* Size Multiplier */}
              <div className="space-y-2">
                <Label htmlFor="size-multiplier">Size Multiplier</Label>
                <Select
                  value={videoSettings.sizeMultiplier.toString()}
                  onValueChange={handleSizeChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1x (Original)</SelectItem>
                    <SelectItem value="2">2x (Double)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Higher multipliers create larger video resolution
                </p>
              </div>

              {/* Frame Rate */}
              <div className="space-y-2">
                <Label htmlFor="frame-rate" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Frame Rate
                </Label>
                <Select
                  value={videoSettings.frameRate.toString()}
                  onValueChange={handleFrameRateChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 FPS (Animation)</SelectItem>
                    <SelectItem value="24">24 FPS (Cinema)</SelectItem>
                    <SelectItem value="30">30 FPS (Standard)</SelectItem>
                    <SelectItem value="60">60 FPS (Smooth)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Higher frame rates create smoother motion
                </p>
              </div>

              {/* Quality */}
              <div className="space-y-2">
                <Label htmlFor="quality" className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Quality
                </Label>
                <Select
                  value={videoSettings.quality}
                  onValueChange={handleQualityChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {getQualityDescription(videoSettings.quality)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Preview Info */}
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Animation will be exported as
            </p>
            <p className="text-sm font-medium">
              {filename}.mp4 ({videoSettings.sizeMultiplier}x, {videoSettings.frameRate}fps, {videoSettings.quality})
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export MP4
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};