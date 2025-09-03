import { Button } from './components/atoms/Button'
import { useCanvasStore } from './stores/canvasStore'
import { useAnimationStore } from './stores/animationStore'
import { useToolStore } from './stores/toolStore'
import './App.css'

function App() {
  const { width, height, getCellCount } = useCanvasStore()
  const { frames, currentFrameIndex } = useAnimationStore()
  const { activeTool, selectedChar } = useToolStore()

  return (
    <div className="min-h-screen bg-white text-black p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">ASCII Motion</h1>
          <p className="text-gray-600">Create and animate ASCII art</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Status Panel */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">Status</h2>
              <div className="space-y-2 text-sm">
                <div>Canvas: {width}x{height}</div>
                <div>Cells: {getCellCount()}</div>
                <div>Frames: {frames.length}</div>
                <div>Current Frame: {currentFrameIndex + 1}</div>
                <div>Tool: {activeTool}</div>
                <div>Character: "{selectedChar}"</div>
              </div>
            </div>
          </div>

          {/* Main Canvas Area */}
          <div className="lg:col-span-3">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">Canvas</h2>
              <div className="bg-gray-100 p-4 rounded min-h-64 flex items-center justify-center">
                <p className="text-gray-500">Canvas will be implemented here</p>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="mt-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Timeline</h2>
            <div className="bg-gray-100 p-4 rounded min-h-24 flex items-center justify-center">
              <p className="text-gray-500">Timeline will be implemented here</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 flex gap-2">
          <Button variant="outline">New Frame</Button>
          <Button variant="outline">Play</Button>
          <Button variant="outline">Export</Button>
        </div>
      </div>
    </div>
  )
}

export default App
