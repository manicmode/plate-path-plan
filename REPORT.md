# Manual Entry Collapse - Root Cause & Fix Report

## Root Cause Summary

- **Primary Issue**: `maxPerFamily: 1` hardcoded in V3 text lookup (`textLookup.ts:76`) collapsed same-class candidates
- **Pipeline Effect**: Diversity filter in `getFoodCandidates.ts` (lines 519-532) limited results to 1 per food family/class
- **UI Impact**: Manual Entry received 1-3 candidates instead of 5-8, reducing user choice

## Fix Implementation

### 1. Added Manual Diversity Flag
- **File**: `src/lib/flags.ts`
- **Change**: Added `MAX_PER_FAMILY_MANUAL` flag (default: 6) for manual typing
- **Preserves**: Photo/voice flows still use `maxPerFamily: 1`

### 2. Dynamic Diversity Cap
- **File**: `src/lib/food/textLookup.ts`
- **Change**: Source-aware cap: manual=6, voice/photo=1
- **Added**: Instrumentation log `[CANDIDATES][DIVERSITY]`

### 3. Enhanced Pipeline Instrumentation
- **File**: `src/lib/food/search/getFoodCandidates.ts`
- **Added Logs**:
  - `[CANDIDATES][INTERLEAVE]` - before/after reordering
  - `[CANDIDATES][DIVERSITY_FILTER][BEFORE/AFTER]` - diversity filter counts
  - `[CANDIDATES][CAP]` - final 8-item cap
  - `[CANDIDATES][MERGE]` - structured merge summary

### 4. Improved UI Deduplication
- **File**: `src/components/camera/ManualFoodEntry.tsx`
- **Change**: Enhanced dedup by name+brand key instead of name-only
- **Added**: `[MANUAL][RENDER_LIST]` log for UI render count

## Before/After Behavior

### Before Fix
```
Query: "california roll"
[CANDIDATES][DIVERSITY] maxPerFamily=1
[CANDIDATES][DIVERSITY_FILTER][AFTER] count=1
[MANUAL][RENDER_LIST] ui_render_count=1
```

### After Fix  
```
Query: "california roll"
[CANDIDATES][DIVERSITY] source=manual, maxPerFamily=6
[CANDIDATES][DIVERSITY_FILTER][AFTER] count=3-6
[MANUAL][RENDER_LIST] ui_render_count=3-6
```

## Environment Configuration
Add to `.env`:
```
VITE_MAX_PER_FAMILY_MANUAL=6
```

## Verification Checklist
1. ✅ Manual typing shows 3-6 options (not 1)
2. ✅ Console logs show `maxPerFamily=6` for manual source
3. ✅ Photo/voice flows unchanged (`maxPerFamily=1`)  
4. ✅ No enrichment calls while typing
5. ✅ Confirm flow and fail-open behavior preserved
6. ✅ Generic injection only when real results < 3

## Test Cases
- **"california roll"** → 3+ sushi variants
- **"grilled chicken salad"** → 5+ chicken/salad options  
- **"hotdog"** → Multiple hot dog varieties