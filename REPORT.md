# Manual Entry Collapse Fix - Implementation Report

## Root Cause Summary

- **Fixed**: Manual typing suggestions collapsed because `maxPerFamily: 1` was applied universally, reducing same-class candidates (e.g., multiple "california roll" variants) to a single item
- **Fixed**: Brand interleave logic limited candidates to 2 brands max, further reducing variety for manual entry
- **Fixed**: UI processed candidates but didn't consistently consume the full list returned by V3 pipeline

## Implementation Changes

### 1. Relaxed Diversity Cap for Manual Source

**File**: `src/lib/food/textLookup.ts` (lines 73-89)
- Added conditional logic to use `MAX_PER_FAMILY_MANUAL` (default 6) for manual input only
- Keep `maxPerFamily: 1` for photo/voice flows (unchanged)
- Added telemetry: `[CANDIDATES][DIVERSITY]` log

### 2. Configurable Brand Interleaving

**File**: `src/lib/food/search/getFoodCandidates.ts` (lines 78-87, 510-525)
- Extended `CandidateOpts` interface with `disableBrandInterleave` and `allowMoreBrands` options
- For manual typing: disable brand interleave, allow more brands (no artificial limit)
- For other sources: keep existing behavior (generics first, max 2-4 brands)
- Added telemetry: `[CANDIDATES][OPTIONS]`, `[CANDIDATES][INTERLEAVE]`

### 3. Enhanced Pipeline Instrumentation

**File**: `src/lib/food/search/getFoodCandidates.ts` (lines 368, 525-547, 551-554)
- Added comprehensive logging at each stage:
  - `[CANDIDATES][DIVERSITY_FILTER][BEFORE]` and `[CANDIDATES][DIVERSITY_FILTER][AFTER]`
  - `[CANDIDATES][CAP]` for final 8-item limit
  - `[CANDIDATES][GENERIC_FALLBACK]` for optional generic injection

### 4. UI Consumes Full Candidate List

**File**: `src/components/camera/ManualFoodEntry.tsx` (lines 189-214, 242-262, 272-307)
- Updated to use full set precedence: `rankedAll` → `results` → `items` → `rankedTop3`
- Enhanced deduplication using stable key: `source|id|name|brand`
- Added telemetry: `[TRACE] UI receive`, `[CANDIDATES][PROCESS_START]`, `[CANDIDATES][DEDUP_COMPLETE]`
- Removed any remaining references to `primary/__altCandidates` pattern

### 5. Optional Generic Fallback

**File**: `src/lib/food/search/getFoodCandidates.ts` (lines 556-574)
- Added guarded generic injection when `VITE_MANUAL_INJECT_GENERIC=1`
- Only activates for manual typing with query length ≥ 3 and zero results
- Creates contextual generic candidate based on query

## Verification Console Logs

### Expected Logs for "california roll":

```
[CANDIDATES][DIVERSITY] source=manual, maxPerFamily=6
[CANDIDATES][OPTIONS] source=manual, disableBrandInterleave=true, allowMoreBrands=true
[CANDIDATES][INTERLEAVE] beforeReorder=8, afterReorder=8, disabled=true
[CANDIDATES][DIVERSITY_FILTER][BEFORE] maxPerFamily=6, count=8
[CANDIDATES][DIVERSITY_FILTER][AFTER] afterFilter=6-8
[CANDIDATES][CAP] capReason=final_8_limit, capCount=6-8
[TRACE] UI receive itemsCount=6-8, rankedAllCount=6-8
[CANDIDATES][PROCESS_START] sourceCount=6-8
[CANDIDATES][DEDUP_COMPLETE] beforeDedup=6-8, afterDedup=6-8
[MANUAL][RENDER_LIST] ui_render_count=6-8
```

### UI Behavior:
- **Before**: 1 suggestion shown while typing
- **After**: 5-8 suggestions shown while typing, no collapse
- **Unchanged**: No enrichment during typing (VITE_DISABLE_ENRICHMENT_ON_TYPE=1)
- **Unchanged**: Photo/voice flows use maxPerFamily=1 (exact same behavior)

## Risk Assessment

- **Low Risk**: Changes are behind feature flags and conditional on `source === 'manual'`
- **Isolated**: Photo/voice flows maintain existing behavior exactly
- **Backward Compatible**: Falls back gracefully if no candidates found
- **Performance**: No additional API calls, only relaxes existing filters

## Acceptance Checklist

Test queries in Preview console:
- [ ] "california roll" → shows 5-8 options, logs show diversity=6, interleave disabled
- [ ] "grilled chicken salad" → shows 5-8 options, no collapse to single item  
- [ ] "hotdog" → shows multiple options, no enrichment while typing
- [ ] Photo flow → still passes maxPerFamily=1, behaves identically
- [ ] Confirm flow → unchanged, goes straight to confirm after selection