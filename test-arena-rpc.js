import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://uzoiiijqtahohfafqirm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b2lpaWpxdGFob2hmYWZxaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTE2MzgsImV4cCI6MjA2Njk2NzYzOH0.Ny_Gxbhus7pNm0OHipRBfaFLNeK_ZSePfbj8no4SVGw";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testArenaRPC() {
  const sess = (await supabase.auth.getSession()).data.session;
  console.log('session user:', sess?.user?.id);
  const { data, error } = await supabase.rpc('arena_get_leaderboard_with_profiles', { challenge_id_param: null, section_param: 'global' });
  console.log('lb raw:', JSON.stringify(data), 'isArray:', Array.isArray(data), 'len:', Array.isArray(data) ? data.length : 'n/a', 'err:', error);
}

testArenaRPC();