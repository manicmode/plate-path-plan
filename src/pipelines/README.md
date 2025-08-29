# Pipeline Isolation System

This directory contains isolated, independent pipelines for different analysis modes. All flags are OFF by default for dark-ship deployment.

## Current Status
- ✅ **Barcode Pipeline**: Working implementation extracted from current flow
- ✅ **Manual Pipeline**: Working implementation extracted from current flow  
- ✅ **Voice Pipeline**: Working implementation extracted from current flow
- ⚠️ **Photo Pipeline**: Stub only (not extracted yet)

## Feature Flags (ALL OFF by default)

```env
# Master kill switch - must be true to enable any isolation
VITE_PIPELINE_ISOLATION=false

# Individual pipeline flags (require master flag to be true)
VITE_BARCODE_ISOLATED=false
VITE_MANUAL_ISOLATED=false
VITE_VOICE_ISOLATED=false
VITE_PHOTO_ISOLATED=false
```

## Safe Dev Testing (2-minute verification)

To test barcode isolation in dev only:

1. Create `.env.local`:
```env
VITE_PIPELINE_ISOLATION=true
VITE_BARCODE_ISOLATED=true
```

2. Wire one line in your modal/scanner component:
```tsx
{FF.PIPELINE_ISOLATION 
  ? <PipelineRouter mode="barcode"><BarcodeScanner /></PipelineRouter>
  : <BarcodeScanner />
}
```

3. Test:
- Known barcode → report (same as before)
- Unknown barcode → toast → manual (same as before)
- Manual/voice flows → unaffected

4. Instant rollback: Set `VITE_PIPELINE_ISOLATION=false`

## Architecture

- **Zero cross-imports**: Pipelines cannot import from each other
- **Contract-based**: All return `{ ok: true, report } | { ok: false, reason }`
- **Pure functions**: No side effects, only data transformation
- **Smoke tests**: Each pipeline has `__smokeTest()` for health checks

## Contract Tests

Run in dev console:
```js
import { runPipelineContracts } from '@/pipelines/contractTests'
runPipelineContracts() // Shows { skipped: true } when flags OFF
```

When isolation is enabled, shows health of each pipeline.

## Next Steps

1. Prove barcode works in isolation (dev only)
2. Extract photo pipeline when ready (total isolation from others)
3. Gradually enable other pipelines as needed
4. Keep production flags OFF until explicit approval