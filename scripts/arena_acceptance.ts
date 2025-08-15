import 'cross-fetch/polyfill';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL!;
const anon = process.env.SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !anon || !service) {
  console.error('Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const TEST_EMAIL = 'arena.acceptance@test.local';
const TEST_PASSWORD = '1Strong!Pass#Arena';

type Report = {
  createdUser?: boolean;
  signInOk?: boolean;
  ensure?: any;
  chosen?: any;
  chosenId?: any;
  postMessageId?: any;
  errors?: Record<string, string>;
};

(async () => {
  const report: Report = { errors: {} };
  try {
    // Admin: ensure user exists
    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
    const got = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const exists = got.data?.users?.some(u => u.email === TEST_EMAIL);
    if (!exists) {
      const created = await admin.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true
      });
      if (created.error) throw created.error;
      report.createdUser = true;
    }

    // Sign in with anon
    const sb = createClient(url, anon);
    const signIn = await sb.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD });
    if (signIn.error || !signIn.data.session) throw signIn.error || new Error('No session');
    report.signInOk = true;

    // RPCs
    const ensure = await sb.rpc('ensure_rank20_membership');
    if (ensure.error) report.errors!['ensure_rank20_membership'] = ensure.error.message;
    report.ensure = ensure.data ?? null;

    const chosen = await sb.rpc('my_rank20_chosen_challenge');
    if (chosen.error) report.errors!['my_rank20_chosen_challenge'] = chosen.error.message;
    report.chosen = chosen.data ?? null;

    const chosenId = await sb.rpc('my_rank20_chosen_challenge_id');
    if (chosenId.error) report.errors!['my_rank20_chosen_challenge_id'] = chosenId.error.message;
    report.chosenId = chosenId.data ?? null;

    const post = await sb.rpc('arena_post_message', { p_content: 'stability smoke (automated)' });
    if (post.error) report.errors!['arena_post_message'] = post.error.message;
    report.postMessageId = post.data ?? null;

    const hadErrors = Object.keys(report.errors!).length > 0;
    console.log(JSON.stringify(report, null, 2));
    process.exit(hadErrors ? 2 : 0);
  } catch (e: any) {
    report.errors!['fatal'] = e?.message || String(e);
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }
})();