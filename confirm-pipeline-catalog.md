# Catalog: Photo/Barcode Confirm Pipeline Files (Exact Paths & Line Ranges)

## [A] Review modal / hydration
- **path**: `src/components/camera/ReviewItemsScreen.tsx`
- **symbols**: `ReviewItemsScreen` (lines 64-914), `confirmModalItems` state (line 89), hydration effect (lines 135-194)
- **purpose**: creates confirmModalItems, runs hydration (generic-food resolution), writes to store

## [B] Legacy adapter
- **path**: `src/lib/confirm/legacyItemAdapter.ts`
- **symbols**: `toLegacyFoodItem` (lines 79-313), `LegacyFoodItem` type (lines 30-73)
- **purpose**: merges nutrition/basis, reads perGram from store/raw

## [C] Confirmation card
- **path**: `src/components/FoodConfirmationCard.tsx`
- **symbols**: `FoodConfirmationCard` component (lines 166-2241), macros mode detection (line 545), nutrition scaling (lines 574+), image fallback (lines 262-278)
- **purpose**: renders macros/kcal; chooses per-gram/per-100/per-serving

## [D] Nutrition store
- **path**: `src/stores/nutritionStore.ts`
- **symbols**: `useNutritionStore` (lines 86-167), `get` (lines 93-105), `upsert` (lines 107-144), `upsertMany` (lines 146-151)
- **purpose**: API used by Review/Adapter to persist perGram analysis

## [E] Photo pipeline entry
- **path**: `src/lib/detect/router.ts`
- **symbols**: detection router functions (entry point for detect-* items)
- **purpose**: where `detect-*` ids and initial item objects are formed

## [F] Generic-food resolver
- **path**: `src/health/generic/resolveGenericFood.ts`
- **symbols**: `resolveGenericFoodBatch` (lines 37-40), `resolveGenericFood` (lines 5-35), `GenericFood` type (line 3)
- **purpose**: returns per-100/per-gram nutrition for generic foods

## [G] Barcode pipeline
- **path**: `src/pipelines/barcodePipeline.ts`
- **symbols**: `analyzeBarcode` function, OFF mapping to perServing/per100, kcal-from-macros fallback
- **purpose**: nutrition + image for barcode flow

## [H] Image helpers (OFF)
- **path**: `src/lib/imageHelpers.ts`
- **symbols**: `offImageCandidates` (lines 57-62), `offImageForBarcode`, `isEan`
- **purpose**: image fallback chain for barcode

## Feature Flag Configuration
- **path**: `src/config/confirmFlags.ts`
- **symbols**: `ENABLE_PHOTO_BARCODE_ENRICH` (line 2)
- **purpose**: gates new photo/barcode functionality

## Additional Key Files
- **Hydration utils**: `src/lib/confirm/hydrationUtils.ts` - nutrition recompute helpers
- **Photo capture**: `src/components/camera/photoCapture.ts` - camera interface
- **Manual entry guard**: Manual flow protection implemented in FoodConfirmationCard.tsx and legacyItemAdapter.ts