import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('web build (TB-216e)', () => {
  it('ships no source maps to dist (the itch upload)', () => {
    expect(readFileSync('vite.config.ts', 'utf-8')).toMatch(/sourcemap:\s*false/);
  });
});
