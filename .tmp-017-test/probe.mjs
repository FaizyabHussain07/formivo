// Read-only live probe. Prints only statuses/codes — never secrets.
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#') && l.trim())
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const SUPA = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const APP = 'https://formivo-three.vercel.app';

const log = (name, v) => console.log(name.padEnd(30), JSON.stringify(v));

// ── 1. Deployed app + API route shapes ──────────────────────────────
try {
  const r = await fetch(APP + '/', { redirect: 'manual' });
  log('app_root', { status: r.status, loc: r.headers.get('location') });
} catch (e) { log('app_root', { err: String(e) }); }

const post = (path, headers, body) =>
  fetch(APP + path, { method: 'POST', headers, body }).then(async (r) => ({
    status: r.status,
    reqId: r.headers.get('x-request-id'),
    cors: r.headers.get('access-control-allow-origin'),
    body: (await r.text()).slice(0, 300),
  }));

const SUB = '/api/v1/forms/probe-nonexistent-form/submissions';
const jsonHeaders = { 'content-type': 'application/json', authorization: 'Bearer probe' };
try { log('route_bad_form', await post(SUB, jsonHeaders, JSON.stringify({ data: { p: 1 } }))); }
catch (e) { log('route_bad_form', { err: String(e) }); }
try { log('route_no_auth', await post(SUB, { 'content-type': 'application/json' }, JSON.stringify({ data: { p: 1 } }))); }
catch (e) { log('route_no_auth', { err: String(e) }); }
try { log('route_bad_ct', await post(SUB, jsonHeaders, 'not-json')); }
catch (e) { log('route_bad_ct', { err: String(e) }); }
try {
  const r = await fetch(APP + SUB, { method: 'OPTIONS', headers: { origin: APP, 'access-control-request-method': 'POST' } });
  log('route_options', { status: r.status, allow: r.headers.get('access-control-allow-origin') });
} catch (e) { log('route_options', { err: String(e) }); }

// ── 2. RPC state via anon key (NO writes possible) ──────────────────
// Bogus form id → FORM_NOT_FOUND raised before any insert; permission
// denied → nothing executes. Either way the probe writes nothing.
async function rpc(args) {
  const r = await fetch(`${SUPA}/rest/v1/rpc/create_lead_with_idempotency`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: ANON, authorization: `Bearer ${ANON}` },
    body: JSON.stringify(args),
  });
  const txt = await r.text();
  return { status: r.status, body: txt.slice(0, 260) };
}

const base = {
  p_form_public_id: '__probe__',
  p_request_hash: 'probe',
  p_data: { probe: true },
  p_metadata: null,
  p_idempotency_key: null,
  p_idempotency_expires_at: null,
  p_usage_period_start: '2026-10-01',
  p_usage_period_end: '2026-11-01',
};
try { log('rpc_8arg', await rpc(base)); } catch (e) { log('rpc_8arg', { err: String(e) }); }
try { log('rpc_9arg', await rpc({ ...base, p_max_leads: null })); } catch (e) { log('rpc_9arg', { err: String(e) }); }

// ── Interpretation guide ────────────────────────────────────────────
// rpc_8arg:  PGRST202            → legacy 8-arg absent (already dropped)
//            P0001 FORM_NOT_FOUND→ legacy exists AND anon still has EXECUTE (hole open)
//            42501 / 401 / 403   → legacy exists, EXECUTE revoked (good)
// rpc_9arg:  PGRST202            → 017's 9-arg NOT applied yet → re-run 017
//            P0001 FORM_NOT_FOUND→ 017 applied (but check anon revoked!)
//            42501 / 401 / 403   → 017 applied + anon revoked (fully fixed)
