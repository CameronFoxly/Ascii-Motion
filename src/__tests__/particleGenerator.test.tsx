import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { particlePhysicsGenerator as particles } from '../registry/generators/particlePhysics';
import { registerAllGenerators } from '../registry/generators';
import type { GeneratorFrameContext } from '../registry/generatorRegistry';
import { ParticleOriginOverlay } from '../components/features/ParticleOriginOverlay';
import { GeneratorPropertiesPanel } from '../components/features/timeline/GeneratorPropertiesPanel';
import { useTimelineStore } from '../stores/timelineStore';
import { useCanvasStore } from '../stores/canvasStore';
import { useToolStore } from '../stores/toolStore';
import { useAnimationStore } from '../stores/animationStore';
import { usePlaybackOnlySnapshot } from '../hooks/usePlaybackOnlySnapshot';
import { processHistoryAction } from '../hooks/useKeyboardShortcuts';
import { canvasPointToParticleOrigin, getParticleOriginAtFrame } from '../utils/generators/particleOrigin';
import { renderGeneratorFrame, resolveGeneratorSettings, setGeneratorFrameRate } from '../utils/generators/generatorRuntime';
import { serializeGeneratorSource, deserializeGeneratorSource } from '../utils/generators/generatorSerialization';
import type { LayerId } from '../types/timeline';

vi.mock('../hooks/useProjectFileActions', () => ({ useProjectFileActions: vi.fn() }));
vi.mock('../hooks/usePlaybackOnlySnapshot', () => ({ usePlaybackOnlySnapshot: vi.fn() }));
vi.mock('../contexts/CanvasContext', () => ({
  useCanvasContext: () => ({ cellWidth: 10, cellHeight: 20, zoom: 2, panOffset: { x: 3, y: 4 } }),
}));

function context(frame: number, fps = 30): GeneratorFrameContext {
  return { width: 200, height: 100, fps, localFrame: frame, time: frame / fps, dt: 30 / fps };
}

function settings(extra: Record<string, unknown> = {}) {
  return {
    ...particles.defaultSettings,
    originX: 50, originY: 50, emissionRate: 30,
    velocityMagnitude: 0, velocitySpeedRandomness: 0, velocityAngleRandomness: 0,
    drag: 0, gravity: 0, edgeBounce: false, lifespan: 20,
    inheritOriginVelocity: true,
    ...extra,
  };
}

function replay(redo = false) {
  act(() => {
    const action = redo ? useToolStore.getState().redo() : useToolStore.getState().undo();
    expect(action).toBeDefined();
    processHistoryAction(action!, redo, useCanvasStore.getState(), useAnimationStore.getState());
  });
}

beforeEach(() => {
  registerAllGenerators();
  useTimelineStore.getState().createNewProject();
  useTimelineStore.getState().setDuration(120);
  useCanvasStore.getState().setCanvasSize(80, 24);
  useToolStore.getState().clearHistory();
  setGeneratorFrameRate(30);
  vi.mocked(usePlaybackOnlySnapshot).mockReturnValue({ isActive: false, currentFrameIndex: 0, frames: [] });
});

afterEach(() => {
  cleanup();
  setGeneratorFrameRate(30);
});

