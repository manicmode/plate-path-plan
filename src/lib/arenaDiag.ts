export async function arenaUiHeartbeat(supabase: any, label: string) {
  try {
    if (process.env.NEXT_PUBLIC_ARENA_DIAG !== 'true') return;
    await supabase.from('arena_ui_heartbeat').insert({ label, at: new Date().toISOString() });
  } catch {}
}