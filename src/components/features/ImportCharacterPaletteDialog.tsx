// Import character palette dialog with JSON validation and preview

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useCharacterPaletteStore } from '../../stores/characterPaletteStore';
import { validateCharacterPaletteJSON, getCharacterValidationSummary } from '@/utils/characterPaletteValidation';
import type { CharacterPaletteExportFormat } from '../../types/palette';

interface ImportCharacterPaletteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImportCharacterPaletteDialog: React.FC<ImportCharacterPaletteDialogProps> = ({
  isOpen,
  onOpenChange
}) => {
  const { importPalette } = useCharacterPaletteStore();
  
  const [importMethod, setImportMethod] = useState<'file' | 'text'>('file');
  const [jsonText, setJsonText] = useState('');
  const [validationResult, setValidationResult] = useState<ReturnType<typeof validateCharacterPaletteJSON> | null>(null);
  const [previewData, setPreviewData] = useState<CharacterPaletteExportFormat | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setJsonText(content);
      validateAndPreview(content);
    };
    reader.readAsText(file);
  }, []);

  // Handle text input change
  const handleTextChange = (value: string) => {
    setJsonText(value);
    if (value.trim()) {
      validateAndPreview(value);
    } else {
      setValidationResult(null);
      setPreviewData(null);
    }
  };

  // Validate and preview the JSON
  const validateAndPreview = (jsonContent: string) => {
    const result = validateCharacterPaletteJSON(jsonContent);
    setValidationResult(result);
    
    if (result.isValid && result.data) {
      setPreviewData(result.data);
    } else {
      setPreviewData(null);
    }
  };

  // Handle import
  const handleImport = async () => {
    if (!previewData || !validationResult?.isValid) return;
    
    setIsImporting(true);
    
    try {
      const newPalette = importPalette(previewData);
      setImportSuccess(newPalette.name);
      
      // Clear form after successful import
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsImporting(false);
    }
  };

  // Handle close
  const handleClose = () => {
    setJsonText('');
    setValidationResult(null);
    setPreviewData(null);
    setImportSuccess(null);
    setIsImporting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col border-border/50" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import Character Palette
          </DialogTitle>
        </DialogHeader>

        {importSuccess ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <div className="text-center">
              <h3 className="text-lg font-medium text-green-600">Import Successful!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Character palette "{importSuccess}" has been imported and is now available.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Import Method Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Import Method</Label>
              <div className="flex gap-2">
                <Button
                  variant={importMethod === 'file' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImportMethod('file')}
                  className="flex-1"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
                <Button
                  variant={importMethod === 'text' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImportMethod('text')}
                  className="flex-1"
                >
                  Paste JSON
                </Button>
              </div>
            </div>

            <Separator />

            {/* Import Content */}
            {importMethod === 'file' ? (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Character Palette File</Label>
                <Input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Select a .json file containing character palette data
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Paste JSON Content</Label>
                <textarea
                  value={jsonText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  className="w-full h-32 p-3 border border-border rounded-md resize-none font-mono text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder='{"name": "My Character Palette", "characters": ["#", "@", "=", "+", "-", ".", " "], "category": "custom"}'
                />
                <p className="text-xs text-muted-foreground">
                  Paste the JSON content of a character palette export
                </p>
              </div>
            )}

            {/* Validation Results */}
            {validationResult && (
              <div className="space-y-3">
                <Separator />
                
                {validationResult.isValid ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      {getCharacterValidationSummary(validationResult)}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        {validationResult.errors.map((error: string, index: number) => (
                          <div key={index} className="text-sm">• {error}</div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Warnings */}
                {validationResult.warnings.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        {validationResult.warnings.map((warning: string, index: number) => (
                          <div key={index} className="text-sm">• {warning}</div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Preview */}
            {previewData && validationResult?.isValid && (
              <div className="space-y-3">
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Preview</Label>
                  <div className="p-3 border border-border rounded-md bg-muted/50">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{previewData.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({previewData.characters.length} characters)
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {previewData.characters.map((char, index) => (
                          <div
                            key={index}
                            className="w-6 h-6 border border-border rounded-sm bg-background flex items-center justify-center font-mono text-sm"
                          >
                            {char === ' ' ? '␣' : char}
                          </div>
                        ))}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Category: {previewData.category}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {importSuccess ? (
            <Button onClick={handleClose}>
              Close
            </Button>
          ) : (
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={handleClose}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              
              <Button
                onClick={handleImport}
                disabled={!validationResult?.isValid || isImporting}
              >
                {isImporting ? (
                  <>Importing...</>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Palette
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};