describe('particle origin velocity', () => {
  it.each([12, 24, 30, 60])('uses frame-rate-independent velocity at %s fps', (fps) => {
    const base = settings({ emissionRate: fps });
    const state = particles.createState(context(0, fps), base);
    particles.step(state, base, context(0, fps));
    expect(state.particles[0].vx).toBe(0);
    expect(state.particles[0].vy).toBe(0);
    particles.step(state, { ...base, originX: 50 + 30 / fps, originY: 50 - 60 / fps }, context(1, fps));
    expect(state.particles[1].vx).toBeCloseTo(1);
    expect(state.particles[1].vy).toBeCloseTo(-2);
    expect(state.particles[1].x).toBeCloseTo(50 + 60 / fps);
    expect(state.particles[0].vx).toBe(0);
  });

  it.each([0, 50, 100, 200])('scales inherited velocity by %s percent and adds it to launch speed', (strength) => {
    const base = settings({ originVelocityInfluence: strength, velocityMagnitude: 2, velocityAngle: 0 });
    const state = particles.createState(context(0), base);
    particles.step(state, base, context(0));
    particles.step(state, { ...base, originX: 53, originY: 49 }, context(1));
    expect(state.particles[1].vx).toBeCloseTo(2 + 3 * strength / 100);
    expect(state.particles[1].vy).toBeCloseTo(-strength / 100);
    expect(state.particles[0].vx).toBe(2);
  });

  it('tracks movement while disabled and while no particles are emitted', () => {
    const base = settings({ inheritOriginVelocity: false, emissionRate: 0 });
    const state = particles.createState(context(0), base);
    particles.step(state, base, context(0));
    particles.step(state, { ...base, originX: 60 }, context(1));
    particles.step(state, { ...base, inheritOriginVelocity: true, emissionRate: 30, originX: 61 }, context(2));
    expect(state.particles[0].vx).toBe(1);
    particles.step(state, { ...base, inheritOriginVelocity: true, emissionRate: 30, originX: 61 }, context(3));
    expect(state.particles[1].vx).toBe(0);
    expect(state.particles[0].vx).toBe(1);
  });

  it('preserves previous origin in independent simulation checkpoints', () => {
    const base = settings();
    const state = particles.createState(context(0), base);
    particles.step(state, base, context(0));
    const copy = particles.cloneState(state);
    expect(copy.previousOrigin).toEqual({ x: 50, y: 50 });
    expect(copy.previousOrigin).not.toBe(state.previousOrigin);
    particles.step(copy, { ...base, originX: 55 }, context(1));
    expect(state.previousOrigin!.x).toBe(50);
    expect(state.particles).toHaveLength(1);
  });

  it('leaves existing projects unchanged when inheritance is off', () => {
    const base = settings({ inheritOriginVelocity: false });
    const state = particles.createState(context(0), base);
    particles.step(state, base, context(0));
    particles.step(state, { ...base, originX: 80 }, context(1));
    expect(state.particles[1].vx).toBe(0);
    expect(state.particles[1].x).toBe(80);
  });

  it('replays animated origins, toggles and strengths identically through seeks and serialization', () => {
    const tl = useTimelineStore.getState();
    const id = tl.addGeneratorLayer('particle-physics', { startFrame: 10, durationFrames: 80 })!;
    tl.updateGeneratorSettings(id, settings({ originX: 20, originY: 15, emissionRate: 20 }));
    for (const [path, start, end] of [
      ['originX', 20, 40], ['originY', 15, 5],
      ['originVelocityInfluence', 50, 150], ['inheritOriginVelocity', false, true],
    ] as const) {
      const track = tl.addGeneratorPropertyTrack(id, path)!;
      tl.addGeneratorKeyframe(id, track, 10, start);
      tl.addGeneratorKeyframe(id, track, 35, end);
    }
    const source = tl.getLayer(id)!.generator!;
    const snapshots = Array.from({ length: 80 }, (_, f) => JSON.stringify([...renderGeneratorFrame(source, f + 10, 80, 24)]));
    const restored = deserializeGeneratorSource(serializeGeneratorSource(source));
    for (const f of [75, 17, 69, 35, 10, 89]) {
      expect(JSON.stringify([...renderGeneratorFrame(restored, f, 80, 24)])).toBe(snapshots[f - 10]);
    }
    expect(resolveGeneratorSettings(source, 34).inheritOriginVelocity).toBe(false);
    expect(resolveGeneratorSettings(source, 35).inheritOriginVelocity).toBe(true);
  });
});

