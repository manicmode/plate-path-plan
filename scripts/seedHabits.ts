import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  process.env.SUPABASE_URL!, 
  process.env.SUPABASE_SERVICE_ROLE_KEY!, 
  { auth: { persistSession: false } }
);

const raw = fs.readFileSync('supabase/seed/habit_library.json', 'utf8');
const arr = JSON.parse(raw);

if (!Array.isArray(arr)) {
  throw new Error('Seed file must be a JSON array');
}

console.log(`Seeding ${arr.length} habit templates...`);

const { data, error } = await supabase.rpc('rpc_upsert_habit_templates', { 
  p_templates: arr 
});

if (error) { 
  console.error('Seeding failed:', error); 
  process.exit(1); 
}

console.log(`Seed complete. Upserted: ${data} templates`);