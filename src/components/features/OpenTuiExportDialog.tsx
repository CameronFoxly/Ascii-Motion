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
import { Monitor, Download, Settings, Loader2, Copy, CheckCircle, Info, Package } from 'lucide-react';
import { useExportStore } from '../../stores/exportStore';
import { useExportDataCollector } from '../../utils/exportDataCollector';
import { useTimelineStore } from '../../stores/timelineStore';
import { ExportRenderer } from '../../utils/exportRenderer';
import { finalizeFileName, sanitizeFileName } from '../../utils/exportFileName';

const toPascalCase = (value: string): string => {
  if (!value) return 'AsciiMotionTui';
  const parts = value.split(/[-_]/).filter(Boolean);
  if (parts.length === 0) return 'AsciiMotionTui';
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
 * OpenTUI Export Dialog
 * Generates a TypeScript component for OpenTUI terminal UI animations
 */
export const OpenTuiExportDialog: React.FC = () => {
  const activeFormat = useExportStore((state) => state.activeFormat);
  const showExportModal = useExportStore((state) => state.showExportModal);
  const setShowExportModal = useExportStore((state) => state.setShowExportModal);
  const opentuiSettings = useExportStore((state) => state.opentuiSettings);
  const setOpenTuiSettings = useExportStore((state) => state.setOpenTuiSettings);
  const setProgress = useExportStore((state) => state.setProgress);
  const setIsExporting = useExportStore((state) => state.setIsExporting);
  const isExporting = useExportStore((state) => state.isExporting);
  const postEffectTracks = useTimelineStore((s) => s.postEffectTracks);

  const isOpen = showExportModal && activeFormat === 'opentui';
  const exportData = useExportDataCollector(isOpen);

  const [copySuccess, setCopySuccess] = useState(false);

  const sanitizedFileName = useMemo(() => finalizeFileName(sanitizeFileName(opentuiSettings.fileName)), [opentuiSettings.fileName]);
  const componentName = useMemo(() => toPascalCase(sanitizedFileName || opentuiSettings.fileName), [opentuiSettings.fileName, sanitizedFileName]);

  const importSnippet = useMemo(() => {
    const targetName = sanitizedFileName || componentName;
    const lines: string[] = [];

    lines.push("import { createCliRenderer } from '@opentui/core';");
    lines.push("import { createRoot } from '@opentui/react';");
    lines.push(`import { ${componentName} } from './${targetName}';`);
    lines.push('');
    lines.push('// Basic usage - auto-plays and loops');
    lines.push('const renderer = await createCliRenderer();');
    lines.push(`createRoot(renderer).render(<${componentName} />);`);
    lines.push('');
    lines.push('// With options');
    lines.push('createRoot(renderer).render(');
    lines.push(`  <${componentName}`);
    lines.push('    hasDarkBackground={true}');
    lines.push('    autoPlay={true}');
    lines.push(`    loop={${opentuiSettings.loopAnimation}}`);
    if (opentuiSettings.includePlaybackControls) {
      lines.push('    onReady={(api) => {');
      lines.push('      // api.play(), api.pause(), api.restart()');
      lines.push('    }}');
    }
    lines.push('  />');
    lines.push(');');

    return lines.join('\n');
  }, [componentName, opentuiSettings.includePlaybackControls, opentuiSettings.loopAnimation, sanitizedFileName]);

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
    setOpenTuiSettings({ fileName: sanitized });
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
      await renderer.exportOpenTuiComponent(exportData, {
        ...opentuiSettings,
        fileName: sanitizedFileName,
      });
      handleClose();
    } catch (error) {
      console.error('OpenTUI component export failed:', error);
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
            <Monitor className="w-5 h-5" />
            Export OpenTUI Component
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col max-h-[80vh]">
          {/* Sticky Filename */}
          <div className="sticky top-0 z-10 bg-background px-6 py-4 border-b border-border/50 space-y-2">
            <Label htmlFor="opentui-filename">Component File Name</Label>
            <div className="flex">
              <Input
                id="opentui-filename"
                value={opentuiSettings.fileName}
                onChange={(e) => handleFilenameChange(e.target.value)}
                placeholder="ascii-motion-tui"
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
                    <Label htmlFor="opentui-loop">Loop animation</Label>
                    <p className="text-xs text-muted-foreground">Animation restarts after the last frame.</p>
                  </div>
                  <Switch
                    id="opentui-loop"
                    checked={opentuiSettings.loopAnimation}
                    onCheckedChange={(checked) => setOpenTuiSettings({ loopAnimation: checked })}
                    disabled={isExporting}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="opentui-controls">Include playback controls API</Label>
                    <p className="text-xs text-muted-foreground">
                      Expose <code>onReady</code> callback with <code>play</code>, <code>pause</code>, <code>restart</code>.
                    </p>
                  </div>
                  <Switch
                    id="opentui-controls"
                    checked={opentuiSettings.includePlaybackControls}
                    onCheckedChange={(checked) => setOpenTuiSettings({ includePlaybackControls: checked })}
                    disabled={isExporting}
                  />
                </div>

                <Separator className="bg-border/50" />

                <div className="space-y-3">
                  <Label>Color Mode</Label>
                  <Select
                    value={opentuiSettings.colorMode}
                    onValueChange={(value: 'ansi' | '256' | 'hex') => setOpenTuiSettings({ colorMode: value })}
                    disabled={isExporting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select color mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hex">Hex colors (exact)</SelectItem>
                      <SelectItem value="256">xterm-256 (wide support)</SelectItem>
                      <SelectItem value="ansi">ANSI 16 (semantic)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {opentuiSettings.colorMode === 'hex' 
                      ? <>Preserves original <code>#rrggbb</code> values. Requires true color terminal support.</>
                      : opentuiSettings.colorMode === '256'
                      ? <>Uses xterm-256 color palette. Supported by most terminals including Terminal.app.</>
                      : <>Maps to <code>cyan</code>, <code>magenta</code>, etc. Works in all terminals.</>
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
                    <li>2. Move it into your OpenTUI project.</li>
                    <li>3. Import and render the component as shown above.</li>
                    <li>4. Use <code>hasDarkBackground</code> to switch terminal themes.</li>
                    {opentuiSettings.includePlaybackControls && (
                      <li>5. Use <code>onReady</code> to control playback programmatically.</li>
                    )}
                    <li>{opentuiSettings.includePlaybackControls ? '6' : '5'}. Animation auto-plays and {opentuiSettings.loopAnimation ? 'loops' : 'stops at end'}.</li>
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
                  <pre className="bg-muted/70 rounded-md p-3 text-xs font-mono">bun install @opentui/core @opentui/react react</pre>
                </div>

                <p className="text-xs text-muted-foreground">
                  OpenTUI requires <a href="https://bun.sh" target="_blank" rel="noopener noreferrer" className="underline">Bun</a> and React 19+.
                  Visit <a href="https://opentui.com" target="_blank" rel="noopener noreferrer" className="underline">OpenTUI documentation</a> for more details.
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
                      {opentuiSettings.colorMode === 'ansi' ? 'ANSI 16 (semantic)' : opentuiSettings.colorMode === '256' ? 'xterm-256' : 'Hex (exact colors)'}
                    </span>
                  </div>
                  <div>
                    Looping:{' '}
                    <span className="font-medium text-foreground">
                      {opentuiSettings.loopAnimation ? 'Yes' : 'No (stops at last frame)'}
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
