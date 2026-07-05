import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'CallExpression[callee.object.name="localStorage"][callee.property.name="getItem"]',
          message: 'Use getAuthToken() from apiClient.js instead of direct localStorage.getItem("auth")',
        },
        {
          selector: 'CallExpression[callee.name="fetch"]',
          message: 'Use apiFetch() or apiJson() from apiClient.js instead of raw fetch()',
        },
        {
          selector: 'CallExpression[callee.property.name="toLowerCase"][callee.object.name="role"]',
          message: 'Use usePermission().hasRole() instead of role.toLowerCase()',
        },
      ],
    },
  },
])
