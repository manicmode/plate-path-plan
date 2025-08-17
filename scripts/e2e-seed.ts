#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uzoiiijqtahohfafqirm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const E2E_USER_A_EMAIL = process.env.E2E_USER_A_EMAIL;
const E2E_USER_A_PASSWORD = process.env.E2E_USER_A_PASSWORD;
const E2E_USER_B_EMAIL = process.env.E2E_USER_B_EMAIL;
const E2E_USER_B_PASSWORD = process.env.E2E_USER_B_PASSWORD;

// Test user credentials
const TEST_USERS = [
  { email: 'arena-e2e-a@example.com', password: 'Password123!' },
  { email: 'arena-e2e-b@example.com', password: 'Password123!' }
];

async function seedUsers() {
  console.log('🌱 Starting E2E user seeding...');

  if (SUPABASE_SERVICE_ROLE_KEY) {
    console.log('✅ Using SUPABASE_SERVICE_ROLE_KEY for user creation');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    for (const user of TEST_USERS) {
      try {
        // Create or get existing user
        const { data, error } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true
        });

        if (error && !error.message.includes('already been registered')) {
          console.error(`❌ Failed to create ${user.email}:`, error.message);
          continue;
        }

        console.log(`✅ User ready: ${user.email}`);
      } catch (err) {
        console.error(`❌ Error with ${user.email}:`, err);
      }
    }

    console.log('✅ Test users seeded successfully');
    console.log(`📧 User A: ${TEST_USERS[0].email}`);
    console.log(`📧 User B: ${TEST_USERS[1].email}`);
    
  } else if (E2E_USER_A_EMAIL && E2E_USER_A_PASSWORD && E2E_USER_B_EMAIL && E2E_USER_B_PASSWORD) {
    console.log('✅ Using provided E2E_USER_* credentials');
    console.log(`📧 User A: ${E2E_USER_A_EMAIL}`);
    console.log(`📧 User B: ${E2E_USER_B_EMAIL}`);
    
  } else {
    console.log('⚠️  SKIP: Missing both SUPABASE_SERVICE_ROLE_KEY and E2E_USER_* credentials');
    console.log('   E2E tests will auto-skip with clear message');
    process.exit(0);
  }
}

if (import.meta.main) {
  seedUsers().catch(console.error);
}

export { TEST_USERS };