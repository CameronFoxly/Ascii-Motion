import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Separator } from '../ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ExternalLink, ChevronDown, Calendar, GitCommit, Hash } from 'lucide-react';
import { GitHubIcon } from '../icons';
import { VERSION, BUILD_DATE, BUILD_HASH, VERSION_HISTORY } from '@/constants/version';

interface AboutDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AboutDialog: React.FC<AboutDialogProps> = ({ 
  isOpen, 
  onOpenChange 
}) => {
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-col items-start gap-1">
            <div className="relative inline-block">
              <pre className="font-mono text-[6px] leading-[1.1] tracking-tighter select-none inline-block">
                <div className="text-purple-500"> ▗▄▖ ▗▄▄▖  ▗▄▖ ▗▖ ▗▖▗▄▄▄▖     ▗▄▖  ▗▄▄▖ ▗▄▄▖▗▄▄▄▖▗▄▄▄▖    ▗▖  ▗▖ ▗▄▖▗▄▄▄▖▗▄▄▄▖ ▗▄▖ ▗▖  ▗▖</div>
                <div className="text-purple-400">▐▌ ▐▌▐▌ ▐▌▐▌ ▐▌▐▌ ▐▌  █      ▐▌ ▐▌▐▌   ▐▌     █    █      ▐▛▚▞▜▌▐▌ ▐▌ █    █  ▐▌ ▐▌▐▛▚▖▐▌</div>
                <div className="text-purple-400">▐▛▀▜▌▐▛▀▚▖▐▌ ▐▌▐▌ ▐▌  █      ▐▛▀▜▌ ▝▀▚▖▐▌     █    █      ▐▌  ▐▌▐▌ ▐▌ █    █  ▐▌ ▐▌▐▌ ▝▜▌</div>
                <div className="text-purple-300">▐▌ ▐▌▐▙▄▞▘▝▚▄▞▘▝▚▄▞▘  █      ▐▌ ▐▌▗▄▄▞▘▝▚▄▄▖▗▄█▄▖▗▄█▄▖    ▐▌  ▐▌▝▚▄▞▘ █  ▗▄█▄▖▝▚▄▞▘▐▌  ▐▌</div>
              </pre>
              <span className="absolute bottom-[-3px] left-[100%] ml-1 text-xs font-mono text-muted-foreground whitespace-nowrap">v{VERSION}</span>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            {/* Description */}
            <Card className="border-border/50">
              <CardContent className="pt-4">
                <p className="text-sm text-foreground leading-relaxed">
                  ASCII Motion is a tool for creating, editing, and animating 
                  ASCII/ANSI art. Draw with characters directly onto the canvas, or import an image/video 
                  and convert it to ascii art and manage it all on a timeline for frame-by-frame animation. 
                </p>
              </CardContent>
            </Card>

            {/* Features */}
            <Card className="border-border/50">
              <CardContent className="pt-4">
                <h3 className="text-sm font-semibold mb-3">Features</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• <strong>Drawing Tools</strong> - Draw directly on the canvas with charaters</li>
                  <li>• <strong>Media Import</strong> - Convert images and videos to ASCII art</li>
                  <li>• <strong>Frame-by-Frame Animation</strong> - Timeline controls with onion skinning</li>
                  <li>• <strong>Custom Palettes</strong> - Create and manage custom color and character palettes</li>
                  <li>• <strong>Multiple Export Formats</strong> - Export as Image, Video, HTML, JSON, or plain text</li>
                  <li>• <strong>Effects System</strong> - Apply adjustments and animated effects</li>
                </ul>
              </CardContent>
            </Card>

            {/* Open Source */}
            <Card className="border-border/50">
              <CardContent className="pt-4">
                <h3 className="text-sm font-semibold mb-3">Open Source</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  ASCII Motion is in active development, and completely open source with lots of help from GitHub Copilot. 
                  Please open an issue in the repo! Contributions, suggestions, or moral support welcome ❤️.
                </p>
                
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => window.open('https://github.com/cameronfoxly/Ascii-Motion', '_blank')}
                  >
                    <GitHubIcon className="mr-2 h-4 w-4" />
                    View on GitHub
                    <ExternalLink className="ml-auto h-3 w-3" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => window.open('https://github.com/cameronfoxly/Ascii-Motion/issues/new', '_blank')}
                  >
                    <GitHubIcon className="mr-2 h-4 w-4" />
                    Report a Bug or Suggest a Feature
                    <ExternalLink className="ml-auto h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* License */}
            <div className="text-xs text-center text-muted-foreground pt-2">
              Licensed under the MIT License
            </div>

            {/* Version History - Collapsible Section */}
            <Collapsible
              open={showVersionHistory}
              onOpenChange={setShowVersionHistory}
              className="mt-4"
            >
              <Card className="border-border/50">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-4 h-auto hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <GitCommit className="w-4 h-4" />
                      <span className="text-sm font-semibold">Version History</span>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${
                        showVersionHistory ? 'rotate-180' : ''
                      }`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4">
                    {/* Current Build Info */}
                    <div className="mb-4 p-3 bg-muted/50 rounded-md">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">Current Build</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Hash className="w-3 h-3" />
                          <span className="font-mono">{BUILD_HASH}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>Built on {formatDate(BUILD_DATE)}</span>
                      </div>
                    </div>

                    <Separator className="mb-3" />

                    {/* Release History */}
                    <h4 className="font-medium mb-3 text-sm">Release History</h4>
                    <ScrollArea className="h-[300px] pr-3">
                      <div className="space-y-3">
                        {VERSION_HISTORY.slice().map((release, index) => (
                          <div key={release.version} className="relative">
                            {/* Version Header */}
                            <div className="flex items-center justify-between mb-1">
                              <h5 className="font-medium text-sm text-primary">
                                v{release.version}
                                {index === 0 && (
                                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                                    Current
                                  </span>
                                )}
                              </h5>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(release.date)}
                              </span>
                            </div>

                            {/* Commit List */}
                            <div className="ml-3 space-y-0.5">
                              {release.commits.map((commit, commitIndex) => (
                                <div key={commitIndex} className="flex items-start gap-1.5 text-xs">
                                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 mt-1.5 flex-shrink-0" />
                                  <span className="text-muted-foreground leading-relaxed">{commit}</span>
                                </div>
                              ))}
                            </div>

                            {/* Separator between versions */}
                            {index < VERSION_HISTORY.length - 1 && (
                              <Separator className="mt-2 mb-1" />
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
