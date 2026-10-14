/**
 * Phase 5: Export & Migration Tests
 *
 * Tests for:
 * - getSessionData() serialization in timelineStore
 * - Session round-trip (serialize → deserialize preserves all data)
 * - Export data collector layer compositing
 * - Session importer v1/v2 version detection and routing
 * - Cloud save format (v2 when layers exist)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useTimelineStore } from '../stores/timelineStore';
import { useCanvasStore } from '../stores/canvasStore';
import { detectSessionVersion, migrateV1ToV2, validateAndRepairV2 } from '../utils/sessionMigration';
import { compositeLayersAtFrame } from '../utils/layerCompositing';
import type { SessionDataV2, LayerId, ContentFrameId, PropertyTrackId, KeyframeId, PropertyTrack, PropertyPath } from '../types/timeline';
import type { Cell } from '../types';

// ============================================
// Helpers
// ============================================

function resetStores() {
  useTimelineStore.getState().createNewProject();
  useCanvasStore.setState({
    width: 80,
    height: 24,
    cells: new Map(),
    canvasBackgroundColor: '#1a1a2e',
    showGrid: true,
  });
}

function makeCell(char: string, color = '#ffffff', bgColor = '#000000'): Cell {
  return { char, color, bgColor };
}

/** Build a minimal v2 session for testing */
function makeV2Session(overrides?: Partial<SessionDataV2>): SessionDataV2 {
  return {
    version: '2.0.0',
    name: 'Test Project',
    canvas: {
      width: 80,
      height: 24,
      canvasBackgroundColor: '#1a1a2e',
      showGrid: true,
    },
    timeline: {
      frameRate: 12,
      durationFrames: 5,
      looping: true,
    },
    layers: [
      {
        id: 'layer-1',
        name: 'Layer 1',
        visible: true,
        solo: false,
        locked: false,
        opacity: 100,
        contentFrames: [
          {
            id: 'cf-1',
            name: 'Frame 1',
            startFrame: 0,
            durationFrames: 3,
            data: { '0,0': { char: 'A', color: '#fff', bgColor: '#000' } },
          },
          {
            id: 'cf-2',
            name: 'Frame 2',
            startFrame: 3,
            durationFrames: 2,
            data: { '1,1': { char: 'B', color: '#f00', bgColor: '#000' } },
          },
        ],
        propertyTracks: [],
        effectTracks: [],
      },
    ],
    ...overrides,
  };
}

/** Build a v1 session */
function makeV1Session(): Record<string, unknown> {
  return {
    version: '1.0.0',
    name: 'Legacy Project',
    canvas: {
      width: 40,
      height: 12,
      canvasBackgroundColor: '#000000',
      showGrid: true,
    },
    animation: {
      frames: [
        {
          id: 'f1',
          name: 'Frame 1',
          duration: 100,
          data: { '0,0': { char: 'X', color: '#fff', bgColor: '#000' } },
        },
      ],
      currentFrameIndex: 0,
      frameRate: 12,
      looping: true,
    },
    tools: { activeTool: 'pencil', selectedColor: '#fff' },
    typography: { fontSize: 16, characterSpacing: 1.0, lineSpacing: 1.0 },
  };
}

// ============================================
// getSessionData() Tests
// ============================================

