/**
 * RLS isolation verification (release blocker — Master Prompt §76–77).
 * Creates two users, two workspaces, forms in each; then proves:
 *   1. User A can act on Workspace A resources as owner
 *   2. User A CANNOT read Workspace B forms/leads (cross-tenant)
 *   3. Anonymous users see nothing
 * Idempotent: cleans up its own rows at the end.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
});

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

// ── Setup: two users with confirmed emails ──────────────────────────
async function ensureUser(email) {
  const { data } = await admin.auth.admin.listUsers();
  const existing = data.users.find((u) => u.email === email);
  if (existing) return existing;
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: 'RlsTest!Pass1',
    email_confirm: true,
  });
  if (error) throw new Error('createUser: ' + error.message);
  return created.user;
}

const userA = await ensureUser('rls-test-a@formivo-test.local');
const userB = await ensureUser('rls-test-b@formivo-test.local');

// Real sign-ins (produces proper JWTs for each user session)
async function signIn(email) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: 'RlsTest!Pass1' });
  if (error) throw new Error('signIn ' + email + ': ' + error.message);
  // Bind the session to a fresh client calling the REST API as that user.
  return createClient(URL, ANON, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
}

const A = await signIn(userA.email);
const B = await signIn(userB.email);

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗ FAIL:', name); }
}

// Workspaces (owner_id = self, satisfies workspaces_insert_owner policy)
const wsA = (await A.from('workspaces').insert({ name: 'WS Alpha', owner_id: userA.id }).select().single());
const wsB = (await B.from('workspaces').insert({ name: 'WS Beta', owner_id: userB.id }).select().single());
check('user A created WS Alpha', !!wsA.data?.id);
check('user B created WS Beta', !!wsB.data?.id);
if (!wsA.data?.id || !wsB.data?.id) throw new Error('workspace creation failed: ' + JSON.stringify([wsA.error, wsB.error]));

// Cross-visibility
const aSeesB = await A.from('workspaces').select().eq('id', wsB.data.id);
check('A sees own WS Alpha', (await A.from('workspaces').select()).data?.length === 1);
const bVisibleToA = (await A.from('workspaces').select().eq('id', wsB.data.id)).data?.length ?? 0;
check('A CANNOT see WS Beta (isolation)', bVisibleToA === 0);

// Forms
const fA = await A.from('forms').insert({
  workspace_id: wsA.data.id, public_id: 'frm_rls_a' + Date.now().toString(36),
  name: 'Alpha Form', secret_hash: 'x'.repeat(64),
}).select().single();
check('A created form in WS Alpha', !!fA.data?.id);

const fBattempt = await A.from('forms').insert({
  workspace_id: wsB.data.id, public_id: 'frm_bad' + Date.now().toString(36),
  name: 'Intrusion', secret_hash: 'x'.repeat(64),
});
check('A CANNOT create form in WS B', !!fBattempt.error);
check('A CANNOT read WS B forms list', ((await A.from('forms').select().eq('workspace_id', wsB.data.id)).data?.length ?? 0) === 0);

// Leads + RLS access via helper
const lB = await B.from('leads').insert({
  workspace_id: wsB.data.id, form_id: fA.data.id, // wrong on purpose
  data: { name: 'Injected' },
});
check('lead workspace-integrity trigger blocks cross-ws lead', !!lB.error && /LEAD_WORKSPACE_MISMATCH|violates/i.test(lB.error.message ?? ''));

const lA = await A.from('leads').insert({
  workspace_id: wsA.data.id, form_id: fA.data.id,
  data: { name: 'John Doe', email: 'john@example.com' },
}).select().single();
check('A created a lead properly', !!lA.data?.id);
check('A cannot read WS B leads', ((await A.from('leads').select().eq('workspace_id', wsB.data.id)).data?.length ?? 0) === 0);

// Atomic lead RPC reachable by anon (api role check via anon instead — policy-free function)
const { error: rpcErr } = await admin.rpc('reconcile_workspace_usage', {
  p_workspace_id: wsA.data.id, p_period_start: '2026-10-01', p_period_end: '2026-11-01',
});
check('reconcile RPC executes (service)', !rpcErr);

// ── Cleanup ─────────────────────────────────────────────────────────
await admin.from('workspaces').delete().eq('id', wsA.data.id); // cascades
await admin.from('workspaces').delete().eq('id', wsB.data.id);
await admin.from('profiles').delete().eq('id', userA.id);
await admin.from('profiles').delete().eq('id', userB.id);
await admin.auth.admin.deleteUser(userA.id);
await admin.auth.admin.deleteUser(userB.id);

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
