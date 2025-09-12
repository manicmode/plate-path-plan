import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

const root = 'supabase/functions';
let dirs = [];
try {
  dirs = readdirSync(root).filter(d => {
    try { return statSync(join(root, d)).isDirectory(); } catch { return false; }
  });
} catch {
  console.log('[deploy-existing-functions] No functions folder; skipping.');
  process.exit(0);
}

const valid = dirs.filter(d => {
  try { return statSync(join(root, d, 'index.ts')).isFile(); } catch { return false; }
});

if (valid.length === 0) {
  console.log('[deploy-existing-functions] No valid functions to deploy.');
  process.exit(0);
}

for (const name of valid) {
  console.log(`→ Deploying ${name} ...`);
  const res = spawnSync('npx', [
    'supabase','functions','deploy', name,
    '--no-verify-jwt',
    '--env-file','supabase/.env'
  ], { stdio: 'inherit' });
  if (res.status !== 0) process.exit(res.status);
}
