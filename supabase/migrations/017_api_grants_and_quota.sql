-- 017_api_grants_and_quota.sql
--
-- Two fixes for the public submission surface:
--
-- 1. SECURITY: Supabase's default privileges granted EXECUTE on new functions
--    to anon/authenticated/service_role. Our earlier `revoke ... from public`
--    did NOT remove those role-specific grants — so an unauthenticated caller
--    could invoke create_lead_with_idempotency directly and inject leads into
--    ANY form by public_id, bypassing the form secret entirely.
--    Fix: revoke from anon/authenticated; keep service_role (route) +
--    api_submission (future direct-DB role).
--
-- 2. CORRECTNESS: enforce the monthly plan quota ATOMICALLY inside the same
--    transaction that increments the counter (row lock), so concurrent
--    submissions cannot bypass the limit (roadmap Phase 5, §80).
--    p_max_leads is passed by the application from the centralized plan
--    config (limits stay in app code, not duplicated in the DB — §77).
--    NULL = unlimited.
--
-- Note: SAFE TO RE-RUN against any prior state — no function at all, only
-- the legacy 8-arg version from 014, or a previous run of this file.
-- Ordering rule: always (re)create the 9-arg function FIRST, then remove
-- the legacy overload. Every revoke of a possibly-absent signature is
-- guarded, so a missing function/role can never abort the script.
-- IMPORTANT: 014's 6th parameter is TIMESTAMPTZ (p_idempotency_expires_at)
-- — every hand-written (..., text, date, date) signature below is wrong and
-- raises 42883. Signatures are checked against the actual definitions.

