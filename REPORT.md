# Manual Entry Pipeline Audit Fixes

## Summary
Fixed 4 critical issues in the manual entry pipeline to show 5-8 food suggestions instead of just 1, while preserving existing "cheap-first" and "no enrichment while typing" behavior.

## Root Causes & Fixes

### 1. **Pipeline Collapsed to 1 Suggestion**
**Root Cause**: `ManualFoodEntry.tsx` line 807 sliced candidates to show only 3-6 by default with "show more" toggle
**Fix**: Removed slicing logic to display all 6-8 candidates directly
**Files Changed**: 
- `src/components/camera/ManualFoodEntry.tsx` (lines 806-825)

### 2. **V3 Text Lookup Throwing on Partials** 
**Root Cause**: `textLookup.ts` line 88-90 threw error when no candidates found, causing brown toast
**Fix**: Return low-confidence result instead of throwing
**Files Changed**:
- `src/lib/food/textLookup.ts` (lines 88-90)

### 3. **Generic Injection Crowding Real Results**
**Root Cause**: Generic candidates injected at beginning regardless of real result count
**Fix**: Only inject generic when real results < 3, put it last, increase candidate cap to 8
**Files Changed**:
- `src/lib/food/search/getFoodCandidates.ts` (lines 534-602)

### 4. **Render List Logging Added**
**Root Cause**: Missing telemetry for UI render count  
**Fix**: Added consistent logging for rendered candidate count
**Files Changed**:
- `src/components/camera/ManualFoodEntry.tsx` (lines 196, 245)

## Feature Flags Used
- `VITE_DISABLE_ENRICHMENT_ON_TYPE=1` (default on) - No enrichment while typing ✓
- `VITE_CHEAP_FIRST_SUGGESTIONS=1` (default on) - FDC+OFF, max 8 ✓  
- `VITE_MANUAL_INJECT_GENERIC=0` (default off) - Generic injection policy ✓
- `VITE_CONFIRM_FAIL_OPEN_MS=3000` - Fail-open timeout ✓

## Instrumentation Added
- `[CANDIDATES][PIPE]` - Pipeline telemetry with incoming/deduped/capped counts
- `[MANUAL][RENDER_LIST]` - UI render count logging
- `[CANDIDATES][GENERIC_INJECT]` - Generic injection with reason
- `[TEXT][V3]` - Low-confidence return logging

## Testing
Expected console output for acceptance tests:

### Manual typing: "california roll"
```
[SUGGEST][CHEAP_FIRST] count=6, sources=[fdc,off]  
[CANDIDATES][PIPE] incoming=6, after_alias=6, deduped=6, capped=6
[MANUAL][RENDER_LIST] ui_render_count=6
```

### Typing progressively ("ca" → "cal" → "calif...")  
```
[TEXT][V3] low-confidence return count=1
```

### Pick one candidate
```
[MANUAL][SELECT] name=California Roll, source=fdc
[ENRICH][POST_SELECT] provider=USDA took=234ms
```

### Confirm timeout simulation
```
[CONFIRM][FAIL_OPEN] reason=timeout
```

### Generic injection (weak query)
```
[CANDIDATES][GENERIC_INJECT] reason=low-real count=1
```

## Trade-offs
- **Performance**: Slightly more candidates rendered, but eliminates "show more" toggle complexity
- **UX**: Users see more options immediately vs. having to click "show more"  
- **Reliability**: Fail-open behavior prevents stuck spinners but may show incomplete data
- **Scope**: Kept changes minimal and surgical, preserving all existing functionality