export async function arenaUiHeartbeat(supabase: any, label: string) {
  try {
    // dev-only: run when not production
    const isDev =
      typeof window !== 'undefined' &&
      (process.env.NODE_ENV !== 'production');

    if (!isDev) return;

    await supabase.from('arena_ui_heartbeat').insert({
      label,
      at: new Date().toISOString(),
    });
  } catch {
    // silent
  }
}