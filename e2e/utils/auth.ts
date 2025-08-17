import { Page } from '@playwright/test';

export interface AuthCredentials {
  email: string;
  password: string;
}

/**
 * Sign in a user via direct Supabase client injection
 * More reliable than UI automation for E2E tests
 */
export async function signIn(page: Page, credentials: AuthCredentials): Promise<void> {
  await page.addInitScript(() => {
    // Expose auth helper on window for test use
    (window as any).testSignIn = async (email: string, password: string) => {
      const { supabase } = await import('/src/integrations/supabase/client.ts');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      return data;
    };
  });

  await page.goto('/');
  
  // Execute sign in via injected helper
  await page.evaluate(async ({ email, password }) => {
    await (window as any).testSignIn(email, password);
  }, credentials);

  // Wait for auth state to settle
  await page.waitForTimeout(1000);
}

/**
 * Call a Supabase RPC function from the browser context
 */
export async function rpc(page: Page, name: string, args?: any): Promise<any> {
  return await page.evaluate(async ({ rpcName, rpcArgs }) => {
    const { supabase } = await import('/src/integrations/supabase/client.ts');
    const { data, error } = await supabase.rpc(rpcName, rpcArgs);
    if (error) throw error;
    return data;
  }, { rpcName: name, rpcArgs: args });
}

/**
 * Get the current user's active Arena group ID
 */
export async function getActiveGroupId(page: Page): Promise<string | null> {
  return await rpc(page, 'arena_get_active_group_id');
}

/**
 * Enroll user in Arena and return group ID
 */
export async function enrollInArena(page: Page): Promise<string> {
  return await rpc(page, 'arena_enroll_me');
}

/**
 * Send a chat message in the Arena
 */
export async function sendChatMessage(page: Page, message: string): Promise<void> {
  const chatInput = page.locator('[data-testid="arena-chat-input"], input[placeholder*="message"], textarea[placeholder*="message"]').first();
  await chatInput.fill(message);
  await chatInput.press('Enter');
}

/**
 * Wait for a chat message to appear with specific text
 */
export async function waitForChatMessage(page: Page, messageText: string, timeout = 5000): Promise<void> {
  await page.locator(`text=${messageText}`).first().waitFor({ timeout });
}