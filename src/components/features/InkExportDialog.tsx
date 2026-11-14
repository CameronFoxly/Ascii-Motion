import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Terminal, Download, Settings, Loader2, Copy, CheckCircle, Info, Package } from 'lucide-react';
import { useExportStore } from '../../stores/exportStore';
import { useExportDataCollector } from '../../utils/exportDataCollector';
import { useTimelineStore } from '../../stores/timelineStore';
import { ExportRenderer } from '../../utils/exportRenderer';
import { finalizeFileName, sanitizeFileName } from '../../utils/exportFileName';

const toPascalCase = (value: string): string => {
  if (!value) return 'AsciiMotionCli';
  const parts = value.split(/[-_]/).filter(Boolean);
  if (parts.length === 0) return 'AsciiMotionCli';
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
 * Ink Export Dialog
 * Generates a TypeScript component for Ink (React for CLIs) animations
 */
export const InkExportDialog: React.FC = () => {
  const activeFormat = useExportStore((state) => state.activeFormat);
  const showExportModal = useExportStore((state) => state.showExportModal);
  const setShowExportModal = useExportStore((state) => state.setShowExportModal);
  const inkSettings = useExportStore((state) => state.inkSettings);
  const setInkSettings = useExportStore((state) => state.setInkSettings);
  const setProgress = useExportStore((state) => state.setProgress);
  const setIsExporting = useExportStore((state) => state.setIsExporting);
  const isExporting = useExportStore((state) => state.isExporting);
  const postEffectTracks = useTimelineStore((s) => s.postEffectTracks);

  const isOpen = showExportModal && activeFormat === 'ink';
  const exportData = useExportDataCollector(isOpen);

  const [copySuccess, setCopySuccess] = useState(false);

  const sanitizedFileName = useMemo(() => finalizeFileName(sanitizeFileName(inkSettings.fileName)), [inkSettings.fileName]);
  const componentName = useMemo(() => toPascalCase(sanitizedFileName || inkSettings.fileName), [inkSettings.fileName, sanitizedFileName]);

  const importSnippet = useMemo(() => {
    const targetName = sanitizedFileName || componentName;
    const lines: string[] = [];

    lines.push("import React from 'react';");
    lines.push("import { render } from 'ink';");
    lines.push(`import { ${componentName} } from './${targetName}';`);
    lines.push('');
    lines.push('// Basic usage - auto-plays and loops');
    lines.push(`render(<${componentName} />);`);
    lines.push('');
    lines.push('// With options');
    lines.push('render(');
    lines.push(`  <${componentName}`);
    lines.push('    hasDarkBackground={true}');
    lines.push('    autoPlay={true}');
    lines.push(`    loop={${inkSettings.loopAnimation}}`);
    if (inkSettings.includePlaybackControls) {
      lines.push('    onReady={(api) => {');
      lines.push('      // api.play(), api.pause(), api.restart()');
      lines.push('    }}');
    }
    lines.push('  />');
    lines.push(');');

    return lines.join('\n');
  }, [componentName, inkSettings.includePlaybackControls, inkSettings.loopAnimation, sanitizedFileName]);

  const frameCount = exportData?.frames.length ?? 0;
  const canvasWidth = exportData?.canvasDimensions.width ?? 0;
  const canvasHeight = exportData?.canvasDimensions.height ?? 0;
  const totalDurationMs = useMemo(
    () => (exportData ? exportData.frames.reduce((sum, frame) => sum + frame.duration, 0) : 0),
    [exportData]
  );

  // Count unique colors in the animation
  const uniqueColorCount = useMemo(() => {
    if (!exportData) return 0;
    const colors = new Set<string>();
    exportData.frames.forEach((frame) => {
      frame.data.forEach((cell) => {
        if (cell.color) colors.add(cell.color);
        if (cell.bgColor && cell.bgColor !== 'transparent') colors.add(cell.bgColor);
      });
    });
    return colors.size;
  }, [exportData]);

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
    setInkSettings({ fileName: sanitized });
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
      await renderer.exportInkComponent(exportData, {
        ...inkSettings,
        fileName: sanitizedFileName,
      });
      handleClose();
    } catch (error) {
      console.error('Ink component export failed:', error);
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
      <DialogContent className="max-w-xl p-0 overflow-hidden border-border/50" aria-describedby={undefined}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 bg-background">
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Export Ink Component
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col max-h-[80vh]">
          {/* Sticky Filename */}
          <div className="sticky top-0 z-10 bg-background px-6 py-4 border-b border-border/50 space-y-2">
            <Label htmlFor="ink-filename">Component File Name</Label>
            <div className="flex">
              <Input
                id="ink-filename"
                value={inkSettings.fileName}
                onChange={(e) => handleFilenameChange(e.target.value)}
                placeholder="ascii-motion-cli"
                className="flex-1"
                disabled={isExporting}
              />
              <Badge variant="outline" className="ml-2 self-center">
                .tsx
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Letters, numbers, dashes, and underscores only. Spaces will be converted to dashes.
            </p>
            {!sanitizedFileName && (
              <p className="text-xs text-destructive">Please enter a valid filename before exporting.</p>
            )}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <Card className="border-border/50">
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <span className="text-sm font-medium">Component Options</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="ink-loop">Loop animation</Label>
                    <p className="text-xs text-muted-foreground">Animation restarts after the last frame.</p>
                  </div>
                  <Switch
                    id="ink-loop"
                    checked={inkSettings.loopAnimation}
                    onCheckedChange={(checked) => setInkSettings({ loopAnimation: checked })}
                    disabled={isExporting}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="ink-controls">Include playback controls API</Label>
                    <p className="text-xs text-muted-foreground">
                      Expose <code>onReady</code> callback with <code>play</code>, <code>pause</code>, <code>restart</code>.
                    </p>
                  </div>
                  <Switch
                    id="ink-controls"
                    checked={inkSettings.includePlaybackControls}
                    onCheckedChange={(checked) => setInkSettings({ includePlaybackControls: checked })}
                    disabled={isExporting}
                  />
                </div>

                <Separator className="bg-border/50" />

                <div className="space-y-3">
                  <Label>Color Mode</Label>
                  <Select
                    value={inkSettings.colorMode}
                    onValueChange={(value: 'ansi' | '256' | 'hex') => setInkSettings({ colorMode: value })}
                    disabled={isExporting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select color mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ansi">ANSI 16 (semantic)</SelectItem>
                      <SelectItem value="256">xterm-256 (wide support)</SelectItem>
                      <SelectItem value="hex">Hex colors (exact)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {inkSettings.colorMode === 'ansi' 
                      ? <>Maps to <code>cyan</code>, <code>magenta</code>, etc. Works in all terminals.</>
                      : inkSettings.colorMode === '256'
                      ? <>Uses xterm-256 color palette. Supported by most terminals including Terminal.app.</>
                      : <>Preserves original <code>#rrggbb</code> values. Requires true color terminal support.</>
                    }
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
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
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <ul className="space-y-1">
                    <li>1. Download the generated <code>{`${sanitizedFileName || 'your-component'}.tsx`}</code> file.</li>
                    <li>2. Move it into your Ink CLI project.</li>
                    <li>3. Import and render the component as shown above.</li>
                    <li>4. Use <code>hasDarkBackground</code> to switch terminal themes.</li>
                    {inkSettings.includePlaybackControls && (
                      <li>5. Use <code>onReady</code> to control playback programmatically.</li>
                    )}
                    <li>{inkSettings.includePlaybackControls ? '6' : '5'}. Animation auto-plays and {inkSettings.loopAnimation ? 'loops' : 'stops at end'}.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  <span className="text-sm font-medium">Dependencies</span>
                </div>

                <div className="relative">
                  <pre className="bg-muted/70 rounded-md p-3 text-xs font-mono">npm install ink react</pre>
                </div>

                <p className="text-xs text-muted-foreground">
                  This component requires the <code>ink</code> and <code>react</code> packages.
                  Visit <a href="https://github.com/vadimdemedes/ink" target="_blank" rel="noopener noreferrer" className="underline">Ink documentation</a> for more details.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-4 space-y-3">
                <span className="text-sm font-medium">Export Summary</span>
                <Separator className="bg-border/50" />
                <div className="text-xs text-muted-foreground space-y-2">
                  <div>Component: <span className="font-medium text-foreground">{componentName}</span></div>
                  <div>Frames: <span className="font-medium text-foreground">{frameCount}</span></div>
                  <div>Canvas Size: <span className="font-medium text-foreground">{canvasWidth} × {canvasHeight}</span> characters</div>
                  <div>Total Duration: <span className="font-medium text-foreground">{formatDuration(totalDurationMs)}</span></div>
                  <div>Unique Colors: <span className="font-medium text-foreground">{uniqueColorCount}</span></div>
                  <div>
                    Color Mode:{' '}
                    <span className="font-medium text-foreground">
                      {inkSettings.colorMode === 'ansi' ? 'ANSI 16 (semantic)' : inkSettings.colorMode === '256' ? 'xterm-256' : 'Hex (exact colors)'}
                    </span>
                  </div>
                  <div>
                    Looping:{' '}
                    <span className="font-medium text-foreground">
                      {inkSettings.loopAnimation ? 'Yes' : 'No (stops at last frame)'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {postEffectTracks.length > 0 && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5 mt-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                Shaders cannot be rendered in this format and will be excluded.
              </div>
            )}
          </div>

          {/* Sticky Actions */}
          <div className="sticky bottom-0 z-10 bg-background px-6 py-4 border-t border-border/50 flex justify-end gap-2">
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