-- ── 1. Atomic quota-enforcing lead creation ─────────────────────────
-- Use CREATE OR REPLACE (not drop + create) so the function keeps existing
-- across migration runs. The only real change vs. migration 014's 8-arg body:
--   • p_max_leads parameter (new, last arg, default null = unlimited)
--   • Quota check uses SELECT ... FOR UPDATE on usage_counters instead of the
--     014 ON CONFLICT increment, so the QUOTA_EXCEEDED check and the increment
--     are wrapped in the same row lock (concurrent submissions can't bypass).
-- The 8-arg call signature still resolves via the default, so the route's
-- legacy fallback path is only a transitional safety net, not the common path.

create or replace function public.create_lead_with_idempotency(
  p_form_public_id text,
  p_request_hash text,
  p_data jsonb,
  p_metadata jsonb,
  p_idempotency_key text,
  p_idempotency_expires_at timestamptz,
  p_usage_period_start date,
  p_usage_period_end date,
  p_max_leads integer default null   -- null = unlimited
)
returns table (created boolean, lead_id uuid, conflict boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_form public.forms;
  v_existing record;
  v_new_lead_id uuid;
  v_count integer;
begin
  select * into v_form from public.forms
    where public_id = p_form_public_id limit 1;

  if v_form.id is null then
    raise exception 'FORM_NOT_FOUND';
  end if;

  -- Idempotent replay: same key + same request hash → return original lead.
  if p_idempotency_key is not null then
    select * into v_existing
    from public.idempotency_keys
    where form_id = v_form.id and key = p_idempotency_key
      and expires_at > now();

    if v_existing.id is not null then
      if v_existing.request_hash = p_request_hash and v_existing.lead_id is not null then
        return query select true, v_existing.lead_id, false;
        return;
      end if;
      -- Same key, different payload (or unfinished original) → conflict.
      return query select false, null::uuid, true;
      return;
    end if;
  end if;

  -- ── Atomic quota check + increment (row-locked) ─────────────────
  select uc.leads_count into v_count
  from public.usage_counters uc
  where uc.workspace_id = v_form.workspace_id
    and uc.period_start = p_usage_period_start
    and uc.period_end = p_usage_period_end
  for update;

  if not found then
    insert into public.usage_counters
      (workspace_id, period_start, period_end, leads_count)
    values
      (v_form.workspace_id, p_usage_period_start, p_usage_period_end, 1);
  else
    if p_max_leads is not null and v_count >= p_max_leads then
      raise exception 'QUOTA_EXCEEDED';
    end if;
    update public.usage_counters
      set leads_count = leads_count + 1, updated_at = now()
      where workspace_id = v_form.workspace_id
        and period_start = p_usage_period_start
        and period_end = p_usage_period_end;
  end if;

  -- New idempotency record (unique_violation = wrapped up in a race; retry is safe).
  if p_idempotency_key is not null then
    begin
      insert into public.idempotency_keys
        (workspace_id, form_id, key, request_hash, expires_at, response_status)
      values
        (v_form.workspace_id, v_form.id, p_idempotency_key,
         p_request_hash, p_idempotency_expires_at, 200);
    exception when unique_violation then
      select * into v_existing
      from public.idempotency_keys
      where form_id = v_form.id and key = p_idempotency_key
        and expires_at > now();
      if v_existing.request_hash = p_request_hash and v_existing.lead_id is not null then
        return query select true, v_existing.lead_id, false;
        return;
      end if;
      return query select false, null::uuid, true;
      return;
    end;
  end if;

  -- Create the lead.
  insert into public.leads (workspace_id, form_id, data, metadata)
  values (v_form.workspace_id, v_form.id, p_data, p_metadata)
  returning id into v_new_lead_id;

  if p_idempotency_key is not null then
    update public.idempotency_keys
      set lead_id = v_new_lead_id,
          response_body = jsonb_build_object('success', true, 'leadId', v_new_lead_id,
                                             'message', 'Submission received.')
      where form_id = v_form.id and key = p_idempotency_key;
  end if;

  return query select true, v_new_lead_id, false;
end;
$$;

-- Remove the legacy 8-arg overload left by migration 014 (no-op when absent).
-- Its EXECUTE grants vanish with it. The argument list is DERIVED from
-- pg_proc, never hand-written: 014's 6th parameter is TIMESTAMPTZ, and every
-- hand-typed (..., text, text, date, date) signature has aborted this script
-- with 42883 because that exact overload does not exist.
-- pronargs = 8 guarantees the 9-arg function (9th param has a default) is
-- never the target of this drop.
do $$
declare r record;
begin
  for r in
    select pg_get_function_identity_arguments(p.oid) as args
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'create_lead_with_idempotency'
       and p.pronargs = 8
  loop
    execute format('drop function public.create_lead_with_idempotency(%s)', r.args);
  end loop;
end $$;

-- ── 2. Revoke unauthenticated execute on sensitive functions ────────
-- Guarded: undefined_function / undefined_object must not abort the script
-- (the function or role may not exist on this database).
do $$ begin
  revoke execute on function public.create_lead_with_idempotency(text, text, jsonb, jsonb, text, timestamptz, date, date, integer) FROM PUBLIC;
  revoke execute on function public.create_lead_with_idempotency(text, text, jsonb, jsonb, text, timestamptz, date, date, integer) from anon, authenticated;
exception when undefined_function then null; when undefined_object then null; end $$;

do $$ begin
  revoke execute on function public.reconcile_workspace_usage(uuid, date, date) from anon, authenticated;
  revoke execute on function public.reconcile_workspace_usage(uuid, date, date) FROM PUBLIC;
exception when undefined_function then null; when undefined_object then null; end $$;

do $$ begin
  revoke execute on function public.mint_form_secret(uuid, text, text) from anon, authenticated;
  revoke execute on function public.mint_form_secret(uuid, text, text) FROM PUBLIC;
exception when undefined_function then null; when undefined_object then null; end $$;

-- Grants: default privileges already cover service_role; re-assert for clarity
-- and ensure the future direct-DB api role keeps access.
-- (api_submission is created by 014; guarded in case 014 was never applied.)
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'api_submission') then
    grant execute on function public.create_lead_with_idempotency(text, text, jsonb, jsonb, text, timestamptz, date, date, integer) to api_submission;
  end if;
end $$;

revoke execute on function public.create_lead_with_idempotency(text, text, jsonb, jsonb, text, timestamptz, date, date, integer) FROM PUBLIC;
revoke execute on function public.create_lead_with_idempotency(text, text, jsonb, jsonb, text, timestamptz, date, date, integer) from anon, authenticated;
grant execute on function public.create_lead_with_idempotency(text, text, jsonb, jsonb, text, timestamptz, date, date, integer) to service_role;
  