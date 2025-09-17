/**
 * MediaImportPanel - Side panel overlay for importing images and videos to ASCII art
 * 
 * Features:
 * - Overlays existing side panel while keeping canvas visible
 * - Live preview on canvas as settings change
 * - File drop zone with format detection
 * - Size controls with real-time feedback
 * - Processing progress display
 */

import React, { useCallback, useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription } from '../ui/alert';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { 
  Upload, 
  Image as ImageIcon, 
  Video, 
  FileX, 
  Download,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  useImportModal, 
  useImportFile, 
  useImportProcessing, 
  useImportSettings,
  useImportPreview
} from '../../stores/importStore';
import { mediaProcessor, SUPPORTED_IMAGE_FORMATS, SUPPORTED_VIDEO_FORMATS } from '../../utils/mediaProcessor';
import { asciiConverter, DEFAULT_ASCII_CHARS } from '../../utils/asciiConverter';
import { useCanvasStore } from '../../stores/canvasStore';
import { useAnimationStore } from '../../stores/animationStore';
import type { MediaFile } from '../../utils/mediaProcessor';

export function MediaImportPanel() {
  const { isOpen, closeModal } = useImportModal();
  const { selectedFile, setSelectedFile, setProcessedFrames } = useImportFile();
  const { isProcessing, progress, error, setProcessing, setProgress, setError } = useImportProcessing();
  const { settings, updateSettings } = useImportSettings();
  const { frameIndex, setFrameIndex, frames: previewFrames } = useImportPreview();
  
  // Canvas and animation stores
  const setCanvasSize = useCanvasStore(state => state.setCanvasSize);
  const setCanvasData = useCanvasStore(state => state.setCanvasData);
  const clearCanvas = useCanvasStore(state => state.clearCanvas);
  const addFrame = useAnimationStore(state => state.addFrame);
  const setCurrentFrame = useAnimationStore(state => state.setCurrentFrame);
  
  const [dragActive, setDragActive] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [livePreviewEnabled, setLivePreviewEnabled] = useState(true); // Default to enabled

  // Auto-process file when settings change
  useEffect(() => {
    if (!selectedFile || !livePreviewEnabled) return;
    
    const processFileAutomatically = async () => {
      setProcessing(true);
      setProgress(0);
      
      try {
        const options = {
          targetWidth: settings.characterWidth,
          targetHeight: settings.characterHeight,
          maintainAspectRatio: settings.maintainAspectRatio,
          cropMode: settings.cropMode,
          quality: 'medium' as const
        };
        
        let result;
        if (selectedFile.type === 'image') {
          setProgress(25);
          result = await mediaProcessor.processImage(selectedFile, options);
          setProgress(100);
        } else {
          setProgress(10);
          result = await mediaProcessor.processVideo(selectedFile, options);
          setProgress(100);
        }
        
        if (result.success) {
          setProcessedFrames(result.frames);
          setError(null);
        } else {
          setError(result.error || 'Unknown processing error');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process file');
      } finally {
        setProcessing(false);
      }
    };
    
    // Debounce the processing to avoid excessive calls
    const timeoutId = setTimeout(processFileAutomatically, 500);
    return () => clearTimeout(timeoutId);
  }, [
    selectedFile,
    livePreviewEnabled,
    settings.characterWidth,
    settings.characterHeight,
    settings.maintainAspectRatio,
    settings.cropMode,
    setProcessing,
    setProgress,
    setProcessedFrames,
    setError
  ]);

  // Live preview effect - update canvas when settings change
  useEffect(() => {
    if (!livePreviewEnabled || previewFrames.length === 0) return;
    
    const updateLivePreview = async () => {
      try {
        const conversionSettings = {
          characterSet: DEFAULT_ASCII_CHARS,
          characterMappingMode: 'brightness' as const,
          useOriginalColors: settings.useOriginalColors,
          colorQuantization: settings.colorQuantization,
          paletteSize: settings.paletteSize,
          colorMappingMode: settings.colorMappingMode,
          contrastEnhancement: 1,
          brightnessAdjustment: settings.brightness,
          ditherStrength: 0.5
        };

        const result = asciiConverter.convertFrame(previewFrames[frameIndex], conversionSettings);
        
        // Update canvas size if needed
        setCanvasSize(settings.characterWidth, settings.characterHeight);
        
        // Show preview on canvas
        setCanvasData(result.cells);
      } catch (err) {
        console.error('Live preview error:', err);
      }
    };
    
    // Debounce the update to avoid excessive calls
    const timeoutId = setTimeout(updateLivePreview, 300);
    return () => clearTimeout(timeoutId);
  }, [
    livePreviewEnabled, 
    previewFrames, 
    frameIndex, 
    settings.characterWidth, 
    settings.characterHeight,
    settings.useOriginalColors,
    settings.colorQuantization,
    settings.paletteSize,
    settings.colorMappingMode,
    settings.brightness,
    setCanvasSize,
    setCanvasData
  ]);

  // File drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    const mediaFile = mediaProcessor.validateFile(file);
    
    if (!mediaFile) {
      setError(`Unsupported file format: ${file.type}`);
      return;
    }
    
    setSelectedFile(mediaFile);
    setError(null);
    // Live preview enabled by default will trigger auto-processing
  }, [setSelectedFile, setError]);



  // Import frames to canvas
  const handleImportToCanvas = useCallback(async () => {
    if (previewFrames.length === 0) return;
    
    setIsImporting(true);
    try {
      const conversionSettings = {
        characterSet: DEFAULT_ASCII_CHARS,
        characterMappingMode: 'brightness' as const,
        useOriginalColors: settings.useOriginalColors,
        colorQuantization: settings.colorQuantization,
        paletteSize: settings.paletteSize,
        colorMappingMode: settings.colorMappingMode,
        contrastEnhancement: 1,
        brightnessAdjustment: settings.brightness,
        ditherStrength: 0.5
      };

      if (previewFrames.length === 1) {
        // Single image - already on canvas from live preview
        // Just disable live preview mode
        setLivePreviewEnabled(false);
      } else {
        // Multiple frames - create animation
        clearCanvas();
        
        // Add frames for each processed frame
        for (let i = 0; i < previewFrames.length; i++) {
          const result = asciiConverter.convertFrame(previewFrames[i], conversionSettings);
          
          if (i === 0) {
            // First frame - replace current frame
            setCanvasData(result.cells);
          } else {
            // Additional frames - add new frames
            addFrame(undefined, result.cells);
          }
        }
        
        // Go to first frame
        setCurrentFrame(0);
        setLivePreviewEnabled(false);
      }
      
      // Close panel on successful import
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import to canvas');
    } finally {
      setIsImporting(false);
    }
  }, [previewFrames, settings, clearCanvas, setCanvasData, addFrame, setCurrentFrame, closeModal, setError]);

  // Get file icon based on type
  const getFileIcon = (mediaFile: MediaFile) => {
    if (mediaFile.type === 'image') {
      return <ImageIcon className="w-6 h-6 text-blue-500" />;
    } else {
      return <Video className="w-6 h-6 text-purple-500" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-background border-l border-border shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="font-semibold flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Import Media
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={closeModal}
          className="h-6 w-6 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* File Upload Section */}
          {!selectedFile && (
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive 
                  ? 'border-primary bg-primary/10' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
              <h3 className="font-medium mb-2">
                {dragActive ? 'Drop file here' : 'Upload Media'}
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Drag and drop or click to browse
              </p>
              
              <Button variant="outline" size="sm" className="mb-3">
                <label htmlFor="media-file-input" className="cursor-pointer">
                  Choose File
                </label>
              </Button>
              
              <input
                id="media-file-input"
                type="file"
                className="hidden"
                accept={[...SUPPORTED_IMAGE_FORMATS, ...SUPPORTED_VIDEO_FORMATS].join(',')}
                onChange={handleFileInput}
              />
              
              <div className="text-xs text-muted-foreground">
                <p>Images: JPG, PNG, GIF, BMP, WebP, SVG</p>
                <p>Videos: MP4, WebM, OGG, AVI, MOV, WMV</p>
              </div>
            </div>
          )}

          {/* Selected File Info */}
          {selectedFile && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                {getFileIcon(selectedFile)}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{selectedFile.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedFile.type} • {formatFileSize(selectedFile.size)}
                  </p>
                  {isProcessing && (
                    <p className="text-xs text-blue-500 font-medium">
                      Processing...
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    setLivePreviewEnabled(true); // Reset to default
                  }}
                  className="h-6 w-6 p-0"
                >
                  <FileX className="w-3 h-3" />
                </Button>
              </div>
              
              {/* Live Preview Toggle - prominent position */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="live-preview-main"
                    checked={livePreviewEnabled}
                    onCheckedChange={(checked) => setLivePreviewEnabled(!!checked)}
                  />
                  <Label htmlFor="live-preview-main" className="text-sm font-medium">
                    Auto-process & Preview
                  </Label>
                </div>
                {livePreviewEnabled && (
                  <span className="text-xs text-green-500 font-medium">
                    Live
                  </span>
                )}
              </div>
              
              {/* Size Controls */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Canvas Size</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="char-width" className="text-xs">Width</Label>
                    <Input
                      id="char-width"
                      type="number"
                      min="10"
                      max="200"
                      value={settings.characterWidth}
                      onChange={(e) => updateSettings({ characterWidth: parseInt(e.target.value) || 80 })}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="char-height" className="text-xs">Height</Label>
                    <Input
                      id="char-height"
                      type="number"
                      min="5"
                      max="100"
                      value={settings.characterHeight}
                      onChange={(e) => updateSettings({ characterHeight: parseInt(e.target.value) || 24 })}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>
              
              {/* Aspect Ratio Control */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="maintain-aspect"
                  checked={settings.maintainAspectRatio}
                  onCheckedChange={(checked) => updateSettings({ maintainAspectRatio: !!checked })}
                />
                <Label htmlFor="maintain-aspect" className="text-xs">
                  Maintain aspect ratio
                </Label>
              </div>
              
              {/* Crop Mode Selection */}
              <div className="space-y-2">
                <Label className="text-xs">Crop Mode</Label>
                <div className="grid grid-cols-2 gap-1">
                  {['center', 'top', 'left', 'right'].map((mode) => (
                    <Button
                      key={mode}
                      variant={settings.cropMode === mode ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateSettings({ cropMode: mode as any })}
                      className="h-7 text-xs"
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </Button>
                  ))}
                  <Button
                    variant={settings.cropMode === 'bottom' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSettings({ cropMode: 'bottom' })}
                    className="h-7 text-xs col-span-2"
                  >
                    Bottom
                  </Button>
                </div>
              </div>
              
              {/* Processing Progress */}
              {isProcessing && (
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span>Processing...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {/* Preview Controls */}
          {previewFrames.length > 0 && (
            <div className="space-y-4">
              <Separator />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Preview ({previewFrames.length} frame{previewFrames.length !== 1 ? 's' : ''})
                  </Label>
                  {livePreviewEnabled && (
                    <span className="text-xs text-green-500 font-medium">
                      Auto-updating
                    </span>
                  )}
                </div>
                
                {/* Frame Navigation */}
                {previewFrames.length > 1 && (
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFrameIndex(Math.max(0, frameIndex - 1))}
                      disabled={frameIndex === 0}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </Button>
                    <span className="text-xs">
                      Frame {frameIndex + 1} of {previewFrames.length}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFrameIndex(Math.min(previewFrames.length - 1, frameIndex + 1))}
                      disabled={frameIndex === previewFrames.length - 1}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer with Import Button */}
      {previewFrames.length > 0 && (
        <div className="p-4 border-t border-border">
          <Button 
            onClick={handleImportToCanvas}
            disabled={isImporting}
            className="w-full"
            size="sm"
          >
            <Download className="w-3 h-3 mr-2" />
            {isImporting ? 'Importing...' : 'Import to Canvas'}
          </Button>
        </div>
      )}
    </div>
  );
}