// src/lib/net/authHeaders.ts
import { createClient } from '@supabase/supabase-js';

// Reuse the app's env (same as your existing Supabase client)
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL!;
const SUPA_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY!;

// A very small, local client just to read the session token if user is logged in.
// (We don't create duplicate connections; this is light and safe for browser.)
const supabase = createClient(SUPA_URL, SUPA_ANON);

export async function getSupabaseAuthHeaders() {
  // Prefer the logged-in user's JWT if available
  try {
    const { data } = await supabase.auth.getSession();
    const userToken = data?.session?.access_token;
    if (userToken) {
      return {
        Authorization: `Bearer ${userToken}`,
        apikey: SUPA_ANON, // helpful/expected by some setups
      };
    }
  } catch {}
  // Fallback to anon key (public) if no user token
  return {
    Authorization: `Bearer ${SUPA_ANON}`,
    apikey: SUPA_ANON,
  };
}