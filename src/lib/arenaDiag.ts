export async function arenaUiHeartbeat(supabase: any, label: string) {
  try {
    if (!process.env.ARENA_DIAG) return;
    await supabase.from('arena_ui_heartbeat').insert({
      label,
      at: new Date().toISOString()
    });
  } catch {}
}