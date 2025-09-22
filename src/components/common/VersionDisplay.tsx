import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
      <button
        onClick={() => setShowModal(true)}
        className="text-xs font-mono text-muted-foreground/60 hover:text-muted-foreground/80 transition-colors cursor-pointer select-none border-none bg-transparent p-0 m-0"
        title={`Built on ${formatDate(BUILD_DATE)} • Click for version history`}
      >
        v{VERSION}
      </button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCommit className="w-5 h-5" />
              ASCII Motion Version History
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Build Info */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-lg">Current Version: v{VERSION}</span>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Hash className="w-4 h-4" />
                  <span className="font-mono">{BUILD_HASH}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Built on {formatDate(BUILD_DATE)}</span>
              </div>
            </div>

            <Separator />

            {/* Version History */}
            <div>
              <h3 className="font-semibold mb-3">Release History</h3>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-6">
                  {VERSION_HISTORY.slice().reverse().map((release, index) => (
                    <div key={release.version} className="relative">
                      {/* Version Header */}
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-primary">
                          v{release.version}
                          {index === 0 && (
                            <span className="ml-2 px-2 py-1 text-xs bg-primary text-primary-foreground rounded-full">
                              Current
                            </span>
                          )}
                        </h4>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(release.date)}
                        </span>
                      </div>

                      {/* Commit List */}
                      <div className="ml-4 space-y-1">
                        {release.commits.map((commit, commitIndex) => (
                          <div key={commitIndex} className="flex items-start gap-2 text-sm">
                            <div className="w-2 h-2 rounded-full bg-muted-foreground/50 mt-2 flex-shrink-0" />
                            <span className="text-muted-foreground">{commit}</span>
                          </div>
                        ))}
                      </div>

                      {/* Separator between versions */}
                      {index < VERSION_HISTORY.length - 1 && (
                        <Separator className="mt-4" />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};