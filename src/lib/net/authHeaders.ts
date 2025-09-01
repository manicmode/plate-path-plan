// src/lib/net/authHeaders.ts
import { supabase } from '@/lib/supabase';

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

export async function getSupabaseAuthHeaders() {
  // Prefer the logged-in user's JWT if available
  try {
    const { data } = await supabase.auth.getSession();
    const userToken = data?.session?.access_token;
    if (userToken) {
      return {
        Authorization: `Bearer ${userToken}`,
        apikey: supabaseAnonKey, // helpful/expected by some setups
      };
    }
  } catch {}
  // Fallback to anon key (public) if no user token
  return {
    Authorization: `Bearer ${supabaseAnonKey}`,
    apikey: supabaseAnonKey,
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
        apikey: supabaseAnonKey,
      };
    }
  } catch {}
  
  // Fallback to anon key if no user session
  return {
    Authorization: `Bearer ${supabaseAnonKey}`,
    apikey: supabaseAnonKey,
  };
}