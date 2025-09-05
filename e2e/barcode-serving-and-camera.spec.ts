import { test, expect, Page } from '@playwright/test';

interface NetworkRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  postData?: string;
}

interface ConsoleLog {
  timestamp: string;
  type: string;
  text: string;
  args: any[];
}

// Helper to capture console logs
async function setupConsoleCapture(page: Page): Promise<ConsoleLog[]> {
  const logs: ConsoleLog[] = [];
  
  page.on('console', msg => {
    logs.push({
      timestamp: new Date().toISOString(),
      type: msg.type(),
      text: msg.text(),
      args: msg.args().map(arg => arg.toString())
    });
  });
  
  return logs;
}

// Helper to capture network requests
async function setupNetworkCapture(page: Page): Promise<NetworkRequest[]> {
  const requests: NetworkRequest[] = [];
  
  page.on('request', request => {
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(request.headers())) {
      headers[key] = value;
    }
    
    requests.push({
      url: request.url(),
      method: request.method(),
      headers,
      postData: request.postData() || undefined
    });
  });
  
  return requests;
}

// Helper to save artifacts
async function saveArtifacts(
  mode: string,
  consoleLogs: ConsoleLog[],
  networkRequests: NetworkRequest[],
  page: Page
) {
  // Save console logs
  await page.context().addCookies([]);
  const consoleArtifact = JSON.stringify(consoleLogs, null, 2);
  require('fs').writeFileSync(`artifacts/console.${mode}.json`, consoleArtifact);
  
  // Save network requests
  const networkArtifact = JSON.stringify(networkRequests, null, 2);
  require('fs').writeFileSync(`artifacts/network.${mode}.json`, networkArtifact);
}

const TEST_MODES = [
  { mode: 'A', flag: '1', description: 'VITE_BARCODE_V2=1' },
  { mode: 'B', flag: '0', description: 'VITE_BARCODE_V2=0' }
];

