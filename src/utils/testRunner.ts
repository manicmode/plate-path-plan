// Quick test runner to verify smoke tests are working
import { runLoggingSmokeTests } from './smokeTests';
import { supabase } from '@/integrations/supabase/client';

async function runShareCardsIndexTest() {
  try {
    console.log('🧪 Running share_cards unique index + trigger test...');
    const { data, error } = await supabase.functions.invoke('test-share-cards', {
      body: {
        owner_user_id: '8589c22a-00f5-4e42-a197-fe0dbd87a5d8',
        template: 'win_basic',
        size: 'og',
        image_url: 'https://example.com/test.png',
        hash: 'abc123',
        cleanup: true,
      },
    });
    if (error) {
      console.error('❌ test-share-cards error:', error);
    } else {
      console.log('✅ test-share-cards results:', data);
    }
  } catch (e) {
    console.error('❌ test-share-cards failed:', e);
  }
}

// Run tests immediately in development
if (import.meta.env.DEV) {
  console.log('🧪 Running food logging smoke tests...');
  runLoggingSmokeTests()
    .then(() => {
      console.log('✅ Smoke tests completed');
    })
    .catch((error) => {
      console.error('❌ Smoke tests failed:', error);
    });

  // Also run share_cards test
  runShareCardsIndexTest();
}

export { runLoggingSmokeTests, runShareCardsIndexTest };
