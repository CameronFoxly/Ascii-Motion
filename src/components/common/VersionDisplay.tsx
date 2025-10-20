import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Calendar, GitCommit, Hash } from 'lucide-react';
import { VERSION, BUILD_DATE, BUILD_HASH, VERSION_HISTORY } from '@/constants/version';

export const VersionDisplay: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

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
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setShowModal(true)}
              className="text-xs font-mono text-muted-foreground/60 hover:text-muted-foreground/80 transition-colors cursor-pointer select-none border-none bg-transparent p-0 m-0"
            >
              v{VERSION}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Built on {formatDate(BUILD_DATE)} • Click for version history</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg w-[90vw] h-[85vh] max-h-[600px] flex flex-col p-0 border-border/50" aria-describedby={undefined}>
          {/* Fixed Header */}
          <DialogHeader className="flex-shrink-0 px-4 py-3 border-b border-border/50">
            <DialogTitle className="flex items-center gap-2 text-base">
              <GitCommit className="w-4 h-4" />
              ASCII Motion Version History
            </DialogTitle>
          </DialogHeader>

          {/* Fixed Current Build Info */}
          <div className="flex-shrink-0 px-4 py-3 bg-muted/50">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-sm">Current Version: v{VERSION}</span>
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

          {/* Scrollable Content */}
          <div className="flex-1 overflow-hidden px-4 py-2">
            <h3 className="font-medium mb-2 text-sm">Release History</h3>
            <ScrollArea className="h-full pr-2">
              <div className="space-y-3 pb-2">
                {VERSION_HISTORY.slice().map((release, index) => (
                  <div key={release.version} className="relative">
                    {/* Version Header */}
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm text-primary">
                        v{release.version}
                        {index === 0 && (
                          <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                            Current
                          </span>
                        )}
                      </h4>
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
          </div>

          {/* Fixed Footer */}
          <div className="flex-shrink-0 px-4 py-3 border-t bg-background">
            {/* Feedback Section */}
            <div className="bg-muted/30 rounded p-2 mb-3">
              <p className="text-xs text-muted-foreground">
                ASCII Motion is currently in development, and I welcome feedback. Please report bugs, request features, or just say hi by opening an issue on this project's{' '}
                <a 
                  href="https://github.com/CameronFoxly/Ascii-Motion" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  repo
                </a>
                .
              </p>
            </div>
            
            {/* Bottom Actions */}
            <div className="flex justify-between items-center">
              <div className="text-xs text-muted-foreground">
                Made with ❤️ by{' '}
                <a 
                  href="https://github.com/cameronfoxly" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Cameron Foxly
                </a>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};