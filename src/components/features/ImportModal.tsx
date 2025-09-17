import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Upload, Save, AlertCircle, Loader2 } from 'lucide-react';
import { useExportStore } from '../../stores/exportStore';
import { useSessionImporter } from '../../utils/sessionImporter';

/**
 * Session Import Dialog
 * Handles session file import - triggered from dropdown
 */
export const ImportModal: React.FC = () => {
  const activeFormat = useExportStore(state => state.activeFormat);
  const showImportModal = useExportStore(state => state.showImportModal);
  const setShowImportModal = useExportStore(state => state.setShowImportModal);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { importSession } = useSessionImporter();
  const [isImporting, setIsImporting] = useState(false);

  const isOpen = showImportModal && activeFormat === 'session';

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      console.log('Importing session file:', file.name);
      
      await importSession(file);
      
      console.log('Session imported successfully');
      
      // Reset input and close modal
      event.target.value = '';
      setShowImportModal(false);
    } catch (error) {
      console.error('Import failed:', error);
      alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setShowImportModal(false);
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".asciimtn,application/json"
        onChange={handleFileChange}
      />

      <Dialog open={isOpen} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="w-5 h-5" />
              Import Session File
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* File Selection */}
            <div className="text-center py-8">
              <Save className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Select Session File</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose a .asciimtn file to load your saved project
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
                disabled={isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Browse Files
                  </>
                )}
              </Button>
            </div>

            {/* Help Text */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div className="text-xs text-muted-foreground">
                    <div className="font-medium mb-1">Import Guidelines:</div>
                    <ul className="space-y-1">
                      <li>• Only .asciimtn session files are supported</li>
                      <li>• Your current project will be replaced</li>
                      <li>• All frames, settings, and tools will be restored</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};