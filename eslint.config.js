import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
      // ---- Arena V1 Ban (rank20_* legacy code) ----
      "no-restricted-imports": ["error", {
        "paths": [
          { "name": "@/hooks/useEnsureRank20", "message": "DEPRECATED: Use useArenaEnroll() from @/hooks/useArena instead" },
          { "name": "@/hooks/useChallengeRankings", "message": "DEPRECATED: Use useArenaLeaderboardWithProfiles() from @/hooks/useArena instead" }
        ],
        "patterns": [
          "*rank20*",
          "*ensureRank20*", 
          "*diag_rank20*"
        ]
      }],
    },
  },
  // ---- Production console guard ----
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-console": ["error", { allow: ["error", "warn"] }],
    },
  }
);
