import './App.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { CanvasWithShortcuts } from './components/features/CanvasWithShortcuts'
import { CanvasProvider } from './contexts/CanvasContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ThemeToggle } from './components/common/ThemeToggle'
import { CollapsiblePanel } from './components/common/CollapsiblePanel'
import { ToolPalette } from './components/features/ToolPalette'
import { CharacterPalette } from './components/features/CharacterPalette'
import { ColorPicker } from './components/features/ColorPicker'
import { CanvasSettings } from './components/features/CanvasSettings'
import { AnimationTimeline } from './components/features/AnimationTimeline'
import { PerformanceOverlay } from './components/common/PerformanceOverlay'
import { useCanvasStore } from './stores/canvasStore'
import { useAnimationStore } from './stores/animationStore'
import { useToolStore } from './stores/toolStore'
import { useLayoutState } from './hooks/useLayoutState'

function App() {
  const { width, height, getCellCount } = useCanvasStore()
  const { frames, currentFrameIndex } = useAnimationStore()
  const { activeTool, selectedChar, selectedColor, selectedBgColor } = useToolStore()
  const { layout, toggleLeftPanel, toggleRightPanel, toggleBottomPanel } = useLayoutState()

  return (
    <ThemeProvider>
      <div className="h-screen grid grid-rows-[auto_1fr] bg-background text-foreground">
        {/* Header - compact */}
        <header className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="px-4 py-2">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-lg font-bold text-foreground">ASCII Motion</h1>
                <p className="text-xs text-muted-foreground">Create and animate ASCII art</p>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-[auto_1fr_auto] grid-rows-[1fr_auto] overflow-hidden">
          {/* Left Panel - Tools */}
          <CollapsiblePanel
            isOpen={layout.leftPanelOpen}
            onToggle={toggleLeftPanel}
            side="left"
            minWidth="w-40"
            className="row-span-2"
          >
            <div className="space-y-3">
              <ToolPalette />
              <Separator />
              <CharacterPalette />
            </div>
          </CollapsiblePanel>

          {/* Center Canvas Area */}
          <div className="overflow-hidden flex flex-col min-h-0">
            <CanvasProvider>
              {/* Canvas Settings Header */}
              <div className="flex-shrink-0 border-b border-border/50 bg-background/95 backdrop-blur">
                <div className="px-3 py-2 flex justify-center items-center">
                  <CanvasSettings />
                </div>
              </div>
              
              {/* Canvas Container - fills remaining space */}
              <div className="flex-1 overflow-auto min-h-0 bg-muted/10 relative">
                <div className="absolute inset-0 p-4">
                  <CanvasWithShortcuts className="w-full h-full" />
                </div>
              </div>
            </CanvasProvider>
          </div>

          {/* Right Panel - Status & Colors */}
          <CollapsiblePanel
            isOpen={layout.rightPanelOpen}
            onToggle={toggleRightPanel}
            side="right"
            minWidth="w-60"
            className="row-span-2"
          >
            <div className="space-y-3">
              <h2 className="text-sm font-semibold">Status</h2>
              
              {/* Canvas Info */}
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium">Canvas</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Size:</span>
                    <Badge variant="secondary" className="text-xs h-4">{width} × {height}</Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Cells:</span>
                    <Badge variant="secondary" className="text-xs h-4">{getCellCount().toLocaleString()}</Badge>
                  </div>
                </CardContent>
              </Card>
              
              {/* Tool Status */}
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium">Tool</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Active:</span>
                    <Badge variant="default" className="text-xs h-4 capitalize">{activeTool}</Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Char:</span>
                    <Badge variant="outline" className="font-mono text-xs h-4">"{selectedChar}"</Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Colors:</span>
                    <div className="flex gap-1">
                      <div 
                        className="w-4 h-4 border rounded-sm" 
                        style={{ backgroundColor: selectedColor }}
                        title="Text color"
                      />
                      <div 
                        className="w-4 h-4 border rounded-sm" 
                        style={{ backgroundColor: selectedBgColor }}
                        title="Background color"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Animation Status */}
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium">Animation</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Frames:</span>
                    <Badge variant="secondary" className="text-xs h-4">{frames.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Current:</span>
                    <Badge variant="secondary" className="text-xs h-4">{currentFrameIndex + 1}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Separator />
              
              {/* Color Picker */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Colors</h3>
                <ColorPicker />
              </div>
            </div>
          </CollapsiblePanel>

          {/* Bottom Panel - Animation Timeline */}
          <CollapsiblePanel
            isOpen={layout.bottomPanelOpen}
            onToggle={toggleBottomPanel}
            side="bottom"
            className="col-span-3"
          >
            <AnimationTimeline />
          </CollapsiblePanel>
        </div>
        
        {/* Performance Overlay for Development */}
        <PerformanceOverlay />
      </div>
    </ThemeProvider>
  )
}

export default App
