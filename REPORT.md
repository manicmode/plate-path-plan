# Audit Fixes Implementation Report

## Root Causes and Solutions

### 1. Enrichment on Every Keystroke
**Root Cause**: `ManualFoodEntry.tsx` called `enrichWithFallback()` on every debounced search, causing expensive API calls while typing.

**Fix**: Added `VITE_DISABLE_ENRICHMENT_ON_TYPE=1` flag. When enabled, the component now uses only `submitTextLookup()` for cheap suggestions while typing, limiting results to 5-8 from FDC/OFF sources.

**Files Changed**:
- `src/components/camera/ManualFoodEntry.tsx` (lines 157-185, 214-282)
- `.env` (added flag)

### 2. Cheap-First Suggestions  
**Root Cause**: `foodSearch.ts` was hardcoded to use only `['off']` sources, missing FDC for better coverage.

**Fix**: Added `VITE_CHEAP_FIRST_SUGGESTIONS=1` flag. When enabled, uses `['fdc', 'off']` sources with maxResults capped at 8 for faster suggestions.

**Files Changed**:
- `src/lib/foodSearch.ts` (lines 75-80)

### 3. Manual Selection → Confirm Routing
**Root Cause**: `handleSubmit()` always went through text lookup even when user explicitly selected a candidate, forcing unnecessary "Review Detected Items" flow.

**Fix**: Modified `handleSubmit()` to check for `selectedCandidate`. If present and has sufficient macros, routes directly to Confirm. Only runs enrichment post-selection if macros are insufficient.

**Files Changed**:
- `src/components/camera/ManualFoodEntry.tsx` (lines 465-564)

### 4. Photo Flow Confirm Deadlock
**Root Cause**: `ReviewItemsScreen.tsx` had a 12-second timeout that only showed toast errors but kept spinner running indefinitely.

**Fix**: Added `VITE_CONFIRM_FAIL_OPEN_MS=3000` flag with fail-open logic. After timeout, sets `loaderTimedOut=true` and passes `bypassHydration={true}` to `FoodConfirmationCard` for graceful fallback.

**Files Changed**:
- `src/components/camera/ReviewItemsScreen.tsx` (lines 201-231, 784-819)
- `src/components/FoodConfirmationCard.tsx` (lines 320-336)

### 5. DataSourceChip Crash
**Root Cause**: Missing mappings for various provider keys (OFF, EDAMAMM typos, etc.) and unsafe property access.

**Fix**: Added `normalizeSource()` function with comprehensive alias mapping and safe fallbacks for unknown sources. Added error handling around `sourceBadge()` calls.

**Files Changed**:
- `src/components/ui/data-source-chip.tsx` (lines 6-10, 12-60, 45-50)

## Feature Flags Added

```bash
VITE_DISABLE_ENRICHMENT_ON_TYPE=1    # Stop enrichment while typing
VITE_CHEAP_FIRST_SUGGESTIONS=1       # Use FDC+OFF sources, max 8 results  
VITE_MANUAL_INJECT_GENERIC=0         # Disable generic injection (was ON)
VITE_CONFIRM_FAIL_OPEN_MS=3000      # Timeout for fail-open confirm modal
```

## Trade-offs

- **Reduced accuracy while typing**: Cheap-first suggestions may miss some Nutritionix/Edamam results, but provides faster UX
- **Generic injection disabled**: Reduces synthetic "Generic Chicken" options to avoid confusion in cheap-first mode
- **Fail-open after 3s**: May show incomplete nutrition data, but prevents stuck spinners
- **Wider source support**: DataSourceChip now accepts any string but may show "Unknown" for truly unrecognized sources

## Console Logging Added

- `[SUGGEST][CHEAP_FIRST] count=N sources=[fdc,off]` - Cheap suggestion queries
- `[MANUAL][SELECT] name=... source=...` - Manual candidate selection
- `[ENRICH][POST_SELECT] provider=... took=...ms` - Post-selection enrichment
- `[CONFIRM][FAIL_OPEN] reason=timeout|bypass` - Fail-open triggers

## Acceptance Tests Ready

The implementation is ready for testing with the specified queries:
1. **Manual typing**: "yakisoba", "grilled chicken salad", "hotdog", "california roll"
2. **Photo flow**: 3 detected items → Review → Confirm  
3. **Timeout simulation**: Slow hydration → fail-open at 3s
4. **Smoke test**: Navigation without DataSourceChip crashes

All changes are behind feature flags and maintain backward compatibility.