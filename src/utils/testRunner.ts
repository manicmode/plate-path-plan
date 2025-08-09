// Quick test runner to verify smoke tests are working
import { runLoggingSmokeTests } from './smokeTests';
import { supabase } from '@/integrations/supabase/client';

async function runShareCardsIndexTest() {
  try {
    console.log('🧪 Running share_cards unique index + trigger test...');

    // Ensure user is signed in before invoking the function
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      console.warn('⚠️ Skipping test-share-cards: no authenticated user in DEV. Please sign in and refresh.');
      return;
    }

    const { data, error } = await supabase.functions.invoke('test-share-cards', {
      headers: {
        'x-test-secret': 'dev-test-secret', // Must match TEST_FN_SECRET set in Supabase Edge Function secrets
      },
      body: {
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