describe('timelineStore.getSessionData()', () => {
  beforeEach(resetStores);

  it('returns v2.2.0 format', () => {
    const data = useTimelineStore.getState().getSessionData();
    expect(data.version).toBe('2.2.0');
  });

  it('includes canvas settings from canvasStore', () => {
    useCanvasStore.setState({ width: 100, height: 50, canvasBackgroundColor: '#ff0000', showGrid: false });
    const data = useTimelineStore.getState().getSessionData();
    expect(data.canvas).toEqual({
      width: 100,
      height: 50,
      canvasBackgroundColor: '#ff0000',
      showGrid: false,
    });
  });

  it('includes timeline config', () => {
    const data = useTimelineStore.getState().getSessionData();
    expect(data.timeline).toEqual({
      frameRate: 12,
      durationFrames: 1,
      looping: true,
    });
  });

  it('serializes layers with content frames', () => {
    const store = useTimelineStore.getState();
    const layerId = store.addLayer('Test Layer');
    expect(layerId).not.toBeNull();

    // New layers come with a default content frame at 0,1 — use it and update its data
    const newLayer = useTimelineStore.getState().layers.find(l => l.id === layerId)!;
    const defaultCfId = newLayer.contentFrames[0].id;
    useTimelineStore.getState().updateContentFrameData(layerId!, defaultCfId, new Map([['5,5', makeCell('Z')]]));

    const data = useTimelineStore.getState().getSessionData();
    expect(data.layers.length).toBeGreaterThanOrEqual(2); // default + new
    
    const testLayer = data.layers.find(l => l.name === 'Test Layer');
    expect(testLayer).toBeDefined();
    
    const cf = testLayer!.contentFrames[0];
    expect(cf.data['5,5']).toEqual(makeCell('Z'));
    expect(cf.startFrame).toBe(0);
  });

  it('serializes property tracks and keyframes', () => {
    const store = useTimelineStore.getState();
    const layers = store.layers;
    const layerId = layers[0].id;

    const trackId = store.addPropertyTrack(layerId, 'transform.position.x');
    store.addKeyframe(layerId, trackId, 0, 10);
    store.addKeyframe(layerId, trackId, 5, 20);

    const data = store.getSessionData();
    const layer = data.layers[0];
    expect(layer.propertyTracks.length).toBe(1);
    expect(layer.propertyTracks[0].propertyPath).toBe('transform.position.x');
    expect(layer.propertyTracks[0].keyframes.length).toBe(2);
    expect(layer.propertyTracks[0].keyframes[0].value).toBe(10);
    expect(layer.propertyTracks[0].keyframes[1].value).toBe(20);
  });

  it('serializes staticProperties when non-empty', () => {
    const store = useTimelineStore.getState();
    const layerId = store.layers[0].id;
    store.setStaticProperty(layerId, 'transform.position.x', 42);

    const data = store.getSessionData();
    // Default layer has anchor point at canvas center, so staticProperties includes those too
    expect(data.layers[0].staticProperties).toBeDefined();
    expect(data.layers[0].staticProperties!['transform.position.x']).toBe(42);
  });

  it('omits staticProperties when truly empty', () => {
    // Create a layer with no static properties at all (no default anchor)
    const store = useTimelineStore.getState();
    // The default layer gets anchor-point statics from createDefaultLayer.
    // Clear them to test the "empty" case.
    const layerId = store.layers[0].id;
    // Manually set staticProperties to empty
    useTimelineStore.setState({
      layers: store.layers.map(l => 
        l.id === layerId ? { ...l, staticProperties: {} } : l
      )
    });
    const data = useTimelineStore.getState().getSessionData();
    expect(data.layers[0].staticProperties).toBeUndefined();
  });

  it('serializes hidden content frames', () => {
    const layerId = useTimelineStore.getState().layers[0].id;
    const cfId = useTimelineStore.getState().layers[0].contentFrames[0].id;
    useTimelineStore.getState().toggleContentFrameHidden(layerId, [cfId], true);

    const data = useTimelineStore.getState().getSessionData();
    expect(data.layers[0].contentFrames[0].hidden).toBe(true);
  });

  it('converts Map<string, Cell> to Record<string, Cell> in content frames', () => {
    const store = useTimelineStore.getState();
    const layerId = store.layers[0].id;
    const cfId = store.layers[0].contentFrames[0].id;
    store.updateContentFrameData(layerId, cfId, new Map([['0,0', makeCell('A')], ['1,2', makeCell('B')]]));

    const data = store.getSessionData();
    const cfData = data.layers[0].contentFrames[0].data;
    // Should be a plain object, not a Map
    expect(cfData).toEqual({
      '0,0': makeCell('A'),
      '1,2': makeCell('B'),
    });
    expect(cfData instanceof Map).toBe(false);
  });
});

// ============================================
// Round-trip Tests (serialize → load → serialize)
// ============================================

