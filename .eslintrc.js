module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.js'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // Ban imports from deprecated arena folder
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/_deprecated/arena/**'],
            message: 'Deprecated Arena V1 components should not be imported. Use ArenaPanel and V2 hooks instead.',
          },
          {
            group: ['@/components/arena/ArenaV2Panel'],
            message: 'Direct ArenaV2Panel import is deprecated. Use ArenaPanel facade instead.',
          },
        ],
      },
    ],
  },
};