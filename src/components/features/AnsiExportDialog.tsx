import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Terminal, Download, Settings, Loader2, Info, ChevronDown } from 'lucide-react';
import { useExportStore } from '../../stores/exportStore';
import { useExportDataCollector } from '../../utils/exportDataCollector';
import { useProjectMetadataStore } from '../../stores/projectMetadataStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { ExportRenderer } from '../../utils/exportRenderer';
import type { AnsiExportSettings } from '../../types/export';

const sanitizeFileName = (value: string): string => {
  if (!value) return '';
  return value
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/_+/g, '_')
    .toLowerCase();
};

const finalizeFileName = (value: string): string => value.replace(/^[-_]+|[-_]+$/g, '');

export const AnsiExportDialog: React.FC = () => {
  const activeFormat = useExportStore((state) => state.activeFormat);
  const showExportModal = useExportStore((state) => state.showExportModal);
  const setShowExportModal = useExportStore((state) => state.setShowExportModal);
  const ansiSettings = useExportStore((state) => state.ansiSettings);
  const setAnsiSettings = useExportStore((state) => state.setAnsiSettings);
  const isExporting = useExportStore((state) => state.isExporting);
  const setIsExporting = useExportStore((state) => state.setIsExporting);
  const progress = useExportStore((state) => state.progress);
  const setProgress = useExportStore((state) => state.setProgress);
  const projectName = useProjectMetadataStore((state) => state.projectName);
  const postEffectTracks = useTimelineStore((s) => s.postEffectTracks);

  const isOpen = showExportModal && activeFormat === 'ansi';
  const exportData = useExportDataCollector(isOpen);
  const [howToOpen, setHowToOpen] = useState(false);

  useEffect(() => {
    if (isOpen && projectName && ansiSettings.fileName === 'ascii-motion-ansi') {
      setAnsiSettings({ fileName: sanitizeFileName(projectName) });
    }
  }, [ansiSettings.fileName, isOpen, projectName, setAnsiSettings]);

  const sanitizedFileName = useMemo(
    () => finalizeFileName(sanitizeFileName(ansiSettings.fileName)),
    [ansiSettings.fileName]
  );
  const fileExtension = ansiSettings.outputMode === 'animation' ? '.sh' : '.ansi';

  const frameCount = exportData?.frames.length ?? 0;
  const totalDurationMs = useMemo(
    () => (exportData ? exportData.frames.reduce((sum, frame) => sum + frame.duration, 0) : 0),
    [exportData]
  );

  const handleClose = () => setShowExportModal(false);

  const handleExport = async () => {
    if (!exportData) {
      alert('No export data available. Please create content before exporting.');
      return;
    }

    if (!sanitizedFileName) {
      alert('Please provide a valid filename for the ANSI export.');
      return;
    }

    try {
      setIsExporting(true);
      const renderer = new ExportRenderer((next) => setProgress(next));
      await renderer.exportAnsi(exportData, { ...ansiSettings, fileName: sanitizedFileName }, sanitizedFileName);
      handleClose();
    } catch (error) {
      console.error('ANSI export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSettingChange = <K extends keyof AnsiExportSettings>(key: K, value: AnsiExportSettings[K]) => {
    setAnsiSettings({ [key]: value } as Partial<AnsiExportSettings>);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setShowExportModal}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border-border/50" aria-describedby={undefined}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 bg-background">
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Export ANSI Terminal Art
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col max-h-[80vh]">
          <div className="sticky top-0 z-10 bg-background px-6 py-4 border-b border-border/50 space-y-4">
            {progress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{progress.message}</span>
                  <span>{progress.progress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="ansi-filename">Filename</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="ansi-filename"
                  value={ansiSettings.fileName}
                  onChange={(e) => handleSettingChange('fileName', sanitizeFileName(e.target.value))}
                  placeholder="ascii-motion-ansi"
                  className="flex-1"
                  disabled={isExporting}
                />
                <Badge variant="outline" className="ml-2 self-center">{fileExtension}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {ansiSettings.outputMode === 'animation'
                  ? `Run with sh ${sanitizedFileName || 'animation'}.sh.`
                  : `Print with cat ${sanitizedFileName || 'frame'}.ansi.`}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <Card className="border-border/50">
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Settings className="w-4 h-4" />
                  <span className="text-sm font-medium">ANSI Export Settings</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ansi-color-mode">Color mode</Label>
                  <Select
                    value={ansiSettings.colorMode}
                    onValueChange={(value) => handleSettingChange('colorMode', value as AnsiExportSettings['colorMode'])}
                    disabled={isExporting}
                  >
                    <SelectTrigger id="ansi-color-mode" className="w-full">
                      <SelectValue placeholder="Select color mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ansi">ANSI 16</SelectItem>
                      <SelectItem value="256">xterm-256</SelectItem>
                      <SelectItem value="truecolor">Truecolor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ansi-output-mode">Output format</Label>
                  <Select
                    value={ansiSettings.outputMode}
                    onValueChange={(value) => handleSettingChange('outputMode', value as AnsiExportSettings['outputMode'])}
                    disabled={isExporting}
                  >
                    <SelectTrigger id="ansi-output-mode" className="w-full">
                      <SelectValue placeholder="Select output mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single-frame">Single frame</SelectItem>
                      <SelectItem value="animation">Runnable shell animation</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {ansiSettings.outputMode === 'animation'
                      ? 'Exports every frame with its timeline duration in a dependency-free shell script.'
                      : 'Exports the current frame as raw ANSI escape codes for direct terminal output.'}
                  </p>
                </div>

                {ansiSettings.outputMode === 'animation' && (
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="ansi-loop">Loop animation</Label>
                      <p className="text-xs text-muted-foreground">Restart after the final frame until interrupted.</p>
                    </div>
                    <Switch
                      id="ansi-loop"
                      checked={ansiSettings.loopAnimation}
                      onCheckedChange={(checked) => handleSettingChange('loopAnimation', checked)}
                      disabled={isExporting}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="ansi-clear">Clear terminal before frame</Label>
                    <p className="text-xs text-muted-foreground">Clear once before drawing at the terminal origin.</p>
                  </div>
                  <Switch
                    id="ansi-clear"
                    checked={ansiSettings.clearScreen}
                    onCheckedChange={(checked) => handleSettingChange('clearScreen', checked)}
                    disabled={isExporting}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="ansi-metadata">Include metadata</Label>
                    <p className="text-xs text-muted-foreground">
                      {ansiSettings.outputMode === 'animation'
                        ? 'Add project details as non-rendered shell comments.'
                        : 'Print project details before the exported frame.'}
                    </p>
                  </div>
                  <Switch
                    id="ansi-metadata"
                    checked={ansiSettings.includeMetadata}
                    onCheckedChange={(checked) => handleSettingChange('includeMetadata', checked)}
                    disabled={isExporting}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-muted/30">
              <CardContent className="pt-4 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  <span className="font-medium text-foreground">Export summary</span>
                </div>
                <ul className="space-y-1 pl-5 list-disc">
                  <li>{frameCount} frame{frameCount === 1 ? '' : 's'} ready for export.</li>
                  <li>{Math.round(totalDurationMs / 1000)}s total animation length.</li>
                  <li>{ansiSettings.colorMode === 'ansi' ? 'ANSI 16 semantic palette' : ansiSettings.colorMode === '256' ? 'xterm-256 compatible' : 'Full 24-bit truecolor'}</li>
                  <li>{ansiSettings.outputMode === 'animation' ? 'Runnable shell animation with timeline timing' : 'Directly printable current-frame ANSI data'}</li>
                </ul>
                {postEffectTracks.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Post-processing effects are excluded from terminal exports because they are not represented in ANSI output.
                  </p>
                )}
              </CardContent>
            </Card>

            <Collapsible open={howToOpen} onOpenChange={setHowToOpen} className="rounded-lg border border-border/50">
              <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-muted/50">
                <span className="flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  How to display this export in a terminal
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${howToOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="border-t border-border/50 px-4 py-3 space-y-3 text-xs text-muted-foreground">
                {ansiSettings.outputMode === 'animation' ? (
                  <>
                    <p>
                      Run the exported shell script from a terminal. Press <code className="rounded bg-muted px-1 py-0.5">Ctrl+C</code> to stop a looping animation.
                    </p>
                    <pre className="overflow-x-auto rounded-md bg-black px-3 py-2 font-mono text-green-400">
                      <code>{`sh ${sanitizedFileName || 'animation'}.sh`}</code>
                    </pre>
                    <p>
                      To run it directly next time, make it executable:
                    </p>
                    <pre className="overflow-x-auto rounded-md bg-black px-3 py-2 font-mono text-green-400">
                      <code>{`chmod +x ${sanitizedFileName || 'animation'}.sh\n./${sanitizedFileName || 'animation'}.sh`}</code>
                    </pre>
                  </>
                ) : (
                  <>
                    <p>
                      Print the exported ANSI file directly. Use a terminal with ANSI color support.
                    </p>
                    <pre className="overflow-x-auto rounded-md bg-black px-3 py-2 font-mono text-green-400">
                      <code>{`cat ${sanitizedFileName || 'frame'}.ansi`}</code>
                    </pre>
                    <p>
                      To page through the output while preserving colors, use:
                    </p>
                    <pre className="overflow-x-auto rounded-md bg-black px-3 py-2 font-mono text-green-400">
                      <code>{`less -R ${sanitizedFileName || 'frame'}.ansi`}</code>
                    </pre>
                  </>
                )}
                <p>
                  xterm-256 works in most modern terminals. Truecolor requires 24-bit color support.
                </p>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="border-t border-border/50 bg-background px-6 py-4 flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isExporting}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting || !exportData || !sanitizedFileName}>
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {isExporting ? 'Exporting...' : 'Export ANSI'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
