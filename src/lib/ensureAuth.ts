import { supabase } from '@/integrations/supabase/client';

export async function requireSession() {
  const { data: s1 } = await supabase.auth.getSession();
  if (!s1?.session) await supabase.auth.refreshSession();
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) throw new Error('NOT_AUTHENTICATED');
  return u.user;
}