/**
 * Welcome Dialog Component
 * 
 * First-time user experience with vertical tabs showing:
 * - Feature highlights
 * - Getting started information
 * - Call-to-action buttons
 * 
 * Shows on first visit and after major version updates.
 */

import React, { useState, lazy, Suspense } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Play } from 'lucide-react';
import { useWelcomeDialog } from '@/hooks/useWelcomeDialog';
import { useToolStore } from '@/stores/toolStore';
import type { WelcomeTab } from '@/types/welcomeDialog';
import type { Tool } from '@/types';

// Lazy load the demo component for better initial load performance
const SimpleAsciiDemo = lazy(() => 
  import('@/components/demos/SimpleAsciiDemo').then(module => ({ 
    default: module.SimpleAsciiDemo 
  }))
);

/**
 * YouTube placeholder component
 * Shows YouTube thumbnail with play button - opens in new tab
 * (Can't use iframe due to COEP headers required for FFmpeg)
 */
const YouTubeEmbed: React.FC<{ embedId: string; title: string }> = ({ embedId, title }) => {
  return (
    <a
      href={`https://www.youtube.com/watch?v=${embedId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="relative w-full block group cursor-pointer"
      style={{ paddingBottom: '56.25%' }}
    >
      <div className="absolute inset-0 bg-muted/30 rounded-md border border-border/50 flex items-center justify-center overflow-hidden">
        {/* YouTube thumbnail */}
        <img
          src={`https://img.youtube.com/vi/${embedId}/maxresdefault.jpg`}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            // Fallback to medium quality thumbnail if maxres doesn't exist
            e.currentTarget.src = `https://img.youtube.com/vi/${embedId}/hqdefault.jpg`;
          }}
        />
        {/* Play button overlay */}
        <div className="relative z-10 w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:bg-red-700 transition-colors shadow-lg">
          <Play className="w-8 h-8 text-white fill-white ml-1" />
        </div>
      </div>
    </a>
  );
};

/**
 * Media display component that handles different media types
 */
