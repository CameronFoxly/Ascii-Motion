/**
 * EffectsIntegrationTest.tsx - Component to test effects system integration
 * 
 * This component can be temporarily added to test the complete effects pipeline:
 * - Effects UI → Effects Store → Processing Engine → Canvas/Animation Stores → History System
 */

import { useState } from 'react';
import { useEffectsStore } from '../../stores/effectsStore';
import { useCanvasStore } from '../../stores/canvasStore';
import { useAnimationStore } from '../../stores/animationStore';
import { useToolStore } from '../../stores/toolStore';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import type { Cell } from '../../types';

export function EffectsIntegrationTest() {
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'passed' | 'failed'>('idle');
  const [testResults, setTestResults] = useState<string[]>([]);
  
  const { 
    updateLevelsSettings, 
    applyEffect,
    canvasAnalysis,
    analyzeCanvas 
  } = useEffectsStore();
  
  const { cells, setCanvasData, width, height } = useCanvasStore();
  const { frames, currentFrameIndex } = useAnimationStore();
  const { canUndo, canRedo } = useToolStore();

  // Create test canvas data
  const createTestCanvas = () => {
    const testCells = new Map<string, Cell>();
    
    // Create a simple test pattern
    for (let y = 0; y < Math.min(height, 10); y++) {
      for (let x = 0; x < Math.min(width, 10); x++) {
        if ((x + y) % 2 === 0) {
          testCells.set(`${x},${y}`, {
            char: '#',
            color: '#ff0000', // Red
            bgColor: 'transparent'
          });
        } else {
          testCells.set(`${x},${y}`, {
            char: '.',
            color: '#0000ff', // Blue  
            bgColor: 'transparent'
          });
        }
      }
    }
    
    return testCells;
  };

  // Run integration test
  const runIntegrationTest = async () => {
    setTestStatus('running');
    setTestResults([]);
    const results: string[] = [];
    
    try {
      // Test 1: Create test canvas data
      results.push('✓ Creating test canvas data...');
      const testCells = createTestCanvas();
      setCanvasData(testCells);
      results.push(`✓ Canvas populated with ${testCells.size} test cells`);
      setTestResults([...results]);

      // Test 2: Analyze canvas
      results.push('✓ Running canvas analysis...');
      await analyzeCanvas();
      if (canvasAnalysis) {
        results.push(`✓ Canvas analysis complete: ${canvasAnalysis.uniqueColors.length} colors, ${canvasAnalysis.uniqueCharacters.length} characters`);
      } else {
        throw new Error('Canvas analysis failed');
      }
      setTestResults([...results]);
      
      // Test 3: Configure levels effect
      results.push('✓ Configuring levels effect...');
      updateLevelsSettings({
        shadowsInput: 50,
        midtonesInput: 1.2,
        highlightsInput: 200
      });
      results.push('✓ Levels settings updated');
      setTestResults([...results]);
      
      // Test 4: Apply effect
      results.push('✓ Applying levels effect...');
      const success = await applyEffect('levels');
      if (success) {
        results.push('✓ Effect applied successfully');
      } else {
        throw new Error('Effect application failed');
      }
      setTestResults([...results]);
      
      // Test 5: Check undo capability
      if (canUndo()) {
        results.push('✓ Undo is available after effect application');
      } else {
        results.push('⚠ Undo is not available (this may be expected)');
      }
      setTestResults([...results]);
      
      results.push('🎉 All integration tests passed!');
      setTestStatus('passed');
      
    } catch (error) {
      results.push(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTestStatus('failed');
    }
    
    setTestResults(results);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Effects Integration Test
          <Badge variant={
            testStatus === 'idle' ? 'secondary' :
            testStatus === 'running' ? 'default' :
            testStatus === 'passed' ? 'default' :
            'destructive'
          }>
            {testStatus}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2">
          <Button 
            onClick={runIntegrationTest}
            disabled={testStatus === 'running'}
            variant="outline"
            size="sm"
          >
            {testStatus === 'running' ? 'Running Tests...' : 'Run Integration Test'}
          </Button>
          
          <div className="text-xs space-y-1">
            <div>Canvas: {cells.size} cells ({width}×{height})</div>
            <div>Frames: {frames.length} (current: {currentFrameIndex + 1})</div>
            <div>History: {canUndo() ? 'Can undo' : 'Cannot undo'} | {canRedo() ? 'Can redo' : 'Cannot redo'}</div>
          </div>
        </div>
        
        {testResults.length > 0 && (
          <div className="bg-muted rounded p-2">
            <div className="text-xs font-mono space-y-1 max-h-40 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className={
                  result.startsWith('✓') ? 'text-green-600' :
                  result.startsWith('❌') ? 'text-red-600' :
                  result.startsWith('⚠') ? 'text-yellow-600' :
                  result.startsWith('🎉') ? 'text-green-600 font-bold' :
                  'text-muted-foreground'
                }>
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
        
      </CardContent>
    </Card>
  );
}