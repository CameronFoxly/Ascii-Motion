import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { ExternalLink, Github } from 'lucide-react';

interface AboutDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AboutDialog: React.FC<AboutDialogProps> = ({ 
  isOpen, 
  onOpenChange 
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>About ASCII Motion</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            {/* Description */}
            <Card className="border-border/50">
              <CardContent className="pt-4">
                <p className="text-sm text-foreground leading-relaxed">
                  ASCII Motion is a tool for creating, editing, and animating 
                  ASCII/ANSI art. Draw with characters directly onto the canvas, or import an image/video 
                  and convert it to ascii art and manage it all on a timeline. 
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
                    <Github className="mr-2 h-4 w-4" />
                    View on GitHub
                    <ExternalLink className="ml-auto h-3 w-3" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => window.open('https://github.com/cameronfoxly/Ascii-Motion/issues', '_blank')}
                  >
                    <Github className="mr-2 h-4 w-4" />
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
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