describe('Session round-trip (v2)', () => {
  beforeEach(resetStores);

  it('preserves layer structure across serialize → load → serialize', () => {
    // Set up a project with 2 layers, keyframes, and content
    const layer1Id = useTimelineStore.getState().layers[0].id;
    const cfId = useTimelineStore.getState().layers[0].contentFrames[0].id;
    useTimelineStore.getState().updateContentFrameData(layer1Id, cfId, new Map([['3,3', makeCell('X')]]));

    const layer2Id = useTimelineStore.getState().addLayer('Layer 2')!;
    // Layer 2 comes with a default content frame — update its data
    const layer2 = useTimelineStore.getState().layers.find(l => l.id === layer2Id)!;
    const cf2Id = layer2.contentFrames[0].id;
    useTimelineStore.getState().updateContentFrameData(layer2Id, cf2Id, new Map([['7,7', makeCell('Y')]]));

    // Extend timeline to fit keyframes
    useTimelineStore.getState().setDuration(15);

    const trackId = useTimelineStore.getState().addPropertyTrack(layer1Id, 'transform.rotation');
    useTimelineStore.getState().addKeyframe(layer1Id, trackId, 0, 0);
    useTimelineStore.getState().addKeyframe(layer1Id, trackId, 10, 360);

    // Serialize
    const serialized1 = useTimelineStore.getState().getSessionData();

    // Load into fresh store
    resetStores();

    // Deserialize layers (same as what sessionImporter does)
    const layers = serialized1.layers.map((sl) => ({
      id: sl.id as LayerId,
      name: sl.name,
      visible: sl.visible,
      solo: sl.solo,
      locked: sl.locked,
      opacity: sl.opacity,
      contentFrames: sl.contentFrames.map((cf) => ({
        id: cf.id as ContentFrameId,
        name: cf.name,
        startFrame: cf.startFrame,
        durationFrames: cf.durationFrames,
        data: new Map(Object.entries(cf.data)),
        hidden: cf.hidden,
      })),
      propertyTracks: sl.propertyTracks.map((t) => ({
        id: t.id as PropertyTrackId,
        propertyPath: t.propertyPath as PropertyPath,
        loopKeyframes: t.loopKeyframes,
        keyframes: t.keyframes.map((k) => ({
          id: k.id as KeyframeId,
          frame: k.frame,
          value: k.value,
          easing: k.easing,
        })),
      })),
      staticProperties: sl.staticProperties ?? {},
      syncKeyframesToFrames: sl.syncKeyframesToFrames,
      effectTracks: [],
    }));

    useTimelineStore.getState().loadFromSessionData(layers, serialized1.timeline);

    // Re-serialize (get fresh state after load)
    const serialized2 = useTimelineStore.getState().getSessionData();

    // Compare
    expect(serialized2.version).toBe('2.2.0');
    expect(serialized2.layers.length).toBe(serialized1.layers.length);
    expect(serialized2.timeline).toEqual(serialized1.timeline);

    // Layer 1 content preserved
    expect(serialized2.layers[0].contentFrames[0].data['3,3']).toEqual(makeCell('X'));

    // Layer 2 content preserved
    const layer2Serialized = serialized2.layers.find(l => l.name === 'Layer 2');
    expect(layer2Serialized).toBeDefined();
    expect(layer2Serialized!.contentFrames[0].data['7,7']).toEqual(makeCell('Y'));

    // Keyframes preserved
    const rotTrack = serialized2.layers[0].propertyTracks.find(t => t.propertyPath === 'transform.rotation');
    expect(rotTrack).toBeDefined();
    expect(rotTrack!.keyframes.length).toBe(2);
    expect(rotTrack!.keyframes[0].value).toBe(0);
    expect(rotTrack!.keyframes[1].value).toBe(360);
  });

  it('v1→v2 migration produces loadable data', () => {
    const v1 = makeV1Session();
    const migrated = migrateV1ToV2(v1);

    // Load into store
    resetStores();

    const layers = migrated.layers.map((sl) => ({
      id: sl.id as LayerId,
      name: sl.name,
      visible: sl.visible,
      solo: sl.solo,
      locked: sl.locked,
      opacity: sl.opacity,
      contentFrames: sl.contentFrames.map((cf) => ({
        id: cf.id as ContentFrameId,
        name: cf.name,
        startFrame: cf.startFrame,
        durationFrames: cf.durationFrames,
        data: new Map(Object.entries(cf.data)) as Map<string, Cell>,
      })),
      propertyTracks: [] as PropertyTrack[],
      staticProperties: {} as Record<string, number>,
      effectTracks: [],
    }));

    useTimelineStore.getState().loadFromSessionData(layers, migrated.timeline);

    // Re-read after load
    const loadedLayers = useTimelineStore.getState().layers;

    // Verify
    expect(loadedLayers.length).toBe(1);
    expect(loadedLayers[0].name).toBe('Layer 1');
    expect(loadedLayers[0].contentFrames.length).toBe(1);

    const cellData = loadedLayers[0].contentFrames[0].data;
    const cell = cellData.get('0,0');
    expect(cell).toBeDefined();
    expect(cell!.char).toBe('X');
  });
});

