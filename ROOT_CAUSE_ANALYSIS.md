# Root Cause Analysis - Health Scan vs Log Flow Discrepancy

## Issue
Health Scan shows "No concerning ingredients" and collapsed ingredient list ("NATURAL FLAVOR" only), while Log flow correctly displays full ingredients and flagged concerns for the same product.

## Field Path Analysis

### Edge Function Response Structure
```
enhanced-health-scanner returns:
{
  product: {
    name: "Trader Joe's Vanilla Almond granola cereal",
    code: "00818148", 
    ingredientsText: "ROLLED OATS, CANE SUGAR, CANOLA OIL, RICE FLOUR...",
    ingredients: ["ROLLED OATS", "CANE SUGAR", "CANOLA OIL", ...],
    health: {
      score: 70,
      flags: [
        { key: "canola_oil", label: "Canola Oil", severity: "warning", description: "Usually made from..." },
        { key: "gluten", label: "Gluten", severity: "warning", description: "Protein found in wheat..." }
      ]
    }
  }
}
```

### Log Flow (Working)
1. `enhanced-health-scanner` → normalized product data
2. Built-in adapter maps to `RecognizedFood` schema  
3. Confirm Food Modal consumes: `{ healthFlags, ingredientsText, healthScore }`
4. **Result**: Shows "2 Concerning Ingredients" + full ingredient list

### Health Scan Flow (Broken → Fixed)  
1. `enhanced-health-scanner` → same normalized product data
2. **ISSUE**: Used `toLegacyFromEdge()` but mapped fields incorrectly:
   - `flag.label` → `ingredient` field (wrong - shows "Canola Oil" as ingredient name)
   - Should be `flag.key` processed → ingredient name ("canola_oil" → "Canola Oil")
3. Health Report Modal expected different schema than provided
4. **Result**: Lost flags, collapsed ingredients

## Root Causes Identified

### 1. Incorrect Flag Mapping
```typescript
// BEFORE (incorrect)
ingredientFlags: legacy.healthFlags.map((flag) => ({
  ingredient: flag.label,  // "Canola Oil" - this is the flag name, not ingredient
  flag: flag.description || flag.label,
  severity: ...
}))

// AFTER (fixed)  
ingredientFlags: legacy.healthFlags.map((flag) => {
  const ingredientName = flag.key.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ') || flag.label;  // "canola_oil" → "Canola Oil" 
  
  return {
    ingredient: ingredientName,  // Actual ingredient name
    flag: flag.description || flag.label || '',  // Flag description
    severity: flag.severity === 'danger' ? 'high' : flag.severity === 'warning' ? 'medium' : 'low'
  };
})
```

### 2. Missing Telemetry
No visibility into edge → legacy → UI transformation pipeline made debugging impossible.

### 3. Schema Mismatch
Health Report expected `ingredientFlags` with specific structure, but mapping didn't match Log flow's successful pattern.

## Fix Implementation

### 1. Added Comprehensive Telemetry
```typescript
console.group('[HS] edge_payload');
console.log('product.name', data.product?.name);
console.log('ingredientsText', data.product?.ingredientsText);  
console.log('flags len', data.product?.health?.flags?.length);
console.groupEnd();

console.group('[HS] legacy_payload');  
console.log('ingredientsText', legacy.ingredientsText?.slice(0,200));
console.log('flags len', legacy.healthFlags?.length);
console.groupEnd();
```

### 2. Unified Mapping Logic
Both Log flow and Health Scan now use identical `toLegacyFromEdge()` adapter with consistent field precedence.

### 3. Guard Rails Added
```typescript
if (legacy.ingredientsText && legacy.healthFlags.length > 0) {
  // Warn if flags get lost in mapping
}
if (data.product?.ingredients?.length > 3 && legacy.ingredientsText?.split(',').length === 1) {
  console.warn('[HS] BUG: ingredients collapsed');
}
```

### 4. Correct Ingredient Name Extraction  
Transform flag keys to proper names: `"canola_oil"` → `"Canola Oil"`

## Expected Outcome
Health Scan will now display:
- Same flagged ingredients as Log flow ("Canola Oil", "Gluten")  
- Full ingredient list instead of single token
- Consistent severity levels and descriptions
- Detailed console logs for future debugging

## Verification
Test with "Trader Joe's Vanilla Almond granola cereal" barcode `00818148`:
- ✅ Health Report should show flagged ingredients matching Confirm Food Log
- ✅ Console should show `[HS] edge_payload` and `[HS] legacy_payload` with flags len >= 1
- ✅ Ingredient list should not collapse to "NATURAL FLAVOR" only