describe('particle inheritance controls', () => {
  it('conditionally shows a slider, records one undo entry per gesture and auto-keys edits', () => {
    const tl = useTimelineStore.getState();
    const id = tl.addGeneratorLayer('particle-physics')!;
    render(<GeneratorPropertiesPanel />);
    expect(screen.queryByRole('slider', { name: 'Origin Velocity Influence' })).toBeNull();
    const row = screen.getByTitle('Inherit Velocity from Origin').parentElement!;
    fireEvent.click(within(row).getByRole('button', { name: 'Off' }));
    expect(tl.getLayer(id)!.generator!.settings.inheritOriginVelocity).toBe(true);
    replay();
    expect(screen.queryByRole('slider', { name: 'Origin Velocity Influence' })).toBeNull();
    replay(true);
    const slider = screen.getByRole('slider', { name: 'Origin Velocity Influence' });
    const before = useToolStore.getState().historyStack.length;
    fireEvent.change(slider, { target: { value: '120' } });
    fireEvent.change(slider, { target: { value: '150' } });
    expect(tl.getLayer(id)!.generator!.settings.originVelocityInfluence).toBe(150);
    expect(useToolStore.getState().historyStack).toHaveLength(before);
    fireEvent.pointerUp(window);
    expect(useToolStore.getState().historyStack).toHaveLength(before + 1);
    replay();
    expect(tl.getLayer(id)!.generator!.settings.originVelocityInfluence).toBe(100);
    replay(true);
    act(() => {
      const track = tl.addGeneratorPropertyTrack(id, 'originVelocityInfluence')!;
      tl.addGeneratorKeyframe(id, track, 0, 150);
      tl.goToFrame(10);
    });
    fireEvent.change(slider, { target: { value: '75' } });
    fireEvent.keyUp(slider, { key: 'ArrowLeft' });
    const track = tl.getLayer(id)!.generator!.propertyTracks[0];
    expect(track.keyframes.map((k) => [k.frame, k.value])).toEqual([[0, 150], [10, 75]]);
    replay();
    expect(tl.getLayer(id)!.generator!.propertyTracks[0].keyframes).toHaveLength(1);
    replay(true);
    expect(resolveGeneratorSettings(tl.getLayer(id)!.generator!, 10).originVelocityInfluence).toBe(75);
  });
});

