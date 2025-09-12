#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

const FUNCTIONS_DIR = 'supabase/functions';

function hasEntrypoint(name) {
  return existsSync(join(FUNCTIONS_DIR, name, 'index.ts'));
}

function shouldSkip(name) {
  // never try to deploy examples/samples/templates
  return /example|sample|template|README/i.test(name);
}

function main() {
  if (!existsSync(FUNCTIONS_DIR)) {
    console.error(`❌ Functions directory not found: ${FUNCTIONS_DIR}`);
    process.exit(1);
  }

  const dirs = readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  const candidates = dirs
    .filter(name => !shouldSkip(name))
    .filter(hasEntrypoint);

  const skipped = dirs.filter(name => shouldSkip(name) || !hasEntrypoint(name));

  console.log(`📦 Found ${dirs.length} function folders`);
  console.log(`✅ Will deploy (${candidates.length}): ${candidates.join(', ') || '—'}`);
  if (skipped.length) {
    console.log(`⏭️  Skipping (${skipped.length}): ${skipped.join(', ')}`);
  }

  for (const name of candidates) {
    try {
      console.log(`⏳ Deploying ${name}...`);
      execSync(`npx supabase functions deploy ${name}`, { stdio: 'inherit' });
      console.log(`✅ ${name} deployed`);
    } catch (error) {
      console.error(`❌ ${name} failed: ${error?.message || error}`);
      // continue with the rest
    }
  }

  console.log('🎉 Done');
}

main();