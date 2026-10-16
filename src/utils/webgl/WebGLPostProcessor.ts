/**
 * WebGL Post Processor
 *
 * Manages the WebGL2 rendering pipeline for post-processing effects.
 * Takes a Canvas2D-rendered frame as input, applies a chain of shader
 * effects, and outputs the final result to the display canvas.
 *
 * Architecture:
 * 1. Upload Canvas2D output as a WebGL texture
 * 2. For each active post effect (in stacking order):
 *    a. Bind input texture (previous output or original)
 *    b. Set uniform values from evaluated keyframes
 *    c. Render fullscreen quad through fragment shader
 *    d. Swap ping-pong framebuffers
 * 3. Final pass renders to the display canvas
 */

import type { PostEffectRegistryEntry } from '../../registry/postEffectRegistry';
import { getOrCreateProgram, clearProgramCache, type ShaderProgram } from './shaderCompiler';
import { FULLSCREEN_VERTEX_SHADER, PASSTHROUGH_FRAGMENT_SHADER } from './commonShaders';

// ============================================
// TYPES
// ============================================

export interface PostEffectPass {
  /** The registry entry for this effect */
  entry: PostEffectRegistryEntry;
  /** Resolved settings (after keyframe interpolation) */
  settings: Record<string, unknown>;
}

// ============================================
// WebGL POST PROCESSOR
// ============================================

export class WebGLPostProcessor {
  private gl: WebGL2RenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;

  // Fullscreen quad geometry
  private quadVAO: WebGLVertexArrayObject | null = null;
  private quadVBO: WebGLBuffer | null = null;

  // Ping-pong framebuffers for chaining effects
  private framebuffers: [WebGLFramebuffer | null, WebGLFramebuffer | null] = [null, null];
  private fbTextures: [WebGLTexture | null, WebGLTexture | null] = [null, null];
  private fbWidth = 0;
  private fbHeight = 0;

  // Input texture (uploaded from Canvas2D)
  private inputTexture: WebGLTexture | null = null;

  // Snapshot texture for multi-pass effects (preserves pre-effect input
  // so ping-pong writes don't overwrite it)
  private originalSnapshot: WebGLTexture | null = null;
  private snapshotFb: WebGLFramebuffer | null = null;

  // State
  private initialized = false;

  // ============================================
  // LIFECYCLE
  // ============================================

