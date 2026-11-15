// Lint gate (spec §26): static quality checks across api, web and contracts. Kept pragmatic: recommended rules,
// real-bug rules as errors, style opinions left to the formatter-less codebase.
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import globals from 'globals'
import vueParser from 'vue-eslint-parser'

const unused = ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none', ignoreRestSiblings: true }]

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/.nuxt/**', '**/.output/**', '.claude/**', 'tests/fixtures/**', 'apps/api/prisma/migrations/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/essential'],
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Prisma Json / Nest bodies are loosely typed on purpose
      '@typescript-eslint/no-unused-vars': unused,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-expressions': 'off', // `cond && fn()` is used in a few handlers
      '@typescript-eslint/no-require-imports': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }], // best-effort localStorage/try blocks
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: { parser: vueParser, parserOptions: { parser: tseslint.parser, sourceType: 'module' }, globals: { ...globals.browser, defineProps: 'readonly', defineEmits: 'readonly', defineExpose: 'readonly', withDefaults: 'readonly' } },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off', // only static, hard-coded SVG icon strings (ThemeToggle)
      'no-undef': 'off', // Nuxt auto-imports (ref, computed, api, useLive, …) are not known to ESLint
    },
  },
  { files: ['**/*.ts'], rules: { 'no-undef': 'off' } }, // TypeScript already checks undefined names
  { files: ['tests/**/*.mjs', 'eslint.config.mjs'], languageOptions: { globals: { ...globals.node } } },
]
