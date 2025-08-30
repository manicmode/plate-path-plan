// src/lib/net/authHeaders.ts
import { createClient } from '@supabase/supabase-js';

// Reuse the app's env (same as your existing Supabase client)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

// A very small, local client just to read the session token if user is logged in.
// (We don't create duplicate connections; this is light and safe for browser.)
const supabase = createClient(supabaseUrl, supabaseKey);

export async function getSupabaseAuthHeaders() {
  // Prefer the logged-in user's JWT if available
  try {
    const { data } = await supabase.auth.getSession();
    const userToken = data?.session?.access_token;
    if (userToken) {
      return {
        Authorization: `Bearer ${userToken}`,
        apikey: supabaseKey, // helpful/expected by some setups
      };
    }
  } catch {}
  // Fallback to anon key (public) if no user token
  return {
    Authorization: `Bearer ${supabaseKey}`,
    apikey: supabaseKey,
  };
}

export async function getAuthHeaders(withAuth = true): Promise<Record<string, string>> {
  if (!withAuth) {
    return {};
  }
  
  try {
    const { data } = await supabase.auth.getSession();
    const userToken = data?.session?.access_token;
    if (userToken) {
      return {
        Authorization: `Bearer ${userToken}`,
        apikey: supabaseKey,
      };
    }
  } catch {}
  
  // Fallback to anon key if no user session
  return {
    Authorization: `Bearer ${supabaseKey}`,
    apikey: supabaseKey,
  };
}