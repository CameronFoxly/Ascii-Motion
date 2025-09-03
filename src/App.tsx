import { Button } from './components/atoms/Button'
import { CanvasGrid } from './components/organisms/CanvasGrid'
import { CanvasProvider } from './contexts/CanvasContext'
import { ToolPalette } from './components/organisms/ToolPalette'
import { CharacterPalette } from './components/organisms/CharacterPalette'
import { ColorPicker } from './components/organisms/ColorPicker'
import { PerformanceMonitor } from './components/atoms/PerformanceMonitor'
import { useCanvasStore } from './stores/canvasStore'
import { useAnimationStore } from './stores/animationStore'
import { useToolStore } from './stores/toolStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import './App.css'

function App() {
  const { width, height, getCellCount, clearCanvas } = useCanvasStore()
  const { frames, currentFrameIndex } = useAnimationStore()
  const { activeTool, selectedChar, undo, redo, canUndo, canRedo, selection, hasClipboard } = useToolStore()
  
  // Enable keyboard shortcuts
  const { copySelection, pasteSelection } = useKeyboardShortcuts()

  return (
    <div className="min-h-screen bg-gray-100 text-black">
      <div className="max-w-full">
        <header className="bg-white border-b border-gray-200 p-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-blue-600 mb-2">ASCII Motion</h1>
            <p className="text-gray-600">Create and animate ASCII art</p>
          </div>
        </header>

        <div className="flex h-[calc(100vh-120px)]">
          {/* Left Sidebar - Tools and Palettes */}
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4 space-y-6">
              <ToolPalette />
              <CharacterPalette />
              <ColorPicker />
            </div>
          </div>

          {/* Main Canvas Area */}
          <div className="flex-1 p-4">
            <div className="bg-white border border-gray-200 rounded-lg h-full">
              <div className="p-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Canvas</h2>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => copySelection()}
                      disabled={!selection?.active}
                      title="Copy selection (Cmd/Ctrl+C)"
                    >
                      Copy
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => pasteSelection()}
                      disabled={!hasClipboard()}
                      title="Paste (Cmd/Ctrl+V)"
                    >
                      Paste
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => undo()}
                      disabled={!canUndo()}
                      title="Undo (Cmd/Ctrl+Z)"
                    >
                      Undo
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => redo()}
                      disabled={!canRedo()}
                      title="Redo (Cmd/Ctrl+Shift+Z)"
                    >
                      Redo
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={clearCanvas}
                      title="Clear entire canvas"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="p-4 flex-1">
                <CanvasProvider>
                  <CanvasGrid className="w-full" />
                </CanvasProvider>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Status and Frame Info */}
          <div className="w-64 bg-white border-l border-gray-200 overflow-y-auto">
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-4">Status</h2>
              <div className="space-y-3 text-sm">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="font-medium mb-2">Canvas</div>
                  <div className="space-y-1 text-gray-600">
                    <div>Size: {width} × {height}</div>
                    <div>Cells: {getCellCount()}</div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded">
                  <div className="font-medium mb-2">Animation</div>
                  <div className="space-y-1 text-gray-600">
                    <div>Frames: {frames.length}</div>
                    <div>Current: {currentFrameIndex + 1}</div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded">
                  <div className="font-medium mb-2">Tool</div>
                  <div className="space-y-1 text-gray-600">
                    <div>Active: {activeTool}</div>
                    <div>Character: "{selectedChar}"</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Footer */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-lg font-semibold mb-4">Timeline</h2>
            <div className="bg-gray-100 p-4 rounded min-h-24 flex items-center justify-center">
              <p className="text-gray-500">Timeline will be implemented in Phase 2</p>
            </div>
          </div>
        </div>

        {/* Performance Monitor - Development Only */}
        <PerformanceMonitor />
      </div>
    </div>
  )
}

export default App
