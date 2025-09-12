import { readdirSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const functionsRoot = 'supabase/functions';

// Check if functions directory exists
try {
  statSync(functionsRoot);
} catch {
  console.log('No functions directory found; skipping deployment.');
  process.exit(0);
}

// Get all directories in functions folder
const dirs = readdirSync(functionsRoot).filter(d => {
  try {
    return statSync(join(functionsRoot, d)).isDirectory();
  } catch {
    return false;
  }
});

// Filter directories that have an index.ts file
const validFunctions = dirs.filter(dir => {
  try {
    return statSync(join(functionsRoot, dir, 'index.ts')).isFile();
  } catch {
    return false;
  }
});

if (validFunctions.length === 0) {
  console.log('No functions with index.ts found; skipping deployment.');
  process.exit(0);
}

console.log(`Found ${validFunctions.length} deployable functions:`, validFunctions);

// Deploy each function
for (const functionName of validFunctions) {
  try {
    console.log(`Deploying function: ${functionName}`);
    execSync(`supabase functions deploy ${functionName}`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log(`✅ Successfully deployed: ${functionName}`);
  } catch (error) {
    console.error(`❌ Failed to deploy ${functionName}:`, error.message);
    process.exit(1);
  }
}

console.log(`🎉 Successfully deployed ${validFunctions.length} functions!`);