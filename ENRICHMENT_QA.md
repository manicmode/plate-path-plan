# Food Enrichment QA Test Cases

Test these queries with the enrich-manual-food function:

## Test Queries:
1. **pollo con rajas** - Mexican chicken dish
2. **yakisoba** - Japanese stir-fried noodles  
3. **aloo gobi** - Indian potato cauliflower curry
4. **shakshuka** - Middle Eastern egg dish
5. **club sandwich** - American sandwich

## Expected Results:
- ingredients[] array populated
- per-100g macros + micros
- source chip showing FDC/EDAMAM/NUTRITIONIX/ESTIMATED
- confidence score
- no UI flicker during search
- graceful fallback to existing lookup if enrichment fails

## Test Command:
```bash
# In browser console:
supabase.functions.invoke('enrich-manual-food', { 
  body: { query: 'pollo con rajas', locale: 'auto' } 
}).then(r => console.log(r))
```

## Feature Flag:
Set `localStorage.setItem('FEATURE_ENRICH_MANUAL_FOOD', 'false')` to disable and test fallback.