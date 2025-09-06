// Manual enrichment testing script
// Run this in browser console at /?QA_ENRICH=1

const testQueries = [
  'club sandwich',
  'club sandwich on wheat', 
  'yakisoba',
  'aloo gobi',
  'pollo con rajas'
];

async function runQATests() {
  console.log('🧪 Starting manual QA tests...');
  
  // Enable feature flag
  try {
    localStorage.setItem('FEATURE_ENRICH_MANUAL_FOOD', 'true');
    console.log('[QA] Feature flag enabled');
  } catch (e) {
    console.error('[QA] Failed to set feature flag:', e);
  }
  
  const results = [];
  
  for (const query of testQueries) {
    console.log(`\n🔍 Testing: "${query}"`);
    
    try {
      // Use fetch to call the edge function directly
      const response = await fetch('https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/enrich-manual-food', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b2lpaWpxdGFob2hmYWZxaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTE2MzgsImV4cCI6MjA2Njk2NzYzOH0.Ny_Gxbhus7pNm0OHipRBfaFLNeK_ZSePfbj8no4SVGw`
        },
        body: JSON.stringify({ query })
      });
      
      if (response.ok) {
        const data = await response.json();
        const result = {
          query,
          source: data.source,
          confidence: data.confidence,
          ingredients_len: data.ingredients?.length || 0,
          perServing_grams: data.perServing?.serving_grams,
          status: 'success'
        };
        
        results.push(result);
        console.log(`✅ ${query}:`, result);
      } else {
        const error = await response.text();
        console.error(`❌ ${query}: HTTP ${response.status} - ${error}`);
        results.push({ query, status: 'error', error: `HTTP ${response.status}` });
      }
    } catch (error) {
      console.error(`❌ ${query}: ${error.message}`);
      results.push({ query, status: 'error', error: error.message });
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 RESULTS SUMMARY:');
  console.table(results);
  
  return results;
}

// Run the tests
runQATests().then(results => {
  console.log('\n🎯 QA TEST COMPLETE');
  window.qaResults = results;
});