// ============================================
// Version Detection Tests
// ============================================

describe('Session version detection in import pipeline', () => {
  it('detects v2 format', () => {
    const v2 = makeV2Session();
    expect(detectSessionVersion(v2)).toBe('2.0.0');
  });

  it('detects v1 format', () => {
    const v1 = makeV1Session();
    expect(detectSessionVersion(v1)).toBe('1.0.0');
  });

  it('returns unknown for invalid data', () => {
    expect(detectSessionVersion({})).toBe('unknown');
    expect(detectSessionVersion(null)).toBe('unknown');
    expect(detectSessionVersion('string')).toBe('unknown');
  });
});

// ============================================
// Layer Compositing for Export Tests
// ============================================

describe('compositeLayersAtFrame for export', () => {
  it('composites single layer at specific frame', () => {
    const layers = [{
      id: 'l1' as LayerId,
      name: 'Layer 1',
      visible: true,
      solo: false,
      locked: false,
      opacity: 100,
      contentFrames: [{
        id: 'cf1' as ContentFrameId,
        name: 'Frame 1',
        startFrame: 0,
        durationFrames: 5,
        data: new Map([['2,3', makeCell('A')]]),
      }],
      propertyTracks: [],
      staticProperties: {},
      effectTracks: [],
    }];

    const result = compositeLayersAtFrame(layers, 2, 80, 24, undefined, true);
    expect(result.get('2,3')).toEqual(makeCell('A'));
  });

  it('top layer overwrites lower layer at same position', () => {
    const layers = [
      {
        id: 'bottom' as LayerId,
        name: 'Bottom',
        visible: true,
        solo: false,
        locked: false,
        opacity: 100,
        contentFrames: [{
          id: 'cf-b' as ContentFrameId,
          name: 'Frame',
          startFrame: 0,
          durationFrames: 1,
          data: new Map([['0,0', makeCell('B', '#0f0')]]),
        }],
        propertyTracks: [],
        staticProperties: {},
        effectTracks: [],
      },
      {
        id: 'top' as LayerId,
        name: 'Top',
        visible: true,
        solo: false,
        locked: false,
        opacity: 100,
        contentFrames: [{
          id: 'cf-t' as ContentFrameId,
          name: 'Frame',
          startFrame: 0,
          durationFrames: 1,
          data: new Map([['0,0', makeCell('T', '#f00')]]),
        }],
        propertyTracks: [],
        staticProperties: {},
        effectTracks: [],
      },
    ];

    const result = compositeLayersAtFrame(layers, 0, 80, 24, undefined, true);
    expect(result.get('0,0')?.char).toBe('T');
    expect(result.get('0,0')?.color).toBe('#f00');
  });

  it('hidden layers are not composited', () => {
    const layers = [{
      id: 'l1' as LayerId,
      name: 'Hidden Layer',
      visible: false,
      solo: false,
      locked: false,
      opacity: 100,
      contentFrames: [{
        id: 'cf1' as ContentFrameId,
        name: 'Frame',
        startFrame: 0,
        durationFrames: 1,
        data: new Map([['0,0', makeCell('X')]]),
      }],
      propertyTracks: [],
      staticProperties: {},
      effectTracks: [],
    }];

    const result = compositeLayersAtFrame(layers, 0, 80, 24, undefined, true);
    expect(result.get('0,0')).toBeUndefined();
  });

  it('content frame gaps produce empty result for that frame', () => {
    const layers = [{
      id: 'l1' as LayerId,
      name: 'Layer',
      visible: true,
      solo: false,
      locked: false,
      opacity: 100,
      contentFrames: [{
        id: 'cf1' as ContentFrameId,
        name: 'Frame',
        startFrame: 5, // starts at frame 5
        durationFrames: 3,
        data: new Map([['0,0', makeCell('A')]]),
      }],
      propertyTracks: [],
      staticProperties: {},
      effectTracks: [],
    }];

    // Frame 2 is in the gap — should be empty
    const result = compositeLayersAtFrame(layers, 2, 80, 24, undefined, true);
    expect(result.size).toBe(0);

    // Frame 6 should have content
    const result2 = compositeLayersAtFrame(layers, 6, 80, 24, undefined, true);
    expect(result2.get('0,0')?.char).toBe('A');
  });

  it('clips cells outside canvas bounds when clip=true', () => {
    const layers = [{
      id: 'l1' as LayerId,
      name: 'Layer',
      visible: true,
      solo: false,
      locked: false,
      opacity: 100,
      contentFrames: [{
        id: 'cf1' as ContentFrameId,
        name: 'Frame',
        startFrame: 0,
        durationFrames: 1,
        data: new Map([
          ['0,0', makeCell('A')],
          ['100,100', makeCell('B')], // outside 80x24 canvas
        ]),
      }],
      propertyTracks: [],
      staticProperties: {},
      effectTracks: [],
    }];

    const result = compositeLayersAtFrame(layers, 0, 80, 24, undefined, true);
    expect(result.get('0,0')).toBeDefined();
    expect(result.get('100,100')).toBeUndefined(); // clipped
  });

  it('does not clip cells outside bounds when clip=false', () => {
    const layers = [{
      id: 'l1' as LayerId,
      name: 'Layer',
      visible: true,
      solo: false,
      locked: false,
      opacity: 100,
      contentFrames: [{
        id: 'cf1' as ContentFrameId,
        name: 'Frame',
        startFrame: 0,
        durationFrames: 1,
        data: new Map([
          ['0,0', makeCell('A')],
          ['100,100', makeCell('B')],
        ]),
      }],
      propertyTracks: [],
      staticProperties: {},
      effectTracks: [],
    }];

    const result = compositeLayersAtFrame(layers, 0, 80, 24, undefined, false);
    expect(result.get('0,0')).toBeDefined();
    expect(result.get('100,100')).toBeDefined(); // NOT clipped
  });
});

