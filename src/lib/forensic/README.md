# Forensic Investigation: 30g Portion Enforcement

## Overview
This forensic investigation package instruments the codebase to identify the root cause of persistent 30g portion display in V2 Health Reports and Report→Log flows.

## Build Tag
- **ID**: `2025-08-30T18:55Z-forensic`  
- **Purpose**: Track which version of instrumented code is running

## Instrumentation Added

### 1. App Boot Logging
- **File**: `App.tsx`
- **Log**: `[FORENSIC][BUILD]` - Build ID, service worker state, loaded chunks
- **Purpose**: Verify correct bundle is running

### 2. Mount Logging
- **V1 Report**: `HealthCheckModal.tsx` logs `[FORENSIC][REPORT][MOUNT]` with variant 'v1'
- **V2 Report**: `EnhancedHealthReport.tsx` logs `[FORENSIC][REPORT][MOUNT]` with variant 'v2'
- **Purpose**: Identify which report version is actually rendering

### 3. INQ3 Widget Props & Tripwire
- **File**: `NutritionToggle.tsx`
- **Log**: `[FORENSIC][INQ3][PROPS]` - Captures all incoming props
- **Log**: `[FORENSIC][INQ3][WIDGET_SKIP_OVERRIDE]` - When external override bypasses resolver
- **Tripwire**: Ignores exactly 30g external hints to force resolver to run

### 4. Portion Resolver Inputs/Outputs
- **File**: `portionResolver.ts`
- **Log**: `[FORENSIC][RESOLVER][FLAGS]` - Flag sources (url-param vs default)
- **Log**: `[FORENSIC][RESOLVER][INPUT]` - All resolver inputs (hint, flags, meta, norm)
- **Log**: `[FORENSIC][RESOLVER][OUTPUT]` - Chosen portion and all candidates
- **Purpose**: Track resolver decision-making process

### 5. Confirm Payload Builder
- **File**: `confirmPayload.ts`
- **Log**: `[FORENSIC][CONFIRM][INPUT]` - Builder inputs (norm, raw, origin)
- **Log**: `[FORENSIC][CONFIRM][OUTPUT]` - Final portion, source, image type
- **Log**: `[FORENSIC][OFF]` - OFF serving fields and nutrition data
- **Purpose**: Track canonical vs manual payload construction

### 6. Camera Prefill & Assertion
- **File**: `Camera.tsx`
- **Log**: `[FORENSIC][PREFILL]` - Prefill detection (hasNorm, hasRaw)
- **Assert**: `[FORENSIC][ASSERT]` - Ensures norm/providerRaw exists in prefill
- **Log**: `[FORENSIC][PREFILL][MANUAL_PAYLOAD_PATH_TAKEN]` - When bypassing canonical builder
- **Purpose**: Track report→camera data flow

## Expected Success Logs

After implementing fixes, you should see:

```
[PORTION][CHOSEN] { grams: <≠30>, source: 'label'|'ratio'|'db'|'ocr', barcode: '…' }
[CONFIRM][IMAGE] true https://… (data: only for photo scans)
```

And NOT see:
```
[PORTION][INQ][WIDGET_SKIP] { reason:"external_override", servingGrams: 30 }
```

## Static Analysis Summary

Key files identified for root cause:
- `EnhancedHealthReport.tsx:622` - Report→Camera navigation  
- `NutritionToggle.tsx:75` - Widget external override logic
- `Camera.tsx:232-240` - Prefill payload construction
- `confirmPayload.ts:231` - Canonical builder usage

## Usage

1. Run the app with instrumented code
2. Reproduce the 30g issue via:
   - Barcode → Report (V2)
   - Photo → Report (V2) 
   - Report → Log Food flow
3. Check console for `[FORENSIC]` tags
4. Compare logs against expected patterns in `expectedLogs.md`
5. Use logs to pinpoint exact failure location

## Key Diagnostics

- **Build verification**: `[FORENSIC][BUILD]`
- **Report version**: `[FORENSIC][REPORT][MOUNT]`
- **Widget behavior**: `[FORENSIC][INQ3][PROPS|WIDGET_SKIP_OVERRIDE]`
- **Resolver truth**: `[FORENSIC][RESOLVER][FLAGS|INPUT|OUTPUT]`
- **Prefill integrity**: `[FORENSIC][PREFILL]` + assert
- **Payload construction**: `[FORENSIC][CONFIRM][INPUT|OUTPUT]`
- **OFF data presence**: `[FORENSIC][OFF]`