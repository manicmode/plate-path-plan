import { test, expect, Page, BrowserContext } from '@playwright/test';
import { signIn, getActiveGroupId, enrollInArena, sendChatMessage, waitForChatMessage } from './utils/auth';
import { TEST_USERS } from '../scripts/e2e-seed';

// Test user credentials
const getUserCredentials = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userAEmail = process.env.E2E_USER_A_EMAIL;
  const userAPassword = process.env.E2E_USER_A_PASSWORD;
  const userBEmail = process.env.E2E_USER_B_EMAIL;
  const userBPassword = process.env.E2E_USER_B_PASSWORD;

  if (serviceRoleKey) {
    return {
      userA: { email: TEST_USERS[0].email, password: TEST_USERS[0].password },
      userB: { email: TEST_USERS[1].email, password: TEST_USERS[1].password }
    };
  } else if (userAEmail && userAPassword && userBEmail && userBPassword) {
    return {
      userA: { email: userAEmail, password: userAPassword },
      userB: { email: userBEmail, password: userBPassword }
    };
  }
  
  return null;
};

test.describe('Arena V2 E2E', () => {
  test.beforeEach(async () => {
    const credentials = getUserCredentials();
    if (!credentials) {
      test.skip(true, 'Missing auth credentials - need SUPABASE_SERVICE_ROLE_KEY or E2E_USER_* env vars');
    }
  });

  test('enrollment joins users to same group', async ({ browser }) => {
    const credentials = getUserCredentials()!;
    
    // Create two separate browser contexts (simulating different users)
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // Set up network request tracking for both pages
    const networkRequestsA: string[] = [];
    const networkRequestsB: string[] = [];
    
    pageA.on('request', req => {
      const url = req.url();
      if (url.includes('/rpc/') || url.includes('/rest/v1/')) {
        networkRequestsA.push(`${req.method()} ${new URL(url).pathname}`);
      }
    });
    
    pageB.on('request', req => {
      const url = req.url();
      if (url.includes('/rpc/') || url.includes('/rest/v1/')) {
        networkRequestsB.push(`${req.method()} ${new URL(url).pathname}`);
      }
    });

    try {
      console.log('🔑 Signing in User A:', credentials.userA.email);
      await signIn(pageA, credentials.userA);
      
      console.log('🔑 Signing in User B:', credentials.userB.email);
      await signIn(pageB, credentials.userB);

      // Navigate both users to Arena page
      await pageA.goto('/game-and-challenge');
      await pageB.goto('/game-and-challenge');

      // Wait for page to load and check header
      await expect(pageA.locator('text=Arena')).toBeVisible({ timeout: 10000 });
      await expect(pageB.locator('text=Arena')).toBeVisible({ timeout: 10000 });

      console.log('✅ Arena header visible on both pages');

      // Take screenshot before enrollment
      await pageA.screenshot({ path: './artifacts/arena/before-enrollment-a.png' });
      await pageB.screenshot({ path: './artifacts/arena/before-enrollment-b.png' });

      // Check if users need to join Arena
      let groupIdA = await getActiveGroupId(pageA);
      let groupIdB = await getActiveGroupId(pageB);

      if (!groupIdA) {
        console.log('📝 User A enrolling in Arena...');
        // Look for Join Arena button and click it
        const joinBtnA = pageA.locator('button:has-text("Join Arena"), button:has-text("Join")').first();
        if (await joinBtnA.isVisible({ timeout: 5000 })) {
          await joinBtnA.click();
          await pageA.waitForTimeout(2000);
        } else {
          // Fallback to direct enrollment
          groupIdA = await enrollInArena(pageA);
        }
        groupIdA = await getActiveGroupId(pageA);
      }

      if (!groupIdB) {
        console.log('📝 User B enrolling in Arena...');
        const joinBtnB = pageB.locator('button:has-text("Join Arena"), button:has-text("Join")').first();
        if (await joinBtnB.isVisible({ timeout: 5000 })) {
          await joinBtnB.click();
          await pageB.waitForTimeout(2000);
        } else {
          groupIdB = await enrollInArena(pageB);
        }
        groupIdB = await getActiveGroupId(pageB);
      }

      console.log(`👥 User A Group ID: ${groupIdA}`);
      console.log(`👥 User B Group ID: ${groupIdB}`);

      // Verify both users are in the same group
      expect(groupIdA).toBeTruthy();
      expect(groupIdB).toBeTruthy();
      expect(groupIdA).toBe(groupIdB);

      console.log('✅ Both users enrolled in same Arena group');

      // Take screenshot after enrollment
      await pageA.screenshot({ path: './artifacts/arena/after-enrollment-a.png' });
      await pageB.screenshot({ path: './artifacts/arena/after-enrollment-b.png' });

      // Verify leaderboard renders
      await expect(pageA.locator('[data-testid="arena-leaderboard"], .leaderboard, text=Leaderboard')).toBeVisible({ timeout: 10000 });
      await expect(pageB.locator('[data-testid="arena-leaderboard"], .leaderboard, text=Leaderboard')).toBeVisible({ timeout: 10000 });

      console.log('✅ Leaderboards visible on both pages');

      // Verify network requests contain no legacy calls
      const allRequests = [...networkRequestsA, ...networkRequestsB];
      const legacyRequests = allRequests.filter(req => 
        req.includes('rank20_') || req.includes('diag_rank20')
      );
      
      expect(legacyRequests).toHaveLength(0);
      
      // Verify expected V2 calls are present
      const expectedCalls = [
        '/rpc/arena_get_active_group_id',
        '/rest/v1/arena_chat_messages'
      ];
      
      expectedCalls.forEach(call => {
        const found = allRequests.some(req => req.includes(call));
        expect(found, `Expected network call ${call} not found`).toBeTruthy();
      });

      console.log('✅ Network proof: No legacy calls, V2 calls present');
      console.log('📊 Network calls made:', allRequests.slice(0, 10)); // Show first 10

    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test('realtime chat works between users', async ({ browser }) => {
    const credentials = getUserCredentials()!;
    
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // Sign in both users
      await signIn(pageA, credentials.userA);
      await signIn(pageB, credentials.userB);

      // Navigate to Arena
      await pageA.goto('/game-and-challenge');
      await pageB.goto('/game-and-challenge');

      // Ensure both are enrolled (should be from previous test, but ensure)
      let groupIdA = await getActiveGroupId(pageA);
      let groupIdB = await getActiveGroupId(pageB);

      if (!groupIdA) {
        groupIdA = await enrollInArena(pageA);
      }
      if (!groupIdB) {
        groupIdB = await enrollInArena(pageB);
      }

      expect(groupIdA).toBe(groupIdB);

      // Wait for chat to load
      await pageA.waitForTimeout(2000);
      await pageB.waitForTimeout(2000);

      // Test A -> B message
      const timestamp = Date.now();
      const messageA = `ping-A-${timestamp}`;
      
      console.log(`💬 User A sending: ${messageA}`);
      
      // Find chat input and send message from A
      const chatInputA = pageA.locator('input[placeholder*="message"], textarea[placeholder*="message"], [data-testid="chat-input"]').first();
      await chatInputA.fill(messageA);
      await chatInputA.press('Enter');

      // Wait for message to appear in A's chat
      await waitForChatMessage(pageA, messageA, 5000);
      console.log('✅ Message appeared in User A chat');

      // Wait for message to appear in B's chat via realtime
      await waitForChatMessage(pageB, messageA, 8000);
      console.log('✅ Message appeared in User B chat via realtime');

      // Test B -> A message
      const messageB = `pong-B-${timestamp}`;
      
      console.log(`💬 User B replying: ${messageB}`);
      
      const chatInputB = pageB.locator('input[placeholder*="message"], textarea[placeholder*="message"], [data-testid="chat-input"]').first();
      await chatInputB.fill(messageB);
      await chatInputB.press('Enter');

      // Wait for B's message to appear in A's chat
      await waitForChatMessage(pageA, messageB, 8000);
      console.log('✅ Reply appeared in User A chat via realtime');

      // Take final screenshots
      await pageA.screenshot({ path: './artifacts/arena/chat-final-a.png' });
      await pageB.screenshot({ path: './artifacts/arena/chat-final-b.png' });

      console.log('✅ Realtime chat test completed successfully');

    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});