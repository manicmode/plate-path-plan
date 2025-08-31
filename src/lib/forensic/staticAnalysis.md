# Static Code Analysis Results - 30g Portion Enforcement

## Search Pattern: `servingGramsProp|portionLabelProp|nutritionPropType`
Found 1 match:
- `src/components/health-check/NutritionToggle.tsx:58` - Only our new forensic logging

## Search Pattern: `servingGrams:\s*\d+|portionLabel:\s*["']\d+g`
Found 0 matches - No hardcoded serving gram assignments

## Search Pattern: `portionOffQP|external_override|WIDGET_SKIP`
Found 16 matches across 5 files:
- `EnhancedHealthReport.tsx:288` - Feature flag checking
- `NutritionToggle.tsx:75` - Our new forensic logging and skip logic
- `confirmPayload.ts:71,81,231` - getBestPortionGrams flag handling
- `portionDetectionSafe.ts:26,363` - Feature flag definitions and checking
- `portionResolver.ts:272,278,296,299,327,328,444` - Main resolver flag handling

## Search Pattern: `navigate.*camera.*state.*logPrefill`
Found 1 match:
- `EnhancedHealthReport.tsx:622` - Health Report → Camera navigation with logPrefill

## Search Pattern: `__emergencyPortionsDisabled|__emergencyKill`
Found 6 matches across 3 files:
- `EnhancedHealthReport.tsx:289` - Emergency kill check in feature gate diagnostics
- `portionDetectionSafe.test.ts:17,89` - Test setup for emergency kill switch
- `portionDetectionSafe.ts:41,49,364` - Emergency kill switch implementation and usage

## Search Pattern: `NutritionToggle\(`
Found 0 matches - No explicit NutritionToggle component calls found

## Key Findings:
1. **No hardcoded 30g assignments** - No explicit `servingGrams: 30` found in props
2. **Emergency kill switches exist** - Multiple levels of override available
3. **Health Report → Camera navigation found** - Uses logPrefill in state
4. **Flag system is comprehensive** - portionOffQP, emergencyKill, URL params all handled
5. **NutritionToggle has external override logic** - Can bypass resolver entirely
6. **Multiple resolver call sites** - Different components may use different flags

## Critical Areas to Watch:
- `EnhancedHealthReport.tsx:622` - Report→Camera navigation (prefill source)
- `NutritionToggle.tsx:75` - Widget skip logic with external override
- `portionResolver.ts:296` - Emergency fallback with 30g hardcode
- `confirmPayload.ts:231` - Canonical builder flag usage

## Potential Root Causes:
1. **Thin prefill without norm/providerRaw** - Camera fallback to manual payload
2. **NutritionToggle external override** - Widget skips resolver for any servingGrams
3. **Flag inconsistency** - Different components may use different flag states
4. **30g hardcode in emergency fallback** - Always returns 30g when portionOff=1