// ============================================
// SessionDataV2 Serialization Format Tests
// ============================================

describe('SessionDataV2 format validation', () => {
  beforeEach(resetStores);

  it('getSessionData output is valid JSON round-trip', () => {
    const store = useTimelineStore.getState();
    const layerId = store.layers[0].id;
    const cfId = store.layers[0].contentFrames[0].id;
    store.updateContentFrameData(layerId, cfId, new Map([['0,0', makeCell('A')]]));

    const data = store.getSessionData();
    const json = JSON.stringify(data);
    const parsed = JSON.parse(json);

    expect(parsed.version).toBe('2.2.0');
    expect(parsed.layers[0].contentFrames[0].data['0,0'].char).toBe('A');
  });

  it('does not include layerGroups when empty', () => {
    const data = useTimelineStore.getState().getSessionData();
    expect(data.layerGroups).toBeUndefined();
  });

  it('validates repaired v2 data through validateAndRepairV2', () => {
    const v2 = makeV2Session();
    // Corrupt: negative startFrame and duration < 1
    v2.layers[0].contentFrames[0].startFrame = -5;
    v2.layers[0].contentFrames[1].durationFrames = 0;

    const { data, repairs } = validateAndRepairV2(v2);
    expect(repairs.length).toBeGreaterThan(0);
    expect(data.layers[0].contentFrames[0].startFrame).toBeGreaterThanOrEqual(0);
    expect(data.layers[0].contentFrames[1].durationFrames).toBeGreaterThanOrEqual(1);
  });
});

// ============================================
// Export Compositing Performance
// ============================================

describe('Export compositing performance', () => {
  it('composites 100 frames with 3 layers under 500ms', () => {
    // Create 3 layers with content spanning 100 frames
    const layers = Array.from({ length: 3 }, (_, layerIdx) => ({
      id: `layer-${layerIdx}` as LayerId,
      name: `Layer ${layerIdx + 1}`,
      visible: true,
      solo: false,
      locked: false,
      opacity: 100,
      contentFrames: [{
        id: `cf-${layerIdx}` as ContentFrameId,
        name: 'Frame',
        startFrame: 0,
        durationFrames: 100,
        data: new Map(
          Array.from({ length: 50 }, (_, cellIdx) => [
            `${cellIdx},${layerIdx}`,
            makeCell(String.fromCharCode(65 + (cellIdx % 26))),
          ])
        ),
      }],
      propertyTracks: [],
      staticProperties: {},
      effectTracks: [],
    }));

    const start = performance.now();
    for (let f = 0; f < 100; f++) {
      compositeLayersAtFrame(layers, f, 80, 24, undefined, true);
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(500);
  });
});
