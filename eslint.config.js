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
  { ignores: ['dist', 'node_modules', 'docs'] },
);
