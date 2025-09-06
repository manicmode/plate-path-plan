import { chromium } from 'playwright';

const APP_URL = process.env.APP_URL || 'http://localhost:5173/?QA_ENRICH=1';
const QUERIES = ['club sandwich', 'club sandwich on wheat', 'yakisoba', 'aloo gobi', 'pollo con rajas'];

(async () => {
  console.log('🧪 Starting Food Enrichment QA Tests');
  console.log(`📍 Testing URL: ${APP_URL}`);
  
  const browser = await chromium.launch({ headless: false }); // Use headless: true for CI
  const page = await browser.newPage();

  const logs: string[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    if (/\[ENRICH\]|\[CONFIRM\]/.test(text)) {
      logs.push(text);
      console.log(`🔍 ${text}`);
    }
  });

  // Navigate to app with QA flag
  console.log('🚀 Loading app...');
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  
  // Wait for app to initialize
  await page.waitForTimeout(3000);

  // Check if QA component is available
  const hasQARoute = await page.evaluate(() => {
    return window.location.pathname === '/' || window.location.pathname.includes('qa');
  });

  if (hasQARoute) {
    console.log('📝 Navigating to QA route...');
    await page.goto(`${APP_URL.split('?')[0]}/qa?QA_ENRICH=1`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Try to run QA tests via the component
    try {
      await page.click('button:has-text("Run Full QA Test")');
      console.log('🔄 Running QA tests via component...');
      
      // Wait for tests to complete
      await page.waitForTimeout(15000);
    } catch (error) {
      console.log('⚠️ QA component not found, using fallback method');
    }
  }

  // Fallback: Test enrichment directly if available
  const hasEnrichmentHelper = await page.evaluate(() => {
    return typeof (window as any).testEnrichment === 'function';
  });

  if (hasEnrichmentHelper) {
    console.log('🔧 Running enrichment tests via helper...');
    await page.evaluate(async () => {
      try {
        await (window as any).testEnrichment();
      } catch (error) {
        console.error('Test enrichment failed:', error);
      }
    });
  } else {
    console.log('⚠️ No enrichment helper found');
  }

  // Wait for any remaining async operations
  await page.waitForTimeout(5000);

  console.log('\n=== COLLECTED LOGS ===');
  if (logs.length === 0) {
    console.log('❌ No enrichment logs captured');
  } else {
    logs.forEach(log => console.log(log));
  }

  console.log('\n=== QA TEST COMPLETE ===');
  await browser.close();
})().catch(error => {
  console.error('❌ QA script failed:', error);
  process.exit(1);
});