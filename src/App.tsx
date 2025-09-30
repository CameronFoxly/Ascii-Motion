import './App.css'
import { Analytics } from '@vercel/analytics/react'
import { Separator } from '@/components/ui/separator'
import { CanvasWithShortcuts } from './components/features/CanvasWithShortcuts'
import { CanvasProvider } from './contexts/CanvasContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ThemeToggle } from './components/common/ThemeToggle'
import { CollapsiblePanel } from './components/common/CollapsiblePanel'
import { PanelToggleButton } from './components/common/PanelToggleButton'
import { ToolPalette } from './components/features/ToolPalette'
import { MainCharacterPaletteSection } from './components/features/MainCharacterPaletteSection'
import { ColorPicker } from './components/features/ColorPicker'
import { ActiveStyleSection } from './components/features/ActiveStyleSection'
import { CanvasSettings } from './components/features/CanvasSettings'
import { AnimationTimeline } from './components/features/AnimationTimeline'
import { PlaybackOverlay } from './components/features/PlaybackOverlay'
import { FullscreenToggle } from './components/features/FullscreenToggle'
import { cn } from '@/lib/utils'
import { PerformanceOverlay } from './components/common/PerformanceOverlay'
import { ExportImportButtons } from './components/features/ExportImportButtons'
import { ImportModal } from './components/features/ImportModal'
import { MediaImportPanel } from './components/features/MediaImportPanel'
import { GradientPanel } from './components/features/GradientPanel'
import { EffectsPanel } from './components/features/EffectsPanel'
import { PngExportDialog } from './components/features/PngExportDialog'
import { VideoExportDialog } from './components/features/VideoExportDialog'
import { SessionExportDialog } from './components/features/SessionExportDialog'
import { TextExportDialog } from './components/features/TextExportDialog'
import { JsonExportDialog } from './components/features/JsonExportDialog'
import { HtmlExportDialog } from './components/features/HtmlExportDialog'
import { JsonImportDialog } from './components/features/JsonImportDialog'
import { useLayoutState } from './hooks/useLayoutState'
import { VersionDisplay } from './components/common/VersionDisplay'

