// Export palette dialog with JSON generation and download

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Copy, CheckCircle, X, FileText } from 'lucide-react';
import { usePaletteStore } from '../../stores/paletteStore';
import type { PaletteExportFormat } from '../../types/palette';

interface ExportPaletteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExportPaletteDialog: React.FC<ExportPaletteDialogProps> = ({
  isOpen,
  onOpenChange
}) => {
  const { 
    activePaletteId, 
    getActivePalette, 
    exportPalette 
  } = usePaletteStore();
  
  const [fileName, setFileName] = useState('');
  const [exportData, setExportData] = useState<PaletteExportFormat | null>(null);
  const [jsonString, setJsonString] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Initialize export data when dialog opens
  useEffect(() => {
    if (isOpen) {
      const activePalette = getActivePalette();
      const data = exportPalette(activePaletteId);
      
      if (data && activePalette) {
        setExportData(data);
        setFileName(sanitizeFileName(data.name));
        setJsonString(JSON.stringify(data, null, 2));
      }
    }
  }, [isOpen, activePaletteId, getActivePalette, exportPalette]);

  // Sanitize filename for download
  const sanitizeFileName = (name: string): string => {
    return name
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase() || 'palette';
  };

  // Handle filename change
  const handleFileNameChange = (value: string) => {
    const sanitized = sanitizeFileName(value);
    setFileName(sanitized);
  };

  // Copy JSON to clipboard
  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Download JSON file
  const handleDownload = () => {
    if (!exportData || !fileName) return;

    try {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      setDownloadSuccess(true);
      setTimeout(() => {
        setDownloadSuccess(false);
        onOpenChange(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  // Reset form
  const handleReset = () => {
    setFileName('');
    setExportData(null);
    setJsonString('');
    setCopySuccess(false);
    setDownloadSuccess(false);
  };

  // Handle dialog close
  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  if (!exportData) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export Color Palette</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Alert>
              <AlertDescription>
                No palette available for export. Please select a palette first.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button onClick={handleClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Export Color Palette</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Palette info */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Palette Information</span>
            </div>
            
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium">Name:</span>{' '}
                <span className="text-sm">{exportData.name}</span>
              </div>
              <div>
                <span className="text-sm font-medium">Colors:</span>{' '}
                <span className="text-sm">{exportData.colors.length}</span>
              </div>
              
              {/* Color Preview */}
              <div className="space-y-1">
                <span className="text-sm font-medium">Preview:</span>
                <div className="flex flex-wrap gap-1">
                  {exportData.colors.slice(0, 16).map((color, index) => (
                    <div
                      key={index}
                      className="w-6 h-6 rounded border border-border"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  {exportData.colors.length > 16 && (
                    <div className="flex items-center justify-center w-6 h-6 text-xs text-muted-foreground border border-border rounded">
                      +{exportData.colors.length - 16}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* File name input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">File Name</Label>
            <div className="flex gap-2">
              <Input
                value={fileName}
                onChange={(e) => handleFileNameChange(e.target.value)}
                placeholder="Enter filename"
                className="flex-1"
              />
              <span className="flex items-center text-sm text-muted-foreground">.json</span>
            </div>
            <p className="text-xs text-muted-foreground">
              File name will be sanitized for download compatibility
            </p>
          </div>

          {/* JSON preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">JSON Data</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyJson}
                disabled={copySuccess}
                className="gap-2 h-7"
              >
                {copySuccess ? (
                  <>
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            
            <div className="relative">
              <textarea
                value={jsonString}
                readOnly
                className="w-full h-32 px-3 py-2 text-xs font-mono border border-border rounded-md bg-muted/50 resize-none"
              />
            </div>
          </div>

          {/* Success messages */}
          {copySuccess && (
            <Alert className="border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                JSON data copied to clipboard successfully!
              </AlertDescription>
            </Alert>
          )}

          {downloadSuccess && (
            <Alert className="border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Palette exported successfully as {fileName}.json
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <div className="flex gap-2 w-full justify-between">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={downloadSuccess}
            >
              Reset
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={downloadSuccess}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              
              <Button
                onClick={handleDownload}
                disabled={!fileName.trim() || downloadSuccess}
                className="gap-2"
              >
                {downloadSuccess ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Downloaded!
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
