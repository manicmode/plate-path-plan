#!/usr/bin/env node

import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { spawn } from 'child_process';

const FUNCTIONS_DIR = 'supabase/functions';

async function deployFunction(functionName) {
  return new Promise((resolve) => {
    console.log(`📦 Deploying function: ${functionName}`);
    
    const child = spawn('npx', ['supabase', 'functions', 'deploy', functionName], {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Successfully deployed: ${functionName}`);
      } else {
        console.log(`❌ Failed to deploy: ${functionName} (exit code: ${code})`);
      }
      resolve();
    });

    child.on('error', (error) => {
      console.log(`❌ Error deploying: ${functionName} - ${error.message}`);
      resolve();
    });
  });
}

async function getFunctionDirectories() {
  try {
    const entries = await readdir(FUNCTIONS_DIR);
    const functionDirs = [];

    for (const entry of entries) {
      const fullPath = join(FUNCTIONS_DIR, entry);
      const stats = await stat(fullPath);
      
      if (stats.isDirectory()) {
        const indexPath = join(fullPath, 'index.ts');
        try {
          await stat(indexPath);
          functionDirs.push(entry);
        } catch {
          console.log(`⚠️  Skipping ${entry}: no index.ts found`);
        }
      }
    }

    return functionDirs;
  } catch (error) {
    console.error(`Error reading functions directory: ${error.message}`);
    return [];
  }
}

async function main() {
  console.log('🚀 Starting Supabase function deployment...');
  
  const functionDirs = await getFunctionDirectories();
  
  if (functionDirs.length === 0) {
    console.log('No functions found to deploy');
    return;
  }

  console.log(`Found ${functionDirs.length} functions to deploy:`, functionDirs);

  // Deploy functions sequentially to avoid overwhelming the system
  for (const functionName of functionDirs) {
    await deployFunction(functionName);
  }

  console.log('🏁 Deployment process completed');
}

main().catch((error) => {
  console.error('Deployment script failed:', error);
  process.exit(1);
});