import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Progress } from '../ui/progress';
import { Slider } from '../ui/slider';
import { Card, CardContent } from '../ui/card';
import { Video, Loader2, Play, Settings } from 'lucide-react';
import { useExportStore } from '../../stores/exportStore';
import { useExportDataCollector } from '../../utils/exportDataCollector';
import { useProjectMetadataStore } from '../../stores/projectMetadataStore';
import { ExportRenderer } from '../../utils/exportRenderer';
import { calculateExportPixelDimensions, formatPixelDimensions } from '../../utils/exportPixelCalculator';
import type { VideoExportSettings } from '../../types/export';

/**
 * Video Export Dialog
 * Handles MP4/WebM video export with customizable settings
 */
export const VideoExportDialog: React.FC = () => {
  const showExportModal = useExportStore(state => state.showExportModal);
  const activeFormat = useExportStore(state => state.activeFormat);
  const setShowExportModal = useExportStore(state => state.setShowExportModal);
  
  const exportData = useExportDataCollector();
  const projectName = useProjectMetadataStore((state) => state.projectName);
  
  const [videoSettings, setVideoSettings] = useState<VideoExportSettings>({
    sizeMultiplier: 2,
    frameRate: 12,
    frameRange: 'all',
    quality: 'high',
    crf: 24,
    format: 'mp4',
    includeGrid: false,
    loops: 'none'
  });
  
  const [filename, setFilename] = useState(projectName || 'ascii-motion-video');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<{ message: string; progress: number } | null>(null);

  const isOpen = showExportModal && activeFormat === 'mp4';

  // Sync filename with project name when dialog opens
  useEffect(() => {
    if (isOpen && projectName) {
      setFilename(projectName);
    }
  }, [isOpen, projectName]);

  // Check WebCodecs support
  const [supportsWebCodecs, setSupportsWebCodecs] = useState(false);
  
  useEffect(() => {
    // Check if WebCodecs is supported
    const checkWebCodecsSupport = () => {
      return typeof window !== 'undefined' && 
             'VideoEncoder' in window && 
             'VideoFrame' in window;
    };
    
    setSupportsWebCodecs(checkWebCodecsSupport());
  }, []);

  const handleClose = () => {
    setShowExportModal(false);
  };

  const handleExport = async () => {
    if (!exportData) {
      alert('No export data available. Please make sure you have an animation to export.');
      return;
    }

    if (!supportsWebCodecs && videoSettings.format === 'webm') {
      alert('WebCodecs is not supported in your browser. Please try using a modern Chrome, Edge, or Safari browser, or switch to MP4 format.');
      return;
    }

    try {
      setIsExporting(true);
      
      // Create renderer with progress callback
      const renderer = new ExportRenderer((progress) => {
        setProgress(progress);
      });

      // Perform the export
      await renderer.exportVideo(exportData, videoSettings, filename);
      
      // Close dialog on success
      handleClose();
    } catch (error) {
      console.error('Video export failed:', error);
      alert(`Video export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  const handleSettingChange = <K extends keyof VideoExportSettings>(
    key: K,
    value: VideoExportSettings[K]
  ) => {
    setVideoSettings(prev => ({ ...prev, [key]: value }));
  };

  // Calculate estimated duration and file size
  const frameCount = exportData?.frames.length || 1;
  const duration = frameCount / videoSettings.frameRate;
  const estimatedSize = Math.round((frameCount * videoSettings.sizeMultiplier * 50) / 1024); // Rough estimate in KB

  return (
        <Dialog open={isOpen} onOpenChange={setShowExportModal}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border-border/50" aria-describedby={undefined}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 bg-background">
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Export Video
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col max-h-[80vh]">
          {/* Sticky Format Selection */}
          <div className="sticky top-0 z-10 bg-background px-6 py-4 border-b border-border/50 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="filename">File Name</Label>
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="Enter filename"
                disabled={isExporting}
              />
            </div>

            {progress && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{progress.message}</span>
                  <span className="text-sm text-muted-foreground">{Math.round(progress.progress)}%</span>
                </div>
                <Progress value={progress.progress} />
              </div>
            )}
          </div>

          {/* Scrollable Settings */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <Label className="text-sm font-medium">Video Settings</Label>
              </div>

              {/* Format Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="format">Format</Label>
                  <Select
                    value={videoSettings.format}
                    onValueChange={(value: 'webm' | 'mp4') => handleSettingChange('format', value)}
                    disabled={isExporting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="webm">
                        WebM {supportsWebCodecs ? '(Advanced)' : '(Not Supported)'}
                      </SelectItem>
                      <SelectItem value="mp4">MP4 (Recommended)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Quality Control - Different for each format */}
                <div className="space-y-2">
                  {videoSettings.format === 'webm' ? (
                    <>
                      <Label htmlFor="quality">Quality</Label>
                      <Select
                        value={videoSettings.quality}
                        onValueChange={(value: 'high' | 'medium' | 'low') => handleSettingChange('quality', value)}
                        disabled={isExporting}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  ) : (
                    <>
                      <Label htmlFor="crf">Quality (CRF: {videoSettings.crf})</Label>
                      <div className="px-2">
                        <Slider
                          value={videoSettings.crf}
                          onValueChange={(value) => handleSettingChange('crf', value)}
                          max={51}
                          min={0}
                          step={1}
                          disabled={isExporting}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Higher Quality (0)</span>
                          <span>Lower Quality (51)</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loops">Loop Animation</Label>
                  <Select
                    value={videoSettings.loops}
                    onValueChange={(value: 'none' | '2x' | '4x' | '8x') => handleSettingChange('loops', value)}
                    disabled={isExporting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Looping</SelectItem>
                      <SelectItem value="2x">Loop 2x</SelectItem>
                      <SelectItem value="4x">Loop 4x</SelectItem>
                      <SelectItem value="8x">Loop 8x</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Frame Rate and Size */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frameRate">Frame Rate (FPS)</Label>
                  <Select
                    value={videoSettings.frameRate.toString()}
                    onValueChange={(value) => handleSettingChange('frameRate', parseInt(value))}
                    disabled={isExporting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="8">8 FPS</SelectItem>
                      <SelectItem value="12">12 FPS</SelectItem>
                      <SelectItem value="15">15 FPS</SelectItem>
                      <SelectItem value="24">24 FPS</SelectItem>
                      <SelectItem value="30">30 FPS</SelectItem>
                      <SelectItem value="60">60 FPS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sizeMultiplier">Resolution</Label>
                  <Select
                    value={videoSettings.sizeMultiplier.toString()}
                    onValueChange={(value) => handleSettingChange('sizeMultiplier', parseInt(value) as 1 | 2 | 4)}
                    disabled={isExporting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1x (Standard)</SelectItem>
                      <SelectItem value="2">2x (High-DPI)</SelectItem>
                      <SelectItem value="4">4x (Ultra High)</SelectItem>
                    </SelectContent>
                  </Select>
                  {exportData && (
                    <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Output size:</span>
                        <span className="font-mono">
                          {formatPixelDimensions(calculateExportPixelDimensions({
                            gridWidth: exportData.canvasDimensions.width,
                            gridHeight: exportData.canvasDimensions.height,
                            sizeMultiplier: videoSettings.sizeMultiplier,
                            fontSize: exportData.typography.fontSize,
                            characterSpacing: exportData.typography.characterSpacing,
                            lineSpacing: exportData.typography.lineSpacing
                          }))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Grid Option */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeGrid"
                  checked={videoSettings.includeGrid}
                  onCheckedChange={(checked: boolean) => handleSettingChange('includeGrid', checked)}
                  disabled={isExporting}
                />
                <Label htmlFor="includeGrid" className="text-sm">
                  Include grid lines
                </Label>
              </div>
            </div>

            {/* Video Preview Info */}
            <Card className="bg-muted/50 border-border/50">
              <CardContent className="pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frames:</span>
                    <span>{frameCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{duration.toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Est. Size:</span>
                    <span>{estimatedSize < 1024 ? `${estimatedSize}KB` : `${(estimatedSize/1024).toFixed(1)}MB`}</span>
                  </div>
                  {!supportsWebCodecs && (
                    <div className="text-amber-600 text-xs mt-2">
                      ⚠️ WebCodecs not supported. Video export may use fallback encoding.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sticky Action Buttons */}
          <div className="sticky bottom-0 z-10 bg-background px-6 py-4 border-t border-border/50 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting || !exportData || !filename.trim()}
              className="gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Export Video
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};