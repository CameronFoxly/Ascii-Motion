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

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ExternalLink } from 'lucide-react';
import { useWelcomeDialog } from '@/hooks/useWelcomeDialog';
import { useToolStore } from '@/stores/toolStore';
import { WelcomeAsciiAnimation } from './WelcomeAsciiAnimation';
import type { WelcomeTab } from '@/types/welcomeDialog';
import type { Tool } from '@/types';

/**
 * Vimeo embed component with placeholder image
 * Shows thumbnail immediately, loads iframe behind it, then fades thumbnail away
 */
const VimeoEmbed: React.FC<{ 
  embedId: string; 
  title: string;
  preload?: boolean; // Preload iframe even if not visible
  autoLoad?: boolean; // Auto-load iframe immediately (for active tab)
}> = ({ embedId, title, preload = false, autoLoad = false }) => {
  const [videoReady, setVideoReady] = useState(false);
  const [shouldLoadIframe, setShouldLoadIframe] = useState(autoLoad);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  
  // Vimeo thumbnail URL (Vimeo provides thumbnails via their API)
  // Using a static placeholder pattern that works for most Vimeo videos
  const thumbnailUrl = `https://vumbnail.com/${embedId}.jpg`;
  
  // Preload iframe after a short delay if preload is enabled
  React.useEffect(() => {
    if (preload && !shouldLoadIframe) {
      console.log(`[Preload] Starting preload for video ${embedId}`);
      const timer = setTimeout(() => {
        console.log(`[Preload] Loading iframe for video ${embedId}`);
        setShouldLoadIframe(true);
      }, 500); // Preload after 500ms
      return () => clearTimeout(timer);
    }
  }, [preload, shouldLoadIframe, embedId]);
  
  // Auto-load if autoLoad prop changes to true
  React.useEffect(() => {
    if (autoLoad) {
      console.log(`[AutoLoad] Loading active video ${embedId}`);
      setShouldLoadIframe(true);
    }
  }, [autoLoad, embedId]);
  
  // Listen for Vimeo player events via postMessage
  React.useEffect(() => {
    if (!shouldLoadIframe) return;
    
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from Vimeo
      if (!event.origin.includes('vimeo.com')) return;
      
      try {
        const data = JSON.parse(event.data);
        
        // Video is ready when it starts playing or buffering completes
        if (data.event === 'play' || data.event === 'timeupdate') {
          if (!videoReady) {
            console.log(`[Video Ready] Video ${embedId} is playing`);
            setVideoReady(true);
          }
        }
      } catch (e) {
        // Ignore parse errors from non-JSON messages
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Fallback: if video events don't fire, fade in after 1 second
    const fallbackTimer = setTimeout(() => {
      if (!videoReady) {
        console.log(`[Fallback] Video ${embedId} fallback timeout`);
        setVideoReady(true);
      }
    }, 1000);
    
    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(fallbackTimer);
    };
  }, [shouldLoadIframe, videoReady, embedId]);

  return (
    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
      {/* Iframe - render when needed, behind the thumbnail */}
      {shouldLoadIframe && (
        <iframe
          ref={iframeRef}
          src={`https://player.vimeo.com/video/${embedId}?h=&badge=0&autopause=0&autoplay=1&muted=1&loop=1&background=1`}
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
          className="absolute top-0 left-0 w-full h-full rounded-md border border-border/50"
          title={title}
          {...({ credentialless: 'true' } as any)}
        />
      )}
      
      {/* Placeholder thumbnail - overlay on top, fades out when video is ready */}
      <div 
        className={`absolute inset-0 transition-opacity duration-500 ${
          videoReady ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <img
          src={thumbnailUrl}
          alt={title}
          className="absolute top-0 left-0 w-full h-full rounded-md border border-border/50 object-cover"
          loading="eager" // Load thumbnail immediately
        />
        {/* Loading indicator overlay */}
        {shouldLoadIframe && !videoReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-md">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Media display component that handles different media types
 */
const MediaDisplay: React.FC<{ 
  media: WelcomeTab['media'];
  isActive?: boolean; // Is this the currently active tab?
  shouldPreload?: boolean; // Should preload (adjacent to active tab)
}> = ({ media, isActive = false, shouldPreload = false }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Handle component type (for Welcome tab)
  if (media.type === 'component' && media.component === 'welcome-ascii') {
    return <WelcomeAsciiAnimation />;
  }
  
  if (media.type === 'vimeo' && media.embedId) {
    return (
      <VimeoEmbed 
        embedId={media.embedId} 
        title={media.alt}
        autoLoad={isActive}
        preload={shouldPreload}
      />
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
  closeDialog: () => void,
  setActiveTab: (tab: string) => void
): WelcomeTab[] => [
  {
    id: 'welcome',
    title: 'Welcome',
    description: "ASCII Motion is a browser-based tool for creating, animating, and exporting ASCII art. Draw text-based art from scratch, convert images & videos automatically, or build frame-by-frame animations in the timeline.",
    cta: {
      text: 'Explore Features',
      action: () => {
        setActiveTab('create');
      },
    },
    secondaryCta: {
      text: 'Start Creating',
      href: '#start-creating',
    },
    media: {
      type: 'component',
      component: 'welcome-ascii',
      alt: 'ASCII Motion animated logo',
    },
  },
  {
    id: 'create',
    title: 'Create ASCII Art',
    description: 'Draw directly on the canvas with a variety tools including pencil, eraser, shapes, text, and paint bucket. Create pixel-perfect ASCII art with full color support and custom character palettes.',
    cta: {
      text: 'Start drawing',
      action: () => {
        setActiveTool('pencil');
        closeDialog();
      },
    },
    media: {
      type: 'vimeo',
      embedId: '1129067336',
      alt: 'ASCII art creation demonstration',
    },
  },
  {
    id: 'convert',
    title: 'Convert Images/Videos',
    description: 'Import images and videos to automatically convert them into ASCII art. Adjust settings like character and color mapping, pre-processing effects, and position/scaling for the perfect look for your project.',
    cta: {
      text: 'Import an Image',
      action: () => {
        // TODO: Trigger import dialog
        closeDialog();
      },
    },
    media: {
      type: 'vimeo',
      embedId: '1129088419',
      alt: 'Image to ASCII conversion demonstration',
    },
  },
  {
    id: 'animate',
    title: 'Animate Frame-by-Frame',
    description: 'Create animations with a fully editable timeline equipped with onion skinning for frame by frame editing.',
    cta: {
      text: 'Add a New Frame',
      action: () => {
        // TODO: Trigger add frame action
        closeDialog();
      },
    },
    media: {
      type: 'vimeo',
      embedId: '1129091888',
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
    media: {
      type: 'vimeo',
      embedId: '1129095779',
      alt: 'Export formats demonstration',
    },
  },
  {
    id: 'opensource',
    title: 'Open Source',
    description: "ASCII Motion's core features are all open source. Contributions, bug reports, feature requests, and feedback are always welcome. Join our community and help make ASCII Motion even better!",
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
      type: 'vimeo',
      embedId: '1129095901',
      alt: 'ASCII Motion on GitHub',
    },
  },
];

/**
 * Main Welcome Dialog Component
 */
export const WelcomeDialog: React.FC = () => {
  const { isOpen, setIsOpen, dontShowAgain, setDontShowAgain } = useWelcomeDialog();
  const [activeTab, setActiveTab] = useState('welcome');
  const setActiveTool = useToolStore((state) => state.setActiveTool);
  
  const welcomeTabs = createWelcomeTabs(
    setActiveTool,
    () => setIsOpen(false),
    setActiveTab
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent 
        className="max-w-4xl p-0 gap-0 border-border/50 h-[68vh] max-h-[600px]"
        aria-describedby="welcome-dialog-description"
      >
        <DialogTitle className="sr-only">Welcome to ASCII Motion</DialogTitle>
        <div className="grid grid-cols-[300px_1fr] h-full overflow-hidden">
          {/* Left Navigation Panel */}
          <div className="flex flex-col border-r border-border/50 bg-muted/30 overflow-hidden">
            {/* Header - Fixed */}
            <div className="flex-shrink-0 px-6 py-6 pb-4">
              <div className="mb-2">
                <p className="text-sm text-muted-foreground mb-2">Welcome to</p>
                <div className="font-mono text-[7.2px] leading-[1.2] tracking-tighter select-none whitespace-pre -ml-[1.2ch]">
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

          {/* Right Content Area - pr-6 creates minimal space for close button */}
          <div className="flex flex-col h-full pr-6 overflow-hidden">
            <Tabs value={activeTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {welcomeTabs.map((tab, index) => {
                const isActive = tab.id === activeTab;
                const activeIndex = welcomeTabs.findIndex(t => t.id === activeTab);
                // Preload adjacent tabs (one before and one after)
                const shouldPreload = Math.abs(index - activeIndex) === 1;
                
                return (
                  <TabsContent
                    key={tab.id}
                    value={tab.id}
                    className="flex-1 flex flex-col p-6 mt-0 min-h-0 overflow-y-auto data-[state=inactive]:hidden"
                  >
                    {/* Media Display - Flexible but maintains aspect ratio */}
                    <div className="flex-shrink-0 mb-4">
                      <MediaDisplay 
                        media={tab.media}
                        isActive={isActive}
                        shouldPreload={shouldPreload}
                      />
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
                              // Handle special case for welcome tab
                              if (tab.secondaryCta!.href === '#start-creating') {
                                setActiveTool('pencil');
                                setIsOpen(false);
                              } else {
                                window.open(tab.secondaryCta!.href, '_blank');
                              }
                            }}
                          >
                            {tab.secondaryCta.text}
                            {tab.secondaryCta.href !== '#start-creating' && (
                              <ExternalLink className="ml-auto h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                );
              })}
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
