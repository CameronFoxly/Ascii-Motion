import './App.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { CanvasWithShortcuts } from './components/features/CanvasWithShortcuts'
import { CanvasProvider } from './contexts/CanvasContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ThemeToggle } from './components/common/ThemeToggle'
import { ToolPalette } from './components/features/ToolPalette'
import { CharacterPalette } from './components/features/CharacterPalette'
import { ColorPicker } from './components/features/ColorPicker'
import { CanvasSettings } from './components/features/CanvasSettings'
import { useCanvasStore } from './stores/canvasStore'
import { useAnimationStore } from './stores/animationStore'
import { useToolStore } from './stores/toolStore'

function App() {
  const { width, height, getCellCount } = useCanvasStore()
  const { frames, currentFrameIndex } = useAnimationStore()
  const { activeTool, selectedChar } = useToolStore()

  return (
    <ThemeProvider>
      <div className="h-screen flex flex-col bg-background text-foreground">
        {/* Header */}
        <header className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  ASCII Motion
                </h1>
                <p className="text-sm text-muted-foreground">Create and animate ASCII art</p>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Tools and Palettes */}
          <aside className="w-80 border-r border-border bg-muted/20 overflow-y-auto">
            <div className="p-6 space-y-6">
              <ToolPalette />
              <Separator />
              <CharacterPalette />
              <Separator />
              <ColorPicker />
            </div>
          </aside>

          {/* Center Canvas Area */}
          <main className="flex-1 flex flex-col">
            <CanvasProvider>
              <div className="p-6 flex-1 flex flex-col">
                <Card className="flex-1 flex flex-col shadow-sm">
                  <CardHeader className="flex-row justify-center items-center pb-4 border-b border-border/50">
                    <CanvasSettings />
                  </CardHeader>
                  
                  <CardContent className="flex-1 p-6 overflow-auto">
                    <CanvasWithShortcuts className="w-full h-full" />
                  </CardContent>
                </Card>
              </div>
            </CanvasProvider>

            {/* Timeline Footer */}
            <div className="border-t border-border bg-muted/20">
              <div className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-base font-semibold">Timeline</h2>
                  <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                </div>
                <Card className="bg-muted/40 border-dashed">
                  <CardContent className="p-6 flex items-center justify-center">
                    <p className="text-muted-foreground text-sm">Animation timeline will be implemented in Phase 2</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>

          {/* Right Sidebar - Status */}
          <aside className="w-72 border-l border-border bg-muted/20 overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Status</h2>
              <div className="space-y-4">
                <Card className="bg-card/50 border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Canvas Info</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Size:</span>
                      <Badge variant="secondary" className="text-xs">{width} × {height}</Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Total Cells:</span>
                      <Badge variant="secondary" className="text-xs">{getCellCount().toLocaleString()}</Badge>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-card/50 border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Animation</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Frames:</span>
                      <Badge variant="secondary" className="text-xs">{frames.length}</Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Current:</span>
                      <Badge variant="secondary" className="text-xs">{currentFrameIndex + 1}</Badge>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-card/50 border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Current Tool</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Active:</span>
                      <Badge variant="default" className="text-xs capitalize">{activeTool}</Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Character:</span>
                      <Badge variant="outline" className="font-mono text-xs">"{selectedChar}"</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </ThemeProvider>
  )
}

export default App
