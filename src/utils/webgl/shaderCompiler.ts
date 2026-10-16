/**
 * Shader Compiler
 *
 * Utilities for compiling and linking WebGL2 shader programs.
 * Includes caching to avoid redundant compilation.
 */

// ============================================
// TYPES
// ============================================

export interface ShaderProgram {
  program: WebGLProgram;
  uniformLocations: Map<string, WebGLUniformLocation>;
  attributeLocations: Map<string, number>;
}

// ============================================
// COMPILATION
// ============================================

/**
 * Compile a single shader (vertex or fragment).
 * Throws with line-annotated error messages on failure.
 */
export function compileShader(
  gl: WebGL2RenderingContext,
  source: string,
  type: GLenum,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create shader object');

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) || 'Unknown error';
    gl.deleteShader(shader);

    // Annotate error with source line numbers
    const lines = source.split('\n');
    const annotated = lines.map((line, i) => `${i + 1}: ${line}`).join('\n');
    const typeStr = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';

    throw new Error(
      `Failed to compile ${typeStr} shader:\n${log}\n\nSource:\n${annotated}`,
    );
  }

  return shader;
}

/**
 * Link a vertex and fragment shader into a program.
 * Throws on link failure.
 */
export function linkProgram(
  gl: WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create shader program');

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) || 'Unknown error';
    gl.deleteProgram(program);
    throw new Error(`Failed to link shader program:\n${log}`);
  }

  return program;
}

/**
 * Compile vertex + fragment shaders and link into a program.
 * Returns the program with pre-fetched uniform and attribute locations.
 */
export function createShaderProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
  uniformNames: string[],
  attributeNames: string[] = ['a_position', 'a_texCoord'],
): ShaderProgram {
  const vertexShader = compileShader(gl, vertexSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER);
  const program = linkProgram(gl, vertexShader, fragmentShader);

  // Clean up individual shaders (they're linked into the program now)
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  // Pre-fetch uniform locations
  const uniformLocations = new Map<string, WebGLUniformLocation>();
  for (const name of uniformNames) {
    const location = gl.getUniformLocation(program, name);
    if (location !== null) {
      uniformLocations.set(name, location);
    }
  }

  // Pre-fetch attribute locations
  const attributeLocations = new Map<string, number>();
  for (const name of attributeNames) {
    const location = gl.getAttribLocation(program, name);
    if (location >= 0) {
      attributeLocations.set(name, location);
    }
  }

  return { program, uniformLocations, attributeLocations };
}

// ============================================
// PROGRAM CACHE
// ============================================

// Keep contexts isolated without retaining discarded canvases.
const programCaches = new WeakMap<WebGL2RenderingContext, Map<string, ShaderProgram>>();

/**
 * Generate a cache key from shader sources.
 */
function cacheKey(vertexSource: string, fragmentSource: string): string {
  // Simple hash — good enough for caching
  let h = 0;
  const combined = vertexSource + '|' + fragmentSource;
  for (let i = 0; i < combined.length; i++) {
    h = ((h << 5) - h + combined.charCodeAt(i)) | 0;
  }
  return `sp-${h}`;
}

/**
 * Get or create a shader program (cached by source).
 * Programs are owned by their context, so export cleanup cannot evict live shaders.
 */
export function getOrCreateProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
  uniformNames: string[],
): ShaderProgram {
  let programCache = programCaches.get(gl);
  if (!programCache) {
    programCache = new Map();
    programCaches.set(gl, programCache);
  }

  const key = cacheKey(vertexSource, fragmentSource);
  const cached = programCache.get(key);
  if (cached) return cached;

  const program = createShaderProgram(gl, vertexSource, fragmentSource, uniformNames);
  programCache.set(key, program);
  return program;
}

/**
 * Delete this context's programs when its processor is disposed.
 */
export function clearProgramCache(gl: WebGL2RenderingContext): void {
  const cache = programCaches.get(gl);
  if (!cache) return;
  for (const { program } of cache.values()) gl.deleteProgram(program);
  programCaches.delete(gl);
}
