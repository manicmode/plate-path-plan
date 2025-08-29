// Health report diagnostics logger with correlation IDs
export type LogCtx = { cid?: string; tags?: string[] };

const stamp = () => new Date().toISOString();

export function hlog(msg: string, ctx: LogCtx = {}, extra?: unknown) {
  const tag = ctx.tags?.length ? `[${ctx.tags.join('][')}]` : '';
  const cid = ctx.cid ? ` cid=${ctx.cid}` : '';
  // eslint-disable-next-line no-console
  console.log(`[HEALTH] ${stamp()} ${tag}${cid} :: ${msg}`, extra ?? '');
}

export function newCID() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Auto-run sanity tests in development
if (import.meta.env.VITE_HEALTH_DEBUG_SAFE === 'true') {
  import('./score').then(({ runSanityTests }) => {
    runSanityTests();
  }).catch(() => {
    console.warn('[HEALTH] Could not run sanity tests - score module unavailable');
  });
}