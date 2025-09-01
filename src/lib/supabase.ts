// src/lib/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const g = globalThis as any;

// Enforce hard singleton to prevent multiple clients
if (!g.__voyageSupabase) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
  
  g.__voyageSupabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'voyage-auth', // single key everywhere
    },
  });

  // Diagnostic log (temporary)
  if (import.meta.env.VITE_DEBUG_BOOT === '1') {
    console.info('[AUTH][CLIENT] singleton created', { id: g.__voyageSupabase.toString().slice(-8) });
  }
}

export const supabase: SupabaseClient<Database> = g.__voyageSupabase;