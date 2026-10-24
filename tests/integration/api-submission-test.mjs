/**
 * End-to-end test of POST /api/v1/forms/{publicId}/submissions against the
 * running dev server. Creates a throwaway form, runs the full error/success
 * matrix from the spec (PRD §58), then cleans up after itself.
 *
 * Usage: node scripts/api-submission-test.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'crypto';

const BASE = process.env.APP_URL || 'http://localhost:3000';
const env = {};
import fs from 'fs';
fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
});

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const publicId = 'frm_' + randomBytes(9).toString('hex');
const SECRET = 'fmv_' + randomBytes(32).toString('hex');
const secretHash = createHash('sha256').update(SECRET).digest('hex');

// Need a workspace + subscription for quota checks → reuse/create throwaway.
const { data: authUsers } = await admin.auth.admin.listUsers();
let owner = authUsers.users.find((u) => u.email === 'api-test@formivo-test.local');
if (!owner) {
  const created = await admin.auth.admin.createUser({
    email: 'api-test@formivo-test.local',
    password: 'ApiTest!Pass1',
    email_confirm: true,
  });
  owner = created.data.user;
}

const { data: ws } = await admin
  .from('workspaces')
  .insert({ name: 'API Test WS', owner_id: owner.id })
  .select()
  .single();

await admin.from('subscriptions').insert({ workspace_id: ws.id, plan: 'free', status: 'active' });
const { data: form } = await admin
  .from('forms')
  .insert({ workspace_id: ws.id, public_id: publicId, name: 'API Test Form', secret_hash: secretHash })
  .select()
  .single();

const url = `${BASE}/api/v1/forms/${publicId}/submissions`;

let pass = 0;
let fail = 0;
async function check(name, cond, detail = '') {
  if (cond) {
    pass++;
    console.log('  ✓', name);
  } else {
    fail++;
    console.log('  ✗ FAIL:', name, detail);
  }
}

async function post(body, { headers = {}, raw } = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SECRET}`,
      ...headers,
    },
    body: raw ?? JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

const payload = { data: { name: 'John Doe', email: 'john@example.com', message: 'Hello' } };

// ── 1. Happy path ───────────────────────────────────────────────────
const ok = await post(payload);
await check('valid submission → 200 success + leadId', ok.status === 200 && ok.json?.success === true && ok.json?.leadId, JSON.stringify(ok.json));
const leadId = ok.json?.leadId;

// ── 2. Auth failures ────────────────────────────────────────────────
const noAuth = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
}).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));
await check('missing secret → 401 UNAUTHORIZED', noAuth.status === 401 && noAuth.json?.error?.code === 'UNAUTHORIZED');

const badAuth = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong-secret-12345' },
  body: JSON.stringify(payload),
}).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));
await check('wrong secret → 401 UNAUTHORIZED', badAuth.status === 401 && badAuth.json?.error?.code === 'UNAUTHORIZED');

// ── 3. Validation failures ──────────────────────────────────────────
const badJson = await post(null, { raw: '{not json' });
await check('invalid JSON → 400 INVALID_REQUEST', badJson.status === 400 && badJson.json?.error?.code === 'INVALID_REQUEST');

const noData = await post({ metadata: { source: 'x' } });
await check('missing data object → 400 INVALID_REQUEST', noData.status === 400 && noData.json?.error?.code === 'INVALID_REQUEST');

const wrongType = await post(payload, { headers: { 'Content-Type': 'text/plain' } });
await check('wrong content-type → 400 INVALID_REQUEST', wrongType.status === 400 && wrongType.json?.error?.code === 'INVALID_REQUEST');

// ── 4. Payload limit ────────────────────────────────────────────────
const big = await post({ data: { blob: 'x'.repeat(110 * 1024) } });
await check('oversized payload → 413 PAYLOAD_TOO_LARGE', big.status === 413 && big.json?.error?.code === 'PAYLOAD_TOO_LARGE');

// ── 5. Idempotency ──────────────────────────────────────────────────
const idemKey = 'idem-' + randomBytes(8).toString('hex');
const first = await post(payload, { headers: { 'Idempotency-Key': idemKey } });
const replay = await post(payload, { headers: { 'Idempotency-Key': idemKey } });
await check(
  'same key + same body → same lead (no duplicate)',
  first.status === 200 && replay.status === 200 && first.json?.leadId === replay.json?.leadId,
  `${first.json?.leadId} vs ${replay.json?.leadId}`,
);
const conflict = await post({ data: { name: 'Different' } }, { headers: { 'Idempotency-Key': idemKey } });
await check('same key + different body → 409 conflict', conflict.status === 409 && conflict.json?.error?.code === 'INVALID_REQUEST', JSON.stringify(conflict.json));

// ── 6. Unknown form ─────────────────────────────────────────────────
const notFound = await fetch(`${BASE}/api/v1/forms/frm_doesnotexist/submissions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SECRET}` },
  body: JSON.stringify(payload),
}).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));
await check('unknown form → 404 FORM_NOT_FOUND', notFound.status === 404 && notFound.json?.error?.code === 'FORM_NOT_FOUND');

// ── 7. Archived form ────────────────────────────────────────────────
await admin.from('forms').update({ status: 'archived' }).eq('id', form.id);
const archived = await post(payload);
await check('archived form → 409 FORM_INACTIVE', archived.status === 409 && archived.json?.error?.code === 'FORM_INACTIVE');
await admin.from('forms').update({ status: 'active' }).eq('id', form.id);

// ── 8. Quota ────────────────────────────────────────────────────────
const now = new Date();
const pStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
const pEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
await admin
  .from('usage_counters')
  .upsert(
    { workspace_id: ws.id, period_start: pStart, period_end: pEnd, leads_count: 100 },
    { onConflict: 'workspace_id,period_start,period_end' },
  );
const overQuota = await post(payload);
await check('quota exceeded → 402 QUOTA_EXCEEDED', overQuota.status === 402 && overQuota.json?.error?.code === 'QUOTA_EXCEEDED', JSON.stringify(overQuota.json));
await admin.from('usage_counters').delete().eq('workspace_id', ws.id);

// ── 9. Lead actually stored with correct ownership ──────────────────
const { data: stored } = await admin.from('leads').select('id, workspace_id, form_id, data, status').eq('id', leadId).maybeSingle();
await check(
  'lead stored with data + workspace/form linkage',
  stored !== null && stored.workspace_id === ws.id && stored.form_id === form.id && stored.data?.name === 'John Doe' && stored.status === 'new',
);

// ── Cleanup ─────────────────────────────────────────────────────────
await admin.from('leads').delete().eq('workspace_id', ws.id);
await admin.from('idempotency_keys').delete().eq('workspace_id', ws.id);
await admin.from('subscriptions').delete().eq('workspace_id', ws.id);
await admin.from('workspaces').delete().eq('id', ws.id);
await admin.auth.admin.deleteUser(owner.id);

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
