import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: ['cache/**'],
  },
  ...compat.config({
    env: { es2023: true, node: true },
    extends: ['eslint:recommended', 'plugin:import/recommended', 'prettier'],
    parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    rules: {
      'no-console': 'off',
      'import/order': [
        'warn',
        {
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
          groups: [
            ['builtin', 'external'],
            ['internal'],
            ['parent', 'sibling', 'index'],
          ],
        },
      ],
    },
    settings: { 'import/resolver': { node: true } },
  }),
];
