// Import palette dialog with JSON validation and preview

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { usePaletteStore } from '../../stores/paletteStore';
import { validatePaletteJSON, getValidationSummary } from '../../utils/paletteValidation';
import type { PaletteExportFormat } from '../../types/palette';

interface ImportPaletteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImportPaletteDialog: React.FC<ImportPaletteDialogProps> = ({
  isOpen,
  onOpenChange
}) => {
  const { importPalette } = usePaletteStore();
  
  const [importMethod, setImportMethod] = useState<'file' | 'text'>('file');
  const [jsonText, setJsonText] = useState('');
  const [validationResult, setValidationResult] = useState<ReturnType<typeof validatePaletteJSON> | null>(null);
  const [previewData, setPreviewData] = useState<PaletteExportFormat | null>(null);
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

  // Validate JSON and show preview
  const validateAndPreview = (jsonString: string) => {
    const result = validatePaletteJSON(jsonString);
    setValidationResult(result);
    setPreviewData(result.isValid ? result.data || null : null);
  };

  // Handle import confirmation
  const handleImport = async () => {
    if (!jsonText.trim() || !validationResult?.isValid) return;

    setIsImporting(true);
    try {
      const result = importPalette(jsonText);
      if (result.success) {
        setImportSuccess(result.message);
        // Clear form after successful import
        setTimeout(() => {
          handleReset();
          onOpenChange(false);
        }, 2000);
      } else {
        setValidationResult({
          isValid: false,
          errors: [result.message],
          warnings: []
        });
      }
    } catch (error) {
      setValidationResult({
        isValid: false,
        errors: ['An unexpected error occurred during import.'],
        warnings: []
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setJsonText('');
    setValidationResult(null);
    setPreviewData(null);
    setImportSuccess(null);
    setImportMethod('file');
  };

  // Handle dialog close
  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Color Palette</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Import method selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Import Method</Label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={importMethod === 'file' ? 'default' : 'outline'}
                onClick={() => setImportMethod('file')}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                File Upload
              </Button>
              <Button
                size="sm"
                variant={importMethod === 'text' ? 'default' : 'outline'}
                onClick={() => setImportMethod('text')}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Paste JSON
              </Button>
            </div>
          </div>

          <Separator />

          {/* File upload */}
          {importMethod === 'file' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Palette File</Label>
              <Input
                type="file"
                accept=".json,.palette,.pal"
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Supported formats: .json, .palette, .pal
              </p>
            </div>
          )}

          {/* Text input */}
          {importMethod === 'text' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Paste JSON Data</Label>
              <textarea
                value={jsonText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder='{"name": "My Palette", "colors": ["#ff0000", "#00ff00", "#0000ff"]}'
                className="w-full h-24 px-3 py-2 text-sm border border-border rounded-md bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          )}

          {/* Validation results */}
          {validationResult && (
            <div className="space-y-2">
              <Alert className={validationResult.isValid ? 'border-green-200' : 'border-red-200'}>
                <div className="flex items-start gap-2">
                  {validationResult.isValid ? (
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <AlertDescription>
                      <div className="font-medium mb-1">
                        {getValidationSummary(validationResult)}
                      </div>
                      
                      {validationResult.errors.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-red-600">Errors:</div>
                          {validationResult.errors.map((error, index) => (
                            <div key={index} className="text-xs text-red-600">• {error}</div>
                          ))}
                        </div>
                      )}
                      
                      {validationResult.warnings.length > 0 && (
                        <div className="space-y-1 mt-2">
                          <div className="text-xs font-medium text-yellow-600">Warnings:</div>
                          {validationResult.warnings.map((warning, index) => (
                            <div key={index} className="text-xs text-yellow-600">• {warning}</div>
                          ))}
                        </div>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            </div>
          )}

          {/* Preview */}
          {previewData && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">Palette Preview</span>
              </div>
              
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium">Name:</span>{' '}
                  <span className="text-sm">{previewData.name}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Colors:</span>{' '}
                  <span className="text-sm">{previewData.colors.length}</span>
                </div>
                
                {/* Color Preview */}
                <div className="space-y-1">
                  <span className="text-sm font-medium">Preview:</span>
                  <TooltipProvider>
                    <div className="flex flex-wrap gap-1">
                      {previewData.colors.slice(0, 16).map((color, index) => (
                        <Tooltip key={index}>
                          <TooltipTrigger asChild>
                            <div
                              className="w-6 h-6 rounded border border-border"
                              style={{ backgroundColor: color }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{color}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                      {previewData.colors.length > 16 && (
                        <div className="flex items-center justify-center w-6 h-6 text-xs text-muted-foreground border border-border rounded">
                          +{previewData.colors.length - 16}
                        </div>
                      )}
                    </div>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          )}

          {/* Success message */}
          {importSuccess && (
            <Alert className="border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                {importSuccess}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <div className="flex gap-2 w-full justify-between">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isImporting || importSuccess !== null}
            >
              Reset
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isImporting}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              
              <Button
                onClick={handleImport}
                disabled={!validationResult?.isValid || isImporting || importSuccess !== null}
                className="gap-2"
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Import Palette
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
