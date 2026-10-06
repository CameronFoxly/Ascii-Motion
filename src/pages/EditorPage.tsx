import { useEffect } from 'react'
import { useLayoutState } from '../hooks/useLayoutState'
import { cn } from '@/lib/utils'
import { CanvasWithShortcuts } from '../components/features/CanvasWithShortcuts'
import { CollapsiblePanel } from '../components/common/CollapsiblePanel'
import { PanelToggleButton } from '../components/common/PanelToggleButton'
import { PanelSeparator } from '../components/common/PanelSeparator'
import { ToolPalette } from '../components/features/ToolPalette'
import { MainCharacterPaletteSection } from '../components/features/MainCharacterPaletteSection'
import { ColorPicker } from '../components/features/ColorPicker'
import { ActiveStyleSection } from '../components/features/ActiveStyleSection'
import { CanvasSettings } from '../components/features/CanvasSettings'
import { TimelinePanel } from '../components/features/TimelinePanel'
import { TimelineResizeHandle } from '../components/features/timeline/TimelineResizeHandle'
import { PlaybackOverlay } from '../components/features/PlaybackOverlay'
import { FullscreenToggle } from '../components/features/FullscreenToggle'
import { AsciiTypePanel } from '../components/features/AsciiTypePanel'
import { AsciiBoxPanel } from '../components/features/AsciiBoxPanel'
import { AsciiTypePreviewDialog } from '../components/features/AsciiTypePreviewDialog'
import { ImportModal } from '../components/features/ImportModal'
import { MediaImportPanel } from '../components/features/MediaImportPanel'
import { GradientPanel } from '../components/features/GradientPanel'
import { GeneratorsPanel } from '../components/features/GeneratorsPanel'
import { ImageExportDialog } from '../components/features/ImageExportDialog'
import { VideoExportDialog } from '../components/features/VideoExportDialog'
import { SessionExportDialog } from '../components/features/SessionExportDialog'
import { TextExportDialog } from '../components/features/TextExportDialog'
import { JsonExportDialog } from '../components/features/JsonExportDialog'
import { HtmlExportDialog } from '../components/features/HtmlExportDialog'
import { ReactExportDialog } from '../components/features/ReactExportDialog'
import { InkExportDialog } from '../components/features/InkExportDialog'
import { OpenTuiExportDialog } from '../components/features/OpenTuiExportDialog'
import { BubbleteaExportDialog } from '../components/features/BubbleteaExportDialog'
import { AnsiExportDialog } from '../components/features/AnsiExportDialog'
import { NewProjectDialog } from '../components/features/NewProjectDialog'
import { ProjectSettingsDialog } from '../components/features/ProjectSettingsDialog'
import { WelcomeDialog } from '../components/features/WelcomeDialog'
import { useTimelineStore } from '@/stores/timelineStore'

/**
 * Main editor page component
 * Contains all the canvas, tools, and panels for creating ASCII art
 */
export function EditorPage() {
  const { layout, toggleLeftPanel, toggleRightPanel, toggleBottomPanel, toggleFullscreen } = useLayoutState()
  const panelHeight = useTimelineStore((s) => s.view.panelHeight)

  // Initialize --bottom-panel-height CSS variable from store on mount and when panelHeight changes
  useEffect(() => {
    if (layout.bottomPanelOpen) {
      document.documentElement.style.setProperty('--bottom-panel-height', `${panelHeight}px`)
    }
  }, [panelHeight, layout.bottomPanelOpen])

  return (
    <div className="relative flex-1 overflow-hidden">
      {/* Left Panel - matches canvas height */}
      <div className={cn(
          "absolute top-0 left-0 z-10 transition-all duration-300 ease-out",
          layout.bottomPanelOpen ? "bottom-[var(--bottom-panel-height,20rem)]" : "bottom-4",
          !layout.leftPanelOpen && "pointer-events-none"
        )}>
          <CollapsiblePanel
            isOpen={layout.leftPanelOpen}
            side="left"
            minWidth="w-[84px]"
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
            layout.leftPanelOpen ? "left-[84px]" : "left-0"
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
          layout.bottomPanelOpen ? "bottom-[var(--bottom-panel-height,20rem)]" : "bottom-4",
          !layout.rightPanelOpen && "pointer-events-none"
        )}>
          <CollapsiblePanel
            isOpen={layout.rightPanelOpen}
            side="right"
            minWidth="w-56"
          >
            <div className="space-y-3">
              <ActiveStyleSection />
              
              <PanelSeparator side="right" />
              
              <MainCharacterPaletteSection />
              
              <PanelSeparator side="right" />
              
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
          !layout.bottomPanelOpen && "pointer-events-none"
        )}>
          <CollapsiblePanel
            isOpen={layout.bottomPanelOpen}
            side="bottom"
          >
            {/* Resize drag handle */}
            <TimelineResizeHandle />
            
            {/* Bottom Panel Toggle Button - moves with the panel */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-0.5 z-20 pointer-events-auto">
              <PanelToggleButton
                isOpen={layout.bottomPanelOpen}
                onToggle={toggleBottomPanel}
                side="bottom"
              />
            </div>
            
            <TimelinePanel />
          </CollapsiblePanel>
        </div>

        {/* Center Canvas Area - positioned to account for panel space */}
        <div 
          className={cn(
            "absolute inset-0 flex flex-col transition-all duration-300 ease-out",
            layout.leftPanelOpen && "left-[84px]",
            layout.rightPanelOpen && "right-56", 
            layout.bottomPanelOpen ? "bottom-[var(--bottom-panel-height,20rem)]" : "bottom-4"
          )}
        >
          {/* Canvas Settings Header */}
          <div className="flex-shrink-0 border-b border-border/50 bg-background/95 backdrop-blur" style={{ overflow: 'visible', position: 'relative', zIndex: 10 }}>
            <div className="px-4 py-2 flex justify-center items-center">
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
                <AsciiTypePanel />
                <AsciiBoxPanel />
                <AsciiTypePreviewDialog />
              </div>
            </div>
          </div>
        </div>
      
      {/* Export/Import Dialogs - Inside CanvasProvider to access context */}
      <ImportModal />
      <MediaImportPanel />
      <GradientPanel />
      <GeneratorsPanel />
      <ImageExportDialog />
      <VideoExportDialog />
      <SessionExportDialog />
      <TextExportDialog />
      <JsonExportDialog />
      <HtmlExportDialog />
      <ReactExportDialog />
      <InkExportDialog />
      <OpenTuiExportDialog />
      <BubbleteaExportDialog />
      <AnsiExportDialog />
      
      {/* Project Management Dialogs */}
      <NewProjectDialog />
      <ProjectSettingsDialog />
      
      {/* Welcome Dialog - Shows on first visit and major version updates */}
      <WelcomeDialog />
    </div>
  )
}
