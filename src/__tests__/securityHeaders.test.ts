// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
const headers = new Map<string, string>(
  config.headers[0].headers.map((header: { key: string; value: string }) => [header.key, header.value]),
);

describe('production security headers', () => {
  it('permits WebAssembly compilation without enabling JavaScript string evaluation', () => {
    const csp = headers.get('Content-Security-Policy');
    expect(csp).toContain("'wasm-unsafe-eval'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).toContain("worker-src 'self' blob:");
  });

  it('preserves FFmpeg cross-origin isolation and page embedding protection', () => {
    expect(headers.get('Cross-Origin-Embedder-Policy')).toBe('credentialless');
    expect(headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
  });
});
