/**
 * MediaImportModal - Modal component for importing images and videos to ASCII art
 * 
 * Features:
 * - File drop zone with format detection
 * - Size controls (character width/height)
 * - Basic preview functionality
 * - Processing progress display
 */

import React, { useCallback, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Upload, 
  Image as ImageIcon, 
  Video, 
  FileX, 
  Settings,
  Eye,
  Download
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

export function MediaImportModal() {
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
  }, [setSelectedFile, setError]);

  // Process selected file
  const handleProcessFile = useCallback(async () => {
    if (!selectedFile) return;
    
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
  }, [selectedFile, settings, setProcessing, setProgress, setProcessedFrames, setError]);

  // Get file icon based on type
  const getFileIcon = (mediaFile: MediaFile) => {
    if (mediaFile.type === 'image') {
      return <ImageIcon className="w-8 h-8 text-blue-500" />;
    } else {
      return <Video className="w-8 h-8 text-purple-500" />;
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

  // Import frames to canvas
  const handleImportToCanvas = useCallback(async () => {
    if (previewFrames.length === 0) return;
    
    setIsImporting(true);
    try {
      // Convert frames to ASCII art
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

      // Process first frame to get canvas dimensions
      const firstFrameResult = asciiConverter.convertFrame(previewFrames[0], conversionSettings);
      
      // Resize canvas to match image dimensions
      setCanvasSize(settings.characterWidth, settings.characterHeight);
      
      if (previewFrames.length === 1) {
        // Single image - import to current canvas
        clearCanvas();
        setCanvasData(firstFrameResult.cells);
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
      }
      
      // Close modal on successful import
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import to canvas');
    } finally {
      setIsImporting(false);
    }
  }, [previewFrames, settings, setCanvasSize, clearCanvas, setCanvasData, addFrame, setCurrentFrame, closeModal, setError]);

  return (
    <Dialog open={isOpen} onOpenChange={closeModal}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Image/Video to ASCII
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* File Upload Section */}
          {!selectedFile && (
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-primary bg-primary/10' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {dragActive ? 'Drop file here' : 'Upload Image or Video'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop a file here, or click to browse
              </p>
              
              <Button variant="outline" className="mb-4">
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
                <p>Supported formats:</p>
                <p>Images: JPG, PNG, GIF, BMP, WebP, SVG</p>
                <p>Videos: MP4, WebM, OGG, AVI, MOV, WMV</p>
              </div>
            </div>
          )}

          {/* Selected File Info */}
          {selectedFile && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                {getFileIcon(selectedFile)}
                <div className="flex-1">
                  <h3 className="font-semibold">{selectedFile.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedFile.type} • {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                >
                  <FileX className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Size Controls */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="char-width">Character Width</Label>
                  <Input
                    id="char-width"
                    type="number"
                    min="10"
                    max="200"
                    value={settings.characterWidth}
                    onChange={(e) => updateSettings({ characterWidth: parseInt(e.target.value) || 80 })}
                  />
                </div>
                <div>
                  <Label htmlFor="char-height">Character Height</Label>
                  <Input
                    id="char-height"
                    type="number"
                    min="5"
                    max="100"
                    value={settings.characterHeight}
                    onChange={(e) => updateSettings({ characterHeight: parseInt(e.target.value) || 24 })}
                  />
                </div>
              </div>
              
              {/* Aspect Ratio Control */}
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="maintain-aspect"
                  checked={settings.maintainAspectRatio}
                  onCheckedChange={(checked) => updateSettings({ maintainAspectRatio: !!checked })}
                />
                <Label htmlFor="maintain-aspect" className="text-sm">
                  Maintain aspect ratio
                </Label>
              </div>
              
              {/* Crop Mode Selection */}
              <div className="mb-4">
                <Label>Crop Mode</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {(['center', 'top', 'bottom'] as const).map((mode) => (
                    <Button
                      key={mode}
                      variant={settings.cropMode === mode ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateSettings({ cropMode: mode })}
                      className="capitalize"
                    >
                      {mode}
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(['left', 'right'] as const).map((mode) => (
                    <Button
                      key={mode}
                      variant={settings.cropMode === mode ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateSettings({ cropMode: mode })}
                      className="capitalize"
                    >
                      {mode}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Process Button */}
              <Button
                onClick={handleProcessFile}
                disabled={isProcessing}
                className="w-full mb-4"
              >
                <Settings className="w-4 h-4 mr-2" />
                {isProcessing ? 'Processing...' : 'Process File'}
              </Button>
              
              {/* Processing Progress */}
              {isProcessing && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Processing...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Preview Section */}
          {previewFrames.length > 0 && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Preview ({previewFrames.length} frame{previewFrames.length !== 1 ? 's' : ''})
                </h3>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleImportToCanvas}
                  disabled={isImporting}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isImporting ? 'Importing...' : 'Import to Canvas'}
                </Button>
              </div>
              
              {/* Frame Navigation */}
              {previewFrames.length > 1 && (
                <div className="flex items-center gap-2 mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFrameIndex(Math.max(0, frameIndex - 1))}
                    disabled={frameIndex === 0}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Frame {frameIndex + 1} of {previewFrames.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFrameIndex(Math.min(previewFrames.length - 1, frameIndex + 1))}
                    disabled={frameIndex === previewFrames.length - 1}
                  >
                    Next
                  </Button>
                </div>
              )}
              
              {/* Preview Canvas */}
              <div className="bg-muted rounded border overflow-auto max-h-96">
                <canvas
                  ref={(canvas) => {
                    if (canvas && previewFrames[frameIndex]) {
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        const frame = previewFrames[frameIndex];
                        canvas.width = frame.canvas.width;
                        canvas.height = frame.canvas.height;
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(frame.canvas, 0, 0);
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}