function App() {
  const { layout, toggleLeftPanel, toggleRightPanel, toggleBottomPanel, toggleFullscreen } = useLayoutState()

  return (
    <ThemeProvider>
      <div className="h-screen grid grid-rows-[auto_1fr] bg-background text-foreground">
        {/* Header - compact */}
        <header className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="px-4 py-2">
            <div className="flex justify-between items-center">
              <div className="flex gap-3 relative">
                <pre className="font-mono text-[6px] leading-[1.1] ascii-logo-selectable tracking-tighter">
                  <div className="text-purple-500">----▗▄▖  ▗▄▄▖ ▗▄▄▖▗▄▄▄▖▗▄▄▄▖    ▗▖  ▗▖ ▗▄▖▗▄▄▄▖▗▄▄▄▖ ▗▄▖ ▗▖  ▗▖</div>
                  <div className="text-purple-400"> --▐▌ ▐▌▐▌   ▐▌     █    █      ▐▛▚▞▜▌▐▌ ▐▌ █    █  ▐▌ ▐▌▐▛▚▖▐▌</div>
                  <div className="text-purple-400">  -▐▛▀▜▌ ▝▀▚▖▐▌     █    █      ▐▌  ▐▌▐▌ ▐▌ █    █  ▐▌ ▐▌▐▌ ▝▜▌</div>
                  <div className="text-purple-300">  -▐▌ ▐▌▗▄▄▞▘▝▚▄▄▖▗▄█▄▖▗▄█▄▖    ▐▌  ▐▌▝▚▄▞▘ █  ▗▄█▄▖▝▚▄▞▘▐▌  ▐▌</div>
                </pre>
                <div className="absolute left-full ml-3" style={{ bottom: '-.5em' }}>
                  <VersionDisplay />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ExportImportButtons />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Grid */}
        <CanvasProvider>
          <div className="relative flex-1 overflow-hidden">
            {/* Left Panel - matches canvas height */}
            <div className={cn(
              "absolute top-0 left-0 z-10 transition-all duration-300 ease-out",
              layout.bottomPanelOpen ? "bottom-[var(--bottom-panel-height,20rem)]" : "bottom-4", // Use dynamic height or fallback
              !layout.leftPanelOpen && "pointer-events-none" // Allow mouse events to pass through when collapsed
            )}>
              <CollapsiblePanel
                isOpen={layout.leftPanelOpen}
                side="left"
                minWidth="w-44"
              >
                <div className="h-full flex flex-col">
                  {/* Tools at the top */}
                  <div className="flex-1">
                    <ToolPalette />
                  </div>
                </div>
              </CollapsiblePanel>
              
              {/* Left Panel Toggle Button - centered on canvas area */}
              <div className={cn(
                "absolute top-1/2 -translate-y-1/2 z-20 transition-all duration-300 ease-out pointer-events-auto",
                layout.leftPanelOpen ? "left-44" : "left-0"
              )}>
                <PanelToggleButton
                  isOpen={layout.leftPanelOpen}
                  onToggle={toggleLeftPanel}
                  side="left"
                />
              </div>
            </div>

            {/* Right Panel - matches canvas height */}
            <div className={cn(
              "absolute top-0 right-0 z-10 transition-all duration-300 ease-out",
              layout.bottomPanelOpen ? "bottom-[var(--bottom-panel-height,20rem)]" : "bottom-4", // Use dynamic height or fallback
              !layout.rightPanelOpen && "pointer-events-none" // Allow mouse events to pass through when collapsed
            )}>
              <CollapsiblePanel
                isOpen={layout.rightPanelOpen}
                side="right"
                minWidth="w-56"
              >
                <div className="space-y-3">
                  <ActiveStyleSection />
                  
                  <div className="relative -mx-4 h-px">
                    <Separator className="absolute inset-0" />
                  </div>
                  
                  <MainCharacterPaletteSection />
                  
                  <div className="relative -mx-4 h-px">
                    <Separator className="absolute inset-0" />
                  </div>
                  
                  {/* Color Picker - now contains its own collapsible sections */}
                  <ColorPicker />
                </div>
              </CollapsiblePanel>
              
              {/* Right Panel Toggle Button - centered on canvas area */}
              <div className={cn(
                "absolute top-1/2 -translate-y-1/2 z-20 transition-all duration-300 ease-out pointer-events-auto",
                layout.rightPanelOpen ? "right-56" : "right-0"
              )}>
                <PanelToggleButton
                  isOpen={layout.rightPanelOpen}
                  onToggle={toggleRightPanel}
                  side="right"
                />
              </div>
            </div>

            {/* Bottom Panel */}
            <div className={cn(
              "absolute bottom-0 left-0 right-0 z-10",
              !layout.bottomPanelOpen && "pointer-events-none" // Allow mouse events to pass through when collapsed
            )}>
              <CollapsiblePanel
                isOpen={layout.bottomPanelOpen}
                side="bottom"
              >
                {/* Bottom Panel Toggle Button - moves with the panel */}
                <div className="absolute left-1/2 -translate-x-1/2 -top-0.5 z-20 pointer-events-auto">
                  <PanelToggleButton
                    isOpen={layout.bottomPanelOpen}
                    onToggle={toggleBottomPanel}
                    side="bottom"
                  />
                </div>
                
                <AnimationTimeline />
              </CollapsiblePanel>
            </div>

            {/* Center Canvas Area - positioned to account for panel space */}
            <div 
              className={cn(
                "absolute inset-0 flex flex-col transition-all duration-300 ease-out",
                layout.leftPanelOpen && "left-44",
                layout.rightPanelOpen && "right-56", 
                layout.bottomPanelOpen ? "bottom-[var(--bottom-panel-height,20rem)]" : "bottom-4" // Use dynamic height or fallback
              )}
            >
              {/* Canvas Settings Header */}
              <div className="flex-shrink-0 border-b border-border/50 bg-background/95 backdrop-blur" style={{ overflow: 'visible', position: 'relative', zIndex: 10 }}>
                <div className="px-3 py-2 flex justify-center items-center">
                  <CanvasSettings />
                </div>
              </div>
              
              {/* Canvas Container - fills remaining space */}
              <div className="flex-1 overflow-auto min-h-0 bg-muted/10 relative">
                <div className="absolute inset-0 pt-4 px-4 pb-0">
                  <div className="w-full h-full relative">
                    <CanvasWithShortcuts className="w-full h-full" />
                    
                    {/* Playback Overlay - shows when timeline is collapsed */}
                    <PlaybackOverlay isVisible={!layout.bottomPanelOpen} />
                    
                    {/* Fullscreen Toggle - always visible */}
                    <FullscreenToggle 
                      isFullscreen={layout.isFullscreen}
                      onToggle={toggleFullscreen}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Export/Import Dialogs - Inside CanvasProvider to access context */}
          <ImportModal />
          <MediaImportPanel />
          <GradientPanel />
          <EffectsPanel />
          <PngExportDialog />
          <VideoExportDialog />
          <SessionExportDialog />
          <TextExportDialog />
          <JsonExportDialog />
          <HtmlExportDialog />
          <JsonImportDialog />
        </CanvasProvider>
        
        {/* Performance Overlay for Development */}
        <PerformanceOverlay />
      </div>
      
      {/* Vercel Analytics */}
      <Analytics />
    </ThemeProvider>
  )
}

export default App
