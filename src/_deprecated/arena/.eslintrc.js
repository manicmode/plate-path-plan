// ESLint configuration for deprecated Arena components
// These files should not be imported - use ArenaPanel (V2) instead

module.exports = {
  rules: {
    '@typescript-eslint/no-unused-vars': 'off',
    'import/no-unresolved': 'off',
    'react-hooks/exhaustive-deps': 'off',
    // Warn against any use of these deprecated components
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/_deprecated/arena/**'],
            message: 'Deprecated Arena V1 components should not be imported. Use ArenaPanel and V2 hooks instead.',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ['*.tsx', '*.ts'],
      rules: {
        // Allow deprecated imports within the deprecated folder itself
        'no-restricted-imports': 'off',
      },
    },
  ],
};