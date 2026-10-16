import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { WebGLPostProcessor } from '../utils/webgl/WebGLPostProcessor';
import { clearProgramCache, getOrCreateProgram } from '../utils/webgl/shaderCompiler';
import { applyPostEffectsToCanvas } from '../hooks/usePostEffectsRenderer';
import { registerAllPostEffects } from '../registry/postEffects';
import { getAllPostEffects } from '../registry/postEffectRegistry';
import { useTimelineStore } from '../stores/timelineStore';

function createContext() {
  const loseContext = vi.fn();
  const methods = {
    VERTEX_SHADER: 35633, FRAGMENT_SHADER: 35632, COMPILE_STATUS: 35713, LINK_STATUS: 35714,
    createVertexArray: vi.fn(() => ({})),
    createBuffer: vi.fn(() => ({})),
    createTexture: vi.fn(() => ({})),
    bindVertexArray: vi.fn(), bindBuffer: vi.fn(), bufferData: vi.fn(),
    enableVertexAttribArray: vi.fn(), vertexAttribPointer: vi.fn(),
    deleteBuffer: vi.fn(), deleteVertexArray: vi.fn(), deleteTexture: vi.fn(),
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(), compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => 'deliberate shader failure'),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(), linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getUniformLocation: vi.fn(() => null),
    getAttribLocation: vi.fn(() => -1),
    deleteProgram: vi.fn(),
    getExtension: vi.fn(() => ({ loseContext })),
    readPixels: vi.fn(),
    bindTexture: vi.fn(), texParameteri: vi.fn(), pixelStorei: vi.fn(), texImage2D: vi.fn(),
    bindFramebuffer: vi.fn(), viewport: vi.fn(), useProgram: vi.fn(), activeTexture: vi.fn(), drawArrays: vi.fn(),
  };
  return { gl: methods as WebGL2RenderingContext, methods, loseContext };
}

function createCanvas(gl: WebGL2RenderingContext): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  vi.spyOn(canvas, 'getContext').mockReturnValue(gl);
  return canvas;
}

beforeAll(() => registerAllPostEffects());
afterEach(() => vi.restoreAllMocks());

describe('WebGL context and shader ownership', () => {
  it('deletes cached programs only for the disposed context', () => {
    const live = createContext();
    const temporary = createContext();
    const liveProgram = getOrCreateProgram(live.gl, 'vertex', 'fragment', []);
    const temporaryProgram = getOrCreateProgram(temporary.gl, 'vertex', 'fragment', []);
    expect(temporaryProgram).not.toBe(liveProgram);
    expect(getOrCreateProgram(live.gl, 'vertex', 'fragment', [])).toBe(liveProgram);
    clearProgramCache(temporary.gl);
    expect(temporary.methods.deleteProgram).toHaveBeenCalledExactlyOnceWith(temporaryProgram.program);
    expect(live.methods.deleteProgram).not.toHaveBeenCalled();
    expect(getOrCreateProgram(live.gl, 'vertex', 'fragment', [])).toBe(liveProgram);
    expect(live.methods.createProgram).toHaveBeenCalledTimes(1);
    clearProgramCache(live.gl);
    expect(live.methods.deleteProgram).toHaveBeenCalledExactlyOnceWith(liveProgram.program);
  });

  it('releases discarded contexts exactly once, but keeps reusable overlay contexts alive', () => {
    const temporary = createContext();
    const processor = new WebGLPostProcessor();
    expect(processor.initialize(createCanvas(temporary.gl))).toBe(true);
    processor.dispose({ loseContext: true });
    processor.dispose({ loseContext: true });
    expect(temporary.methods.deleteProgram).toHaveBeenCalledTimes(1);
    expect(temporary.loseContext).toHaveBeenCalledTimes(1);
    expect(processor.isReady()).toBe(false);

    const live = createContext();
    const canvas = createCanvas(live.gl);
    expect(processor.initialize(canvas)).toBe(true);
    processor.dispose();
    expect(live.loseContext).not.toHaveBeenCalled();
    expect(processor.initialize(canvas)).toBe(true);
    processor.dispose();
    expect(live.methods.createProgram).toHaveBeenCalledTimes(2);
    expect(live.methods.deleteProgram).toHaveBeenCalledTimes(2);
    expect(live.loseContext).not.toHaveBeenCalled();
  });

  it('refreshes shared overlay programs after another processor disposes', () => {
    const context = createContext();
    const canvas = createCanvas(context.gl);
    const live = new WebGLPostProcessor();
    const playback = new WebGLPostProcessor();
    live.initialize(canvas);
    playback.initialize(canvas);
    const oldProgram = context.methods.createProgram.mock.results[0].value;
    playback.dispose();
    expect(context.methods.deleteProgram).toHaveBeenCalledWith(oldProgram);
    live.render(document.createElement('canvas'), [], 0, 0);
    expect(context.methods.createProgram).toHaveBeenCalledTimes(2);
    const newProgram = context.methods.createProgram.mock.results[1].value;
    expect(context.methods.useProgram).toHaveBeenLastCalledWith(newProgram);
    expect(newProgram).not.toBe(oldProgram);
    live.dispose();
    expect(context.loseContext).not.toHaveBeenCalled();
  });
});

describe('export post-effects cleanup', () => {
  function tracks() {
    useTimelineStore.getState().createNewProject();
    expect(useTimelineStore.getState().addPostEffectBlock(getAllPostEffects()[0].type, 0, 100)).toBeTruthy();
    return useTimelineStore.getState().postEffectTracks;
  }

  it('releases each frame context after pixel readback', () => {
    const source = document.createElement('canvas');
    source.width = source.height = 1;
    const ctx = {
      createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
      save: vi.fn(), setTransform: vi.fn(), putImageData: vi.fn(), restore: vi.fn(),
    };
    const contexts: ReturnType<typeof createContext>[] = [];
    const render = vi.spyOn(WebGLPostProcessor.prototype, 'render').mockImplementation(() => undefined);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      if (this === source) return ctx as CanvasRenderingContext2D;
      let context = contexts.find((c) => c.gl.canvas === this);
      if (!context) {
        context = createContext();
        Object.defineProperty(context.gl, 'canvas', { value: this });
        contexts.push(context);
      }
      return context.gl;
    });
    const postEffects = tracks();
    for (let frame = 0; frame < 32; frame++) {
      expect(applyPostEffectsToCanvas(source, postEffects, frame, 12)).toBe(true);
    }
    expect(render).toHaveBeenCalledTimes(32);
    expect(ctx.putImageData).toHaveBeenCalledTimes(32);
    expect(contexts).toHaveLength(32);
    for (const context of contexts) {
      expect(context.methods.readPixels).toHaveBeenCalledTimes(1);
      expect(context.methods.deleteProgram).toHaveBeenCalledTimes(1);
      expect(context.loseContext).toHaveBeenCalledTimes(1);
      expect(context.loseContext.mock.invocationCallOrder[0]).toBeGreaterThan(context.methods.readPixels.mock.invocationCallOrder[0]);
    }
  });

  it.each(['initialize', 'render'] as const)('releases the context when %s fails and propagates shader errors', (failure) => {
    const source = document.createElement('canvas');
    const context = createContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context.gl);
    if (failure === 'initialize') context.methods.getShaderParameter.mockReturnValue(false);
    else vi.spyOn(WebGLPostProcessor.prototype, 'render').mockImplementation(() => { throw new Error('deliberate shader failure'); });
    expect(() => applyPostEffectsToCanvas(source, tracks(), 0, 12)).toThrow('deliberate shader failure');
    expect(context.loseContext).toHaveBeenCalledTimes(1);
  });
});
