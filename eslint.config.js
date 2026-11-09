import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'node_modules', '.venv', 'playwright-report', 'test-results', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // CLAUDE.md section 5: all randomness goes through src/models/rng.ts.
      'no-restricted-properties': ['error', {
        object: 'Math',
        property: 'random',
        message: 'Use the Rng from src/models/rng.ts (crypto or seeded), never Math.random().',
      }],
      // Close the aliasing gaps no-restricted-properties cannot see.
      'no-restricted-syntax': ['error',
        {
          selector: "MemberExpression[object.name='Math'][computed=true]",
          message: 'No computed access on Math (could hide Math.random). Use src/models/rng.ts.',
        },
        {
          selector: "MemberExpression[property.name='random'][object.type='MemberExpression'][object.property.name='Math']",
          message: 'Use the Rng from src/models/rng.ts, never (globalThis|window).Math.random().',
        },
        {
          selector: "MemberExpression[object.name=/^(globalThis|window|self|global)$/][property.name='Math']",
          message: 'Do not reach Math through the global object (could hide Math.random). Use Math directly.',
        },
        {
          selector: "VariableDeclarator[init.name='Math'], AssignmentExpression[right.name='Math']",
          message: 'Do not alias or destructure Math (could hide Math.random). Use src/models/rng.ts.',
        },
        {
          selector: "CallExpression > Identifier.arguments[name='Math']",
          message: 'Do not pass Math around (could hide Math.random). Use src/models/rng.ts.',
        },
      ],
    },
  },

  // ---- MVC layer enforcement (CLAUDE.md section 3, DECISIONS 2026-11-09) ----

  // Models: pure TypeScript. No React, no router, no controllers/views.
  {
    files: ['src/models/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'react', message: 'models/ must be pure TypeScript: no React.' },
          { name: 'react-dom', message: 'models/ must be pure TypeScript: no React DOM.' },
          { name: 'react-router', message: 'models/ must not depend on routing.' },
        ],
        patterns: [
          { group: ['react/*', 'react-dom/*', 'react-router/*'], message: 'models/ must be pure TypeScript.' },
          { group: ['**/controllers/**', '**/controllers'], message: 'models/ must not import controllers/.' },
          { group: ['**/views/**', '**/views'], message: 'models/ must not import views/.' },
        ],
      }],
    },
  },

  // Controllers: may use models, never views.
  {
    files: ['src/controllers/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['**/views/**', '**/views'], message: 'controllers/ must not import views/.' },
        ],
      }],
    },
  },

  // Views: display only. Types from models are fine; logic must come via controllers.
  {
    files: ['src/views/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/models/**', '**/models'],
            allowTypeImports: true,
            message: 'views/ may only `import type` from models/; get logic through a controller.',
          },
        ],
      }],
    },
  },
])