const MediaDisplay: React.FC<{ media: WelcomeTab['media'] }> = ({ media }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  if (media.type === 'youtube' && media.embedId) {
    return <YouTubeEmbed embedId={media.embedId} title={media.alt} />;
  }
  
  if (media.type === 'component' && media.component) {
    const Component = media.component;
    return (
      <div className="w-full bg-muted/30 rounded-md border border-border/50" style={{ aspectRatio: '16/9' }}>
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            Loading demo...
          </div>
        }>
          <Component />
        </Suspense>
      </div>
    );
  }
  
  if (media.type === 'image' && media.src) {
    return (
      <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
        {media.placeholder && !imageLoaded && (
          <img
            src={media.placeholder}
            alt={media.alt}
            className="absolute inset-0 w-full h-full object-cover rounded-md blur-sm"
          />
        )}
        <img
          src={media.src}
          alt={media.alt}
          className={`w-full h-full object-cover rounded-md border border-border/50 transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
        />
      </div>
    );
  }
  
  // Fallback for unsupported media types
  return (
    <div className="w-full bg-muted/30 rounded-md border border-border/50 flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
      <p className="text-muted-foreground">Media preview</p>
    </div>
  );
};

/**
 * Define welcome tabs with content
 */
const createWelcomeTabs = (
  setActiveTool: (tool: Tool) => void,
  closeDialog: () => void
): WelcomeTab[] => [
  {
    id: 'create',
    title: 'Create ASCII Art',
    description: 'Draw directly on the canvas with a variety of powerful tools including pencil, eraser, shapes, text, and paint bucket. Create pixel-perfect ASCII art with full color support and custom character palettes.',
    cta: {
      text: 'Try the Pencil Tool',
      action: () => {
        setActiveTool('pencil');
        closeDialog();
      },
    },
    secondaryCta: {
      text: 'View All Drawing Tools',
      href: 'https://github.com/cameronfoxly/Ascii-Motion#drawing-tools',
    },
    media: {
      type: 'youtube',
      embedId: 'QMYfkOtYYlg',
      alt: 'ASCII art creation demonstration',
    },
  },
  {
    id: 'convert',
    title: 'Convert Images/Videos',
    description: 'Import images and videos to automatically convert them into ASCII art. Adjust conversion settings like character density, contrast, and color mapping to achieve the perfect look for your project.',
    cta: {
      text: 'Import an Image',
      action: () => {
        // TODO: Trigger import dialog
        closeDialog();
      },
    },
    secondaryCta: {
      text: 'Learn About Import Settings',
      href: 'https://github.com/cameronfoxly/Ascii-Motion#media-import',
    },
    media: {
      type: 'youtube',
      embedId: 'QMYfkOtYYlg',
      alt: 'Image to ASCII conversion demonstration',
    },
  },
  {
    id: 'animate',
    title: 'Animate Frame-by-Frame',
    description: 'Create smooth animations with our powerful timeline system. Add, duplicate, and reorder frames with ease. Use onion skinning to see previous frames while drawing, making animation workflows intuitive and efficient.',
    cta: {
      text: 'Add a New Frame',
      action: () => {
        // TODO: Trigger add frame action
        closeDialog();
      },
    },
    secondaryCta: {
      text: 'View Animation Guide',
      href: 'https://github.com/cameronfoxly/Ascii-Motion#animation',
    },
    media: {
      type: 'component',
      component: SimpleAsciiDemo,
      alt: 'ASCII animation demonstration',
    },
  },
  {
    id: 'export',
    title: 'Export Multiple Formats',
    description: 'Export your creations in various formats: PNG/JPEG images, MP4/WebM videos, interactive HTML, plain text, JSON data, or as React components. Each format is optimized for different use cases and platforms.',
    cta: {
      text: 'Export Your Work',
      action: () => {
        // TODO: Trigger export dialog
        closeDialog();
      },
    },
    secondaryCta: {
      text: 'View Export Options',
      href: 'https://github.com/cameronfoxly/Ascii-Motion#export',
    },
    media: {
      type: 'youtube',
      embedId: 'QMYfkOtYYlg',
      alt: 'Export formats demonstration',
    },
  },
  {
    id: 'opensource',
    title: 'Open Source',
    description: 'ASCII Motion is completely open source and built with the help of GitHub Copilot. Contributions, bug reports, feature requests, and feedback are always welcome. Join our community and help make ASCII Motion even better!',
    cta: {
      text: 'View on GitHub',
      action: () => {
        window.open('https://github.com/cameronfoxly/Ascii-Motion', '_blank');
        closeDialog();
      },
    },
    secondaryCta: {
      text: 'Report a Bug or Suggest a Feature',
      href: 'https://github.com/cameronfoxly/Ascii-Motion/issues/new',
    },
    media: {
      type: 'youtube',
      embedId: 'QMYfkOtYYlg',
      alt: 'ASCII Motion on GitHub',
    },
  },
];

/**
 * Main Welcome Dialog Component
 */
export const WelcomeDialog: React.FC = () => {
  const { isOpen, setIsOpen, dontShowAgain, setDontShowAgain } = useWelcomeDialog();
  const [activeTab, setActiveTab] = useState('create');
  const setActiveTool = useToolStore((state) => state.setActiveTool);
  
  const welcomeTabs = createWelcomeTabs(
    setActiveTool,
    () => setIsOpen(false)
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent 
        className="max-w-4xl p-0 gap-0 border-border/50 h-[68vh] max-h-[600px]"
        aria-describedby="welcome-dialog-description"
      >
        <DialogTitle className="sr-only">Welcome to ASCII Motion</DialogTitle>
        <div className="grid grid-cols-[280px_1fr] h-full overflow-hidden">
          {/* Left Navigation Panel */}
          <div className="flex flex-col border-r border-border/50 bg-muted/30 overflow-hidden">
            {/* Header - Fixed */}
            <div className="flex-shrink-0 px-4 py-6 pb-4">
              <div className="mb-2">
                <p className="text-sm text-muted-foreground mb-2">Welcome to</p>
                <div className="font-mono text-[7.2px] leading-[1.2] tracking-tighter select-none whitespace-pre">
                  <div className="text-purple-500">----▗▄▖  ▗▄▄▖ ▗▄▄▖▗▄▄▄▖▗▄▄▄▖    ▗▖  ▗▖ ▗▄▖▗▄▄▄▖▗▄▄▄▖ ▗▄▖ ▗▖  ▗▖</div>
                  <div className="text-purple-400"> --▐▌ ▐▌▐▌   ▐▌     █    █      ▐▛▚▞▜▌▐▌ ▐▌ █    █  ▐▌ ▐▌▐▛▚▖▐▌</div>
                  <div className="text-purple-400">  -▐▛▀▜▌ ▝▀▚▖▐▌     █    █      ▐▌  ▐▌▐▌ ▐▌ █    █  ▐▌ ▐▌▐▌ ▝▜▌</div>
                  <div className="text-purple-300">  -▐▌ ▐▌▗▄▄▞▘▝▚▄▄▖▗▄█▄▖▗▄█▄▖    ▐▌  ▐▌▝▚▄▞▘ █  ▗▄█▄▖▝▚▄▞▘▐▌  ▐▌</div>
                </div>
              </div>
            </div>

            <Separator className="flex-shrink-0 bg-border/50" />

            {/* Tabs - Scrollable middle section */}
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab}
              orientation="vertical"
              className="flex-1 flex flex-col min-h-0 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto">
                <TabsList className="flex flex-col h-auto bg-transparent p-2 gap-1">
                  {welcomeTabs.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="w-full justify-start px-4 py-2.5 text-left data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                      {tab.title}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {/* Don't show again checkbox - Fixed at bottom */}
              <div className="flex-shrink-0 p-4 border-t border-border/50">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={dontShowAgain}
                    onCheckedChange={(checked) => setDontShowAgain(checked === true)}
                    id="dont-show-again"
                  />
                  <span className="text-sm text-muted-foreground select-none">
                    Don't show again
                  </span>
                </label>
              </div>
            </Tabs>
          </div>

          {/* Right Content Area - pr-12 creates space for close button */}
          <div className="flex flex-col h-full pr-12 overflow-hidden">
            <Tabs value={activeTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {welcomeTabs.map((tab) => (
                <TabsContent
                  key={tab.id}
                  value={tab.id}
                  className="flex-1 flex flex-col p-6 mt-0 min-h-0 overflow-y-auto data-[state=inactive]:hidden"
                >
                  {/* Media Display - Flexible but maintains aspect ratio */}
                  <div className="flex-shrink-0 mb-4">
                    <MediaDisplay media={tab.media} />
                  </div>

                  {/* Content Card - Constrained to available space */}
                  <Card className="border-border/50 flex-shrink-0">
                    <CardContent className="pt-6 pb-6">
                      <p 
                        id="welcome-dialog-description"
                        className="text-sm text-foreground leading-relaxed mb-4"
                      >
                        {tab.description}
                      </p>

                      {/* CTAs */}
                      <div className="flex flex-col gap-2">
                        {tab.cta && (
                          <Button
                            onClick={tab.cta.action}
                            variant={tab.cta.variant || 'default'}
                            className="w-full justify-start"
                          >
                            {tab.cta.text}
                          </Button>
                        )}
                        
                        {tab.secondaryCta && (
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => {
                              window.open(tab.secondaryCta!.href, '_blank');
                            }}
                          >
                            {tab.secondaryCta.text}
                            <ExternalLink className="ml-auto h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
