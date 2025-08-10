# Feature Flags

Source of truth: `src/constants/flags.ts`

## Current Flags

- `BARCODE_GLOBAL_ROLLOUT`: `false`
  - Future rollout switch for global barcode search.
  - Note: Not used at runtime yet. Camera flow is hardcoded OFF.

- `ENABLE_XP`: env-derived
  - Reads `VITE_ENABLE_XP=true` (Vite) or `NEXT_PUBLIC_ENABLE_XP=true` (Next).
  - Used in `useNutritionPersistence.tsx` to gate XP demo behavior.

## Guidance
- Add new flags only in `src/constants/flags.ts`.
- Import `FLAGS` to consume.
- Prefer gradual rollout via env + code gates, then remove once fully launched.
