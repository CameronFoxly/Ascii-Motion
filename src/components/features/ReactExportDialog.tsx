import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { FileCode, Download, Settings, Loader2, Copy, CheckCircle, Info } from 'lucide-react';
import { useExportStore } from '../../stores/exportStore';
import { useExportDataCollector } from '../../utils/exportDataCollector';
import { ExportRenderer } from '../../utils/exportRenderer';

const sanitizeFileName = (value: string): string => {
  if (!value) return '';
  return value
    .replace(/\s+/g, '-') // spaces to dashes
    .replace(/[^a-zA-Z0-9\-_]/g, '') // allow alphanumeric, dash, underscore
    .replace(/-+/g, '-') // collapse multiple dashes
    .replace(/_+/g, '_')
    .replace(/^[-_]+|[-_]+$/g, '')
    .toLowerCase();
};

const toPascalCase = (value: string): string => {
  if (!value) return 'AsciiMotionAnimation';
  const parts = value.split(/[-_]/).filter(Boolean);
  if (parts.length === 0) return 'AsciiMotionAnimation';
  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
};

const formatDuration = (milliseconds: number): string => {
  if (milliseconds <= 0) return '0.00s';
  if (milliseconds < 1000) return `${milliseconds}ms`;
  return `${(milliseconds / 1000).toFixed(2)}s`;
};

/**
 * React Export Dialog
 * Generates a drop-in React canvas component for ASCII Motion animations
 */
