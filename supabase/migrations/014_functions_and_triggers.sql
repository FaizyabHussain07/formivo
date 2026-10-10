-- 014_functions_and_triggers.sql
-- Timestamp triggers, lead/form workspace integrity, atomic lead-creation
-- RPC (single transaction: idempotency → lead → usage increment), and the
-- locked-down Postgres roles used by the two API surfaces.

-- ── updated_at triggers ────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','workspaces','forms','leads','subscriptions','usage_counters']
  loop
    execute format('drop trigger if exists trg_updated_at on public.%I', t);
    execute format(
      'create trigger trg_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- ── lead ↔ form workspace integrity (§24, §57) ─────────────────────
create or replace function public.enforce_lead_workspace_match()
returns trigger
language plpgsql
as $$
declare
  form_workspace uuid;
begin
  select workspace_id into form_workspace from public.forms where id = new.form_id;
  if form_workspace is null or form_workspace <> new.workspace_id then
    raise exception 'LEAD_WORKSPACE_MISMATCH: lead.workspace_id must match form.workspace_id';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lead_workspace_match on public.leads;
create trigger trg_lead_workspace_match
  before insert on public.leads
  for each row execute function public.enforce_lead_workspace_match();

-- ── Lock down published function executables: Supabase's default
--    "PUBLIC" grant would let upgraded tokens call sensitive definer
--    functions directly. Only the app roles should reach them. ────────
revoke execute on function public.create_lead_with_idempotency(text, text, jsonb, jsonb, text, text, date, date) from public;
revoke execute on function public.mint_form_secret(uuid) from public;

-- ── Atomic lead creation (§46–47: idempotency + lead + usage in ONE
--    call and one transaction). Called by the submissions route with
--    full inputs so the API layer never concatenates SQL. ─────────────
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
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_form public.forms;
  v_existing record;
  v_new_lead_id uuid;
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

  -- Atomic quota increment. Executing the update first means a
  -- quota-exceeded failure rolls back nothing else in this transaction.
  insert into public.usage_counters
    (workspace_id, period_start, period_end, leads_count)
  values
    (v_form.workspace_id, p_usage_period_start, p_usage_period_end, 1)
  on conflict (workspace_id, period_start, period_end)
  do update set
    leads_count = usage_counters.leads_count + 1,
    updated_at = now();

  -- New idempotency record (conficts if wrapped up in a race; retry is safe).
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

-- ── Ledger reconciliation helper (§80): count leads directly. ──────
create or replace function public.reconcile_workspace_usage(
  p_workspace_id uuid,
  p_period_start date,
  p_period_end date
)
returns integer
language sql
security definer
set search_path = ''
as $$
  select count(*)::int
  from public.leads
  where workspace_id = p_workspace_id
    and created_at >= p_period_start
    and created_at < p_period_end;
$$;

revoke execute on function public.reconcile_workspace_usage(uuid, date, date) from public;

-- ── API roles for the two public surfaces ──────────────────────────
-- Submissions endpoint: executes create_lead_with_idempotency ONLY.
-- It must NOT read leads, forms, or usage directly.
create role api_submission noinherit login password null;
revoke all on schema public from api_submission;
grant usage on schema public to api_submission;
grant execute on function public.create_lead_with_idempotency(text, text, jsonb, jsonb, text, text, date, date) to api_submission;
grant execute on function public.reconcile_workspace_usage(uuid, date, date) to api_submission;

-- Webhook endpoint: runs under service role already; role exists for
-- audit clarity and future fine-graining.
create role api_webhook noinherit login password null;
revoke all on schema public from api_webhook;
grant usage on schema public to api_webhook;

-- ── There is no plaintext form secret in the DB: the app layer hashes
--    it (SHA-256 on hex) and stores only the digest in forms.secret_hash
--    via an insert/update under the *service or owner* context. ─────
--    Secret rotation is a plain UPDATE on forms.secret_hash.
