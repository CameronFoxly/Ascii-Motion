import { describe, expect, it } from 'vitest';
import { finalizeFileName, sanitizeFileName } from '../utils/exportFileName';

describe('finalizeFileName', () => {
  it.each([
    ['', ''],
    ['name', 'name'],
    ['-_-_', ''],
    ['_-name-_', 'name'],
    ['_-one-_two-_', 'one-_two'],
    ['- name -', ' name '],
  ])('trims only boundary separators from %j', (input, expected) => {
    expect(finalizeFileName(input)).toBe(expected);
  });

  it('handles a long adversarial sanitized filename quickly', () => {
    const input = `a${'-_'.repeat(64_000)}b`;
    const start = performance.now();
    const result = finalizeFileName(sanitizeFileName(input));
    const elapsed = performance.now() - start;

    expect(result).toBe(input);
    expect(elapsed).toBeLessThan(1000);
  });
});
