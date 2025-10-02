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
import { Slider } from '../ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { 
  Collapsible,
  CollapsibleContent,
} from '../ui/collapsible';
import { CollapsibleHeader } from '../common/CollapsibleHeader';
import { PanelSeparator } from '../common/PanelSeparator';
import { 
  Upload, 
  Image as ImageIcon, 
  Video, 
  FileX, 
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Link,
  Eye,
  Move3D,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { PANEL_ANIMATION } from '../../constants';
import { Spinner } from '../common/Spinner';
import { 
  useImportModal, 
  useImportFile, 
  useImportProcessing, 
  useImportSettings,
  useImportPreview,
  useImportUIState,
  useImportSessionState
} from '../../stores/importStore';
import { mediaProcessor, SUPPORTED_IMAGE_FORMATS, SUPPORTED_VIDEO_FORMATS } from '../../utils/mediaProcessor';
import { asciiConverter } from '../../utils/asciiConverter';
import { useCanvasStore } from '../../stores/canvasStore';
import { useAnimationStore } from '../../stores/animationStore';
import { usePreviewStore } from '../../stores/previewStore';
import { useCharacterPaletteStore } from '../../stores/characterPaletteStore';
import { usePaletteStore } from '../../stores/paletteStore';
import { useToolStore } from '../../stores/toolStore';
import { CharacterMappingSection } from './CharacterMappingSection';
import { TextColorMappingSection } from './TextColorMappingSection';
import { BackgroundColorMappingSection } from './BackgroundColorMappingSection';
import { PreprocessingSection } from './PreprocessingSection';
import type { MediaFile } from '../../utils/mediaProcessor';
import type { Cell } from '../../types';

export function MediaImportPanel() {
  const { isOpen, closeModal } = useImportModal();
  const { selectedFile, setSelectedFile, setProcessedFrames } = useImportFile();
  const { isProcessing, progress, error, setProcessing, setProgress, setError } = useImportProcessing();
  const { settings, updateSettings } = useImportSettings();
  const { frameIndex, setFrameIndex, frames: previewFrames } = useImportPreview();
  const { uiState, updateUIState } = useImportUIState();
  const { hasSessionSettings } = useImportSessionState();
  
  // Character palette integration
  const activePalette = useCharacterPaletteStore(state => state.activePalette);
  const mappingMethod = useCharacterPaletteStore(state => state.mappingMethod);
  const invertDensity = useCharacterPaletteStore(state => state.invertDensity);
  const characterSpacing = useCharacterPaletteStore(state => state.characterSpacing);
  
  // Tool store integration for default colors
  const selectedColor = useToolStore(state => state.selectedColor);
  
  // Canvas and animation stores
  const canvasWidth = useCanvasStore(state => state.width);
  const canvasHeight = useCanvasStore(state => state.height);
  const setCanvasData = useCanvasStore(state => state.setCanvasData);
  const clearCanvas = useCanvasStore(state => state.clearCanvas);
  const addFrame = useAnimationStore(state => state.addFrame);
  const setCurrentFrame = useAnimationStore(state => state.setCurrentFrame);
  const updateFrameDuration = useAnimationStore(state => state.updateFrameDuration);
  const importFramesOverwrite = useAnimationStore(state => state.importFramesOverwrite);
  const importFramesAppend = useAnimationStore(state => state.importFramesAppend);
  const currentFrameIndex = useAnimationStore(state => state.currentFrameIndex);
  
  // Preview store for independent preview overlay
  const { setPreviewData, clearPreview, setPreviewActive } = usePreviewStore();
  
  const [dragActive, setDragActive] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [originalImageAspectRatio, setOriginalImageAspectRatio] = useState<number | null>(null);
  
  // Use persistent UI state from store
  const { 
    importMode, 
    livePreviewEnabled, 
    previewSectionOpen, 
    positionSectionOpen 
  } = uiState;
  
  const setImportMode = (mode: 'overwrite' | 'append') => 
    updateUIState({ importMode: mode });
  const setLivePreviewEnabled = (enabled: boolean) => 
    updateUIState({ livePreviewEnabled: enabled });
  const setPreviewSectionOpen = (open: boolean) => 
    updateUIState({ previewSectionOpen: open });
  const setPositionSectionOpen = (open: boolean) => 
    updateUIState({ positionSectionOpen: open });
  
  // Preview state management
  const [isPreviewActive, setIsPreviewActive] = useState(false);

  // Handle linked sizing when maintain aspect ratio is enabled
  const handleWidthChange = useCallback((value: number) => {
    if (settings.maintainAspectRatio && originalImageAspectRatio) {
      // Apply character aspect ratio compensation (characters are 0.6x as wide as tall)
      // To make image appear with correct aspect ratio, we need MORE width in character count
      const CHARACTER_ASPECT_RATIO = 0.6;
      const characterCompensatedAspectRatio = originalImageAspectRatio / CHARACTER_ASPECT_RATIO;
      
      const newHeight = Math.ceil(value / characterCompensatedAspectRatio);
      // Don't constrain to canvas - allow larger dimensions for proper aspect ratio
      updateSettings({ 
        characterWidth: value,
        characterHeight: newHeight
      });
    } else {
      updateSettings({ characterWidth: value });
    }
  }, [settings.maintainAspectRatio, originalImageAspectRatio, updateSettings]);

  const handleHeightChange = useCallback((value: number) => {
    if (settings.maintainAspectRatio && originalImageAspectRatio) {
      // Apply character aspect ratio compensation (characters are 0.6x as wide as tall)
      // To make image appear with correct aspect ratio, we need MORE width in character count
      const CHARACTER_ASPECT_RATIO = 0.6;
      const characterCompensatedAspectRatio = originalImageAspectRatio / CHARACTER_ASPECT_RATIO;
      
      const newWidth = Math.ceil(value * characterCompensatedAspectRatio);
      // Don't constrain to canvas - allow larger dimensions for proper aspect ratio
      updateSettings({ 
        characterWidth: newWidth,
        characterHeight: value
      });
    } else {
      updateSettings({ characterHeight: value });
    }
  }, [settings.maintainAspectRatio, originalImageAspectRatio, updateSettings]);

  // Preview management functions
  const startPreview = useCallback(() => {
    if (!isPreviewActive) {
      setIsPreviewActive(true);
      // Activate preview overlay
      setPreviewActive(true);
    }
  }, [isPreviewActive, setPreviewActive]);

  const endPreview = useCallback(() => {
    if (isPreviewActive) {
      // Clear preview overlay
      clearPreview();
      setPreviewActive(false);
      // Clear local state
      setIsPreviewActive(false);
    }
  }, [isPreviewActive, clearPreview, setPreviewActive]);

  // Position cells on canvas based on alignment settings
  const positionCellsOnCanvas = useCallback((cells: Map<string, any>, imageWidth: number, imageHeight: number) => {

    
    // Calculate offset based on alignment
    let offsetX = 0;
    let offsetY = 0;
    
    switch (settings.cropMode) {
      case 'top-left':
        offsetX = 0;
        offsetY = 0;
        break;
      case 'top':
        offsetX = Math.floor((canvasWidth - imageWidth) / 2);
        offsetY = 0;
        break;
      case 'top-right':
        offsetX = canvasWidth - imageWidth;
        offsetY = 0;
        break;
      case 'left':
        offsetX = 0;
        offsetY = Math.floor((canvasHeight - imageHeight) / 2);
        break;
      case 'center':
        offsetX = Math.floor((canvasWidth - imageWidth) / 2);
        offsetY = Math.floor((canvasHeight - imageHeight) / 2);
        break;
      case 'right':
        offsetX = canvasWidth - imageWidth;
        offsetY = Math.floor((canvasHeight - imageHeight) / 2);
        break;
      case 'bottom-left':
        offsetX = 0;
        offsetY = canvasHeight - imageHeight;
        break;
      case 'bottom':
        offsetX = Math.floor((canvasWidth - imageWidth) / 2);
        offsetY = canvasHeight - imageHeight;
        break;
      case 'bottom-right':
        offsetX = canvasWidth - imageWidth;
        offsetY = canvasHeight - imageHeight;
        break;
    }
    
    // Apply nudge adjustments
    offsetX += settings.nudgeX;
    offsetY += settings.nudgeY;
    

    
    // For images larger than canvas, we need different logic
    // Don't constrain offset to positive values - allow negative offsets to show center portions
    if (imageWidth > canvasWidth || imageHeight > canvasHeight) {
      // For oversized images, positioning shows different parts of the image
      // No additional constraints needed - let the cell bounds check below handle visibility
    } else {
      // For images smaller than canvas, allow some nudging beyond bounds but keep at least part visible
      // Allow image to be nudged up to 50% off-screen while keeping some portion visible
      const maxNegativeX = Math.floor(imageWidth * -0.5);
      const maxPositiveX = canvasWidth - Math.floor(imageWidth * 0.5);
      const maxNegativeY = Math.floor(imageHeight * -0.5);
      const maxPositiveY = canvasHeight - Math.floor(imageHeight * 0.5);
      
      offsetX = Math.max(maxNegativeX, Math.min(offsetX, maxPositiveX));
      offsetY = Math.max(maxNegativeY, Math.min(offsetY, maxPositiveY));
    }
    

    
    const positionedCells = new Map();
    cells.forEach((cell, originalKey) => {
      // Parse original coordinates from the key (format: "x,y")
      const [origX, origY] = originalKey.split(',').map(Number);
      
      const newCell = {
        ...cell,
        x: origX + offsetX,
        y: origY + offsetY
      };
      
      // Only add cell if it's within canvas bounds
      if (newCell.x >= 0 && newCell.x < canvasWidth && newCell.y >= 0 && newCell.y < canvasHeight) {
        const newKey = `${newCell.x},${newCell.y}`;
        positionedCells.set(newKey, newCell);
      }
    });
    

    
    return positionedCells;
  }, [canvasWidth, canvasHeight, settings.cropMode, settings.nudgeX, settings.nudgeY]);

  // Get palette data for dependencies (use individual arrays to avoid getAllPalettes() caching issues)
  const palettes = usePaletteStore(state => state.palettes);
  const customPalettes = usePaletteStore(state => state.customPalettes);
  
  // Create conversion settings helper function
  const createConversionSettings = useCallback(() => {
    const allPalettes = [...palettes, ...customPalettes];
    const textColorPalette = settings.enableTextColorMapping && settings.textColorPaletteId 
      ? allPalettes.find((p: any) => p.id === settings.textColorPaletteId)?.colors.map((c: any) => c.value) || []
      : [];
    const backgroundColorPalette = settings.enableBackgroundColorMapping && settings.backgroundColorPaletteId 
      ? allPalettes.find((p: any) => p.id === settings.backgroundColorPaletteId)?.colors.map((c: any) => c.value) || []
      : [];

    return {
      // Character mapping
      enableCharacterMapping: settings.enableCharacterMapping,
      characterPalette: activePalette,
      mappingMethod: mappingMethod,
      invertDensity: invertDensity,
      
      // Text color mapping 
      enableTextColorMapping: settings.enableTextColorMapping,
      textColorPalette: textColorPalette,
      textColorMappingMode: settings.textColorMappingMode,
      defaultTextColor: selectedColor,
      
      // Background color mapping
      enableBackgroundColorMapping: settings.enableBackgroundColorMapping,
      backgroundColorPalette: backgroundColorPalette,
      backgroundColorMappingMode: settings.backgroundColorMappingMode,
      
      // Legacy settings
      useOriginalColors: settings.useOriginalColors,
      colorQuantization: settings.colorQuantization,
      paletteSize: settings.paletteSize,
      colorMappingMode: settings.colorMappingMode,
      
      // Preprocessing settings
      contrastEnhancement: 1 + (settings.contrast / 100), // Convert -100-100 to 0-2
      brightnessAdjustment: settings.brightness,
      saturationAdjustment: settings.saturation,
      highlightsAdjustment: settings.highlights,
      shadowsAdjustment: settings.shadows,
      midtonesAdjustment: settings.midtones,
      blurAmount: settings.blur,
      sharpenAmount: settings.sharpen,
      ditherStrength: 0.5
    };
  }, [
    settings.enableCharacterMapping,
    settings.enableTextColorMapping, 
    settings.textColorPaletteId,
    settings.textColorMappingMode,
    settings.enableBackgroundColorMapping,
    settings.backgroundColorPaletteId,
    settings.backgroundColorMappingMode,
    settings.useOriginalColors,
    settings.colorQuantization,
    settings.paletteSize,
    settings.colorMappingMode,
    settings.brightness,
    settings.contrast,
    settings.saturation,
    settings.highlights,
    settings.shadows,
    settings.midtones,
    settings.blur,
    settings.sharpen,
    activePalette,
    mappingMethod,
    invertDensity,
    selectedColor,
    palettes,
    customPalettes
  ]);

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
          maintainAspectRatio: false, // Never crop - just resize to exact dimensions
          cropMode: 'center' as const, // Not used since maintainAspectRatio is false
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
    // Removed maintainAspectRatio and cropMode since they don't affect processing anymore
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
        // Start preview mode (stores original data if not already started)
        startPreview();
        
        const conversionSettings = createConversionSettings();

        const result = asciiConverter.convertFrame(previewFrames[frameIndex], conversionSettings);
        
        // Show preview on canvas overlay (positioned based on alignment)
        const positionedCells = positionCellsOnCanvas(result.cells, settings.characterWidth, settings.characterHeight);
        setPreviewData(positionedCells);
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
    settings.cropMode, // Added back since it affects positioning
    settings.nudgeX, // FIXED: Added nudge dependencies for position updates
    settings.nudgeY, // FIXED: Added nudge dependencies for position updates
    settings.useOriginalColors,
    settings.colorQuantization,
    settings.paletteSize,
    settings.colorMappingMode,
    settings.brightness,
    settings.contrast,
    settings.saturation,
    settings.highlights,
    settings.shadows,
    settings.midtones,
    settings.blur,
    settings.sharpen,
    // Character mapping settings
    settings.enableCharacterMapping,
    activePalette,
    mappingMethod,
    invertDensity,
    characterSpacing,
    // Color mapping settings
    settings.enableTextColorMapping,
    settings.textColorPaletteId,
    settings.textColorMappingMode,
    settings.enableBackgroundColorMapping,
    settings.backgroundColorPaletteId,
    settings.backgroundColorMappingMode,
    selectedColor,
    palettes,
    customPalettes,
    setCanvasData,
    positionCellsOnCanvas,
    startPreview
  ]);

  // End preview when live preview is disabled or component unmounts
  useEffect(() => {
    if (!livePreviewEnabled && isPreviewActive) {
      endPreview();
    }
  }, [livePreviewEnabled, isPreviewActive, endPreview]);

  // End preview when modal is closed
  useEffect(() => {
    if (!isOpen && isPreviewActive) {
      endPreview();
    }
  }, [isOpen, isPreviewActive, endPreview]);

  // End preview when modal closes
  useEffect(() => {
    if (!isOpen && isPreviewActive) {
      endPreview();
    }
  }, [isOpen, isPreviewActive, endPreview]);

  // File drop handlers
  const handleFileSelect = useCallback(async (file: File) => {
    const mediaFile = mediaProcessor.validateFile(file);
    
    if (!mediaFile) {
      setError(`Unsupported file format: ${file.type}`);
      return;
    }
    
    // Calculate optimal image size based on canvas dimensions and file dimensions
    try {
      let imageWidth = 0;
      let imageHeight = 0;
      
      if (mediaFile.type === 'image') {
        // Get image dimensions
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise((resolve, reject) => {
          img.onload = () => {
            imageWidth = img.width;
            imageHeight = img.height;
            resolve(void 0);
          };
          img.onerror = reject;
        });
        URL.revokeObjectURL(img.src);
      } else {
        // Get video dimensions from metadata
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(file);
        
        await new Promise((resolve) => {
          video.onloadedmetadata = () => {
            imageWidth = video.videoWidth;
            imageHeight = video.videoHeight;
            resolve(void 0);
          };
          video.onerror = () => {
            // Fallback to default dimensions if video loading fails
            imageWidth = 1920;
            imageHeight = 1080;
            resolve(void 0);
          };
        });
        
        URL.revokeObjectURL(video.src);
      }
      
      // Calculate optimal character dimensions
      const imageAspectRatio = imageWidth / imageHeight;
      setOriginalImageAspectRatio(imageAspectRatio);
      
      // Apply character aspect ratio compensation for initial sizing
      // Characters are 0.6x as wide as tall, so we need MORE width to maintain visual aspect ratio
      const CHARACTER_ASPECT_RATIO = 0.6;
      const characterCompensatedAspectRatio = imageAspectRatio / CHARACTER_ASPECT_RATIO;
      const canvasAspectRatio = canvasWidth / canvasHeight;
      
      let targetWidth: number;
      let targetHeight: number;
      
      if (characterCompensatedAspectRatio > canvasAspectRatio) {
        // Image is wider than canvas - fit to canvas width
        targetWidth = canvasWidth;
        targetHeight = Math.round(canvasWidth / characterCompensatedAspectRatio);
      } else {
        // Image is taller than canvas - fit to canvas height  
        targetHeight = canvasHeight;
        targetWidth = Math.round(canvasHeight * characterCompensatedAspectRatio);
      }
      
      // Ensure we don't exceed canvas bounds
      targetWidth = Math.min(targetWidth, canvasWidth);
      targetHeight = Math.min(targetHeight, canvasHeight);
      
      // Only auto-calculate dimensions if user hasn't saved preferences from previous session
      if (!hasSessionSettings) {
        updateSettings({
          characterWidth: targetWidth,
          characterHeight: targetHeight,
          maintainAspectRatio: true // Ensure aspect ratio is maintained
        });
      }
      
    } catch (error) {

    }
    
    setSelectedFile(mediaFile);
    setError(null);
    // Live preview enabled by default will trigger auto-processing
  }, [setSelectedFile, setError, canvasWidth, canvasHeight, updateSettings, setOriginalImageAspectRatio]);

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
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Import frames to canvas
  const handleImportToCanvas = useCallback(async () => {
    if (previewFrames.length === 0) return;
    
    // End preview mode before importing (restores original canvas data)
    endPreview();
    
    setIsImporting(true);
    try {
      const conversionSettings = createConversionSettings();

      if (previewFrames.length === 1) {
        // Single image - always replace current frame
        const result = asciiConverter.convertFrame(previewFrames[0], conversionSettings);
        const positionedCells = positionCellsOnCanvas(result.cells, settings.characterWidth, settings.characterHeight);
        clearCanvas();
        setCanvasData(positionedCells);
        setLivePreviewEnabled(false);
      } else {
        // Multiple frames - use import mode
        
        // Convert all frames first
        const frameData: Array<{ data: Map<string, Cell>, duration: number }> = [];
        for (let i = 0; i < previewFrames.length; i++) {
          const result = asciiConverter.convertFrame(previewFrames[i], conversionSettings);
          const positionedCells = positionCellsOnCanvas(result.cells, settings.characterWidth, settings.characterHeight);
          const frameDuration = previewFrames[i].frameDuration || 100; // Default duration if not available
          
          frameData.push({
            data: positionedCells,
            duration: frameDuration
          });
        }
        
        // Apply import mode
        if (importMode === 'overwrite') {
          // Overwrite mode - replace frames starting from current position
          importFramesOverwrite(frameData, currentFrameIndex);
          // Manually update canvas with first imported frame data after store update
          setTimeout(() => {
            setCanvasData(frameData[0].data);
          }, 0);
        } else {
          // Append mode - clear canvas and add frames to end
          clearCanvas();
          importFramesAppend(frameData);
          // Canvas will be updated by the animation store when it changes current frame
        }
        
        setLivePreviewEnabled(false);
      }
      
      // Close panel on successful import
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import to canvas');
    } finally {
      setIsImporting(false);
    }
  }, [previewFrames, settings, clearCanvas, setCanvasData, addFrame, setCurrentFrame, updateFrameDuration, closeModal, setError, positionCellsOnCanvas, importMode, importFramesOverwrite, importFramesAppend, currentFrameIndex, endPreview]);

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

  return (
    <div className={cn(
      "fixed inset-y-0 right-0 w-80 bg-background border-l border-border shadow-lg z-50 flex flex-col overflow-hidden",
      PANEL_ANIMATION.TRANSITION,
      isOpen ? "translate-x-0" : "translate-x-full"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <Upload className="w-3 h-3" />
          Import Media
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={closeModal}
          className="h-6 w-6 p-0"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      <ScrollArea className="flex-1 overflow-x-hidden">
        <div className="p-3 space-y-3">
          {/* File Upload Section */}
          {!selectedFile && (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
              <div className="w-full">
                <div
                  className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                    dragActive 
                      ? 'border-primary bg-primary/10' 
                      : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                  onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
              <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <h3 className="text-sm font-medium mb-1">
                {dragActive ? 'Drop file here' : 'Upload Media'}
              </h3>
              <p className="text-xs text-muted-foreground mb-2">
                Drag and drop or click to browse
              </p>
              
              <Button variant="outline" size="sm" className="h-8 mb-2">
                <label htmlFor="media-file-input" className="cursor-pointer text-xs">
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
              
              <div className="text-xs text-muted-foreground space-y-0">
                <p>Images: JPG, PNG, GIF, BMP, WebP, SVG</p>
                <p>Videos: MP4, WebM, OGG, AVI, MOV, WMV</p>
              </div>
                </div>
              </div>
            </div>
          )}

          {/* Selected File Info */}
          {selectedFile && (
            <>
              <div className="flex items-center gap-2 p-2 border rounded-lg">
                {getFileIcon(selectedFile)}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-medium truncate">{selectedFile.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedFile.type} • {formatFileSize(selectedFile.size)}
                  </p>
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
              
              {/* Preview Section */}
              <Collapsible open={previewSectionOpen} onOpenChange={setPreviewSectionOpen}>
                <CollapsibleHeader isOpen={previewSectionOpen}>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <span>Preview</span>
                  </div>
                </CollapsibleHeader>
                
                <CollapsibleContent className="collapsible-content">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="live-preview-main"
                          checked={livePreviewEnabled}
                          onCheckedChange={(checked) => setLivePreviewEnabled(!!checked)}
                        />
                        <Label htmlFor="live-preview-main" className="text-xs">
                          Auto-process & Preview
                        </Label>
                      </div>
                      {livePreviewEnabled && (
                        <div className="flex items-center gap-1">
                          {isProcessing ? (
                            <Spinner size="xs" variant="primary" />
                          ) : (
                            <span className="text-xs text-green-500 font-medium">
                              Live
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Frame Navigation */}
                    {previewFrames.length > 0 && (
                      <div className="p-2 bg-muted/30 rounded-lg">
                        {previewFrames.length === 1 && (
                          <div className="flex items-center justify-center">
                            <span className="text-xs">
                              Preview frame 1 of 1
                            </span>
                          </div>
                        )}
                        
                        {previewFrames.length > 1 && (
                          <TooltipProvider>
                            <div className="flex items-center justify-between gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setFrameIndex(0)}
                                    disabled={frameIndex === 0}
                                    className="h-6 w-6 p-0"
                                  >
                                    <ChevronsLeft className="w-3 h-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>First frame</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setFrameIndex(Math.max(0, frameIndex - 1))}
                                    disabled={frameIndex === 0}
                                    className="h-6 w-6 p-0"
                                  >
                                    <ChevronLeft className="w-3 h-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Previous frame</p>
                                </TooltipContent>
                              </Tooltip>
                              <span className="text-xs flex-1 text-center">
                                Preview Frame {frameIndex + 1} of {previewFrames.length}
                              </span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setFrameIndex(Math.min(previewFrames.length - 1, frameIndex + 1))}
                                    disabled={frameIndex === previewFrames.length - 1}
                                    className="h-6 w-6 p-0"
                                  >
                                    <ChevronRight className="w-3 h-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Next frame</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setFrameIndex(previewFrames.length - 1)}
                                    disabled={frameIndex === previewFrames.length - 1}
                                    className="h-6 w-6 p-0"
                                  >
                                    <ChevronsRight className="w-3 h-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Last frame</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TooltipProvider>
                        )}

                        {/* Video Scrubbing Slider */}
                        {previewFrames.length > 1 && (
                          <div className="mt-3 space-y-2">
                            <div className="relative">
                              <Slider
                                value={frameIndex}
                                onValueChange={(value) => setFrameIndex(value)}
                                min={0}
                                max={previewFrames.length - 1}
                                step={1}
                                className="w-full"
                              />
                              {/* Tick marks for frames */}
                              <div className="absolute top-6 left-0 right-0 pointer-events-none">
                                {Array.from({ length: previewFrames.length }, (_, i) => {
                                  // Slider thumb is 12px wide (h-3 w-3), so half width is 6px
                                  const thumbHalfWidth = 6;
                                  const position = previewFrames.length === 1 ? 0.5 : i / (previewFrames.length - 1);
                                  
                                  return (
                                    <div
                                      key={i}
                                      className="absolute w-px h-2 bg-muted-foreground/40"
                                      style={{ 
                                        left: `calc(${thumbHalfWidth}px + ${position} * (100% - ${thumbHalfWidth * 2}px))`,
                                        transform: 'translateX(-0.5px)'
                                      }}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
              
              <PanelSeparator marginX="3" className="my-4" />
              
              {/* Position & Size Section */}
              <Collapsible open={positionSectionOpen} onOpenChange={setPositionSectionOpen}>
                <CollapsibleHeader isOpen={positionSectionOpen}>
                  <div className="flex items-center gap-2">
                    <Move3D className="w-4 h-4 text-muted-foreground" />
                    <span>Position & Size</span>
                  </div>
                </CollapsibleHeader>
                
                <CollapsibleContent className="collapsible-content">
                  <div className="space-y-3">
                    {/* Image Size Controls */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Image Size (characters)</Label>
                      
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Label htmlFor="char-width" className="text-xs">Width</Label>
                          <div className="flex">
                            <Input
                              id="char-width"
                              type="number"
                              min="1"
                              value={settings.characterWidth}
                              onChange={(e) => handleWidthChange(parseInt(e.target.value) || 1)}
                              className="h-8 text-xs rounded-r-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <div className="flex flex-col">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleWidthChange(settings.characterWidth + 1)}
                                className="h-4 w-6 p-0 rounded-l-none rounded-br-none border-l-0 text-xs"
                              >
                                +
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleWidthChange(Math.max(1, settings.characterWidth - 1))}
                                className="h-4 w-6 p-0 rounded-l-none rounded-tr-none border-l-0 border-t-0 text-xs"
                              >
                                −
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <Label htmlFor="char-height" className="text-xs">Height</Label>
                          <div className="flex">
                            <Input
                              id="char-height"
                              type="number"
                              min="1"
                              value={settings.characterHeight}
                              onChange={(e) => handleHeightChange(parseInt(e.target.value) || 1)}
                              className="h-8 text-xs rounded-r-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <div className="flex flex-col">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleHeightChange(settings.characterHeight + 1)}
                                className="h-4 w-6 p-0 rounded-l-none rounded-br-none border-l-0 text-xs"
                              >
                                +
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleHeightChange(Math.max(1, settings.characterHeight - 1))}
                                className="h-4 w-6 p-0 rounded-l-none rounded-tr-none border-l-0 border-t-0 text-xs"
                              >
                                −
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-end">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant={settings.maintainAspectRatio ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => updateSettings({ maintainAspectRatio: !settings.maintainAspectRatio })}
                                  disabled={!originalImageAspectRatio}
                                  className="h-8 w-8 p-0"
                                >
                                  <Link className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{settings.maintainAspectRatio ? "Unlink aspect ratio" : "Maintain original image aspect ratio"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Canvas: {canvasWidth} × {canvasHeight} characters
                      </div>
                    </div>
                    
                    {/* Alignment & Nudge Controls - Two Equal Columns */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Alignment Section */}
                      <div className="flex flex-col items-center space-y-2">
                        <Label className="text-xs font-medium">Alignment</Label>
                        <TooltipProvider>
                          <div className="grid grid-cols-3 gap-[3px]">
                            {[
                              { mode: 'top-left', tooltip: 'Top Left' },
                              { mode: 'top', tooltip: 'Top Center' },
                              { mode: 'top-right', tooltip: 'Top Right' },
                              { mode: 'left', tooltip: 'Center Left' },
                              { mode: 'center', tooltip: 'Center' },
                              { mode: 'right', tooltip: 'Center Right' },
                              { mode: 'bottom-left', tooltip: 'Bottom Left' },
                              { mode: 'bottom', tooltip: 'Bottom Center' },
                              { mode: 'bottom-right', tooltip: 'Bottom Right' }
                            ].map(({ mode, tooltip }) => {
                              const isActive = settings.cropMode === mode;
                              return (
                                <Tooltip key={mode}>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => updateSettings({ cropMode: mode as any })}
                                      className={`h-6 w-6 p-0 transition-colors ${
                                        isActive 
                                          ? 'bg-purple-500 text-white hover:bg-purple-600' 
                                          : 'bg-background hover:bg-muted border border-border'
                                      }`}
                                    >
                                      {isActive ? (
                                        <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      ) : (
                                        <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{tooltip}</p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                        </TooltipProvider>
                        {/* Show current alignment mode */}
                        <div className="text-xs text-muted-foreground">
                          {(() => {
                            const alignmentMap = {
                              'top-left': 'Top Left',
                              'top': 'Top Center', 
                              'top-right': 'Top Right',
                              'left': 'Center Left',
                              'center': 'Center',
                              'right': 'Center Right',
                              'bottom-left': 'Bottom Left',
                              'bottom': 'Bottom Center',
                              'bottom-right': 'Bottom Right'
                            };
                            return alignmentMap[settings.cropMode] || settings.cropMode;
                          })()}
                        </div>
                      </div>
                      
                      {/* Nudge Section */}
                      <div className="flex flex-col items-center space-y-2">
                        <Label className="text-xs font-medium">Nudge</Label>
                        <TooltipProvider>
                          <div className="grid grid-cols-3 gap-[3px]">
                            {/* Top row */}
                            <div></div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateSettings({ nudgeY: settings.nudgeY - 1 })}
                                  className="h-6 w-6 p-0"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Nudge up</p>
                              </TooltipContent>
                            </Tooltip>
                            <div></div>
                            
                            {/* Middle row */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateSettings({ nudgeX: settings.nudgeX - 1 })}
                                  className="h-6 w-6 p-0"
                                >
                                  <ArrowLeft className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Nudge left</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateSettings({ nudgeX: 0, nudgeY: 0 })}
                                  className="h-6 w-6 p-0"
                                  disabled={settings.nudgeX === 0 && settings.nudgeY === 0}
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Reset nudge</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateSettings({ nudgeX: settings.nudgeX + 1 })}
                                  className="h-6 w-6 p-0"
                                >
                                  <ArrowRight className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Nudge right</p>
                              </TooltipContent>
                            </Tooltip>
                            
                            {/* Bottom row */}
                            <div></div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateSettings({ nudgeY: settings.nudgeY + 1 })}
                                  className="h-6 w-6 p-0"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Nudge down</p>
                              </TooltipContent>
                            </Tooltip>
                            <div></div>
                          </div>
                        </TooltipProvider>
                        {/* Show current nudge values */}
                        <div className="text-xs text-muted-foreground">
                          ({settings.nudgeX}, {settings.nudgeY})
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Pre-processing Section */}
              <PanelSeparator marginX="3" />
              <PreprocessingSection onSettingsChange={() => setLivePreviewEnabled(true)} />

              {/* Character Mapping Section */}
              <PanelSeparator marginX="3" />
              <CharacterMappingSection onSettingsChange={() => setLivePreviewEnabled(true)} />

              {/* Text Color Mapping Section */}
              <PanelSeparator marginX="3" />
              <TextColorMappingSection onSettingsChange={() => setLivePreviewEnabled(true)} />

              {/* Background Color Mapping Section */}
              <PanelSeparator marginX="3" />
              <BackgroundColorMappingSection onSettingsChange={() => setLivePreviewEnabled(true)} />
              
              <PanelSeparator marginX="3" />
              
              {/* Processing Progress */}
              {isProcessing && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Processing...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1" />
                </div>
              )}
            </>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}


        </div>
      </ScrollArea>

      {/* Footer with Import Mode and Button */}
      {previewFrames.length > 0 && (
        <div className="p-3 border-t border-border space-y-3">
          {/* Import Mode Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Import Mode</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={importMode === 'overwrite' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setImportMode('overwrite')}
                className="h-8 text-xs"
              >
                Overwrite
              </Button>
              <Button
                variant={importMode === 'append' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setImportMode('append')}
                className="h-8 text-xs"
              >
                Append
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              {importMode === 'overwrite' 
                ? 'Replace frames starting from current frame'
                : 'Add frames after the last existing frame'
              }
            </div>
          </div>
          
          <Button 
            onClick={handleImportToCanvas}
            disabled={isImporting}
            className="w-full h-8"
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