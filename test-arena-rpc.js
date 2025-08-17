import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://uzoiiijqtahohfafqirm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b2lpaWpxdGFob2hmYWZxaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTE2MzgsImV4cCI6MjA2Njk2NzYzOH0.Ny_Gxbhus7pNm0OHipRBfaFLNeK_ZSePfbj8no4SVGw";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testArenaRPC() {
  const { data, error } = await supabase.rpc('arena_get_active_challenge');
  console.log('RPC active raw:', JSON.stringify(data), 'typeof:', typeof data, 'isArray:', Array.isArray(data));
  console.log('activeRow:', Array.isArray(data) ? data[0] : data);
  console.log('activeRow.id:', (Array.isArray(data) ? data[0] : data)?.id);
  console.log('session?', (await supabase.auth.getSession()).data.session?.user?.id);
  
  if (error) {
    console.log('RPC error:', error);
  }
}

testArenaRPC();