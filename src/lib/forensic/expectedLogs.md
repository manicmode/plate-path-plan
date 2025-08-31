# Expected Forensic Log Patterns

## Success Pattern (Fixed 30g Issue)

### Boot Evidence
```
[FORENSIC][BUILD] { build: "2025-08-30T18:55Z-forensic", sw: "activated", chunks: "unknown", timestamp: "..." }
```

### Report Mount (Should see V2)
```
[FORENSIC][REPORT][MOUNT] { file: "EnhancedHealthReport.tsx", variant: "v2", build: "2025-08-30T18:55Z-forensic" }
```

### INQ3 Widget (Should NOT skip for 30g)
```
[FORENSIC][INQ3][PROPS] { nutritionPropType: undefined, servingGrams: undefined, portionLabel: undefined }
```
**NOT**: `[FORENSIC][INQ3][WIDGET_SKIP_OVERRIDE] { servingGrams: 30, stack: "..." }`

### Resolver Success
```
[FORENSIC][RESOLVER][FLAGS] { portionOffQP: false, origin: "default", urlParam: null, emergencyKill: false }
[FORENSIC][RESOLVER][INPUT] { hint: undefined, flags: {...}, meta: {...}, norm: {...} }
[FORENSIC][RESOLVER][OUTPUT] { chosen: { source: "label"|"ratio"|"db"|"ocr", grams: ≠30 }, candidates: [...] }
```

### Prefill (Health Report → Camera)
```
[FORENSIC][PREFILL] { hasPrefill: true, hasNorm: true, hasRaw: true }
```
**Assert passes**: No `[FORENSIC][ASSERT] Missing norm/providerRaw in prefill`

### Confirm Payload (Canonical Builder Used)
```
[FORENSIC][CONFIRM][INPUT] { origin: "health-report", hasNorm: true, hasRaw: true, metaBarcode: "..." }
[FORENSIC][CONFIRM][OUTPUT] { portionGrams: ≠30, source: "label"|"ratio", imageKind: "url", imagePreview: "https://..." }
```

### OFF Data Available
```
[FORENSIC][OFF] { barcode: "...", serving_size: "30g", serving_size_g: 30, kcal_100g: "250", kcal_serv: "75" }
```

## Failure Patterns (30g Still Enforced)

### INQ3 Skip (Bad)
```
[FORENSIC][INQ3][WIDGET_SKIP_OVERRIDE] { servingGrams: 30, stack: "Error\n    at NutritionToggle..." }
[PORTION][INQ][WIDGET_SKIP] { reason: "external_override", servingGrams: 30 }
```

### Manual Payload Path (Bad)
```
[FORENSIC][PREFILL][MANUAL_PAYLOAD_PATH_TAKEN] Error
    at handlePrefill (Camera.tsx:240:15)
```

### Missing Prefill Data (Bad)
```
[FORENSIC][ASSERT] Missing norm/providerRaw in prefill { prefill: {...}, hasNorm: false, hasRaw: false, source: "health-report" }
```

### Fallback Portion (Bad if no other candidates)
```
[FORENSIC][RESOLVER][OUTPUT] { chosen: { source: "fallback", grams: 30 }, candidates: [{ source: "fallback", grams: 30, confidence: 0.1 }] }
```

### Data URL Image (Bad for Health Report)
```
[FORENSIC][CONFIRM][OUTPUT] { portionGrams: 30, source: "fallback", imageKind: "data", imagePreview: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..." }
```

## Key Indicators

✅ **Success**: Resolver runs, finds label/ratio candidates, uses provider image
❌ **Failure**: Widget skip, manual payload, assert failure, fallback portion only

## Root Cause Identification

1. **INQ3 External Override** → Look for WIDGET_SKIP_OVERRIDE logs
2. **Thin Prefill** → Look for MANUAL_PAYLOAD_PATH_TAKEN or assert failure
3. **Flag Inconsistency** → Compare RESOLVER FLAGS across components
4. **Stale Bundle** → Compare build IDs and service worker state
5. **Missing OFF Data** → Check FORENSIC OFF logs for empty serving fields