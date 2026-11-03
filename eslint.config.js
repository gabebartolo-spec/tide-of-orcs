import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    rules: {
      'no-restricted-globals': ['error', { name: 'Date', message: 'sim/ must not read the clock; pass time in.' }],
    },
    files: ['src/sim/**/*.ts', 'src/data/**/*.ts'],
  },
  {
    // the benchmark runner is a plain Node script (TB-217)
    files: ['scripts/bench/**/*.mjs'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly', Buffer: 'readonly', fetch: 'readonly', WebSocket: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', performance: 'readonly' } },
  },
  { ignores: ['dist', 'node_modules', 'docs'] },
);