for (const { mode, flag, description } of TEST_MODES) {
  test.describe(`Barcode Serving Label & Camera Teardown - Mode ${mode} (${description})`, () => {
    let consoleLogs: ConsoleLog[];
    let networkRequests: NetworkRequest[];

    test.beforeEach(async ({ page }) => {
      // Set up environment variable via localStorage or direct injection
      await page.addInitScript((flagValue) => {
        (window as any).__VITE_BARCODE_V2 = flagValue;
        // Override import.meta.env for testing
        Object.defineProperty(window, 'import', {
          value: {
            meta: {
              env: { VITE_BARCODE_V2: flagValue }
            }
          }
        });
      }, flag);

      // Setup monitoring
      consoleLogs = await setupConsoleCapture(page);
      networkRequests = await setupNetworkCapture(page);

      // Navigate to camera with E2E flag
      await page.goto('/camera?e2e=1');
      await page.waitForLoadState('networkidle');
    });

    test.afterEach(async ({ page }) => {
      // Create artifacts directory if it doesn't exist
      const fs = require('fs');
      if (!fs.existsSync('artifacts')) {
        fs.mkdirSync('artifacts');
      }
      if (!fs.existsSync('artifacts/screenshots')) {
        fs.mkdirSync('artifacts/screenshots');
      }
      if (!fs.existsSync(`artifacts/screenshots/${mode}`)) {
        fs.mkdirSync(`artifacts/screenshots/${mode}`);
      }

      // Save artifacts
      await saveArtifacts(mode, consoleLogs, networkRequests, page);
    });

    test('Manual barcode entry - serving label test', async ({ page }) => {
      // Test UPC-A barcode
      await test.step('Test UPC-A: 012345678905', async () => {
        // Open manual barcode entry
        await page.click('[data-testid="manual-barcode-button"]').catch(() => {
          // Fallback: look for text containing "Manual"
          page.click('text=Manual').catch(() => {
            // Try generic button approach
            page.click('button:has-text("Entry")');
          });
        });

        // Enter barcode
        await page.fill('input[type="text"]', '012345678905');
        await page.click('button:has-text("Search")');
        await page.waitForTimeout(3000); // Wait for function call

        // Check if confirmation modal opened
        const confirmationVisible = await page.locator('[data-testid="food-confirmation-modal"], .dialog-content').isVisible().catch(() => false);
        
        if (confirmationVisible) {
          // Capture serving label
          const servingLabel = await page.locator('text*="Per serving", text*="Per portion"').textContent().catch(() => 'Not found');
          console.log(`[${mode}] UPC-A Serving label:`, servingLabel);

          // Screenshot the confirmation card
          await page.screenshot({ path: `artifacts/screenshots/${mode}/upc-a-confirmation.png` });
        }

        // Look for network calls to enhanced-health-scanner
        const healthScannerCalls = networkRequests.filter(req => 
          req.url.includes('enhanced-health-scanner') && req.method === 'POST'
        );

        expect(healthScannerCalls.length).toBeGreaterThan(0);
      });

      // Test EAN-13 barcode
      await test.step('Test EAN-13: 4006381333931', async () => {
        // Reset if needed
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Open manual barcode entry again
        await page.click('[data-testid="manual-barcode-button"]').catch(() => {
          page.click('text=Manual').catch(() => {
            page.click('button:has-text("Entry")');
          });
        });

        await page.fill('input[type="text"]', '4006381333931');
        await page.click('button:has-text("Search")');
        await page.waitForTimeout(3000);

        // Check confirmation modal and capture serving label
        const confirmationVisible = await page.locator('[data-testid="food-confirmation-modal"], .dialog-content').isVisible().catch(() => false);
        
        if (confirmationVisible) {
          const servingLabel = await page.locator('text*="Per serving", text*="Per portion"').textContent().catch(() => 'Not found');
          console.log(`[${mode}] EAN-13 Serving label:`, servingLabel);

          await page.screenshot({ path: `artifacts/screenshots/${mode}/ean-13-confirmation.png` });
        }
      });
    });

    test('Live scan - serving label test', async ({ page }) => {
      // Open scanner modal
      await page.click('[data-testid="barcode-scanner-button"]').catch(() => {
        page.click('text=Scan').catch(() => {
          page.click('button:has-text("Barcode")');
        });
      });

      await page.waitForTimeout(1000);

      // Check if video element is present (camera permission might be denied in headless)
      const hasVideo = await page.locator('video').isVisible().catch(() => false);
      
      if (!hasVideo) {
        // Use test hook for headless environment
        await page.evaluate(() => {
          if ((window as any).__appTestHooks?.handleBarcodeDetected) {
            (window as any).__appTestHooks.handleBarcodeDetected('012345678905');
          }
        });
      }

      await page.waitForTimeout(3000);

      // Check if confirmation opened
      const confirmationVisible = await page.locator('[data-testid="food-confirmation-modal"], .dialog-content').isVisible().catch(() => false);
      
      if (confirmationVisible) {
        const servingLabel = await page.locator('text*="Per serving", text*="Per portion"').textContent().catch(() => 'Not found');
        console.log(`[${mode}] Live scan serving label:`, servingLabel);

        await page.screenshot({ path: `artifacts/screenshots/${mode}/live-scan-confirmation.png` });
      }
    });

    test('Camera teardown test', async ({ page }) => {
      // Open scanner modal
      await page.click('[data-testid="barcode-scanner-button"]').catch(() => {
        page.click('text=Scan').catch(() => {
          page.click('button:has-text("Barcode")');
        });
      });

      // Screenshot before close
      await page.screenshot({ path: `artifacts/screenshots/${mode}/scanner-before-close.png` });

      // Wait for video to potentially start
      await page.waitForTimeout(1000);

      // Check for video elements
      const videosBeforeClose = await page.locator('video').count();
      console.log(`[${mode}] Videos before close:`, videosBeforeClose);

      // Close scanner modal
      await page.keyboard.press('Escape');
      // Or try clicking close button
      await page.click('[aria-label="Close"], button:has-text("Cancel")').catch(() => {});

      // Wait a moment for cleanup
      await page.waitForTimeout(1000);

      // Screenshot after close  
      await page.screenshot({ path: `artifacts/screenshots/${mode}/scanner-after-close.png` });

      // Check for video elements after close
      const videosAfterClose = await page.locator('video').count();
      console.log(`[${mode}] Videos after close:`, videosAfterClose);

      // Repeat the open/close cycle
      for (let i = 0; i < 2; i++) {
        await page.click('[data-testid="barcode-scanner-button"]').catch(() => {
          page.click('text=Scan').catch(() => {
            page.click('button:has-text("Barcode")');
          });
        });
        
        await page.waitForTimeout(500);
        
        await page.keyboard.press('Escape');
        await page.click('[aria-label="Close"], button:has-text("Cancel")').catch(() => {});
        
        await page.waitForTimeout(500);
      }

      // Navigate away to test cleanup on route change
      await page.goto('/');
      await page.waitForTimeout(1000);

      // Check for [CAMERA][STOP] logs
      const stopLogs = consoleLogs.filter(log => 
        log.text.includes('[CAMERA][STOP]') || log.text.includes('[SCANNER][UNMOUNT]')
      );
      
      expect(stopLogs.length).toBeGreaterThan(0);
      console.log(`[${mode}] Found ${stopLogs.length} camera stop logs`);
    });
  });
}