/**
 * Verifies supabase/migrations/017_api_grants_and_quota.sql executes cleanly
 * against a database in the user's CURRENT production state:
 *   - 014's 8-arg function exists (6th param TIMESTAMPTZ)
 *   - anon still has EXECUTE on it (014's revoke named the wrong signature
 *     and was swallowed by an exception handler -> the hole was never closed)
 *   - mint_form_secret / reconcile_workspace_usage ABSENT (proves 017's guards)
 * Then asserts: exactly one 9-arg function remains, anon EXECUTE revoked,
 * service_role + api_submission granted, functional create/replay/conflict/
 * quota behavior, and a second run of 017 is idempotent.
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const mig = readFileSync(
  new URL('../supabase/migrations/017_api_grants_and_quota.sql', import.meta.url),
  'utf8',
);

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL:', name, detail); }
};

const db = new PGlite();

// ── 1. Reproduce production state ───────────────────────────────────
await db.exec(`
  create role anon;
  create role authenticated;
  create role service_role;
  create role api_submission;

  create table public.forms (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null,
    public_id text unique not null,
    name text default 'f',
    status text default 'active',
    secret_hash text,
    created_at timestamptz default now()
  );
  create table public.usage_counters (
    workspace_id uuid not null,
    period_start date not null,
    period_end date not null,
    leads_count integer default 0,
    updated_at timestamptz default now(),
    primary key (workspace_id, period_start, period_end)
  );
  create table public.idempotency_keys (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid,
    form_id uuid,
    key text,
    request_hash text,
    expires_at timestamptz,
    response_status integer,
    lead_id uuid,
    response_body jsonb,
    unique (form_id, key)
  );
  create table public.leads (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null,
    form_id uuid not null,
    data jsonb,
    metadata jsonb,
    status text default 'new',
    created_at timestamptz default now()
  );
`);

// 014's 8-arg function, verbatim shape (6th param TIMESTAMPTZ).
await db.exec(`
  create or replace function public.create_lead_with_idempotency(
    p_form_public_id text,
    p_request_hash text,
    p_data jsonb,
    p_metadata jsonb,
    p_idempotency_key text,
    p_idempotency_expires_at timestamptz,
    p_usage_period_start date,
    p_usage_period_end date
  )
  returns table (created boolean, lead_id uuid, conflict boolean)
  language plpgsql security definer set search_path = ''
  as $fn$
  declare
    v_form public.forms;
    v_existing record;
    v_new_lead_id uuid;
  begin
    select * into v_form from public.forms
      where public_id = p_form_public_id limit 1;
    if v_form.id is null then raise exception 'FORM_NOT_FOUND'; end if;
    if p_idempotency_key is not null then
      select * into v_existing from public.idempotency_keys
        where form_id = v_form.id and key = p_idempotency_key and expires_at > now();
      if v_existing.id is not null then
        if v_existing.request_hash = p_request_hash and v_existing.lead_id is not null then
          return query select true, v_existing.lead_id, false; return;
        end if;
        return query select false, null::uuid, true; return;
      end if;
    end if;
    insert into public.usage_counters (workspace_id, period_start, period_end, leads_count)
    values (v_form.workspace_id, p_usage_period_start, p_usage_period_end, 1)
    on conflict (workspace_id, period_start, period_end)
    do update set leads_count = usage_counters.leads_count + 1, updated_at = now();
    if p_idempotency_key is not null then
      begin
        insert into public.idempotency_keys (workspace_id, form_id, key, request_hash, expires_at, response_status)
        values (v_form.workspace_id, v_form.id, p_idempotency_key, p_request_hash, p_idempotency_expires_at, 200);
      exception when unique_violation then
        select * into v_existing from public.idempotency_keys
          where form_id = v_form.id and key = p_idempotency_key and expires_at > now();
        if v_existing.request_hash = p_request_hash and v_existing.lead_id is not null then
          return query select true, v_existing.lead_id, false; return;
        end if;
        return query select false, null::uuid, true; return;
      end;
    end if;
    insert into public.leads (workspace_id, form_id, data, metadata)
    values (v_form.workspace_id, v_form.id, p_data, p_metadata)
    returning id into v_new_lead_id;
    if p_idempotency_key is not null then
      update public.idempotency_keys set lead_id = v_new_lead_id
        where form_id = v_form.id and key = p_idempotency_key;
    end if;
    return query select true, v_new_lead_id, false;
  end;
  $fn$;

  -- Supabase-style default privilege: the anon hole.
  grant execute on function public.create_lead_with_idempotency(text, text, jsonb, jsonb, text, timestamptz, date, date) to anon;
`);

// Confirm the hole is open pre-migration.
const preHole = await db.query(
  `select has_function_privilege('anon',
     'public.create_lead_with_idempotency(text,text,jsonb,jsonb,text,timestamptz,date,date)',
     'EXECUTE') as ok`,
);
check('PRE: anon EXECUTE hole is open (mirrors production)', preHole.rows[0].ok === true);

// ── 2. Run the fixed migration 017 ──────────────────────────────────
try {
  await db.exec(mig);
  check('017 executes cleanly from the 014 state', true);
} catch (e) {
  check('017 executes cleanly from the 014 state', false, String(e.message || e));
  console.log('\nRESULT:', pass, 'passed,', fail, 'failed');
  process.exit(1);
}

// ── 3. Structural assertions ────────────────────────────────────────
const fns = await db.query(`
  select p.pronargs, pg_get_function_identity_arguments(p.oid) as args
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'create_lead_with_idempotency'`);
check('exactly one overload remains, 9 args', fns.rows.length === 1 && fns.rows[0].pronargs === 9,
  JSON.stringify(fns.rows));
const ident9 = 'public.create_lead_with_idempotency(text,text,jsonb,jsonb,text,timestamptz,date,date,integer)';

const priv = async (role) => (await db.query(
  `select has_function_privilege($1, $2, 'EXECUTE') as ok`, [role, ident9])).rows[0].ok;
check('anon EXECUTE revoked', (await priv('anon')) === false);
check('service_role EXECUTE granted', (await priv('service_role')) === true);
check('api_submission EXECUTE granted', (await priv('api_submission')) === true);
check('PUBLIC EXECUTE revoked', (await db.query(`
  select exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) e
    where n.nspname = 'public'
      and p.proname = 'create_lead_with_idempotency'
      and p.pronargs = 9
      and e.grantee = 0
      and e.privilege_type = 'EXECUTE'
  ) as public_has_exec`)).rows[0].public_has_exec === false);

// ── 4. Functional behavior ──────────────────────────────────────────
await db.exec(`insert into public.forms (workspace_id, public_id) values ('00000000-0000-0000-0000-0000000000aa', 'frm_probe')`);

const call = (args, role) => (async () => {
  if (role) await db.exec(`set role ${role}`);
  try {
    const r = await db.query(
      `select * from public.create_lead_with_idempotency($1,$2,$3,$4,$5,$6,$7,$8${args.length > 8 ? ',$9' : ''})`,
      args,
    );
    return { rows: r.rows };
  } finally { if (role) await db.exec(`reset role`); }
})();

// anon must be denied now.
let denied = false;
try { await call(['x', 'h', { a: 1 }, null, null, null, '2026-10-01', '2026-11-01'], 'anon'); }
catch (e) { denied = /permission denied|42501/i.test(String(e.message)); }
check('anon call now fails with permission denied', denied);

const A = ['frm_probe', 'hash-1', { name: 'A' }, null, 'idem-key-1', '2026-11-30T00:00:00Z', '2026-10-01', '2026-11-01', 1];
const r1 = await call(A, 'service_role');
check('service_role create → created=true + lead id', r1.rows[0]?.created === true && !!r1.rows[0]?.lead_id,
  JSON.stringify(r1.rows));

const r2 = await call(A, 'service_role');
check('idempotent replay → same lead', r2.rows[0]?.created === true && r2.rows[0]?.lead_id === r1.rows[0]?.lead_id);

const r3 = await call(['frm_probe', 'hash-DIFFERENT', { name: 'B' }, null, 'idem-key-1', '2026-11-30T00:00:00Z', '2026-10-01', '2026-11-01', 1], 'service_role');
check('same key + different body → conflict', r3.rows[0]?.conflict === true, JSON.stringify(r3.rows));

// counter is at 1 from the first create; p_max_leads=1 → next new lead must be refused.
let quota = null;
try { await call(['frm_probe', 'hash-2', { name: 'C' }, null, 'idem-key-2', '2026-11-30T00:00:00Z', '2026-10-01', '2026-11-01', 1], 'service_role'); }
catch (e) { quota = String(e.message); }
check('quota exceeded → QUOTA_EXCEEDED', /QUOTA_EXCEEDED/.test(quota || ''), quota ?? 'no error raised');

// 8-arg call (route legacy fallback) still resolves via the default.
const r4 = await call(['frm_probe', 'hash-3', { name: 'D' }, null, 'idem-key-3', '2026-11-30T00:00:00Z', '2026-10-01', '2026-11-01'], 'service_role');
check('8-named-arg fallback call resolves (default p_max_leads)', r4.rows[0]?.created === true, JSON.stringify(r4.rows));

// ── 5. Idempotent re-run ────────────────────────────────────────────
try {
  await db.exec(mig);
  const again = await db.query(`
    select count(*)::int as n from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public' and p.proname = 'create_lead_with_idempotency'`);
  check('017 re-runs cleanly (idempotent), still one overload', again.rows[0].n === 1);
} catch (e) {
  check('017 re-runs cleanly (idempotent), still one overload', false, String(e.message || e));
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
