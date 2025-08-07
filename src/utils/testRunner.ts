// Quick test runner to verify smoke tests are working
import { runLoggingSmokeTests } from './smokeTests';

// Run tests immediately in development
if (import.meta.env.DEV) {
  console.log('🧪 Running food logging smoke tests...');
  runLoggingSmokeTests().then(() => {
    console.log('✅ Smoke tests completed');
  }).catch((error) => {
    console.error('❌ Smoke tests failed:', error);
  });
}

export { runLoggingSmokeTests };