export const ReactExportDialog: React.FC = () => {
  const activeFormat = useExportStore((state) => state.activeFormat);
  const showExportModal = useExportStore((state) => state.showExportModal);
  const setShowExportModal = useExportStore((state) => state.setShowExportModal);
  const reactSettings = useExportStore((state) => state.reactSettings);
  const setReactSettings = useExportStore((state) => state.setReactSettings);
  const setProgress = useExportStore((state) => state.setProgress);
  const setIsExporting = useExportStore((state) => state.setIsExporting);
  const isExporting = useExportStore((state) => state.isExporting);

  const exportData = useExportDataCollector();

  const [copySuccess, setCopySuccess] = useState(false);

  const isOpen = showExportModal && activeFormat === 'react';

  const sanitizedFileName = useMemo(() => sanitizeFileName(reactSettings.fileName), [reactSettings.fileName]);
  const componentName = useMemo(() => toPascalCase(sanitizedFileName || reactSettings.fileName), [reactSettings.fileName, sanitizedFileName]);
  const fileExtension = reactSettings.typescript ? 'tsx' : 'jsx';
  const importSnippet = useMemo(() => {
    const targetName = sanitizedFileName || componentName;
    const lines: string[] = [];

    lines.push("import { useCallback, useRef } from 'react';");
    lines.push(`import ${componentName} from './${targetName}';`);
    lines.push('');

    if (reactSettings.typescript) {
      lines.push('type PlaybackApi = {');
      lines.push('  play: () => void;');
      lines.push('  pause: () => void;');
      lines.push('  togglePlay: () => void;');
      lines.push('  restart: () => void;');
      lines.push('};');
      lines.push('');
    }

    lines.push('export default function MyPage() {');
    if (reactSettings.typescript) {
      lines.push('  const playbackRef = useRef<PlaybackApi | null>(null);');
      lines.push('  const handleReady = useCallback((api: PlaybackApi) => {');
    } else {
      lines.push('  const playbackRef = useRef(null);');
      lines.push('  const handleReady = useCallback((api) => {');
    }
    lines.push('    playbackRef.current = api;');
    lines.push('  }, []);');
    lines.push('');
    lines.push('  return (');
    lines.push('    <div>');
    lines.push(`      <${componentName}`);
    if (reactSettings.includeControls) {
      lines.push('        showControls={false}');
    }
    lines.push('        autoPlay={false}');
    lines.push('        onReady={handleReady}');
    lines.push('      />');
    lines.push('      <button onClick={() => playbackRef.current?.play()}>Play from code</button>');
    lines.push('    </div>');
    lines.push('  );');
    lines.push('}');

    return lines.join('\n');
  }, [componentName, reactSettings.includeControls, reactSettings.typescript, sanitizedFileName]);

  const frameCount = exportData?.frames.length ?? 0;
  const canvasWidth = exportData?.canvasDimensions.width ?? 0;
  const canvasHeight = exportData?.canvasDimensions.height ?? 0;
  const totalDurationMs = useMemo(
    () => (exportData ? exportData.frames.reduce((sum, frame) => sum + frame.duration, 0) : 0),
    [exportData]
  );

  useEffect(() => {
    if (!isOpen) {
      setCopySuccess(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setShowExportModal(false);
  };

  const handleFilenameChange = (value: string) => {
    const sanitized = sanitizeFileName(value);
    setReactSettings({ fileName: sanitized });
  };

  const handleExport = async () => {
    if (!exportData) {
      console.error('No export data available');
      alert('No export data available. Please create content before exporting.');
      return;
    }

    if (!sanitizedFileName) {
      alert('Please provide a valid filename for the exported component.');
      return;
    }

    try {
      setIsExporting(true);
      const renderer = new ExportRenderer((progress) => setProgress(progress));
      await renderer.exportReactComponent(exportData, {
        ...reactSettings,
        fileName: sanitizedFileName,
      });
      handleClose();
    } catch (error) {
      console.error('React component export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  const handleCopyImportSnippet = async () => {
    try {
      await navigator.clipboard.writeText(importSnippet);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy import snippet:', error);
    }
  };

  const canExport = Boolean(exportData && sanitizedFileName && !isExporting);

  return (
    <Dialog open={isOpen} onOpenChange={setShowExportModal}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border-border/50">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-background">
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="w-5 h-5" />
            Export React Component
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col max-h-[80vh]">
          {/* Sticky Filename */}
          <div className="sticky top-0 z-10 bg-background px-6 py-4 border-b space-y-2">
            <Label htmlFor="react-filename">Component File Name</Label>
            <div className="flex">
              <Input
                id="react-filename"
                value={reactSettings.fileName}
                onChange={(e) => handleFilenameChange(e.target.value)}
                placeholder="ascii-motion-animation"
                className="flex-1"
                disabled={isExporting}
              />
              <Badge variant="outline" className="ml-2 self-center">
                .{fileExtension}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Letters, numbers, dashes, and underscores only. Extension is added automatically.
            </p>
            {!sanitizedFileName && (
              <p className="text-xs text-destructive">Please enter a valid filename before exporting.</p>
            )}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <span className="text-sm font-medium">Component Options</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="react-typescript">Generate TypeScript component</Label>
                    <p className="text-xs text-muted-foreground">Outputs a .tsx file with strong typings.</p>
                  </div>
                  <Switch
                    id="react-typescript"
                    checked={reactSettings.typescript}
                    onCheckedChange={(checked) => setReactSettings({ typescript: checked })}
                    disabled={isExporting}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="react-controls">Include playback controls</Label>
                    <p className="text-xs text-muted-foreground">
                      Adds play/pause UI below the canvas (toggle later with the <code>showControls</code> prop).
                    </p>
                  </div>
                  <Switch
                    id="react-controls"
                    checked={reactSettings.includeControls}
                    onCheckedChange={(checked) => setReactSettings({ includeControls: checked })}
                    disabled={isExporting}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="react-background">Include canvas background</Label>
                    <p className="text-xs text-muted-foreground">Fill the canvas with the project background color.</p>
                  </div>
                  <Switch
                    id="react-background"
                    checked={reactSettings.includeBackground}
                    onCheckedChange={(checked) => setReactSettings({ includeBackground: checked })}
                    disabled={isExporting}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Copy className="w-4 h-4" />
                  <span className="text-sm font-medium">Import & Usage</span>
                </div>

                <div className="relative">
                  <pre className="bg-muted/70 rounded-md p-3 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                    {importSnippet}
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyImportSnippet}
                    disabled={copySuccess}
                    className="absolute top-2 right-2 gap-1 h-7"
                  >
                    {copySuccess ? (
                      <>
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="h-4 w-4 mt-0.5" />
                  <ul className="space-y-1">
                    <li>1. Download the generated <code>{`${sanitizedFileName || 'your-component'}.${fileExtension}`}</code> file.</li>
                    <li>2. Move it into your React project (e.g. <code>src/components</code>).</li>
                    <li>3. Import and use the component as shown above.</li>
                    <li>4. Set <code>autoPlay</code> to <code>false</code> to start paused.</li>
                    {reactSettings.includeControls && (
                      <li>5. Toggle the built-in UI at runtime with <code>showControls</code>.</li>
                    )}
                    <li>
                      {reactSettings.includeControls ? '6' : '5'}. Use <code>onReady</code> to capture <code>{'{ play, pause, togglePlay, restart }'}</code> and trigger playback from your app.
                    </li>
                    <li>{reactSettings.includeControls ? '7' : '6'}. The animation loops automatically and honors frame timing.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 space-y-3">
                <span className="text-sm font-medium">Export Summary</span>
                <Separator className="bg-border/50" />
                <div className="text-xs text-muted-foreground space-y-2">
                  <div>Component: <span className="font-medium text-foreground">{componentName}</span></div>
                  <div>Frames: <span className="font-medium text-foreground">{frameCount}</span></div>
                  <div>Canvas Size: <span className="font-medium text-foreground">{canvasWidth} × {canvasHeight}</span> cells</div>
                  <div>Total Duration: <span className="font-medium text-foreground">{formatDuration(totalDurationMs)}</span></div>
                  <div>Background: <span className="font-medium text-foreground">{reactSettings.includeBackground ? 'Included' : 'Transparent'}</span></div>
                  <div>
                    Controls:{' '}
                    <span className="font-medium text-foreground">
                      {reactSettings.includeControls
                        ? 'Play/Pause UI included (toggle via showControls prop)'
                        : 'No built-in controls (use autoPlay/onReady)'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sticky Actions */}
          <div className="sticky bottom-0 z-10 bg-background px-6 py-4 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isExporting}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={!canExport}>
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export Component
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