describe('selected particle origin overlay', () => {
  function addParticle() {
    const tl = useTimelineStore.getState();
    const id = tl.addGeneratorLayer('particle-physics', { startFrame: 2, durationFrames: 6 })!;
    tl.updateGeneratorSettings(id, { originX: 5, originY: 6 });
    tl.goToFrame(2);
    return id;
  }

  it('shows just the origin dot for a static selected particle layer and hides on deselection', () => {
    const id = addParticle();
    render(<ParticleOriginOverlay />);
    const dot = screen.getByLabelText('Particle origin');
    expect(dot.style.left).toBe('103px');
    expect(dot.style.top).toBe('244px');
    expect(screen.getByTestId('particle-origin-overlay').children).toHaveLength(1);
    act(() => useTimelineStore.getState().setActiveLayer(null));
    expect(screen.queryByLabelText('Particle origin')).toBeNull();
    act(() => useTimelineStore.getState().setActiveLayer(id));
    expect(screen.getByLabelText('Particle origin')).toBeDefined();
  });

  it('samples an animated path only within the generator span and updates the dot while scrubbing', () => {
    const id = addParticle();
    const tl = useTimelineStore.getState();
    const track = tl.addGeneratorPropertyTrack(id, 'originX')!;
    tl.addGeneratorKeyframe(id, track, 2, 5);
    tl.addGeneratorKeyframe(id, track, 7, 10);
    render(<ParticleOriginOverlay />);
    const overlay = screen.getByTestId('particle-origin-overlay');
    expect(overlay.children).toHaveLength(7);
    expect(overlay.children[0].className).toContain('bg-yellow-400');
    expect(overlay.children[1].className).toContain('bg-yellow-500/50');
    act(() => tl.goToFrame(5));
    expect(screen.getByLabelText('Particle origin').style.left).toBe('163px');
    expect(overlay.children[3].className).toContain('bg-yellow-400');
    act(() => tl.goToFrame(8));
    expect(screen.queryByLabelText('Particle origin')).toBeNull();
  });

  it('follows layer and group transforms in canvas space', () => {
    const id = addParticle();
    const layer = useTimelineStore.getState().getLayer(id)!;
    const transformed = {
      ...layer,
      staticProperties: { ...layer.staticProperties,
        'transform.position.x': 2, 'transform.position.y': 3, 'transform.scale.x': 2,
        'transform.anchorPoint.x': 1, 'transform.anchorPoint.y': 2 },
    };
    expect(getParticleOriginAtFrame(transformed, transformed.generator!, [], 2, 0.5))
      .toEqual({ x: 11, y: 9 });
    const groupId = 'origin-group' as NonNullable<typeof layer.parentGroupId>;
    const grouped = { ...transformed, parentGroupId: groupId };
    expect(getParticleOriginAtFrame(grouped, grouped.generator!, [{
      id: groupId, name: 'Group', childLayerIds: [id], visible: true, solo: false,
      locked: false, collapsed: false, propertyTracks: [], effectTracks: [],
      staticProperties: { 'transform.position.x': 4, 'transform.scale.y': 2, 'transform.rotation': 90 },
    }], 2, 0.5)).toEqual({ x: -9, y: 9 });
  });

  // Cells are 20x40px after zoom, offset by pan {3,4}
  const clientFor = (x: number, y: number) => ({ clientX: 3 + x * 20 + 5, clientY: 4 + y * 40 + 5, pointerId: 1 });

  it('drags the origin from a canvas press with drawing tools and records one undo entry', () => {
    const id = addParticle();
    act(() => useToolStore.getState().setActiveTool('pencil'));
    render(<ParticleOriginOverlay />);
    const overlay = screen.getByTestId('particle-origin-overlay');
    expect(overlay.className).toContain('pointer-events-auto');
    fireEvent.pointerDown(overlay, { ...clientFor(12, 7), button: 0 });
    expect(resolveGeneratorSettings(useTimelineStore.getState().getLayer(id)!.generator!, 2))
      .toMatchObject({ originX: 12, originY: 7 });
    fireEvent.pointerMove(overlay, clientFor(20, 3));
    fireEvent.pointerMove(overlay, clientFor(30, 9));
    fireEvent.pointerUp(overlay, clientFor(30, 9));
    const after = () => resolveGeneratorSettings(useTimelineStore.getState().getLayer(id)!.generator!, 2);
    expect(after()).toMatchObject({ originX: 30, originY: 9 });
    expect(useToolStore.getState().historyStack).toHaveLength(1);
    expect(screen.getByLabelText('Particle origin').style.left).toBe(`${3 + 30 * 20}px`);
    replay();
    expect(after()).toMatchObject({ originX: 5, originY: 6 });
    replay(true);
    expect(after()).toMatchObject({ originX: 30, originY: 9 });
  });

  it('only drags from the dot with non-drawing tools, without jumping', () => {
    const id = addParticle();
    act(() => useToolStore.getState().setActiveTool('select'));
    render(<ParticleOriginOverlay />);
    const overlay = screen.getByTestId('particle-origin-overlay');
    expect(overlay.className).toContain('pointer-events-none');
    fireEvent.pointerDown(overlay, { ...clientFor(12, 7), button: 0 });
    expect(useToolStore.getState().historyStack).toHaveLength(0);
    const dot = screen.getByLabelText('Particle origin');
    // Grab slightly off-centre of the dot: origin stays put until the pointer moves
    fireEvent.pointerDown(dot, { clientX: 3 + 5 * 20 + 3, clientY: 4 + 6 * 40 + 2, pointerId: 2, button: 0 });
    fireEvent.pointerMove(dot, { clientX: 3 + 8 * 20 + 3, clientY: 4 + 6 * 40 + 2, pointerId: 2 });
    fireEvent.pointerUp(dot, { clientX: 3 + 8 * 20 + 3, clientY: 4 + 6 * 40 + 2, pointerId: 2 });
    expect(resolveGeneratorSettings(useTimelineStore.getState().getLayer(id)!.generator!, 2))
      .toMatchObject({ originX: 8, originY: 6 });
    expect(useToolStore.getState().historyStack).toHaveLength(1);
  });

  it('auto-keys an animated origin at the current frame', () => {
    const id = addParticle();
    const tl = useTimelineStore.getState();
    const trackX = tl.addGeneratorPropertyTrack(id, 'originX')!;
    tl.addGeneratorKeyframe(id, trackX, 2, 5);
    tl.addGeneratorKeyframe(id, trackX, 7, 10);
    act(() => tl.goToFrame(4));
    act(() => useToolStore.getState().setActiveTool('pencil'));
    render(<ParticleOriginOverlay />);
    const overlay = screen.getByTestId('particle-origin-overlay');
    fireEvent.pointerDown(overlay, { ...clientFor(20, 6), button: 0 });
    fireEvent.pointerUp(overlay, clientFor(20, 6));
    const source = useTimelineStore.getState().getLayer(id)!.generator!;
    const track = source.propertyTracks.find((t) => t.propertyPath === 'originX')!;
    expect(track.keyframes.map((k) => [k.frame, k.value])).toEqual([[2, 5], [4, 20], [7, 10]]);
    expect(source.settings.originY).toBe(6);
  });

  it('inverts layer and group transforms when converting canvas points to the origin', () => {
    const id = addParticle();
    const layer = useTimelineStore.getState().getLayer(id)!;
    const transformed = {
      ...layer,
      parentGroupId: 'g' as NonNullable<typeof layer.parentGroupId>,
      staticProperties: { ...layer.staticProperties,
        'transform.position.x': 2, 'transform.position.y': 3, 'transform.scale.x': 2,
        'transform.anchorPoint.x': 1, 'transform.anchorPoint.y': 2 },
    };
    const groups = [{
      id: 'g' as NonNullable<typeof layer.parentGroupId>, name: 'Group', childLayerIds: [id], visible: true,
      solo: false, locked: false, collapsed: false, propertyTracks: [], effectTracks: [],
      staticProperties: { 'transform.position.x': 4, 'transform.scale.y': 2, 'transform.rotation': 90 },
    }];
    for (const [ox, oy] of [[5, 6], [12, -3], [0, 0]]) {
      const withOrigin = { ...transformed, generator: { ...transformed.generator!, settings: {
        ...transformed.generator!.settings, originX: ox, originY: oy } } };
      const canvas = getParticleOriginAtFrame(withOrigin, withOrigin.generator, groups, 2, 1);
      expect(canvasPointToParticleOrigin(withOrigin, groups, 2, canvas, 1)).toEqual({ x: ox, y: oy });
    }
  });

  it('hides when disabled, another layer is selected, or optimized playback is active', () => {
    const id = addParticle();
    const tl = useTimelineStore.getState();
    const { rerender } = render(<ParticleOriginOverlay />);
    act(() => tl.toggleGeneratorEnabled(id));
    expect(screen.queryByLabelText('Particle origin')).toBeNull();
    act(() => tl.toggleGeneratorEnabled(id));
    expect(screen.getByLabelText('Particle origin')).toBeDefined();
    act(() => tl.setActiveLayer(tl.layers.find((l) => l.id !== id)!.id as LayerId));
    expect(screen.queryByLabelText('Particle origin')).toBeNull();
    act(() => tl.setActiveLayer(id));
    vi.mocked(usePlaybackOnlySnapshot).mockReturnValue({ isActive: true, currentFrameIndex: 2, frames: [] });
    rerender(<ParticleOriginOverlay />);
    expect(screen.queryByLabelText('Particle origin')).toBeNull();
  });
});
