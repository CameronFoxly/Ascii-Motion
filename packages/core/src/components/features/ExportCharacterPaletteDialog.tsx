// Export character palette dialog with JSON generation and download

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Copy, CheckCircle, X } from 'lucide-react';
import { useCharacterPaletteStore } from '../../stores/characterPaletteStore';
import { sanitizeCharacterPaletteNameForFileName } from '@/utils/characterPaletteValidation';
import type { CharacterPaletteExportFormat } from '../../types/palette';

interface ExportCharacterPaletteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExportCharacterPaletteDialog: React.FC<ExportCharacterPaletteDialogProps> = ({
  isOpen,
  onOpenChange
}) => {
  const { 
    activePalette, 
    exportPalette 
  } = useCharacterPaletteStore();
  
  const [fileName, setFileName] = useState('');
  const [exportData, setExportData] = useState<CharacterPaletteExportFormat | null>(null);
  const [jsonString, setJsonString] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadedFileName, setDownloadedFileName] = useState('');

  // Initialize export data when dialog opens
  useEffect(() => {
    if (isOpen && activePalette) {
      const data = exportPalette(activePalette.id);
      
      if (data) {
        setExportData(data);
        setFileName(sanitizeCharacterPaletteNameForFileName(data.name));
        setJsonString(JSON.stringify(data, null, 2));
      }
    }
  }, [isOpen, activePalette, exportPalette]);

  // Live sanitization for typing - minimal processing, just convert spaces to dashes
  const handleFileNameChange = (value: string) => {
    // Allow typing but sanitize for display
    const sanitized = value
      .replace(/[^a-zA-Z0-9\s\-_]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
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

    const finalFileName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
    
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    setDownloadedFileName(finalFileName);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  // Handle close
  const handleClose = () => {
    setExportData(null);
    setJsonString('');
    setFileName('');
    setCopySuccess(false);
    setDownloadSuccess(false);
    setDownloadedFileName('');
    onOpenChange(false);
  };

  if (!exportData) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Export Character Palette</DialogTitle>
          </DialogHeader>
          
          <div className="py-8 text-center text-muted-foreground">
            <p>No character palette selected for export.</p>
            <p className="text-sm mt-2">Please select a palette first.</p>
          </div>
          
          <DialogFooter>
            <Button onClick={handleClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Character Palette
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Palette Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Character Palette</Label>
            <div className="p-3 border border-border rounded-md bg-muted/50">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{exportData.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({exportData.characters.length} characters)
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {exportData.characters.map((char, index) => (
                    <div
                      key={index}
                      className="w-6 h-6 border border-border rounded-sm bg-background flex items-center justify-center font-mono text-sm"
                    >
                      {char === ' ' ? '␣' : char}
                    </div>
                  ))}
                </div>

                <div className="text-xs text-muted-foreground">
                  Category: {exportData.category}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* File Name Input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">File Name</Label>
            <div className="flex gap-2">
              <Input
                value={fileName}
                onChange={(e) => handleFileNameChange(e.target.value)}
                placeholder="character-palette"
                className="flex-1"
              />
              <span className="flex items-center text-sm text-muted-foreground">.json</span>
            </div>
            <p className="text-xs text-muted-foreground">
              The filename will be sanitized for download compatibility
            </p>
          </div>

          <Separator />

          {/* JSON Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">JSON Content</Label>
            <div className="relative">
              <textarea
                value={jsonString}
                readOnly
                className="w-full h-40 p-3 border border-border rounded-md resize-none font-mono text-xs bg-muted/30"
              />
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={handleCopyJson}
              >
                {copySuccess ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This JSON can be imported into other ASCII Motion instances
            </p>
          </div>

          {/* Success Messages */}
          {copySuccess && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                JSON copied to clipboard successfully!
              </AlertDescription>
            </Alert>
          )}

          {downloadSuccess && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Character palette exported as "{downloadedFileName}"
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <div className="flex justify-between w-full">
            <Button variant="outline" onClick={handleClose}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCopyJson}>
                <Copy className="h-4 w-4 mr-2" />
                Copy JSON
              </Button>
              
              <Button
                onClick={handleDownload}
                disabled={!fileName.trim()}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};