  /**
   * Initialize the WebGL post processor on the given canvas element.
   * The canvas should be the display canvas visible to the user.
   */
  initialize(canvas: HTMLCanvasElement): boolean {
    if (this.initialized && this.canvas === canvas) return true;

    this.dispose();

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      antialias: false,
    });

    if (!gl) {
      console.warn('[WebGL Post Processor] WebGL2 not available');
      return false;
    }

    this.gl = gl;
    this.canvas = canvas;

    // Create fullscreen quad
    this.createQuad();

    // Create input texture
    this.inputTexture = gl.createTexture();

    // Create passthrough program
    getOrCreateProgram(
      gl,
      FULLSCREEN_VERTEX_SHADER,
      PASSTHROUGH_FRAGMENT_SHADER,
      ['u_texture'],
    );

    this.initialized = true;
    return true;
  }

  /**
   * Clean up WebGL resources. Release contexts only for discarded canvases;
   * the live overlay canvas may be reused by another processor.
   */
  dispose({ loseContext = false }: { loseContext?: boolean } = {}): void {
    if (!this.gl) return;
    const gl = this.gl;

    // Delete framebuffers and their textures
    for (let i = 0; i < 2; i++) {
      if (this.framebuffers[i]) gl.deleteFramebuffer(this.framebuffers[i]);
      if (this.fbTextures[i]) gl.deleteTexture(this.fbTextures[i]);
    }
    this.framebuffers = [null, null];
    this.fbTextures = [null, null];

    // Delete input texture
    if (this.inputTexture) gl.deleteTexture(this.inputTexture);

    // Delete snapshot texture and framebuffer
    if (this.originalSnapshot) gl.deleteTexture(this.originalSnapshot);
    if (this.snapshotFb) gl.deleteFramebuffer(this.snapshotFb);

    // Delete quad geometry
    if (this.quadVBO) gl.deleteBuffer(this.quadVBO);
    if (this.quadVAO) gl.deleteVertexArray(this.quadVAO);

    clearProgramCache(gl);
    if (loseContext) gl.getExtension('WEBGL_lose_context')?.loseContext();

    this.gl = null;
    this.canvas = null;
    this.inputTexture = null;
    this.originalSnapshot = null;
    this.snapshotFb = null;
    this.quadVAO = null;
    this.quadVBO = null;
    this.initialized = false;
    this.fbWidth = 0;
    this.fbHeight = 0;
  }

  /**
   * Check if the processor is initialized and ready.
   */
  isReady(): boolean {
    return this.initialized && this.gl !== null;
  }

  // ============================================
  // RENDERING
  // ============================================

  /**
   * Process a frame through the post effect chain.
   *
   * @param sourceCanvas - The Canvas2D-rendered frame to process
   * @param effects - Ordered list of active post effects with resolved settings
   * @param time - Current time in seconds
   * @param frame - Current frame number
   * @param bgColor - Canvas background color as [r, g, b] normalized (0–1)
   */
  render(
    sourceCanvas: HTMLCanvasElement,
    effects: PostEffectPass[],
    time: number,
    frame: number,
    bgColor?: [number, number, number],
  ): void {
    if (!this.gl || !this.canvas) return;
    const gl = this.gl;

    // Use the display canvas's current dimensions (set externally by the hook
    // or the caller for exports). This avoids resetting the GL context by
    // writing to canvas.width/height, which would destroy all GL state.
    const width = this.canvas.width;
    const height = this.canvas.height;

    if (width === 0 || height === 0) return;

    // Upload source canvas as input texture
    this.uploadTexture(this.inputTexture!, sourceCanvas);

    // If no effects, just passthrough
    if (effects.length === 0) {
      this.renderPassthrough(this.inputTexture!, width, height);
      return;
    }

    // Ensure framebuffers match dimensions
    this.ensureFramebuffers(width, height);

    // Process effect chain
    let currentInput = this.inputTexture!;
    let currentFbIndex = 0;

    for (let i = 0; i < effects.length; i++) {
      const effect = effects[i];
      const isLast = i === effects.length - 1;
      const passes = effect.entry.passes ?? 1;

      // For multi-pass effects, snapshot the current input to a dedicated
      // texture so ping-pong writes can't overwrite it. Without this, when
      // glow (3-pass) runs after another effect, pass 1 can overwrite the
      // FB texture that effectOriginalInput points to, corrupting u_original.
      let effectOriginalInput = currentInput;
      if (passes > 1 && currentInput !== this.inputTexture) {
        // Copy currentInput → originalSnapshot via blit
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.framebuffers[1 - currentFbIndex]);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.snapshotFb);
        gl.blitFramebuffer(0, 0, width, height, 0, 0, width, height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
        effectOriginalInput = this.originalSnapshot!;
      }

      for (let pass = 0; pass < passes; pass++) {
        const isLastPassOfLastEffect = isLast && pass === passes - 1;

        // Select shader for this pass
        const shaderSource = effect.entry.passShaders?.[pass] ?? effect.entry.fragmentShader;

        // Build uniform names list — include u_original for multi-pass shaders
        const uniformNames = [
          'u_texture',
          'u_original',
          'u_resolution',
          'u_time',
          'u_frame',
          'u_bgColor',
          ...effect.entry.propertyDefinitions.map((d) => `u_${d.path}`),
        ];

        // Get or compile shader program
        const program = getOrCreateProgram(
          gl,
          FULLSCREEN_VERTEX_SHADER,
          shaderSource,
          uniformNames,
        );

        if (isLastPassOfLastEffect) {
          // Render directly to display canvas
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          gl.viewport(0, 0, width, height);
        } else {
          // Render to ping-pong framebuffer
          gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[currentFbIndex]);
          gl.viewport(0, 0, width, height);
        }

        // Use program
        gl.useProgram(program.program);

        // Bind input texture (result of previous pass) on unit 0
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, currentInput);
        this.setUniform(gl, program, 'u_texture', 0, 'int');

        // Bind original pre-effect texture on unit 1 (for compositing)
        if (passes > 1) {
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, effectOriginalInput);
          this.setUniform(gl, program, 'u_original', 1, 'int');
        }

        // Set standard uniforms
        this.setUniform(gl, program, 'u_resolution', [width, height], 'vec2');
        this.setUniform(gl, program, 'u_time', time, 'float');
        this.setUniform(gl, program, 'u_frame', frame, 'float');
        if (bgColor) {
          this.setUniform(gl, program, 'u_bgColor', bgColor, 'vec3');
        }

        // Set per-effect property uniforms
        const passOverrides = effect.entry.passUniforms?.[pass];
        for (const def of effect.entry.propertyDefinitions) {
          const uniformName = `u_${def.path}`;
          // Pass overrides take priority, then settings, then default
          const value = passOverrides?.[def.path] ?? effect.settings[def.path] ?? def.defaultValue;
          this.setUniformFromValue(gl, program, uniformName, value, def);
        }

        // Draw fullscreen quad
        gl.bindVertexArray(this.quadVAO);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.bindVertexArray(null);

        // Update for next pass
        if (!isLastPassOfLastEffect) {
          currentInput = this.fbTextures[currentFbIndex]!;
          currentFbIndex = 1 - currentFbIndex;
        }
      }
    }
  }

  /**
   * Render the source canvas directly through passthrough shader.
   * Used when no post effects are active.
   */
  renderPassthrough(
    sourceCanvasOrTexture: HTMLCanvasElement | WebGLTexture,
    width?: number,
    height?: number,
  ): void {
    if (!this.gl || !this.canvas) return;
    const gl = this.gl;
    const program = getOrCreateProgram(gl, FULLSCREEN_VERTEX_SHADER, PASSTHROUGH_FRAGMENT_SHADER, ['u_texture']);

    let texture: WebGLTexture;
    if (sourceCanvasOrTexture instanceof HTMLCanvasElement) {
      texture = this.inputTexture!;
      this.uploadTexture(texture, sourceCanvasOrTexture);
      width = sourceCanvasOrTexture.width;
      height = sourceCanvasOrTexture.height;
    } else {
      texture = sourceCanvasOrTexture;
    }

    if (!width || !height) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);

    gl.useProgram(program.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    this.setUniform(gl, program, 'u_texture', 0, 'int');

    gl.bindVertexArray(this.quadVAO);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Create the fullscreen quad VAO and VBO.
   */
  private createQuad(): void {
    const gl = this.gl!;

    // Positions (clip space) + tex coords (UV)
    // prettier-ignore
    const vertices = new Float32Array([
      // x,    y,    u,   v
      -1.0, -1.0,  0.0, 0.0,
       1.0, -1.0,  1.0, 0.0,
      -1.0,  1.0,  0.0, 1.0,
       1.0,  1.0,  1.0, 1.0,
    ]);

    this.quadVAO = gl.createVertexArray();
    this.quadVBO = gl.createBuffer();

    gl.bindVertexArray(this.quadVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // a_position (location 0)
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);

    // a_texCoord (location 1)
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

    gl.bindVertexArray(null);
  }

  /**
   * Upload a Canvas2D output as a WebGL texture.
   */
  private uploadTexture(texture: WebGLTexture, source: HTMLCanvasElement): void {
    const gl = this.gl!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // Flip Y so Canvas2D (top-left origin) maps correctly to WebGL (bottom-left origin)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  /**
   * Ensure ping-pong framebuffers are allocated at the correct size.
   */
  private ensureFramebuffers(width: number, height: number): void {
    if (this.fbWidth === width && this.fbHeight === height) return;
    const gl = this.gl!;

    for (let i = 0; i < 2; i++) {
      // Delete old
      if (this.framebuffers[i]) gl.deleteFramebuffer(this.framebuffers[i]);
      if (this.fbTextures[i]) gl.deleteTexture(this.fbTextures[i]);

      // Create texture
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

      // Create framebuffer
      const fb = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

      this.framebuffers[i] = fb;
      this.fbTextures[i] = tex;
    }

    // Snapshot texture + framebuffer for multi-pass effect u_original preservation
    if (this.originalSnapshot) gl.deleteTexture(this.originalSnapshot);
    if (this.snapshotFb) gl.deleteFramebuffer(this.snapshotFb);

    const snapTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, snapTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    const snapFb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, snapFb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, snapTex, 0);

    this.originalSnapshot = snapTex;
    this.snapshotFb = snapFb;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.fbWidth = width;
    this.fbHeight = height;
  }

  /**
   * Set a uniform value by type string.
   */
  private setUniform(
    gl: WebGL2RenderingContext,
    program: ShaderProgram,
    name: string,
    value: number | number[],
    type: 'float' | 'int' | 'vec2' | 'vec3' | 'vec4',
  ): void {
    const loc = program.uniformLocations.get(name);
    if (!loc) return;

    switch (type) {
      case 'float':
        gl.uniform1f(loc, value as number);
        break;
      case 'int':
        gl.uniform1i(loc, value as number);
        break;
      case 'vec2':
        gl.uniform2fv(loc, value as number[]);
        break;
      case 'vec3':
        gl.uniform3fv(loc, value as number[]);
        break;
      case 'vec4':
        gl.uniform4fv(loc, value as number[]);
        break;
    }
  }

  /**
   * Set a uniform from a property definition value.
   * Handles type conversion from JS values to GL uniform calls.
   */
  private setUniformFromValue(
    gl: WebGL2RenderingContext,
    program: ShaderProgram,
    name: string,
    value: unknown,
    def: { valueType: string; options?: { value: string | number }[] },
  ): void {
    const loc = program.uniformLocations.get(name);
    if (!loc) return;

    switch (def.valueType) {
      case 'number':
        gl.uniform1f(loc, value as number);
        break;
      case 'boolean':
        // Shader uniforms are float; pass 1.0/0.0
        gl.uniform1f(loc, (value as boolean) ? 1.0 : 0.0);
        break;
      case 'color': {
        // Convert hex color string to vec3
        const rgb = hexToRgb(value as string);
        gl.uniform3fv(loc, rgb);
        break;
      }
      case 'select':
      case 'string':
        // Map select option string values to their index (0, 1, 2, …)
        if (typeof value === 'number') {
          gl.uniform1f(loc, value);
        } else if (typeof value === 'string' && def.options) {
          const idx = def.options.findIndex((o) => o.value === value);
          gl.uniform1f(loc, idx >= 0 ? idx : 0);
        }
        break;
    }
  }
}

// ============================================
// UTILITIES
// ============================================

/**
 * Convert a hex color string to normalized RGB array.
 */
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return [r, g, b];
}

// ============================================
// SINGLETON INSTANCE
// ============================================

/**
 * Global singleton instance of the WebGL post processor.
 * Shared across the application to avoid multiple GL contexts.
 */
export const webglPostProcessor = new WebGLPostProcessor();
